import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const hashPassword = (plain: string) => bcrypt.hash(plain, env.BCRYPT_ROUNDS);

export const verifyPassword = (plain: string, hash: string | null) =>
  hash ? bcrypt.compare(plain, hash) : Promise.resolve(false);

/**
 * Kiểm tra độ mạnh mật khẩu — dùng chung với schema Zod ở FE.
 * Trả về mảng lỗi để hiển thị checklist cho người dùng.
 */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('Ít nhất 8 ký tự');
  if (!/[A-Z]/.test(password)) issues.push('Có ít nhất 1 chữ hoa');
  if (!/[a-z]/.test(password)) issues.push('Có ít nhất 1 chữ thường');
  if (!/\d/.test(password)) issues.push('Có ít nhất 1 chữ số');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('Có ít nhất 1 ký tự đặc biệt');
  return issues;
}

/** Mật khẩu phổ biến / bị rò rỉ — chặn ở tầng đăng ký & đổi mật khẩu */
export const COMMON_PASSWORDS = new Set([
  '12345678', 'password', '123456789', 'qwerty123', 'password1', 'abc12345',
  '1234567890', 'matkhau123', 'admin123', 'iloveyou', '11111111', 'password123',
]);

export const isCommonPassword = (p: string) => COMMON_PASSWORDS.has(p.toLowerCase());
