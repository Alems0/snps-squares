import { formatVenmoHandle } from '../lib/formatVenmo'
import { formatSquareLabel } from '../lib/displaySquareNumber'
import { VENMO_ORDER_FEE } from '../lib/supabase'

interface ClaimSuccessProps {
  squareCount: number
  /** Storage positions 0–99; shown as #1–#100. */
  positions?: number[]
  /** Square subtotal only (count × cost). Fee is derived when paymentMethod is venmo. */
  totalCost: number
  paymentMethod: 'cash' | 'venmo'
  venmoHandle?: string
  onClose: () => void
}

export default function ClaimSuccess({
  squareCount,
  positions = [],
  totalCost,
  paymentMethod,
  venmoHandle,
  onClose,
}: ClaimSuccessProps) {
  const fee = paymentMethod === 'venmo' ? VENMO_ORDER_FEE : 0
  const grandTotal = totalCost + fee

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-3"
      role="presentation"
    >
      <div
        data-testid="claim-success"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-success-title"
        className="bg-white w-full sm:max-w-md shadow-2xl flex flex-col overflow-hidden rounded-t-2xl sm:rounded-xl"
        style={{ maxHeight: 'min(calc(100dvh - 24px), calc(100vh - 24px))' }}
      >
        {/* Header — always visible */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[var(--color-border-light)]">
          <h2
            id="claim-success-title"
            className="text-lg sm:text-xl font-bold text-[var(--color-text)]"
          >
            Squares Claimed!
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] touch-manipulation inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-lg"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 text-center">
          <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <p className="text-sm text-[var(--color-text-muted)] mb-3 sm:mb-4">
            You've successfully claimed {squareCount} square{squareCount > 1 ? 's' : ''}.
          </p>

          {positions.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mb-3 sm:mb-4">
              {[...positions]
                .sort((a, b) => a - b)
                .map((pos) => (
                  <span
                    key={pos}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-primary)] text-white text-xs font-semibold"
                  >
                    {formatSquareLabel(pos)}
                  </span>
                ))}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 text-left">
            <div className="space-y-1.5 mb-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-text-muted)]">Subtotal</span>
                <span className="font-medium text-[var(--color-text)]">${totalCost.toFixed(2)}</span>
              </div>
              {fee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-text-muted)]">Venmo fee</span>
                  <span className="font-medium text-[var(--color-text)]">${fee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                  Total Amount
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[var(--color-success)]">
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                  Payment Method
                </span>
                <span className="text-sm font-semibold text-[var(--color-primary)]">
                  {paymentMethod === 'cash' ? 'Cash' : 'Venmo'}
                </span>
              </div>
              {paymentMethod === 'venmo' && venmoHandle && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Send payment to:</p>
                  <p className="font-mono font-bold text-sm text-[var(--color-primary)]">
                    {formatVenmoHandle(venmoHandle)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <h3 className="font-semibold text-sm text-[var(--color-primary)] mb-1.5">
              Next Steps
            </h3>
            <ul className="text-xs text-[var(--color-text-muted)] space-y-1">
              <li>• Your squares are now reserved</li>
              {paymentMethod === 'venmo' && venmoHandle && (
                <li>
                  • Send ${grandTotal.toFixed(2)}
                  {fee > 0 ? ` (includes $${fee.toFixed(2)} Venmo fee)` : ''} to{' '}
                  {formatVenmoHandle(venmoHandle)} via Venmo
                </li>
              )}
              {paymentMethod === 'cash' && (
                <li>• Arrange payment with the game host</li>
              )}
              <li>
                • If Venmo or cash payment cannot be confirmed 4 days before the Super Bowl,
                the claimed square(s) will be removed.
              </li>
              <li>• Check back after the game starts to see the numbers</li>
              <li>• Good luck!</li>
            </ul>
          </div>
        </div>

        {/* Sticky footer Done */}
        <div className="shrink-0 border-t border-[var(--color-border-light)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-5 bg-white">
          <button
            type="button"
            data-testid="claim-success-done"
            onClick={onClose}
            className="w-full min-h-[48px] touch-manipulation px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-base"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
