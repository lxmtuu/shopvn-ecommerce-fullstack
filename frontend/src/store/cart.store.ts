'use client';

import { create } from 'zustand';
import { apiData, ApiError } from '@/lib/api';
import type { Cart } from '@/types';

interface CartState {
  cart: Cart | null;
  loading: boolean;
  /** Đang mở drawer giỏ hàng nhỏ ở góc phải */
  drawerOpen: boolean;
  /** id sản phẩm đang được thêm (để hiện spinner trên nút) */
  pendingId: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  fetch: () => Promise<void>;
  add: (productId: string, quantity?: number, variantId?: string | null) => Promise<{ ok: boolean; message: string }>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  reset: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,
  drawerOpen: false,
  pendingId: null,

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  fetch: async () => {
    set({ loading: true });
    try {
      const cart = await apiData<Cart>('/cart');
      set({ cart });
    } catch {
      /* khách vãng lai vẫn xem được giỏ, lỗi ở đây không cần chặn UI */
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Thêm vào giỏ. Trả về kết quả để UI hiện toast phù hợp
   * (hết hàng / vượt tồn kho là lỗi nghiệp vụ bình thường, không phải crash).
   */
  add: async (productId, quantity = 1, variantId = null) => {
    set({ pendingId: productId });
    try {
      const cart = await apiData<Cart>('/cart/items', { method: 'POST', body: { productId, quantity, variantId } });
      set({ cart, drawerOpen: true });
      return { ok: true, message: 'Đã thêm vào giỏ hàng' };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Không thêm được vào giỏ hàng';
      return { ok: false, message };
    } finally {
      set({ pendingId: null });
    }
  },

  updateQuantity: async (itemId, quantity) => {
    const previous = get().cart;
    // Cập nhật lạc quan (optimistic) để UI phản hồi tức thì
    if (previous) {
      set({
        cart: {
          ...previous,
          items: previous.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
        },
      });
    }
    try {
      const cart = await apiData<Cart>(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } });
      set({ cart });
    } catch (err) {
      if (previous) set({ cart: previous }); // rollback nếu server từ chối
      throw err;
    }
  },

  removeItem: async (itemId) => {
    const cart = await apiData<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' });
    set({ cart });
  },

  clear: async () => {
    const cart = await apiData<Cart>('/cart', { method: 'DELETE' });
    set({ cart });
  },

  reset: () => set({ cart: null, drawerOpen: false }),
}));
