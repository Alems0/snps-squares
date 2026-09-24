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
  created_at: string
  updated_at: string
}

export interface Square {
  id: string
  game_id: string
  position: number
  claimed_by_name?: string
  claimed_by_email?: string
  claimed_at?: string
  payment_status: 'unpaid' | 'paid' | 'released'
  payment_method?: 'venmo' | 'cash'
  paid_at?: string
}

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
