import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * ESLint cho giao diện web (ESLint 9 — flat config).
 *
 * Trước đây package.json có `"lint": "next lint"` nhưng KHÔNG có config, KHÔNG
 * có dependency eslint ⇒ lệnh lint thực chất mở prompt cài đặt và không bao
 * giờ chạy. `next lint` cũng đã bị deprecate và sẽ bị xoá ở Next 16, nên dùng
 * thẳng ESLint CLI.
 */
const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Những rule "ồn" — giữ ở mức cảnh báo để CI vẫn chặn lỗi thật
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-hooks/exhaustive-deps': 'warn',
      // next/image là chuẩn của dự án, nhưng vài chỗ (QR base64, ảnh động) phải dùng <img>
      '@next/next/no-img-element': 'warn',
    },
  },
];

export default eslintConfig;
