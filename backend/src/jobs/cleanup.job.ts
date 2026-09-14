import { prisma } from '../lib/prisma.js';

/** Dọn dữ liệu rác: token hết hạn, session hết hạn, thông báo cũ, lượt xem cũ */
export async function cleanupTokens() {
  const now = new Date();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);

  const [tokens, sessions, notifications, views] = await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.notification.deleteMany({ where: { isRead: true, createdAt: { lt: ninetyDaysAgo } } }),
    prisma.productView.deleteMany({ where: { createdAt: { lt: ninetyDaysAgo } } }),
  ]);

  return {
    tokensDeleted: tokens.count,
    sessionsDeleted: sessions.count,
    notificationsDeleted: notifications.count,
    viewsDeleted: views.count,
  };
}
