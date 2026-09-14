import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { buildMeta, parsePagination } from '../../utils/pagination.js';
import { money } from '../../utils/money.js';
import { mailer } from '../../lib/mailer.js';
import type { AdminUserQuery } from './users.schema.js';

export const usersService = {
  async list(query: AdminUserQuery) {
    const { page, limit, skip } = parsePagination(query as unknown as Record<string, unknown>);

    const where = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' as const } },
              { fullName: { contains: query.q, mode: 'insensitive' as const } },
              { phone: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: query.sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          role: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { orders: true, reviews: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Tổng chi tiêu mỗi user (chỉ tính đơn không bị huỷ)
    const spends = await prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: users.map((u) => u.id) }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { totalAmount: true },
    });
    const spendMap = new Map(spends.map((s) => [s.userId, s._sum.totalAmount]));

    const data = users
      .map((u) => ({ ...u, totalSpent: money(spendMap.get(u.id) ?? 0), orderCount: u._count.orders }))
      .sort((a, b) => {
        if (query.sort === 'spent_desc') return Number(b.totalSpent) - Number(a.totalSpent);
        if (query.sort === 'orders_desc') return b.orderCount - a.orderCount;
        return 0;
      });

    return { data, meta: buildMeta(total, { page, limit }) };
  },

  async detail(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerified: true,
        dateOfBirth: true,
        gender: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        addresses: true,
        sessions: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true, userAgent: true, ip: true, lastUsedAt: true },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { orderCode: true, status: true, paymentStatus: true, totalAmount: true, createdAt: true },
        },
      },
    });
    if (!user) throw AppError.notFound('Không tìm thấy người dùng');

    const stats = await prisma.order.aggregate({
      where: { userId: id, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { totalAmount: true },
      _count: true,
      _avg: { totalAmount: true },
    });

    return {
      ...user,
      stats: {
        totalSpent: money(stats._sum.totalAmount ?? 0),
        orderCount: stats._count,
        avgOrderValue: money(stats._avg.totalAmount ?? 0),
      },
    };
  },

  async setStatus(id: string, status: 'ACTIVE' | 'BLOCKED', reason?: string, adminId?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw AppError.notFound('Không tìm thấy người dùng');
    if (user.role === 'ADMIN') throw AppError.forbidden('Không thể khoá tài khoản quản trị viên');

    const updated = await prisma.user.update({ where: { id }, data: { status } });

    // Khoá tài khoản → kết thúc mọi phiên đang mở
    if (status === 'BLOCKED') {
      await prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'account_blocked' },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: status === 'BLOCKED' ? 'user.block' : 'user.unblock',
        entity: 'User',
        entityId: id,
        after: { status, reason },
      },
    });

    return { id: updated.id, status: updated.status };
  },

  async setRole(id: string, role: 'CUSTOMER' | 'ADMIN', adminId?: string) {
    const before = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!before) throw AppError.notFound('Không tìm thấy người dùng');

    const updated = await prisma.user.update({ where: { id }, data: { role } });
    await prisma.auditLog.create({
      data: { userId: adminId, action: 'user.role_update', entity: 'User', entityId: id, before, after: { role } },
    });
    return { id: updated.id, role: updated.role };
  },

  async sendResetLink(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw AppError.notFound('Không tìm thấy người dùng');
    await mailer.resetPassword(user.email, user.fullName, `${process.env.CLIENT_URL}/forgot-password`, 15);
    return { sent: true };
  },
};
