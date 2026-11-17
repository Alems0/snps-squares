import React, { useState, useEffect } from 'react'
import { supabase, Square as SquareType, Game } from '../lib/supabase'
import ClaimModal from './ClaimModal'
import ClaimSuccess from './ClaimSuccess'

interface BoardProps {
  onClaimSuccess?: () => void
}

export default function Board({ onClaimSuccess }: BoardProps = {}) {
  const [squares, setSquares] = useState<SquareType[]>([])
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
        setError(`Failed to load game: ${gameError.message || 'Unknown error'}`)
        setLoading(false)
        return
      }

      if (!gameData) {
        setError('No active game found')
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
      setError('Failed to load game data')
      setLoading(false)
    }
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

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-[var(--color-border)]">
      {/* Board container */}
      <div className="p-6 md:p-10">
        <div className="flex gap-3 md:gap-4">
          {/* Left AFC label (vertical) */}
          <div className="flex items-center justify-center">
            <div 
              className="font-bold text-white text-base md:text-lg px-3 py-6 md:py-8 rounded-lg whitespace-nowrap bg-[var(--color-afc)] shadow-sm"
              style={{ 
                writingMode: 'vertical-rl',
                textOrientation: 'mixed'
              }}
            >
              AFC
            </div>
          </div>

          {/* Main grid with NFC header */}
          <div className="flex-1 overflow-x-auto">
            {/* NFC header with numbers */}
            <div className="mb-3 md:mb-4">
              <div 
                className="font-bold text-white text-center text-base md:text-lg py-2 md:py-3 px-4 rounded-lg mb-3 md:mb-4 bg-[var(--color-nfc)] shadow-sm"
              >
                NFC
              </div>
              <div className="grid grid-cols-11 gap-1.5 md:gap-2">
                {/* Empty corner cell */}
                <div className="w-10 h-10 md:w-12 md:h-12"></div>
                {/* NFC numbers */}
                {nfcNumbers.map((num, i) => (
                  <div
                    key={`nfc-${i}`}
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center font-bold text-sm md:text-base bg-[var(--color-nfc)] text-white rounded-md shadow-sm"
                  >
                    {num === -1 ? '?' : num}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid with AFC numbers and squares */}
            <div className="grid grid-cols-11 gap-1.5 md:gap-2">
              {Array.from({ length: 10 }, (_, row) => {
                return (
                  <React.Fragment key={`row-${row}`}>
                    {/* AFC number for this row */}
                    <div
                      className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center font-bold text-sm md:text-base bg-[var(--color-afc)] text-white rounded-md shadow-sm"
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
                          className={`w-10 h-10 md:w-12 md:h-12 border-2 ${borderColor} rounded-md text-sm md:text-base font-semibold transition-all ${bgColor} ${textColor} flex items-center justify-center ${cursorStyle} ${hoverClass}`}
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
        <div className="mt-6 md:mt-8 pt-6 border-t border-[var(--color-border-light)] flex flex-wrap justify-center gap-6 md:gap-10 text-sm font-medium text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 border-2 border-[var(--color-border-light)] bg-white flex items-center justify-center text-[var(--color-text-muted)] text-xs rounded-md shadow-sm">+</div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] bg-[var(--color-primary)] flex items-center justify-center text-white text-xs rounded-md shadow-sm ring-2 ring-[var(--color-primary)] ring-offset-2">✓</div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 border-2 border-[var(--color-border)] bg-slate-100 rounded-md shadow-sm"></div>
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
