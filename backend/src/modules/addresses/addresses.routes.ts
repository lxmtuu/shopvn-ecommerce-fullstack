import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';
import { p } from "../../utils/params.js";

const router = Router();
router.use(requireAuth);

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Vui lòng nhập tên người nhận').max(80),
  phone: z.string().trim().regex(/^(0|\+84)(3|5|7|8|9)\d{8}$/, 'Số điện thoại không hợp lệ'),
  provinceCode: z.string().optional().nullable(),
  provinceName: z.string().trim().min(1, 'Chọn tỉnh/thành phố'),
  districtName: z.string().optional().nullable(),
  wardName: z.string().optional().nullable(),
  detail: z.string().trim().min(5, 'Vui lòng nhập địa chỉ chi tiết').max(200),
  note: z.string().max(200).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return ok(res, addresses);
  }),
);

router.post(
  '/',
  validateBody(addressSchema),
  asyncHandler(async (req, res) => {
    const count = await prisma.address.count({ where: { userId: req.user!.id } });
    if (count >= 10) throw AppError.conflict('Bạn chỉ có thể lưu tối đa 10 địa chỉ. Hãy xoá bớt địa chỉ cũ.');

    const isFirst = count === 0;
    const address = await prisma.$transaction(async (tx) => {
      if (req.body.isDefault || isFirst) {
        await tx.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
      }
      return tx.address.create({ data: { ...req.body, userId: req.user!.id, isDefault: req.body.isDefault || isFirst } });
    });

    return res.status(201).json({ success: true, message: 'Đã thêm địa chỉ', data: address });
  }),
);

router.patch(
  '/:id',
  validateBody(addressSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({ where: { id: p(req.params.id), userId: req.user!.id } });
    if (!existing) throw AppError.notFound('Không tìm thấy địa chỉ');

    const address = await prisma.$transaction(async (tx) => {
      if (req.body.isDefault) {
        await tx.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id: p(req.params.id) }, data: req.body });
    });
    return ok(res, address, 'Đã cập nhật địa chỉ');
  }),
);

router.patch(
  '/:id/default',
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({ where: { id: p(req.params.id), userId: req.user!.id } });
    if (!existing) throw AppError.notFound('Không tìm thấy địa chỉ');

    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } }),
      prisma.address.update({ where: { id: p(req.params.id) }, data: { isDefault: true } }),
    ]);
    return ok(res, { id: p(req.params.id), isDefault: true }, 'Đã đặt làm địa chỉ mặc định');
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({ where: { id: p(req.params.id), userId: req.user!.id } });
    if (!existing) throw AppError.notFound('Không tìm thấy địa chỉ');

    await prisma.address.delete({ where: { id: p(req.params.id) } });
    // Nếu vừa xoá địa chỉ mặc định → đặt địa chỉ mới nhất làm mặc định
    if (existing.isDefault) {
      const next = await prisma.address.findFirst({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
      if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return ok(res, { deleted: true }, 'Đã xoá địa chỉ');
  }),
);

export default router;
