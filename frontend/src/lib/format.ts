export const formatVND = (value: string | number | null | undefined) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    Number(value ?? 0),
  );

export const formatNumber = (value: string | number | null | undefined) =>
  new Intl.NumberFormat('vi-VN').format(Number(value ?? 0));

export const formatDate = (value: string | Date | null | undefined, withTime = false) => {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

export const formatRelative = (value: string | Date) => {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return formatDate(value);
};

export const discountPercent = (price: string | number, salePrice?: string | number | null) => {
  if (!salePrice || Number(salePrice) >= Number(price)) return 0;
  return Math.round((1 - Number(salePrice) / Number(price)) * 100);
};

export const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  CONFIRMED: { label: 'Đã xác nhận', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  PACKING: { label: 'Đang đóng gói', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  SHIPPING: { label: 'Đang giao hàng', className: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300' },
  DELIVERED: { label: 'Đã giao hàng', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  CANCELLED: { label: 'Đã huỷ', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  RETURN_REQUESTED: { label: 'Yêu cầu trả hàng', className: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
  RETURNED: { label: 'Đã trả hàng', className: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  REFUNDED: { label: 'Đã hoàn tiền', className: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
};

export const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  UNPAID: { label: 'Chưa thanh toán', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  PENDING_REVIEW: { label: 'Chờ duyệt', className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' },
  PAID: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  UNDERPAID: { label: 'Chuyển thiếu', className: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
  FAILED: { label: 'Thất bại', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  REFUNDED: { label: 'Đã hoàn tiền', className: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng / QR',
  VNPAY: 'Ví VNPay',
  MOMO: 'Ví MoMo',
};

export const SHIPPING_LABEL: Record<string, { label: string; desc: string; fee: number }> = {
  STANDARD: { label: 'Giao tiêu chuẩn', desc: '3–5 ngày làm việc', fee: 30000 },
  EXPRESS: { label: 'Giao nhanh', desc: '1–2 ngày làm việc', fee: 50000 },
  INSTANT: { label: 'Giao hoả tốc', desc: 'Trong ngày (nội thành)', fee: 80000 },
};

export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
