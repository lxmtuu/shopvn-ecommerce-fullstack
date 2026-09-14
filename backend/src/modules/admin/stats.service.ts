import { prisma } from '../../lib/prisma.js';
import { money } from '../../utils/money.js';

type Range = '7d' | '30d' | '90d' | '12m';

function rangeToDays(range: Range): number {
  return range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export const statsService = {
  /** 4 thẻ KPI + so sánh với kỳ trước đó (mũi tên xanh/đỏ trên dashboard) */
  async overview() {
    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [revenueThisMonth, revenueLastMonth, ordersThisMonth, ordersLastMonth, newCustomers, customersLastMonth, pendingPayments, lowStock, pendingReviews] =
      await Promise.all([
        prisma.order.aggregate({
          where: { createdAt: { gte: startThisMonth }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
          _sum: { totalAmount: true },
          _count: true,
          _avg: { totalAmount: true },
        }),
        prisma.order.aggregate({
          where: { createdAt: { gte: startLastMonth, lt: startThisMonth }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
          _sum: { totalAmount: true },
          _count: true,
          _avg: { totalAmount: true },
        }),
        prisma.order.count({ where: { createdAt: { gte: startThisMonth }, status: 'DELIVERED' } }),
        prisma.order.count({ where: { createdAt: { gte: startLastMonth, lt: startThisMonth }, status: 'DELIVERED' } }),
        prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: startThisMonth } } }),
        prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: startLastMonth, lt: startThisMonth } } }),
        prisma.order.count({ where: { paymentStatus: { in: ['PENDING_REVIEW', 'UNDERPAID'] } } }),
        prisma.product.count({ where: { deletedAt: null, isActive: true, stock: { lte: 5 } } }),
        prisma.review.count({ where: { status: 'PENDING', deletedAt: null } }),
      ]);

    const cancelled = await prisma.order.count({ where: { createdAt: { gte: startThisMonth }, status: 'CANCELLED' } });
    const totalOrders = await prisma.order.count({ where: { createdAt: { gte: startThisMonth } } });

    return {
      revenue: {
        value: money(revenueThisMonth._sum.totalAmount ?? 0),
        previous: money(revenueLastMonth._sum.totalAmount ?? 0),
        changePercent: percentChange(
          Number(revenueThisMonth._sum.totalAmount ?? 0),
          Number(revenueLastMonth._sum.totalAmount ?? 0),
        ),
      },
      orders: {
        value: revenueThisMonth._count,
        previous: revenueLastMonth._count,
        changePercent: percentChange(revenueThisMonth._count, revenueLastMonth._count),
        delivered: ordersThisMonth,
        deliveredPrevious: ordersLastMonth,
      },
      customers: {
        value: newCustomers,
        previous: customersLastMonth,
        changePercent: percentChange(newCustomers, customersLastMonth),
      },
      avgOrderValue: {
        value: money(revenueThisMonth._avg.totalAmount ?? 0),
        previous: money(revenueLastMonth._avg.totalAmount ?? 0),
        changePercent: percentChange(
          Number(revenueThisMonth._avg.totalAmount ?? 0),
          Number(revenueLastMonth._avg.totalAmount ?? 0),
        ),
      },
      cancelRate: totalOrders ? Number(((cancelled / totalOrders) * 100).toFixed(1)) : 0,
      alerts: { pendingPayments, lowStock, pendingReviews },
    };
  },

  /** Chuỗi doanh thu theo ngày/tháng để vẽ line chart */
  async revenue(range: Range = '30d') {
    const days = rangeToDays(range);
    const from = new Date(Date.now() - days * 86400000);

    if (range === '12m') {
      const rows = await prisma.$queryRaw<Array<{ label: string; revenue: string; orders: bigint }>>`
        SELECT to_char(date_trunc('month', "createdAt"), 'MM/YYYY') AS label,
               COALESCE(SUM("totalAmount"), 0)::text AS revenue,
               COUNT(*) AS orders
        FROM "orders"
        WHERE "createdAt" >= ${from} AND "status" NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY date_trunc('month', "createdAt")
        ORDER BY date_trunc('month', "createdAt") ASC`;
      return rows.map((r) => ({ label: r.label, revenue: Number(r.revenue), orders: Number(r.orders) }));
    }

    const rows = await prisma.$queryRaw<Array<{ label: string; revenue: string; orders: bigint }>>`
      SELECT to_char(date_trunc('day', "createdAt"), 'DD/MM') AS label,
             COALESCE(SUM("totalAmount"), 0)::text AS revenue,
             COUNT(*) AS orders
      FROM "orders"
      WHERE "createdAt" >= ${from} AND "status" NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY date_trunc('day', "createdAt")
      ORDER BY date_trunc('day', "createdAt") ASC`;

    // Điền ngày trống = 0 để biểu đồ không bị đứt đoạn
    const map = new Map(rows.map((r) => [r.label, { revenue: Number(r.revenue), orders: Number(r.orders) }]));
    const series: Array<{ label: string; revenue: number; orders: number }> = [];
    const step = days <= 30 ? 1 : 3;
    for (let i = days - 1; i >= 0; i -= step) {
      const d = new Date(Date.now() - i * 86400000);
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = map.get(label);
      series.push({ label, revenue: found?.revenue ?? 0, orders: found?.orders ?? 0 });
    }
    return series;
  },

  /** Donut chart trạng thái đơn */
  async ordersByStatus() {
    const rows = await prisma.order.groupBy({ by: ['status'], _count: true });
    return rows.map((r) => ({ status: r.status, count: r._count }));
  },

  async paymentMethods() {
    const rows = await prisma.order.groupBy({ by: ['paymentMethod'], _count: true });
    return rows.map((r) => ({ method: r.paymentMethod, count: r._count }));
  },

  /** Top sản phẩm bán chạy (theo số lượng và doanh thu) */
  async topProducts(limit = 5) {
    const rows = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const products = await prisma.product.findMany({
      where: { id: { in: rows.map((r) => r.productId) } },
      select: { id: true, name: true, slug: true, price: true, stock: true, images: { take: 1, select: { thumbUrl: true } } },
    });

    return rows.map((r) => {
      const p = products.find((x) => x.id === r.productId);
      return {
        productId: r.productId,
        name: p?.name ?? 'Sản phẩm đã xoá',
        slug: p?.slug ?? '',
        thumbnail: p?.images[0]?.thumbUrl ?? null,
        soldQuantity: r._sum.quantity ?? 0,
        revenue: money(r._sum.totalPrice ?? 0),
        stock: p?.stock ?? 0,
      };
    });
  },

  /** Sản phẩm sắp hết hàng — cảnh báo nhập thêm */
  async lowStock(limit = 20) {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { stock: 'asc' },
      take: limit,
      select: { id: true, name: true, sku: true, stock: true, lowStockAlert: true, images: { take: 1, select: { thumbUrl: true } }, category: { select: { name: true } } },
    });
    return products
      .filter((p) => p.stock <= p.lowStockAlert)
      .map((p) => ({ ...p, thumbnail: p.images[0]?.thumbUrl ?? null, isOut: p.stock === 0 }));
  },

  /** Top khách hàng theo tổng chi tiêu */
  async topCustomers(limit = 10) {
    const rows = await prisma.order.groupBy({
      by: ['userId'],
      where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: limit,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, fullName: true, email: true, avatarUrl: true, createdAt: true },
    });
    return rows.map((r) => {
      const u = users.find((x) => x.id === r.userId);
      return {
        userId: r.userId,
        fullName: u?.fullName ?? '-',
        email: u?.email ?? '-',
        avatarUrl: u?.avatarUrl ?? null,
        orderCount: r._count,
        totalSpent: money(r._sum.totalAmount ?? 0),
      };
    });
  },

  /** Doanh thu theo danh mục — bảng thống kê chuyên sâu */
  async revenueByCategory(from?: string, to?: string) {
    const rows = await prisma.$queryRaw<Array<{ name: string; revenue: string; qty: bigint }>>`
      SELECT c."name" AS name,
             COALESCE(SUM(oi."totalPrice"), 0)::text AS revenue,
             COALESCE(SUM(oi."quantity"), 0) AS qty
      FROM "order_items" oi
      JOIN "orders" o ON o."id" = oi."orderId"
      JOIN "products" p ON p."id" = oi."productId"
      JOIN "categories" c ON c."id" = p."categoryId"
      WHERE o."status" NOT IN ('CANCELLED', 'REFUNDED')
        AND (${from ?? null}::timestamp IS NULL OR o."createdAt" >= ${from ? new Date(from) : null})
        AND (${to ?? null}::timestamp IS NULL OR o."createdAt" <= ${to ? new Date(to) : null})
      GROUP BY c."name"
      ORDER BY revenue DESC`;
    return rows.map((r) => ({ name: r.name, revenue: Number(r.revenue), quantity: Number(r.qty) }));
  },

  /** Export CSV — admin tải về mở bằng Excel */
  async exportCsv(type: 'orders' | 'products' | 'customers'): Promise<string> {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    if (type === 'orders') {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5000,
        include: { user: { select: { email: true, fullName: true } }, items: true },
      });
      const header = ['Mã đơn', 'Khách hàng', 'Email', 'Trạng thái', 'Thanh toán', 'PTTT', 'Tổng tiền', 'Ngày tạo'];
      const body = orders.map((o) =>
        [
          o.orderCode,
          o.recipientName,
          o.user.email,
          o.status,
          o.paymentStatus,
          o.paymentMethod,
          o.totalAmount.toString(),
          o.createdAt.toISOString(),
        ]
          .map(esc)
          .join(','),
      );
      return '\uFEFF' + [header.map(esc).join(','), ...body].join('\n');
    }

    if (type === 'products') {
      const products = await prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5000,
        include: { category: { select: { name: true } }, brand: { select: { name: true } } },
      });
      const header = ['SKU', 'Tên', 'Danh mục', 'Thương hiệu', 'Giá', 'Giá KM', 'Tồn kho', 'Đã bán', 'Lượt xem', 'Đang bán'];
      const body = products.map((p) =>
        [p.sku, p.name, p.category.name, p.brand?.name ?? '', p.price.toString(), p.salePrice?.toString() ?? '', p.stock, p.sold, p.viewCount, p.isActive ? 'Có' : 'Không']
          .map(esc)
          .join(','),
      );
      return '\uFEFF' + [header.map(esc).join(','), ...body].join('\n');
    }

    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: { id: true, fullName: true, email: true, phone: true, status: true, emailVerified: true, createdAt: true },
    });
    const stats = await prisma.order.groupBy({
      by: ['userId'],
      where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { totalAmount: true },
      _count: true,
    });
    const header = ['Họ tên', 'Email', 'SĐT', 'Trạng thái', 'Đã xác thực', 'Số đơn', 'Tổng chi tiêu', 'Ngày đăng ký'];
    const body = customers.map((u) => {
      const s = stats.find((x) => x.userId === u.id);
      return [u.fullName, u.email, u.phone ?? '', u.status, u.emailVerified ? 'Có' : 'Không', s?._count ?? 0, s?._sum.totalAmount?.toString() ?? '0', u.createdAt.toISOString()]
        .map(esc)
        .join(',');
    });
    return '\uFEFF' + [header.map(esc).join(','), ...body].join('\n');
  },

  /** Đơn mới nhất cho dashboard */
  async recentOrders(limit = 6) {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { fullName: true, email: true, avatarUrl: true } } },
    });
    return orders.map((o) => ({ ...o, totalAmount: money(o.totalAmount) }));
  },
};
