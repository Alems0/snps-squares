import { useEffect, useRef } from 'react'

interface ConfirmationModalProps {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'default' | 'destructive'
}

export default function ConfirmationModal({
  title,
  description,
  confirmText = 'Yes',
  cancelText = 'No',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmationModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelButtonRef.current?.focus()

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-md w-full flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,0px)]"
        style={{ maxHeight: 'min(calc(100dvh - 24px), calc(100vh - 24px))' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
          <h2 id="confirm-modal-title" className="text-lg sm:text-xl font-bold text-[var(--color-text)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
            {description}
          </p>
        </div>
        <div className="shrink-0 flex gap-3 justify-end px-4 py-3 sm:px-6 sm:pb-5 border-t border-[var(--color-border-light)] bg-white">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all font-semibold text-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-semibold transition-all text-sm ${
              variant === 'destructive'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[var(--color-primary)] text-white hover:bg-opacity-90'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
