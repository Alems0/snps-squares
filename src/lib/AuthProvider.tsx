import { createContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Playwright / local mock: treat as signed-in admin without hitting Supabase Auth
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      const params = new URLSearchParams(window.location.search)
      const mockAdmin =
        params.get('mock_admin') === '1' || sessionStorage.getItem('mock_admin') === '1'
      if (mockAdmin) {
        const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'stecher2789@gmail.com').toLowerCase()
        setUser({
          id: 'mock-admin',
          email: adminEmail,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User)
        setLoading(false)
        return
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// Export hook separately to satisfy fast-refresh
export { AuthContext }
