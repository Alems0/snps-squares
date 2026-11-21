import { describe, expect, it } from 'vitest'
import { formatClaimError, MAX_CLAIM_SQUARES } from './claimErrors'

describe('formatClaimError', () => {
  it('maps too many positions', () => {
    expect(formatClaimError(new Error('Too many positions (max 20)'))).toMatch(
      new RegExp(`${MAX_CLAIM_SQUARES}`)
    )
  })

  it('maps claiming closed', () => {
    expect(formatClaimError(new Error('Public claiming is closed'))).toMatch(/closed/i)
  })

  it('maps taken / unavailable squares', () => {
    expect(formatClaimError(new Error('Those squares are no longer available'))).toMatch(
      /just taken/i
    )
  })

  it('falls back to generic for opaque errors', () => {
    expect(formatClaimError(new Error('PGRST301: JWT expired'))).toBe(
      'Failed to claim squares. Please try again.'
    )
  })
})
