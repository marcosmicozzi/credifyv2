import { Router } from 'express'
import jwt from 'jsonwebtoken'

import { env } from '../config/env.js'
import { supabaseAdmin } from '../config/supabase.js'
import { authenticate } from '../middleware/authenticate.js'
import { demoAuthRateLimiter, userProvisioningRateLimiter } from '../middleware/rateLimit.js'
import { provisionUser } from '../services/userProvisioning.js'

export const authRouter = Router()

const DEMO_USER_EMAIL = env.DEMO_USER_EMAIL
const DEMO_USER_NAME = env.DEMO_USER_NAME
const DEMO_USER_ID = env.DEMO_USER_ID
const DEMO_TOKEN_TTL_SECONDS = 60 * 60 * 6 // 6 hours

authRouter.post('/demo', demoAuthRateLimiter, async (_req, res, next) => {
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
          u_id: DEMO_USER_ID,
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

    if (userRecord.u_id !== DEMO_USER_ID) {
      const error = new Error(
        `Configured demo user id (${DEMO_USER_ID}) does not match database record (${userRecord.u_id}).`,
      )
      error.name = 'DemoUserMismatchError'
      ;(error as { status?: number }).status = 500
      throw error
    }

    const issuedAtSeconds = Math.floor(Date.now() / 1000)
    const expiresAtSeconds = issuedAtSeconds + DEMO_TOKEN_TTL_SECONDS

    const accessToken = jwt.sign(
      {
        aud: 'authenticated',
        exp: expiresAtSeconds,
        sub: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        role: 'authenticated',
        name: userRecord.u_name ?? DEMO_USER_NAME,
        app_metadata: {
          provider: 'credify_demo',
          providers: ['credify_demo'],
        },
        user_metadata: {
          full_name: userRecord.u_name ?? DEMO_USER_NAME,
          name: userRecord.u_name ?? DEMO_USER_NAME,
          demo: true,
        },
        demo: true,
        iss: `${env.SUPABASE_URL}/auth/v1`,
        iat: issuedAtSeconds,
        nbf: issuedAtSeconds,
      },
      env.SUPABASE_JWT_SECRET,
      {
        algorithm: 'HS256',
      },
    )

    res.status(200).json({
      mode: 'demo',
      user: {
        id: DEMO_USER_ID,
        email: userRecord.u_email,
        name: userRecord.u_name ?? DEMO_USER_NAME,
      },
      session: {
        id: `demo-${DEMO_USER_ID}`,
        type: 'demo',
        issuedAt: new Date(issuedAtSeconds * 1000).toISOString(),
        expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
        accessToken,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/auth/provision
 * Ensures a user record exists in public.users for the authenticated user.
 * This endpoint is idempotent and should be called after successful OAuth sign-in.
 */
authRouter.post('/provision', userProvisioningRateLimiter, authenticate, async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    // Only provision for real Supabase users, not demo users
    if (req.auth.isDemo || req.auth.sessionType !== 'supabase') {
      res.status(400).json({
        error: 'InvalidRequest',
        message: 'User provisioning is only available for authenticated Supabase users.',
      })
      return
    }

    const user = await provisionUser(req.auth.user)

    res.status(200).json({
      user: {
        id: user.u_id,
        email: user.u_email,
        name: user.u_name,
        createdAt: user.u_created_at,
      },
    })
  } catch (error) {
    next(error)
  }
})

