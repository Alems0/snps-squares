/** Public buyer row: name + count + earliest claim time (no email/phone). */

export interface PublicBuyer {
  name: string
  squareCount: number
  /** Earliest claimed_at ISO for this buyer */
  firstClaimedAt: string
}

type SquareLike = {
  claimed_by_name?: string | null
  claimed_at?: string | null
}

/**
 * Aggregate claimed squares into buyer rows using only anon-visible fields
 * (name + claimed_at). Groups by display name. Sorted newest first by
 * firstClaimedAt.
 */
export function aggregatePublicBuyers(squares: SquareLike[]): PublicBuyer[] {
  const map = new Map<string, PublicBuyer>()

  for (const s of squares) {
    const name = (s.claimed_by_name || '').trim()
    if (!name) continue
    const claimedAt = s.claimed_at
    if (!claimedAt) continue

    const key = name.toLowerCase()
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { name, squareCount: 1, firstClaimedAt: claimedAt })
      continue
    }
    existing.squareCount += 1
    if (new Date(claimedAt).getTime() < new Date(existing.firstClaimedAt).getTime()) {
      existing.firstClaimedAt = claimedAt
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.firstClaimedAt).getTime() - new Date(a.firstClaimedAt).getTime() ||
      b.squareCount - a.squareCount ||
      a.name.localeCompare(b.name)
  )
}

/** Earliest claimed_at among a list of claim rows. */
export function earliestClaimedAt(
  rows: { claimed_at?: string | null }[]
): string | null {
  let min: string | null = null
  let minTs = Infinity
  for (const r of rows) {
    if (!r.claimed_at) continue
    const t = new Date(r.claimed_at).getTime()
    if (Number.isNaN(t)) continue
    if (t < minTs) {
      minTs = t
      min = r.claimed_at
    }
  }
  return min
}
