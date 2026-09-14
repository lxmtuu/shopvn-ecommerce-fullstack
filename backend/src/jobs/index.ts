import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { expireUnpaidOrders } from './expireOrders.job.js';
import { cleanupTokens } from './cleanup.job.js';

/**
 * Cron jobs chạy trong tiến trình API.
 * LƯU Ý khi scale ngang: nhiều instance sẽ chạy trùng job
 * → production nên tách worker riêng hoặc dùng Redis lock (SETNX).
 */
export function startJobs() {
  if (process.env.DISABLE_CRON === 'true') {
    logger.info('⏸️ Cron đã bị tắt qua DISABLE_CRON');
    return;
  }

  // Huỷ đơn chuyển khoản quá hạn chưa thanh toán — mỗi 15 phút
  cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await expireUnpaidOrders();
      if (result.cancelled > 0) logger.info(result, '🧹 Đã huỷ đơn quá hạn thanh toán');
    } catch (err) {
      logger.error({ err }, 'Job huỷ đơn quá hạn thất bại');
    }
  });

  // Dọn token/session hết hạn — 3h sáng mỗi ngày
  cron.schedule('0 3 * * *', async () => {
    try {
      const result = await cleanupTokens();
      logger.info(result, '🧹 Dọn dữ liệu hết hạn');
    } catch (err) {
      logger.error({ err }, 'Job dọn dữ liệu thất bại');
    }
  });

  logger.info('⏰ Đã đăng ký cron jobs (huỷ đơn quá hạn 15 phút/lần, dọn dữ liệu 3h sáng)');
}
