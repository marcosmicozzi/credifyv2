import type { RequestHandler } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { env } from '../config/env.js'
import { supabaseAdmin, supabasePublic } from '../config/supabase.js'

const emailSchema = z.object({
  email: z.string().email(),
})

const ensureSupabasePublic = () => {
  if (!supabasePublic) {
    const error = new Error('Supabase public client is not configured. Check SUPABASE_ANON_KEY.')
    error.name = 'ConfigurationError'
    ;(error as { status?: number }).status = 500
    throw error
  }
  return supabasePublic
}

const requestMagicLink: RequestHandler = async (req, res, next) => {
  try {
    const { email } = emailSchema.parse(req.body)
    const supabase = ensureSupabasePublic()

    const emailRedirectTo =
      env.SUPABASE_EMAIL_REDIRECT_URL ?? `${req.protocol}://${req.get('host') ?? 'localhost'}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
      },
    })

    if (error) {
      return res.status(error.status ?? 400).json({
        error: 'SupabaseAuthError',
        message: error.message,
      })
    }

    res.status(200).json({
      status: 'OK',
      message: 'Magic link sent if the email address is registered.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Please provide a valid email address.',
        details: error.flatten().fieldErrors,
      })
      return
    }

    if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
      res.status(error.status).json({
        error: error.name,
        message: error.message,
      })
      return
    }

    next(error)
  }
}

export const authRouter = Router()

authRouter.post('/email', requestMagicLink)

// Google OAuth is now handled directly by the frontend using supabaseClient.auth.signInWithOAuth()
// This ensures PKCE verifier/state is properly managed in the browser where the OAuth flow originates.
// The backend endpoint was removed to prevent PKCE verifier mismatch errors.

const DEMO_USER_EMAIL = 'demo@credify.ai'
const DEMO_USER_NAME = 'Credify Demo User'

authRouter.post('/demo', async (_req, res, next) => {
  try {
    if (!supabaseAdmin) {
      const error = new Error('Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY.')
      error.name = 'ConfigurationError'
      ;(error as { status?: number }).status = 500
      throw error
    }

    const existingResult = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('u_email', DEMO_USER_EMAIL)
      .limit(1)
      .maybeSingle()

    if (existingResult.error) {
      throw existingResult.error
    }

    let userRecord = existingResult.data

    if (!userRecord) {
      const insertResult = await supabaseAdmin
        .from('users')
        .insert({
          u_email: DEMO_USER_EMAIL,
          u_name: DEMO_USER_NAME,
        })
        .select('*')
        .single()

      if (insertResult.error) {
        throw insertResult.error
      }

      userRecord = insertResult.data ?? null
    }

    if (!userRecord) {
      const error = new Error('Failed to prepare demo user.')
      error.name = 'DemoAuthError'
      ;(error as { status?: number }).status = 500
      throw error
    }

    res.status(200).json({
      mode: 'demo',
      user: {
        id: userRecord.u_id,
        email: userRecord.u_email,
        name: userRecord.u_name ?? DEMO_USER_NAME,
      },
      session: {
        id: `demo-${userRecord.u_id}`,
        type: 'demo',
        issuedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
})

