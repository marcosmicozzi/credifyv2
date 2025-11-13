import type { Request, Response, NextFunction } from 'express'

import { env } from '../config/env.js'

type HttpError = Error & {
  status?: number
  statusCode?: number
  expose?: boolean
  details?: unknown
}

/**
 * Determines if an error message is safe to expose to clients.
 * In production, only expose specific error types that are safe.
 */
function isSafeToExpose(error: HttpError): boolean {
  // In development, expose more details for debugging
  if (env.NODE_ENV === 'development') {
    return true
  }

  // In production, only expose errors that are explicitly marked as safe
  if (error.expose === true) {
    return true
  }

  // Safe error types that can be exposed
  const safeErrorNames = [
    'ValidationError',
    'Unauthorized',
    'NotFound',
    'TooManyRequests',
    'UserProvisioningError',
    'DemoAuthError',
    'DemoUserMismatchError',
  ]

  if (error.name && safeErrorNames.includes(error.name)) {
    return true
  }

  // Status codes that are safe to expose
  const safeStatusCodes = [400, 401, 403, 404, 409, 429]
  const status = error.status ?? error.statusCode ?? 500
  if (safeStatusCodes.includes(status)) {
    return true
  }

  return false
}

/**
 * Sanitizes error messages to prevent leaking internal details.
 */
function sanitizeMessage(error: HttpError, isSafe: boolean): string {
  if (isSafe) {
    return error.message || 'An error occurred'
  }

  // Generic messages for unsafe errors
  const status = error.status ?? error.statusCode ?? 500
  if (status >= 500) {
    return 'An internal server error occurred. Please try again later.'
  }

  return 'An error occurred while processing your request.'
}

export function errorHandler(err: HttpError, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err)
    return
  }

  const status = err.status ?? err.statusCode ?? 500
  const isSafe = isSafeToExpose(err)
  const message = sanitizeMessage(err, isSafe)

  // Always log full error details on server
  if (env.NODE_ENV !== 'test') {
    console.error('[ErrorHandler]', {
      name: err.name,
      message: err.message,
      status,
      stack: err.stack,
      details: err.details,
      cause: (err as { cause?: unknown }).cause,
    })
  }

  res.status(status).json({
    error: err.name || 'Error',
    message,
    // Only include details if error is safe to expose
    details: isSafe && err.details ? err.details : undefined,
  })
}

