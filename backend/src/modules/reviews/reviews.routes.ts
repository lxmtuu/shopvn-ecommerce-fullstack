import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { reviewLimiter } from '../../middlewares/rateLimit.js';
import { validateBody } from '../../middlewares/validate.js';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';
import { buildMeta, parsePagination } from '../../utils/pagination.js';
import { cleanText } from '../../utils/sanitize.js';
import { p } from "../../utils/params.js";

const reviewInput = z.object({
  productId: z.string().min(1),
  orderId: z.string().optional(),
  rating: z.coerce.number().int().min(1, 'Chọn số sao từ 1 đến 5').max(5),
  title: z.string().trim().max(120).optional(),
  content: z.string().trim().min(10, 'Nội dung đánh giá tối thiểu 10 ký tự').max(2000),
  images: z.array(z.string()).max(5).optional().default([]),
});

/** API công khai: đọc đánh giá của 1 sản phẩm */
export const reviewRoutes = Router();
reviewRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const productId = String(req.query.productId ?? '');
    if (!productId) throw AppError.badRequest('Thiếu productId');

    const where = { productId, status: 'APPROVED' as const, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true, rating: true, title: true, content: true, images: true,
          isVerified: true, helpfulCount: true, adminReply: true, repliedAt: true, createdAt: true,
          user: { select: { fullName: true, avatarUrl: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return res.json({ success: true, message: 'Thành công', data: items, meta: buildMeta(total, { page, limit }) });
  }),
);

/** Tạo đánh giá — chỉ người ĐÃ MUA mới được đánh giá */
reviewRoutes.post(
  '/',
  requireAuth,
  reviewLimiter,
  validateBody(reviewInput),
  asyncHandler(async (req, res) => {
    const { productId, orderId, rating, title, content, images } = req.body;

    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId: req.user!.id, productId } },
      select: { id: true, createdAt: true },
    });
    if (existing) throw AppError.conflict('Bạn đã đánh giá sản phẩm này rồi');

    // Xác thực đã mua: tìm 1 đơn DELIVERED có chứa sản phẩm này
    const purchased = await prisma.order.findFirst({
      where: {
        userId: req.user!.id,
        status: 'DELIVERED',
        ...(orderId ? { id: orderId } : {}),
        items: { some: { productId } },
      },
      select: { id: true },
    });
    if (!purchased) throw AppError.forbidden('Bạn cần mua và nhận hàng thành công mới có thể đánh giá sản phẩm này');

    const review = await prisma.review.create({
      data: {
        productId,
        userId: req.user!.id,
        orderId: purchased.id,
        rating,
        title: title ? cleanText(title) : null,
        content: cleanText(content),
        images: images ?? [],
        isVerified: true,
        status: 'PENDING', // chờ admin duyệt — chống spam
      },
    });

    return res.status(201).json({ success: true, message: 'Cảm ơn bạn! Đánh giá đang chờ duyệt.', data: review });
  }),
);

reviewRoutes.patch(
  '/:id',
  requireAuth,
  validateBody(reviewInput.partial().omit({ productId: true })),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.findUnique({ where: { id: p(req.params.id) } });
    if (!review || review.userId !== req.user!.id) throw AppError.notFound('Không tìm thấy đánh giá');

    // Chỉ được sửa trong 24h
    if (Date.now() - review.createdAt.getTime() > 24 * 3600 * 1000) {
      throw AppError.conflict('Chỉ có thể sửa đánh giá trong vòng 24 giờ');
    }

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        ...(req.body.rating ? { rating: req.body.rating } : {}),
        ...(req.body.title !== undefined ? { title: cleanText(req.body.title) } : {}),
        ...(req.body.content ? { content: cleanText(req.body.content) } : {}),
        ...(req.body.images ? { images: req.body.images } : {}),
        status: 'PENDING',
      },
    });
    return ok(res, updated, 'Đã cập nhật đánh giá, chờ duyệt lại');
  }),
);

reviewRoutes.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const review = await prisma.review.findUnique({ where: { id: p(req.params.id) } });
    if (!review || review.userId !== req.user!.id) throw AppError.notFound('Không tìm thấy đánh giá');
    await prisma.review.update({ where: { id: review.id }, data: { deletedAt: new Date() } });
    return ok(res, { deleted: true }, 'Đã xoá đánh giá');
  }),
);

/** Admin duyệt / ẩn đánh giá + phản hồi của shop */
export const adminReviewRoutes = Router();
adminReviewRoutes.use(requireAuth, requireRole('ADMIN'));
adminReviewRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const where = {
      deletedAt: null,
      ...(req.query.status ? { status: String(req.query.status) as never } : {}),
    } as const;

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { fullName: true, email: true } },
          product: { select: { name: true, slug: true, images: { take: 1, select: { thumbUrl: true } } } },
        },
      }),
      prisma.review.count({ where }),
    ]);
    return res.json({ success: true, message: 'Thành công', data: items, meta: buildMeta(total, { page, limit }) });
  }),
);
adminReviewRoutes.patch(
  '/:id',
  validateBody(
    z.object({
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
      adminReply: z.string().max(1000).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const updated = await prisma.review.update({
      where: { id: p(req.params.id) },
      data: {
        ...(req.body.status ? { status: req.body.status } : {}),
        ...(req.body.adminReply !== undefined
          ? { adminReply: cleanText(req.body.adminReply), repliedAt: new Date() }
          : {}),
      },
    });
    return ok(res, updated, 'Đã cập nhật đánh giá');
  }),
);
adminReviewRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.review.update({ where: { id: p(req.params.id) }, data: { deletedAt: new Date() } });
    return ok(res, { deleted: true }, 'Đã xoá đánh giá');
  }),
);

export default reviewRoutes;
