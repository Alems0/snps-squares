import { createContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { checkIsAdmin } from './auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  /** True when the signed-in user is in public.admins (via is_admin RPC), or mock admin. */
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
})

interface AuthProviderProps {
  children: ReactNode
}

const MOCK_ADMIN_EMAIL = 'admin@example.com'

function isMockAdminRequested(): boolean {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return false
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('mock_admin') === '1' || sessionStorage.getItem('mock_admin') === '1'
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false

    const applyAdminCheck = async (nextUser: User | null) => {
      if (!nextUser) {
        if (!cancelled) {
          setIsAdmin(false)
          setLoading(false)
        }
        return
      }
      const admin = await checkIsAdmin()
      if (!cancelled) {
        setIsAdmin(admin)
        setLoading(false)
      }
    }

    // Playwright / local mock: treat as signed-in admin without hitting Supabase Auth
    if (isMockAdminRequested()) {
      setUser({
        id: 'mock-admin',
        email: MOCK_ADMIN_EMAIL,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User)
      setIsAdmin(true)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      const next = session?.user ?? null
      setUser(next)
      void applyAdminCheck(next)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null
      setUser(next)
      setLoading(true)
      void applyAdminCheck(next)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

// Export hook separately to satisfy fast-refresh
export { AuthContext }
