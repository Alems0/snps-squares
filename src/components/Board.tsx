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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {/* Board container */}
      <div className="p-4 sm:p-8">
        {/* NFC header - full width bar */}
        <div className="mb-4">
          <div className="font-bold text-white text-center py-3 rounded-lg bg-[var(--color-primary)] shadow-md">
            NFC
          </div>
        </div>

        {/* Scrollable board wrapper - prevents page overflow on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 sm:gap-4 min-w-max">
            {/* Left AFC label (vertical full-height bar) */}
            <div className="flex flex-col">
              <div 
                className="font-bold text-white text-base px-3 py-4 rounded-lg whitespace-nowrap bg-[var(--color-secondary)] shadow-md flex-1 flex items-center justify-center"
                style={{ 
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed'
                }}
              >
                AFC
              </div>
            </div>

            {/* Main grid with numbers */}
            <div className="flex-1">
              {/* NFC numbers row */}
              <div className="mb-3">
                <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
                  {/* Empty corner cell */}
                  <div className="w-8 h-8 sm:w-10 sm:h-10"></div>
                  {/* NFC numbers */}
                  {nfcNumbers.map((num, i) => (
                    <div
                      key={`nfc-${i}`}
                      className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-xs sm:text-sm bg-[#4a5568] text-white rounded shadow-sm"
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid with AFC numbers and squares */}
              <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
              {Array.from({ length: 10 }, (_, row) => {
                return (
                  <React.Fragment key={`row-${row}`}>
                    {/* AFC number for this row */}
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-xs sm:text-sm bg-[var(--color-secondary)] text-white rounded shadow-sm"
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
                          className={`w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 rounded text-sm sm:text-lg font-medium hover:border-[var(--color-primary)] hover:border-2 hover:shadow-md transition-all ${bgColor} ${textColor} flex items-center justify-center active:scale-95`}
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
        </div>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap justify-center gap-4 sm:gap-8 text-xs font-medium text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border border-gray-300 bg-white flex items-center justify-center text-green-500 text-xs rounded shadow-sm">+</div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border border-gray-300 bg-yellow-100 rounded shadow-sm"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border border-gray-300 bg-gray-200 rounded shadow-sm"></div>
            <span>Claimed</span>
          </div>
        </div>
      </div>
    </div>
  )
}
