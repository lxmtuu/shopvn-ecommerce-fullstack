import { Router } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { bankNameOf } from '../../lib/vietqr.js';

/** Thông tin ngân hàng công khai để FE hiển thị ở trang thanh toán & footer */
const router = Router();

router.get(
  '/bank-info',
  asyncHandler(async (_req, res) => {
    const settings = await prisma.siteSetting.findUnique({ where: { id: 'default' } });
    return ok(res, {
      bankBin: settings?.bankBin ?? env.BANK_BIN,
      bankName: bankNameOf(settings?.bankBin ?? env.BANK_BIN),
      accountNo: settings?.bankAccountNo ?? env.BANK_ACCOUNT_NO,
      accountName: settings?.bankAccountName ?? env.BANK_ACCOUNT_NAME,
      hotline: settings?.hotline ?? '1900 1234',
      email: settings?.email ?? 'hotro@shopvn.vn',
      social: (settings?.social as Record<string, string> | null) ?? {},
      siteName: settings?.siteName ?? env.APP_NAME,
      shippingFees: settings?.shippingFees ?? { STANDARD: 30000, EXPRESS: 50000, INSTANT: 80000 },
      freeShipThreshold: Number(settings?.freeShipThreshold ?? env.FREE_SHIPPING_THRESHOLD),
    });
  }),
);

export default router;
