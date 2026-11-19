import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Phase 1: Lazy-create client to avoid crash when env vars are missing
// In Phase 2, this will be called only after credentials are configured
let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
    }
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return supabaseClient
}

// Export a proxy that creates the client on first use
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient]
  },
})

// Type definitions for database schema
export interface Game {
  id: string
  season: number
  afc_team: string
  nfc_team: string
  cost_per_square: number
  charity_percentage: number
  q1_payout: number
  q2_payout: number
  q3_payout: number
  final_payout: number
  venmo_handle: string
  join_password?: string
  numbers_locked: boolean
  afc_numbers: number[]
  nfc_numbers: number[]
  status: 'active' | 'completed' | 'archived'
  /** When false, only admins may claim. Default false. */
  public_claiming_open?: boolean
  created_at: string
  updated_at: string
}

export interface Square {
  id: string
  game_id: string
  position: number
  first_name?: string
  last_name?: string
  claimed_by_name?: string
  claimed_by_email?: string
  claimed_at?: string
  payment_status: 'unpaid' | 'paid' | 'released'
  payment_method?: 'venmo' | 'cash'
  paid_at?: string
  claim_order_id?: string | null
}

export interface ClaimOrder {
  id: string
  game_id: string
  claimed_by_email: string
  first_name: string
  last_name: string
  payment_method: 'venmo' | 'cash'
  square_count: number
  square_subtotal: number
  fee: number
  total: number
  created_at: string
}

/** Flat $2 Venmo fee per claim order (not per square). */
export const VENMO_ORDER_FEE = 2

export interface Admin {
  id: string
  email: string
  created_at: string
}

export interface Score {
  id: string
  game_id: string
  quarter: 'q1' | 'q2' | 'q3' | 'final'
  afc_score: number
  nfc_score: number
  source: 'manual' | 'api'
  created_at: string
}

export interface Player {
  id: string
  first_name: string
  last_name: string
  email: string
  /** E.164 phone; admin-only — never exposed to anon. */
  phone?: string | null
  source: 'csv' | 'manual' | 'claim'
  created_at: string
  updated_at: string
  last_claimed_at?: string | null
}

export interface PlayerNameSuggestion {
  id: string
  display_name: string
}

/** Columns safe for anon SELECT (excludes claimed_by_email). */
export const SQUARES_PUBLIC_COLUMNS =
  'id, game_id, position, first_name, last_name, claimed_by_name, claimed_at, payment_status, payment_method, paid_at'

/** Columns safe for anon SELECT (excludes join_password). */
export const GAMES_PUBLIC_COLUMNS =
  'id, season, afc_team, nfc_team, cost_per_square, charity_percentage, q1_payout, q2_payout, q3_payout, final_payout, venmo_handle, numbers_locked, afc_numbers, nfc_numbers, status, public_claiming_open, created_at, updated_at'

/** Max length for games.afc_team / games.nfc_team (admin-configured axis labels). */
export const TEAM_NAME_MAX_LEN = 40

/**
 * Board axis label: "NFC – Eagles" when a team name is set; plain "NFC"/"AFC" when blank
 * or when the stored value is just the conference name (schema defaults).
 */
export function formatAxisLabel(
  conference: 'NFC' | 'AFC',
  team: string | null | undefined
): string {
  const trimmed = (team ?? '').trim()
  if (!trimmed || trimmed.toUpperCase() === conference) return conference
  return `${conference} – ${trimmed}`
}

/** Escape CSV cell; neutralize formula injection (=, +, -, @). */
export function csvSafe(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value)
  const neutralized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return `"${neutralized.replace(/"/g, '""')}"`
}

export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

/** E.164-ish: + then 8–15 digits, first digit 1–9. */
export const PHONE_E164_REGEX = /^\+[1-9][0-9]{7,14}$/

/** Normalize user input to E.164 (+15551234567). Returns null if empty/invalid. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`
  return null
}

export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '—'
  const m = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`
  return phone
}

/** Build sms: deep link. Uses ?&body= for broader iOS/Android compatibility. */
export function buildSmsLink(phones: string[], body: string): string {
  const nums = phones.filter(Boolean).join(',')
  return `sms:${nums}?&body=${encodeURIComponent(body)}`
}
