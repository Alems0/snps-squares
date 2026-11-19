/**
 * Large segmented Venmo / Cash control for reliable iOS Safari taps.
 * Uses buttons (aria-pressed / radiogroup) instead of native radios —
 * Safari often fails to toggle visually-small radios inside scrolled
 * bottom sheets when a sticky footer overlaps the hit area.
 */

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

  return (
    <div>
      <div
        id={`${id}-label`}
        className="block text-sm font-semibold text-[var(--color-text)] mb-2"
      >
        Payment Method <span className="text-red-500">*</span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        data-testid="payment-method-toggle"
        className="grid grid-cols-2 gap-2"
      >
        {options.map(({ method, label, hint, testId }) => {
          const selected = value === method
          return (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-pressed={selected}
              data-testid={testId}
              disabled={disabled}
              onClick={() => onChange(method)}
              className={`min-h-[48px] touch-manipulation flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 rounded-lg border-2 text-center transition-colors disabled:opacity-50 ${
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)]'
              }`}
            >
              <span className="font-semibold text-base leading-tight">{label}</span>
              <span
                className={`text-xs leading-tight truncate max-w-full ${
                  selected ? 'text-[var(--color-primary)]/80' : 'text-[var(--color-text-muted)]'
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
