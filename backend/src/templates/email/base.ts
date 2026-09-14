import { env } from '../../config/env.js';

const BRAND = '#e11d48';
const INK = '#0f172a';
const MUTED = '#64748b';
const BG = '#f1f5f9';

/** Khung email dùng chung — table-based để tương thích Gmail/Outlook */
export function baseTemplate(content: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${env.APP_NAME}</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
    <tr><td style="background:linear-gradient(135deg,${BRAND},#be123c);padding:28px 32px;">
      <a href="${env.CLIENT_URL}" style="color:#fff;font-size:22px;font-weight:800;text-decoration:none;letter-spacing:-.3px;">
        🛍️ ${env.APP_NAME}
      </a>
    </td></tr>
    <tr><td style="padding:32px;color:${INK};font-size:15px;line-height:1.65;">${content}</td></tr>
    <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;color:${MUTED};font-size:12.5px;line-height:1.6;">
      <p style="margin:0 0 8px;"><strong style="color:${INK};">${env.APP_NAME}</strong> — Mua sắm trực tuyến, giao nhanh tận nơi</p>
      <p style="margin:0 0 8px;">Hotline: <a href="tel:19001234" style="color:${BRAND};text-decoration:none;">1900 1234</a> · Email: <a href="mailto:hotro@shopvn.vn" style="color:${BRAND};text-decoration:none;">hotro@shopvn.vn</a></p>
      <p style="margin:0 0 12px;">Bạn nhận được email này vì có hoạt động trên tài khoản ${env.APP_NAME} của bạn.</p>
      <p style="margin:0;">© ${year} ${env.APP_NAME}. Mọi quyền được bảo lưu.</p>
    </td></tr>
  </table>
  <p style="color:${MUTED};font-size:11.5px;margin:16px 0 0;">Email tự động, vui lòng không trả lời trực tiếp.</p>
</td></tr></table>
</body></html>`;
}

export function button(href: string, label: string, color = BRAND): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
    <td style="background:${color};border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;color:#fff;font-weight:700;font-size:15px;text-decoration:none;">${label}</a>
    </td></tr></table>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${INK};font-weight:800;letter-spacing:-.3px;">${text}</h1>`;
}

export function infoBox(rows: Array<[string, string]>, accent = BRAND): string {
  const body = rows
    .map(
      ([k, v], i) =>
        `<tr>
          <td style="padding:10px 14px;color:${MUTED};font-size:13.5px;${i ? 'border-top:1px solid #e2e8f0;' : ''}">${k}</td>
          <td style="padding:10px 14px;text-align:right;font-weight:700;color:${INK};font-size:13.5px;${i ? 'border-top:1px solid #e2e8f0;' : ''}">${v}</td>
        </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${accent};border-radius:10px;margin:18px 0;">${body}</table>`;
}

export function alertBox(text: string, tone: 'info' | 'warn' | 'danger' = 'info'): string {
  const map = {
    info: { bg: '#eff6ff', border: '#3b82f6', color: '#1e3a8a' },
    warn: { bg: '#fffbeb', border: '#f59e0b', color: '#78350f' },
    danger: { bg: '#fef2f2', border: '#ef4444', color: '#7f1d1d' },
  }[tone];
  return `<div style="background:${map.bg};border-left:4px solid ${map.border};border-radius:8px;padding:14px 16px;margin:18px 0;color:${map.color};font-size:13.5px;">${text}</div>`;
}
