import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validateBody } from '../../middlewares/validate.js';
import { ok } from '../../utils/response.js';
import { categoriesService } from './categories.service.js';
import { p } from "../../utils/params.js";

const categoryInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(500).optional(),
  parentId: z.string().nullable().optional(),
  imageUrl: z.string().optional(),
  iconName: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDesc: z.string().max(160).optional(),
});

export const categoryRoutes = Router();
categoryRoutes.get(
  '/',
  asyncHandler(async (_req, res) => ok(res, await categoriesService.tree())),
);
categoryRoutes.get(
  '/:slug',
  asyncHandler(async (req, res) => ok(res, await categoriesService.bySlug(p(req.params.slug)))),
);

/** Gắn vào /admin/categories — yêu cầu role ADMIN ở router cha */
export const adminCategoryRoutes = Router();
adminCategoryRoutes.get('/', asyncHandler(async (_req, res) => ok(res, await categoriesService.tree(true))));
adminCategoryRoutes.post(
  '/',
  validateBody(categoryInput),
  asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Tạo danh mục thành công', data: await categoriesService.create(req.body) })),
);
adminCategoryRoutes.patch(
  '/:id',
  validateBody(categoryInput.partial()),
  asyncHandler(async (req, res) => ok(res, await categoriesService.update(p(req.params.id), req.body), 'Cập nhật danh mục thành công')),
);
adminCategoryRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => ok(res, await categoriesService.remove(p(req.params.id)), 'Đã xoá danh mục')),
);

export default categoryRoutes;
