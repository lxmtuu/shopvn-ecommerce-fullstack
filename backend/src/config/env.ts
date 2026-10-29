import 'dotenv/config';
import { z } from 'zod';

/**
 * Validate biến môi trường NGAY LÚC KHỞI ĐỘNG (fail fast).
 * Sai/thiếu biến → process thoát kèm thông báo rõ ràng, thay vì lỗi mơ hồ giữa chừng.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  APP_NAME: z.string().default('ShopVN'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'Thiếu DATABASE_URL'),
  REDIS_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET phải >= 32 ký tự'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET phải >= 32 ký tự'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  /**
   * Giới hạn tần suất (chống spam) — chỉnh được qua .env, không cần sửa code.
   * LƯU Ý QUAN TRỌNG: khi web gọi API qua proxy của Next.js, MỌI người truy cập
   * đều mang cùng IP của tiến trình Next ⇒ nếu để ngưỡng thấp thì cả website
   * dùng chung một hạn mức và rất dễ bị chặn oan khi demo.
   */
  RATE_LIMIT_WINDOW_MIN: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(2000),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
  /**
   * Số lớp proxy tin cậy — dùng để lấy đúng IP người dùng từ X-Forwarded-For.
   *   false / 0 = không tin proxy nào (an toàn nhất khi API lộ trực tiếp)
   *   1         = tin đúng proxy gần nhất (nginx, proxy rewrite của Next…) ← khuyến nghị
   *   2, 3…     = chuỗi nhiều lớp proxy (CDN + nginx + app)
   *
   * KHÔNG dùng `true` (tin MỌI proxy): kẻ tấn công có thể tự gửi X-Forwarded-For
   * giả để né rate limit. Ở đây `true` được quy về 1 lớp.
   */
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((value, ctx) => {
      const raw = (value ?? '').trim().toLowerCase();
      if (!raw || raw === 'false' || raw === '0') return false;
      if (raw === 'true') return 1;
      const hops = Number(raw);
      if (Number.isInteger(hops) && hops > 0) return hops;
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'TRUST_PROXY phải là false, true hoặc số lớp proxy (vd: 1)' });
      return false;
    })
    .default('false'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  // LƯU Ý: KHÔNG dùng z.coerce.boolean() ở đây — nó biến chuỗi "false" thành true
  // (Boolean("false") === true), khiến .env ghi COOKIE_SECURE=false mà cookie vẫn
  // bị gắn cờ Secure ⇒ đăng nhập thất bại khi chạy bằng http trên tên miền/địa chỉ
  // khác localhost (ví dụ http://192.168.1.10:3000 khi demo cho bạn bè).
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),

  MAIL_DRIVER: z.enum(['smtp', 'resend', 'console']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('ShopVN <no-reply@shop.vn>'),
  RESEND_API_KEY: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/api/v1/auth/google/callback'),

  BANK_BIN: z.string().default('970436'),
  BANK_ACCOUNT_NO: z.string().default('0011000123456'),
  BANK_ACCOUNT_NAME: z.string().default('NGUYEN VAN A'),
  BANK_NAME: z.string().default('Vietcombank'),
  WEBHOOK_SECRET: z.string().default('dev-webhook-secret'),
  ORDER_PAYMENT_TTL_MINUTES: z.coerce.number().default(1440),
  FREE_SHIPPING_THRESHOLD: z.coerce.number().default(500000),
  SHIPPING_FEE_STANDARD: z.coerce.number().default(30000),
  SHIPPING_FEE_EXPRESS: z.coerce.number().default(50000),
  SHIPPING_FEE_INSTANT: z.coerce.number().default(80000),

  STORAGE_DRIVER: z.enum(['local', 's3', 'r2']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  PUBLIC_UPLOAD_URL: z.string().default('http://localhost:4000/uploads'),

  BCRYPT_ROUNDS: z.coerce.number().default(12),
  SEED_ADMIN_EMAIL: z.string().default('admin@shop.vn'),
  SEED_ADMIN_PASSWORD: z.string().default('Admin@123456'),
  SEED_USER_EMAIL: z.string().default('customer@shop.vn'),
  SEED_USER_PASSWORD: z.string().default('Customer@123456'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`\n❌ Biến môi trường không hợp lệ:\n${issues}\n\n👉 Xem mẫu trong .env.example và docs/05-SETUP-VA-YEU-CAU.md\n`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export type Env = typeof env;
