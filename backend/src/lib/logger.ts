import pino from 'pino';
import { isDev, isProd } from '../config/env.js';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isProd ? undefined : { target: 'pino/file', options: { destination: 1 } },
  redact: {
    // Không bao giờ ghi log thông tin nhạy cảm
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.newPassword',
      'req.body.currentPassword',
      'req.body.token',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
    ],
    censor: '[ĐÃ ẨN]',
  },
  base: { app: 'shopvn-api' },
});

export const securityLog = (
  event: string,
  data: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'warn',
) => logger[level]({ security: true, event, ...data }, `🔐 ${event}`);
