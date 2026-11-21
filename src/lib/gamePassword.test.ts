import { describe, expect, it } from 'vitest'
import {
  evaluateGamePassword,
  gamePasswordValidationError,
  isGamePasswordValid,
} from './gamePassword'

describe('game password complexity', () => {
  it('accepts a password meeting all rules', () => {
    expect(isGamePasswordValid('Ab1!xy')).toBe(true)
    expect(gamePasswordValidationError('Ab1!xy')).toBeNull()
    expect(evaluateGamePassword('Ab1!xy')).toEqual({
      length: true,
      upper: true,
      number: true,
      special: true,
    })
  })

  it('fails when shorter than 6 characters', () => {
    expect(isGamePasswordValid('Ab1!x')).toBe(false)
    expect(gamePasswordValidationError('Ab1!x')).toMatch(/6 characters/i)
    expect(evaluateGamePassword('Ab1!x').length).toBe(false)
  })

  it('fails without an uppercase letter', () => {
    expect(isGamePasswordValid('secret1!')).toBe(false)
    expect(gamePasswordValidationError('secret1!')).toMatch(/uppercase/i)
    expect(evaluateGamePassword('secret1!').upper).toBe(false)
  })

  it('fails without a number', () => {
    expect(isGamePasswordValid('Secret!')).toBe(false)
    expect(gamePasswordValidationError('Secret!')).toMatch(/number/i)
    expect(evaluateGamePassword('Secret!').number).toBe(false)
  })

  it('fails without a special character', () => {
    expect(isGamePasswordValid('Secret1')).toBe(false)
    expect(gamePasswordValidationError('Secret1')).toMatch(/special/i)
    expect(evaluateGamePassword('Secret1').special).toBe(false)
  })

  it('blank returns null error (leave existing unchanged)', () => {
    expect(gamePasswordValidationError('')).toBeNull()
  })
})
