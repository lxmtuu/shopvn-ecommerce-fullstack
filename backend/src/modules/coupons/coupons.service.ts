import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { calcDiscount, D, money } from '../../utils/money.js';

interface CartLine {
  productId: string;
  categoryId: string;
  unitPrice: Prisma.Decimal;
  quantity: number;
}

/**
 * Kiểm tra mã giảm giá và tính số tiền được giảm.
 * Trả lỗi CỤ THỂ để người dùng biết vì sao mã không dùng được — đây là UX quan trọng.
 */
export async function validateCoupon(code: string, lines: CartLine[], userId?: string, tx: Prisma.TransactionClient = prisma) {
  const coupon = await tx.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) throw AppError.conflict('Mã giảm giá không tồn tại', 'COUPON_INVALID');
  if (!coupon.isActive) throw AppError.conflict('Mã giảm giá đã bị vô hiệu hoá', 'COUPON_INVALID');
  if (coupon.startsAt > new Date()) throw AppError.conflict('Mã giảm giá chưa đến thời gian sử dụng', 'COUPON_INVALID');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw AppError.conflict('Mã giảm giá đã hết hạn', 'COUPON_INVALID');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw AppError.conflict('Mã giảm giá đã hết lượt sử dụng', 'COUPON_INVALID');
  }

  const subtotal = lines.reduce((s, l) => s.plus(D(l.unitPrice).times(l.quantity)), D(0));

  if (subtotal.lt(coupon.minOrderValue)) {
    throw AppError.conflict(
      `Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(Number(coupon.minOrderValue))}đ để dùng mã này`,
      'COUPON_INVALID',
    );
  }

  // Áp dụng theo phạm vi: toàn đơn / danh mục / sản phẩm
  let eligibleSubtotal = subtotal;
  if (coupon.target === 'CATEGORY') {
    eligibleSubtotal = lines.filter((l) => l.categoryId === coupon.categoryId).reduce((s, l) => s.plus(D(l.unitPrice).times(l.quantity)), D(0));
  } else if (coupon.target === 'PRODUCT') {
    eligibleSubtotal = lines.filter((l) => l.productId === coupon.productId).reduce((s, l) => s.plus(D(l.unitPrice).times(l.quantity)), D(0));
  }
  if (eligibleSubtotal.eq(0)) {
    throw AppError.conflict('Mã giảm giá không áp dụng cho sản phẩm trong giỏ hàng của bạn', 'COUPON_INVALID');
  }

  if (userId && coupon.usageLimitPerUser) {
    const usedByUser = await tx.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (usedByUser >= coupon.usageLimitPerUser) {
      throw AppError.conflict('Bạn đã sử dụng mã này rồi', 'COUPON_INVALID');
    }
  }

  const discount = calcDiscount(coupon.type, coupon.value, eligibleSubtotal, coupon.maxDiscount);

  return {
    coupon,
    discount,
    discountFormatted: money(discount),
    description:
      coupon.type === 'PERCENT'
        ? `Giảm ${Number(coupon.value)}%${coupon.maxDiscount ? ` (tối đa ${money(coupon.maxDiscount)}đ)` : ''}`
        : `Giảm ${money(coupon.value)}đ`,
  };
}

export const couponsService = {
  async validate(code: string, lines: CartLine[], userId?: string) {
    const result = await validateCoupon(code, lines, userId);
    return {
      valid: true,
      code: result.coupon.code,
      name: result.coupon.name,
      description: result.description,
      discountAmount: result.discountFormatted,
    };
  },

  /** Mã đang dùng được — hiển thị ở trang giỏ hàng để khách "săn" mã */
  async available(subtotal?: number) {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { value: 'desc' },
      take: 10,
    });
    return coupons
      .filter((c) => (c.usageLimit === null || c.usedCount < c.usageLimit))
      .map((c) => ({
        code: c.code,
        name: c.name,
        description: c.description,
        type: c.type,
        value: money(c.value),
        minOrderValue: money(c.minOrderValue),
        maxDiscount: c.maxDiscount ? money(c.maxDiscount) : null,
        expiresAt: c.expiresAt,
        eligible: subtotal === undefined ? null : D(subtotal).gte(c.minOrderValue),
      }));
  },

  // ── Admin CRUD ───────────────────────────────────────────────────────────
  async list() {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return coupons.map((c) => ({
      ...c,
      value: money(c.value),
      minOrderValue: money(c.minOrderValue),
      maxDiscount: c.maxDiscount ? money(c.maxDiscount) : null,
    }));
  },

  async create(input: Prisma.CouponUncheckedCreateInput & { code: string }) {
    const code = input.code.trim().toUpperCase();
    const exists = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
    if (exists) throw AppError.conflict('Mã giảm giá này đã tồn tại', 'COUPON_INVALID');
    return prisma.coupon.create({ data: { ...input, code } });
  },

  async update(id: string, input: Prisma.CouponUpdateInput) {
    return prisma.coupon.update({ where: { id }, data: input });
  },

  async remove(id: string) {
    return prisma.coupon.delete({ where: { id } });
  },
};
