import QRCode from 'qrcode';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { money } from '../../utils/money.js';
import { buildVietQRPayload, bankNameOf } from '../../lib/vietqr.js';
import { mailer } from '../../lib/mailer.js';
import { logger, securityLog } from '../../lib/logger.js';
import { extractOrderCode } from '../../utils/orderCode.js';

export const paymentsService = {
  /** Thông tin chuyển khoản + payload QR để FE render */
  async info(orderCode: string, userId: string, isAdmin = false) {
    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: { payment: true, user: { select: { id: true, email: true, fullName: true } } },
    });
    if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');
    if (!isAdmin && order.userId !== userId) throw AppError.notFound('Không tìm thấy đơn hàng');
    if (order.paymentMethod !== 'BANK_TRANSFER') throw AppError.badRequest('Đơn hàng này không thanh toán bằng chuyển khoản');
    if (!order.payment) throw AppError.notFound('Không tìm thấy thông tin thanh toán');

    const amount = Math.round(Number(order.totalAmount.toString()));
    const qrPayload =
      order.payment.qrPayload ??
      buildVietQRPayload({
        bankBin: order.payment.bankBin ?? env.BANK_BIN,
        accountNo: order.payment.bankAccountNo ?? env.BANK_ACCOUNT_NO,
        accountName: order.payment.bankAccountName ?? env.BANK_ACCOUNT_NAME,
        amount,
        orderCode: order.orderCode,
      });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    const expired = order.paymentDueAt ? order.paymentDueAt < new Date() : false;

    return {
      orderCode: order.orderCode,
      status: order.payment.status,
      orderStatus: order.status,
      amount: money(order.totalAmount),
      bank: {
        bin: order.payment.bankBin ?? env.BANK_BIN,
        name: bankNameOf(order.payment.bankBin ?? env.BANK_BIN),
        accountNo: order.payment.bankAccountNo ?? env.BANK_ACCOUNT_NO,
        accountName: order.payment.bankAccountName ?? env.BANK_ACCOUNT_NAME,
        branch: env.BANK_NAME,
      },
      transferContent: order.orderCode,
      qrPayload,
      qrDataUrl,
      paidAmount: money(order.payment.paidAmount),
      expiresAt: order.paymentDueAt,
      expired,
      // Bao nhiêu giây còn lại — FE dùng để đếm ngược
      secondsLeft: order.paymentDueAt ? Math.max(0, Math.floor((order.paymentDueAt.getTime() - Date.now()) / 1000)) : null,
      gatewayRef: order.payment.gatewayRef,
      proofImageUrl: order.payment.proofImageUrl,
    };
  },

  /** Ảnh QR dạng PNG để tải về / in */
  async qrPng(orderCode: string) {
    const order = await prisma.order.findUnique({ where: { orderCode }, include: { payment: true } });
    if (!order?.payment) throw AppError.notFound('Không tìm thấy thông tin thanh toán');

    const payload =
      order.payment.qrPayload ??
      buildVietQRPayload({
        bankBin: order.payment.bankBin ?? env.BANK_BIN,
        accountNo: order.payment.bankAccountNo ?? env.BANK_ACCOUNT_NO,
        accountName: order.payment.bankAccountName ?? env.BANK_ACCOUNT_NAME,
        amount: Math.round(Number(order.totalAmount.toString())),
        orderCode: order.orderCode,
      });

    return QRCode.toBuffer(payload, { width: 720, margin: 2, type: 'png' });
  },

  /** Khách bấm "Tôi đã chuyển khoản" → chuyển sang chờ admin duyệt */
  async confirmTransfer(orderCode: string, userId: string) {
    const order = await prisma.order.findUnique({ where: { orderCode }, include: { payment: true } });
    if (!order || order.userId !== userId) throw AppError.notFound('Không tìm thấy đơn hàng');
    if (!order.payment) throw AppError.notFound('Không tìm thấy thông tin thanh toán');
    if (order.payment.status === 'PAID') return { status: 'PAID' as const, message: 'Đơn hàng đã được xác nhận thanh toán' };

    await prisma.$transaction([
      prisma.payment.update({ where: { id: order.payment.id }, data: { status: 'PENDING_REVIEW' } }),
      prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PENDING_REVIEW' } }),
      prisma.orderStatusHistory.create({
        data: { orderId: order.id, status: order.status, note: 'Khách xác nhận đã chuyển khoản, chờ shop kiểm tra', changedBy: userId },
      }),
    ]);

    // Thông báo cho admin
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: 'PAYMENT' as const,
          title: `Khách báo đã chuyển khoản đơn ${order.orderCode}`,
          body: `Số tiền ${money(order.totalAmount)}đ — cần kiểm tra sao kê và xác nhận.`,
          link: `/admin/orders/${order.id}`,
        })),
      });
    }

    return { status: 'PENDING_REVIEW' as const, message: 'Đã ghi nhận! Shop sẽ kiểm tra và xác nhận trong thời gian sớm nhất.' };
  },

  /** Admin xác nhận thanh toán thủ công (kèm ảnh bill tuỳ chọn) */
  async manualConfirm(orderId: string, adminId: string, paidAmount?: number, proofImageUrl?: string, note?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true, user: true, items: true } });
    if (!order?.payment) throw AppError.notFound('Không tìm thấy thông tin thanh toán');

    const amount = paidAmount ?? Number(order.totalAmount.toString());
    const isEnough = amount >= Number(order.totalAmount.toString());

    const updated = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          status: isEnough ? 'PAID' : 'UNDERPAID',
          paidAmount: amount,
          paidAt: new Date(),
          proofImageUrl: proofImageUrl ?? order.payment!.proofImageUrl,
        },
      });

      const nextOrderStatus = isEnough && order.status === 'PENDING_PAYMENT' ? 'CONFIRMED' : order.status;

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: isEnough ? 'PAID' : 'UNDERPAID',
          status: nextOrderStatus,
          confirmedAt: nextOrderStatus === 'CONFIRMED' ? new Date() : order.confirmedAt,
          history: {
            create: {
              status: nextOrderStatus,
              note: `Admin xác nhận thanh toán ${amount}đ${note ? ` — ${note}` : ''}`,
              changedBy: adminId,
            },
          },
        },
      });

      return { payment, order: updatedOrder };
    });

    if (isEnough) {
      void mailer.paymentReceived(order.user.email, {
        orderCode: order.orderCode,
        fullName: order.user.fullName,
        amount: money(amount),
        link: `${env.CLIENT_URL}/orders/${order.orderCode}`,
      });
    }

    await prisma.auditLog.create({
      data: { userId: adminId, action: 'payment.manual_confirm', entity: 'Order', entityId: orderId, after: { amount, isEnough, note } },
    });

    return { paymentStatus: updated.payment.status, orderStatus: updated.order.status, underpaid: !isEnough };
  },

  /**
   * ══════════════════════════════════════════════════════════════════════════
   *  WEBHOOK NGÂN HÀNG (Casso / SePay) — tự động đối soát chuyển khoản
   *  Nguyên tắc:
   *   • Verify HMAC (timing-safe) — chống giả mạo webhook
   *   • IDEMPOTENT: webhook gửi lại nhiều lần vẫn chỉ xử lý 1 lần
   *   • Không tìm thấy mã đơn → lưu UnmatchedTransaction, trả 200 để bank không retry vô hạn
   * ══════════════════════════════════════════════════════════════════════════
   */
  async handleBankWebhook(payload: {
    bankRef?: string;
    amount: number;
    content: string;
    senderName?: string;
    raw?: unknown;
    signatureValid: boolean;
  }) {
    if (!payload.signatureValid) {
      securityLog('webhook_invalid_signature', { content: payload.content, amount: payload.amount }, 'error');
      throw AppError.unauthorized('Chữ ký webhook không hợp lệ');
    }

    const orderCode = extractOrderCode(payload.content);
    if (!orderCode) {
      await prisma.unmatchedTransaction.create({
        data: {
          bankRef: payload.bankRef,
          amount: payload.amount,
          content: payload.content,
          senderName: payload.senderName,
          rawPayload: (payload.raw ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          note: 'Không tìm thấy mã đơn trong nội dung chuyển khoản',
        },
      });
      return { matched: false, reason: 'NO_ORDER_CODE' };
    }

    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: { payment: true, user: true, items: true },
    });

    if (!order?.payment) {
      await prisma.unmatchedTransaction.create({
        data: {
          bankRef: payload.bankRef,
          amount: payload.amount,
          content: payload.content,
          senderName: payload.senderName,
          rawPayload: (payload.raw ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          note: `Mã đơn ${orderCode} không tồn tại trong hệ thống`,
        },
      });
      return { matched: false, reason: 'ORDER_NOT_FOUND' };
    }

    // IDEMPOTENT — đã xử lý rồi thì trả về luôn, không cộng dồn
    if (order.payment.status === 'PAID') {
      logger.info({ orderCode }, 'Webhook trùng — đơn đã PAID, bỏ qua');
      return { matched: true, alreadyPaid: true, orderCode };
    }

    const total = Number(order.totalAmount.toString());
    const newPaid = Number(order.payment.paidAmount.toString()) + payload.amount;
    const isEnough = newPaid >= total;

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          status: isEnough ? 'PAID' : 'UNDERPAID',
          paidAmount: newPaid,
          paidAt: isEnough ? new Date() : order.payment!.paidAt,
          gatewayRef: payload.bankRef ?? order.payment!.gatewayRef,
          rawWebhook: (payload.raw ?? {}) as Prisma.InputJsonValue,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: isEnough ? 'PAID' : 'UNDERPAID',
          ...(isEnough && order.status === 'PENDING_PAYMENT' ? { status: 'CONFIRMED', confirmedAt: new Date() } : {}),
          history: {
            create: {
              status: isEnough && order.status === 'PENDING_PAYMENT' ? 'CONFIRMED' : order.status,
              note: `Ngân hàng báo có ${payload.amount}đ${payload.bankRef ? ` (mã GD ${payload.bankRef})` : ''}${isEnough ? '' : ` — chuyển thiếu, đã nhận ${newPaid}/${total}đ`}`,
            },
          },
        },
      });
    });

    if (isEnough) {
      void mailer.paymentReceived(order.user.email, {
        orderCode: order.orderCode,
        fullName: order.user.fullName,
        amount: money(newPaid),
        link: `${env.CLIENT_URL}/orders/${order.orderCode}`,
      });
    } else {
      // Chuyển thiếu → cảnh báo admin
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: 'PAYMENT' as const,
            title: `Đơn ${order.orderCode} chuyển thiếu tiền`,
            body: `Đã nhận ${money(newPaid)}đ / cần ${money(total)}đ`,
            link: `/admin/orders/${order.id}`,
          })),
        });
      }
    }

    logger.info({ orderCode, amount: payload.amount, isEnough }, '✅ Webhook ngân hàng xử lý xong');
    return { matched: true, orderCode, paid: isEnough, paidAmount: newPaid, total };
  },
};
