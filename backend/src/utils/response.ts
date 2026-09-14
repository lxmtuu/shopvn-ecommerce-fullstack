import type { Response } from 'express';

export interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  [key: string]: unknown;
}

export const ok = <T>(res: Response, data: T, message = 'Thành công', meta?: Meta, status = 200) =>
  res.status(status).json({ success: true, message, data, ...(meta ? { meta } : {}) });

export const created = <T>(res: Response, data: T, message = 'Tạo mới thành công') =>
  ok(res, data, message, undefined, 201);

export const noContent = (res: Response) => res.status(204).send();
