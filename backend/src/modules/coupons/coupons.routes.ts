import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import { resolveCartOwner } from '../../lib/cartOwner.js';
import { optionalAuth } from '../../middlewares/auth.js';
import { cartService } from '../cart/cart.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { couponsService } from './coupons.service.js';
import { D } from '../../utils/money.js';
import { p } from "../../utils/params.js";

export const couponRoutes = Router();

couponRoutes.get(
  '/available',
  asyncHandler(async (_req, res) => ok(res, await couponsService.available())),
);

couponRoutes.post(
  '/validate',
  optionalAuth,
  (req, res, next) => {
    req.cartOwner = resolveCartOwner(req, res);
    next();
  },
  validateBody(z.object({ code: z.string().min(2, 'Vui lòng nhập mã giảm giá').max(40) })),
  asyncHandler(async (req, res) => {
    const cart = await cartService.get(req.cartOwner!);
    const ids = cart.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, categoryId: true } });

    const lines = cart.items.map((item) => ({
      productId: item.productId,
      categoryId: products.find((p) => p.id === item.productId)?.categoryId ?? '',
      unitPrice: D(item.unitPrice),
      quantity: item.quantity,
    }));

    return ok(res, await couponsService.validate(req.body.code, lines, req.user?.id), 'Mã giảm giá hợp lệ');
  }),
);

// ── Admin ────────────────────────────────────────────────────────────────────
const couponInput = z.object({
  code: z.string().trim().min(3).max(40),
  name: z.string().trim().min(2).max(120),
  description: z.string().max(300).optional(),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.coerce.number().positive(),
  minOrderValue: z.coerce.number().min(0).default(0),
  maxDiscount: z.coerce.number().min(0).optional().nullable(),
  usageLimit: z.coerce.number().int().min(0).optional().nullable(),
  usageLimitPerUser: z.coerce.number().int().min(0).optional().nullable(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
  target: z.enum(['ALL', 'CATEGORY', 'PRODUCT']).default('ALL'),
  categoryId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const adminCouponRoutes = Router();
adminCouponRoutes.get('/', asyncHandler(async (_req, res) => ok(res, await couponsService.list())));
adminCouponRoutes.post(
  '/',
  validateBody(couponInput),
  asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Tạo mã giảm giá thành công', data: await couponsService.create(req.body) })),
);
adminCouponRoutes.patch(
  '/:id',
  validateBody(couponInput.partial()),
  asyncHandler(async (req, res) => ok(res, await couponsService.update(p(req.params.id), req.body), 'Cập nhật mã giảm giá thành công')),
);
adminCouponRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => ok(res, await couponsService.remove(p(req.params.id)), 'Đã xoá mã giảm giá')),
);

export default couponRoutes;
