import multer from 'multer';
import { env } from '../config/env.js';
import { ALLOWED_IMAGE_MIME, MAX_IMAGES_PER_UPLOAD } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';

/**
 * Lưu file trong BỘ NHỚ (không ghi thẳng ra disk) để còn kiểm tra magic bytes
 * và resize bằng sharp trước khi ghi vào storage.
 */
const storage = multer.memoryStorage();

export const uploadImages = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: MAX_IMAGES_PER_UPLOAD,
    fields: 20,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
      return cb(AppError.badRequest(`Chỉ nhận file ảnh (${ALLOWED_IMAGE_MIME.map((m) => m.replace('image/', '')).join(', ')})`));
    }
    cb(null, true);
  },
}).array('files', MAX_IMAGES_PER_UPLOAD);

export const uploadSingle = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
}).single('file');
