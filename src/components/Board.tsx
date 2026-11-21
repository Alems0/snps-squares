import React, { useState, useEffect, useRef } from 'react'
import {
  supabase,
  type Square,
  type Game,
  GAMES_PUBLIC_COLUMNS,
  SQUARES_PUBLIC_COLUMNS,
  formatAxisLabel,
} from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { formatSquareLabel } from '../lib/displaySquareNumber'
import ClaimPopover from './ClaimPopover'
import ClaimSuccess from './ClaimSuccess'
import { MAX_CLAIM_SQUARES } from '../lib/claimErrors'
import { mockGetGameAxis } from '../lib/mockGameAxis'

interface BoardProps {
  onClaimSuccess?: () => void
}

export default function Board({ onClaimSuccess }: BoardProps = {}) {
  const { isAdmin: isAdminUser } = useAuth()
  const [squares, setSquares] = useState<Square[]>([])
  const [game, setGame] = useState<Game | null>(null)
  const [selectedSquares, setSelectedSquares] = useState<number[]>([])
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{
    squareCount: number
    positions: number[]
    totalCost: number
    paymentMethod: 'cash' | 'venmo'
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  // Public claiming open (default OFF). Admins can always select/claim.
  const publicClaimingOpen = Boolean(game?.public_claiming_open)
  const canSelect = isAdminUser || publicClaimingOpen

  // Fetch active game and squares
  useEffect(() => {
    fetchGameAndSquares()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchGameAndSquares = async () => {
    try {
      setLoading(true)
      setError(null)

      // Playwright / local mock: skip Supabase entirely
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        console.log('Using mock data (VITE_USE_MOCK)')
        loadMockData()
        return
      }

      // Fetch active game (public columns — no join_password)
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(GAMES_PUBLIC_COLUMNS)
        .eq('status', 'active')
        .maybeSingle()

      if (gameError) {
        console.error('Error fetching game:', gameError)
        setError('Board unavailable. Please refresh the page.')
        setLoading(false)
        return
      }

      if (!gameData) {
        setError('No active game found.')
        setLoading(false)
        return
      }

      setGame(gameData)

      // Fetch squares (public columns — no claimed_by_email)
      const { data: squaresData, error: squaresError } = await supabase
        .from('squares')
        .select(SQUARES_PUBLIC_COLUMNS)
        .eq('game_id', gameData.id)
        .order('position')

      if (squaresError) throw squaresError

      setSquares(squaresData || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching game data:', err)

      if (import.meta.env.VITE_USE_MOCK === 'true') {
        console.log('Using mock data (VITE_USE_MOCK)')
        loadMockData()
        return
      }
      
      setError('Failed to load game data. Please refresh the page.')
      setLoading(false)
    }
  }

  const loadMockData = () => {
    const params = new URLSearchParams(window.location.search)
    const numbersMode = params.get('mock_numbers')
    // Full 100-square board with long names (print one-page stress test)
    const fullBoard =
      params.get('mock_full') === '1' || params.get('print') === '1'
    // blank = '?' placeholders; alt = post-randomize permutation;
    // otherwise prefer shared mock axis (admin reset/clear) then seeded defaults
    const blank = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
    const altAfc = [9, 1, 4, 0, 7, 2, 5, 8, 3, 6]
    const altNfc = [0, 6, 3, 8, 1, 5, 9, 2, 4, 7]
    const sharedAxis = mockGetGameAxis()
    const afc =
      numbersMode === 'blank'
        ? blank
        : numbersMode === 'alt'
          ? altAfc
          : sharedAxis.afc_numbers
    const nfc =
      numbersMode === 'blank'
        ? blank
        : numbersMode === 'alt'
          ? altNfc
          : sharedAxis.nfc_numbers
    // fullBoard / alt → locked; blank → unlocked; else shared axis (reset/clear)
    const numbersLocked =
      fullBoard || numbersMode === 'alt'
        ? true
        : numbersMode === 'blank'
          ? false
          : sharedAxis.numbers_locked

    setGame({
      id: 'mock',
      season: 2026,
      afc_team: 'Chiefs',
      nfc_team: 'Eagles',
      cost_per_square: 10,
      charity_percentage: 10,
      q1_payout: 200,
      q2_payout: 200,
      q3_payout: 200,
      final_payout: 400,
      venmo_handle: '@snps-squares',
      join_password: '',
      numbers_locked: numbersLocked,
      afc_numbers: afc,
      nfc_numbers: nfc,
      status: 'active',
      public_claiming_open: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    const mockNames = [
      'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'James Smith',
      'Maria Garcia', 'David Kim', 'Jennifer Martinez', 'Christopher Lee',
      'Jessica Anderson', 'Matthew Taylor', 'Ashley Thompson', 'Joshua White',
      'Amanda Brown', 'Daniel Williams', 'Samantha Davis', 'Andrew Miller',
      'Elizabeth Wilson', 'Ryan Moore', 'Nicole Jackson', 'Brandon Martin',
      'Rebecca Lee', 'Justin Harris', 'Stephanie Clark', 'Kevin Lewis',
      'Lauren Walker'
    ]

    const longNames = [
      'Christopher Montgomery',
      'Alexandria Fitzgerald',
      'Maximilian Harrington',
      'Anastasia Vanderberg',
      'Bartholomew Ellington',
      'Genevieve Whitaker-Jones',
      'Theodore Remington III',
      'Penelope Cartwright',
      'Sebastian Hawthorne',
      'Evangeline Rutherford',
    ]

    const mockSquares = Array.from({ length: 100 }, (_, i) => {
      const isClaimed = fullBoard ? true : i % 3 === 0
      const isPaid = fullBoard ? i % 2 === 0 : isClaimed && i % 6 !== 0
      const name = fullBoard
        ? longNames[i % longNames.length]
        : mockNames[Math.floor(i / 4) % mockNames.length]
      const [first, ...rest] = name.split(' ')
      const last = rest.join(' ') || first
      return {
        id: `mock-${i}`,
        game_id: 'mock',
        position: i,
        first_name: isClaimed ? first : null,
        last_name: isClaimed ? last : null,
        claimed_by_name: isClaimed ? name : null,
        claimed_by_email: isClaimed ? `user${i}@test.com` : null,
        claimed_at: isClaimed ? new Date().toISOString() : null,
        payment_status: isPaid ? 'paid' : 'unpaid',
        payment_method: isPaid ? 'venmo' : null,
        paid_at: isPaid ? new Date().toISOString() : null
      } as Square
    })

    setSquares(mockSquares)
    setLoading(false)
  }

  const nfcNumbers = game?.nfc_numbers || [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
  const afcNumbers = game?.afc_numbers || [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]

  const handleSquareClick = (position: number) => {
    if (!canSelect) return
    const square = squares.find((s) => s.position === position)

    // If square is already claimed, do nothing
    if (square?.claimed_by_name) {
      return
    }

    // Toggle selection
    setSelectedSquares((prev) => {
      const newSelection = prev.includes(position)
        ? prev.filter((p) => p !== position)
        : [...prev, position]

      // Close popover if all squares deselected
      if (newSelection.length === 0 && showClaimModal) {
        setShowClaimModal(false)
      }

      return newSelection
    })
  }

  const handleProceedToClaim = () => {
    if (!canSelect || selectedSquares.length === 0) return
    // Scroll first selected square into view before opening popover
    const first = boardRef.current?.querySelector(
      `button[data-position="${selectedSquares[0]}"]`
    ) as HTMLElement | null
    try {
      first?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
    } catch {
      first?.scrollIntoView(true)
    }
    setShowClaimModal(true)
  }

  const handleClaimSubmit = async (data: {
    firstName: string
    lastName: string
    email: string
    paymentMethod: 'cash' | 'venmo'
    playerId?: string
    phone?: string
  }) => {
    if (!game) throw new Error('No active game')

    if (selectedSquares.length > MAX_CLAIM_SQUARES) {
      throw new Error(`Too many positions (max ${MAX_CLAIM_SQUARES})`)
    }

    // Playwright / local mock: claim in memory (cap 100, conflict detection)
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      // Test hook: force a taken-square error without racing React state
      if (data.email.trim().toLowerCase() === 'taken@conflict.test') {
        throw new Error('Those squares are no longer available')
      }
      const conflicts = selectedSquares.filter((pos) => {
        const sq = squares.find((s) => s.position === pos)
        return Boolean(sq?.claimed_by_name)
      })
      if (conflicts.length > 0) {
        throw new Error('Those squares are no longer available')
      }
      const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim()
      const email = (data.email || 'mock@test.com').trim().toLowerCase()
      setSquares((prev) =>
        prev.map((sq) =>
          selectedSquares.includes(sq.position)
            ? {
                ...sq,
                first_name: data.firstName.trim(),
                last_name: data.lastName.trim(),
                claimed_by_name: displayName,
                claimed_by_email: email,
                claimed_at: new Date().toISOString(),
                payment_method: data.paymentMethod,
                payment_status: 'unpaid',
              }
            : sq
        )
      )
      setSuccessData({
        squareCount: selectedSquares.length,
        positions: [...selectedSquares],
        totalCost: selectedSquares.length * game.cost_per_square,
        paymentMethod: data.paymentMethod,
      })
      setShowClaimModal(false)
      setShowSuccess(true)
      setSelectedSquares([])
      if (onClaimSuccess) onClaimSuccess()
      return
    }

    if (data.playerId) {
      const playerArgs: {
        p_player_id: string
        p_game_id: string
        p_positions: number[]
        p_payment_method: string
        p_phone?: string
      } = {
        p_player_id: data.playerId,
        p_game_id: game.id,
        p_positions: selectedSquares,
        p_payment_method: data.paymentMethod,
      }
      if (data.phone) playerArgs.p_phone = data.phone
      const { data: result, error } = await supabase.rpc('claim_squares_for_player', playerArgs)
      if (error) throw new Error(error.message || 'Failed to claim squares')
      const claimed = (result as { claimed?: number })?.claimed ?? 0
      if (claimed === 0) throw new Error('Those squares are no longer available')
    } else {
      const guestArgs: {
        p_game_id: string
        p_positions: number[]
        p_first: string
        p_last: string
        p_email: string
        p_payment_method: string
        p_phone?: string
      } = {
        p_game_id: game.id,
        p_positions: selectedSquares,
        p_first: data.firstName.trim(),
        p_last: data.lastName.trim(),
        p_email: data.email.trim().toLowerCase(),
        p_payment_method: data.paymentMethod,
      }
      if (data.phone) guestArgs.p_phone = data.phone
      const { data: result, error } = await supabase.rpc('claim_squares_as_guest', guestArgs)
      if (error) throw new Error(error.message || 'Failed to claim squares')
      const claimed = (result as { claimed?: number })?.claimed ?? 0
      if (claimed === 0) throw new Error('Those squares are no longer available')
    }

    setSuccessData({
      squareCount: selectedSquares.length,
      positions: [...selectedSquares],
      totalCost: selectedSquares.length * game.cost_per_square,
      paymentMethod: data.paymentMethod,
    })
    setShowClaimModal(false)
    setShowSuccess(true)
    setSelectedSquares([])

    await fetchGameAndSquares()

    if (onClaimSuccess) {
      onClaimSuccess()
    }
  }

  const handleCloseSuccess = () => {
    setShowSuccess(false)
    setSuccessData(null)
  }

  const handleCancelSelection = () => {
    setSelectedSquares([])
    setShowClaimModal(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-[var(--color-border)] p-10">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--color-primary)] mb-5"></div>
          <p className="text-base font-medium text-[var(--color-text-secondary)]">Loading game...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-[var(--color-border)] p-10">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-red-500 text-5xl mb-5">⚠️</div>
          <p className="text-base font-medium text-[var(--color-text-secondary)]">{error}</p>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-[var(--color-border)] p-10">
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-base font-medium text-[var(--color-text-secondary)]">No active game</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {!canSelect && (
        <div
          data-testid="view-only-notice"
          className="no-print mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-text-secondary)]"
        >
          Squares are view-only right now — contact the organizer to claim.
        </div>
      )}

      {/* Selection Panel — z-50 so Clear/Claim stay clickable above popover backdrop */}
      {canSelect && selectedSquares.length > 0 && (
        <div className="no-print relative z-50 bg-[var(--color-primary)] text-white rounded-xl shadow-lg mb-6 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white text-[var(--color-primary)] rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                {selectedSquares.length}
              </div>
              <div>
                <div className="font-bold text-lg">
                  {selectedSquares.length} square{selectedSquares.length > 1 ? 's' : ''} selected
                </div>
                <div className="text-sm opacity-90 mt-0.5">
                  Subtotal: ${selectedSquares.length * game.cost_per_square}
                </div>
              </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleCancelSelection}
                className="flex-1 sm:flex-initial min-h-[44px] touch-manipulation px-5 py-2.5 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-[var(--color-primary)] transition-all"
              >
                Clear
              </button>
              <button
                onClick={handleProceedToClaim}
                data-testid="claim-now-button"
                className="flex-1 sm:flex-initial min-h-[44px] touch-manipulation px-5 py-2.5 bg-white text-[var(--color-primary)] rounded-lg font-semibold hover:bg-opacity-90 shadow-md transition-all"
              >
                Claim Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={boardRef}
        id="print-board"
        className="bg-white rounded-xl shadow-md overflow-hidden border border-[var(--color-border)] min-w-0 w-full max-w-full"
      >
      {/* Board container */}
      <div className="print-board-inner p-6 min-w-0">
        {/* NFC header - full width bar */}
        <div className="mb-4 min-w-0">
          <div
            data-testid="nfc-axis-label"
            title={formatAxisLabel('NFC', game.nfc_team)}
            className="font-bold text-white text-center text-base sm:text-lg py-3 px-3 sm:px-4 rounded-lg bg-[var(--color-nfc)] shadow-sm truncate max-w-full"
          >
            {formatAxisLabel('NFC', game.nfc_team)}
          </div>
        </div>

        <div className="print-board-axes flex gap-3 sm:gap-4 min-w-0">
          {/* Left AFC label - full height vertical bar */}
          <div className="print-afc-rail flex items-stretch flex-shrink-0 max-w-[3rem] sm:max-w-[3.5rem]">
            <div
              data-testid="afc-axis-label"
              title={formatAxisLabel('AFC', game.afc_team)}
              className="font-bold text-white text-base sm:text-lg px-2 sm:px-4 py-3 rounded-lg bg-[var(--color-afc)] shadow-sm flex items-center justify-center max-h-full overflow-hidden"
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
              }}
            >
              <span className="truncate max-h-full">{formatAxisLabel('AFC', game.afc_team)}</span>
            </div>
          </div>

          {/* One CSS grid for headers + cells so columns/rows share tracks */}
          <div
            data-testid="board-scroll"
            className="board-scroll flex-1 min-w-0 overflow-auto"
          >
            <div data-testid="board-grid" className="board-grid">
              {/* Sticky corner */}
              <div
                data-testid="board-corner"
                className="board-corner"
                aria-hidden="true"
              />

              {/* NFC column headers (top) */}
              {nfcNumbers.map((num, i) => (
                <div
                  key={`nfc-${i}`}
                  data-testid={`nfc-num-${i}`}
                  data-col={i}
                  className="board-nfc-header"
                >
                  {num === -1 ? '?' : num}
                </div>
              ))}

              {Array.from({ length: 10 }, (_, row) => (
                <React.Fragment key={`row-${row}`}>
                  <div
                    data-testid={`afc-num-${row}`}
                    data-row={row}
                    className="board-afc-header"
                  >
                    {afcNumbers[row] === -1 ? '?' : afcNumbers[row]}
                  </div>
                  {Array.from({ length: 10 }, (_, col) => {
                    const position = row * 10 + col
                    const square = squares.find((s) => s.position === position)
                    const isClaimed = Boolean(square?.claimed_by_name)
                    const isPaid = isClaimed && square?.payment_status === 'paid'
                    const isSelected = canSelect && selectedSquares.includes(position)

                    let bgColor = 'bg-white'
                    let borderColor = 'border-[var(--color-border-light)]'
                    let textColor = 'text-[var(--color-text-muted)]'
                    let cursorStyle = canSelect ? 'cursor-pointer' : 'cursor-default'
                    let hoverClass = canSelect
                      ? 'hover:border-[var(--color-primary)] hover:shadow-md hover:bg-slate-50'
                      : ''

                    if (isClaimed) {
                      bgColor = 'bg-slate-100'
                      borderColor = isPaid
                        ? 'border-[var(--color-paid)]'
                        : 'border-[var(--color-border)]'
                      textColor = 'text-[var(--color-text-secondary)]'
                      cursorStyle = 'cursor-not-allowed'
                      hoverClass = ''
                    } else if (isSelected) {
                      bgColor = 'bg-[var(--color-primary)]'
                      borderColor = 'border-[var(--color-primary)]'
                      textColor = 'text-white'
                      hoverClass = 'hover:bg-opacity-90'
                    }

                    // Storage position is 0–99; badges use displaySquareNumber → #1–#100.
                    const displayText =
                      isClaimed && square?.claimed_by_name
                        ? square.claimed_by_name
                        : isSelected
                          ? formatSquareLabel(position)
                          : canSelect
                            ? '+'
                            : ''

                    return (
                      <button
                        key={position}
                        data-position={position}
                        data-row={row}
                        data-col={col}
                        data-selected={isSelected ? 'true' : 'false'}
                        onClick={() => handleSquareClick(position)}
                        disabled={isClaimed || !canSelect}
                        className={`board-cell aspect-square w-full ${isPaid ? 'border-[3px]' : 'border-2'} ${borderColor} rounded text-[10px] font-semibold leading-tight transition-all ${bgColor} ${textColor} flex items-center justify-center p-0.5 ${cursorStyle} ${hoverClass}`}
                        title={
                          isClaimed
                            ? `${square?.claimed_by_name}${isPaid ? ' (Paid)' : ' (Unpaid)'}`
                            : !canSelect
                              ? 'View only'
                              : isSelected
                                ? `Selected ${formatSquareLabel(position)} — Click to deselect`
                                : 'Available - Click to select'
                        }
                      >
                        <span className="break-words text-center line-clamp-2 w-full">
                          {displayText}
                        </span>
                      </button>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="no-print mt-6 pt-6 border-t border-[var(--color-border-light)] flex flex-wrap justify-center gap-6 text-sm font-medium text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--color-border-light)] bg-white flex items-center justify-center text-[var(--color-text-muted)] text-xs rounded shadow-sm">+</div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] bg-[var(--color-primary)] flex items-center justify-center text-white text-[8px] rounded shadow-sm">#</div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--color-border)] bg-slate-100 rounded shadow-sm"></div>
            <span>Claimed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-[3px] border-[var(--color-paid)] bg-slate-100 rounded shadow-sm"></div>
            <span>Paid</span>
          </div>
        </div>
      </div>
    </div>

      {/* Modals */}
      {showClaimModal && (
        <ClaimPopover
          selectedSquares={selectedSquares}
          costPerSquare={game.cost_per_square}
          venmoHandle={game.venmo_handle}
          onClose={() => setShowClaimModal(false)}
          onSubmit={handleClaimSubmit}
          boardRef={boardRef}
        />
      )}

      {showSuccess && successData && (
        <ClaimSuccess
          squareCount={successData.squareCount}
          positions={successData.positions}
          totalCost={successData.totalCost}
          paymentMethod={successData.paymentMethod}
          venmoHandle={game.venmo_handle}
          onClose={handleCloseSuccess}
        />
      )}
    </>
  )
}
