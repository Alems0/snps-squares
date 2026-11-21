const ET_ZONE = 'America/New_York'

/**
 * Format an ISO timestamp for display in America/New_York, e.g.
 * "Nov 19, 2026, 1:46 PM ET"
 */
export function formatEasternDateTime(
  iso: string | Date | null | undefined
): string {
  if (iso == null || iso === '') return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'

  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)

  return `${formatted} ET`
}

/**
 * Print footer stamp in America/New_York, e.g.
 * "Printed Sat, Nov 21, 2026, 10:21 AM ET"
 */
export function formatPrintedAt(when: Date = new Date()): string {
  if (Number.isNaN(when.getTime())) return 'Printed —'

  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_ZONE,
    weekday: 'short',
  }).format(when)

  const rest = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(when)

  return `Printed ${weekday}, ${rest} ET`
}
