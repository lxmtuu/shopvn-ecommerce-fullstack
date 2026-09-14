import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { paymentsService } from './payments.service.js';
import { p } from "../../utils/params.js";

const router = Router();

/** Ảnh QR — công khai để có thể mở trực tiếp / tải về / in */
router.get(
  '/:orderCode/qr.png',
  asyncHandler(async (req, res) => {
    const png = await paymentsService.qrPng(p(req.params.orderCode));
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(png);
  }),
);

router.get(
  '/:orderCode/info',
  requireAuth,
  asyncHandler(async (req, res) =>
    ok(res, await paymentsService.info(p(req.params.orderCode), req.user!.id, req.user!.role === 'ADMIN')),
  ),
);

router.post(
  '/:orderCode/confirm-transfer',
  requireAuth,
  asyncHandler(async (req, res) => ok(res, await paymentsService.confirmTransfer(p(req.params.orderCode), req.user!.id))),
);

/** Upload ảnh bill chuyển khoản (khách hoặc admin) */
router.post(
  '/:orderCode/proof',
  requireAuth,
  asyncHandler(async (req, res) => ok(res, { url: (req.body as { url: string }).url }, 'Đã gửi ảnh xác nhận')),
);

export const adminPaymentRoutes = Router();
adminPaymentRoutes.use(requireAuth, requireRole('ADMIN'));
adminPaymentRoutes.patch(
  '/orders/:id/confirm',
  validateBody(
    z.object({
      paidAmount: z.coerce.number().min(0).optional(),
      proofImageUrl: z.string().optional(),
      note: z.string().max(300).optional(),
    }),
  ),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await paymentsService.manualConfirm(p(req.params.id), req.user!.id, req.body.paidAmount, req.body.proofImageUrl, req.body.note),
      'Đã xác nhận thanh toán',
    ),
  ),
);

export default router;
