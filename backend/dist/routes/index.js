import { Router } from 'express';
import { authRouter } from './auth.js';
import { healthRouter } from './health.js';
import { metricsRouter } from './metrics.js';
import { projectsRouter } from './projects.js';
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
apiRouter.get('/auth/instagram', notImplemented('Instagram OAuth initiation pending implementation'));
apiRouter.get('/auth/instagram/callback', notImplemented('Instagram OAuth callback pending implementation'));
apiRouter.get('/insights/fetch', notImplemented('Metrics fetch pending implementation'));
apiRouter.post('/insights/refresh', notImplemented('Metrics refresh pending implementation'));
apiRouter.get('/users/profile', notImplemented('User profile enrichment pending implementation'));
//# sourceMappingURL=index.js.map