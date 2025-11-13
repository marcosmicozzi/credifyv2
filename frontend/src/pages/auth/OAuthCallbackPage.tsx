import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { apiRequest } from '../../lib/apiClient'
import { supabaseClient } from '../../lib/supabaseClient'

type CallbackState = 'idle' | 'processing' | 'success' | 'error'

export function OAuthCallbackPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [state, setState] = useState<CallbackState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''))
    const errorDescription = searchParams.get('error_description')
    const code = searchParams.get('code')
    const stateParam = searchParams.get('state')
    const redirectParam = searchParams.get('redirect') ?? '/'
    const accessToken = hashParams.get('access_token')
    const refreshToken =
      hashParams.get('refresh_token') ?? hashParams.get('provider_refresh_token') ?? undefined

    const validateRedirect = (path: string): string => {
      try {
        if (path.startsWith('http://') || path.startsWith('https://')) {
          return '/'
        }
        return path.startsWith('/') ? path : '/'
      } catch {
        return '/'
      }
    }

    const redirect = validateRedirect(redirectParam)

    const removeStoredState = () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('oauth_state')
      }
    }

    if (stateParam && typeof window !== 'undefined') {
      const storedState = sessionStorage.getItem('oauth_state')
      if (storedState && storedState !== stateParam) {
        setState('error')
        setMessage('OAuth state mismatch. Please try signing in again.')
        removeStoredState()
        return
      }
      removeStoredState()
    }

    if (errorDescription) {
      setState('error')
      setMessage(errorDescription)
      removeStoredState()
      return
    }

    let isCancelled = false

    const completeSuccess = () => {
      if (isCancelled) {
        return
      }
      setState('success')
      setMessage('Authenticated successfully. Redirecting…')
      setTimeout(() => {
        navigate(redirect, { replace: true })
      }, 800)
    }

    const processAuth = async () => {
      try {
        setState('processing')

        let session = null

        if (code) {
          const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code)
          console.info('[OAuthCallback] exchangeCodeForSession result:', { data, error })

          if (error) {
            throw new Error(error.message)
          }

          session = data?.session ?? null
        } else if (accessToken) {
          if (!refreshToken) {
            throw new Error('Supabase callback is missing a refresh token.')
          }
          const { data, error } = await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          console.info('[OAuthCallback] setSession result:', { data, error, refreshToken })

          if (error) {
            throw new Error(error.message)
          }

          session = data?.session ?? null
        } else {
          const { data, error } = await supabaseClient.auth.getSession()
          if (error) {
            throw new Error(error.message)
          }
          session = data?.session ?? null
        }

        // Fallback: try to get session one more time
        if (!session) {
          const { data, error } = await supabaseClient.auth.getSession()
          if (error) {
            throw new Error(error.message)
          }
          session = data?.session ?? null
        }

        if (!session) {
          throw new Error('Supabase returned no session for the authorization response.')
        }

        // Provision user record in public.users after successful OAuth
        if (session.access_token) {
          try {
            await apiRequest<{ user: { id: string; email: string; name: string | null } }>(
              '/api/auth/provision',
              {
                method: 'POST',
                accessToken: session.access_token,
              },
            )
          } catch (error) {
            // Log but don't block authentication if provisioning fails
            console.warn('[OAuthCallback] Failed to provision user record:', error)
          }
        }

        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)

        removeStoredState()
        completeSuccess()
      } catch (error) {
        removeStoredState()
        if (!isCancelled) {
          setState('error')
          setMessage(error instanceof Error ? error.message : 'Failed to complete authentication.')
        }
      }
    }

    void processAuth()

    return () => {
      isCancelled = true
    }
  }, [location.hash, location.search, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-16 text-slate-100">
      <section className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-center shadow-[0_30px_120px_-60px_rgba(15,23,42,0.9)]">
        <span className="text-xs uppercase tracking-[0.35em] text-slate-500">Google Sign-In</span>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Completing authentication…</h1>
        <p className="text-sm text-slate-400">
          {state === 'processing'
            ? 'Exchanging credentials with Supabase.'
            : message ?? 'Preparing authentication status.'}
        </p>
        {state === 'error' && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {message}
          </div>
        )}
        {state === 'success' && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        )}
      </section>
    </div>
  )
}

export default OAuthCallbackPage

