import { Link } from 'react-router-dom'

export default function AdminPanel() {
  // TODO: Add auth check - redirect if not authenticated
  
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface)]">
      <header className="bg-[var(--color-primary)] text-white py-4 px-4">
        <div className="container mx-auto max-w-7xl flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">SNPS Admin</Link>
          <nav className="flex gap-4">
            <Link to="/board" className="hover:opacity-80 transition-opacity">View Board</Link>
            <button className="hover:opacity-80 transition-opacity">Sign Out</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-2">Total Squares</h3>
            <p className="text-3xl font-bold text-[var(--color-primary)]">100</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">15 claimed, 85 available</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-2">Revenue</h3>
            <p className="text-3xl font-bold text-[var(--color-success)]">$150</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">12 paid, 3 pending</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-2">Charity</h3>
            <p className="text-3xl font-bold text-[var(--color-info)]">$75</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">50% of revenue</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Game Settings</h2>
            <div className="space-y-4">
              <button className="w-full bg-[var(--color-primary)] text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity">
                Start New Season
              </button>
              <button className="w-full bg-[var(--color-secondary)] text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity">
                Randomize Numbers
              </button>
              <button className="w-full bg-[var(--color-warning)] text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity">
                Lock Board
              </button>
              <button className="w-full bg-[var(--color-info)] text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity">
                Update Scores
              </button>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <button className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-4 rounded-lg hover:bg-[var(--color-border)] transition-colors">
                Export Roster CSV
              </button>
              <button className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-4 rounded-lg hover:bg-[var(--color-border)] transition-colors">
                Configure Payouts
              </button>
              <button className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-4 rounded-lg hover:bg-[var(--color-border)] transition-colors">
                Update Venmo Handle
              </button>
              <button className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-4 rounded-lg hover:bg-[var(--color-border)] transition-colors">
                Set Join Password
              </button>
            </div>
          </section>
        </div>

        <section className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Recent Claims</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2 px-4">Square</th>
                  <th className="text-left py-2 px-4">Name</th>
                  <th className="text-left py-2 px-4">Email</th>
                  <th className="text-left py-2 px-4">Status</th>
                  <th className="text-left py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--color-border)]">
                  <td className="py-2 px-4" colSpan={5}>
                    <p className="text-[var(--color-text-muted)] text-center">No claims yet</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
