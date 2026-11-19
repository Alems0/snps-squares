/**
 * Convert a 0–99 storage `position` to the 1–100 number shown to users.
 * DB, RPCs, and backup `position` stay 0-based; only UI/labels use this.
 */
export function displaySquareNumber(pos: number): number {
  return pos + 1
}

/** `#1` … `#100` label for a storage position. */
export function formatSquareLabel(pos: number): string {
  return `#${displaySquareNumber(pos)}`
}

/**
 * Parse a 1–100 square number entered by a user/admin into a 0–99 storage position.
 * Returns null when out of range or not an integer.
 */
export function parseDisplaySquareNumber(n: number): number | null {
  if (!Number.isInteger(n) || n < 1 || n > 100) return null
  return n - 1
}
