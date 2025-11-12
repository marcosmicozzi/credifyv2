export function errorHandler(err, _req, res, next) {
    if (res.headersSent) {
        next(err);
        return;
    }
    const status = err.status ?? err.statusCode ?? 500;
    const message = err.expose ? err.message : 'Unexpected error occurred';
    if (process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.error(err);
    }
    res.status(status).json({
        error: err.name || 'Error',
        message,
        details: err.expose ? err.details : undefined,
    });
}
//# sourceMappingURL=errorHandler.js.map