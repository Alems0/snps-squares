/** Max squares allowed in one claim (matches claim RPCs / claim_orders check). */
export const MAX_CLAIM_SQUARES = 100

const GENERIC = 'Failed to claim squares. Please try again.'

/** Map known server/claim errors to friendly copy; otherwise generic fallback. */
export function formatClaimError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : ''

  // PostgREST often prefixes: `PGRSTxxx: ...` or `message: ...`
  const message = raw.replace(/^[^:]+:\s*/, '').trim() || raw.trim()
  const lower = message.toLowerCase()

  if (/too many positions/.test(lower)) {
    return `You can claim at most ${MAX_CLAIM_SQUARES} squares at a time.`
  }
  if (/public claiming is closed|claiming is closed|claiming closed/.test(lower)) {
    return 'Public claiming is closed right now. Contact the organizer to claim.'
  }
  if (
    /no longer available|already (taken|claimed)|square(s)? (are |is )?taken|failed_positions/.test(
      lower
    ) ||
    message === 'Those squares are no longer available'
  ) {
    return 'One or more of those squares were just taken. Please deselect them and try again.'
  }
  if (/board numbers are locked|numbers are locked/.test(lower)) {
    return 'The board is locked and cannot accept new claims.'
  }
  if (/no active game/.test(lower)) {
    return 'No active game is available to claim.'
  }
  if (/invalid payment method/.test(lower)) {
    return 'Please choose Venmo or Cash.'
  }
  if (/invalid email/.test(lower)) {
    return 'Please enter a valid email address.'
  }
  if (/invalid phone/.test(lower)) {
    return 'Please enter a valid phone number.'
  }
  if (/first and last name are required|name too long/.test(lower)) {
    return message
  }

  // Prefer a clear short server message when it looks user-facing
  if (
    message &&
    message.length < 160 &&
    !/json|uuid|permission|rls|rpc|postgres|pgrst|fetch|jwt|token|expired|stack|syntax/i.test(
      message
    ) &&
    !/^PGRST/i.test(raw)
  ) {
    return message
  }

  return GENERIC
}
