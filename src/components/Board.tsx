import React, { useState, useEffect } from 'react'
import { supabase, Square as SquareType, Game } from '../lib/supabase'
import ClaimModal from './ClaimModal'
import ClaimSuccess from './ClaimSuccess'

export default function Board() {
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
        .single()

      if (gameError) {
        if (gameError.code === 'PGRST116') {
          setError('No active game found')
        } else {
          throw gameError
        }
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
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mb-4"></div>
          <p className="text-[var(--color-text-muted)]">Loading game...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-[var(--color-text-muted)]">{error}</p>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-[var(--color-text-muted)]">No active game</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Selection Panel */}
      {selectedSquares.length > 0 && (
        <div className="bg-[var(--color-primary)] text-white rounded-xl shadow-lg mb-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white text-[var(--color-primary)] rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                {selectedSquares.length}
              </div>
              <div>
                <div className="font-bold">
                  {selectedSquares.length} square{selectedSquares.length > 1 ? 's' : ''} selected
                </div>
                <div className="text-sm opacity-90">
                  Total: ${selectedSquares.length * game.cost_per_square}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelSelection}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-semibold transition-all"
              >
                Clear
              </button>
              <button
                onClick={handleProceedToClaim}
                className="px-4 py-2 bg-white text-[var(--color-primary)] rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Claim Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {/* Board container */}
      <div className="p-8">
        <div className="flex gap-4">
          {/* Left AFC label (vertical) */}
          <div className="flex items-center justify-center">
            <div 
              className="font-bold text-white text-base px-2 py-6 rounded-lg whitespace-nowrap bg-[var(--color-secondary)] shadow-md"
              style={{ 
                writingMode: 'vertical-rl',
                textOrientation: 'mixed'
              }}
            >
              AFC
            </div>
          </div>

          {/* Main grid with NFC header */}
          <div className="flex-1">
            {/* NFC header with numbers */}
            <div className="mb-3">
              <div 
                className="font-bold text-white text-center py-2 rounded-lg mb-3 bg-[var(--color-primary)] shadow-md"
              >
                NFC
              </div>
              <div className="grid grid-cols-11 gap-1.5">
                {/* Empty corner cell */}
                <div className="w-10 h-10"></div>
                {/* NFC numbers */}
                {nfcNumbers.map((num, i) => (
                  <div
                    key={`nfc-${i}`}
                    className="w-10 h-10 flex items-center justify-center font-bold text-sm bg-[#4a5568] text-white rounded shadow-sm"
                  >
                    {num === -1 ? '?' : num}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid with AFC numbers and squares */}
            <div className="grid grid-cols-11 gap-1.5">
              {Array.from({ length: 10 }, (_, row) => {
                return (
                  <React.Fragment key={`row-${row}`}>
                    {/* AFC number for this row */}
                    <div
                      className="w-10 h-10 flex items-center justify-center font-bold text-sm bg-[var(--color-secondary)] text-white rounded shadow-sm"
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
                      let borderColor = 'border-gray-300'
                      let textColor = 'text-green-500'
                      let cursorStyle = 'cursor-pointer'
                      
                      if (isClaimed) {
                        bgColor = 'bg-gray-200'
                        textColor = 'text-gray-700'
                        cursorStyle = 'cursor-not-allowed'
                      } else if (isSelected) {
                        bgColor = 'bg-yellow-100'
                        borderColor = 'border-[var(--color-primary)]'
                        textColor = 'text-[var(--color-primary)]'
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
                          className={`w-10 h-10 border-2 ${borderColor} rounded text-lg font-medium hover:border-[var(--color-primary)] hover:shadow-md transition-all ${bgColor} ${textColor} flex items-center justify-center ${cursorStyle} disabled:hover:border-gray-300 disabled:hover:shadow-none`}
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
        <div className="mt-6 flex justify-center gap-8 text-xs font-medium text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border border-gray-300 bg-white flex items-center justify-center text-green-500 text-xs rounded shadow-sm">+</div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-[var(--color-primary)] bg-yellow-100 flex items-center justify-center text-[var(--color-primary)] text-xs rounded shadow-sm">✓</div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border border-gray-300 bg-gray-200 rounded shadow-sm"></div>
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
