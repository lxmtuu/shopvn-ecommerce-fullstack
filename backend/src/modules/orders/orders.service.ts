import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { D, money } from '../../utils/money.js';
import { generateOrderCode } from '../../utils/orderCode.js';
import { buildVietQRPayload, bankNameOf } from '../../lib/vietqr.js';
import { mailer } from '../../lib/mailer.js';
import { logger } from '../../lib/logger.js';
import { buildMeta, parsePagination } from '../../utils/pagination.js';
import { CANCELLABLE_BY_CUSTOMER, ORDER_TRANSITIONS } from '../../config/constants.js';
import { validateCoupon } from '../coupons/coupons.service.js';
import { restoreStock, linesOfOrderItems } from '../../lib/stock.js';
import { calcShippingFee, getShippingConfig } from '../../lib/shipping.js';
import type { CreateOrderInput, OrderQuery } from './orders.schema.js';

const ITEM_SNAPSHOT_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      salePrice: true,
      stock: true,
      sku: true,
      categoryId: true,
      isActive: true,
      deletedAt: true,
      images: { where: { isPrimary: true }, take: 1, select: { cardUrl: true, url: true } },
    },
  },
  variant: { select: { id: true, name: true, price: true, salePrice: true, stock: true, sku: true, imageUrl: true } },
} satisfies Prisma.CartItemInclude;

const detailInclude = {
  items: true,
  payment: true,
  history: { orderBy: { createdAt: 'asc' as const } },
  address: true,
} satisfies Prisma.OrderInclude;

function serializeOrder(order: Prisma.OrderGetPayload<{ include: typeof detailInclude }>) {
  return {
    ...order,
    subtotal: money(order.subtotal),
    shippingFee: money(order.shippingFee),
    discountAmount: money(order.discountAmount),
    totalAmount: money(order.totalAmount),
    items: order.items.map((i) => ({ ...i, unitPrice: money(i.unitPrice), totalPrice: money(i.totalPrice) })),
    payment: order.payment
      ? { ...order.payment, amount: money(order.payment.amount), paidAmount: money(order.payment.paidAmount) }
      : null,
  };
}

/** Tìm mã đơn chưa dùng — retry khi trùng (xác suất thấp nhưng phải chắc chắn) */
async function uniqueOrderCode(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateOrderCode();
    const exists = await tx.order.findUnique({ where: { orderCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  throw AppError.conflict('Không sinh được mã đơn, vui lòng thử lại');
}

type CartWithItems = Prisma.CartGetPayload<{ include: { items: { include: typeof ITEM_SNAPSHOT_INCLUDE } } }>;

interface PricedLine {
  item: CartWithItems['items'][number];
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}

function priceItems(cart: CartWithItems): PricedLine[] {
  return cart.items.map((item) => {
    const src = item.variant ?? item.product;
    const unitPrice = src.salePrice && Number(src.salePrice) < Number(src.price) ? src.salePrice : src.price;
    return { item, unitPrice, lineTotal: D(unitPrice).times(item.quantity) };
  });
}

export const ordersService = {
  /**
   * ══════════════════════════════════════════════════════════════════════════
   *  TẠO ĐƠN HÀNG — toàn bộ nằm trong 1 transaction.
   *  Đây là chỗ dễ sai nhất của một sàn TMĐT, nên được xử lý kỹ:
   *   1. Giá & tổng tiền được TÍNH LẠI Ở SERVER (không tin client)
   *   2. Trừ kho bằng điều kiện nguyên tử `stock >= qty` → chống oversell khi 2 người mua cùng lúc
   *   3. Mã đơn trùng → retry
   *   4. Đơn chuyển khoản: sinh luôn transferCode + payload QR để trang thanh toán hiện ngay
   * ══════════════════════════════════════════════════════════════════════════
   */
  async create(userId: string, input: CreateOrderInput) {
    const order = await prisma.$transaction(async (tx) => {
      // ── 1. Lấy giỏ hàng ───────────────────────────────────────────────────
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: ITEM_SNAPSHOT_INCLUDE } },
      });
      if (!cart || cart.items.length === 0) throw AppError.badRequest('Giỏ hàng của bạn đang trống');

      // ── 2. Kiểm tra sản phẩm còn bán & đủ tồn kho ─────────────────────────
      for (const { item } of priceItems(cart)) {
        if (item.product.deletedAt || !item.product.isActive) {
          throw AppError.conflict(`"${item.product.name}" đã ngừng kinh doanh, vui lòng xoá khỏi giỏ hàng`, 'OUT_OF_STOCK');
        }
        const available = item.variant ? item.variant.stock : item.product.stock;
        if (available < item.quantity) {
          throw AppError.conflict(
            `"${item.product.name}" chỉ còn ${available} sản phẩm trong kho`,
            'OUT_OF_STOCK',
          );
        }
      }

      // ── 3. Trừ kho NGUYÊN TỬ (điều kiện stock >= qty nằm trong câu UPDATE) ─
      for (const { item } of priceItems(cart)) {
        const affected = item.variant
          ? await tx.$executeRaw`
              UPDATE "product_variants" SET "stock" = "stock" - ${item.quantity}
              WHERE "id" = ${item.variant.id} AND "stock" >= ${item.quantity}`
          : await tx.$executeRaw`
              UPDATE "products" SET "stock" = "stock" - ${item.quantity}
              WHERE "id" = ${item.product.id} AND "stock" >= ${item.quantity} AND "deletedAt" IS NULL`;

        if (affected === 0) {
          // Có người vừa mua hết hàng trong lúc ta đang xử lý → huỷ toàn bộ transaction
          throw AppError.conflict(`"${item.product.name}" vừa hết hàng, vui lòng thử lại`, 'OUT_OF_STOCK');
        }

        // Nếu là biến thể, đồng bộ luôn tồn kho tổng của sản phẩm
        if (item.variant) {
          await tx.$executeRaw`
            UPDATE "products" SET "stock" = "stock" - ${item.quantity} WHERE "id" = ${item.product.id}`;
        }
      }

      // ── 4. Tính tiền (server là nguồn sự thật duy nhất) ───────────────────
      const lines = priceItems(cart);
      const subtotal = lines.reduce((s, l) => s.plus(l.lineTotal), D(0));

      // Phí ship lấy từ Cấu hình shop (fallback .env) — xem lib/shipping.ts
      const shippingConfig = await getShippingConfig();
      const shippingFee = D(calcShippingFee(input.shippingMethod, subtotal, shippingConfig));

      let discount = D(0);
      let couponId: string | null = null;
      let couponCode: string | null = null;
      if (input.couponCode) {
        const result = await validateCoupon(
          input.couponCode,
          lines.map((l) => ({
            productId: l.item.productId,
            categoryId: l.item.product.categoryId,
            unitPrice: l.unitPrice,
            quantity: l.item.quantity,
          })),
          userId,
          tx,
        );
        discount = result.discount;
        couponId = result.coupon.id;
        couponCode = result.coupon.code;
      }

      const total = Prisma.Decimal.max(subtotal.plus(shippingFee).minus(discount), D(0));

      // ── 5. Snapshot địa chỉ giao hàng ─────────────────────────────────────
      let shippingAddress: Prisma.InputJsonValue;
      let recipientName = input.recipientName ?? '';
      let recipientPhone = input.recipientPhone ?? '';

      if (input.addressId) {
        const address = await tx.address.findFirst({ where: { id: input.addressId, userId } });
        if (!address) throw AppError.notFound('Không tìm thấy địa chỉ giao hàng');
        shippingAddress = {
          fullName: address.fullName,
          phone: address.phone,
          provinceName: address.provinceName,
          districtName: address.districtName,
          wardName: address.wardName,
          detail: address.detail,
        } as Prisma.InputJsonValue;
        recipientName = address.fullName;
        recipientPhone = address.phone;
      } else {
        if (!input.recipientName || !input.recipientPhone || !input.provinceName || !input.detail) {
          throw AppError.badRequest('Vui lòng cung cấp đầy đủ thông tin người nhận và địa chỉ giao hàng');
        }
        shippingAddress = {
          fullName: input.recipientName,
          phone: input.recipientPhone,
          provinceName: input.provinceName,
          districtName: input.districtName ?? null,
          wardName: input.wardName ?? null,
          detail: input.detail,
        } as Prisma.InputJsonValue;
      }

      // ── 6. Tạo đơn + items + lịch sử + thanh toán ─────────────────────────
      const orderCode = await uniqueOrderCode(tx);
      const paymentDueAt =
        input.paymentMethod === 'BANK_TRANSFER'
          ? new Date(Date.now() + env.ORDER_PAYMENT_TTL_MINUTES * 60 * 1000)
          : null;

      const created = await tx.order.create({
        data: {
          orderCode,
          userId,
          addressId: input.addressId ?? null,
          status: input.paymentMethod === 'BANK_TRANSFER' ? 'PENDING_PAYMENT' : 'CONFIRMED',
          paymentMethod: input.paymentMethod,
          paymentStatus: 'UNPAID',
          shippingAddress,
          recipientName,
          recipientPhone,
          shippingMethod: input.shippingMethod,
          subtotal,
          shippingFee,
          discountAmount: discount,
          totalAmount: total,
          couponCode,
          note: input.note ?? null,
          paymentDueAt,
          confirmedAt: input.paymentMethod === 'BANK_TRANSFER' ? null : new Date(),
          items: {
            create: lines.map((l) => ({
              productId: l.item.productId,
              variantId: l.item.variantId,
              productName: l.item.product.name,
              variantName: l.item.variant?.name ?? null,
              productSlug: l.item.product.slug,
              sku: l.item.variant?.sku ?? l.item.product.sku,
              imageUrl: l.item.variant?.imageUrl ?? l.item.product.images[0]?.cardUrl ?? l.item.product.images[0]?.url ?? null,
              unitPrice: l.unitPrice,
              quantity: l.item.quantity,
              totalPrice: l.lineTotal,
            })),
          },
          history: {
            create: {
              status: input.paymentMethod === 'BANK_TRANSFER' ? 'PENDING_PAYMENT' : 'CONFIRMED',
              note:
                input.paymentMethod === 'BANK_TRANSFER'
                  ? 'Đơn hàng đã tạo, đang chờ thanh toán chuyển khoản'
                  : 'Đơn hàng đã tạo (thanh toán khi nhận hàng)',
              changedBy: userId,
            },
          },
          payment: {
            create: {
              method: input.paymentMethod,
              amount: total,
              status: 'UNPAID',
              transferCode: orderCode,
              bankBin: env.BANK_BIN,
              bankAccountNo: env.BANK_ACCOUNT_NO,
              bankAccountName: env.BANK_ACCOUNT_NAME,
              expiresAt: paymentDueAt,
              qrPayload:
                input.paymentMethod === 'BANK_TRANSFER'
                  ? buildVietQRPayload({
                      bankBin: env.BANK_BIN,
                      accountNo: env.BANK_ACCOUNT_NO,
                      accountName: env.BANK_ACCOUNT_NAME,
                      amount: Math.round(Number(total.toString())),
                      orderCode,
                    })
                  : null,
            },
          },
        },
        include: detailInclude,
      });

      // ── 7. Ghi nhận dùng coupon ───────────────────────────────────────────
      if (couponId && couponCode) {
        await tx.couponRedemption.create({
          data: { couponId, code: couponCode, userId, orderId: created.id, amount: discount },
        });
        await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      }

      // ── 8. Ghi vết tồn kho + tăng sold + xoá giỏ ──────────────────────────
      for (const l of lines) {
        await tx.stockMovement.create({
          data: {
            productId: l.item.productId,
            variantId: l.item.variantId,
            userId,
            change: -l.item.quantity,
            before: (l.item.variant?.stock ?? l.item.product.stock) + l.item.quantity,
            after: l.item.variant?.stock ?? l.item.product.stock,
            reason: 'PURCHASE',
            reference: orderCode,
          },
        });
      }
      // Cộng `sold` theo ĐÚNG số lượng từng dòng (gộp theo sản phẩm để giảm số câu lệnh)
      const soldByProduct = new Map<string, number>();
      for (const l of lines) {
        soldByProduct.set(l.item.productId, (soldByProduct.get(l.item.productId) ?? 0) + l.item.quantity);
      }
      for (const [productId, qty] of soldByProduct) {
        await tx.product.update({ where: { id: productId }, data: { sold: { increment: qty } } });
      }
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    }, { timeout: 15000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // ── 9. Gửi email (ngoài transaction: mail lỗi không được làm hỏng đơn) ────
    void this.sendOrderEmails(order.id).catch((err) => logger.error({ err, orderId: order.id }, 'Gửi mail đơn hàng thất bại'));

    return serializeOrder(order);
  },

  /** Gửi email xác nhận hoặc hướng dẫn thanh toán tuỳ phương thức */
  async sendOrderEmails(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true, user: { select: { email: true, fullName: true } } },
    });
    if (!order) return;

    const base = {
      orderCode: order.orderCode,
      fullName: order.user.fullName,
      subtotal: order.subtotal.toString(),
      shippingFee: order.shippingFee.toString(),
      discountAmount: order.discountAmount.toString(),
      totalAmount: order.totalAmount.toString(),
      link: `${env.CLIENT_URL}/account/orders/${order.orderCode}`,
    };

    if (order.paymentMethod === 'BANK_TRANSFER') {
      await mailer.paymentInstructions(order.user.email, {
        orderCode: order.orderCode,
        fullName: order.user.fullName,
        amount: order.totalAmount.toString(),
        bankName: bankNameOf(env.BANK_BIN),
        accountNo: env.BANK_ACCOUNT_NO,
        accountName: env.BANK_ACCOUNT_NAME,
        content: order.orderCode,
        link: `${env.CLIENT_URL}/order-success/${order.orderCode}`,
        expiresAt: order.paymentDueAt?.toLocaleString('vi-VN') ?? '24 giờ',
      });
    } else {
      await mailer.orderConfirmation(order.user.email, {
        ...base,
        items: order.items.map((i) => ({
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          unitPrice: i.unitPrice.toString(),
        })),
      });
    }
  },

  async list(userId: string, query: OrderQuery) {
    const { page, limit, skip } = parsePagination(query as unknown as Record<string, unknown>);
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.q ? { orderCode: { contains: query.q.toUpperCase() } } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { items: { take: 3 }, payment: { select: { status: true, method: true } }, _count: { select: { items: true } } },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => ({
        id: o.id,
        orderCode: o.orderCode,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        totalAmount: money(o.totalAmount),
        itemCount: o._count.items,
        previewItems: o.items.map((i) => ({ name: i.productName, image: i.imageUrl, quantity: i.quantity })),
        createdAt: o.createdAt,
        paymentDueAt: o.paymentDueAt,
        canCancel: CANCELLABLE_BY_CUSTOMER.includes(o.status),
      })),
      meta: buildMeta(total, { page, limit }),
    };
  },

  /** Chi tiết đơn — CHỈ chủ đơn hoặc admin (chống IDOR) */
  async detail(orderCode: string, userId: string, isAdmin = false) {
    const order = await prisma.order.findUnique({ where: { orderCode }, include: detailInclude });
    if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');
    if (!isAdmin && order.userId !== userId) throw AppError.notFound('Không tìm thấy đơn hàng');

    return {
      ...serializeOrder(order),
      canCancel: CANCELLABLE_BY_CUSTOMER.includes(order.status),
      bankInfo:
        order.paymentMethod === 'BANK_TRANSFER' && order.payment
          ? {
              bankBin: env.BANK_BIN,
              bankName: bankNameOf(env.BANK_BIN),
              accountNo: env.BANK_ACCOUNT_NO,
              accountName: env.BANK_ACCOUNT_NAME,
              amount: money(order.totalAmount),
              content: order.orderCode,
            }
          : null,
    };
  },

  /** Huỷ đơn: hoàn kho + ghi lịch sử + email */
  async cancel(orderCode: string, userId: string, reason: string, isAdmin = false) {
    const order = await prisma.order.findUnique({ where: { orderCode }, include: { items: true, user: true } });
    if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');
    if (!isAdmin && order.userId !== userId) throw AppError.notFound('Không tìm thấy đơn hàng');

    if (!isAdmin && !CANCELLABLE_BY_CUSTOMER.includes(order.status)) {
      throw AppError.conflict('Đơn hàng đang giao hoặc đã hoàn thành, không thể huỷ. Vui lòng liên hệ hotline 1900 1234.', 'INVALID_STATUS_TRANSITION');
    }
    if (['CANCELLED', 'DELIVERED', 'REFUNDED', 'RETURNED'].includes(order.status)) {
      throw AppError.conflict('Đơn hàng ở trạng thái không thể huỷ', 'INVALID_STATUS_TRANSITION');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Hoàn kho (dùng chung lib/stock.ts để mọi luồng huỷ đều nhất quán)
      await restoreStock(tx, linesOfOrderItems(order.items), {
        reason: 'ORDER_CANCELLED',
        reference: orderCode,
        userId,
      });

      await tx.payment.updateMany({
        where: { orderId: order.id, status: { in: ['UNPAID', 'PENDING_REVIEW'] } },
        data: { status: 'FAILED' },
      });

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
          // Chỉ đánh dấu FAILED khi chưa thu được tiền — đơn đã PAID sẽ được hoàn tiền riêng
          ...(order.paymentStatus === 'PAID' ? {} : { paymentStatus: 'FAILED' as const }),
          history: {
            create: {
              status: 'CANCELLED',
              note: reason,
              changedBy: userId,
            },
          },
        },
        include: detailInclude,
      });
    });

    void mailer.orderCancelled(order.user.email, {
      orderCode: order.orderCode,
      fullName: order.user.fullName,
      reason,
      refundInfo:
        order.paymentStatus === 'PAID' || order.paymentStatus === 'PENDING_REVIEW'
          ? 'Chúng tôi sẽ hoàn tiền trong 1–3 ngày làm việc.'
          : undefined,
      link: `${env.CLIENT_URL}/account/orders/${order.orderCode}`,
    });

    return serializeOrder(updated);
  },

  /** Mua lại: đưa các item còn bán được vào giỏ */
  async reorder(orderCode: string, userId: string) {
    const order = await prisma.order.findUnique({ where: { orderCode }, include: { items: true } });
    if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');
    if (order.userId !== userId) throw AppError.notFound('Không tìm thấy đơn hàng');

    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });

    const skipped: string[] = [];
    for (const item of order.items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, deletedAt: null, isActive: true },
        select: { id: true, stock: true },
      });
      if (!product || product.stock <= 0) {
        skipped.push(item.productName);
        continue;
      }

      const quantity = Math.min(item.quantity, product.stock);
      const existing = await prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId: item.productId, variantId: item.variantId },
      });
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Math.min(existing.quantity + quantity, product.stock) },
        });
      } else {
        await prisma.cartItem.create({
          data: { cartId: cart.id, productId: item.productId, variantId: item.variantId, quantity },
        });
      }
    }

    return { added: order.items.length - skipped.length, skipped };
  },

  async requestReturn(orderCode: string, userId: string, reason: string, images: string[] = []) {
    const order = await prisma.order.findUnique({ where: { orderCode }, include: { user: true } });
    if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');
    if (order.userId !== userId) throw AppError.notFound('Không tìm thấy đơn hàng');
    if (order.status !== 'DELIVERED') throw AppError.conflict('Chỉ có thể yêu cầu trả hàng với đơn đã giao', 'INVALID_STATUS_TRANSITION');

    const daysSinceDelivered = order.deliveredAt ? (Date.now() - order.deliveredAt.getTime()) / 86400000 : 999;
    if (daysSinceDelivered > 7) throw AppError.conflict('Đã quá 7 ngày kể từ khi nhận hàng, không thể yêu cầu trả hàng');

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'RETURN_REQUESTED',
        history: { create: { status: 'RETURN_REQUESTED', note: `${reason}${images.length ? ` | Ảnh: ${images.join(', ')}` : ''}`, changedBy: userId } },
      },
      include: detailInclude,
    });

    return serializeOrder(updated);
  },

  // ── ADMIN ────────────────────────────────────────────────────────────────
  async adminList(query: OrderQuery & { from?: string; to?: string }) {
    const { page, limit, skip } = parsePagination(query as unknown as Record<string, unknown>);
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.q
        ? {
            OR: [
              { orderCode: { contains: query.q.toUpperCase() } },
              { recipientName: { contains: query.q, mode: 'insensitive' } },
              { recipientPhone: { contains: query.q } },
              { user: { email: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const [orders, total, aggregates] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          items: { take: 2 },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
      prisma.order.aggregate({ where, _sum: { totalAmount: true } }),
    ]);

    return {
      data: orders.map((o) => ({
        ...o,
        totalAmount: money(o.totalAmount),
        itemCount: o._count.items,
        items: o.items.map((i) => ({ name: i.productName, image: i.imageUrl, quantity: i.quantity })),
      })),
      meta: { ...buildMeta(total, { page, limit }), totalRevenue: money(aggregates._sum.totalAmount ?? 0) },
    };
  },

  /**
   * Cập nhật trạng thái đơn — KIỂM TRA STATE MACHINE.
   * Không cho nhảy cóc kiểu PENDING_PAYMENT → DELIVERED.
   */
  async updateStatus(orderId: string, newStatus: string, adminId: string, note?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true, items: true } });
    if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');

    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw AppError.conflict(
        `Không thể chuyển từ "${order.status}" sang "${newStatus}". Trạng thái hợp lệ: ${allowed.join(', ') || 'không có'}`,
        'INVALID_STATUS_TRANSITION',
      );
    }

    /**
     * Huỷ đơn phải đi qua cancel(): hoàn kho + đánh dấu payment FAILED + email cho khách.
     * Trước đây nhánh này chỉ set status/cancelledAt ⇒ hàng bị giữ trong kho vĩnh viễn.
     */
    if (newStatus === 'CANCELLED') {
      const cancelled = await this.cancel(
        order.orderCode,
        adminId,
        note?.trim() || 'Shop huỷ đơn',
        true,
      );
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'order.status_update',
          entity: 'Order',
          entityId: orderId,
          before: { status: order.status },
          after: { status: 'CANCELLED', note },
        },
      });
      return cancelled;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const data: Prisma.OrderUpdateInput = {
        status: newStatus as Prisma.EnumOrderStatusFieldUpdateOperationsInput,
        history: { create: { status: newStatus as never, note, changedBy: adminId } },
      };
      if (newStatus === 'CONFIRMED') data.confirmedAt = new Date();
      if (newStatus === 'SHIPPING') data.shippedAt = new Date();
      if (newStatus === 'DELIVERED') data.deliveredAt = new Date();

      return tx.order.update({ where: { id: orderId }, data, include: detailInclude });
    });

    // Thông báo cho khách theo từng mốc
    if (newStatus === 'SHIPPING') {
      void mailer.shipping(order.user.email, {
        orderCode: order.orderCode,
        fullName: order.user.fullName,
        trackingCode: updated.trackingCode ?? undefined,
        link: `${env.CLIENT_URL}/account/orders/${order.orderCode}`,
      });
    }
    if (newStatus === 'DELIVERED') {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: 'ORDER',
          title: `Đơn ${order.orderCode} đã giao thành công`,
          body: 'Hãy dành chút thời gian đánh giá sản phẩm để nhận ưu đãi cho lần mua sau nhé!',
          link: `/products`,
        },
      });
    }

    await prisma.auditLog.create({
      data: { userId: adminId, action: 'order.status_update', entity: 'Order', entityId: orderId, before: { status: order.status }, after: { status: newStatus, note } },
    });

    return serializeOrder(updated);
  },
};
