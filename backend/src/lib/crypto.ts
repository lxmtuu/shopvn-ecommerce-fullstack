import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token thô 32 byte → gửi cho người dùng. DB chỉ lưu hash SHA-256. */
export const generateToken = () => randomBytes(32).toString('hex');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** So sánh chuỗi an toàn với timing attack */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const randomId = (bytes = 16) => randomBytes(bytes).toString('hex');
