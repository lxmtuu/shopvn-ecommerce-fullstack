import nodemailer, { type Transporter } from 'nodemailer';
import { env, isProd } from '../config/env.js';
import { logger } from './logger.js';
import { baseTemplate } from '../templates/email/base.js';
import {
  orderConfirmationEmail,
  paymentReceivedEmail,
  paymentInstructionsEmail,
  passwordChangedEmail,
  resetPasswordEmail,
  securityAlertEmail,
  shippingEmail,
  verifyEmailTemplate,
  welcomeEmail,
  orderCancelledEmail,
} from '../templates/email/index.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (env.MAIL_DRIVER !== 'smtp') return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Gửi mail theo driver đã chọn.
 * `console` → in ra terminal (tiện dev, KHÔNG cần cấu hình SMTP).
 * Luôn nuốt lỗi gửi mail: không để việc gửi mail làm hỏng luồng nghiệp vụ chính.
 */
export async function sendMail({ to, subject, html, text }: MailPayload): Promise<void> {
  const fullHtml = html.includes('<!DOCTYPE') ? html : baseTemplate(html);

  if (env.MAIL_DRIVER === 'console' || !isProd && !env.SMTP_USER && env.MAIL_DRIVER === 'smtp') {
    logger.info({ to, subject }, '📧 [MAIL:console] Nội dung mail (dev)');
    // eslint-disable-next-line no-console
    console.log(`\n📧 ═══ EMAIL (dev console) ═══\nTo: ${to}\nSubject: ${subject}\n${text ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600)}\n══════════════════════════\n`);
    return;
  }

  try {
    if (env.MAIL_DRIVER === 'resend' && env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.MAIL_FROM, to, subject, html: fullHtml, text }),
      });
      if (!res.ok) throw new Error(`Resend lỗi ${res.status}: ${await res.text()}`);
      logger.info({ to, subject }, '📧 Đã gửi mail qua Resend');
      return;
    }

    const t = getTransporter();
    if (!t) throw new Error('Chưa cấu hình SMTP');
    await t.sendMail({ from: env.MAIL_FROM, to, subject, html: fullHtml, text });
    logger.info({ to, subject }, '📧 Đã gửi mail');
  } catch (err) {
    logger.error({ err, to, subject }, '❌ Gửi mail thất bại (không ảnh hưởng nghiệp vụ)');
  }
}

// ── Các hàm tiện dụng theo từng ngữ cảnh nghiệp vụ ───────────────────────────

export const mailer = {
  verifyEmail: (to: string, fullName: string, link: string) =>
    sendMail({ to, subject: '✅ Xác thực email của bạn — ShopVN', html: verifyEmailTemplate({ fullName, link }) }),

  welcome: (to: string, fullName: string, link: string) =>
    sendMail({ to, subject: '🎉 Chào mừng bạn đến với ShopVN', html: welcomeEmail({ fullName, link }) }),

  resetPassword: (to: string, fullName: string, link: string, expiresMinutes = 15) =>
    sendMail({
      to,
      subject: '🔑 Đặt lại mật khẩu ShopVN',
      html: resetPasswordEmail({ fullName, link, expiresMinutes }),
    }),

  passwordChanged: (to: string, fullName: string, ip?: string) =>
    sendMail({ to, subject: '🔒 Mật khẩu của bạn vừa được thay đổi', html: passwordChangedEmail({ fullName, ip }) }),

  securityAlert: (to: string, fullName: string, info: { ip?: string; userAgent?: string; time: string }) =>
    sendMail({ to, subject: '⚠️ Cảnh báo: phát hiện đăng nhập bất thường', html: securityAlertEmail({ fullName, ...info }) }),

  orderConfirmation: (to: string, data: Parameters<typeof orderConfirmationEmail>[0]) =>
    sendMail({ to, subject: `🧾 Xác nhận đơn hàng ${data.orderCode} — ShopVN`, html: orderConfirmationEmail(data) }),

  paymentInstructions: (to: string, data: Parameters<typeof paymentInstructionsEmail>[0]) =>
    sendMail({
      to,
      subject: `🏦 Hướng dẫn thanh toán đơn ${data.orderCode} — ShopVN`,
      html: paymentInstructionsEmail(data),
    }),

  paymentReceived: (to: string, data: Parameters<typeof paymentReceivedEmail>[0]) =>
    sendMail({ to, subject: `✅ Đã nhận thanh toán đơn ${data.orderCode}`, html: paymentReceivedEmail(data) }),

  shipping: (to: string, data: Parameters<typeof shippingEmail>[0]) =>
    sendMail({ to, subject: `🚚 Đơn ${data.orderCode} đang được giao tới bạn`, html: shippingEmail(data) }),

  orderCancelled: (to: string, data: Parameters<typeof orderCancelledEmail>[0]) =>
    sendMail({ to, subject: `❌ Đơn hàng ${data.orderCode} đã bị huỷ`, html: orderCancelledEmail(data) }),
};
