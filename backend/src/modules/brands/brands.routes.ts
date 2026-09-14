import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { validateBody } from '../../middlewares/validate.js';
import { toUniqueSlug } from '../../utils/slug.js';
import { p } from "../../utils/params.js";

const brandInput = z.object({
  name: z.string().trim().min(1).max(100),
  logoUrl: z.string().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const brandRoutes = Router();
brandRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const brands = await prisma.brand.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { deletedAt: null, isActive: true } } } } },
    });
    return ok(res, brands.map((b) => ({ ...b, productCount: b._count.products })));
  }),
);

export const adminBrandRoutes = Router();
adminBrandRoutes.get(
  '/',
  asyncHandler(async (_req, res) => ok(res, await prisma.brand.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }))),
);
adminBrandRoutes.post(
  '/',
  validateBody(brandInput),
  asyncHandler(async (req, res) => {
    const slug = await toUniqueSlug(req.body.name, async (s) => Boolean(await prisma.brand.findUnique({ where: { slug: s } })));
    const brand = await prisma.brand.create({ data: { ...req.body, slug } });
    return res.status(201).json({ success: true, message: 'Tạo thương hiệu thành công', data: brand });
  }),
);
adminBrandRoutes.patch(
  '/:id',
  validateBody(brandInput.partial()),
  asyncHandler(async (req, res) => ok(res, await prisma.brand.update({ where: { id: p(req.params.id) }, data: req.body }), 'Cập nhật thương hiệu thành công')),
);
adminBrandRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => ok(res, await prisma.brand.update({ where: { id: p(req.params.id) }, data: { deletedAt: new Date(), isActive: false } }), 'Đã xoá thương hiệu')),
);

export default brandRoutes;
