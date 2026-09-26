import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'stecher2789@gmail.com').toLowerCase()

/**
 * Sign in admin with Google OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/admin`,
    },
  })
  
  if (error) {
    throw error
  }
  
  return data
}

/**
 * Sign out current admin
 */
export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.warn('Sign out error (continuing anyway):', error)
  }
}

/**
 * Get current admin session
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    throw error
  }
  
  return session
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession()
  return session?.user || null
}

/**
 * Check if current user is admin (by checking against allowlist)
 */
export async function isAdmin(email?: string): Promise<boolean> {
  if (!email) {
    const user = await getCurrentUser()
    email = user?.email
  }
  
  if (!email) return false
  
  return email.toLowerCase() === ADMIN_EMAIL
}

/**
 * Check if user email is allowed admin (case-insensitive)
 */
export function isAllowedAdmin(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL
}
