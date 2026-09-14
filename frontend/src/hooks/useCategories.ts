'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFull } from '@/lib/api';
import type { Category } from '@/types';

/**
 * Danh mục dùng CHUNG cho toàn bộ ứng dụng.
 *
 * ⚠️ Vì sao phải có hook này?
 * Trước đây mỗi trang tự gọi `useQuery({ queryKey: ['categories'], ... })` với dạng
 * dữ liệu KHÁC NHAU:
 *   • Trang chủ / Sản phẩm / Header  →  apiFull  ⇒ cache giữ  { data: [...], meta }
 *   • Trang quản trị /admin/products →  apiData  ⇒ cần        [...]
 * React Query dùng chung một khoá nên chỉ lưu được MỘT dạng. Nếu người dùng mở trang
 * chủ trước (hoặc Header đã tải danh mục) rồi vào /admin/products, trang quản trị nhận
 * object và gọi `.map()` ⇒ sập cả app:  "Application error: a client-side exception".
 *
 * Hook này là nguồn duy nhất: luôn trả về MẢNG Category[] cho mọi trang.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFull<{ data: Category[] }>('/categories'),
    select: (r) => (Array.isArray(r?.data) ? r.data : []),
    staleTime: 5 * 60_000,
  });
}
