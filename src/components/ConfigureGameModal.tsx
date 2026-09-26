import { useState, FormEvent } from 'react'
import { Game } from '../lib/supabase'

interface ConfigureGameModalProps {
  game: Game
  onClose: () => void
  onSave: (updates: {
    cost_per_square: number
    charity_percentage: number
    q1_payout: number
    q2_payout: number
    q3_payout: number
    final_payout: number
    venmo_handle: string
    join_password: string
  }) => Promise<void>
}

export default function ConfigureGameModal({
  game,
  onClose,
  onSave,
}: ConfigureGameModalProps) {
  const [costPerSquare, setCostPerSquare] = useState(game.cost_per_square.toString())
  const [charityPercentage, setCharityPercentage] = useState(game.charity_percentage.toString())
  const [q1Payout, setQ1Payout] = useState(game.q1_payout.toString())
  const [q2Payout, setQ2Payout] = useState(game.q2_payout.toString())
  const [q3Payout, setQ3Payout] = useState(game.q3_payout.toString())
  const [finalPayout, setFinalPayout] = useState(game.final_payout.toString())
  const [venmoHandle, setVenmoHandle] = useState(game.venmo_handle || '')
  const [joinPassword, setJoinPassword] = useState(game.join_password || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Calculate totals for preview
  const costNum = parseFloat(costPerSquare) || 0
  const charityPct = parseFloat(charityPercentage) || 0
  const q1Num = parseFloat(q1Payout) || 0
  const q2Num = parseFloat(q2Payout) || 0
  const q3Num = parseFloat(q3Payout) || 0
  const finalNum = parseFloat(finalPayout) || 0

  const totalPot = costNum * 100 // 100 squares
  const charityAmount = totalPot * (charityPct / 100)
  const totalPayouts = q1Num + q2Num + q3Num + finalNum
  const remaining = totalPot - charityAmount - totalPayouts

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (costNum < 0) {
      setError('Cost per square must be non-negative')
      return
    }
    if (charityPct < 0 || charityPct > 100) {
      setError('Charity percentage must be between 0 and 100')
      return
    }
    if (q1Num < 0 || q2Num < 0 || q3Num < 0 || finalNum < 0) {
      setError('Payout amounts must be non-negative')
      return
    }
    if (totalPayouts + charityAmount > totalPot) {
      setError('Total payouts and charity exceed the total pot')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({
        cost_per_square: costNum,
        charity_percentage: charityPct,
        q1_payout: q1Num,
        q2_payout: q2Num,
        q3_payout: q3Num,
        final_payout: finalNum,
        venmo_handle: venmoHandle.trim(),
        join_password: joinPassword.trim(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[var(--color-primary)] text-white px-6 py-4 rounded-t-xl sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Configure Game</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl leading-none"
              disabled={isSubmitting}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cost & Charity Section */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--color-primary)] border-b-2 border-[var(--color-border)] pb-2">
              Pricing & Charity
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="costPerSquare"
                  className="block text-sm font-semibold text-[var(--color-text)] mb-2"
                >
                  Cost per Square ($)
                </label>
                <input
                  type="number"
                  id="costPerSquare"
                  value={costPerSquare}
                  onChange={(e) => setCostPerSquare(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                  placeholder="20"
                  min="0"
                  step="1"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="charityPercentage"
                  className="block text-sm font-semibold text-[var(--color-text)] mb-2"
                >
                  Charity Percentage (%)
                </label>
                <input
                  type="number"
                  id="charityPercentage"
                  value={charityPercentage}
                  onChange={(e) => setCharityPercentage(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                  placeholder="50"
                  min="0"
                  max="100"
                  step="1"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          </section>

          {/* Payouts Section */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--color-primary)] border-b-2 border-[var(--color-border)] pb-2">
              Quarter Payouts ($)
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="q1Payout"
                  className="block text-sm font-semibold text-[var(--color-text)] mb-2"
                >
                  Q1 Payout
                </label>
                <input
                  type="number"
                  id="q1Payout"
                  value={q1Payout}
                  onChange={(e) => setQ1Payout(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                  placeholder="100"
                  min="0"
                  step="1"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="q2Payout"
                  className="block text-sm font-semibold text-[var(--color-text)] mb-2"
                >
                  Q2 Payout (Halftime)
                </label>
                <input
                  type="number"
                  id="q2Payout"
                  value={q2Payout}
                  onChange={(e) => setQ2Payout(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                  placeholder="150"
                  min="0"
                  step="1"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="q3Payout"
                  className="block text-sm font-semibold text-[var(--color-text)] mb-2"
                >
                  Q3 Payout
                </label>
                <input
                  type="number"
                  id="q3Payout"
                  value={q3Payout}
                  onChange={(e) => setQ3Payout(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                  placeholder="100"
                  min="0"
                  step="1"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="finalPayout"
                  className="block text-sm font-semibold text-[var(--color-text)] mb-2"
                >
                  Final Payout
                </label>
                <input
                  type="number"
                  id="finalPayout"
                  value={finalPayout}
                  onChange={(e) => setFinalPayout(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                  placeholder="650"
                  min="0"
                  step="1"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          </section>

          {/* Payment Details Section */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--color-primary)] border-b-2 border-[var(--color-border)] pb-2">
              Payment & Access
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="venmoHandle"
                  className="block text-sm font-semibold text-[var(--color-text)] mb-2"
                >
                  Venmo Handle
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] font-semibold">
                    @
                  </span>
                  <input
                    type="text"
                    id="venmoHandle"
                    value={venmoHandle}
                    onChange={(e) => setVenmoHandle(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                    placeholder="your-venmo-handle"
                    disabled={isSubmitting}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Players will see this for Venmo payments
                </p>
              </div>

              <div>
                <label
                  htmlFor="joinPassword"
                  className="block text-sm font-semibold text-[var(--color-text)] mb-2"
                >
                  Join Password (Optional)
                </label>
                <input
                  type="text"
                  id="joinPassword"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                  placeholder="Leave empty for open board"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Require password to claim squares
                </p>
              </div>
            </div>
          </section>

          {/* Preview Section */}
          <section className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Preview Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Total Pot</div>
                <div className="text-lg font-bold text-[var(--color-primary)]">
                  ${totalPot.toFixed(2)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">To Charity</div>
                <div className="text-lg font-bold text-[var(--color-info)]">
                  ${charityAmount.toFixed(2)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Total Payouts</div>
                <div className="text-lg font-bold text-[var(--color-success)]">
                  ${totalPayouts.toFixed(2)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Remaining</div>
                <div className={`text-lg font-bold ${remaining < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'}`}>
                  ${remaining.toFixed(2)}
                </div>
              </div>
            </div>
            {remaining < 0 && (
              <div className="text-xs text-[var(--color-danger)] font-semibold">
                ⚠️ Warning: Payouts exceed available funds
              </div>
            )}
          </section>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-[var(--color-text)] hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
