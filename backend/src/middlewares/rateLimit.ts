import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env.js';
import type { Request } from 'express';
import { getRedis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

/**
 * Rate limit. Có Redis → dùng store Redis (dùng chung giữa nhiều instance).
 * Không có Redis → memory store (đủ cho dev, KHÔNG dùng khi scale ngang).
 */
function buildLimiter(opts: { windowMs: number; max: number; message: string; keyGenerator?: Options['keyGenerator']; skipPaths?: string[] }) {
  return rateLimit({
    /**
     * Bỏ qua một số đường dẫn. Quan trọng với `/webhooks/*`: cổng thanh toán có thể
     * gửi rất nhiều request từ cùng 1 IP — nếu bị chặn 429 thì đơn sẽ KHÔNG được
     * đối soát tự động. Bảo vệ các webhook này bằng chữ ký HMAC, không bằng rate limit.
     */
    skip: (req) => (opts.skipPaths ?? []).some((prefix) => req.path.includes(prefix) || req.originalUrl.includes(prefix)),
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: opts.keyGenerator ?? ((req: Request) => req.ip ?? 'unknown'),
    handler: (req, res) => {
      logger.warn({ ip: req.ip, url: req.originalUrl }, '🚫 Vượt rate limit');
      res.status(429).json({
        success: false,
        message: opts.message,
        code: 'TOO_MANY_REQUESTS',
        requestId: req.requestId,
      });
    },
  });
}

export const globalLimiter = buildLimiter({
  // Ngưỡng đọc từ .env (RATE_LIMIT_WINDOW_MIN / RATE_LIMIT_MAX).
  // Mặc định rộng rãi vì khi web đi qua proxy của Next thì toàn bộ khách truy cập
  // dùng chung 1 IP ⇒ ngưỡng thấp sẽ chặn oan người dùng thật (đã từng gặp: 429 khi demo).
  windowMs: env.RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  max: env.RATE_LIMIT_MAX,
  message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
  skipPaths: ['/webhooks'],
});

/** Đăng nhập: chống brute force (mặc định 10 lần / 15 phút cho mỗi IP + email) */
export const loginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_LOGIN_MAX,
  message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.',
  keyGenerator: (req) => `${req.ip}:${String((req.body as { email?: string })?.email ?? '')}`,
});

export const registerLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Bạn đã tạo quá nhiều tài khoản. Vui lòng thử lại sau.',
});

export const forgotPasswordLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 giờ.',
  keyGenerator: (req) => `fp:${req.ip}:${String((req.body as { email?: string })?.email ?? '')}`,
});

export const orderLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Bạn đã tạo quá nhiều đơn hàng. Vui lòng thử lại sau.',
  keyGenerator: (req) => `order:${req.user?.id ?? req.ip}`,
});

export const uploadLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: 'Bạn đã tải lên quá nhiều file. Vui lòng thử lại sau.',
  keyGenerator: (req) => `upload:${req.user?.id ?? req.ip}`,
});

export const reviewLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Bạn đã gửi quá nhiều đánh giá. Vui lòng thử lại sau.',
  keyGenerator: (req) => `review:${req.user?.id ?? req.ip}`,
});
