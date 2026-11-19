import { describe, expect, it } from 'vitest'
import {
  displaySquareNumber,
  formatSquareLabel,
  parseDisplaySquareNumber,
} from './displaySquareNumber'

describe('displaySquareNumber', () => {
  it('maps 0–99 storage positions to 1–100 display numbers', () => {
    expect(displaySquareNumber(0)).toBe(1)
    expect(displaySquareNumber(4)).toBe(5)
    expect(displaySquareNumber(99)).toBe(100)
  })

  it('formatSquareLabel uses #N display form', () => {
    expect(formatSquareLabel(0)).toBe('#1')
    expect(formatSquareLabel(99)).toBe('#100')
  })

  it('parseDisplaySquareNumber converts 1–100 back to 0–99', () => {
    expect(parseDisplaySquareNumber(1)).toBe(0)
    expect(parseDisplaySquareNumber(5)).toBe(4)
    expect(parseDisplaySquareNumber(100)).toBe(99)
  })

  it('parseDisplaySquareNumber rejects out-of-range values', () => {
    expect(parseDisplaySquareNumber(0)).toBeNull()
    expect(parseDisplaySquareNumber(101)).toBeNull()
    expect(parseDisplaySquareNumber(1.5)).toBeNull()
    expect(parseDisplaySquareNumber(NaN)).toBeNull()
  })
})
