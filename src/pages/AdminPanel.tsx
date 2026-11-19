import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAllowedAdmin, signOutAdmin } from '../lib/auth'
import { useAuth } from '../lib/useAuth'
import {
  supabase,
  csvSafe,
  EMAIL_REGEX,
  VENMO_ORDER_FEE,
  type Square,
  type Game,
  type ClaimOrder,
} from '../lib/supabase'
import ConfigureGameModal from '../components/ConfigureGameModal'
import ConfirmationModal from '../components/ConfirmationModal'
import PastPlayersSection from '../components/PastPlayersSection'
import AdminClaimOnBehalf from '../components/AdminClaimOnBehalf'
import { formatVenmoHandle } from '../lib/formatVenmo'

interface ClaimData extends Square {
  name: string
}

interface RestoreSquareRow {
  position: number
  first_name: string
  last_name: string
  email: string
  payment_method: string
  payment_status: string
  phone?: string
  claimed_at?: string
  full_name?: string
}

interface RestoreConflict {
  position: number
  currentEmail: string
  backupEmail: string
}

interface RestorePreview {
  rows: RestoreSquareRow[]
  claimedCount: number
  emptyCount: number
  conflicts: RestoreConflict[]
}

interface GroupedClaim {
  key: string
  name: string
  email: string
  squares: ClaimData[]
  positions: number[]
  unpaidCount: number
  amountDue: number
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

function stripCsvFormulaGuard(value: string): string {
  if (value.startsWith("'") && /^'[=+\-@]/.test(value)) {
    return value.slice(1)
  }
  return value
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [claims, setClaims] = useState<ClaimData[]>([])
  const [game, setGame] = useState<Game | null>(null)
  const [claimOrders, setClaimOrders] = useState<ClaimOrder[]>([])
  const [claimsLoading, setClaimsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalClaimed: 0,
    totalPaid: 0,
    totalPending: 0,
    revenue: 0,
    charity: 0
  })
  const [showConfigureModal, setShowConfigureModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    title: string
    description: string
    onConfirm: () => void
    variant?: 'default' | 'destructive'
  } | null>(null)

  const [showJoinPassword, setShowJoinPassword] = useState(false)
  const [joinPasswordDraft, setJoinPasswordDraft] = useState('')
  const [savingJoinPassword, setSavingJoinPassword] = useState(false)
  const [togglingPublicClaiming, setTogglingPublicClaiming] = useState(false)

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [allSquaresForConflicts, setAllSquaresForConflicts] = useState<Square[]>([])
  const restoreFileRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    setJoinPasswordDraft('')
    setShowJoinPassword(false)
  }, [game?.id, game?.join_password])

  const loadMockAdminData = () => {
    const mockGame: Game = {
      id: 'mock',
      season: 2026,
      afc_team: 'Kansas City Chiefs',
      nfc_team: 'San Francisco 49ers',
      cost_per_square: 10,
      charity_percentage: 10,
      q1_payout: 200,
      q2_payout: 200,
      q3_payout: 200,
      final_payout: 400,
      venmo_handle: '@snps-squares',
      join_password: 'mock-join',
      numbers_locked: false,
      afc_numbers: [3, 7, 0, 6, 1, 4, 9, 2, 8, 5],
      nfc_numbers: [2, 5, 8, 1, 9, 3, 6, 0, 7, 4],
      status: 'active',
      public_claiming_open: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const orderId = 'mock-order-1'
    const mockClaims: ClaimData[] = [
      {
        id: 'mock-sq-1',
        game_id: 'mock',
        position: 3,
        first_name: 'Sarah',
        last_name: 'Johnson',
        claimed_by_name: 'Sarah Johnson',
        claimed_by_email: 'sarah@test.com',
        claimed_at: new Date().toISOString(),
        payment_status: 'unpaid',
        payment_method: 'venmo',
        claim_order_id: orderId,
        name: 'Sarah Johnson',
      },
      {
        id: 'mock-sq-2',
        game_id: 'mock',
        position: 6,
        first_name: 'Sarah',
        last_name: 'Johnson',
        claimed_by_name: 'Sarah Johnson',
        claimed_by_email: 'sarah@test.com',
        claimed_at: new Date().toISOString(),
        payment_status: 'unpaid',
        payment_method: 'venmo',
        claim_order_id: orderId,
        name: 'Sarah Johnson',
      },
      {
        id: 'mock-sq-3',
        game_id: 'mock',
        position: 9,
        first_name: 'Michael',
        last_name: 'Chen',
        claimed_by_name: 'Michael Chen',
        claimed_by_email: 'michael@test.com',
        claimed_at: new Date().toISOString(),
        payment_status: 'paid',
        payment_method: 'cash',
        paid_at: new Date().toISOString(),
        name: 'Michael Chen',
      },
    ]

    const mockOrders: ClaimOrder[] = [
      {
        id: orderId,
        game_id: 'mock',
        claimed_by_email: 'sarah@test.com',
        first_name: 'Sarah',
        last_name: 'Johnson',
        payment_method: 'venmo',
        square_count: 2,
        square_subtotal: 20,
        fee: VENMO_ORDER_FEE,
        total: 22,
        created_at: new Date().toISOString(),
      },
    ]

    const allSquares: Square[] = Array.from({ length: 100 }, (_, i) => {
      const claimed = mockClaims.find(c => c.position === i)
      if (claimed) {
        return {
          id: claimed.id,
          game_id: 'mock',
          position: i,
          first_name: claimed.first_name,
          last_name: claimed.last_name,
          claimed_by_name: claimed.claimed_by_name,
          claimed_by_email: claimed.claimed_by_email,
          claimed_at: claimed.claimed_at,
          payment_status: claimed.payment_status,
          payment_method: claimed.payment_method,
          paid_at: claimed.paid_at,
          claim_order_id: claimed.claim_order_id,
        }
      }
      return {
        id: `mock-empty-${i}`,
        game_id: 'mock',
        position: i,
        payment_status: 'unpaid',
      }
    })

    setGame(mockGame)
    setClaims(mockClaims)
    setClaimOrders(mockOrders)
    setAllSquaresForConflicts(allSquares)
    setStats({
      totalClaimed: mockClaims.length,
      totalPaid: mockClaims.filter(c => c.payment_status === 'paid').length,
      totalPending: mockClaims.filter(c => c.payment_status !== 'paid').length,
      revenue: 10,
      charity: 1,
    })
    setClaimsLoading(false)
  }

  const fetchGameAndClaims = async () => {
    try {
      setClaimsLoading(true)

      if (import.meta.env.VITE_USE_MOCK === 'true') {
        console.log('Using mock admin data (VITE_USE_MOCK)')
        loadMockAdminData()
        return
      }

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

      // Fetch all squares for this game (claimed)
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

      // All squares (for restore conflict checks)
      const { data: allSquaresData } = await supabase
        .from('squares')
        .select('*')
        .eq('game_id', gameData.id)

      setAllSquaresForConflicts(allSquaresData || [])

      // Claim orders (fees) — optional if table missing / RLS
      let orders: ClaimOrder[] = []
      const { data: ordersData, error: ordersError } = await supabase
        .from('claim_orders')
        .select('*')
        .eq('game_id', gameData.id)

      if (!ordersError && ordersData) {
        orders = ordersData as ClaimOrder[]
      }
      setClaimOrders(orders)

      const claimsWithNames: ClaimData[] = (squaresData || []).map(square => ({
        ...square,
        name: square.claimed_by_name || `${square.first_name || ''} ${square.last_name || ''}`.trim() || 'Unknown'
      }))

      setClaims(claimsWithNames)

      // Calculate stats (include Venmo order fees when orders are fully paid)
      const paidCount = claimsWithNames.filter(c => c.payment_status === 'paid').length
      const squareRevenue = paidCount * gameData.cost_per_square

      let feeRevenue = 0
      if (orders.length > 0) {
        for (const order of orders) {
          const orderSquares = claimsWithNames.filter(c => c.claim_order_id === order.id)
          if (orderSquares.length === 0) continue
          const allPaid = orderSquares.every(s => s.payment_status === 'paid')
          if (allPaid) {
            feeRevenue += Number(order.fee) || 0
          }
        }
      }

      const totalRevenue = squareRevenue + feeRevenue
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

  const groupedClaims: GroupedClaim[] = useMemo(() => {
    if (!game) return []

    const groups = new Map<string, GroupedClaim>()

    for (const claim of claims) {
      const email = (claim.claimed_by_email || '').trim().toLowerCase()
      const key = email || `name:${claim.name.toLowerCase()}`
      let group = groups.get(key)
      if (!group) {
        group = {
          key,
          name: claim.name,
          email: claim.claimed_by_email || '',
          squares: [],
          positions: [],
          unpaidCount: 0,
          amountDue: 0,
        }
        groups.set(key, group)
      }
      group.squares.push(claim)
      group.positions.push(claim.position)
      if (claim.payment_status !== 'paid') {
        group.unpaidCount += 1
      }
    }

    const orderById = new Map(claimOrders.map(o => [o.id, o]))

    for (const group of groups.values()) {
      group.positions.sort((a, b) => a - b)
      group.squares.sort((a, b) => a.position - b.position)

      const unpaidSquares = group.squares.filter(s => s.payment_status !== 'paid')
      const squareDue = unpaidSquares.length * game.cost_per_square

      let feeDue = 0
      const countedOrderIds = new Set<string>()
      let hasUnpaidVenmoWithoutOrder = false

      for (const sq of unpaidSquares) {
        if (sq.claim_order_id) {
          if (!countedOrderIds.has(sq.claim_order_id)) {
            countedOrderIds.add(sq.claim_order_id)
            const order = orderById.get(sq.claim_order_id)
            feeDue += order ? (Number(order.fee) || 0) : (sq.payment_method === 'venmo' ? VENMO_ORDER_FEE : 0)
          }
        } else if (sq.payment_method === 'venmo') {
          hasUnpaidVenmoWithoutOrder = true
        }
      }

      // Approximate: if claim_orders unavailable / no order ids, add fee once for unpaid venmo
      if (claimOrders.length === 0 && hasUnpaidVenmoWithoutOrder) {
        feeDue = VENMO_ORDER_FEE
      } else if (hasUnpaidVenmoWithoutOrder && countedOrderIds.size === 0) {
        feeDue += VENMO_ORDER_FEE
      }

      group.amountDue = squareDue + feeDue
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name) || a.email.localeCompare(b.email)
    )
  }, [claims, claimOrders, game])

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

  const handleMarkAllPaymentStatus = async (email: string, status: 'paid' | 'unpaid') => {
    if (!game) return
    if (!email) {
      alert('Cannot update payment status without an email.')
      return
    }

    const label = status === 'paid' ? 'paid' : 'unpaid'
    if (!window.confirm(`Mark all squares for ${email} as ${label}?`)) {
      return
    }

    try {
      const { error } = await supabase.rpc('admin_set_payment_status_for_email', {
        p_game_id: game.id,
        p_email: email,
        p_status: status,
      })

      if (error) {
        console.error('Error updating payment status for email:', error)
        alert(`Failed to mark all as ${label}`)
        return
      }

      await fetchGameAndClaims()
    } catch (err) {
      console.error('Error in handleMarkAllPaymentStatus:', err)
      alert(`Failed to mark all as ${label}`)
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
          paid_at: null,
          claim_order_id: null,
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
          paid_at: null,
          claim_order_id: null,
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

  const handleClearNumbers = () => {
    if (!game) return
    
    setConfirmAction({
      title: 'Are you sure?',
      description: 'This will reset all NFC and AFC numbers back to unassigned (?). This action cannot be undone.',
      onConfirm: async () => {
        setConfirmAction(null)
        try {
          const { error } = await supabase
            .from('games')
            .update({
              afc_numbers: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
              nfc_numbers: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
            })
            .eq('id', game.id)

          if (error) throw error

          alert('Numbers cleared successfully!')
          await fetchGameAndClaims()
        } catch (err) {
          console.error('Error clearing numbers:', err)
          alert('Failed to clear numbers. Please try again.')
        }
      },
      variant: 'destructive'
    })
  }

  const handleRandomizeNumbers = () => {
    if (!game) return

    setConfirmAction({
      title: 'Are you sure?',
      description: 'This will shuffle the AFC and NFC axis numbers (0-9) randomly.',
      onConfirm: async () => {
        setConfirmAction(null)
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
    })
  }

  const handleLockBoard = () => {
    if (!game) return

    const newLockState = !game.numbers_locked
    const action = newLockState ? 'lock' : 'unlock'
    
    setConfirmAction({
      title: 'Are you sure?',
      description: newLockState 
        ? 'This will lock the numbers and prevent randomization or clearing until unlocked.'
        : 'This will unlock the numbers and allow randomization and clearing.',
      onConfirm: async () => {
        setConfirmAction(null)
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
    })
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
    public_claiming_open?: boolean
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

  const handleSaveJoinPassword = async () => {
    if (!game) return
    setSavingJoinPassword(true)
    try {
      const { error } = await supabase
        .from('games')
        .update({ join_password: joinPasswordDraft.trim() })
        .eq('id', game.id)

      if (error) throw error

      alert('Join password updated.')
      setJoinPasswordDraft('')
      setShowJoinPassword(false)
      await fetchGameAndClaims()
    } catch {
      console.error('Error updating join password')
      alert('Failed to update join password.')
    } finally {
      setSavingJoinPassword(false)
    }
  }

  const handleTogglePublicClaiming = async () => {
    if (!game) return
    const next = !game.public_claiming_open
    setTogglingPublicClaiming(true)
    try {
      const { error } = await supabase
        .from('games')
        .update({ public_claiming_open: next })
        .eq('id', game.id)

      if (error) throw error

      await fetchGameAndClaims()
    } catch (err) {
      console.error('Error toggling public claiming:', err)
      alert('Failed to update public claiming.')
    } finally {
      setTogglingPublicClaiming(false)
    }
  }

  const handlePrintBoard = () => {
    // Opens board with ?print=1 — BoardPage/print CSS should hide chrome and auto-print
    // /board redirects to /, so use /?print=1
    window.open('/?print=1', '_blank')
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

  const handleDownloadBackup = async () => {
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
        console.error('Error fetching squares for backup:', error)
        alert('Failed to download backup')
        return
      }

      const emails = Array.from(
        new Set(
          (allSquares || [])
            .map(s => (s.claimed_by_email || '').trim().toLowerCase())
            .filter(Boolean)
        )
      )

      const phoneByEmail = new Map<string, string>()
      if (emails.length > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('email, phone')
          .in('email', emails)

        if (!playersError && playersData) {
          for (const p of playersData) {
            if (p.email) {
              phoneByEmail.set(String(p.email).toLowerCase(), p.phone || '')
            }
          }
        }
      }

      const lines: string[] = []
      lines.push('# SNPS Squares game backup')
      lines.push('# SETTINGS')
      lines.push(`# season,${csvSafe(game.season)}`)
      lines.push(`# afc_team,${csvSafe(game.afc_team)}`)
      lines.push(`# nfc_team,${csvSafe(game.nfc_team)}`)
      lines.push(`# cost_per_square,${csvSafe(game.cost_per_square)}`)
      lines.push(`# charity_percentage,${csvSafe(game.charity_percentage)}`)
      lines.push(`# q1_payout,${csvSafe(game.q1_payout)}`)
      lines.push(`# q2_payout,${csvSafe(game.q2_payout)}`)
      lines.push(`# q3_payout,${csvSafe(game.q3_payout)}`)
      lines.push(`# final_payout,${csvSafe(game.final_payout)}`)
      lines.push(`# venmo_handle,${csvSafe(game.venmo_handle)}`)
      lines.push(`# public_claiming_open,${csvSafe(String(Boolean(game.public_claiming_open)))}`)
      lines.push(`# numbers_locked,${csvSafe(String(game.numbers_locked))}`)
      lines.push(`# afc_numbers,${csvSafe((game.afc_numbers || []).join('|'))}`)
      lines.push(`# nfc_numbers,${csvSafe((game.nfc_numbers || []).join('|'))}`)
      lines.push(`# status,${csvSafe(game.status)}`)
      lines.push('# (join_password intentionally omitted)')
      lines.push('# SQUARES')
      lines.push(
        [
          'position',
          'first_name',
          'last_name',
          'full_name',
          'email',
          'phone',
          'payment_method',
          'payment_status',
          'claimed_at',
        ].join(',')
      )

      for (const square of allSquares || []) {
        const email = square.claimed_by_email || ''
        const first = square.first_name || ''
        const last = square.last_name || ''
        const full =
          square.claimed_by_name ||
          `${first} ${last}`.trim() ||
          ''
        const phone = email ? (phoneByEmail.get(email.toLowerCase()) || '') : ''

        lines.push(
          [
            csvSafe(square.position),
            csvSafe(first),
            csvSafe(last),
            csvSafe(full),
            csvSafe(email),
            csvSafe(phone),
            csvSafe(square.payment_method || ''),
            csvSafe(square.payment_status || ''),
            csvSafe(square.claimed_at || ''),
          ].join(',')
        )
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `snps-squares-backup-${game.season}-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error in handleDownloadBackup:', err)
      alert('Failed to download backup')
    }
  }

  const buildRestorePreview = (rows: RestoreSquareRow[]): RestorePreview => {
    const claimedCount = rows.filter(r => r.email.trim()).length
    const emptyCount = rows.length - claimedCount
    const conflicts: RestoreConflict[] = []

    const currentByPos = new Map(
      allSquaresForConflicts.map(s => [s.position, s])
    )

    for (const row of rows) {
      if (!row.email.trim()) continue
      const current = currentByPos.get(row.position)
      const currentEmail = (current?.claimed_by_email || '').trim().toLowerCase()
      if (currentEmail && currentEmail !== row.email.trim().toLowerCase()) {
        conflicts.push({
          position: row.position,
          currentEmail,
          backupEmail: row.email.trim().toLowerCase(),
        })
      }
    }

    return { rows, claimedCount, emptyCount, conflicts }
  }

  const validateRestoreRows = (rows: RestoreSquareRow[]): string | null => {
    const seen = new Set<number>()
    for (const row of rows) {
      if (!Number.isInteger(row.position) || row.position < 0 || row.position > 99) {
        return `Invalid position: ${row.position}`
      }
      if (seen.has(row.position)) {
        return `Duplicate position: ${row.position}`
      }
      seen.add(row.position)

      const email = row.email.trim()
      if (email && !EMAIL_REGEX.test(email)) {
        return `Invalid email at position ${row.position}: ${email}`
      }

      const method = (row.payment_method || '').trim().toLowerCase()
      if (method && method !== 'venmo' && method !== 'cash') {
        return `Invalid payment_method at position ${row.position}: ${row.payment_method}`
      }

      const status = (row.payment_status || 'unpaid').trim().toLowerCase()
      if (status && !['unpaid', 'paid', 'released'].includes(status)) {
        return `Invalid payment_status at position ${row.position}: ${row.payment_status}`
      }

      if (email && (!row.first_name.trim() || !row.last_name.trim())) {
        return `Missing name at position ${row.position}`
      }
    }
    return null
  }

  const handleRestoreFileSelected = async (file: File | null) => {
    if (!file || !game) return

    try {
      const text = await file.text()
      const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0)

      let headerIdx = -1
      let headers: string[] = []
      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim()
        if (line.startsWith('#')) continue
        const cells = parseCsvLine(line).map(c => c.toLowerCase())
        if (cells.includes('position')) {
          headerIdx = i
          headers = cells
          break
        }
      }

      if (headerIdx < 0) {
        alert('Could not find a CSV header row containing "position".')
        return
      }

      const col = (name: string) => headers.indexOf(name)

      const rows: RestoreSquareRow[] = []
      for (let i = headerIdx + 1; i < rawLines.length; i++) {
        const line = rawLines[i].trim()
        if (!line || line.startsWith('#')) continue
        const cells = parseCsvLine(line).map(stripCsvFormulaGuard)

        const positionRaw = cells[col('position')] ?? ''
        const position = Number(positionRaw)
        if (!Number.isFinite(position)) continue

        const first_name = cells[col('first_name')] ?? ''
        const last_name = cells[col('last_name')] ?? ''
        const full_name = cells[col('full_name')] ?? ''
        const email = (cells[col('email')] ?? cells[col('claimed_by_email')] ?? '').toLowerCase()
        const phone = cells[col('phone')] ?? ''
        const payment_method = (cells[col('payment_method')] ?? '').toLowerCase()
        const payment_status = (cells[col('payment_status')] ?? 'unpaid').toLowerCase() || 'unpaid'
        const claimed_at = cells[col('claimed_at')] ?? ''

        let first = first_name
        let last = last_name
        if ((!first || !last) && full_name) {
          const parts = full_name.trim().split(/\s+/)
          if (!first) first = parts[0] || ''
          if (!last) last = parts.slice(1).join(' ') || ''
        }

        rows.push({
          position,
          first_name: first,
          last_name: last,
          email,
          phone: phone || undefined,
          payment_method,
          payment_status,
          claimed_at: claimed_at || undefined,
          full_name: full_name || undefined,
        })
      }

      if (rows.length === 0) {
        alert('No square rows found in backup file.')
        return
      }

      const validationError = validateRestoreRows(rows)
      if (validationError) {
        alert(validationError)
        return
      }

      setRestorePreview(buildRestorePreview(rows))
    } catch (err) {
      console.error('Error parsing restore file:', err)
      alert('Failed to parse backup file.')
    } finally {
      if (restoreFileRef.current) {
        restoreFileRef.current.value = ''
      }
    }
  }

  const handleConfirmRestore = async () => {
    if (!game || !restorePreview) return

    const validationError = validateRestoreRows(restorePreview.rows)
    if (validationError) {
      alert(validationError)
      return
    }

    if (
      !window.confirm(
        `Restore ${restorePreview.rows.length} squares? ${restorePreview.conflicts.length} conflict(s) will be overwritten.`
      )
    ) {
      return
    }

    setRestoreBusy(true)
    try {
      const payload = restorePreview.rows.map(r => ({
        position: r.position,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        payment_method: r.payment_method || null,
        payment_status: r.payment_status || 'unpaid',
        phone: r.phone || null,
        claimed_at: r.claimed_at || null,
      }))

      // Migration defines p_rows (not p_squares)
      const { data, error } = await supabase.rpc('admin_restore_game_squares', {
        p_game_id: game.id,
        p_rows: payload,
      })

      if (error) {
        console.error('Error restoring squares:', error)
        alert('Failed to restore from backup.')
        return
      }

      const restored = (data as { restored?: number } | null)?.restored
      const skipped = (data as { skipped?: number } | null)?.skipped
      alert(
        `Restore complete.${restored != null ? ` Restored: ${restored}.` : ''}${
          skipped != null ? ` Skipped: ${skipped}.` : ''
        }`
      )
      setRestorePreview(null)
      await fetchGameAndClaims()
    } catch (err) {
      console.error('Error in handleConfirmRestore:', err)
      alert('Failed to restore from backup.')
    } finally {
      setRestoreBusy(false)
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

  const publicClaimingOpen = Boolean(game?.public_claiming_open)
  
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
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Public claiming</span>
                <span className="text-base font-bold text-[var(--color-text)]">
                  {publicClaimingOpen ? 'Open' : 'Admin only'}
                </span>
              </div>
              <div
                className="sm:col-span-2 py-3 border-b border-[var(--color-border-light)]"
                data-testid="admin-join-password"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">Join password</span>
                  <div className="flex items-center gap-2">
                    {game?.join_password ? (
                      <>
                        <span className="text-base font-bold text-[var(--color-text)] font-mono tracking-wide">
                          {showJoinPassword ? game.join_password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowJoinPassword(v => !v)}
                          className="px-2.5 py-1 text-xs font-semibold border border-[var(--color-border)] rounded-md hover:bg-slate-50 text-[var(--color-text-secondary)]"
                        >
                          {showJoinPassword ? 'Hide' : 'Show'}
                        </button>
                      </>
                    ) : (
                      <span className="text-base font-bold text-[var(--color-text)]">Open (none set)</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type={showJoinPassword ? 'text' : 'password'}
                    value={joinPasswordDraft}
                    onChange={(e) => setJoinPasswordDraft(e.target.value)}
                    placeholder="New join password (blank = open)"
                    className="flex-1 min-w-[12rem] px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-white text-[var(--color-text)]"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={handleSaveJoinPassword}
                    disabled={!game || savingJoinPassword}
                    className="px-4 py-2 text-sm font-semibold bg-[var(--color-primary)] text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {savingJoinPassword ? 'Saving…' : 'Save'}
                  </button>
                </div>
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
                type="button"
                data-testid="admin-public-claiming-toggle"
                onClick={handleTogglePublicClaiming}
                disabled={!game || togglingPublicClaiming}
                className={`w-full border-2 py-3 px-4 rounded-lg transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 ${
                  publicClaimingOpen
                    ? 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100'
                    : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-slate-50'
                }`}
                title="When off, only admins can claim squares"
              >
                Public claiming open: {publicClaimingOpen ? 'ON' : 'OFF'}
              </button>
              <button 
                onClick={handleRandomizeNumbers}
                disabled={!game || game.numbers_locked}
                className="w-full border-2 border-[var(--color-border)] text-[var(--color-text)] py-3 px-4 rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                title={game?.numbers_locked ? 'Numbers are locked' : 'Shuffle AFC and NFC axis numbers (0-9)'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Randomize Numbers
              </button>
              <button 
                onClick={handleClearNumbers}
                disabled={!game || game.numbers_locked}
                className="w-full border-2 border-[var(--color-border)] text-[var(--color-text)] py-3 px-4 rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                title={game?.numbers_locked ? 'Numbers are locked' : 'Reset all numbers back to unassigned (?)'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Numbers
              </button>
              <button 
                onClick={handleLockBoard}
                disabled={!game || (!game.numbers_locked && (game.afc_numbers.every(n => n === -1) || game.nfc_numbers.every(n => n === -1)))}
                className="w-full border-2 border-[var(--color-border)] text-[var(--color-text)] py-3 px-4 rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                title={
                  !game ? 'No game' :
                  game.numbers_locked ? 'Allow number randomization and clearing' :
                  (game.afc_numbers.every(n => n === -1) || game.nfc_numbers.every(n => n === -1)) ? 'Assign numbers first' :
                  'Prevent number changes'
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {game?.numbers_locked ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  )}
                </svg>
                {game?.numbers_locked ? 'Unlock Numbers' : 'Lock Numbers'}
              </button>
              <button
                type="button"
                data-testid="admin-print-board"
                onClick={handlePrintBoard}
                disabled={!game}
                className="w-full border-2 border-[var(--color-border)] text-[var(--color-text)] py-3 px-4 rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                title="Open board with ?print=1 for PDF print (print CSS hides chrome)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print board (PDF)
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
              <button
                type="button"
                data-testid="admin-download-backup"
                onClick={handleDownloadBackup}
                disabled={!game}
                className="w-full border-2 border-[var(--color-border)] text-[var(--color-text)] py-3 px-4 rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                title="Download full game backup (settings + squares). Join password excluded."
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download game backup
              </button>
              <div data-testid="admin-restore-backup" className="space-y-2">
                <input
                  ref={restoreFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="block w-full text-xs text-[var(--color-text-secondary)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-[var(--color-text)] hover:file:bg-slate-200"
                  onChange={(e) => handleRestoreFileSelected(e.target.files?.[0] ?? null)}
                  disabled={!game || restoreBusy}
                />
                <p className="text-xs text-[var(--color-text-muted)]">
                  Restore from backup — select a CSV exported above
                </p>
              </div>
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

        {restorePreview && (
          <section className="mb-10 bg-white rounded-xl border border-[var(--color-border)] shadow-md p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text)]">Restore preview</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {restorePreview.claimedCount} claimed, {restorePreview.emptyCount} empty
                  {restorePreview.conflicts.length > 0
                    ? ` · ${restorePreview.conflicts.length} conflict(s)`
                    : ' · no conflicts'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRestorePreview(null)}
                  className="px-4 py-2 text-sm font-semibold border border-[var(--color-border)] rounded-lg hover:bg-slate-50"
                  disabled={restoreBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={restoreBusy}
                  className="px-4 py-2 text-sm font-semibold bg-[var(--color-primary)] text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                >
                  {restoreBusy ? 'Restoring…' : 'Confirm restore'}
                </button>
              </div>
            </div>
            {restorePreview.conflicts.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  Sample conflicts (position already claimed by a different email):
                </p>
                <ul className="text-sm text-amber-800 space-y-1">
                  {restorePreview.conflicts.slice(0, 8).map((c) => (
                    <li key={c.position}>
                      #{c.position}: {c.currentEmail} → {c.backupEmail}
                    </li>
                  ))}
                  {restorePreview.conflicts.length > 8 && (
                    <li>…and {restorePreview.conflicts.length - 8} more</li>
                  )}
                </ul>
              </div>
            )}
          </section>
        )}

        <PastPlayersSection />

        <AdminClaimOnBehalf game={game} onDone={fetchGameAndClaims} />

        <section
          className="bg-white rounded-xl border border-[var(--color-border)] shadow-md overflow-hidden"
          data-testid="admin-claims-grouped"
        >
          <div className="px-6 py-5 border-b border-[var(--color-border)] bg-slate-50">
            <h2 className="text-xl font-bold text-[var(--color-text)]">Claims & Payments</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Grouped by email · amount due includes unpaid squares and Venmo order fees
            </p>
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
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Email</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Squares</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Positions</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Amount due</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {groupedClaims.length === 0 ? (
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
                    groupedClaims.map((group) => {
                      const expanded = Boolean(expandedGroups[group.key])
                      return (
                        <Fragment key={group.key}>
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="py-5 px-6 text-sm font-semibold text-[var(--color-text)]">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedGroups(prev => ({
                                    ...prev,
                                    [group.key]: !prev[group.key],
                                  }))
                                }
                                className="inline-flex items-center gap-2 text-left hover:text-[var(--color-primary)]"
                              >
                                <span className="text-[var(--color-text-muted)]">{expanded ? '▾' : '▸'}</span>
                                {group.name}
                              </button>
                            </td>
                            <td className="py-5 px-6 text-sm font-medium text-[var(--color-text-secondary)]">
                              {group.email || 'N/A'}
                            </td>
                            <td className="py-5 px-6 text-sm font-semibold text-[var(--color-text)]">
                              {group.squares.length}
                              {group.unpaidCount > 0 && (
                                <span className="ml-2 text-xs font-bold text-amber-700">
                                  ({group.unpaidCount} unpaid)
                                </span>
                              )}
                            </td>
                            <td className="py-5 px-6 text-sm text-[var(--color-text-secondary)]">
                              {group.positions.map(p => `#${p}`).join(', ')}
                            </td>
                            <td className="py-5 px-6 text-sm font-bold text-[var(--color-text)]">
                              ${group.amountDue.toFixed(2)}
                            </td>
                            <td className="py-5 px-6">
                              <div className="flex flex-wrap items-center gap-2">
                                {group.email && group.unpaidCount > 0 && (
                                  <button
                                    type="button"
                                    data-testid="mark-all-paid"
                                    onClick={() => handleMarkAllPaymentStatus(group.email, 'paid')}
                                    className="px-3 py-1.5 bg-[var(--color-success)] text-white text-xs font-semibold rounded-lg hover:bg-opacity-90 transition-all shadow-sm"
                                  >
                                    Mark all paid
                                  </button>
                                )}
                                {group.email && group.squares.some(s => s.payment_status === 'paid') && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAllPaymentStatus(group.email, 'unpaid')}
                                    className="px-3 py-1.5 border-2 border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs font-semibold rounded-lg hover:bg-slate-50 transition-all"
                                  >
                                    Mark unpaid
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expanded &&
                            group.squares.map((claim) => (
                              <tr key={claim.id} className="bg-slate-50/80">
                                <td className="py-3 px-6 pl-12 text-sm text-[var(--color-text-secondary)]" colSpan={2}>
                                  Square #{claim.position}
                                  {claim.payment_method ? (
                                    <span className="ml-2 capitalize text-xs font-semibold text-blue-700">
                                      ({claim.payment_method})
                                    </span>
                                  ) : null}
                                </td>
                                <td className="py-3 px-6" colSpan={2}>
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                                    claim.payment_status === 'paid'
                                      ? 'bg-green-50 text-green-700 border border-green-200'
                                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                  }`}>
                                    {claim.payment_status}
                                  </span>
                                </td>
                                <td className="py-3 px-6" colSpan={2}>
                                  <div className="flex items-center gap-2">
                                    {claim.payment_status !== 'paid' && (
                                      <>
                                        <button
                                          onClick={() => handleMarkPaid(claim.id)}
                                          className="px-3 py-1.5 bg-[var(--color-success)] text-white text-xs font-semibold rounded-lg hover:bg-opacity-90 transition-all shadow-sm"
                                        >
                                          Mark Paid
                                        </button>
                                        <button
                                          onClick={() => handleRemoveClaim(claim)}
                                          className="px-3 py-1.5 border-2 border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-all"
                                        >
                                          Remove
                                        </button>
                                      </>
                                    )}
                                    {claim.payment_status === 'paid' && (
                                      <span className="text-[var(--color-success)] text-sm font-semibold">Paid</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </Fragment>
                      )
                    })
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
            <Link to="/privacy" className="hover:text-[var(--color-primary)] transition-colors font-medium">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[var(--color-primary)] transition-colors font-medium">Terms of Service</Link>
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

      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmationModal
          title={confirmAction.title}
          description={confirmAction.description}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
          variant={confirmAction.variant}
        />
      )}
    </div>
  )
}
