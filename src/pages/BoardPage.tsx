import { Link } from 'react-router-dom'
import Board from '../components/Board'

export default function BoardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-[#16a34a] text-white py-6 px-4 shadow-lg">
        <div className="container mx-auto max-w-7xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🏈</span>
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">Super Bowl LXI</h1>
              <p className="text-sm opacity-95 font-medium">2027 Championship Game</p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider opacity-90 font-semibold">Prize Pot</div>
              <div className="text-3xl font-bold tracking-tight">$0</div>
            </div>
            <Link
              to="/admin"
              className="bg-white text-[#16a34a] px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all shadow-md hover:shadow-lg"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Three Column Layout */}
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel - Rules */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-[var(--color-primary)] text-white px-5 py-4">
                <h2 className="text-lg font-bold tracking-tight">Game Rules</h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-[var(--color-text)] leading-relaxed mb-5">
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
            <Board />
          </div>

          {/* Right Panel - Top Buyers */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-[var(--color-primary)] text-white px-5 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <h2 className="text-lg font-bold tracking-tight">Top Buyers</h2>
                </div>
                <span className="text-xs opacity-90 font-semibold uppercase tracking-wider">Most Active</span>
              </div>
              <div className="p-6">
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <div className="text-gray-300 mb-4">
                    <svg className="w-20 h-20 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text-muted)]">No squares claimed yet</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">Be the first to join!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4 mt-12">
        <div className="container mx-auto max-w-7xl flex justify-center gap-8 text-sm font-medium text-[var(--color-text-muted)]">
          <Link to="/" className="hover:text-[var(--color-primary)] transition-colors hover:underline">
            How to Play
          </Link>
          <Link to="/" className="hover:text-[var(--color-primary)] transition-colors hover:underline">
            Rules
          </Link>
          <Link to="/" className="hover:text-[var(--color-primary)] transition-colors hover:underline">
            Support
          </Link>
        </div>
        <div className="container mx-auto max-w-7xl text-center mt-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            © 2027 Super Bowl Squares. For entertainment purposes only.
          </p>
        </div>
      </footer>
    </div>
  )
}
