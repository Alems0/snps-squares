import { useEffect, useRef, useState } from 'react'
import { GAME_PASSWORD_UNSET_MESSAGE } from '../lib/gamePassword'

interface ConfirmationModalProps {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: (password?: string) => void | Promise<void>
  onCancel: () => void
  variant?: 'default' | 'destructive'
  /** Prompt for Game Password before confirming. */
  requirePassword?: boolean
  /** When true, destructive action is blocked until a Game Password is set. */
  passwordUnset?: boolean
}

export default function ConfirmationModal({
  title,
  description,
  confirmText = 'Yes',
  cancelText = 'No',
  onConfirm,
  onCancel,
  variant = 'default',
  requirePassword = false,
  passwordUnset = false,
}: ConfirmationModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    cancelButtonRef.current?.focus()

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCancel, busy])

  const handleConfirm = async () => {
    setError('')
    if (requirePassword && passwordUnset) {
      setError(GAME_PASSWORD_UNSET_MESSAGE)
      return
    }
    if (requirePassword && !password) {
      setError('Enter the Game Password to continue.')
      return
    }

    setBusy(true)
    try {
      await onConfirm(requirePassword ? password : undefined)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-md w-full flex flex-col overflow-hidden"
        style={{ maxHeight: 'min(calc(100dvh - 24px), calc(100vh - 24px))' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        data-testid="confirmation-modal"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
          <h2 id="confirm-modal-title" className="text-lg sm:text-xl font-bold text-[var(--color-text)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[44px] min-w-[44px] touch-manipulation inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-lg"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4 space-y-4">
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
            {description}
          </p>

          {requirePassword && passwordUnset && (
            <div
              data-testid="game-password-unset"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900"
            >
              {GAME_PASSWORD_UNSET_MESSAGE}
            </div>
          )}

          {requirePassword && !passwordUnset && (
            <div className="space-y-2">
              <label
                htmlFor="confirm-game-password"
                className="block text-sm font-semibold text-[var(--color-text)]"
              >
                Game Password
              </label>
              <div className="flex gap-2">
                <input
                  id="confirm-game-password"
                  data-testid="confirm-game-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                  className="flex-1 min-w-0 px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                  autoComplete="current-password"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 min-h-[44px] touch-manipulation px-3 py-2 border-2 border-gray-300 rounded-lg text-base font-semibold text-[var(--color-text-secondary)] hover:bg-slate-50"
                  disabled={busy}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div
              data-testid="confirm-password-error"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}
        </div>
        <div className="shrink-0 flex gap-3 justify-end px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-6 border-t border-[var(--color-border-light)] bg-white">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[44px] touch-manipulation px-4 sm:px-5 py-2.5 border-2 border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all font-semibold text-base"
          >
            {cancelText}
          </button>
          <button
            type="button"
            data-testid="confirm-modal-confirm"
            onClick={handleConfirm}
            disabled={busy || (requirePassword && passwordUnset)}
            className={`min-h-[44px] touch-manipulation px-4 sm:px-5 py-2.5 rounded-lg font-semibold transition-all text-base disabled:opacity-50 ${
              variant === 'destructive'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[var(--color-primary)] text-white hover:bg-opacity-90'
            }`}
          >
            {busy ? 'Working…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
