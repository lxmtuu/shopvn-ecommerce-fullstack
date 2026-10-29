import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { mailer } from '../lib/mailer.js';
import { env } from '../config/env.js';
import { restoreStock, linesOfOrderItems } from '../lib/stock.js';

/**
 * Đơn chuyển khoản quá hạn (mặc định 24h) mà chưa thanh toán → HUỶ + HOÀN KHO.
 * Vì sao cần: nếu giữ đơn mãi, hàng bị "giam" trong đơn ảo, khách khác không mua được.
 */
export async function expireUnpaidOrders() {
  const now = new Date();

  const orders = await prisma.order.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      paymentDueAt: { lt: now },
      paymentStatus: { in: ['UNPAID', 'FAILED'] },
    },
    include: { items: true, user: { select: { email: true, fullName: true } } },
    take: 100,
  });

  let cancelled = 0;

  for (const order of orders) {
    try {
      await prisma.$transaction(async (tx) => {
        // Hoàn kho — dùng chung lib/stock.ts với luồng khách tự huỷ & admin huỷ
        await restoreStock(tx, linesOfOrderItems(order.items), {
          reason: 'ORDER_CANCELLED',
          reference: order.orderCode,
          userId: null,
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: now,
            cancelReason: 'Quá hạn thanh toán 24 giờ',
            paymentStatus: 'FAILED',
            history: { create: { status: 'CANCELLED', note: 'Hệ thống tự huỷ: quá hạn thanh toán 24 giờ' } },
          },
        });

        await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: 'FAILED' } });
      });

      void mailer.orderCancelled(order.user.email, {
        orderCode: order.orderCode,
        fullName: order.user.fullName,
        reason: 'Quá hạn thanh toán 24 giờ',
        link: `${env.CLIENT_URL}/account/orders/${order.orderCode}`,
      });

      cancelled++;
    } catch (err) {
      logger.error({ err, orderCode: order.orderCode }, 'Không huỷ được đơn quá hạn');
    }
  }

  return { cancelled, checked: orders.length };
}
