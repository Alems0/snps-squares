import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_BLANK_AXIS,
  MOCK_SEEDED_AFC,
  MOCK_SEEDED_NFC,
  mockClearGameAxisStorage,
  mockGetGameAxis,
  mockResetAxisNumbers,
  mockSetGameAxis,
} from './mockGameAxis'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  })
})

afterEach(() => {
  mockClearGameAxisStorage()
  vi.unstubAllGlobals()
})

describe('mockGameAxis', () => {
  it('defaults to seeded unlocked numbers when unset', () => {
    expect(mockGetGameAxis()).toEqual({
      afc_numbers: [...MOCK_SEEDED_AFC],
      nfc_numbers: [...MOCK_SEEDED_NFC],
      numbers_locked: false,
    })
  })

  it('mockResetAxisNumbers blanks digits and unlocks', () => {
    mockSetGameAxis({
      afc_numbers: [...MOCK_SEEDED_AFC],
      nfc_numbers: [...MOCK_SEEDED_NFC],
      numbers_locked: true,
    })
    const next = mockResetAxisNumbers()
    expect(next.afc_numbers).toEqual([...MOCK_BLANK_AXIS])
    expect(next.nfc_numbers).toEqual([...MOCK_BLANK_AXIS])
    expect(next.numbers_locked).toBe(false)
    expect(mockGetGameAxis()).toEqual(next)
  })
})
