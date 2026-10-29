import { Router } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { bankNameOf } from '../../lib/vietqr.js';
import { getShippingConfig } from '../../lib/shipping.js';

/** Thông tin ngân hàng công khai để FE hiển thị ở trang thanh toán & footer */
const router = Router();

router.get(
  '/bank-info',
  asyncHandler(async (_req, res) => {
    const [settings, shipping] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { id: 'default' } }),
      getShippingConfig(),
    ]);
    return ok(res, {
      bankBin: settings?.bankBin ?? env.BANK_BIN,
      bankName: bankNameOf(settings?.bankBin ?? env.BANK_BIN),
      accountNo: settings?.bankAccountNo ?? env.BANK_ACCOUNT_NO,
      accountName: settings?.bankAccountName ?? env.BANK_ACCOUNT_NAME,
      hotline: settings?.hotline ?? '1900 1234',
      email: settings?.email ?? 'hotro@shopvn.vn',
      social: (settings?.social as Record<string, string> | null) ?? {},
      siteName: settings?.siteName ?? env.APP_NAME,
      // Một nguồn duy nhất với lúc tạo đơn (lib/shipping.ts) — tránh FE hiển thị
      // một giá, BE tính giá khác
      shippingFees: shipping.fees,
      freeShipThreshold: shipping.freeShipThreshold,
    });
  }),
);

export default router;
