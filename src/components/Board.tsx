import React, { useState } from 'react'

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
  const nfcNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  const afcNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

  const handleSquareClick = (index: number) => {
    if (!squares[index].claimed) {
      // TODO: Open claim modal
      alert(`Claim square ${index + 1}`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Board container */}
      <div className="p-8">
        <div className="flex gap-4">
          {/* Left AFC label (vertical) */}
          <div className="flex items-center justify-center">
            <div 
              className="font-bold text-white text-base px-2 py-6 rounded whitespace-nowrap bg-[var(--color-secondary)]"
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
                className="font-bold text-white text-center py-2 rounded-t mb-3 bg-[var(--color-primary)]"
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
                    className="w-10 h-10 flex items-center justify-center font-bold text-sm bg-[#4a5568] text-white"
                  >
                    {num}
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
                      className="w-10 h-10 flex items-center justify-center font-bold text-sm bg-[var(--color-secondary)] text-white"
                    >
                      {afcNumbers[row]}
                    </div>
                    {/* Squares for this row */}
                    {Array.from({ length: 10 }, (_, col) => {
                      const index = row * 10 + col
                      const square = squares[index]
                      
                      let bgColor = 'bg-white'
                      let textColor = 'text-green-500'
                      if (square.claimed && square.paid) {
                        bgColor = 'bg-yellow-100'
                        textColor = 'text-gray-700'
                      } else if (square.claimed) {
                        bgColor = 'bg-yellow-100'
                        textColor = 'text-gray-700'
                      }

                      return (
                        <button
                          key={square.id}
                          onClick={() => handleSquareClick(index)}
                          className={`w-10 h-10 border border-gray-300 text-lg font-medium hover:border-[var(--color-primary)] hover:border-2 transition-colors ${bgColor} ${textColor} flex items-center justify-center`}
                          title={square.claimed ? `Claimed by ${square.claimedBy}` : 'Available'}
                        >
                          {square.claimed && square.claimedBy 
                            ? square.claimedBy.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                            : '+'}
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
        <div className="mt-6 flex justify-center gap-6 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 border border-gray-300 bg-white flex items-center justify-center text-green-500 text-xs">+</div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 border border-gray-300 bg-yellow-100"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 border border-gray-300 bg-gray-200"></div>
            <span>Claimed</span>
          </div>
        </div>
      </div>
    </div>
  )
}
