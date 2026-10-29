import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { env, isProd } from './config/env.js';
import { logger } from './lib/logger.js';
import { requestId } from './middlewares/requestId.js';
import { csrfToken } from './middlewares/csrf.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';
import { globalLimiter } from './middlewares/rateLimit.js';
import { swaggerSpec } from './docs/swagger.js';
import routes from './routes.js';

export function createApp(): Express {
  const app = express();

  // Tin tưởng proxy đầu tiên (Railway/Render/Nginx) để req.ip là IP thật
  // ── IP thật khi chạy sau reverse proxy (nginx, Next.js rewrites, CDN) ────────
  // Bật bằng TRUST_PROXY=true trong .env. CHỈ bật khi API không bị lộ trực tiếp ra
  // internet — vì header X-Forwarded-For có thể bị giả mạo để né chống spam.
  // Khi bật: hạn mức chống spam tính theo từng người dùng thật (không dùng chung 1 IP
  // của proxy). Khi tắt: dùng IP kết nối trực tiếp (an toàn nhất).
  // env.TRUST_PROXY: false = không tin proxy | số N = tin N lớp proxy gần nhất
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  // ── Bảo mật header ─────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              connectSrc: ["'self'", env.CLIENT_URL],
              fontSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      // Ảnh sản phẩm được nhúng từ origin khác (FE) → cần tắt CORP
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    }),
  );

  // ── CORS: whitelist origin, BẮT BUỘC bật credentials để cookie hoạt động ────
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Không có Origin (curl, server-to-server) hoặc nằm trong whitelist → cho phép
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);

        // Origin khác: TỪ CHỐI NHẸ NHÀNG — không ném lỗi, để Express vẫn xử lý request.
        // Vì sao: khi web gọi API qua proxy cùng origin (Next.js rewrites, reverse proxy,
        // tên miền xem trước...) thì trình duyệt KHÔNG cần header CORS; còn request
        // cross-origin thật thì trình duyệt tự chặn vì thiếu Access-Control-Allow-Origin.
        // Ném lỗi ở đây từng gây 500 "Đã có lỗi xảy ra" cho đăng nhập/giỏ hàng khi
        // truy cập qua tên miền khác localhost.
        logger.warn({ origin }, '🚫 CORS: origin không nằm trong whitelist (không gửi header CORS)');
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-request-id'],
      exposedHeaders: ['x-request-id'],
      maxAge: 86400,
    }),
  );

  app.use(compression());
  app.use(requestId);

  // ── Body parser: giữ rawBody cho webhook (cần để verify HMAC) ───────────────
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // ── Log request (ẩn thông tin nhạy cảm qua redact trong logger) ─────────────
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as unknown as { requestId?: string }).requestId ?? 'unknown',
      autoLogging: { ignore: (req) => req.url === `${env.API_PREFIX}/health` },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    }),
  );

  // ── File tĩnh cho ảnh upload (local driver) ────────────────────────────────
  if (env.STORAGE_DRIVER === 'local') {
    app.use(
      '/uploads',
      express.static(path.resolve(env.UPLOAD_DIR), {
        maxAge: '30d',
        immutable: true,
        // Không cho thực thi file — chỉ phục vụ ảnh
        setHeaders: (res) => res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'"),
      }),
    );
  }

  // ── Tài liệu API ───────────────────────────────────────────────────────────
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'ShopVN API Docs',
      swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
    }),
  );

  // ── Rate limit toàn cục (webhook được miễn để không chặn ngân hàng) ────────
  app.use((req, res, next) => (req.path.startsWith('/webhooks') ? next() : globalLimiter(req, res, next)));

  // ── CSRF double-submit cho toàn bộ /api ────────────────────────────────────
  app.use(csrfToken);

  app.use(env.API_PREFIX, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
