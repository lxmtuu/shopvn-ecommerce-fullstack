import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';

const formatIssues = (err: ZodError) =>
  err.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));

/**
 * Express 5 biến req.query thành getter chỉ-đọc → phải defineProperty để ghi đè
 * giá trị ĐÃ ĐƯỢC PARSE & COERCE (ví dụ "1" → 1, "true" → true).
 */
function override(req: Request, key: 'body' | 'query' | 'params', value: unknown) {
  if (key === 'body') {
    req.body = value as Request['body'];
    return;
  }
  Object.defineProperty(req, key, { value, writable: true, configurable: true, enumerable: true });
}

/**
 * Bỏ các tham số RỖNG trên query string trước khi validate.
 * Lý do: giao diện hay gửi `?q=&status=&page=1` (bộ lọc để trống). Nếu để nguyên,
 * zod sẽ báo "Invalid enum value ... received ''" ⇒ HTTP 400 ⇒ trang quản trị lỗi
 * dù người dùng chẳng nhập gì sai. Quy ước: tham số rỗng = "không lọc".
 */
function stripEmptyQuery(q: unknown): Record<string, unknown> {
  if (!q || typeof q !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(q as Record<string, unknown>)) {
    if (v === '' || v === undefined || v === null) continue;
    if (Array.isArray(v) && v.every((x) => x === '' || x === undefined || x === null)) continue;
    out[k] = v;
  }
  return out;
}

function makeValidator(key: 'body' | 'query' | 'params') {
  return (schema: ZodTypeAny): RequestHandler =>
    (req: Request, res: Response, next: NextFunction) => {
      const payload = key === 'query' ? stripEmptyQuery(req[key]) : req[key];
      const result = schema.safeParse(payload);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          code: 'VALIDATION_ERROR',
          errors: formatIssues(result.error),
          requestId: req.requestId,
        });
      }
      override(req, key, result.data);
      next();
    };
}

export const validateBody = makeValidator('body');
export const validateQuery = makeValidator('query');
export const validateParams = makeValidator('params');

/** Validate nhiều phần cùng lúc: validate({ body, query, params }) */
export const validate =
  (schemas: { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }): RequestHandler =>
  (req, res, next) => {
    const errors: Array<{ field: string; message: string }> = [];
    (['body', 'query', 'params'] as const).forEach((key) => {
      const schema = schemas[key];
      if (!schema) return;
      const payload = key === 'query' ? stripEmptyQuery(req[key]) : req[key];
      const result = schema.safeParse(payload);
      if (!result.success) {
        errors.push(...formatIssues(result.error).map((e) => ({ field: `${key}.${e.field}`, message: e.message })));
      } else {
        override(req, key, result.data);
      }
    });
    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', code: 'VALIDATION_ERROR', errors, requestId: req.requestId });
    }
    next();
  };
