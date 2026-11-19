import { describe, expect, it } from 'vitest'
import { csvSafe } from './supabase'
import {
  decodeCsvBytes,
  parseBackupCsv,
  stripCsvFormulaGuard,
  normalizeClaimedAt,
} from './backupCsv'

const HEADER =
  'position,first_name,last_name,full_name,email,phone,payment_method,payment_status,claimed_at'

function dataRow(
  pos: number,
  opts: {
    first?: string
    last?: string
    email?: string
    phone?: string
    method?: string
    status?: string
    claimed?: string
    escape?: boolean
  } = {}
): string {
  const first = opts.first ?? (opts.email ? `First${pos}` : '')
  const last = opts.last ?? (opts.email ? `Last${pos}` : '')
  const full = first && last ? `${first} ${last}` : ''
  const email = opts.email ?? ''
  const phone = opts.phone ?? ''
  const method = opts.method ?? (email ? 'cash' : '')
  const status = opts.status ?? (email ? 'unpaid' : 'unpaid')
  const claimed = opts.claimed ?? ''
  const cells = [String(pos), first, last, full, email, phone, method, status, claimed]
  if (opts.escape) {
    return cells.map((c) => csvSafe(c)).join(',')
  }
  return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
}

/** 100 squares: even positions claimed, odd empty (unless overridden). */
function buildHundred(
  lineJoin: string,
  mapRow?: (pos: number, line: string) => string,
  opts?: { escape?: boolean; settings?: string[] }
): string {
  const settings = opts?.settings ?? [
    '# SNPS Squares game backup',
    '# SETTINGS',
    '# season,"2026"',
    '# SQUARES',
  ]
  const rows: string[] = [...settings, HEADER]
  for (let pos = 0; pos < 100; pos++) {
    const claimed = pos % 2 === 0
    let line = dataRow(pos, {
      email: claimed ? `user${pos}@test.com` : '',
      phone: claimed && pos === 2 ? '+15551234567' : '',
      escape: opts?.escape,
    })
    if (mapRow) line = mapRow(pos, line)
    rows.push(line)
  }
  return rows.join(lineJoin)
}

function expectHundred(rows: { position: number }[]) {
  expect(rows).toHaveLength(100)
  const positions = rows.map((r) => r.position).sort((a, b) => a - b)
  expect(positions).toEqual([...Array(100).keys()])
}

describe('stripCsvFormulaGuard / normalizeClaimedAt', () => {
  it('strips formula guard and literal leading apostrophe', () => {
    expect(stripCsvFormulaGuard("'=1+1")).toBe('=1+1')
    expect(stripCsvFormulaGuard("'+1555")).toBe('+1555')
    expect(stripCsvFormulaGuard("'Hello")).toBe('Hello')
    expect(stripCsvFormulaGuard('normal')).toBe('normal')
  })

  it('converts Excel local datetime to ISO', () => {
    const iso = normalizeClaimedAt('11/19/26 13:03')
    expect(iso).toBeTruthy()
    const d = new Date(iso!)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(10)
    expect(d.getDate()).toBe(19)
    expect(d.getHours()).toBe(13)
    expect(d.getMinutes()).toBe(3)
  })
})

describe('parseBackupCsv — 9 variants', () => {
  it('1. original download (LF, quoted cells)', () => {
    const text = buildHundred('\n')
    const { rows, errors, warnings } = parseBackupCsv(text)
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expectHundred(rows)
    expect(rows.find((r) => r.position === 0)?.email).toBe('user0@test.com')
  })

  it('2. BOM + CRLF', () => {
    const raw = buildHundred('\r\n')
    const enc = new TextEncoder().encode(raw)
    const buf = new Uint8Array(3 + enc.length)
    buf.set([0xef, 0xbb, 0xbf], 0)
    buf.set(enc, 3)
    const decoded = decodeCsvBytes(buf.buffer)
    const { rows, errors } = parseBackupCsv(decoded)
    expect(errors).toEqual([])
    expectHundred(rows)
  })

  it('3. Mac Excel CR-only windows-1252 with accented name', () => {
    // Build CR-only CSV with José in first_name (0xE9 in windows-1252)
    const header = HEADER
    const parts: string[] = ['# SETTINGS', '# SQUARES', header]
    for (let pos = 0; pos < 100; pos++) {
      if (pos === 4) {
        parts.push(
          `${pos},José,García,José García,jose${pos}@test.com,,cash,unpaid,`
        )
      } else {
        parts.push(
          dataRow(pos, {
            email: pos % 2 === 0 ? `user${pos}@test.com` : '',
          }).replace(/"/g, '')
        )
      }
    }
    // Ensure José / García use windows-1252 bytes (0xE9 / 0xED) so UTF-8 fatal fails
    const before = parts.slice(0, 3 + 4).join('\r') + '\r'
    const after = '\r' + parts.slice(3 + 5).join('\r')
    const joseRow =
      '4,Jos' + String.fromCharCode(0xe9) + ',Garc' + String.fromCharCode(0xed) + 'a,Jos' +
      String.fromCharCode(0xe9) + ' Garc' + String.fromCharCode(0xed) +
      'a,jose4@test.com,,cash,unpaid,'
    const fullLatin1 = before + joseRow + after
    const buf = Uint8Array.from([...fullLatin1].map((c) => c.charCodeAt(0) & 0xff))
    const decoded = decodeCsvBytes(buf.buffer)
    expect(decoded).toContain('José')
    const { rows, errors } = parseBackupCsv(decoded)
    expect(errors).toEqual([])
    expectHundred(rows)
    expect(rows.find((r) => r.position === 4)?.first_name).toBe('José')
  })

  it('4. Excel CSV UTF-8 (BOM + LF)', () => {
    const raw = buildHundred('\n')
    const enc = new TextEncoder().encode(raw)
    const buf = new Uint8Array(3 + enc.length)
    buf.set([0xef, 0xbb, 0xbf], 0)
    buf.set(enc, 3)
    const { rows, errors } = parseBackupCsv(decodeCsvBytes(buf.buffer))
    expect(errors).toEqual([])
    expectHundred(rows)
  })

  it('5. semicolon-delimited', () => {
    const settings = ['# SETTINGS', '# SQUARES']
    const header = HEADER.replace(/,/g, ';')
    const rowsLines: string[] = [...settings, header]
    for (let pos = 0; pos < 100; pos++) {
      const email = pos % 2 === 0 ? `user${pos}@test.com` : ''
      const first = email ? `First${pos}` : ''
      const last = email ? `Last${pos}` : ''
      rowsLines.push(
        [pos, first, last, first && last ? `${first} ${last}` : '', email, '', email ? 'cash' : '', 'unpaid', ''].join(
          ';'
        )
      )
    }
    const { rows, errors } = parseBackupCsv(rowsLines.join('\n'))
    expect(errors).toEqual([])
    expectHundred(rows)
  })

  it('6. UTF-16 LE tab-separated', () => {
    const settings = ['# SETTINGS', '# SQUARES']
    const header = HEADER.replace(/,/g, '\t')
    const rowsLines: string[] = [...settings, header]
    for (let pos = 0; pos < 100; pos++) {
      const email = pos % 2 === 0 ? `user${pos}@test.com` : ''
      const first = email ? `First${pos}` : ''
      const last = email ? `Last${pos}` : ''
      rowsLines.push(
        [pos, first, last, first && last ? `${first} ${last}` : '', email, '', email ? 'venmo' : '', 'unpaid', ''].join(
          '\t'
        )
      )
    }
    const text = rowsLines.join('\n')
    // UTF-16LE with BOM
    const utf16 = new Uint8Array(2 + text.length * 2)
    utf16[0] = 0xff
    utf16[1] = 0xfe
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)
      utf16[2 + i * 2] = code & 0xff
      utf16[2 + i * 2 + 1] = code >> 8
    }
    const decoded = decodeCsvBytes(utf16.buffer)
    const { rows, errors } = parseBackupCsv(decoded)
    expect(errors).toEqual([])
    expectHundred(rows)
  })

  it('7. blank trailing rows and columns', () => {
    let text = buildHundred('\n')
    text += '\n,,,,,\n,,,,,,,\n\n'
    const { rows, errors } = parseBackupCsv(text)
    expect(errors).toEqual([])
    expectHundred(rows)
    // Must not invent position 0 from blanks as a duplicate
    expect(rows.filter((r) => r.position === 0)).toHaveLength(1)
  })

  it('8. 33.0 positions plus sci-notation phones', () => {
    const settings = ['# SETTINGS', '# SQUARES']
    const header = HEADER
    const rowsLines: string[] = [...settings, header]
    for (let pos = 0; pos < 100; pos++) {
      const email = pos % 2 === 0 ? `user${pos}@test.com` : ''
      const first = email ? `First${pos}` : ''
      const last = email ? `Last${pos}` : ''
      const phone = pos === 6 ? '1.55512E+10' : pos === 8 ? '1.55E+10' : ''
      rowsLines.push(
        [
          `${pos}.0`,
          first,
          last,
          first && last ? `${first} ${last}` : '',
          email,
          phone,
          email ? 'cash' : '',
          'unpaid',
          '',
        ].join(',')
      )
    }
    const { rows, errors, warnings } = parseBackupCsv(rowsLines.join('\n'))
    expect(errors).toEqual([])
    expectHundred(rows)
    expect(warnings.length).toBeGreaterThanOrEqual(2)
    expect(rows.find((r) => r.position === 6)?.phone).toBeUndefined()
    expect(rows.find((r) => r.position === 8)?.phone).toBeUndefined()
    expect(warnings.some((w) => /scientific-notation phone/i.test(w))).toBe(true)
  })

  it('9b. square_number display column is ignored (position stays 0–99)', () => {
    const header =
      'position,square_number,first_name,last_name,full_name,email,phone,payment_method,payment_status,claimed_at'
    const lines = ['# SQUARES', header]
    for (let pos = 0; pos < 100; pos++) {
      const email = pos % 2 === 0 ? `user${pos}@test.com` : ''
      const first = email ? `First${pos}` : ''
      const last = email ? `Last${pos}` : ''
      // Deliberately wrong display number — must not affect restore position
      lines.push(
        [
          String(pos),
          String(pos + 99),
          first,
          last,
          first && last ? `${first} ${last}` : '',
          email,
          '',
          email ? 'cash' : '',
          'unpaid',
          '',
        ].join(',')
      )
    }
    const { rows, errors } = parseBackupCsv(lines.join('\n'))
    expect(errors).toEqual([])
    expectHundred(rows)
    expect(rows.find((r) => r.position === 0)?.email).toBe('user0@test.com')
    expect(rows.find((r) => r.position === 99)).toBeDefined()
  })

  it('9. literal leading apostrophe (csvSafe formula guard)', () => {
    const settings = ['# SETTINGS', '# SQUARES']
    const header = HEADER
    const rowsLines: string[] = [...settings, header]
    for (let pos = 0; pos < 100; pos++) {
      const email = pos % 2 === 0 ? `user${pos}@test.com` : ''
      // Formula-looking first name gets csvSafe leading apostrophe
      const first = email ? (pos === 10 ? "'=HACK" : `First${pos}`) : ''
      const last = email ? `Last${pos}` : ''
      const phone = pos === 12 ? "'+15559876543" : ''
      rowsLines.push(
        [
          csvSafe(pos),
          csvSafe(first),
          csvSafe(last),
          csvSafe(first && last ? `${stripCsvFormulaGuard(first)} ${last}` : ''),
          csvSafe(email),
          csvSafe(phone),
          csvSafe(email ? 'cash' : ''),
          csvSafe('unpaid'),
          csvSafe(''),
        ].join(',')
      )
    }
    const { rows, errors } = parseBackupCsv(rowsLines.join('\n'))
    expect(errors).toEqual([])
    expectHundred(rows)
    expect(rows.find((r) => r.position === 10)?.first_name).toBe('=HACK')
    expect(rows.find((r) => r.position === 12)?.phone).toBe('+15559876543')
  })
})
