import { useState } from 'react'

interface Square {
  id: string
  claimed: boolean
  claimedBy?: string
  paid?: boolean
}

export default function Board() {
  const [squares] = useState<Square[]>(() => {
    // Initialize 100 squares (10x10 grid)
    return Array.from({ length: 100 }, (_, i) => ({
      id: `square-${i}`,
      claimed: false,
    }))
  })

  // Placeholder numbers for the axes (will be randomized by admin)
  const afcNumbers = ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  const nfcNumbers = ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-']

  const handleSquareClick = (index: number) => {
    if (!squares[index].claimed) {
      // TODO: Open claim modal
      alert(`Claim square ${index + 1}`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Game Board</h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[var(--color-success)] rounded"></div>
            <span>Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[var(--color-warning)] rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[var(--color-border)] rounded"></div>
            <span>Available</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Board container with AFC label on the left */}
          <div className="flex">
            {/* Left AFC label (vertical) */}
            <div className="flex items-center justify-center mr-2">
              <div 
                className="font-bold text-white text-lg px-2 py-4 rounded whitespace-nowrap"
                style={{ 
                  writingMode: 'vertical-rl',
                  backgroundColor: 'var(--color-afc)'
                }}
              >
                AFC
              </div>
            </div>

            {/* Main grid with NFC header */}
            <div className="flex-1">
              {/* NFC header with numbers */}
              <div className="mb-2">
                <div 
                  className="font-bold text-white text-center py-2 rounded mb-1"
                  style={{ backgroundColor: 'var(--color-nfc)' }}
                >
                  NFC
                </div>
                <div className="grid grid-cols-10 gap-1">
                  <div className="w-8 h-8"></div>
                  {nfcNumbers.map((num, i) => (
                    <div
                      key={`nfc-${i}`}
                      className="w-8 h-8 flex items-center justify-center font-bold text-sm bg-[var(--color-nfc)] text-white rounded"
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid with AFC numbers and squares */}
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, row) => (
                  <>
                    {/* AFC number for this row */}
                    <div
                      key={`afc-${row}`}
                      className="w-8 h-8 flex items-center justify-center font-bold text-sm bg-[var(--color-afc)] text-white rounded"
                    >
                      {afcNumbers[row]}
                    </div>
                    {/* Squares for this row */}
                    {Array.from({ length: 10 }, (_, col) => {
                      const index = row * 10 + col
                      const square = squares[index]
                      
                      let bgColor = 'bg-white'
                      if (square.claimed && square.paid) {
                        bgColor = 'bg-[var(--color-success)]'
                      } else if (square.claimed) {
                        bgColor = 'bg-[var(--color-warning)]'
                      }

                      return (
                        <button
                          key={square.id}
                          onClick={() => handleSquareClick(index)}
                          className={`w-8 h-8 border-2 border-[var(--color-border)] rounded text-xs font-medium hover:border-[var(--color-primary)] transition-colors ${bgColor} ${
                            square.claimed ? 'text-white' : 'text-[var(--color-text)]'
                          }`}
                          title={square.claimed ? `Claimed by ${square.claimedBy}` : 'Available'}
                        >
                          {square.claimed && square.claimedBy 
                            ? square.claimedBy.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                            : ''}
                        </button>
                      )
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile-friendly note */}
          <p className="text-xs text-[var(--color-text-muted)] mt-4 text-center">
            Scroll horizontally if needed • Numbers will be randomly assigned after board fills
          </p>
        </div>
      </div>
    </div>
  )
}
