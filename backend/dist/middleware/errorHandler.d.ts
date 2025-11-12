import type { Request, Response, NextFunction } from 'express';
type HttpError = Error & {
    status?: number;
    statusCode?: number;
    expose?: boolean;
    details?: unknown;
};
export declare function errorHandler(err: HttpError, _req: Request, res: Response, next: NextFunction): void;
export {};
//# sourceMappingURL=errorHandler.d.ts.map