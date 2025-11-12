import { Router } from 'express';
export const healthRouter = Router();
healthRouter.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'credify-backend',
        timestamp: new Date().toISOString(),
    });
});
//# sourceMappingURL=health.js.map