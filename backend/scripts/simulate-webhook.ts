/**
 * Giả lập webhook ngân hàng báo có tiền — DEMO luồng tự động xác nhận thanh toán
 * mà không cần tiền thật hay tài khoản Casso/SePay.
 *
 * Cách dùng:
 *   npm run webhook:simulate -- --order=DH26091400123 --amount=499000
 *   npm run webhook:simulate -- --order=DH26091400123        (tự lấy số tiền của đơn)
 */
import { createHmac } from 'node:crypto';
import 'dotenv/config';

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : undefined;
};

const API = `http://localhost:${process.env.PORT ?? 4000}/api/v1`;
const orderCode = getArg('order');
const amountArg = getArg('amount');

if (!orderCode) {
  console.error('❌ Thiếu --order=<mã đơn>. Ví dụ: npm run webhook:simulate -- --order=DH26091400123 --amount=499000');
  process.exit(1);
}

async function main() {
  let amount = amountArg ? Number(amountArg) : undefined;

  if (!amount) {
    // Không truyền số tiền → tra thẳng trong DB cho chắc (không phụ thuộc API auth)
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const order = await prisma.order.findUnique({
        where: { orderCode },
        select: { totalAmount: true, status: true, paymentStatus: true },
      });
      if (order) {
        amount = Number(order.totalAmount.toString());
        console.log(`ℹ️  Đơn ${orderCode}: trạng thái ${order.status} / ${order.paymentStatus}`);
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  if (!amount) {
    console.error('❌ Không tìm thấy đơn hoặc không xác định được số tiền. Hãy truyền --amount=<số tiền>');
    process.exit(1);
  }

  const payload = {
    id: `SIM${Date.now()}`,
    amount,
    description: `Chuyen tien thanh toan don hang ${orderCode}`,
    senderName: 'NGUYEN VAN TEST',
  };

  const rawBody = JSON.stringify(payload);
  const signature = createHmac('sha256', process.env.WEBHOOK_SECRET ?? 'dev-webhook-secret')
    .update(rawBody)
    .digest('hex');

  console.log(`📤 Gửi webhook giả lập: đơn ${orderCode}, số tiền ${amount.toLocaleString('vi-VN')}đ`);

  const res = await fetch(`${API}/webhooks/bank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-casso-signature': signature },
    body: rawBody,
  });

  const json = await res.json();
  console.log(`📥 Phản hồi [${res.status}]:`, JSON.stringify(json, null, 2));

  if (res.ok) {
    console.log('\n✅ Đã gửi! Mở lại trang đơn hàng để thấy trạng thái chuyển thành "Đã thanh toán".');
  } else {
    console.log('\n❌ Thất bại. Kiểm tra API đang chạy và WEBHOOK_SECRET khớp với backend/.env');
  }
}

void main();
