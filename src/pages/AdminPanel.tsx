import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAllowedAdmin, signOutAdmin } from '../lib/auth'
import { useAuth } from '../lib/useAuth'
import { supabase, type Square, type Game } from '../lib/supabase'

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
      fetchGameAndClaims()
    }
  }, [user, loading, navigate])

  const fetchGameAndClaims = async () => {
    try {
      setClaimsLoading(true)

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

  const handleMarkPaid = async (squareId: string) => {
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

  const handleSignOut = async () => {
    try {
      await signOutAdmin()
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      navigate('/admin')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          <p className="mt-4 text-[var(--color-text-muted)]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface)]">
      <header className="bg-[var(--color-primary)] text-white py-6 px-6 shadow-md">
        <div className="container mx-auto max-w-7xl flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold hover:opacity-90 transition-opacity">SNPS Admin</Link>
          <div className="flex items-center gap-6">
            <span className="text-sm opacity-90">{user.email}</span>
            <nav className="flex items-center gap-4">
              <Link to="/board" className="px-4 py-2 rounded-lg bg-white text-[var(--color-primary)] border-2 border-white hover:bg-[var(--color-surface)] transition-all font-semibold shadow-sm">View Board</Link>
              <button 
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg bg-[var(--color-secondary)] text-white border-2 border-[var(--color-secondary)] hover:bg-opacity-90 transition-all font-semibold shadow-sm"
              >
                Sign Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-4xl font-bold mb-10">Admin Panel</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-md p-8">
            <h3 className="text-lg font-bold mb-3 text-[var(--color-text-muted)] uppercase tracking-wide text-sm">Total Squares</h3>
            <p className="text-4xl font-bold text-[var(--color-primary)] mb-3">100</p>
            <p className="text-sm text-[var(--color-text-muted)]">{stats.totalClaimed} claimed, {100 - stats.totalClaimed} available</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-8">
            <h3 className="text-lg font-bold mb-3 text-[var(--color-text-muted)] uppercase tracking-wide text-sm">Revenue</h3>
            <p className="text-4xl font-bold text-[var(--color-success)] mb-3">${stats.revenue}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{stats.totalPaid} paid, {stats.totalPending} pending</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-8">
            <h3 className="text-lg font-bold mb-3 text-[var(--color-text-muted)] uppercase tracking-wide text-sm">Charity</h3>
            <p className="text-4xl font-bold text-[var(--color-info)] mb-3">${stats.charity.toFixed(2)}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{game?.charity_percentage || 0}% of revenue</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-bold mb-6">Game Settings</h2>
            <div className="space-y-4">
              <button className="w-full bg-[var(--color-primary)] text-white py-3.5 px-6 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">
                Start New Season
              </button>
              <button className="w-full bg-[var(--color-secondary)] text-white py-3.5 px-6 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">
                Randomize Numbers
              </button>
              <button className="w-full bg-[var(--color-warning)] text-white py-3.5 px-6 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">
                Lock Board
              </button>
              <button className="w-full bg-[var(--color-info)] text-white py-3.5 px-6 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">
                Update Scores
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <button 
                onClick={handleExportCSV}
                disabled={!game}
                className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] py-3.5 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export Roster CSV
              </button>
              <button className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] py-3.5 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold">
                Configure Payouts
              </button>
              <button className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] py-3.5 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold">
                Update Venmo Handle
              </button>
              <button className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] py-3.5 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold">
                Set Join Password
              </button>
            </div>
          </section>
        </div>

        <section className="bg-white rounded-xl shadow-md p-8 mt-8">
          <h2 className="text-2xl font-bold mb-6">Recent Claims</h2>
          {claimsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[var(--color-border)]">
                    <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Square</th>
                    <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Name</th>
                    <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Email</th>
                    <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Status</th>
                    <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.length === 0 ? (
                    <tr>
                      <td className="py-8 px-6" colSpan={5}>
                        <p className="text-[var(--color-text-muted)] text-center font-medium">No claims yet</p>
                      </td>
                    </tr>
                  ) : (
                    claims.map((claim) => (
                      <tr key={claim.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                        <td className="py-4 px-6 font-medium">#{claim.position}</td>
                        <td className="py-4 px-6">{claim.name}</td>
                        <td className="py-4 px-6 text-sm text-[var(--color-text-muted)]">{claim.claimed_by_email}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            claim.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : claim.payment_status === 'unpaid'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {claim.payment_status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {claim.payment_status === 'unpaid' ? (
                            <button
                              onClick={() => handleMarkPaid(claim.id)}
                              className="text-sm text-[var(--color-primary)] hover:underline font-semibold"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-sm text-[var(--color-text-muted)]">—</span>
                          )}
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
    </div>
  )
}
