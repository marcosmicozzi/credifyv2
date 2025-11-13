import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { apiBaseUrl } from '../../lib/env'
import { supabaseClient } from '../../lib/supabaseClient'
import { useAuth } from '../../providers/AuthProvider'

type RequestState = 'idle' | 'loading' | 'success' | 'error'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<RequestState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [googleStatus, setGoogleStatus] = useState<RequestState>('idle')
  const [googleMessage, setGoogleMessage] = useState<string | null>(null)
  const [demoStatus, setDemoStatus] = useState<RequestState>('idle')
  const [demoMessage, setDemoMessage] = useState<string | null>(null)

  const { status: authStatus, signInWithDemo } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state as { redirect?: string } | null) ?? null
  const redirectPath =
    locationState?.redirect && typeof locationState.redirect === 'string' ? locationState.redirect : '/'

  useEffect(() => {
    if (authStatus === 'authenticated') {
      navigate(redirectPath, { replace: true })
    }
  }, [authStatus, navigate, redirectPath])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email) {
      setMessage('Please enter a valid email address.')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setMessage(null)

      const response = await fetch(`${apiBaseUrl}/api/auth/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMessage = (data as { message?: string }).message ?? 'Failed to send magic link.'
        throw new Error(errorMessage)
      }

      setStatus('success')
      setMessage(`Check ${email} for your sign-in link.`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unexpected error while sending magic link.')
      setStatus('error')
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setGoogleStatus('loading')
      setGoogleMessage(null)

      // Generate a random state parameter for CSRF protection
      const state = crypto.randomUUID()
      const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`

      // Store state in sessionStorage for verification in callback
      sessionStorage.setItem('oauth_state', state)

      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'openid email profile',
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data?.url) {
        throw new Error('Google sign-in URL was not provided.')
      }

      setGoogleStatus('success')
      // Redirect to Google OAuth
      window.location.href = data.url
    } catch (error) {
      setGoogleStatus('error')
      setGoogleMessage(
        error instanceof Error ? error.message : 'Unexpected error while preparing Google sign-in.',
      )
      // Clean up state on error
      sessionStorage.removeItem('oauth_state')
    }
  }

  const handleDemoSignIn = async () => {
    try {
      setDemoStatus('loading')
      setDemoMessage(null)

      await signInWithDemo()

      setDemoStatus('success')
      setDemoMessage('Signed in with demo account. Redirecting…')
    } catch (error) {
      setDemoStatus('error')
      setDemoMessage(error instanceof Error ? error.message : 'Unexpected error while activating demo mode.')
    }
  }

  useEffect(() => {
    if (demoStatus === 'success' && typeof window !== 'undefined') {
      const timeout = window.setTimeout(() => {
        navigate(redirectPath, { replace: true })
      }, 600)

      return () => {
        window.clearTimeout(timeout)
      }
    }
    return undefined
  }, [demoStatus, navigate, redirectPath])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-16 text-slate-100">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-center shadow-[0_30px_120px_-60px_rgba(15,23,42,0.9)]">
        <span className="text-xs uppercase tracking-[0.35em] text-slate-500">Welcome back</span>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Access CredifyV2</h1>
        <p className="text-sm text-slate-400">
          Sign in with your verified creator email. A Supabase magic link will land in your inbox.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600/60"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:bg-slate-400/20 disabled:text-slate-500"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Sending…' : 'Send Magic Link'}
          </button>
        </form>
        {message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              status === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            {message}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <div className="relative flex items-center justify-center">
            <span className="absolute left-0 right-0 h-px bg-slate-800" />
            <span className="relative bg-slate-900/50 px-3 text-xs uppercase tracking-[0.3em] text-slate-500">
              or
            </span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="inline-flex items-center justify-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-slate-600/60 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={googleStatus === 'loading'}
          >
            {googleStatus === 'loading' ? 'Redirecting…' : 'Continue with Google'}
          </button>
          {googleMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {googleMessage}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 text-left">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Demo Mode</h2>
              <p className="mt-1 text-xs text-slate-400">
                Use a temporary workspace account while Google OAuth is being reconfigured.
              </p>
            </div>
            <span className="rounded-full border border-slate-700/60 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
              temporary
            </span>
          </div>
          <button
            type="button"
            onClick={handleDemoSignIn}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:bg-emerald-500/40 disabled:text-emerald-900/80"
            disabled={demoStatus === 'loading' || authStatus === 'loading'}
          >
            {demoStatus === 'loading' ? 'Entering Demo Mode…' : 'Continue in Demo Mode'}
          </button>
          <p className="text-xs text-slate-500">
            Demo sessions are stored locally and include a sample creator profile for navigation tests.
          </p>
          {demoMessage && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                demoStatus === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              }`}
            >
              {demoMessage}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 text-xs text-slate-500">
          <span>Instagram OAuth refresh will also live here.</span>
          <span>Legacy flows are retired as CredifyV2 becomes the source of truth.</span>
        </div>
      </section>
    </div>
  )
}

export default LoginPage

