'use client';

import { create } from 'zustand';
import { api, apiData, ApiError } from '@/lib/api';
import type { User } from '@/types';

/**
 * Cờ gợi ý "đã từng đăng nhập" — chỉ là 1 chuỗi '1' trong localStorage.
 * Mục đích: khách CHƯA đăng nhập thì không gọi /auth/me nữa,
 * tránh 2 lỗi 401 đỏ xuất hiện trong Console mỗi lần tải trang.
 * Không chứa token ⇒ không có rủi ro bảo mật.
 */
const AUTH_HINT = 'shopvn.auth';
// Bọc try/catch: trình duyệt có thể CHẶN localStorage (chế độ riêng tư, iframe sandbox…)
// → tuyệt đối không để việc này làm trắng trang.
const hasAuthHint = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(AUTH_HINT) === '1';
  } catch {
    return false;
  }
};
const setAuthHint = (on: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    if (on) window.localStorage.setItem(AUTH_HINT, '1');
    else window.localStorage.removeItem(AUTH_HINT);
  } catch {
    /* bị chặn thì bỏ qua — app vẫn chạy bình thường */
  }
};

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'guest';
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,

  /** Gọi 1 lần khi app khởi động để biết đã đăng nhập chưa (dựa vào cookie httpOnly) */
  bootstrap: async () => {
    // Khách vãng lai (chưa từng đăng nhập) → khỏi gọi API, tránh 401 thừa
    if (!hasAuthHint()) {
      set({ user: null, status: 'guest' });
      return;
    }
    set({ status: 'loading' });
    try {
      const user = await apiData<User>('/auth/me');
      set({ user, status: 'authenticated', error: null });
    } catch {
      setAuthHint(false); // cookie đã hết hạn/không còn hợp lệ
      set({ user: null, status: 'guest' });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    // Backend trả `{ data: { user } }` → phải bóc thêm 1 lớp
    const { user } = await apiData<{ user: User }>('/auth/login', { method: 'POST', body: { email, password } });
    setAuthHint(true);
    set({ user, status: 'authenticated' });

    // Gộp giỏ của khách vãng lai vào tài khoản (nếu có)
    await api('/cart/merge', { method: 'POST' }).catch(() => {});
    return user;
  },

  logout: async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
    setAuthHint(false);
    set({ user: null, status: 'guest' });
  },

  setUser: (user) => {
    setAuthHint(Boolean(user));
    set({ user, status: user ? 'authenticated' : 'guest' });
  },
}));
