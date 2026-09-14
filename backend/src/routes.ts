import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import productRoutes from './modules/products/products.routes.js';
import categoryRoutes from './modules/categories/categories.routes.js';
import brandRoutes from './modules/brands/brands.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import wishlistRoutes from './modules/wishlist/wishlist.routes.js';
import addressRoutes from './modules/addresses/addresses.routes.js';
import orderRoutes from './modules/orders/orders.routes.js';
import paymentRoutes from './modules/payments/payments.routes.js';
import reviewRoutes from './modules/reviews/reviews.routes.js';
import couponRoutes from './modules/coupons/coupons.routes.js';
import uploadRoutes from './modules/uploads/uploads.routes.js';
import webhookRoutes from './modules/webhooks/webhooks.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import bankRoutes from './modules/admin/bank.routes.js';
import { asyncHandler } from './utils/asyncHandler.js';
import { ok } from './utils/response.js';
import { prisma } from './lib/prisma.js';
import { getRedis } from './lib/redis.js';

const router = Router();

// ── Health check ─────────────────────────────────────────────────────────────
router.get('/health', (_req, res) =>
  ok(res, { status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() }, 'API hoạt động bình thường'),
);

/** Health check sâu: kiểm tra kết nối DB + Redis (dùng cho uptime monitor) */
router.get(
  '/health/deep',
  asyncHandler(async (_req, res) => {
    const checks: Record<string, string> = {};
    let healthy = true;

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
      healthy = false;
    }

    const redis = getRedis();
    if (redis) {
      try {
        await redis.ping();
        checks.redis = 'ok';
      } catch {
        checks.redis = 'error';
        healthy = false;
      }
    } else {
      checks.redis = 'not_configured';
    }

    checks.memory = `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`;
    return res.status(healthy ? 200 : 503).json({ success: healthy, message: healthy ? 'OK' : 'Có dịch vụ lỗi', data: checks });
  }),
);

// ── Nghiệp vụ ────────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/addresses', addressRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/coupons', couponRoutes);
router.use('/uploads', uploadRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/admin', adminRoutes);

// ── Công khai (không cần đăng nhập) ──────────────────────────────────────────
router.use('/', bankRoutes);

export default router;
