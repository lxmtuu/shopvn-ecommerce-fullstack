'use client';

import { useEffect, useState } from 'react';

/** Debounce giá trị — dùng cho ô tìm kiếm (gõ 300ms mới gọi API) */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
