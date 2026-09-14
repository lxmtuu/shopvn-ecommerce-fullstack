import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import { resolveCartOwner } from '../../lib/cartOwner.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { COOKIES } from '../../config/constants.js';
import { cartService } from './cart.service.js';
import { p } from "../../utils/params.js";

const router = Router();

/** Mọi route giỏ hàng đều xác định "chủ giỏ" = user (đã đăng nhập) hoặc guestId (cookie) */
router.use(optionalAuth);
router.use((req, res, next) => {
  req.cartOwner = resolveCartOwner(req, res);
  next();
});

router.get(
  '/',
  asyncHandler(async (req, res) => ok(res, await cartService.get(req.cartOwner!))),
);

router.post(
  '/items',
  validateBody(
    z.object({
      productId: z.string().min(1, 'Thiếu productId'),
      variantId: z.string().nullable().optional(),
      quantity: z.coerce.number().int().min(1).max(99).default(1),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await cartService.addItem(req.cartOwner!, req.body), 'Đã thêm vào giỏ hàng')),
);

router.patch(
  '/items/:id',
  validateBody(z.object({ quantity: z.coerce.number().int().min(1).max(99) })),
  asyncHandler(async (req, res) => ok(res, await cartService.updateItem(req.cartOwner!, p(req.params.id), req.body.quantity), 'Đã cập nhật giỏ hàng')),
);

router.delete(
  '/items/:id',
  asyncHandler(async (req, res) => ok(res, await cartService.removeItem(req.cartOwner!, p(req.params.id)), 'Đã xoá khỏi giỏ hàng')),
);

router.delete(
  '/',
  asyncHandler(async (req, res) => ok(res, await cartService.clear(req.cartOwner!), 'Đã xoá toàn bộ giỏ hàng')),
);

/** Gọi ngay sau khi đăng nhập để gộp giỏ khách vào giỏ tài khoản */
router.post(
  '/merge',
  requireAuth,
  asyncHandler(async (req, res) => {
    const guestId = (req.cookies as Record<string, string> | undefined)?.[COOKIES.CART];
    const cart = await cartService.merge(req.user!.id, guestId ?? '');
    res.clearCookie(COOKIES.CART, { path: '/' });
    return ok(res, cart, 'Đã gộp giỏ hàng');
  }),
);

export default router;
