/**
 * Formats a Venmo handle to ensure it has exactly one @ prefix
 * @param handle - The Venmo handle (may or may not include @)
 * @returns The handle with exactly one @ prefix, or undefined if no handle provided
 */
export function formatVenmoHandle(handle: string | null | undefined): string | undefined {
  if (!handle) return undefined
  const trimmed = handle.trim()
  if (!trimmed) return undefined
  // Remove any leading @ symbols, then add exactly one
  return `@${trimmed.replace(/^@+/, '')}`
}
