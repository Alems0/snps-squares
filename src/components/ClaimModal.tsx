import { useState, FormEvent } from 'react'

interface ClaimModalProps {
  selectedSquares: number[]
  costPerSquare: number
  venmoHandle?: string
  onClose: () => void
  onSubmit: (data: {
    firstName: string
    lastName: string
    email: string
    paymentMethod: 'cash' | 'venmo'
  }) => Promise<void>
}

export default function ClaimModal({
  selectedSquares,
  costPerSquare,
  venmoHandle,
  onClose,
  onSubmit,
}: ClaimModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'venmo' | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const totalCost = selectedSquares.length * costPerSquare

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!firstName.trim()) {
      setError('First name is required')
      return
    }
    if (!lastName.trim()) {
      setError('Last name is required')
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    // Basic email validation
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    if (!paymentMethod) {
      setError('Please select a payment method')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        paymentMethod,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim squares')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[var(--color-primary)] text-white px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Claim Your Squares</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl leading-none"
              disabled={isSubmitting}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Selected Squares Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                Selected Squares
              </span>
              <span className="text-lg font-bold text-[var(--color-primary)]">
                {selectedSquares.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedSquares.map((pos) => (
                <span
                  key={pos}
                  className="inline-flex items-center justify-center w-8 h-8 bg-[var(--color-primary)] text-white rounded text-xs font-bold"
                >
                  {pos + 1}
                </span>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold">Total Cost</span>
              <span className="text-2xl font-bold text-[var(--color-success)]">
                ${totalCost}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-semibold text-[var(--color-text)] mb-1"
              >
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                placeholder="John"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-semibold text-[var(--color-text)] mb-1"
              >
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                placeholder="Doe"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[var(--color-text)] mb-1"
              >
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                placeholder="john.doe@example.com"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Payment Method *
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash')}
                    className="w-4 h-4 text-[var(--color-primary)]"
                    disabled={isSubmitting}
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-semibold text-[var(--color-text)]">Cash</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Pay in person
                    </div>
                  </div>
                  <span className="text-2xl">💵</span>
                </label>

                <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="venmo"
                    checked={paymentMethod === 'venmo'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'venmo')}
                    className="w-4 h-4 text-[var(--color-primary)]"
                    disabled={isSubmitting}
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-semibold text-[var(--color-text)]">Venmo</div>
                    {venmoHandle ? (
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Send to: <span className="font-mono font-semibold">@{venmoHandle}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Venmo details will be provided
                      </div>
                    )}
                  </div>
                  <span className="text-2xl">📱</span>
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-[var(--color-text)] hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Claiming...' : `Claim ${selectedSquares.length} Square${selectedSquares.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
