import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAllowedAdmin, signOutAdmin } from '../lib/auth'
import { useAuth } from '../lib/useAuth'

export default function AdminPanel() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (!user?.email) {
      navigate('/admin')
      return
    }

    if (!isAllowedAdmin(user.email)) {
      signOutAdmin().then(() => {
        navigate('/admin')
      }).catch(() => {
        navigate('/admin')
      })
    }
  }, [user, loading, navigate])

  const handleSignOut = async () => {
    try {
      await signOutAdmin()
      navigate('/admin')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          <p className="mt-4 text-[var(--color-text-muted)]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface)]">
      <header className="bg-[var(--color-primary)] text-white py-6 px-6 shadow-md">
        <div className="container mx-auto max-w-7xl flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold hover:opacity-90 transition-opacity">SNPS Admin</Link>
          <div className="flex items-center gap-6">
            <span className="text-sm opacity-90">{user.email}</span>
            <nav className="flex items-center gap-4">
              <Link to="/board" className="px-4 py-2 rounded-lg bg-white text-[var(--color-primary)] border-2 border-white hover:bg-[var(--color-surface)] transition-all font-semibold shadow-sm">View Board</Link>
              <button 
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg bg-[var(--color-secondary)] text-white border-2 border-[var(--color-secondary)] hover:bg-opacity-90 transition-all font-semibold shadow-sm"
              >
                Sign Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-4xl font-bold mb-10">Admin Panel</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-md p-8">
            <h3 className="text-lg font-bold mb-3 text-[var(--color-text-muted)] uppercase tracking-wide text-sm">Total Squares</h3>
            <p className="text-4xl font-bold text-[var(--color-primary)] mb-3">100</p>
            <p className="text-sm text-[var(--color-text-muted)]">15 claimed, 85 available</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-8">
            <h3 className="text-lg font-bold mb-3 text-[var(--color-text-muted)] uppercase tracking-wide text-sm">Revenue</h3>
            <p className="text-4xl font-bold text-[var(--color-success)] mb-3">$150</p>
            <p className="text-sm text-[var(--color-text-muted)]">12 paid, 3 pending</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-8">
            <h3 className="text-lg font-bold mb-3 text-[var(--color-text-muted)] uppercase tracking-wide text-sm">Charity</h3>
            <p className="text-4xl font-bold text-[var(--color-info)] mb-3">$75</p>
            <p className="text-sm text-[var(--color-text-muted)]">50% of revenue</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-bold mb-6">Game Settings</h2>
            <div className="space-y-4">
              <button className="w-full bg-[var(--color-primary)] text-white py-3.5 px-6 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">
                Start New Season
              </button>
              <button className="w-full bg-[var(--color-secondary)] text-white py-3.5 px-6 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">
                Randomize Numbers
              </button>
              <button className="w-full bg-[var(--color-warning)] text-white py-3.5 px-6 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">
                Lock Board
              </button>
              <button className="w-full bg-[var(--color-info)] text-white py-3.5 px-6 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">
                Update Scores
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <button className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] py-3.5 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold">
                Export Roster CSV
              </button>
              <button className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] py-3.5 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold">
                Configure Payouts
              </button>
              <button className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] py-3.5 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold">
                Update Venmo Handle
              </button>
              <button className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] py-3.5 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold">
                Set Join Password
              </button>
            </div>
          </section>
        </div>

        <section className="bg-white rounded-xl shadow-md p-8 mt-8">
          <h2 className="text-2xl font-bold mb-6">Recent Claims</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[var(--color-border)]">
                  <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Square</th>
                  <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Name</th>
                  <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Email</th>
                  <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Status</th>
                  <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-8 px-6" colSpan={5}>
                    <p className="text-[var(--color-text-muted)] text-center font-medium">No claims yet</p>
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
