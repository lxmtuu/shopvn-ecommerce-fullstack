import { env } from '../../config/env.js';
import { alertBox, button, heading, infoBox } from './base.js';

const money = (v: number | string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

// ─────────────────────────── XÁC THỰC TÀI KHOẢN ───────────────────────────

export function verifyEmailTemplate({ fullName, link }: { fullName: string; link: string }) {
  return `
    ${heading(`Xin chào ${fullName} 👋`)}
    <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>${env.APP_NAME}</strong>. Chỉ còn một bước nữa thôi!</p>
    <p>Hãy bấm nút bên dưới để xác thực địa chỉ email của bạn:</p>
    ${button(link, 'Xác thực email ngay')}
    <p style="color:#64748b;font-size:13px;">Hoặc copy link sau vào trình duyệt:<br>
      <span style="word-break:break-all;color:#0f172a;">${link}</span>
    </p>
    ${alertBox('Link có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email.', 'info')}
  `;
}

export function welcomeEmail({ fullName, link }: { fullName: string; link: string }) {
  return `
    ${heading('Chào mừng bạn đến với ShopVN 🎉')}
    <p>Tài khoản của <strong>${fullName}</strong> đã sẵn sàng. Khám phá ngay hàng nghìn sản phẩm chính hãng với giá tốt nhất.</p>
    <ul style="padding-left:18px;color:#334155;">
      <li>Miễn phí vận chuyển cho đơn từ 500.000đ</li>
      <li>Đổi trả trong 7 ngày</li>
      <li>Thanh toán chuyển khoản bằng QR tiện lợi</li>
    </ul>
    ${button(link, 'Bắt đầu mua sắm')}
  `;
}

export function resetPasswordEmail({
  fullName,
  link,
  expiresMinutes,
}: {
  fullName: string;
  link: string;
  expiresMinutes: number;
}) {
  return `
    ${heading('Đặt lại mật khẩu 🔑')}
    <p>Xin chào <strong>${fullName}</strong>,</p>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Bấm nút dưới đây để tạo mật khẩu mới:</p>
    ${button(link, 'Đặt lại mật khẩu')}
    <p style="color:#64748b;font-size:13px;">Hoặc copy link: <span style="word-break:break-all;color:#0f172a;">${link}</span></p>
    ${alertBox(`Link chỉ có hiệu lực trong <strong>${expiresMinutes} phút</strong> và chỉ dùng được <strong>1 lần</strong>. Sau khi đổi mật khẩu, tất cả thiết bị khác sẽ bị đăng xuất để bảo vệ tài khoản.`, 'warn')}
    <p style="color:#64748b;font-size:13px;">Nếu bạn không yêu cầu điều này, hãy bỏ qua email — mật khẩu của bạn vẫn an toàn.</p>
  `;
}

export function passwordChangedEmail({ fullName, ip }: { fullName: string; ip?: string }) {
  return `
    ${heading('Mật khẩu đã được thay đổi 🔒')}
    <p>Xin chào <strong>${fullName}</strong>, mật khẩu tài khoản của bạn vừa được thay đổi thành công.</p>
    ${infoBox([
      ['Thời gian', new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })],
      ['Địa chỉ IP', ip || 'Không xác định'],
    ])}
    ${alertBox('Nếu <strong>không phải bạn</strong>, hãy đặt lại mật khẩu ngay và liên hệ hotline 1900 1234.', 'danger')}
    ${button(`${env.CLIENT_URL}/forgot-password`, 'Đặt lại mật khẩu', '#0f172a')}
  `;
}

export function securityAlertEmail({
  fullName,
  ip,
  userAgent,
  time,
}: {
  fullName: string;
  ip?: string;
  userAgent?: string;
  time: string;
}) {
  return `
    ${heading('Cảnh báo bảo mật ⚠️')}
    <p>Xin chào <strong>${fullName}</strong>,</p>
    <p>Hệ thống phát hiện hoạt động bất thường: một <strong>mã làm mới phiên đăng nhập đã bị sử dụng lại</strong>. Đây có thể là dấu hiệu tài khoản bị xâm nhập, nên chúng tôi đã <strong>đăng xuất toàn bộ thiết bị</strong> để bảo vệ bạn.</p>
    ${infoBox([
      ['Thời gian', time],
      ['Địa chỉ IP', ip || 'Không xác định'],
      ['Thiết bị', (userAgent || 'Không xác định').slice(0, 80)],
    ])}
    ${alertBox('Vui lòng đổi mật khẩu ngay và kiểm tra lịch sử đơn hàng.', 'danger')}
    ${button(`${env.CLIENT_URL}/login`, 'Đăng nhập lại & đổi mật khẩu', '#dc2626')}
  `;
}

// ───────────────────────────── ĐƠN HÀNG ────────────────────────────────────

interface OrderItemLike {
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number | string;
}

export function orderConfirmationEmail({
  orderCode,
  fullName,
  items,
  subtotal,
  shippingFee,
  discountAmount,
  totalAmount,
  link,
}: {
  orderCode: string;
  fullName: string;
  items: OrderItemLike[];
  subtotal: number | string;
  shippingFee: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  link: string;
}) {
  const rows: Array<[string, string]> = [
    ['Tạm tính', money(subtotal)],
    ['Phí vận chuyển', Number(shippingFee) === 0 ? 'Miễn phí' : money(shippingFee)],
    ['<strong>Tổng cộng</strong>', `<span style="color:#e11d48;font-size:16px;">${money(totalAmount)}</span>`],
  ];
  if (Number(discountAmount) > 0) {
    rows.splice(2, 0, ['Giảm giá', `<span style="color:#16a34a;">-${money(discountAmount)}</span>`]);
  }
  return `
    ${heading('Đã nhận đơn hàng của bạn 🧾')}
    <p>Xin chào <strong>${fullName}</strong>, cảm ơn bạn đã đặt hàng tại ${env.APP_NAME}!</p>
    ${infoBox([['Mã đơn hàng', orderCode]])}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${items
        .map(
          (i) => `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;">
              ${i.productName}${i.variantName ? ` <span style="color:#64748b;">(${i.variantName})</span>` : ''}
              <div style="color:#64748b;font-size:12.5px;">Số lượng: ${i.quantity}</div>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;font-size:14px;">${money(Number(i.unitPrice) * i.quantity)}</td>
          </tr>`,
        )
        .join('')}
    </table>
    ${infoBox(rows)}
    ${button(link, 'Theo dõi đơn hàng')}
  `;
}

export function paymentInstructionsEmail({
  orderCode,
  fullName,
  amount,
  bankName,
  accountNo,
  accountName,
  content,
  qrImageUrl,
  link,
  expiresAt,
}: {
  orderCode: string;
  fullName: string;
  amount: number | string;
  bankName: string;
  accountNo: string;
  accountName: string;
  content: string;
  qrImageUrl?: string;
  link: string;
  expiresAt: string;
}) {
  return `
    ${heading('Hướng dẫn thanh toán 🏦')}
    <p>Xin chào <strong>${fullName}</strong>, đơn hàng <strong>${orderCode}</strong> đã được tạo. Vui lòng chuyển khoản để chúng tôi xử lý giao hàng.</p>
    ${infoBox([
      ['Số tiền', `<span style="color:#e11d48;font-size:17px;">${money(amount)}</span>`],
      ['Ngân hàng', bankName],
      ['Số tài khoản', accountNo],
      ['Chủ tài khoản', accountName],
      ['Nội dung CK', `<span style="color:#e11d48;">${content}</span>`],
    ])}
    ${qrImageUrl ? `<div style="text-align:center;margin:24px 0;"><img src="${qrImageUrl}" alt="QR thanh toán" width="220" style="border-radius:12px;border:1px solid #e2e8f0;" /></div>` : ''}
    ${alertBox(`⚠️ <strong>Quan trọng:</strong> ghi đúng nội dung <strong>${content}</strong> để hệ thống tự động xác nhận thanh toán. Đơn sẽ tự huỷ sau <strong>${expiresAt}</strong>.`, 'warn')}
    ${button(link, 'Xem chi tiết & QR thanh toán')}
  `;
}

export function paymentReceivedEmail({
  orderCode,
  fullName,
  amount,
  link,
}: {
  orderCode: string;
  fullName: string;
  amount: number | string;
  link: string;
}) {
  return `
    ${heading('Đã nhận được thanh toán ✅')}
    <p>Xin chào <strong>${fullName}</strong>, chúng tôi đã nhận được <strong style="color:#16a34a;">${money(amount)}</strong> cho đơn hàng <strong>${orderCode}</strong>.</p>
    <p>Đơn hàng đã được xác nhận và đang được chuẩn bị. Bạn sẽ nhận được thông báo khi đơn được giao cho đơn vị vận chuyển.</p>
    ${button(link, 'Theo dõi đơn hàng')}
  `;
}

export function shippingEmail({
  orderCode,
  fullName,
  trackingCode,
  link,
}: {
  orderCode: string;
  fullName: string;
  trackingCode?: string;
  link: string;
}) {
  return `
    ${heading('Đơn hàng đang trên đường tới 🚚')}
    <p>Xin chào <strong>${fullName}</strong>, đơn <strong>${orderCode}</strong> đã được giao cho đơn vị vận chuyển.</p>
    ${trackingCode ? infoBox([['Mã vận đơn', trackingCode]]) : ''}
    ${button(link, 'Theo dõi hành trình')}
  `;
}

export function orderCancelledEmail({
  orderCode,
  fullName,
  reason,
  refundInfo,
  link,
}: {
  orderCode: string;
  fullName: string;
  reason?: string;
  refundInfo?: string;
  link: string;
}) {
  return `
    ${heading('Đơn hàng đã bị huỷ ❌')}
    <p>Xin chào <strong>${fullName}</strong>, đơn hàng <strong>${orderCode}</strong> đã bị huỷ.</p>
    ${reason ? infoBox([['Lý do', reason]]) : ''}
    ${refundInfo ? alertBox(refundInfo, 'info') : ''}
    ${button(`${link}`, 'Xem chi tiết', '#0f172a')}
    <p style="color:#64748b;font-size:13.5px;">Nếu bạn đã chuyển khoản, chúng tôi sẽ hoàn tiền trong vòng 1–3 ngày làm việc.</p>
  `;
}
