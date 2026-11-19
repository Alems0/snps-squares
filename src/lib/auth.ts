import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

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
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

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
 * Server-side admin check via SECURITY DEFINER is_admin()
 * (compares auth JWT email to public.admins). No client-side email allowlist.
 */
export async function checkIsAdmin(): Promise<boolean> {
  // Playwright / local mock: never call Supabase
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('mock_admin') === '1' || sessionStorage.getItem('mock_admin') === '1') {
        return true
      }
    }
    return false
  }

  const { data, error } = await supabase.rpc('is_admin')
  if (error) {
    console.warn('is_admin RPC failed:', error.message)
    return false
  }
  return Boolean(data)
}
