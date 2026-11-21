/** Shared mock game axis state (sessionStorage) for admin + public board under VITE_USE_MOCK. */

const MOCK_AFC_KEY = 'mock_afc_numbers'
const MOCK_NFC_KEY = 'mock_nfc_numbers'
const MOCK_LOCKED_KEY = 'mock_numbers_locked'

export const MOCK_BLANK_AXIS = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1] as const
export const MOCK_SEEDED_AFC = [3, 7, 0, 6, 1, 4, 9, 2, 8, 5] as const
export const MOCK_SEEDED_NFC = [2, 5, 8, 1, 9, 3, 6, 0, 7, 4] as const

export interface MockGameAxis {
  afc_numbers: number[]
  nfc_numbers: number[]
  numbers_locked: boolean
}

function parseAxis(raw: string | null, fallback: readonly number[]): number[] {
  if (!raw) return [...fallback]
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      Array.isArray(parsed) &&
      parsed.length === 10 &&
      parsed.every((n) => typeof n === 'number')
    ) {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return [...fallback]
}

/** Defaults match AdminPanel / Board seeded mock when nothing has been written yet. */
export function mockGetGameAxis(): MockGameAxis {
  const hasStored =
    sessionStorage.getItem(MOCK_AFC_KEY) != null ||
    sessionStorage.getItem(MOCK_NFC_KEY) != null ||
    sessionStorage.getItem(MOCK_LOCKED_KEY) != null

  if (!hasStored) {
    return {
      afc_numbers: [...MOCK_SEEDED_AFC],
      nfc_numbers: [...MOCK_SEEDED_NFC],
      numbers_locked: false,
    }
  }

  return {
    afc_numbers: parseAxis(sessionStorage.getItem(MOCK_AFC_KEY), MOCK_SEEDED_AFC),
    nfc_numbers: parseAxis(sessionStorage.getItem(MOCK_NFC_KEY), MOCK_SEEDED_NFC),
    numbers_locked: sessionStorage.getItem(MOCK_LOCKED_KEY) === '1',
  }
}

export function mockSetGameAxis(axis: MockGameAxis): void {
  sessionStorage.setItem(MOCK_AFC_KEY, JSON.stringify(axis.afc_numbers))
  sessionStorage.setItem(MOCK_NFC_KEY, JSON.stringify(axis.nfc_numbers))
  sessionStorage.setItem(MOCK_LOCKED_KEY, axis.numbers_locked ? '1' : '0')
}

/** Same outcome as admin_reset_board axis wipe + unlock. */
export function mockResetAxisNumbers(): MockGameAxis {
  const next: MockGameAxis = {
    afc_numbers: [...MOCK_BLANK_AXIS],
    nfc_numbers: [...MOCK_BLANK_AXIS],
    numbers_locked: false,
  }
  mockSetGameAxis(next)
  return next
}

export function mockClearGameAxisStorage(): void {
  sessionStorage.removeItem(MOCK_AFC_KEY)
  sessionStorage.removeItem(MOCK_NFC_KEY)
  sessionStorage.removeItem(MOCK_LOCKED_KEY)
}
