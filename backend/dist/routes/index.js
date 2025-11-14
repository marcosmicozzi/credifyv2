import { Router } from 'express';
import { authRouter } from './auth.js';
import { cronRouter } from './cron.js';
import { healthRouter } from './health.js';
import { metricsRouter } from './metrics.js';
import { projectsRouter } from './projects.js';
import { rolesRouter } from './roles.js';
import { integrationsRouter } from './integrations.js';
import { usersRouter } from './users.js';
import { activityRouter } from './activity.js';
const notImplemented = (message) => (_req, res) => {
    res.status(501).json({
        error: 'NotImplemented',
        message,
    });
};
export const apiRouter = Router();
apiRouter.get('/', (_req, res) => {
    res.json({
        version: 'v2',
        message: 'Credify API placeholder',
    });
});
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/metrics', metricsRouter);
apiRouter.use('/roles', rolesRouter);
apiRouter.use('/integrations', integrationsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/activity', activityRouter);
// Cron routes do NOT require authentication - they use CRON_SECRET validation instead
apiRouter.use('/cron', cronRouter);
apiRouter.get('/insights/fetch', notImplemented('Metrics fetch pending implementation'));
apiRouter.post('/insights/refresh', notImplemented('Metrics refresh pending implementation'));
apiRouter.get('/users/profile', notImplemented('User profile enrichment pending implementation'));
//# sourceMappingURL=index.js.map