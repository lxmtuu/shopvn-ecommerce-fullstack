import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Bọc async controller để lỗi tự động chuyển tới errorHandler (Express 5 đã hỗ trợ, đây là lớp bảo hiểm) */
export const asyncHandler =
  <T extends RequestHandler>(fn: T): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
