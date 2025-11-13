export function notFound(req, res) {
    res.status(404).json({
        error: 'NotFound',
        message: `Route ${req.originalUrl} not found`,
    });
}
//# sourceMappingURL=notFound.js.map