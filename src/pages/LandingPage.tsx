import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[var(--color-primary)] text-white py-8 px-6 shadow-md">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-5xl font-bold">SNPS</h1>
          <p className="text-xl mt-3 opacity-90">Charity Super Bowl Squares</p>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-6xl px-6 py-16">
        <section className="text-center mb-20">
          <h2 className="text-4xl font-bold mb-6">Welcome to SNPS Squares</h2>
          <p className="text-xl text-[var(--color-text-muted)] mb-10 max-w-2xl mx-auto leading-relaxed">
            Join our charity Super Bowl squares game! Claim your square, contribute to a great cause, 
            and win prizes based on the final score.
          </p>
          <div className="flex gap-6 justify-center flex-wrap">
            <Link
              to="/board"
              className="bg-[var(--color-secondary)] text-white px-10 py-4 rounded-lg text-lg font-semibold hover:opacity-90 transition-all shadow-md hover:shadow-lg"
            >
              View Board
            </Link>
            <Link
              to="/admin"
              className="bg-[var(--color-surface)] text-[var(--color-text)] border-2 border-[var(--color-border)] px-10 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Admin Login
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-sm">
            <h3 className="text-2xl font-bold mb-4">📊 Claim Your Square</h3>
            <p className="text-[var(--color-text-muted)] leading-relaxed">
              Choose available squares on the 10×10 board. First come, first served!
            </p>
          </div>
          <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-sm">
            <h3 className="text-2xl font-bold mb-4">💰 Support Charity</h3>
            <p className="text-[var(--color-text-muted)] leading-relaxed">
              A portion of all proceeds goes directly to charity. Play for a cause!
            </p>
          </div>
          <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-sm">
            <h3 className="text-2xl font-bold mb-4">🏆 Win Prizes</h3>
            <p className="text-[var(--color-text-muted)] leading-relaxed">
              Prizes awarded based on quarter-end scores. Check the board for details!
            </p>
          </div>
        </section>

        <section className="bg-[var(--color-surface)] p-10 rounded-xl shadow-sm">
          <h3 className="text-3xl font-bold mb-6">How It Works</h3>
          <ol className="space-y-4 text-[var(--color-text-muted)] text-lg">
            <li className="leading-relaxed"><strong className="text-[var(--color-text)]">1.</strong> Select an available square on the board</li>
            <li className="leading-relaxed"><strong className="text-[var(--color-text)]">2.</strong> Enter your name and email to claim it</li>
            <li className="leading-relaxed"><strong className="text-[var(--color-text)]">3.</strong> Pay via Venmo or cash (details provided after claim)</li>
            <li className="leading-relaxed"><strong className="text-[var(--color-text)]">4.</strong> Numbers are randomly assigned once the board fills</li>
            <li className="leading-relaxed"><strong className="text-[var(--color-text)]">5.</strong> Win if your square matches quarter-end scores!</li>
          </ol>
        </section>
      </main>

      <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border)] py-8 px-6 text-center text-[var(--color-text-muted)]">
        <p className="text-sm">&copy; {new Date().getFullYear()} SNPS. All rights reserved.</p>
      </footer>
    </div>
  )
}
