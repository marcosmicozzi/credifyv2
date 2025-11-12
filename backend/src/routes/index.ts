import type { RequestHandler } from 'express'
import { Router } from 'express'

import { healthRouter } from './health.js'

const notImplemented = (message: string): RequestHandler => (_req, res) => {
  res.status(501).json({
    error: 'NotImplemented',
    message,
  })
}

export const apiRouter = Router()

apiRouter.get('/', (_req, res) => {
  res.json({
    version: 'v2',
    message: 'Credify API placeholder',
  })
})

apiRouter.use('/health', healthRouter)

apiRouter.get('/auth/instagram', notImplemented('Instagram OAuth initiation pending implementation'))
apiRouter.get('/auth/instagram/callback', notImplemented('Instagram OAuth callback pending implementation'))
apiRouter.post('/auth/supabase', notImplemented('Supabase JWT validation pending implementation'))

apiRouter.get('/insights/fetch', notImplemented('Metrics fetch pending implementation'))
apiRouter.post('/insights/refresh', notImplemented('Metrics refresh pending implementation'))

apiRouter.get('/users/profile', notImplemented('User profile enrichment pending implementation'))
apiRouter.get('/projects/list', notImplemented('Projects listing pending implementation'))

