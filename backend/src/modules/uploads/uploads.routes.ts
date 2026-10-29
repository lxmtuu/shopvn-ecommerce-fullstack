import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { uploadLimiter } from '../../middlewares/rateLimit.js';
import { uploadImages, uploadSingle } from '../../middlewares/upload.js';
import { processImage, deleteLocalFile, type UploadedImage } from '../../lib/storage.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { validateBody } from '../../middlewares/validate.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../lib/logger.js';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  UPLOAD ẢNH
 * ══════════════════════════════════════════════════════════════════════════
 *  • `POST /uploads/image`  — 1 ảnh (avatar, ảnh bill, ảnh đánh giá)
 *  • `POST /uploads/images` — nhiều ảnh (thư viện ảnh sản phẩm)
 *  • `DELETE /uploads`      — xoá ảnh đã tải lên (chỉ ADMIN)
 *
 *  Luồng xử lý nằm ở lib/storage.ts: kiểm tra MAGIC BYTES (không tin MIME do
 *  client khai) → xoay theo EXIF → tước EXIF → xuất 3 cỡ WebP (thumb/card/full)
 *  + blurDataURL 16px. Không bao giờ ghi file gốc của người dùng ra đĩa.
 *
 *  Tên field: multer nhận cả `files` và `images` cho endpoint nhiều ảnh, vì
 *  giao diện quản trị gửi `images` còn các nơi khác gửi `files`.
 * ══════════════════════════════════════════════════════════════════════════
 */

const router = Router();

// Mọi thao tác upload đều cần đăng nhập + có hạn mức riêng (chống spam đĩa)
router.use(requireAuth, uploadLimiter);

/** multer để file trong `req.files` dạng map { fieldName: File[] } khi dùng .fields() */
function flattenFiles(files: Express.Request['files']): Express.Multer.File[] {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return Object.values(files).flat();
}

/** Xử lý lần lượt từng ảnh — tránh ngốn RAM khi khách tải 10 ảnh 5MB cùng lúc */
async function processAll(files: Express.Multer.File[]): Promise<UploadedImage[]> {
  const out: UploadedImage[] = [];
  for (const file of files) out.push(await processImage(file));
  return out;
}

/** 1 ảnh — field: `file` */
router.post(
  '/image',
  uploadSingle,
  asyncHandler(async (req, res) => {
    if (!req.file) throw AppError.badRequest('Thiếu file ảnh (gửi kèm field "file")');
    const image = await processImage(req.file);
    return ok(res, image, 'Tải ảnh lên thành công');
  }),
);

/** Nhiều ảnh — field: `files` hoặc `images` */
router.post(
  '/images',
  uploadImages,
  asyncHandler(async (req, res) => {
    const files = flattenFiles(req.files);
    if (!files.length) throw AppError.badRequest('Thiếu file ảnh (gửi kèm field "files" hoặc "images")');
    const images = await processAll(files);
    return ok(res, images, `Đã tải lên ${images.length} ảnh`);
  }),
);

/**
 * Xoá ảnh theo URL công khai (chỉ ADMIN).
 * Chỉ cho xoá file nằm trong PUBLIC_UPLOAD_URL — tránh việc dùng endpoint này
 * để dò/xoá file ngoài thư mục upload.
 */
router.delete(
  '/',
  requireRole('ADMIN'),
  validateBody(z.object({ url: z.string().url().max(500) })),
  asyncHandler(async (req, res) => {
    const { url } = req.body as { url: string };
    await deleteLocalFile(url);
    logger.info({ url, adminId: req.user?.id }, '🗑️ Đã xoá ảnh upload');
    return ok(res, { deleted: true }, 'Đã xoá ảnh');
  }),
);

export default router;
