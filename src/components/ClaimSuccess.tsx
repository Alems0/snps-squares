interface ClaimSuccessProps {
  squareCount: number
  totalCost: number
  paymentMethod: 'cash' | 'venmo'
  venmoHandle?: string
  onClose: () => void
}

export default function ClaimSuccess({
  squareCount,
  totalCost,
  paymentMethod,
  venmoHandle,
  onClose,
}: ClaimSuccessProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Success Icon */}
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-green-500"
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

          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
            Squares Claimed!
          </h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            You've successfully claimed {squareCount} square{squareCount > 1 ? 's' : ''}.
          </p>

          {/* Payment Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                Total Amount
              </span>
              <span className="text-2xl font-bold text-[var(--color-success)]">
                ${totalCost}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                  Payment Method
                </span>
                <span className="text-sm font-semibold text-[var(--color-primary)]">
                  {paymentMethod === 'cash' ? '💵 Cash' : '📱 Venmo'}
                </span>
              </div>
              {paymentMethod === 'venmo' && venmoHandle && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">
                    Send payment to:
                  </p>
                  <p className="font-mono font-bold text-[var(--color-primary)]">
                    @{venmoHandle}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-sm text-[var(--color-primary)] mb-2">
              Next Steps
            </h3>
            <ul className="text-xs text-[var(--color-text-muted)] space-y-1">
              <li>• Your squares are now reserved</li>
              {paymentMethod === 'venmo' && venmoHandle && (
                <li>• Send ${totalCost} to @{venmoHandle} via Venmo</li>
              )}
              {paymentMethod === 'cash' && (
                <li>• Arrange payment with the game host</li>
              )}
              <li>• Check back after the game starts to see the numbers</li>
              <li>• Good luck! 🏈</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
