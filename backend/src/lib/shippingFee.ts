/**
 * ══════════════════════════════════════════════════════════════════════════
 *  CÔNG THỨC PHÍ VẬN CHUYỂN (thuần — không import DB/Redis)
 * ══════════════════════════════════════════════════════════════════════════
 *  Tách khỏi `shipping.ts` để test được công thức tính tiền mà không cần
 *  dựng Prisma Client / kết nối database.
 * ══════════════════════════════════════════════════════════════════════════
 */

export type ShippingMethodKey = 'STANDARD' | 'EXPRESS' | 'INSTANT';

export interface ShippingConfig {
  fees: Record<ShippingMethodKey, number>;
  freeShipThreshold: number;
}

/**
 * Tính phí ship cho 1 đơn.
 * Quy tắc:
 *   • INSTANT / EXPRESS: luôn thu đúng phí của phương thức đó
 *   • STANDARD: miễn phí khi subtotal ≥ ngưỡng freeship
 *   • Giỏ trống / subtotal ≤ 0 ⇒ 0đ
 *   • Phương thức lạ (dữ liệu cũ) ⇒ áp quy tắc STANDARD (nghiêng về phía thu
 *     tiền, không tặng phí ship vì một giá trị không nhận diện được)
 */
export function calcShippingFee(
  method: string,
  subtotal: { toString(): string } | number | string,
  config: ShippingConfig,
): number {
  const amount = Number(subtotal.toString());
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  if (method === 'INSTANT') return config.fees.INSTANT;
  if (method === 'EXPRESS') return config.fees.EXPRESS;
  return amount >= config.freeShipThreshold ? 0 : config.fees.STANDARD;
}
