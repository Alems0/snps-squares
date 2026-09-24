// import { supabase } from './supabase'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'stecher2789@gmail.com'

/**
 * Sign in admin with email and password
 * Phase 1: Stub implementation - will use Supabase Auth in production
 */
export async function signInAdmin(email: string) {
  // TODO: Replace with real Supabase auth
  // const { data, error } = await supabase.auth.signInWithPassword({
  //   email,
  //   password,
  // })
  
  // Phase 1 stub: Check against allowlist
  if (email !== ADMIN_EMAIL) {
    throw new Error('Unauthorized: Email not in admin allowlist')
  }
  
  // In production, this will be handled by Supabase Auth
  return {
    user: { email },
    session: null,
  }
}

/**
 * Sign out current admin
 */
export async function signOutAdmin() {
  // TODO: Replace with real Supabase auth
  // const { error } = await supabase.auth.signOut()
  return { error: null }
}

/**
 * Get current admin session
 */
export async function getCurrentAdmin(): Promise<{ user?: { email: string } } | null> {
  // TODO: Replace with real Supabase auth
  // const { data: { session } } = await supabase.auth.getSession()
  // return session
  return null
}

/**
 * Check if current user is admin (by checking against allowlist)
 */
export async function isAdmin(email?: string): Promise<boolean> {
  if (!email) {
    const session = await getCurrentAdmin()
    email = session?.user?.email
  }
  
  if (!email) return false
  
  // TODO: In production, check against admins table in Supabase
  // const { data, error } = await supabase
  //   .from('admins')
  //   .select('id')
  //   .eq('email', email)
  //   .single()
  // return !!data && !error
  
  return email === ADMIN_EMAIL
}
