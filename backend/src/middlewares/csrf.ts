import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { COOKIES } from '../config/constants.js';
import { isProd } from '../config/env.js';
import { safeEqual } from '../lib/crypto.js';
import { AppError } from '../utils/AppError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Các endpoint ĐƯỢC MIỄN kiểm tra CSRF:
 *
 *  • Nhóm xác thực công khai (login, register, forgot/reset password, refresh):
 *    người dùng chưa có phiên để "mượn", và nếu bắt buộc thì request đầu tiên
 *    của một trình duyệt mới sẽ luôn thất bại.
 *  • Nhóm webhooks: ngân hàng gọi từ server, không có cookie — đã tự bảo vệ bằng HMAC.
 *  • Ảnh QR chỉ là GET nên đã nằm trong SAFE_METHODS.
 */
const EXEMPT_PATHS = [
  /\/auth\/(login|register|forgot-password|reset-password|refresh)$/,
  /\/webhooks\//,
];

/**
 * Bảo vệ CSRF theo mô hình DOUBLE-SUBMIT COOKIE.
 *
 * Vì sao cần: access token nằm trong cookie httpOnly → trình duyệt TỰ ĐỘNG gửi kèm
 * khi trang web khác gửi request. Ta yêu cầu thêm một token thứ hai mà chỉ JavaScript
 * cùng origin đọc được (không httpOnly) và phải gửi lại qua header `x-csrf-token`.
 *
 * Vì sao an toàn: kẻ tấn công cross-site không đọc được cookie csrf_token
 * (same-origin policy) nên không thể tạo header đúng.
 */
export function csrfToken(req: Request, res: Response, next: NextFunction) {
  let token = (req.cookies as Record<string, string> | undefined)?.[COOKIES.CSRF];
  if (!token) {
    token = randomBytes(24).toString('hex');
    res.cookie(COOKIES.CSRF, token, {
      httpOnly: false, // FE BẮT BUỘC đọc được để gửi lại qua header
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  res.locals.csrfToken = token;

  if (SAFE_METHODS.has(req.method)) return next();
  if (EXEMPT_PATHS.some((re) => re.test(req.originalUrl.split('?')[0]))) return next();

  const sent = (req.headers['x-csrf-token'] as string | undefined) ?? (req.body as { _csrf?: string })?._csrf;
  if (!sent || !safeEqual(sent, token)) {
    return next(
      new AppError(403, 'Phiên làm việc không hợp lệ (CSRF token sai hoặc thiếu). Hãy tải lại trang.', 'FORBIDDEN'),
    );
  }
  next();
}
