import multer from 'multer';
import { env } from '../config/env.js';
import { ALLOWED_IMAGE_MIME, MAX_IMAGES_PER_UPLOAD } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';

/**
 * Lưu file trong BỘ NHỚ (không ghi thẳng ra disk) để còn kiểm tra magic bytes
 * và resize bằng sharp trước khi ghi vào storage.
 */
const storage = multer.memoryStorage();

const limits = {
  fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  files: MAX_IMAGES_PER_UPLOAD,
  fields: 20,
};

/** Chặn sớm theo MIME khai báo (lớp thật sự chống giả mạo là magic bytes ở lib/storage.ts) */
const imageFilter = (_req: Express.Request, file: Express.Multer.File, cb: Express.Multer.FileFilterCallback) => {
  if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
    return cb(AppError.badRequest(`Chỉ nhận file ảnh (${ALLOWED_IMAGE_MIME.map((m) => m.replace('image/', '')).join(', ')})`));
  }
  cb(null, true);
};

/**
 * Upload NHIỀU ảnh.
 * Nhận cả 2 tên field vì giao diện quản trị gửi `images`, các nơi khác gửi `files`.
 * Dùng `.fields()` (không dùng `.any()`) để giới hạn cứng tên field được phép.
 * Kết quả nằm ở `req.files` dạng map → route tự làm phẳng.
 */
export const uploadImages = multer({ storage, limits, fileFilter: imageFilter }).fields([
  { name: 'files', maxCount: MAX_IMAGES_PER_UPLOAD },
  { name: 'images', maxCount: MAX_IMAGES_PER_UPLOAD },
]);

export const uploadSingle = multer({ storage, limits, fileFilter: imageFilter }).single('file');
