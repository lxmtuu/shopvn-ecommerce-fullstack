import type { NextFunction, Request, Response } from 'express';
import { randomId } from '../lib/crypto.js';

/** Gắn requestId cho mọi request — dùng để tra log khi user báo lỗi */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || `req_${randomId(8)}`;
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
