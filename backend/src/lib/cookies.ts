import type { Response } from 'express';
import { COOKIES, REFRESH_PATH } from '../config/constants.js';
import { env, isProd } from '../config/env.js';
import { ttlToMs } from './jwt.js';

const base = {
  httpOnly: true,
  secure: env.COOKIE_SECURE || isProd,
  sameSite: 'lax' as const,
  domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
};

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(COOKIES.ACCESS, tokens.accessToken, {
    ...base,
    path: '/',
    maxAge: ttlToMs(env.ACCESS_TOKEN_TTL),
  });
  // Refresh token chỉ gửi tới endpoint refresh → giảm bề mặt tấn công
  res.cookie(COOKIES.REFRESH, tokens.refreshToken, {
    ...base,
    path: REFRESH_PATH,
    maxAge: ttlToMs(env.REFRESH_TOKEN_TTL),
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIES.ACCESS, { ...base, path: '/' });
  res.clearCookie(COOKIES.REFRESH, { ...base, path: REFRESH_PATH });
}
