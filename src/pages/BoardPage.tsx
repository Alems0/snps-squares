import { Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Board from '../components/Board'
import { supabase, type Game, GAMES_PUBLIC_COLUMNS } from '../lib/supabase'

interface TopBuyer {
  name: string
  squareCount: number
  totalCost: number
}

interface FAQItem {
  question: string
  answer: string
}

interface PayoutChip {
  key: string
  label: string
  shortLabel: string
  amount: number
}

function formatCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

function getConfiguredPayouts(game: Game | null): PayoutChip[] {
  if (!game) return []
  const chips: PayoutChip[] = [
    { key: 'q1', label: 'Q1', shortLabel: 'Q1', amount: Number(game.q1_payout) || 0 },
    { key: 'q2', label: 'Q2 / Halftime', shortLabel: 'Q2 / HT', amount: Number(game.q2_payout) || 0 },
    { key: 'q3', label: 'Q3', shortLabel: 'Q3', amount: Number(game.q3_payout) || 0 },
    { key: 'final', label: 'Q4 Final Game Score', shortLabel: 'Q4 Final', amount: Number(game.final_payout) || 0 },
  ]
  if (!chips.some((c) => c.amount > 0)) return []
  return chips
}

function TrophyIcon({ place }: { place: 1 | 2 | 3 }) {
  const fill = place === 1 ? '#EAB308' : place === 2 ? '#94A3B8' : '#D97706'
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill={fill} aria-hidden="true">
      <path d="M6 3h12v2h2a2 2 0 012 2v1a5 5 0 01-4.1 4.9A5.5 5.5 0 0113.5 16H13v2h3v2H8v-2h3v-2h-.5a5.5 5.5 0 01-4.4-3.1A5 5 0 012 8V7a2 2 0 012-2h2V3zm2 2v2H4v1a3 3 0 002.8 3H9A5 5 0 018 8V5zm8 0v3a5 5 0 01-1 3h2.2A3 3 0 0020 8V7h-4z" />
    </svg>
  )
}

export default function BoardPage() {
  const [searchParams] = useSearchParams()
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([])
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [prizePot, setPrizePot] = useState(0)
  const [claimedCount, setClaimedCount] = useState(0)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const payoutChips = getConfiguredPayouts(game)
  const availableCount = Math.max(0, 100 - claimedCount)
  const isPrintMode = searchParams.get('print') === '1'

  useEffect(() => {
    if (!isPrintMode) return
    const t = window.setTimeout(() => {
      window.print()
    }, 600)
    return () => window.clearTimeout(t)
  }, [isPrintMode])

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
    },
    {
      question: "What if I don't pay in time?",
      answer: "If Venmo or cash payment cannot be confirmed 4 days before the Super Bowl, the claimed square(s) will be removed."
    }
  ]

  useEffect(() => {
    fetchTopBuyers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMockHeaderGame = () => {
    setGame({
      id: 'mock',
      season: 2026,
      afc_team: 'Kansas City Chiefs',
      nfc_team: 'San Francisco 49ers',
      cost_per_square: 10,
      charity_percentage: 10,
      q1_payout: 200,
      q2_payout: 200,
      q3_payout: 200,
      final_payout: 400,
      venmo_handle: '@snps-squares',
      numbers_locked: false,
      afc_numbers: [3, 7, 0, 6, 1, 4, 9, 2, 8, 5],
      nfc_numbers: [2, 5, 8, 1, 9, 3, 6, 0, 7, 4],
      status: 'active',
      public_claiming_open: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setPrizePot(900)
    setClaimedCount(34)
    setTopBuyers([
      { name: 'Sarah Johnson', squareCount: 8, totalCost: 80 },
      { name: 'Michael Chen', squareCount: 6, totalCost: 60 },
      { name: 'Emily Rodriguez', squareCount: 5, totalCost: 50 },
    ])
    setLoading(false)
  }

  const fetchTopBuyers = async () => {
    try {
      setLoading(true)

      if (import.meta.env.VITE_USE_MOCK === 'true') {
        loadMockHeaderGame()
        return
      }

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(GAMES_PUBLIC_COLUMNS)
        .eq('status', 'active')
        .maybeSingle()

      if (gameError || !gameData) {
        console.error('Error fetching game for top buyers:', gameError)
        setLoading(false)
        return
      }

      setGame(gameData)

      // Prize pot via SECURITY DEFINER (avoids reading emails as anon)
      const { data: stats } = await supabase.rpc('get_public_game_stats', {
        p_game_id: gameData.id,
      })
      if (stats && typeof stats === 'object') {
        const s = stats as { prize_pot?: number; claimed?: number }
        if ('prize_pot' in s) setPrizePot(Number(s.prize_pot) || 0)
        if ('claimed' in s) setClaimedCount(Number(s.claimed) || 0)
      }

      const { data: buyersData, error: buyersError } = await supabase.rpc('get_top_buyers', {
        p_game_id: gameData.id,
        p_limit: 5,
      })

      if (buyersError) {
        console.error('Error fetching top buyers:', buyersError)
        // Fallback for pre-migration / mock: empty list
        setTopBuyers([])
        setLoading(false)
        return
      }

      const buyers: TopBuyer[] = (buyersData || []).map(
        (b: { name: string; square_count: number; total_cost: number }) => ({
          name: b.name,
          squareCount: b.square_count,
          totalCost: b.total_cost,
        })
      )

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
      <header className="no-print bg-[var(--color-primary)] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-wrap justify-between items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <svg className="w-9 h-9 sm:w-10 sm:h-10 text-white shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm2 2h12v8H6V8z"/>
              </svg>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight truncate">SNPS Squares</h1>
                <p className="text-sm text-white/90 font-medium mt-0.5">Super Bowl Charity Fundraiser</p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-white/80 font-semibold mb-1">Prize Pot</div>
                <div className="text-2xl sm:text-4xl font-bold tabular-nums">{formatCurrency(prizePot)}</div>
              </div>
              <Link
                to="/admin"
                className="bg-white text-[var(--color-primary)] px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-semibold hover:bg-white/95 transition-all shadow-md whitespace-nowrap"
              >
                Admin Login
              </Link>
            </div>
          </div>

          {payoutChips.length > 0 && (
            <div
              className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-center"
              aria-label="Prizes"
            >
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-white/90 w-full sm:w-auto">
                Prizes:
              </span>
              {payoutChips.map((chip, i) => (
                <span key={chip.key} className="inline-flex items-center text-xs sm:text-sm text-white">
                  {i > 0 && <span className="mx-1.5 text-white/40" aria-hidden="true">·</span>}
                  <span className="font-medium text-white/85 whitespace-nowrap">
                    <span className="sm:hidden">{chip.shortLabel}</span>
                    <span className="hidden sm:inline">{chip.label}</span>
                  </span>
                  <span className="ml-1 font-bold tabular-nums whitespace-nowrap">
                    {formatCurrency(chip.amount)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Top Buyers + board metrics */}
      <section className="no-print bg-white border-b border-[var(--color-border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <h2 className="text-xl font-bold text-[var(--color-text)]">Top Buyers</h2>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-[var(--color-text-muted)] font-medium">Squares Claimed</span>
                <span className="ml-2 font-bold text-[var(--color-text)] tabular-nums">{claimedCount}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] font-medium">Squares Available</span>
                <span className="ml-2 font-bold text-[var(--color-text)] tabular-nums">{availableCount}</span>
                <span className="text-[var(--color-text-muted)]"> / 100</span>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
            </div>
          ) : topBuyers.length === 0 ? (
            <p className="text-center text-[var(--color-text-muted)] py-6">No squares claimed yet</p>
          ) : (
            <div className="flex flex-wrap gap-6">
              {topBuyers.map((buyer, index) => (
                <div key={`${buyer.name}-${index}`} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100">
                    {index < 3 ? (
                      <TrophyIcon place={(index + 1) as 1 | 2 | 3} />
                    ) : (
                      <span className="text-sm font-bold text-[var(--color-primary)]">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-base text-[var(--color-text)]">{buyer.name}</div>
                    <div className="text-sm text-[var(--color-text-muted)]">{buyer.squareCount} square{buyer.squareCount > 1 ? 's' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Board Section */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 min-w-0">
        {/* Board - Full Width Hero */}
        <div className="mb-8 min-w-0 w-full">
          <Board onClaimSuccess={fetchTopBuyers} />
        </div>

        {/* Game Rules - Full Width Below Board */}
        <div className="no-print bg-white rounded-xl border border-[var(--color-border)] shadow-md overflow-hidden min-w-0 mb-8">
          <div className="px-6 py-5 border-b border-[var(--color-border)] bg-slate-50">
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Game Rules</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <p className="text-base text-[var(--color-text-secondary)] leading-relaxed">
                Each square costs ${game?.cost_per_square || 10}. Numbers will be randomly assigned after all squares fill. Winners are determined by the last digit of each team's score at the end of each quarter.
              </p>
            </div>
            <div className="pt-5 border-t border-[var(--color-border-light)] grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                <div className="text-2xl font-bold text-[var(--color-text)]">{game?.charity_percentage || 0}% to Charity</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  Total Prize Pool
                </div>
                <div className="text-3xl font-bold text-[var(--color-primary)]">${prizePot.toFixed(0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section - Full Width Below Game Rules */}
        <section className="no-print bg-white rounded-xl border border-[var(--color-border)] shadow-md overflow-hidden">
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
      <footer className="no-print bg-white border-t border-[var(--color-border)] mt-auto shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-wrap justify-between items-center gap-4 text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-8">
              <Link to="/privacy" className="hover:text-[var(--color-primary)] transition-colors font-medium">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[var(--color-primary)] transition-colors font-medium">Terms of Service</Link>
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
