import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'

import { env } from '../config/env.js'
import { supabaseAdmin } from '../config/supabase.js'

type DemoJwtPayload = jwt.JwtPayload & {
  demo?: boolean
  email?: string
  name?: string | null
  user_metadata?: {
    full_name?: string | null
    name?: string | null
    demo?: boolean
    [key: string]: unknown
  }
}

type AuthError = {
  error: 'Unauthorized'
  message: string
}

const unauthorized = (res: Parameters<RequestHandler>[1], message: string) => {
  res.status(401).json({
    error: 'Unauthorized',
    message,
  } satisfies AuthError)
}

export const authenticate: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization ?? ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    unauthorized(res, 'Missing or invalid Authorization header.')
    return
  }

  const token = match[1]?.trim()

  if (!token) {
    unauthorized(res, 'Missing access token.')
    return
  }

  if (!supabaseAdmin) {
    const error = new Error('Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY.')
    error.name = 'ConfigurationError'
    ;(error as { status?: number }).status = 500
    next(error)
    return
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (!error && data?.user) {
      req.auth = {
        token,
        user: data.user,
        userId: data.user.id,
        sessionType: 'supabase',
        isDemo: false,
      }

      next()
      return
    }

    if (!env.SUPABASE_JWT_SECRET) {
      console.warn('[authenticate] Supabase JWT secret not configured; rejecting non-Supabase tokens.')
      unauthorized(res, 'Invalid or expired access token.')
      return
    }

    const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET) as DemoJwtPayload | string

    if (typeof decoded === 'string' || !decoded || decoded.demo !== true || decoded.sub !== env.DEMO_USER_ID) {
      unauthorized(res, 'Invalid or expired access token.')
      return
    }

    // Validate issuer to ensure token came from this Supabase project
    const expectedIssuer = `${env.SUPABASE_URL}/auth/v1`
    if (typeof decoded === 'object' && decoded.iss !== expectedIssuer) {
      unauthorized(res, 'Invalid token issuer.')
      return
    }

    req.auth = {
      token,
      userId: decoded.sub,
      sessionType: 'demo',
      isDemo: true,
      user: {
        id: decoded.sub,
        email: decoded.email ?? env.DEMO_USER_EMAIL,
        name: decoded.name ?? decoded.user_metadata?.full_name ?? decoded.user_metadata?.name ?? env.DEMO_USER_NAME,
      },
    }

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      unauthorized(res, 'Invalid or expired access token.')
      return
    }

    next(error)
  }
}

