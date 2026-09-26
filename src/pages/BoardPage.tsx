import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Board from '../components/Board'
import { supabase } from '../lib/supabase'

interface TopBuyer {
  name: string
  email: string
  squareCount: number
  totalCost: number
}

export default function BoardPage() {
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopBuyers()
  }, [])

  const fetchTopBuyers = async () => {
    try {
      setLoading(true)

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id, cost_per_square')
        .eq('status', 'active')
        .maybeSingle()

      if (gameError || !gameData) {
        console.error('Error fetching game for top buyers:', gameError)
        setLoading(false)
        return
      }

      const { data: squaresData, error: squaresError } = await supabase
        .from('squares')
        .select('claimed_by_name, claimed_by_email')
        .eq('game_id', gameData.id)
        .not('claimed_by_email', 'is', null)

      if (squaresError) {
        console.error('Error fetching squares for top buyers:', squaresError)
        setLoading(false)
        return
      }

      const buyerMap = new Map<string, { name: string; count: number }>()
      
      squaresData?.forEach((square) => {
        if (square.claimed_by_email) {
          const existing = buyerMap.get(square.claimed_by_email)
          if (existing) {
            existing.count++
          } else {
            buyerMap.set(square.claimed_by_email, {
              name: square.claimed_by_name || 'Unknown',
              count: 1,
            })
          }
        }
      })

      const buyers: TopBuyer[] = Array.from(buyerMap.entries())
        .map(([email, { name, count }]) => ({
          name,
          email,
          squareCount: count,
          totalCost: count * gameData.cost_per_square,
        }))
        .sort((a, b) => b.squareCount - a.squareCount)
        .slice(0, 5)

      setTopBuyers(buyers)
      setLoading(false)
    } catch (err) {
      console.error('Error in fetchTopBuyers:', err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-[#16a34a] text-white py-6 px-4 shadow-lg">
        <div className="container mx-auto max-w-7xl flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🏈</span>
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">SNPS Squares</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider opacity-90 font-semibold">Prize Pot</div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight">$0</div>
            </div>
            <Link
              to="/admin"
              className="border-2 border-white text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold hover:bg-white hover:text-[#16a34a] transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Three Column Layout */}
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 mt-8 sm:mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Panel - Rules */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200" data-section="rules">
              <div className="bg-[var(--color-primary)] text-white px-6 py-5">
                <h2 className="text-lg font-bold tracking-tight">Game Rules</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-[var(--color-text)] leading-relaxed mb-5 break-words">
                  Each square costs $10. Numbers will be randomly assigned after all squares are filled. Winners are determined by the last digit of each team's score at the end of each quarter.
                </p>
                <div className="border-t border-gray-200 pt-5 space-y-4">
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-2">
                      Cost per Square
                    </div>
                    <div className="text-3xl font-bold text-[var(--color-primary)] tracking-tight">$10</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                      Charity Donation (10%)
                    </div>
                    <div className="text-sm font-semibold text-[var(--color-secondary)]">Community Charity</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Panel - Board */}
          <div className="lg:col-span-6">
            <Board onClaimSuccess={fetchTopBuyers} />
          </div>

          {/* Right Panel - Top Buyers */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-[var(--color-primary)] text-white px-6 py-5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <h2 className="text-lg font-bold tracking-tight">Top Buyers</h2>
                </div>
                <span className="text-xs opacity-90 font-semibold uppercase tracking-wider">Most Active</span>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mb-3"></div>
                    <p className="text-xs text-[var(--color-text-muted)]">Loading...</p>
                  </div>
                ) : topBuyers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="text-gray-300 mb-4">
                      <svg className="w-20 h-20 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text-muted)]">No squares claimed yet</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">Be the first to join!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topBuyers.map((buyer, index) => (
                      <div
                        key={buyer.email}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-[var(--color-primary)] transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-[var(--color-text)] truncate">
                              {buyer.name}
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)] truncate">
                              {buyer.squareCount} square{buyer.squareCount > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm text-[var(--color-success)]">
                            ${buyer.totalCost}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4 mt-12">
        <div className="container mx-auto max-w-7xl flex flex-wrap justify-center gap-4 sm:gap-8 text-sm font-medium text-[var(--color-text-muted)]">
          <button
            onClick={() => {
              const rulesSection = document.querySelector('[data-section="rules"]')
              rulesSection?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="hover:text-[var(--color-primary)] transition-colors hover:underline"
          >
            How to Play
          </button>
          <button
            onClick={() => {
              const rulesSection = document.querySelector('[data-section="rules"]')
              rulesSection?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="hover:text-[var(--color-primary)] transition-colors hover:underline"
          >
            Rules
          </button>
          <Link to="/" className="hover:text-[var(--color-primary)] transition-colors hover:underline">
            Support
          </Link>
        </div>
        <div className="container mx-auto max-w-7xl text-center mt-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} SNPS Squares. For entertainment purposes only.
          </p>
        </div>
      </footer>
    </div>
  )
}
