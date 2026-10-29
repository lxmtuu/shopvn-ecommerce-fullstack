import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validateBody, validateQuery } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { prisma } from '../../lib/prisma.js';
import { statsService } from './stats.service.js';
import { usersService } from '../users/users.service.js';
import { adminUserQuerySchema, updateUserRoleSchema, updateUserStatusSchema } from '../users/users.schema.js';
import { adminProductRoutes } from '../products/products.routes.js';
import { adminOrderRoutes } from '../orders/orders.routes.js';
import { adminCategoryRoutes } from '../categories/categories.routes.js';
import { adminBrandRoutes } from '../brands/brands.routes.js';
import { adminCouponRoutes } from '../coupons/coupons.routes.js';
import { adminReviewRoutes } from '../reviews/reviews.routes.js';
import { adminPaymentRoutes } from '../payments/payments.routes.js';
import { p } from "../../utils/params.js";
import { invalidateShippingConfig } from '../../lib/shipping.js';

const router = Router();

// ── Toàn bộ /admin/** đều phải là ADMIN. FE ẩn nút chỉ là UX, đây mới là chốt chặn. ──
router.use(requireAuth, requireRole('ADMIN'));

// ── Thống kê ─────────────────────────────────────────────────────────────────
router.get('/stats/overview', asyncHandler(async (_req, res) => ok(res, await statsService.overview())));
router.get(
  '/stats/revenue',
  validateQuery(z.object({ range: z.enum(['7d', '30d', '90d', '12m']).optional().default('30d') })),
  asyncHandler(async (req, res) => ok(res, await statsService.revenue(req.query.range as never))),
);
router.get('/stats/orders-by-status', asyncHandler(async (_req, res) => ok(res, await statsService.ordersByStatus())));
router.get('/stats/payment-methods', asyncHandler(async (_req, res) => ok(res, await statsService.paymentMethods())));
router.get('/stats/top-products', asyncHandler(async (req, res) => ok(res, await statsService.topProducts(Number(req.query.limit ?? 5)))));
router.get('/stats/top-customers', asyncHandler(async (_req, res) => ok(res, await statsService.topCustomers())));
router.get('/stats/low-stock', asyncHandler(async (_req, res) => ok(res, await statsService.lowStock())));
router.get('/stats/revenue-by-category', asyncHandler(async (req, res) => ok(res, await statsService.revenueByCategory(req.query.from as string, req.query.to as string))));
router.get('/stats/recent-orders', asyncHandler(async (_req, res) => ok(res, await statsService.recentOrders())));
router.get(
  '/stats/export',
  validateQuery(z.object({ type: z.enum(['orders', 'products', 'customers']) })),
  asyncHandler(async (req, res) => {
    const csv = await statsService.exportCsv(req.query.type as 'orders' | 'products' | 'customers');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="shopvn-${req.query.type}-${Date.now()}.csv"`);
    return res.send(csv);
  }),
);

// ── Quản lý người dùng ───────────────────────────────────────────────────────
router.get('/users', validateQuery(adminUserQuerySchema), asyncHandler(async (req, res) => {
  const result = await usersService.list(req.query as never);
  return res.json({ success: true, message: 'Thành công', data: result.data, meta: result.meta });
}));
router.get('/users/:id', asyncHandler(async (req, res) => ok(res, await usersService.detail(p(req.params.id)))));
router.patch(
  '/users/:id/status',
  validateBody(updateUserStatusSchema),
  asyncHandler(async (req, res) => ok(res, await usersService.setStatus(p(req.params.id), req.body.status, req.body.reason, req.user!.id), 'Đã cập nhật trạng thái người dùng')),
);
router.patch(
  '/users/:id/role',
  validateBody(updateUserRoleSchema),
  asyncHandler(async (req, res) => ok(res, await usersService.setRole(p(req.params.id), req.body.role, req.user!.id), 'Đã đổi vai trò')),
);
router.post('/users/:id/send-reset-link', asyncHandler(async (req, res) => ok(res, await usersService.sendResetLink(p(req.params.id)), 'Đã gửi link đặt lại mật khẩu')));

// ── Cấu hình shop ────────────────────────────────────────────────────────────
const settingSchema = z.object({
  siteName: z.string().min(1).max(80).optional(),
  logoUrl: z.string().optional().nullable(),
  hotline: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  taxCode: z.string().max(30).optional().nullable(),
  social: z
    .object({
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      youtube: z.string().optional(),
      zalo: z.string().optional(),
    })
    .optional(),
  bankBin: z.string().length(6).optional().nullable(),
  bankAccountNo: z.string().max(25).optional().nullable(),
  bankAccountName: z.string().max(80).optional().nullable(),
  bankName: z.string().max(60).optional().nullable(),
  shippingFees: z.record(z.coerce.number()).optional(),
  freeShipThreshold: z.coerce.number().min(0).optional().nullable(),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDesc: z.string().max(160).optional().nullable(),
  maintenance: z.boolean().optional(),
});

router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const settings = await prisma.siteSetting.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} });
    return ok(res, settings);
  }),
);
router.patch(
  '/settings',
  validateBody(settingSchema),
  asyncHandler(async (req, res) => {
    const settings = await prisma.siteSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...req.body },
      update: req.body,
    });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: 'settings.update', entity: 'SiteSetting', after: req.body } });
    // Phí ship/freeship vừa đổi → xoá cache để đơn tiếp theo dùng giá mới ngay
    await invalidateShippingConfig();
    return ok(res, settings, 'Đã lưu cấu hình');
  }),
);

// ── Audit log ────────────────────────────────────────────────────────────────
router.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Number(req.query.limit ?? 50),
      include: { user: { select: { fullName: true, email: true } } },
    });
    return ok(res, logs);
  }),
);

// ── Gắn các sub-router CRUD ──────────────────────────────────────────────────
router.use('/products', adminProductRoutes);
router.use('/orders', adminOrderRoutes);
router.use('/categories', adminCategoryRoutes);
router.use('/brands', adminBrandRoutes);
router.use('/coupons', adminCouponRoutes);
router.use('/reviews', adminReviewRoutes);
router.use('/payments', adminPaymentRoutes);

export default router;
