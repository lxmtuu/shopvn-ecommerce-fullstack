import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { startJobs } from './jobs/index.js';

const app = createApp();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(
    `🚀 ShopVN API đang chạy tại http://localhost:${env.PORT}${env.API_PREFIX}  [${env.NODE_ENV}]`,
  );
  logger.info(`📚 Tài liệu API: http://localhost:${env.PORT}/api/docs`);
  startJobs();
});

/** Tắt "êm": ngừng nhận request mới, đóng DB, thoát trong 10s */
async function shutdown(signal: string) {
  logger.info(`⏻ Nhận tín hiệu ${signal}, đang tắt server...`);
  const force = setTimeout(() => {
    logger.error('⏱️ Quá 10s không tắt được, thoát cưỡng bức');
    process.exit(1);
  }, 10_000);

  server.close(async () => {
    await prisma.$disconnect();
    clearTimeout(force);
    logger.info('✅ Đã tắt sạch sẽ');
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, '💥 Unhandled rejection — cần xử lý');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, '💥 Uncaught exception — thoát tiến trình');
  process.exit(1);
});
