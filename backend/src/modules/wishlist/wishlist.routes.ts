import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';
import { money } from '../../utils/money.js';
import { p } from "../../utils/params.js";

const router = Router();
router.use(requireAuth);

const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  salePrice: true,
  stock: true,
  isActive: true,
  deletedAt: true,
  images: { where: { isPrimary: true }, take: 1, select: { cardUrl: true, url: true, thumbUrl: true } },
  brand: { select: { name: true, slug: true } },
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: productSelect } },
    });
    return ok(
      res,
      items.map((i) => {
        const p = i.product;
        const effective = p.salePrice && Number(p.salePrice) < Number(p.price) ? p.salePrice : p.price;
        return {
          id: i.id,
          productId: p.id,
          name: p.name,
          slug: p.slug,
          image: p.images[0]?.cardUrl ?? p.images[0]?.url ?? null,
          brand: p.brand,
          price: money(p.price),
          salePrice: p.salePrice ? money(p.salePrice) : null,
          effectivePrice: money(effective),
          inStock: p.stock > 0 && p.isActive && !p.deletedAt,
          stock: p.stock,
          addedAt: i.createdAt,
        };
      }),
      'Lấy danh sách yêu thích thành công',
    );
  }),
);

router.post(
  '/',
  validateBody(z.object({ productId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findFirst({ where: { id: req.body.productId, deletedAt: null }, select: { id: true } });
    if (!product) throw AppError.notFound('Sản phẩm không tồn tại');

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: req.user!.id, productId: req.body.productId } },
    });
    // Toggle: bấm lần 2 là bỏ yêu thích
    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      return ok(res, { wishlisted: false }, 'Đã xoá khỏi danh sách yêu thích');
    }

    await prisma.wishlistItem.create({ data: { userId: req.user!.id, productId: req.body.productId } });
    return ok(res, { wishlisted: true }, 'Đã thêm vào danh sách yêu thích');
  }),
);

router.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    await prisma.wishlistItem.deleteMany({ where: { userId: req.user!.id, productId: p(req.params.productId) } });
    return ok(res, { removed: true }, 'Đã xoá khỏi danh sách yêu thích');
  }),
);

export default router;
