import React, { useState, useEffect } from 'react'
import { supabase, type Square, type Game } from '../lib/supabase'
import ClaimModal from './ClaimModal'
import ClaimSuccess from './ClaimSuccess'

interface BoardProps {
  onClaimSuccess?: () => void
}

export default function Board({ onClaimSuccess }: BoardProps = {}) {
  const [squares, setSquares] = useState<Square[]>([])
  const [game, setGame] = useState<Game | null>(null)
  const [selectedSquares, setSelectedSquares] = useState<number[]>([])
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{
    squareCount: number
    totalCost: number
    paymentMethod: 'cash' | 'venmo'
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch active game and squares
  useEffect(() => {
    fetchGameAndSquares()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchGameAndSquares = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch active game
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'active')
        .maybeSingle()

      if (gameError) {
        console.error('Error fetching game:', gameError)
        
        // Only use mock data in dev mode with explicit flag
        if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
          console.log('Using mock data (dev mode)')
          loadMockData()
          return
        }
        
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

      // Fetch squares for this game
      const { data: squaresData, error: squaresError } = await supabase
        .from('squares')
        .select('*')
        .eq('game_id', gameData.id)
        .order('position')

      if (squaresError) throw squaresError

      setSquares(squaresData || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching game data:', err)
      
      // Only use mock data in dev mode with explicit flag
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
        console.log('Using mock data (dev mode)')
        loadMockData()
        return
      }
      
      setError('Failed to load game data. Please refresh the page.')
      setLoading(false)
    }
  }

  const loadMockData = () => {
    setGame({
      id: 'mock',
      season: 2026,
      afc_team: 'Kansas City Chiefs',
      nfc_team: 'San Francisco 49ers',
      cost_per_square: 10,
      charity_percentage: 10,
      q1_payout: 100,
      q2_payout: 100,
      q3_payout: 100,
      final_payout: 600,
      venmo_handle: '@snps-squares',
      join_password: '',
      numbers_locked: true,
      afc_numbers: [3, 7, 0, 6, 1, 4, 9, 2, 8, 5],
      nfc_numbers: [2, 5, 8, 1, 9, 3, 6, 0, 7, 4],
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    const mockSquares = Array.from({ length: 100 }, (_, i) => {
      const isClaimed = i % 4 === 0
      return {
        id: `mock-${i}`,
        game_id: 'mock',
        position: i,
        first_name: isClaimed ? 'Test' : null,
        last_name: isClaimed ? 'User' : null,
        claimed_by_name: isClaimed ? `User ${Math.floor(i / 4)}` : null,
        claimed_by_email: isClaimed ? `user${i}@test.com` : null,
        claimed_at: isClaimed ? new Date().toISOString() : null,
        payment_status: isClaimed ? 'paid' : 'unpaid',
        payment_method: isClaimed ? 'venmo' : null,
        paid_at: isClaimed ? new Date().toISOString() : null
      } as Square
    })

    setSquares(mockSquares)
    setLoading(false)
  }

  const nfcNumbers = game?.nfc_numbers || [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
  const afcNumbers = game?.afc_numbers || [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]

  const handleSquareClick = (position: number) => {
    const square = squares.find((s) => s.position === position)
    
    // If square is already claimed, do nothing
    if (square?.claimed_by_email) {
      return
    }

    // Toggle selection
    setSelectedSquares((prev) => {
      if (prev.includes(position)) {
        return prev.filter((p) => p !== position)
      } else {
        return [...prev, position]
      }
    })
  }

  const handleProceedToClaim = () => {
    if (selectedSquares.length === 0) return
    setShowClaimModal(true)
  }

  const handleClaimSubmit = async (data: {
    firstName: string
    lastName: string
    email: string
    paymentMethod: 'cash' | 'venmo'
  }) => {
    if (!game) throw new Error('No active game')

    // Update claims for all selected squares
    // We update each square individually to handle race conditions better
    const updatePromises = selectedSquares.map((position) =>
      supabase
        .from('squares')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          claimed_by_email: data.email,
          payment_method: data.paymentMethod,
          payment_status: 'unpaid' as const,
          claimed_at: new Date().toISOString(),
        })
        .eq('game_id', game.id)
        .eq('position', position)
        .is('claimed_by_email', null) // Only claim if not already claimed
    )

    const results = await Promise.all(updatePromises)
    
    // Check for errors
    const errors = results.filter((r) => r.error)
    if (errors.length > 0) {
      throw new Error(errors[0].error?.message || 'Failed to claim squares')
    }

    // Success!
    setSuccessData({
      squareCount: selectedSquares.length,
      totalCost: selectedSquares.length * game.cost_per_square,
      paymentMethod: data.paymentMethod,
    })
    setShowClaimModal(false)
    setShowSuccess(true)
    setSelectedSquares([])
    
    // Refresh squares
    await fetchGameAndSquares()
    
    // Notify parent component
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
      {/* Selection Panel */}
      {selectedSquares.length > 0 && (
        <div className="bg-[var(--color-primary)] text-white rounded-xl shadow-lg mb-6 p-6">
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
                  Total: ${selectedSquares.length * game.cost_per_square}
                </div>
              </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleCancelSelection}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-[var(--color-primary)] transition-all"
              >
                Clear
              </button>
              <button
                onClick={handleProceedToClaim}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-white text-[var(--color-primary)] rounded-lg font-semibold hover:bg-opacity-90 shadow-md transition-all"
              >
                Claim Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-[var(--color-border)] min-w-0">
      {/* Board container */}
      <div className="p-3 sm:p-6 min-w-0">
        {/* NFC header - full width bar */}
        <div className="mb-3 sm:mb-4 min-w-0">
          <div className="font-bold text-white text-center text-base sm:text-lg py-2 sm:py-3 px-3 sm:px-4 rounded-lg bg-[var(--color-nfc)] shadow-sm">
            NFC
          </div>
        </div>

        <div className="flex gap-2 sm:gap-4 min-w-0">
          {/* Left AFC label - full height vertical bar */}
          <div className="flex items-stretch flex-shrink-0">
            <div 
              className="font-bold text-white text-base sm:text-lg px-2 sm:px-4 py-2 sm:py-3 rounded-lg bg-[var(--color-afc)] shadow-sm flex items-center justify-center"
              style={{ 
                writingMode: 'vertical-rl',
                textOrientation: 'mixed'
              }}
            >
              AFC
            </div>
          </div>

          {/* Main grid container with horizontal scroll on mobile */}
          <div className="flex-1 min-w-0 overflow-x-auto max-w-full">
            {/* NFC numbers row */}
            <div className="grid gap-1 sm:gap-2 mb-3 sm:mb-4" style={{ gridTemplateColumns: 'auto repeat(10, minmax(24px, 1fr))' }}>
              {/* Empty corner cell */}
              <div className="aspect-square"></div>
              {/* NFC numbers */}
              {nfcNumbers.map((num, i) => (
                <div
                  key={`nfc-${i}`}
                  className="aspect-square w-full flex items-center justify-center font-bold text-xs sm:text-sm bg-[var(--color-nfc)] text-white rounded shadow-sm"
                >
                  {num === -1 ? '?' : num}
                </div>
              ))}
            </div>

            {/* Grid with AFC numbers and squares */}
            <div className="grid gap-1 sm:gap-2" style={{ gridTemplateColumns: 'auto repeat(10, minmax(24px, 1fr))' }}>
              {Array.from({ length: 10 }, (_, row) => {
                return (
                  <React.Fragment key={`row-${row}`}>
                    {/* AFC number for this row */}
                    <div
                      className="aspect-square w-full flex items-center justify-center font-bold text-xs sm:text-sm bg-[var(--color-afc)] text-white rounded shadow-sm"
                    >
                      {afcNumbers[row] === -1 ? '?' : afcNumbers[row]}
                    </div>
                    {/* Squares for this row */}
                    {Array.from({ length: 10 }, (_, col) => {
                      const position = row * 10 + col
                      const square = squares.find((s) => s.position === position)
                      const isClaimed = Boolean(square?.claimed_by_email)
                      const isSelected = selectedSquares.includes(position)
                      
                      let bgColor = 'bg-white'
                      let borderColor = 'border-[var(--color-border-light)]'
                      let textColor = 'text-[var(--color-text-muted)]'
                      let cursorStyle = 'cursor-pointer'
                      let hoverClass = 'hover:border-[var(--color-primary)] hover:shadow-md hover:bg-slate-50'
                      
                      if (isClaimed) {
                        bgColor = 'bg-slate-100'
                        borderColor = 'border-[var(--color-border)]'
                        textColor = 'text-[var(--color-text-secondary)]'
                        cursorStyle = 'cursor-not-allowed'
                        hoverClass = ''
                      } else if (isSelected) {
                        bgColor = 'bg-[var(--color-primary)]'
                        borderColor = 'border-[var(--color-primary)]'
                        textColor = 'text-white'
                        hoverClass = 'hover:bg-opacity-90'
                      }

                      const displayText = isClaimed && square?.claimed_by_name
                        ? square.claimed_by_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                        : isSelected
                        ? '✓'
                        : '+'

                      return (
                        <button
                          key={position}
                          onClick={() => handleSquareClick(position)}
                          disabled={isClaimed}
                          className={`aspect-square w-full border-2 ${borderColor} rounded text-xs sm:text-sm font-semibold transition-all ${bgColor} ${textColor} flex items-center justify-center ${cursorStyle} ${hoverClass}`}
                          title={
                            isClaimed
                              ? `Claimed by ${square?.claimed_by_name}`
                              : isSelected
                              ? 'Selected - Click to deselect'
                              : 'Available - Click to select'
                          }
                        >
                          {displayText}
                        </button>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-[var(--color-border-light)] flex flex-wrap justify-center gap-8 text-sm font-medium text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--color-border-light)] bg-white flex items-center justify-center text-[var(--color-text-muted)] text-xs rounded shadow-sm">+</div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] bg-[var(--color-primary)] flex items-center justify-center text-white text-xs rounded shadow-sm">✓</div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--color-border)] bg-slate-100 rounded shadow-sm"></div>
            <span>Claimed</span>
          </div>
        </div>
      </div>
    </div>

      {/* Modals */}
      {showClaimModal && (
        <ClaimModal
          selectedSquares={selectedSquares}
          costPerSquare={game.cost_per_square}
          venmoHandle={game.venmo_handle}
          onClose={() => setShowClaimModal(false)}
          onSubmit={handleClaimSubmit}
        />
      )}

      {showSuccess && successData && (
        <ClaimSuccess
          squareCount={successData.squareCount}
          totalCost={successData.totalCost}
          paymentMethod={successData.paymentMethod}
          venmoHandle={game.venmo_handle}
          onClose={handleCloseSuccess}
        />
      )}
    </>
  )
}
