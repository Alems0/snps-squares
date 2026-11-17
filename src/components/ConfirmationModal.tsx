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
  variant = 'default'
}: ConfirmationModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Focus cancel button by default
    cancelButtonRef.current?.focus()

    // Handle escape key
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">{title}</h2>
          <p className="text-base text-[var(--color-text-secondary)] leading-relaxed mb-6">
            {description}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              ref={cancelButtonRef}
              onClick={onCancel}
              className="px-5 py-2.5 border-2 border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-slate-50 hover:border-[var(--color-text-muted)] transition-all font-semibold"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
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
    </div>
  )
}
