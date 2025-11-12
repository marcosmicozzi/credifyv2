import type { Request, Response, NextFunction } from 'express'

type HttpError = Error & {
  status?: number
  statusCode?: number
  expose?: boolean
  details?: unknown
}

export function errorHandler(err: HttpError, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err)
    return
  }

  const status = err.status ?? err.statusCode ?? 500
  const message = err.expose ? err.message : 'Unexpected error occurred'

  if (process.env.NODE_ENV !== 'test') {
    console.error(err)
  }

  res.status(status).json({
    error: err.name || 'Error',
    message,
    details: err.expose ? err.details : undefined,
  })
}

