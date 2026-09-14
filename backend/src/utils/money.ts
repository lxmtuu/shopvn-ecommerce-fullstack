import { Prisma } from '@prisma/client';

export type MoneyInput = number | string | Prisma.Decimal;

export const D = (v: MoneyInput = 0) => new Prisma.Decimal(v);

export const add = (a: MoneyInput, b: MoneyInput) => D(a).plus(D(b));
export const sub = (a: MoneyInput, b: MoneyInput) => D(a).minus(D(b));
export const mul = (a: MoneyInput, b: MoneyInput) => D(a).times(D(b));

/** Làm tròn 2 chữ số thập phân (banker-safe cho tiền) */
export const round2 = (v: MoneyInput) => D(v).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

/**
 * Decimal → string để trả JSON (tránh mất chính xác của Number).
 * Có overload: input không-null ⇒ trả `string` (giúp TypeScript không phải check null ở mọi chỗ dùng).
 */
export function money(v: MoneyInput): string;
export function money(v: MoneyInput | null | undefined): string | null;
export function money(v: MoneyInput | null | undefined): string | null {
  return v == null ? null : round2(v).toFixed(2);
}

export const formatVND = (v: MoneyInput) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(D(v).toString()));

/** Số tiền chuyển khoản phải là số nguyên VND */
export const toVNDInteger = (v: MoneyInput) => Math.round(Number(D(v).toString()));

export function calcDiscount(
  type: 'PERCENT' | 'FIXED',
  value: MoneyInput,
  subtotal: MoneyInput,
  maxDiscount?: MoneyInput | null,
): Prisma.Decimal {
  const raw = type === 'PERCENT' ? mul(subtotal, D(value).div(100)) : D(value);
  const capped = maxDiscount ? Prisma.Decimal.min(raw, D(maxDiscount)) : raw;
  // Không bao giờ giảm quá giá trị đơn hàng
  return round2(Prisma.Decimal.max(Prisma.Decimal.min(capped, D(subtotal)), 0));
}
