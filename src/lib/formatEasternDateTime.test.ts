import { describe, expect, it } from 'vitest'
import { formatEasternDateTime } from './formatEasternDateTime'

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
