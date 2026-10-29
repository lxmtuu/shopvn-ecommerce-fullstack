import { env } from '../config/env.js';
import { prisma } from './prisma.js';
import { cache } from './redis.js';
import { logger } from './logger.js';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  PHÍ VẬN CHUYỂN — NGUỒN SỰ THẬT DUY NHẤT
 * ══════════════════════════════════════════════════════════════════════════
 *  Thứ tự ưu tiên:
 *    1. SiteSetting (admin sửa trong trang Cấu hình shop — có hiệu lực ngay)
 *    2. Biến môi trường (.env) — mặc định khi shop chưa cấu hình
 *
 *  Trước đây mỗi nơi tự tính một kiểu: orders.service dùng hằng số cho
 *  EXPRESS/INSTANT, cart.service dùng env, còn SiteSetting.shippingFees thì
 *  lưu được nhưng KHÔNG AI ĐỌC ⇒ admin sửa phí ship xong không có gì thay đổi.
 * ══════════════════════════════════════════════════════════════════════════
 */

// Công thức + kiểu dữ liệu nằm ở module thuần (test được không cần DB)
export type { ShippingConfig, ShippingMethodKey } from './shippingFee.js';
import type { ShippingConfig, ShippingMethodKey } from './shippingFee.js';
export { calcShippingFee } from './shippingFee.js';

const CACHE_KEY = 'shipping:config';
const TTL_SECONDS = 60;

const fromEnv = (): ShippingConfig => ({
  fees: {
    STANDARD: env.SHIPPING_FEE_STANDARD,
    EXPRESS: env.SHIPPING_FEE_EXPRESS,
    INSTANT: env.SHIPPING_FEE_INSTANT,
  },
  freeShipThreshold: env.FREE_SHIPPING_THRESHOLD,
});

/** Đọc cấu hình phí ship (cache 60s để không query DB mỗi request) */
export async function getShippingConfig(): Promise<ShippingConfig> {
  const defaults = fromEnv();

  const cached = await cache.get(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as ShippingConfig;
    } catch {
      /* cache hỏng → tính lại */
    }
  }

  let config = defaults;
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { id: 'default' },
      select: { shippingFees: true, freeShipThreshold: true },
    });

    const raw = (setting?.shippingFees ?? {}) as Record<string, unknown>;
    const pick = (key: ShippingMethodKey) => {
      const value = Number(raw[key]);
      return Number.isFinite(value) && value >= 0 ? value : defaults.fees[key];
    };

    config = {
      fees: { STANDARD: pick('STANDARD'), EXPRESS: pick('EXPRESS'), INSTANT: pick('INSTANT') },
      freeShipThreshold:
        setting?.freeShipThreshold != null ? Number(setting.freeShipThreshold) : defaults.freeShipThreshold,
    };
  } catch (err) {
    // DB lỗi không được làm hỏng luồng đặt hàng — dùng mặc định từ .env
    logger.warn({ err }, 'Không đọc được cấu hình phí ship từ DB, dùng mặc định .env');
    config = defaults;
  }

  await cache.set(CACHE_KEY, JSON.stringify(config), TTL_SECONDS);
  return config;
}

/** Gọi sau khi admin lưu Cấu hình shop để giá mới có hiệu lực ngay */
export async function invalidateShippingConfig(): Promise<void> {
  await cache.del(CACHE_KEY);
}
