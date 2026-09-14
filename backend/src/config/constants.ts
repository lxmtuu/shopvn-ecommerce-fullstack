/** Hằng số dùng chung toàn hệ thống */
export const COOKIES = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  CSRF: 'csrf_token',
  CART: 'cart_id',
} as const;

export const REFRESH_PATH = '/api/v1/auth/refresh';

export const PAGINATION = { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 24, MAX_LIMIT: 100 } as const;

export const SHIPPING_FEE: Record<string, number> = {
  STANDARD: 30000,
  EXPRESS: 50000,
  INSTANT: 80000,
};

/** Máy trạng thái đơn hàng — chỉ cho phép chuyển theo bảng này */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKING', 'CANCELLED'],
  PACKING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

/** Trạng thái đơn có thể huỷ bởi khách */
export const CANCELLABLE_BY_CUSTOMER = ['PENDING_PAYMENT', 'CONFIRMED'];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  PACKING: 'Đang đóng gói',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã huỷ',
  RETURN_REQUESTED: 'Yêu cầu trả hàng',
  RETURNED: 'Đã trả hàng',
  REFUNDED: 'Đã hoàn tiền',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PENDING_REVIEW: 'Chờ duyệt thanh toán',
  PAID: 'Đã thanh toán',
  UNDERPAID: 'Chuyển thiếu tiền',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
export const MAX_IMAGES_PER_UPLOAD = 10;
