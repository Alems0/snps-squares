import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[var(--color-primary)] text-white py-6 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold">SNPS</h1>
          <p className="text-lg mt-2 opacity-90">Charity Super Bowl Squares</p>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-6xl px-4 py-12">
        <section className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Welcome to SNPS Squares</h2>
          <p className="text-xl text-[var(--color-text-muted)] mb-8 max-w-2xl mx-auto">
            Join our charity Super Bowl squares game! Claim your square, contribute to a great cause, 
            and win prizes based on the final score.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/board"
              className="bg-[var(--color-secondary)] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity"
            >
              View Board
            </Link>
            <Link
              to="/admin"
              className="bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[var(--color-border)] transition-colors"
            >
              Admin Login
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-[var(--color-surface)] p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-3">📊 Claim Your Square</h3>
            <p className="text-[var(--color-text-muted)]">
              Choose available squares on the 10×10 board. First come, first served!
            </p>
          </div>
          <div className="bg-[var(--color-surface)] p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-3">💰 Support Charity</h3>
            <p className="text-[var(--color-text-muted)]">
              A portion of all proceeds goes directly to charity. Play for a cause!
            </p>
          </div>
          <div className="bg-[var(--color-surface)] p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-3">🏆 Win Prizes</h3>
            <p className="text-[var(--color-text-muted)]">
              Prizes awarded based on quarter-end scores. Check the board for details!
            </p>
          </div>
        </section>

        <section className="bg-[var(--color-surface)] p-8 rounded-lg">
          <h3 className="text-2xl font-bold mb-4">How It Works</h3>
          <ol className="space-y-3 text-[var(--color-text-muted)]">
            <li><strong>1.</strong> Select an available square on the board</li>
            <li><strong>2.</strong> Enter your name and email to claim it</li>
            <li><strong>3.</strong> Pay via Venmo or cash (details provided after claim)</li>
            <li><strong>4.</strong> Numbers are randomly assigned once the board fills</li>
            <li><strong>5.</strong> Win if your square matches quarter-end scores!</li>
          </ol>
        </section>
      </main>

      <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border)] py-6 px-4 text-center text-[var(--color-text-muted)]">
        <p>&copy; {new Date().getFullYear()} SNPS. All rights reserved.</p>
      </footer>
    </div>
  )
}
