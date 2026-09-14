import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { ALLOWED_IMAGE_MIME } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';
import { logger } from './logger.js';

/**
 * Kiểm tra "magic bytes" — KHÔNG tin Content-Type do client gửi.
 * Kẻ tấn công có thể đổi đuôi .jpg thành file .svg chứa script.
 */
export function detectMimeFromBuffer(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  const hex = buf.subarray(0, 12).toString('hex').toLowerCase();
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (hex.startsWith('89504e47')) return 'image/png';
  if (hex.startsWith('47494638')) return 'image/gif';
  if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') return 'image/webp';
  if (hex.slice(8, 16) === '66747970' && (hex.includes('61766966') || hex.includes('61766973'))) return 'image/avif';
  return null;
}

export interface UploadedImage {
  url: string;
  thumbUrl: string;
  cardUrl: string;
  blurData: string;
  width: number;
  height: number;
  size: number;
  originalName: string;
}

/**
 * Xử lý 1 ảnh: kiểm tra → resize 3 kích cỡ → WebP → lưu storage.
 *   thumb 300  (giỏ hàng, danh sách nhỏ)
 *   card  600  (lưới sản phẩm)
 *   full  1200 (trang chi tiết)
 * Đồng thời sinh blurDataURL 10px để next/image dùng placeholder="blur" (không layout shift).
 */
export async function processImage(file: Express.Multer.File): Promise<UploadedImage> {
  const mime = detectMimeFromBuffer(file.buffer);
  if (!mime || !ALLOWED_IMAGE_MIME.includes(mime)) {
    throw AppError.badRequest('File không phải ảnh hợp lệ (chỉ nhận JPG, PNG, WebP, AVIF, GIF)');
  }

  const now = new Date();
  const dir = path.join(env.UPLOAD_DIR, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
  if (env.STORAGE_DRIVER === 'local') await fs.mkdir(dir, { recursive: true });

  const base = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const pipeline = sharp(file.buffer, { failOn: 'none' })
    .rotate() // tự xoay theo EXIF
    .withMetadata({ exif: {} }); // tước toàn bộ EXIF (chống lộ GPS, thông tin thiết bị)

  const meta = await sharp(file.buffer, { failOn: 'none' }).metadata();
  const sizes: Array<[string, number]> = [
    ['thumb', 300],
    ['card', 600],
    ['full', 1200],
  ];

  const results: Record<string, string> = {};
  for (const [key, width] of sizes) {
    const buf = await pipeline.clone().resize({ width, withoutEnlargement: true }).webp({ quality: key === 'thumb' ? 78 : 85 }).toBuffer();
    if (env.STORAGE_DRIVER === 'local') {
      const rel = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'), `${base}_${key}.webp`);
      await fs.writeFile(path.join(env.UPLOAD_DIR, rel), buf);
      results[key] = `${env.PUBLIC_UPLOAD_URL}/${rel.split(path.sep).join('/')}`;
    } else {
      // TODO: implement S3/R2 (xem docs/05) — hiện ném lỗi rõ ràng thay vì im lặng
      throw AppError.badRequest('STORAGE_DRIVER=s3/r2 chưa được cấu hình trong bản scaffold — dùng local hoặc bổ sung lib/storage.ts');
    }
  }

  const blurBuf = await pipeline.clone().resize({ width: 16 }).webp({ quality: 30 }).toBuffer();

  return {
    url: results.full,
    cardUrl: results.card,
    thumbUrl: results.thumb,
    blurData: `data:image/webp;base64,${blurBuf.toString('base64')}`,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    size: file.size,
    originalName: file.originalname,
  };
}

export async function deleteLocalFile(url: string): Promise<void> {
  if (env.STORAGE_DRIVER !== 'local') return;
  try {
    const rel = url.replace(`${env.PUBLIC_UPLOAD_URL}/`, '');
    await fs.unlink(path.join(env.UPLOAD_DIR, rel));
  } catch (err) {
    logger.warn({ err, url }, 'Không xoá được file (có thể đã bị xoá trước đó)');
  }
}
