import { Link } from 'react-router-dom'
import Board from '../components/Board'

export default function BoardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      {/* Green Header */}
      <header className="bg-[#16a34a] text-white py-6 px-6 shadow-md">
        <div className="container mx-auto max-w-7xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🏈</span>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Super Bowl LXI</h1>
              <p className="text-sm opacity-90 mt-1">2027 Championship Game</p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="text-xs opacity-90 mb-1">PRIZE POT</div>
              <div className="text-3xl font-bold">$0</div>
            </div>
            <Link
              to="/admin"
              className="bg-white text-[#16a34a] px-6 py-3 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors shadow-sm"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Three Column Layout */}
      <main className="flex-1 container mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel - Rules */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-[var(--color-primary)] text-white px-6 py-4">
                <h2 className="text-xl font-bold">Game Rules</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-[var(--color-text)] leading-relaxed mb-6">
                  Each square costs $10. Numbers will be randomly assigned after all squares are filled. Winners are determined by the last digit of each team's score at the end of each quarter.
                </p>
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <div className="text-xs text-[var(--color-text-muted)] uppercase font-semibold mb-2 tracking-wide">
                    Cost per Square
                  </div>
                  <div className="text-3xl font-bold text-[var(--color-primary)] mb-4">$10</div>
                  <div className="text-xs text-[var(--color-text-muted)] uppercase font-semibold mb-2 tracking-wide">
                    Charity Donation (10%)
                  </div>
                  <div className="text-sm text-[var(--color-secondary)] font-medium">Community Charity</div>
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
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-[var(--color-primary)] text-white px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⭐</span>
                  <h2 className="text-xl font-bold">Top Buyers</h2>
                </div>
                <span className="text-xs opacity-75 uppercase tracking-wide">Most Active</span>
              </div>
              <div className="p-8">
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <div className="text-gray-300 mb-4">
                    <svg className="w-20 h-20 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] font-medium">No squares claimed yet</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">Be the first to join!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-6 mt-12">
        <div className="container mx-auto max-w-7xl flex justify-center gap-10 text-sm text-[var(--color-text-muted)]">
          <Link to="/" className="hover:text-[var(--color-primary)] transition-colors font-medium">
            How to Play
          </Link>
          <Link to="/" className="hover:text-[var(--color-primary)] transition-colors font-medium">
            Rules
          </Link>
          <Link to="/" className="hover:text-[var(--color-primary)] transition-colors font-medium">
            Support
          </Link>
        </div>
        <div className="container mx-auto max-w-7xl text-center mt-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            © 2027 Super Bowl Squares. For entertainment purposes only.
          </p>
        </div>
      </footer>
    </div>
  )
}
