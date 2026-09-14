import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@prisma/client';
import { COOKIES } from '../config/constants.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

/** Đọc access token từ cookie (ưu tiên) hoặc header Authorization: Bearer */
function extractToken(req: Request): string | null {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[COOKIES.ACCESS];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** BẮT BUỘC đăng nhập. Ném 401 nếu không có / token sai / tài khoản bị khoá. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw AppError.unauthorized('Bạn cần đăng nhập để tiếp tục');

    const payload = verifyAccessToken(token);

    // Kiểm tra session còn sống (đã bị revoke chưa) + trạng thái tài khoản
    const [session, user] = await Promise.all([
      prisma.session.findUnique({ where: { id: payload.sid }, select: { revokedAt: true, expiresAt: true } }),
      prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, role: true, status: true } }),
    ]);

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw AppError.unauthorized('Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại');
    }
    if (!user) throw AppError.unauthorized('Tài khoản không tồn tại');
    if (user.status === 'BLOCKED') throw new AppError(403, 'Tài khoản của bạn đã bị khoá. Liên hệ hotline 1900 1234.', 'ACCOUNT_BLOCKED');
    if (user.status === 'DELETED') throw AppError.unauthorized('Tài khoản không tồn tại');

    req.user = { id: user.id, email: user.email, role: user.role as Role, sessionId: payload.sid };
    void prisma.session.update({ where: { id: payload.sid }, data: { lastUsedAt: new Date() } }).catch(() => {});
    next();
  } catch (err) {
    next(err);
  }
};

/** Có token thì gắn user, không có thì đi tiếp (dùng cho giỏ hàng khách vãng lai) */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });
    if (user && user.status === 'ACTIVE') {
      req.user = { id: user.id, email: user.email, role: user.role as Role, sessionId: payload.sid };
    }
  } catch {
    /* token hỏng → coi như khách vãng lai, không chặn request */
  }
  next();
};

/** Phân quyền theo vai trò. Bảo vệ THẬT nằm ở đây, không phải ở việc ẩn nút trên FE. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('Bạn không có quyền truy cập khu vực quản trị'));
    }
    next();
  };

/**
 * Chống IDOR: so sánh chủ sở hữu tài nguyên với người đang đăng nhập.
 * Dùng trong service: `assertOwnership(order.userId, req.user.id)`
 */
export function assertOwnership(ownerId: string, currentUserId: string, isAdmin = false) {
  if (isAdmin) return;
  if (ownerId !== currentUserId) throw AppError.notFound('Không tìm thấy dữ liệu');
}
