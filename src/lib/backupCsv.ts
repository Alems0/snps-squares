/** Backup CSV decode/parse for Excel-safe restore (Mac CR, BOM, ; / tab, sci-notation phones). */

export interface BackupSquareRow {
  position: number
  first_name: string
  last_name: string
  email: string
  payment_method: string
  payment_status: string
  phone?: string
  claimed_at?: string
  full_name?: string
}

export interface ParseBackupCsvResult {
  rows: BackupSquareRow[]
  warnings: string[]
  errors: string[]
}

const HEADER_ALIASES: Record<string, string> = {
  position: 'position',
  pos: 'position',
  first_name: 'first_name',
  first: 'first_name',
  firstname: 'first_name',
  last_name: 'last_name',
  last: 'last_name',
  lastname: 'last_name',
  full_name: 'full_name',
  name: 'full_name',
  claimed_by_name: 'full_name',
  email: 'email',
  claimed_by_email: 'email',
  e_mail: 'email',
  phone: 'phone',
  mobile: 'phone',
  cell: 'phone',
  cellphone: 'phone',
  cell_phone: 'phone',
  mobile_phone: 'phone',
  phone_number: 'phone',
  payment_method: 'payment_method',
  method: 'payment_method',
  payment_status: 'payment_status',
  status: 'payment_status',
  claimed_at: 'claimed_at',
  claimed: 'claimed_at',
}

const POSITION_RE = /^\d+(\.0+)?$/
const SCI_PHONE_RE = /e[+-]?\d/i

/** Excel-ish local datetime: M/D/YY[YY] H:MM[:SS] [AM/PM] */
const EXCEL_LOCAL_DT_RE =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i

function normalizeHeaderKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_')
}

/** Strip csvSafe formula-neutralization leading apostrophe (=, +, -, @). */
export function stripCsvFormulaGuard(value: string): string {
  if (value.startsWith("'") && /^'[=+\-@]/.test(value)) {
    return value.slice(1)
  }
  // Excel sometimes keeps a leading apostrophe on text cells
  if (value.startsWith("'") && value.length > 1) {
    return value.slice(1)
  }
  return value
}

export function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

function detectDelimiter(headerLine: string): string {
  // Prefer the delimiter that yields a 'position' field when split with quotes
  const candidates = [',', ';', '\t'] as const
  let best: string = ','
  let bestScore = -1
  for (const d of candidates) {
    const cells = parseCsvLine(headerLine, d).map((c) => normalizeHeaderKey(c))
    const hasPosition = cells.some((c) => HEADER_ALIASES[c] === 'position' || c === 'position')
    const score = (hasPosition ? 1000 : 0) + cells.length
    if (score > bestScore) {
      bestScore = score
      best = d
    }
  }
  return best
}

function isAllBlank(cells: string[]): boolean {
  return cells.every((c) => !c.trim())
}

/**
 * Convert Excel local datetime strings to ISO. Leaves ISO / other values alone.
 * Interprets m/d/yy[yy] as local wall time.
 */
export function normalizeClaimedAt(raw: string): string | undefined {
  const v = raw.trim()
  if (!v) return undefined

  const m = v.match(EXCEL_LOCAL_DT_RE)
  if (m) {
    let year = Number(m[3])
    if (year < 100) year += 2000
    const month = Number(m[1])
    const day = Number(m[2])
    let hour = Number(m[4])
    const minute = Number(m[5])
    const second = Number(m[6] || '0')
    const ampm = (m[7] || '').toUpperCase()
    if (ampm === 'PM' && hour < 12) hour += 12
    if (ampm === 'AM' && hour === 12) hour = 0
    const dt = new Date(year, month - 1, day, hour, minute, second)
    if (!Number.isNaN(dt.getTime())) return dt.toISOString()
  }

  // Already ISO-ish — keep as-is (server also parses)
  return v
}

/**
 * Decode CSV bytes: UTF-16 LE/BE BOM, UTF-8 BOM or plain UTF-8 (fatal),
 * fallback windows-1252.
 */
export function decodeCsvBytes(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  }
  let start = 0
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    start = 3
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(start))
  } catch {
    return new TextDecoder('windows-1252').decode(bytes.subarray(start))
  }
}

export function parseBackupCsv(text: string): ParseBackupCsvResult {
  const warnings: string[] = []
  const errors: string[] = []
  const lines = text.split(/\r\n|\r|\n/)

  let headerIdx = -1
  let delimiter = ','
  let canonicalHeaders: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const d = detectDelimiter(raw)
    const cells = parseCsvLine(raw, d).map((c) => normalizeHeaderKey(c))
    if (cells.some((c) => HEADER_ALIASES[c] === 'position' || c === 'position')) {
      headerIdx = i
      delimiter = d
      canonicalHeaders = cells.map((c) => HEADER_ALIASES[c] || c)
      break
    }
  }

  if (headerIdx < 0) {
    return {
      rows: [],
      warnings,
      errors: ['Could not find a CSV header row containing "position".'],
    }
  }

  const col = (name: string) => canonicalHeaders.indexOf(name)

  const rows: BackupSquareRow[] = []
  const seen = new Set<number>()

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw.trim() || raw.trim().startsWith('#')) continue

    const cells = parseCsvLine(raw, delimiter).map(stripCsvFormulaGuard)
    if (isAllBlank(cells)) continue

    const positionRaw = (cells[col('position')] ?? '').trim()
    if (!positionRaw) {
      // Trailing blank columns / empty position — skip (do not treat as 0)
      continue
    }
    if (!POSITION_RE.test(positionRaw)) {
      errors.push(`Invalid position "${positionRaw}" on data row ${i + 1}`)
      continue
    }
    const position = Number(positionRaw)
    if (!Number.isInteger(position) || position < 0 || position > 99) {
      errors.push(`Position out of range on data row ${i + 1}: ${positionRaw}`)
      continue
    }
    if (seen.has(position)) {
      errors.push(`Duplicate position: ${position}`)
      continue
    }
    seen.add(position)

    let first_name = cells[col('first_name')] ?? ''
    let last_name = cells[col('last_name')] ?? ''
    const full_name = cells[col('full_name')] ?? ''
    const email = (cells[col('email')] ?? '').trim().toLowerCase()

    const phoneRaw = (cells[col('phone')] ?? '').trim()
    let phone: string | undefined
    if (phoneRaw) {
      if (SCI_PHONE_RE.test(phoneRaw)) {
        warnings.push(
          `Dropped scientific-notation phone at position ${position} (${phoneRaw}); keeping existing phone on restore.`
        )
        phone = undefined
      } else {
        phone = phoneRaw
      }
    }

    const payment_method = (cells[col('payment_method')] ?? '').trim().toLowerCase()
    const payment_status =
      (cells[col('payment_status')] ?? 'unpaid').trim().toLowerCase() || 'unpaid'
    const claimedRaw = cells[col('claimed_at')] ?? ''
    const claimed_at = normalizeClaimedAt(claimedRaw)

    if ((!first_name || !last_name) && full_name) {
      const parts = full_name.trim().split(/\s+/)
      if (!first_name) first_name = parts[0] || ''
      if (!last_name) last_name = parts.slice(1).join(' ') || ''
    }

    rows.push({
      position,
      first_name,
      last_name,
      email,
      phone,
      payment_method,
      payment_status,
      claimed_at,
      full_name: full_name || undefined,
    })
  }

  return { rows, warnings, errors }
}
