import type { Request, Response, NextFunction } from 'express'
import express from 'express'

/**
 * Simple in-memory rate limiter for development.
 * For production, consider using express-rate-limit with Redis store.
 */
class SimpleRateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly windowMs: number
  private readonly maxRequests: number

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests

    // Clean up old entries every minute
    setInterval(() => {
      this.cleanup()
    }, 60_000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter((ts) => now - ts < this.windowMs)
      if (filtered.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, filtered)
      }
    }
  }

  check(identifier: string): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(identifier) ?? []
    const recent = timestamps.filter((ts) => now - ts < this.windowMs)

    if (recent.length >= this.maxRequests) {
      return false
    }

    recent.push(now)
    this.requests.set(identifier, recent)
    return true
  }

  getRemainingTime(identifier: string): number {
    const timestamps = this.requests.get(identifier) ?? []
    if (timestamps.length === 0) {
      return 0
    }

    const oldest = Math.min(...timestamps)
    const now = Date.now()
    const elapsed = now - oldest
    return Math.max(0, this.windowMs - elapsed)
  }
}

/**
 * Creates a rate limiting middleware.
 * In development, allows more requests for convenience.
 */
export function createRateLimiter(windowMs: number, maxRequests: number) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const adjustedMax = isDevelopment ? maxRequests * 5 : maxRequests

  const limiter = new SimpleRateLimiter(windowMs, adjustedMax)

  return (req: Request, res: Response, next: NextFunction) => {
    // Use IP address as identifier (trust proxy is set in app.ts)
    const identifier = (req.ip ?? req.socket.remoteAddress ?? 'unknown').toString()

    if (!limiter.check(identifier)) {
      const remainingTime = Math.ceil(limiter.getRemainingTime(identifier) / 1000)
      res.status(429).json({
        error: 'TooManyRequests',
        message: `Rate limit exceeded. Please try again in ${remainingTime} seconds.`,
        retryAfter: remainingTime,
      })
      return
    }

    next()
  }
}

/**
 * Rate limiter for demo auth endpoint (5 requests per 15 minutes in production)
 */
export const demoAuthRateLimiter = createRateLimiter(15 * 60 * 1000, 5)

/**
 * Rate limiter for project creation (10 requests per minute in production)
 */
export const projectCreationRateLimiter = createRateLimiter(60 * 1000, 10)

/**
 * Rate limiter for user provisioning (20 requests per minute in production)
 */
export const userProvisioningRateLimiter = createRateLimiter(60 * 1000, 20)

