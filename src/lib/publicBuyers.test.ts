import { describe, expect, it } from 'vitest'
import { aggregatePublicBuyers, earliestClaimedAt } from './publicBuyers'

describe('aggregatePublicBuyers', () => {
  it('groups by name, uses earliest claimed_at, sorts newest first', () => {
    const buyers = aggregatePublicBuyers([
      { claimed_by_name: 'Alex', claimed_at: '2026-11-18T15:00:00.000Z' },
      { claimed_by_name: 'Alex', claimed_at: '2026-11-19T12:00:00.000Z' },
      { claimed_by_name: 'Blake', claimed_at: '2026-11-19T18:00:00.000Z' },
      { claimed_by_name: null, claimed_at: '2026-11-19T20:00:00.000Z' },
    ])

    expect(buyers).toHaveLength(2)
    expect(buyers[0].name).toBe('Blake')
    expect(buyers[0].squareCount).toBe(1)
    expect(buyers[0].firstClaimedAt).toBe('2026-11-19T18:00:00.000Z')

    expect(buyers[1].name).toBe('Alex')
    expect(buyers[1].squareCount).toBe(2)
    expect(buyers[1].firstClaimedAt).toBe('2026-11-18T15:00:00.000Z')
  })
})

describe('earliestClaimedAt', () => {
  it('returns the earliest ISO timestamp', () => {
    expect(
      earliestClaimedAt([
        { claimed_at: '2026-11-19T18:00:00.000Z' },
        { claimed_at: '2026-11-18T12:00:00.000Z' },
        { claimed_at: null },
      ])
    ).toBe('2026-11-18T12:00:00.000Z')
  })

  it('returns null when none present', () => {
    expect(earliestClaimedAt([])).toBeNull()
    expect(earliestClaimedAt([{ claimed_at: null }])).toBeNull()
  })
})
