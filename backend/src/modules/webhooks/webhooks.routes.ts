import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { paymentsService } from '../payments/payments.service.js';
import { logger } from '../../lib/logger.js';

const router = Router();

/** So sánh chữ ký an toàn với timing attack */
function verifySignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', env.WEBHOOK_SECRET).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * POST /api/v1/webhooks/bank
 * Nhận callback từ Casso / SePay khi tài khoản có giao dịch mới.
 *
 * Bảo mật:
 *  • HMAC-SHA256 trên raw body, so sánh timing-safe
 *  • Không dùng JSON body parser đã parse rồi (cần raw để tính HMAC) → xem app.ts (verify hook)
 *  • Idempotent: gọi lại nhiều lần không làm sai dữ liệu
 */
router.post(
  '/bank',
  asyncHandler(async (req, res) => {
    const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
    const signature =
      (req.headers['x-casso-signature'] as string) ||
      (req.headers['x-sepay-signature'] as string) ||
      (req.headers['x-webhook-signature'] as string);

    const signatureValid = verifySignature(rawBody, signature);

    // Casso: { data: [{ id, amount, description }] } | SePay: { id, transferAmount, content }
    const body = req.body as Record<string, unknown>;
    const data = (Array.isArray(body?.data) ? body.data : [body]) as Array<Record<string, unknown>>;

    const results = [];
    for (const tx of data) {
      const amount = Number(tx.amount ?? tx.transferAmount ?? tx.transfer_amount ?? 0);
      const content = String(tx.description ?? tx.content ?? tx.transaction_content ?? '');

      const schema = z.object({ amount: z.number().positive(), content: z.string().min(1) });
      const parsed = schema.safeParse({ amount, content });
      if (!parsed.success) {
        logger.warn({ tx }, 'Webhook thiếu dữ liệu, bỏ qua giao dịch này');
        results.push({ matched: false, reason: 'INVALID_PAYLOAD' });
        continue;
      }

      results.push(
        await paymentsService.handleBankWebhook({
          bankRef: String(tx.id ?? tx.referenceCode ?? tx.bankRef ?? '') || undefined,
          amount: parsed.data.amount,
          content: parsed.data.content,
          senderName: String(tx.senderName ?? tx.counterAccountName ?? '') || undefined,
          raw: tx,
          signatureValid,
        }),
      );
    }

    // Luôn trả 200 khi đã nhận (tránh ngân hàng retry vô hạn); 401 nếu chữ ký sai
    if (results.some((r) => (r as { matched?: boolean }).matched === false && !signatureValid)) {
      return res.status(401).json({ success: false, message: 'Chữ ký không hợp lệ' });
    }
    return res.json({ success: true, results });
  }),
);

export default router;
