import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export interface AccessPayload {
  sub: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  sid: string;
}

export function signAccessToken(payload: AccessPayload, sessionId: string): string {
  const opts: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, sid: sessionId }, env.JWT_ACCESS_SECRET, {
    ...opts,
    issuer: 'shopvn-api',
    audience: 'shopvn-client',
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'shopvn-api',
      audience: 'shopvn-client',
    }) as AccessPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Phiên đăng nhập đã hết hạn', 'TOKEN_EXPIRED');
    }
    throw AppError.unauthorized('Token không hợp lệ');
  }
}

/** Refresh token là chuỗi đục (opaque), KHÔNG phải JWT → không chứa thông tin đọc được */
export function signRefreshToken(userId: string, sessionId: string, family: string): string {
  return jwt.sign({ sub: userId, sid: sessionId, family, typ: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn'],
    issuer: 'shopvn-api',
  });
}

export function verifyRefreshToken(token: string): { sub: string; sid: string; family: string } {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: 'shopvn-api' }) as {
      sub: string;
      sid: string;
      family: string;
    };
  } catch {
    throw AppError.unauthorized('Refresh token không hợp lệ hoặc đã hết hạn');
  }
}

/** Đổi '15m' | '7d' → milliseconds */
export function ttlToMs(ttl: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const unit: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (unit[m[2]] ?? 60_000);
}
