import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Board from '../components/Board'
import { supabase, type Game } from '../lib/supabase'

interface TopBuyer {
  name: string
  email: string
  squareCount: number
  totalCost: number
}

interface FAQItem {
  question: string
  answer: string
}

export default function BoardPage() {
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([])
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [prizePot, setPrizePot] = useState(0)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const faqItems: FAQItem[] = [
    {
      question: "How do winners work?",
      answer: "Winners are determined by the last digit of each team's score at the end of each quarter. For example, if the NFC team has 17 points and the AFC team has 14 points, the winning square is where row 7 and column 4 intersect."
    },
    {
      question: "When are the numbers assigned?",
      answer: "Numbers are randomly assigned after all squares are claimed or when the administrator locks the board. Until then, you won't know which numbers you have - that's part of the fun!"
    },
    {
      question: "How do I pay for my squares?",
      answer: "Payment is handled directly with the administrator via Venmo or cash. After claiming your square(s), you'll receive payment instructions. The admin will mark your squares as paid once payment is received."
    },
    {
      question: "What portion goes to charity?",
      answer: "A percentage of all proceeds (typically displayed on the board) goes directly to SNPS community charity causes. The rest is distributed as prizes to quarter winners."
    },
    {
      question: "Do I need to create an account?",
      answer: "No! Simply click any available square, enter your name and email, and you're in. No signup, no password, no hassle."
    }
  ]

  useEffect(() => {
    fetchTopBuyers()
  }, [])

  const fetchTopBuyers = async () => {
    try {
      setLoading(true)

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'active')
        .maybeSingle()

      if (gameError || !gameData) {
        console.error('Error fetching game for top buyers:', gameError)
        setLoading(false)
        return
      }

      setGame(gameData)

      const { data: squaresData, error: squaresError } = await supabase
        .from('squares')
        .select('claimed_by_name, claimed_by_email, payment_status')
        .eq('game_id', gameData.id)
        .not('claimed_by_email', 'is', null)

      if (squaresError) {
        console.error('Error fetching squares for top buyers:', squaresError)
        setLoading(false)
        return
      }

      // Calculate prize pot from paid squares only
      const paidSquares = squaresData?.filter(s => s.payment_status === 'paid').length || 0
      const totalRevenue = paidSquares * gameData.cost_per_square
      const charityAmount = totalRevenue * (gameData.charity_percentage / 100)
      const pot = totalRevenue - charityAmount
      setPrizePot(pot)

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
              <p className="text-sm opacity-90 mt-0.5">Super Bowl Charity Fundraiser</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider opacity-90 font-semibold">Prize Pot</div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight">${prizePot.toFixed(0)}</div>
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

      {/* How It Works - 3 Step Banner */}
      <div className="bg-white border-b-2 border-gray-200 py-6 px-4 shadow-sm">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-center text-xl font-bold text-[var(--color-primary)] mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)] text-white font-bold text-xl mb-3">
                1
              </div>
              <h3 className="font-bold text-lg mb-2 text-[var(--color-text)]">Claim Your Square</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                Click any open square and enter your name & email. No account needed!
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)] text-white font-bold text-xl mb-3">
                2
              </div>
              <h3 className="font-bold text-lg mb-2 text-[var(--color-text)]">Pay the Admin</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                Send payment via Venmo or cash. Numbers are assigned randomly after all squares fill.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)] text-white font-bold text-xl mb-3">
                3
              </div>
              <h3 className="font-bold text-lg mb-2 text-[var(--color-text)]">Win by Quarter</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                Match the last digit of each team's score at the end of any quarter to win!
              </p>
            </div>
          </div>
        </div>
      </div>

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
                  Each square costs ${game?.cost_per_square || 10}. Numbers will be randomly assigned after all squares are filled. Winners are determined by the last digit of each team's score at the end of each quarter.
                </p>
                <div className="border-t border-gray-200 pt-5 space-y-4">
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-2">
                      Cost per Square
                    </div>
                    <div className="text-3xl font-bold text-[var(--color-primary)] tracking-tight">${game?.cost_per_square || 10}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                      Charity Donation ({game?.charity_percentage || 0}%)
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

          {/* Right Panel - Top Buyers & FAQ */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top Buyers */}
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

            {/* FAQ Section */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-[var(--color-primary)] text-white px-6 py-5">
                <h2 className="text-lg font-bold tracking-tight">Frequently Asked Questions</h2>
              </div>
              <div className="p-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="border-b border-gray-200 last:border-b-0">
                    <button
                      onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                      className="w-full text-left py-4 px-2 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-sm text-[var(--color-text)] pr-4">
                        {item.question}
                      </span>
                      <svg
                        className={`w-5 h-5 text-[var(--color-primary)] flex-shrink-0 transition-transform ${
                          openFAQ === index ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openFAQ === index && (
                      <div className="px-2 pb-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
                        {item.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4 mt-12">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm font-medium text-[var(--color-text-muted)] mb-3">
            <Link to="/privacy" className="hover:text-[var(--color-primary)] transition-colors hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[var(--color-primary)] transition-colors hover:underline">
              Terms of Service
            </Link>
            <button
              onClick={() => {
                const rulesSection = document.querySelector('[data-section="rules"]')
                rulesSection?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="hover:text-[var(--color-primary)] transition-colors hover:underline"
            >
              How to Play
            </button>
          </div>
          <div className="text-center">
            <p className="text-xs text-[var(--color-text-muted)]">
              © {new Date().getFullYear()} SNPS Squares. Not affiliated with the NFL.
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              For entertainment and charitable fundraising purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
