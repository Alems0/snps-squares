/**
 * Large segmented Venmo / Cash control for reliable iOS Safari taps.
 * Native radiogroup with arrow-key support (no aria-pressed).
 */

import { useRef } from 'react'

export type PaymentMethod = 'cash' | 'venmo'

interface PaymentMethodToggleProps {
  value: PaymentMethod | ''
  onChange: (method: PaymentMethod) => void
  venmoHandle?: string
  disabled?: boolean
  id?: string
}

export default function PaymentMethodToggle({
  value,
  onChange,
  venmoHandle,
  disabled = false,
  id = 'payment-method',
}: PaymentMethodToggleProps) {
  const groupRef = useRef<HTMLDivElement>(null)

  const options: {
    method: PaymentMethod
    label: string
    hint: string
    testId: string
  }[] = [
    {
      method: 'venmo',
      label: 'Venmo',
      hint: venmoHandle ? venmoHandle.replace(/^@?/, '@') : 'Pay via Venmo',
      testId: 'payment-venmo',
    },
    {
      method: 'cash',
      label: 'Cash',
      hint: 'Pay admin',
      testId: 'payment-cash',
    },
  ]

  const selectByOffset = (delta: number) => {
    const idx = Math.max(
      0,
      options.findIndex((o) => o.method === value)
    )
    const next = options[(idx + delta + options.length) % options.length]
    onChange(next.method)
    const btn = groupRef.current?.querySelector<HTMLElement>(
      `[data-testid="${next.testId}"]`
    )
    btn?.focus()
  }

  return (
    <div>
      <div
        id={`${id}-label`}
        className="block text-sm font-semibold text-[var(--color-text)] mb-2"
      >
        Payment Method <span className="text-[var(--color-secondary)]">*</span>
      </div>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        data-testid="payment-method-toggle"
        className="grid grid-cols-2 gap-2"
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            selectByOffset(1)
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault()
            selectByOffset(-1)
          }
        }}
      >
        {options.map(({ method, label, hint, testId }) => {
          const selected = value === method
          return (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (!value && method === options[0].method) ? 0 : -1}
              data-testid={testId}
              disabled={disabled}
              onClick={() => onChange(method)}
              className={`min-h-[48px] touch-manipulation flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 rounded-lg border-2 text-center transition-colors disabled:bg-[var(--color-border-light)] disabled:text-[var(--color-text-secondary)] disabled:border-[var(--color-border)] disabled:cursor-not-allowed ${
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)]'
              }`}
            >
              <span className="font-semibold text-base leading-tight">{label}</span>
              <span
                className={`text-xs leading-tight truncate max-w-full ${
                  selected
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {hint}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
