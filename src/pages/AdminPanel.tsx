import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAllowedAdmin, signOutAdmin } from '../lib/auth'
import { useAuth } from '../lib/useAuth'
import { supabase, type Square, type Game } from '../lib/supabase'
import ConfigureGameModal from '../components/ConfigureGameModal'
import { formatVenmoHandle } from '../lib/formatVenmo'

interface ClaimData extends Square {
  name: string
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [claims, setClaims] = useState<ClaimData[]>([])
  const [game, setGame] = useState<Game | null>(null)
  const [claimsLoading, setClaimsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalClaimed: 0,
    totalPaid: 0,
    totalPending: 0,
    revenue: 0,
    charity: 0
  })
  const [showConfigureModal, setShowConfigureModal] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user?.email) {
      navigate('/admin')
      return
    }

    if (!isAllowedAdmin(user.email)) {
      signOutAdmin().then(() => {
        navigate('/admin')
      }).catch(() => {
        navigate('/admin')
      })
    } else {
      // User is authenticated and allowed, fetch data
      fetchGameAndClaims()
    }
  }, [user, loading, navigate])

  const fetchGameAndClaims = async () => {
    try {
      setClaimsLoading(true)

      // Fetch active game
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'active')
        .maybeSingle()

      if (gameError) {
        console.error('Error fetching game:', gameError)
        setClaimsLoading(false)
        return
      }

      if (!gameData) {
        console.warn('No active game found')
        setClaimsLoading(false)
        return
      }

      setGame(gameData)

      // Fetch all squares for this game
      const { data: squaresData, error: squaresError } = await supabase
        .from('squares')
        .select('*')
        .eq('game_id', gameData.id)
        .not('claimed_by_email', 'is', null)
        .order('claimed_at', { ascending: false })

      if (squaresError) {
        console.error('Error fetching squares:', squaresError)
        setClaimsLoading(false)
        return
      }

      const claimsWithNames: ClaimData[] = (squaresData || []).map(square => ({
        ...square,
        name: square.claimed_by_name || `${square.first_name || ''} ${square.last_name || ''}`.trim() || 'Unknown'
      }))

      setClaims(claimsWithNames)

      // Calculate stats
      const paidCount = claimsWithNames.filter(c => c.payment_status === 'paid').length
      const totalRevenue = paidCount * gameData.cost_per_square
      const charityAmount = totalRevenue * (gameData.charity_percentage / 100)

      setStats({
        totalClaimed: claimsWithNames.length,
        totalPaid: paidCount,
        totalPending: claimsWithNames.length - paidCount,
        revenue: totalRevenue,
        charity: charityAmount
      })

      setClaimsLoading(false)
    } catch (err) {
      console.error('Error in fetchGameAndClaims:', err)
      setClaimsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOutAdmin()
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      navigate('/admin')
    }
  }

  const handleMarkPaid = async (squareId: string) => {
    if (!window.confirm('Mark this square as paid?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('squares')
        .update({ 
          payment_status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', squareId)

      if (error) {
        console.error('Error marking square as paid:', error)
        alert('Failed to mark square as paid')
        return
      }

      fetchGameAndClaims()
    } catch (err) {
      console.error('Error in handleMarkPaid:', err)
      alert('Failed to mark square as paid')
    }
  }

  const handleRemoveClaim = async (claim: ClaimData) => {
    if (claim.payment_status === 'paid') {
      alert('Cannot remove a paid square.')
      return
    }

    const confirmMsg = `Remove ${claim.name} from square #${claim.position}? This cannot be undone.`
    if (!window.confirm(confirmMsg)) {
      return
    }

    try {
      const { error } = await supabase
        .from('squares')
        .update({
          first_name: null,
          last_name: null,
          claimed_by_name: null,
          claimed_by_email: null,
          claimed_at: null,
          payment_status: 'unpaid',
          payment_method: null,
          paid_at: null
        })
        .eq('id', claim.id)

      if (error) throw error

      alert('Claim removed successfully!')
      await fetchGameAndClaims()
    } catch (err) {
      console.error('Error removing claim:', err)
      alert('Failed to remove claim. Please try again.')
    }
  }

  const handleResetBoard = async () => {
    if (!game) {
      alert('No active game found.')
      return
    }

    const confirmMsg = '⚠️ WARNING: This will remove ALL claimed squares for the active game and cannot be undone. Are you sure?'
    if (!window.confirm(confirmMsg)) {
      return
    }

    // Double confirmation for safety
    const doubleConfirm = window.confirm('This is your last chance. Really reset the entire board?')
    if (!doubleConfirm) {
      return
    }

    try {
      const { error } = await supabase
        .from('squares')
        .update({
          first_name: null,
          last_name: null,
          claimed_by_name: null,
          claimed_by_email: null,
          claimed_at: null,
          payment_status: 'unpaid',
          payment_method: null,
          paid_at: null
        })
        .eq('game_id', game.id)

      if (error) throw error

      alert('Board reset successfully! All claims have been removed.')
      await fetchGameAndClaims()
    } catch (err) {
      console.error('Error resetting board:', err)
      alert('Failed to reset board. Please try again.')
    }
  }

  const handleRandomizeNumbers = async () => {
    if (!game) {
      alert('No active game found.')
      return
    }

    if (game.numbers_locked) {
      alert('Numbers are locked. Please unlock the board first.')
      return
    }

    const hasNumbers = game.afc_numbers.some(n => n !== -1) || game.nfc_numbers.some(n => n !== -1)
    if (hasNumbers) {
      const confirmed = window.confirm(
        'Numbers have already been set. Are you sure you want to randomize them again?'
      )
      if (!confirmed) return
    }

    try {
      // Fisher-Yates shuffle
      const shuffle = (array: number[]) => {
        const arr = [...array]
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        return arr
      }

      const afcNumbers = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
      const nfcNumbers = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

      const { error } = await supabase
        .from('games')
        .update({
          afc_numbers: afcNumbers,
          nfc_numbers: nfcNumbers
        })
        .eq('id', game.id)

      if (error) throw error

      alert('Numbers randomized successfully!')
      await fetchGameAndClaims()
    } catch (err) {
      console.error('Error randomizing numbers:', err)
      alert('Failed to randomize numbers. Please try again.')
    }
  }

  const handleLockBoard = async () => {
    if (!game) {
      alert('No active game found.')
      return
    }

    const newLockState = !game.numbers_locked
    const action = newLockState ? 'lock' : 'unlock'
    const confirmed = window.confirm(
      `Are you sure you want to ${action} the board?${newLockState ? ' Locked boards prevent number randomization.' : ''}`
    )
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('games')
        .update({ numbers_locked: newLockState })
        .eq('id', game.id)

      if (error) throw error

      alert(`Board ${action}ed successfully!`)
      await fetchGameAndClaims()
    } catch (err) {
      console.error(`Error ${action}ing board:`, err)
      alert(`Failed to ${action} board. Please try again.`)
    }
  }

  const handleConfigureGame = async (updates: {
    cost_per_square: number
    charity_percentage: number
    q1_payout: number
    q2_payout: number
    q3_payout: number
    final_payout: number
    venmo_handle: string
    join_password: string
  }) => {
    if (!game) throw new Error('No active game found')

    try {
      const { error } = await supabase
        .from('games')
        .update(updates)
        .eq('id', game.id)

      if (error) throw error

      alert('Game configuration saved successfully!')
      await fetchGameAndClaims()
    } catch (err) {
      console.error('Error saving game configuration:', err)
      throw err
    }
  }

  const handleExportCSV = async () => {
    if (!game) {
      alert('No active game found')
      return
    }

    try {
      const { data: allSquares, error } = await supabase
        .from('squares')
        .select('*')
        .eq('game_id', game.id)
        .order('position', { ascending: true })

      if (error) {
        console.error('Error fetching squares for export:', error)
        alert('Failed to export CSV')
        return
      }

      const csvRows = [
        ['Position', 'Name', 'Email', 'Payment Status', 'Payment Method', 'Claimed At'],
        ...(allSquares || []).map(square => [
          square.position.toString(),
          square.claimed_by_name || `${square.first_name || ''} ${square.last_name || ''}`.trim() || '',
          square.claimed_by_email || '',
          square.payment_status || '',
          square.payment_method || '',
          square.claimed_at || ''
        ])
      ]

      const csvContent = csvRows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `snps-squares-roster-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error in handleExportCSV:', err)
      alert('Failed to export CSV')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          <p className="mt-5 text-base font-medium text-[var(--color-text-secondary)]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <header className="bg-white border-b border-[var(--color-border)] sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-2xl font-bold text-[var(--color-primary)] hover:opacity-90 transition-opacity">
                SNPS Admin
              </Link>
              <nav className="hidden md:flex items-center gap-2">
                <Link 
                  to="/board" 
                  className="px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-slate-50 rounded-lg transition-all"
                >
                  View Board
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--color-text-secondary)] font-medium hidden sm:inline">{user.email}</span>
              <button 
                onClick={handleSignOut}
                className="px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-slate-50 border border-[var(--color-border)] rounded-lg transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-[var(--color-text)] mb-3">Dashboard</h1>
          <p className="text-base text-[var(--color-text-secondary)]">Manage your Super Bowl squares game</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Total Squares</div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-[var(--color-text)] mb-2">100</p>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium">{stats.totalClaimed} claimed, {100 - stats.totalClaimed} available</p>
          </div>
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Revenue</div>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-[var(--color-text)] mb-2">${stats.revenue}</p>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium">From {stats.totalPaid} paid square{stats.totalPaid !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Charity</div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--color-info)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-[var(--color-text)] mb-2">${stats.charity.toFixed(2)}</p>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium">{game?.charity_percentage || 0}% of revenue</p>
          </div>
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Board Status</div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${game?.numbers_locked ? 'bg-red-50' : 'bg-green-50'}`}>
                <svg className={`w-5 h-5 ${game?.numbers_locked ? 'text-red-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {game?.numbers_locked ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  )}
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-[var(--color-text)] mb-2">{game?.numbers_locked ? 'Locked' : 'Open'}</p>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium">
              {game?.numbers_locked ? 'Numbers frozen' : 'Can randomize'}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-10">
          <section className="lg:col-span-2 bg-white rounded-xl border border-[var(--color-border)] shadow-md p-6">
            <div className="pb-5 border-b border-[var(--color-border)] mb-6">
              <h2 className="text-xl font-bold text-[var(--color-text)]">Current Game Settings</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-5">
              <div className="flex justify-between items-center py-3 border-b border-[var(--color-border-light)]">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Cost per square</span>
                <span className="text-base font-bold text-[var(--color-text)]">${game?.cost_per_square || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[var(--color-border-light)]">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Charity</span>
                <span className="text-base font-bold text-[var(--color-text)]">{game?.charity_percentage || 0}%</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[var(--color-border-light)]">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Q1 (Halftime)</span>
                <span className="text-base font-bold text-[var(--color-text)]">${game?.q1_payout || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[var(--color-border-light)]">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Q2 (Halftime)</span>
                <span className="text-base font-bold text-[var(--color-text)]">${game?.q2_payout || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[var(--color-border-light)]">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Q3</span>
                <span className="text-base font-bold text-[var(--color-text)]">${game?.q3_payout || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[var(--color-border-light)]">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Final</span>
                <span className="text-base font-bold text-[var(--color-text)]">${game?.final_payout || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[var(--color-border-light)]">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Venmo handle</span>
                <span className="text-base font-bold text-[var(--color-text)]">{formatVenmoHandle(game?.venmo_handle) || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[var(--color-border-light)]">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Join password</span>
                <span className="text-base font-bold text-[var(--color-text)]">{game?.join_password ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : 'Open'}</span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-md p-6">
            <div className="pb-5 border-b border-[var(--color-border)] mb-6">
              <h2 className="text-xl font-bold text-[var(--color-text)]">Board Actions</h2>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => setShowConfigureModal(true)}
                disabled={!game}
                className="w-full bg-[var(--color-primary)] text-white py-3 px-4 rounded-lg hover:bg-opacity-90 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm"
                title="Edit game cost, payouts, charity %, venmo handle, and join password"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configure Game
              </button>
              <button 
                onClick={handleRandomizeNumbers}
                disabled={!game}
                className="w-full border-2 border-[var(--color-border)] text-[var(--color-text)] py-3 px-4 rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                title="Shuffle AFC and NFC axis numbers (0-9)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Randomize Numbers
              </button>
              <button 
                onClick={handleLockBoard}
                disabled={!game}
                className="w-full border-2 border-[var(--color-border)] text-[var(--color-text)] py-3 px-4 rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                title={game?.numbers_locked ? 'Allow number randomization' : 'Prevent number changes'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {game?.numbers_locked ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  )}
                </svg>
                {game?.numbers_locked ? 'Unlock Board' : 'Lock Board'}
              </button>
              <button 
                onClick={handleExportCSV}
                disabled={!game}
                className="w-full border-2 border-[var(--color-border)] text-[var(--color-text)] py-3 px-4 rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                title="Download CSV with all 100 squares and claim details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Roster CSV
              </button>
              <div className="pt-3">
                <button 
                  disabled
                  className="w-full border-2 border-[var(--color-border-light)] text-[var(--color-text-light)] py-3 px-4 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                  title="Coming soon: Manual score entry for Q1-Final"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Update Scores
                </button>
              </div>
              <div className="pt-5 border-t border-[var(--color-border)]">
                <button 
                  onClick={handleResetBoard}
                  className="w-full border-2 border-red-300 bg-red-50 text-red-700 py-3 px-4 rounded-lg hover:bg-red-100 hover:border-red-400 transition-all text-sm font-semibold flex items-center justify-center gap-2.5"
                  title="Remove all claims from all squares (cannot be undone)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Reset Board
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-md overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--color-border)] bg-slate-50">
            <h2 className="text-xl font-bold text-[var(--color-text)]">Claims & Payments</h2>
          </div>
          {claimsLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Name</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Square</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Email</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Payment</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {claims.length === 0 ? (
                    <tr>
                      <td className="py-16 px-6 text-center" colSpan={6}>
                        <div className="flex flex-col items-center">
                          <svg className="w-16 h-16 text-[var(--color-text-light)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-base font-semibold text-[var(--color-text-muted)]">No claims yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-5 px-6 text-sm font-semibold text-[var(--color-text)]">{claim.name}</td>
                        <td className="py-5 px-6">
                          <span className="inline-flex items-center justify-center bg-[var(--color-primary)] text-white font-bold text-xs px-3 py-1.5 rounded-md">
                            #{claim.position}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-sm font-medium text-[var(--color-text-secondary)]">
                          {claim.claimed_by_email || 'N/A'}
                        </td>
                        <td className="py-5 px-6">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold ${
                            claim.payment_status === 'paid' 
                              ? 'bg-green-50 text-green-700 border-2 border-green-200' 
                              : claim.payment_status === 'unpaid'
                              ? 'bg-yellow-50 text-yellow-700 border-2 border-yellow-200'
                              : 'bg-gray-50 text-gray-700 border-2 border-gray-200'
                          }`}>
                            {claim.payment_status}
                          </span>
                        </td>
                        <td className="py-5 px-6">
                          {claim.payment_method ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border-2 border-blue-200 capitalize">
                              {claim.payment_method}
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-muted)] text-sm font-medium">—</span>
                          )}
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-2">
                            {claim.payment_status !== 'paid' && (
                              <>
                                <button
                                  onClick={() => handleMarkPaid(claim.id)}
                                  className="px-4 py-2 bg-[var(--color-success)] text-white text-xs font-semibold rounded-lg hover:bg-opacity-90 transition-all shadow-sm"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => handleRemoveClaim(claim)}
                                  className="px-4 py-2 border-2 border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-all"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                            {claim.payment_status === 'paid' && (
                              <div className="flex items-center gap-2 text-[var(--color-success)] text-sm font-semibold">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Paid
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] bg-white mt-auto shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-wrap justify-between items-center gap-4 text-sm text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors font-medium">Privacy Policy</a>
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors font-medium">Terms of Service</a>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">© {new Date().getFullYear()} SNPS Squares. Not affiliated with the NFL.</p>
        </div>
      </footer>

      {/* Configure Game Modal */}
      {showConfigureModal && game && (
        <ConfigureGameModal
          game={game}
          onClose={() => setShowConfigureModal(false)}
          onSave={handleConfigureGame}
        />
      )}
    </div>
  )
}
