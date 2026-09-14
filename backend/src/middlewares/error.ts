import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { isProd } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../lib/logger.js';

/** 404 cho mọi route không khớp */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
    requestId: req.requestId,
  });
}

interface ErrorBody {
  status: number;
  message: string;
  code: string;
  errors?: Array<{ field: string; message: string }>;
}

/** Chuyển mọi loại lỗi về một hình dạng response thống nhất */
function normalize(err: unknown): ErrorBody {
  if (err instanceof AppError) {
    return { status: err.statusCode, message: err.message, code: err.code, errors: err.errors };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      message: 'Dữ liệu không hợp lệ',
      code: 'VALIDATION_ERROR',
      errors: err.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message })),
    };
  }

  if (err instanceof MulterError) {
    const map: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File vượt quá dung lượng cho phép',
      LIMIT_FILE_COUNT: 'Quá nhiều file trong một lần tải lên',
      LIMIT_UNEXPECTED_FILE: 'Trường file không hợp lệ',
    };
    return { status: 400, message: map[err.code] ?? 'Tải file thất bại', code: 'VALIDATION_ERROR' };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[] | string | undefined) ?? 'trường dữ liệu';
        return { status: 409, message: `Giá trị đã tồn tại: ${Array.isArray(target) ? target.join(', ') : target}`, code: 'EMAIL_EXISTS' };
      }
      case 'P2025':
        return { status: 404, message: 'Không tìm thấy dữ liệu để thao tác', code: 'NOT_FOUND' };
      case 'P2003':
        return { status: 409, message: 'Dữ liệu tham chiếu không hợp lệ', code: 'BUSINESS_RULE_VIOLATION' };
      case 'P2014':
        return { status: 409, message: 'Thao tác vi phạm ràng buộc dữ liệu', code: 'BUSINESS_RULE_VIOLATION' };
      default:
        return { status: 500, message: 'Lỗi cơ sở dữ liệu', code: 'INTERNAL_ERROR' };
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return { status: 500, message: 'Lỗi truy vấn dữ liệu', code: 'INTERNAL_ERROR' };
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return { status: 400, message: 'JSON gửi lên không hợp lệ', code: 'VALIDATION_ERROR' };
  }

  return { status: 500, message: 'Đã có lỗi xảy ra, vui lòng thử lại sau', code: 'INTERNAL_ERROR' };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const { status, message, code, errors } = normalize(err);

  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id,
    status,
    code,
    err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
  };

  if (status >= 500) logger.error(logPayload, '💥 Lỗi hệ thống');
  else if (status >= 400 && status !== 401 && status !== 404) logger.warn(logPayload, '⚠️ Lỗi nghiệp vụ');

  // Ở production KHÔNG bao giờ trả stack trace ra client
  const body: Record<string, unknown> = { success: false, message, code, requestId: req.requestId };
  if (errors?.length) body.errors = errors;
  if (!isProd && status >= 500 && err instanceof Error) body.stack = err.stack;

  res.status(status).json(body);
}
