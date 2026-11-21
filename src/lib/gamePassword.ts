/** Admin Game Password — separate from the player Join Password. */

export const GAME_PASSWORD_HELPER =
  'Required to Reset Board, Clear Numbers, or Upload a Game Backup. Separate from the Join Password players use. Must be 6+ characters with a capital letter, a number, and a special character.'

export const GAME_PASSWORD_UNSET_MESSAGE =
  'Set a Game Password in Configure Game before Reset Board, Clear Numbers, or Upload a Game Backup.'

export const GAME_PASSWORD_WRONG_MESSAGE = 'Incorrect game password'

export type GamePasswordRuleId = 'length' | 'upper' | 'number' | 'special'

export interface GamePasswordRule {
  id: GamePasswordRuleId
  label: string
  test: (password: string) => boolean
}

export const GAME_PASSWORD_RULES: GamePasswordRule[] = [
  {
    id: 'length',
    label: 'At least 6 characters',
    test: (p) => p.length >= 6,
  },
  {
    id: 'upper',
    label: 'At least one uppercase letter',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'number',
    label: 'At least one number',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'At least one special character',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
]

export function evaluateGamePassword(password: string): Record<GamePasswordRuleId, boolean> {
  return {
    length: GAME_PASSWORD_RULES[0].test(password),
    upper: GAME_PASSWORD_RULES[1].test(password),
    number: GAME_PASSWORD_RULES[2].test(password),
    special: GAME_PASSWORD_RULES[3].test(password),
  }
}

export function isGamePasswordValid(password: string): boolean {
  return GAME_PASSWORD_RULES.every((rule) => rule.test(password))
}

/** First failing rule message, or null if valid / blank (blank = leave unchanged). */
export function gamePasswordValidationError(password: string): string | null {
  if (!password) return null
  for (const rule of GAME_PASSWORD_RULES) {
    if (!rule.test(password)) {
      switch (rule.id) {
        case 'length':
          return 'Game password must be at least 6 characters'
        case 'upper':
          return 'Game password must include at least one uppercase letter'
        case 'number':
          return 'Game password must include at least one number'
        case 'special':
          return 'Game password must include at least one special character'
      }
    }
  }
  return null
}

const MOCK_PASSWORD_KEY = 'mock_game_password'
const MOCK_SET_KEY = 'mock_game_password_set'

export function mockGamePasswordIsSet(): boolean {
  return sessionStorage.getItem(MOCK_SET_KEY) === '1'
}

export function mockSetGamePassword(password: string): void {
  sessionStorage.setItem(MOCK_PASSWORD_KEY, password)
  sessionStorage.setItem(MOCK_SET_KEY, '1')
}

export function mockClearGamePassword(): void {
  sessionStorage.removeItem(MOCK_PASSWORD_KEY)
  sessionStorage.removeItem(MOCK_SET_KEY)
}

export function mockVerifyGamePassword(password: string): void {
  if (!mockGamePasswordIsSet()) {
    throw new Error(GAME_PASSWORD_UNSET_MESSAGE)
  }
  const stored = sessionStorage.getItem(MOCK_PASSWORD_KEY) || ''
  if (!password || password !== stored) {
    throw new Error(GAME_PASSWORD_WRONG_MESSAGE)
  }
}
