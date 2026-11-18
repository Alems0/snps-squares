import { useState, FormEvent, useEffect, useRef, useCallback } from 'react'
import { formatVenmoHandle } from '../lib/formatVenmo'
import { supabase, EMAIL_REGEX, normalizePhone, type PlayerNameSuggestion } from '../lib/supabase'

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
    playerId?: string
    phone?: string
  }) => Promise<void>
  boardRef: React.RefObject<HTMLDivElement | null>
}

const MARGIN = 12
const GAP = 12
const MAX_POPOVER_H = 560

function rectsOverlap(
  a: { top: number; left: number; width: number; height: number },
  b: { top: number; left: number; right: number; bottom: number }
) {
  return !(
    a.left + a.width <= b.left ||
    a.left >= b.right ||
    a.top + a.height <= b.top ||
    a.top >= b.bottom
  )
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
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'venmo' | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PlayerNameSuggestion[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: 0,
    left: 0,
    width: 'min(400px, calc(100vw - 24px))',
    maxHeight: `min(${MAX_POPOVER_H}px, 80vh)`,
    opacity: 0,
    zIndex: 50,
    pointerEvents: 'none'
  })
  const popoverRef = useRef<HTMLDivElement>(null)

  const totalCost = selectedSquares.length * costPerSquare

  const calculatePosition = useCallback(() => {
    if (!boardRef.current || !popoverRef.current || selectedSquares.length === 0) return

    const squareElements = selectedSquares
      .map(pos => boardRef.current?.querySelector(`button[data-position="${pos}"]`))
      .filter(Boolean) as HTMLElement[]

    if (squareElements.length === 0) return

    const vh = window.innerHeight
    const vw = window.innerWidth
    const isMobile = vw < 640

    // Keep selection visible: center on desktop; upper third on mobile (above bottom sheet)
    const first = squareElements[0]
    const firstRect = first.getBoundingClientRect()
    const sheetReserve = isMobile ? Math.min(MAX_POPOVER_H, vh * 0.55) + MARGIN * 2 : 0
    const needsScroll =
      firstRect.bottom < 0 ||
      firstRect.top > vh - sheetReserve ||
      firstRect.right < 0 ||
      firstRect.left > vw
    if (needsScroll || isMobile) {
      first.scrollIntoView({
        block: isMobile ? 'start' : 'center',
        inline: 'nearest',
        behavior: 'instant'
      })
      if (isMobile) {
        // Nudge so selection sits in the upper portion above the sheet
        window.scrollBy({ top: -80, behavior: 'instant' })
      }
    }

    // Re-measure after potential scroll
    const squareRects = squareElements.map(el => el.getBoundingClientRect())
    const sel = {
      left: Math.min(...squareRects.map(r => r.left)),
      right: Math.max(...squareRects.map(r => r.right)),
      top: Math.min(...squareRects.map(r => r.top)),
      bottom: Math.max(...squareRects.map(r => r.bottom))
    }
    const selW = sel.right - sel.left
    const selH = sel.bottom - sel.top
    const selCX = (sel.left + sel.right) / 2
    const selCY = (sel.top + sel.bottom) / 2

    const boardRect = boardRef.current.getBoundingClientRect()
    const spanRatio = Math.max(selW / boardRect.width, selH / boardRect.height)

    // Measure popover (force max-height so measurement is accurate)
    const popoverEl = popoverRef.current
    const maxH = Math.min(MAX_POPOVER_H, isMobile ? vh * 0.52 : vh * 0.8)
    popoverEl.style.maxHeight = `${maxH}px`

    const popoverRect = popoverEl.getBoundingClientRect()
    const basePopW = popoverRect.width || Math.min(400, vw - MARGIN * 2)
    const popH = Math.min(popoverRect.height || 480, maxH)

    // Mobile: bottom sheet, full usable width, clamped; selection scrolled above
    if (isMobile) {
      const popW = vw - MARGIN * 2
      const top = Math.max(MARGIN, vh - popH - MARGIN)
      setStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${MARGIN}px`,
        width: `${popW}px`,
        maxHeight: `${maxH}px`,
        zIndex: 50,
        opacity: 1,
        pointerEvents: 'auto'
      })
      return
    }

    const popW = basePopW

    // Wide selection spanning most of board: center over board
    if (spanRatio > 0.6) {
      const boardCX = boardRect.left + boardRect.width / 2
      const boardCY = boardRect.top + boardRect.height / 2
      const centeredLeft = Math.max(MARGIN, Math.min(boardCX - popW / 2, vw - popW - MARGIN))
      const centeredTop = Math.max(MARGIN, Math.min(boardCY - popH / 2, vh - popH - MARGIN))
      setStyle({
        position: 'fixed',
        top: `${centeredTop}px`,
        left: `${centeredLeft}px`,
        width: `${popW}px`,
        maxHeight: `${maxH}px`,
        zIndex: 50,
        opacity: 1,
        pointerEvents: 'auto'
      })
      return
    }

    // Desktop: pick side with most room that avoids overlapping selection
    const candidates = [
      {
        placement: 'right',
        left: sel.right + GAP,
        top: selCY - popH / 2,
        room: vw - sel.right - MARGIN
      },
      {
        placement: 'left',
        left: sel.left - popW - GAP,
        top: selCY - popH / 2,
        room: sel.left - MARGIN
      },
      {
        placement: 'below',
        left: selCX - popW / 2,
        top: sel.bottom + GAP,
        room: vh - sel.bottom - MARGIN
      },
      {
        placement: 'above',
        left: selCX - popW / 2,
        top: sel.top - popH - GAP,
        room: sel.top - MARGIN
      }
    ]

    // Sort by available room (most first)
    candidates.sort((a, b) => b.room - a.room)

    let best = candidates[0]
    let bestScore = -Infinity

    for (const c of candidates) {
      // Clamp to viewport first
      const clampedLeft = Math.max(MARGIN, Math.min(c.left, vw - popW - MARGIN))
      const clampedTop = Math.max(MARGIN, Math.min(c.top, vh - popH - MARGIN))
      const box = { top: clampedTop, left: clampedLeft, width: popW, height: popH }

      const overlapsSelection = rectsOverlap(box, sel)
      const outOfBounds =
        Math.max(0, MARGIN - c.left) +
        Math.max(0, c.left + popW - (vw - MARGIN)) +
        Math.max(0, MARGIN - c.top) +
        Math.max(0, c.top + popH - (vh - MARGIN))

      // Prefer no overlap with selection; then prefer more room / less clamping
      const score =
        (overlapsSelection ? -100000 : 0) +
        c.room * 10 -
        outOfBounds

      if (score > bestScore) {
        bestScore = score
        best = { ...c, left: clampedLeft, top: clampedTop, room: c.room }
      }
    }

    // Final clamp
    const finalLeft = Math.max(MARGIN, Math.min(best.left, vw - popW - MARGIN))
    const finalTop = Math.max(MARGIN, Math.min(best.top, vh - popH - MARGIN))

    setStyle({
      position: 'fixed',
      top: `${finalTop}px`,
      left: `${finalLeft}px`,
      width: `${popW}px`,
      maxHeight: `${maxH}px`,
      zIndex: 50,
      opacity: 1,
      pointerEvents: 'auto'
    })
  }, [selectedSquares, boardRef])

  useEffect(() => {
    // Position after paint so dimensions are real
    const id = requestAnimationFrame(() => {
      calculatePosition()
    })
    window.addEventListener('resize', calculatePosition)
    window.addEventListener('scroll', calculatePosition, true)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', calculatePosition)
      window.removeEventListener('scroll', calculatePosition, true)
    }
  }, [calculatePosition])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  useEffect(() => {
    const firstInput = popoverRef.current?.querySelector('input')
    firstInput?.focus()
  }, [])

  // Public name autocomplete (names only — never emails)
  useEffect(() => {
    if (selectedPlayerId) return
    const q = nameQuery.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      const { data, error: err } = await supabase.rpc('search_player_names', { q })
      if (err) {
        setSuggestions([])
        return
      }
      setSuggestions((data as PlayerNameSuggestion[]) || [])
      setShowSuggestions(true)
    }, 200)
    return () => clearTimeout(t)
  }, [nameQuery, selectedPlayerId])

  const pickSuggestion = (s: PlayerNameSuggestion) => {
    const parts = s.display_name.trim().split(/\s+/)
    const first = parts[0] || ''
    const last = parts.slice(1).join(' ') || first
    setFirstName(first)
    setLastName(last)
    setNameQuery(s.display_name)
    setSelectedPlayerId(s.id)
    setEmail('') // email resolved server-side
    setSuggestions([])
    setShowSuggestions(false)
  }

  const clearSelectedPlayer = () => {
    setSelectedPlayerId(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim()) {
      setError('First name is required')
      return
    }
    if (!lastName.trim()) {
      setError('Last name is required')
      return
    }
    let normalizedPhone: string | undefined
    if (!selectedPlayerId) {
      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail) {
        setError('Email is required')
        return
      }
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        setError('Please enter a valid email address')
        return
      }
      if (phone.trim()) {
        const n = normalizePhone(phone)
        if (!n) {
          setError('Please enter a valid phone number')
          return
        }
        normalizedPhone = n
      }
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
        email: selectedPlayerId ? '' : email.trim().toLowerCase(),
        paymentMethod,
        playerId: selectedPlayerId || undefined,
        phone: normalizedPhone,
      })
    } catch {
      setError('Failed to claim squares. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Non-blocking dim: squares stay toggleable; close via X / Cancel / Escape / Clear */}
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.2)' }}
        aria-hidden="true"
      />

      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
        style={style}
        className="bg-white rounded-xl shadow-2xl border border-[var(--color-border)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-white border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between z-10">
          <h2 id="claim-title" className="text-lg font-bold text-[var(--color-text)]">
            Claim Square{selectedSquares.length > 1 ? 's' : ''}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="bg-slate-50 rounded-lg p-3 border border-[var(--color-border-light)]">
              <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-1.5">Selected Squares</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedSquares.map(pos => (
                  <span key={pos} className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-primary)] text-white text-xs font-semibold">
                    #{pos}
                  </span>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border-light)]">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Total Cost</span>
                <span className="text-xl font-bold text-[var(--color-primary)]">${totalCost}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="relative">
              <label htmlFor="returningPlayer" className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                Returning player? (optional)
              </label>
              <input
                type="text"
                id="returningPlayer"
                value={nameQuery}
                onChange={(e) => {
                  setNameQuery(e.target.value)
                  clearSelectedPlayer()
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Start typing your name…"
                className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
                disabled={isSubmitting}
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-30 mt-1 w-full bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm font-semibold text-[var(--color-text)] hover:bg-slate-50"
                        onClick={() => pickSuggestion(s)}
                      >
                        {s.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedPlayerId && (
                <p className="text-xs text-[var(--color-success)] mt-1">
                  Returning player selected — email filled in securely.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      clearSelectedPlayer()
                    }}
                    className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value)
                      clearSelectedPlayer()
                    }}
                    className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {!selectedPlayerId && (
                <>
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                      Phone <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
                      disabled={isSubmitting}
                      autoComplete="tel"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-start gap-2 p-2.5 border-2 border-[var(--color-border)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="venmo"
                      checked={paymentMethod === 'venmo'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'venmo')}
                      className="mt-0.5"
                      disabled={isSubmitting}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[var(--color-text)]">Venmo</div>
                      {venmoHandle && (
                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                          {formatVenmoHandle(venmoHandle)}
                        </div>
                      )}
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-2.5 border-2 border-[var(--color-border)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash')}
                      className="mt-0.5"
                      disabled={isSubmitting}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-[var(--color-text)]">Cash</div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Pay admin
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex gap-2 p-4 pt-2 border-t border-[var(--color-border-light)] bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border-2 border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-slate-50 transition-all font-semibold text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Claiming...' : `Claim ${selectedSquares.length}`}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
