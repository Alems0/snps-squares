import { describe, expect, it } from 'vitest'
import { formatEasternDateTime, formatPrintedAt } from './formatEasternDateTime'

describe('formatEasternDateTime', () => {
  it('formats a known UTC instant in America/New_York with ET label', () => {
    // 2026-11-19T18:46:00Z → 1:46 PM EST (UTC-5)
    const out = formatEasternDateTime('2026-11-19T18:46:00.000Z')
    expect(out).toMatch(/Nov 19, 2026/)
    expect(out).toMatch(/1:46\s*PM/)
    expect(out.endsWith(' ET')).toBe(true)
  })

  it('returns em dash for empty / invalid', () => {
    expect(formatEasternDateTime(null)).toBe('—')
    expect(formatEasternDateTime(undefined)).toBe('—')
    expect(formatEasternDateTime('')).toBe('—')
    expect(formatEasternDateTime('not-a-date')).toBe('—')
  })
})

describe('formatPrintedAt', () => {
  it('includes weekday and ET for a known instant', () => {
    // 2026-11-21T15:21:00Z → Sat, Nov 21, 2026, 10:21 AM EST
    const out = formatPrintedAt(new Date('2026-11-21T15:21:00.000Z'))
    expect(out).toMatch(/^Printed Sat, Nov 21, 2026/)
    expect(out).toMatch(/10:21\s*AM/)
    expect(out.endsWith(' ET')).toBe(true)
  })
})
