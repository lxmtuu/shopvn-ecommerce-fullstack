import type { Request, Response } from 'express';
import { COOKIES } from '../config/constants.js';
import { randomId } from './crypto.js';
import { isProd } from '../config/env.js';

/**
 * Xác định chủ sở hữu giỏ hàng:
 *   • Đã đăng nhập  → userId (giỏ lưu DB)
 *   • Khách vãng lai → guestId đọc từ cookie `cart_id` (tự sinh nếu chưa có)
 *
 * Nhờ vậy khách chưa đăng nhập vẫn thêm được vào giỏ, và khi đăng nhập
 * ta merge giỏ khách vào giỏ user (xem POST /cart/merge).
 */
export function resolveCartOwner(req: Request, res: Response): { userId?: string; guestId?: string } {
  if (req.user) return { userId: req.user.id };

  let guestId = (req.cookies as Record<string, string> | undefined)?.[COOKIES.CART];
  if (!guestId) {
    guestId = randomId(16);
    res.cookie(COOKIES.CART, guestId, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
    });
  }
  return { guestId };
}
