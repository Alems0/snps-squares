import { useState, FormEvent, useEffect, useRef } from 'react'
import { formatVenmoHandle } from '../lib/formatVenmo'

interface ClaimPopoverProps {
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
  boardRef: React.RefObject<HTMLDivElement>
}

export default function ClaimPopover({
  selectedSquares,
  costPerSquare,
  venmoHandle,
  onClose,
  onSubmit,
  boardRef
}: ClaimPopoverProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'venmo' | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [position, setPosition] = useState<{ top: number; left: number; placement: string } | null>(null)
  const [measured, setMeasured] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const totalCost = selectedSquares.length * costPerSquare

  // Initial measurement to get popover dimensions
  useEffect(() => {
    if (popoverRef.current && !measured) {
      // Force a reflow to get dimensions
      popoverRef.current.getBoundingClientRect()
      setMeasured(true)
    }
  }, [measured])

  // Calculate popover position based on selected squares
  useEffect(() => {
    if (!measured) return

    const calculatePosition = () => {
      if (!boardRef.current || !popoverRef.current || selectedSquares.length === 0) return

      const boardRect = boardRef.current.getBoundingClientRect()
      const popoverRect = popoverRef.current.getBoundingClientRect()
      
      // Find all selected square elements
      const squareElements = selectedSquares.map(pos => {
        const button = boardRef.current?.querySelector(`button[data-position="${pos}"]`)
        return button
      }).filter(Boolean) as HTMLElement[]

      if (squareElements.length === 0) return

      // Calculate bounding box of all selected squares
      const squareRects = squareElements.map(el => el.getBoundingClientRect())
      const minX = Math.min(...squareRects.map(r => r.left))
      const maxX = Math.max(...squareRects.map(r => r.right))
      const minY = Math.min(...squareRects.map(r => r.top))
      const maxY = Math.max(...squareRects.map(r => r.bottom))
      
      const selectionWidth = maxX - minX
      const selectionHeight = maxY - minY
      const selectionCenterX = (minX + maxX) / 2
      const selectionCenterY = (minY + maxY) / 2

      // Check if selection spans most of the board (far apart squares)
      const boardWidth = boardRect.width
      const boardHeight = boardRect.height
      const spanRatio = Math.max(selectionWidth / boardWidth, selectionHeight / boardHeight)
      
      const isMobile = window.innerWidth < 640
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const popoverWidth = popoverRect.width || 400
      const popoverHeight = popoverRect.height || 500

      let finalTop: number
      let finalLeft: number
      let placement = 'center'

      if (isMobile || spanRatio > 0.6) {
        // Mobile or wide selection: center on viewport
        finalTop = Math.max(20, (viewportHeight - popoverHeight) / 2)
        finalLeft = Math.max(20, (viewportWidth - popoverWidth) / 2)
        placement = 'center'
      } else {
        // Desktop with localized selection: anchor near squares
        const gap = 16
        
        // Try positions: above, below, right, left
        const positions = [
          { top: minY - popoverHeight - gap, left: selectionCenterX - popoverWidth / 2, placement: 'above' },
          { top: maxY + gap, left: selectionCenterX - popoverWidth / 2, placement: 'below' },
          { top: selectionCenterY - popoverHeight / 2, left: maxX + gap, placement: 'right' },
          { top: selectionCenterY - popoverHeight / 2, left: minX - popoverWidth - gap, placement: 'left' }
        ]

        // Find first position that fits in viewport
        let bestPosition = positions[0]
        let bestScore = -1

        for (const pos of positions) {
          const fitsVertically = pos.top >= 20 && (pos.top + popoverHeight) <= (viewportHeight - 20)
          const fitsHorizontally = pos.left >= 20 && (pos.left + popoverWidth) <= (viewportWidth - 20)
          
          if (fitsVertically && fitsHorizontally) {
            bestPosition = pos
            placement = pos.placement
            break
          }

          // Score partial fits
          const verticalOverlap = Math.max(0, 20 - pos.top) + Math.max(0, (pos.top + popoverHeight) - (viewportHeight - 20))
          const horizontalOverlap = Math.max(0, 20 - pos.left) + Math.max(0, (pos.left + popoverWidth) - (viewportWidth - 20))
          const score = -(verticalOverlap + horizontalOverlap)
          
          if (score > bestScore) {
            bestScore = score
            bestPosition = pos
            placement = pos.placement
          }
        }

        finalTop = bestPosition.top
        finalLeft = bestPosition.left

        // Constrain to viewport
        finalTop = Math.max(20, Math.min(finalTop, viewportHeight - popoverHeight - 20))
        finalLeft = Math.max(20, Math.min(finalLeft, viewportWidth - popoverWidth - 20))
      }

      setPosition({ top: finalTop, left: finalLeft, placement })
    }

    // Initial calculation
    calculatePosition()

    // Recalculate on resize/scroll
    window.addEventListener('resize', calculatePosition)
    window.addEventListener('scroll', calculatePosition, true)
    
    return () => {
      window.removeEventListener('resize', calculatePosition)
      window.removeEventListener('scroll', calculatePosition, true)
    }
  }, [selectedSquares, boardRef, measured])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Focus management
  useEffect(() => {
    if (popoverRef.current) {
      const firstInput = popoverRef.current.querySelector('input')
      firstInput?.focus()
    }
  }, [])

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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
        email: email.trim(),
        paymentMethod
      })
    } catch {
      setError('Failed to claim squares. Please try again.')
      setIsSubmitting(false)
    }
  }

  const positionStyle = position ? {
    position: 'fixed' as const,
    top: `${position.top}px`,
    left: `${position.left}px`,
    zIndex: 50,
    opacity: 1
  } : {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 50,
    opacity: measured ? 1 : 0
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
        style={positionStyle}
        className="bg-white rounded-xl shadow-2xl border border-[var(--color-border)] w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between z-10">
          <h2 id="claim-title" className="text-xl font-bold text-[var(--color-text)]">
            Claim Square{selectedSquares.length > 1 ? 's' : ''}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selected squares info */}
          <div className="bg-slate-50 rounded-lg p-4 border border-[var(--color-border-light)]">
            <div className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">Selected Squares</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedSquares.map(pos => (
                <span key={pos} className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold">
                  #{pos}
                </span>
              ))}
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-[var(--color-border-light)]">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">Total Cost</span>
              <span className="text-2xl font-bold text-[var(--color-primary)]">${totalCost}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border-2 border-[var(--color-border)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="venmo"
                    checked={paymentMethod === 'venmo'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'venmo')}
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--color-text)]">Venmo</div>
                    {venmoHandle && (
                      <div className="text-sm text-[var(--color-text-muted)] mt-1">
                        Send ${totalCost} to {formatVenmoHandle(venmoHandle)}
                      </div>
                    )}
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 border-2 border-[var(--color-border)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash')}
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--color-text)]">Cash</div>
                    <div className="text-sm text-[var(--color-text-muted)] mt-1">
                      Pay the admin directly
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border-2 border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Claiming...
                </>
              ) : (
                `Claim ${selectedSquares.length} Square${selectedSquares.length > 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
