import { Link } from 'react-router-dom'
import Board from '../components/Board'

export default function BoardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface)]">
      <header className="bg-[var(--color-primary)] text-white py-4 px-4">
        <div className="container mx-auto max-w-7xl flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">SNPS</Link>
          <nav className="flex gap-4">
            <Link to="/" className="hover:opacity-80 transition-opacity">Home</Link>
            <Link to="/admin" className="hover:opacity-80 transition-opacity">Admin</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Super Bowl Squares</h1>
              <p className="text-[var(--color-text-muted)]">
                Season 2025 • AFC vs NFC
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-[var(--color-text-muted)]">Cost per Square</div>
              <div className="text-2xl font-bold text-[var(--color-primary)]">$10</div>
              <div className="text-sm text-[var(--color-text-muted)] mt-1">50% to charity</div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 p-4 bg-[var(--color-surface)] rounded-lg">
            <div className="text-center">
              <div className="text-sm text-[var(--color-text-muted)]">Q1 Prize</div>
              <div className="text-lg font-bold text-[var(--color-success)]">$125</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[var(--color-text-muted)]">Q2 Prize</div>
              <div className="text-lg font-bold text-[var(--color-success)]">$125</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[var(--color-text-muted)]">Q3 Prize</div>
              <div className="text-lg font-bold text-[var(--color-success)]">$125</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[var(--color-text-muted)]">Final Prize</div>
              <div className="text-lg font-bold text-[var(--color-success)]">$125</div>
            </div>
          </div>
        </div>

        <Board />

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Payment Instructions</h2>
          <div className="bg-[var(--color-info)] bg-opacity-10 border border-[var(--color-info)] rounded-lg p-4">
            <p className="mb-2">
              <strong>Venmo:</strong> @snps-charity
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              After claiming a square, please send payment and note your name in the payment description.
              Admin will mark your square as paid.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
