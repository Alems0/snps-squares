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
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-primary)] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm2 2h12v8H6V8z"/>
              </svg>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">SNPS Squares</h1>
                <p className="text-sm text-white/90 font-medium mt-0.5">Super Bowl Charity Fundraiser</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-white/80 font-semibold mb-1">Prize Pot</div>
                <div className="text-3xl sm:text-4xl font-bold tabular-nums">${prizePot.toFixed(0)}</div>
              </div>
              <Link
                to="/admin"
                className="bg-white text-[var(--color-primary)] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/95 transition-all shadow-md whitespace-nowrap"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* How It Works Section */}
      <section className="bg-white border-b border-[var(--color-border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-[var(--color-text)] mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-2xl font-bold mb-5 shadow-md">1</div>
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">Claim Your Square</h3>
              <p className="text-base text-[var(--color-text-secondary)] leading-relaxed">Click any open square on the board below. No account needed!</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-2xl font-bold mb-5 shadow-md">2</div>
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">Pay the Admin</h3>
              <p className="text-base text-[var(--color-text-secondary)] leading-relaxed">Send payment via Venmo or cash. Numbers are assigned randomly after all squares fill.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-2xl font-bold mb-5 shadow-md">3</div>
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">Win by Quarter</h3>
              <p className="text-base text-[var(--color-text-secondary)] leading-relaxed">Match the last digit of each team's score at the end of any quarter to win!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Board Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Board and Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-8">
          {/* Left Panel - Rules */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-md overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--color-border)] bg-slate-50">
                <h2 className="text-lg font-bold text-[var(--color-text)]">Game Rules</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-base text-[var(--color-text-secondary)] leading-relaxed">
                    Each square costs ${game?.cost_per_square || 10}. Numbers will be randomly assigned after all squares fill. Winners are determined by the last digit of each team's score at the end of each quarter.
                  </p>
                </div>
                <div className="pt-5 border-t border-[var(--color-border-light)] space-y-5">
                  <div>
                    <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                      Cost per Square
                    </div>
                    <div className="text-3xl font-bold text-[var(--color-primary)]">${game?.cost_per_square || 10}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                      Charity Donation
                    </div>
                    <div className="text-lg font-bold text-[var(--color-text)]">{game?.charity_percentage || 0}% to Community Charity</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Panel - Board (Hero) */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <Board onClaimSuccess={fetchTopBuyers} />
          </div>

          {/* Right Panel - Top Buyers */}
          <div className="lg:col-span-3 order-3">
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-md overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--color-border)] bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <h2 className="text-lg font-bold text-[var(--color-text)]">Top Buyers</h2>
                </div>
                <span className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">Most Active</span>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)] mb-3"></div>
                    <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
                  </div>
                ) : topBuyers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <svg className="w-16 h-16 text-[var(--color-text-light)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-base font-semibold text-[var(--color-text-muted)]">No squares claimed yet</p>
                    <p className="text-sm text-[var(--color-text-light)] mt-2">Be the first to join!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topBuyers.map((buyer, index) => (
                      <div
                        key={buyer.email}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-[var(--color-border-light)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-[var(--color-primary)]'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base text-[var(--color-text)] truncate">
                              {buyer.name}
                            </div>
                            <div className="text-sm text-[var(--color-text-muted)] truncate">
                              {buyer.squareCount} square{buyer.squareCount > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-base text-[var(--color-text)]">
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

        {/* FAQ Section - Full Width Below Board */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-md overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--color-border)] bg-slate-50">
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Frequently Asked Questions</h2>
          </div>
          <div className="divide-y divide-[var(--color-border-light)]">
            {faqItems.map((item, index) => (
              <div key={index} className="group">
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full text-left py-5 px-6 flex justify-between items-center hover:bg-slate-50 transition-colors"
                >
                  <span className="font-bold text-base text-[var(--color-text)] pr-6">
                    {item.question}
                  </span>
                  <svg
                    className={`w-6 h-6 text-[var(--color-primary)] flex-shrink-0 transition-transform ${
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
                  <div className="px-6 pb-5 pt-2 text-base text-[var(--color-text-secondary)] leading-relaxed">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[var(--color-border)] mt-auto shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap justify-between items-center gap-4 text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-8">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="hover:text-[var(--color-primary)] transition-colors font-medium"
              >
                How to Play
              </button>
              <a href="#" className="hover:text-[var(--color-primary)] transition-colors font-medium">Privacy Policy</a>
              <a href="#" className="hover:text-[var(--color-primary)] transition-colors font-medium">Terms of Service</a>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              © {new Date().getFullYear()} SNPS Squares. Not affiliated with the NFL.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
