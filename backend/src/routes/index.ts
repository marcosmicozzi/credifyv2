import type { RequestHandler } from 'express'
import { Router } from 'express'

import { authRouter } from './auth.js'
import { healthRouter } from './health.js'
import { metricsRouter } from './metrics.js'
import { projectsRouter } from './projects.js'
import { rolesRouter } from './roles.js'
import { integrationsRouter } from './integrations.js'

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
apiRouter.use('/auth', authRouter)
apiRouter.use('/projects', projectsRouter)
apiRouter.use('/metrics', metricsRouter)
apiRouter.use('/roles', rolesRouter)
apiRouter.use('/integrations', integrationsRouter)

apiRouter.get('/insights/fetch', notImplemented('Metrics fetch pending implementation'))
apiRouter.post('/insights/refresh', notImplemented('Metrics refresh pending implementation'))

apiRouter.get('/users/profile', notImplemented('User profile enrichment pending implementation'))

