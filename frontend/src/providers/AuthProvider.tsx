import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

import { apiBaseUrl } from '../lib/env'
import { supabaseClient } from '../lib/supabaseClient'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthUser = {
  id: string
  email: string
  name?: string | null
  isDemo?: boolean
}

type AuthSession = {
  id: string
  type: 'supabase' | 'demo'
  issuedAt: string
  expiresAt?: string | null
}

type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  session: AuthSession | null
  signInWithDemo: () => Promise<void>
  signOut: () => Promise<void>
}

const DEMO_USER_STORAGE_KEY = 'credify-demo-user'
const DEMO_SESSION_STORAGE_KEY = 'credify-demo-session'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    let isMounted = true

    const restoreSupabaseSession = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession()

        if (error) {
          console.warn('[AuthProvider] Failed to restore Supabase session:', error.message)
        }

        if (!isMounted) {
          return
        }

        if (data?.session?.user) {
          const supabaseUser = data.session.user

          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email ?? '',
            name:
              (supabaseUser.user_metadata?.full_name as string | undefined) ??
              (supabaseUser.user_metadata?.name as string | undefined) ??
              supabaseUser.email,
            isDemo: false,
          })

          setSession({
            id: supabaseUser.id,
            type: 'supabase',
            issuedAt: data.session.created_at,
            expiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null,
          })

          clearDemoStorage()
          setStatus('authenticated')
          return
        }
      } catch (error) {
        console.warn('[AuthProvider] Unexpected error while restoring Supabase session:', error)
      }

      if (!isMounted) {
        return
      }

      const restoredDemoUser = readFromStorage<AuthUser>(DEMO_USER_STORAGE_KEY)
      const restoredDemoSession = readFromStorage<AuthSession>(DEMO_SESSION_STORAGE_KEY)

      if (restoredDemoUser && restoredDemoSession) {
        setUser({ ...restoredDemoUser, isDemo: true })
        setSession({ ...restoredDemoSession, type: 'demo' })
        setStatus('authenticated')
        return
      }

      setUser(null)
      setSession(null)
      setStatus('unauthenticated')
    }

    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, supabaseSession) => {
      if (!isMounted) {
        return
      }

      if (supabaseSession?.user) {
        setUser({
          id: supabaseSession.user.id,
          email: supabaseSession.user.email ?? '',
          name:
            (supabaseSession.user.user_metadata?.full_name as string | undefined) ??
            (supabaseSession.user.user_metadata?.name as string | undefined) ??
            supabaseSession.user.email,
          isDemo: false,
        })

        setSession({
          id: supabaseSession.access_token,
          type: 'supabase',
          issuedAt: supabaseSession.created_at,
          expiresAt: supabaseSession.expires_at
            ? new Date(supabaseSession.expires_at * 1000).toISOString()
            : null,
        })

        clearDemoStorage()
        setStatus('authenticated')
      } else {
        clearDemoStorage()
        setUser(null)
        setSession(null)
        setStatus('unauthenticated')
      }
    })

    restoreSupabaseSession()

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signInWithDemo = useCallback(async () => {
    setStatus('loading')

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        const message =
          (result as { message?: string; error?: string }).message ?? 'Unable to start demo session. Please retry.'
        throw new Error(message)
      }

      const payload = (await response.json()) as {
        user: { id: string; email: string; name?: string | null }
        session: { id: string; type?: string; issuedAt: string; expiresAt?: string | null }
      }

      const demoUser: AuthUser = {
        id: payload.user.id,
        email: payload.user.email,
        name: payload.user.name,
        isDemo: true,
      }

      const demoSession: AuthSession = {
        id: payload.session.id,
        type: 'demo',
        issuedAt: payload.session.issuedAt,
        expiresAt: payload.session.expiresAt ?? null,
      }

      setUser(demoUser)
      setSession(demoSession)
      setStatus('authenticated')

      writeToStorage(DEMO_USER_STORAGE_KEY, demoUser)
      writeToStorage(DEMO_SESSION_STORAGE_KEY, demoSession)
    } catch (error) {
      console.error('[AuthProvider] Demo sign-in failed:', error)
      setStatus('unauthenticated')
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabaseClient.auth.signOut()
    } catch (error) {
      console.warn('[AuthProvider] Supabase sign-out warning:', error)
    }

    clearDemoStorage()
    setUser(null)
    setSession(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      session,
      signInWithDemo,
      signOut,
    }),
    [session, signInWithDemo, signOut, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

function readFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch (error) {
    console.warn(`[AuthProvider] Failed to parse localStorage for key "${key}":`, error)
    return null
  }
}

function writeToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`[AuthProvider] Failed to persist localStorage for key "${key}":`, error)
  }
}

function clearDemoStorage() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(DEMO_USER_STORAGE_KEY)
  window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY)
}

