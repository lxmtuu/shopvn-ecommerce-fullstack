'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, Boxes, DollarSign, Download, MessageSquare, Percent, ShoppingBag, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Skeleton } from '@/components/ui';
import { StatCard } from '@/components/admin/StatCard';
import { RevenueAreaChart, StatusDonut, TopProductsBarChart } from '@/components/admin/Charts';
import { TableWrap, Td, Th } from '@/components/admin/AdminTable';
import { apiData, downloadFile } from '@/lib/api';
import { cx, formatDate, formatNumber, formatVND, ORDER_STATUS, PAYMENT_METHOD_LABEL } from '@/lib/format';

interface Overview {
  revenue: { value: string; previous: string; changePercent: number };
  orders: { value: number; previous: number; changePercent: number; delivered: number; deliveredPrevious: number };
  customers: { value: number; previous: number; changePercent: number };
  avgOrderValue: { value: string; previous: string; changePercent: number };
  cancelRate: number;
  alerts: { pendingPayments: number; lowStock: number; pendingReviews: number };
}

const RANGES = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '90d', label: '90 ngày' },
  { value: '12m', label: '12 tháng' },
];

export default function AdminDashboardPage() {
  const [range, setRange] = useState('30d');
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiData<Overview>('/admin/stats/overview'),
  });

  const { data: revenue } = useQuery({
    queryKey: ['admin', 'revenue', range],
    queryFn: () => apiData<{ label: string; revenue: number; orders: number }[]>(`/admin/stats/revenue?range=${range}`),
  });

  const { data: byStatus } = useQuery({
    queryKey: ['admin', 'orders-by-status'],
    queryFn: () => apiData<{ status: string; count: number }[]>('/admin/stats/orders-by-status'),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['admin', 'top-products'],
    queryFn: () => apiData<{ productId: string; name: string; soldQuantity: number; revenue: string; stock: number; thumbnail: string | null }[]>('/admin/stats/top-products?limit=5'),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['admin', 'low-stock'],
    queryFn: () => apiData<{ id: string; name: string; sku: string; stock: number; lowStockAlert: number; isOut: boolean }[]>('/admin/stats/low-stock'),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['admin', 'recent-orders'],
    queryFn: () => apiData<{ orderCode: string; totalAmount: string; status: string; paymentMethod: string; createdAt: string; user: { fullName: string; email: string } }[]>('/admin/stats/recent-orders'),
  });

  const { data: payments } = useQuery({
    queryKey: ['admin', 'payment-methods'],
    queryFn: () => apiData<{ paymentMethod: string; count: number }[]>('/admin/stats/payment-methods'),
  });

  const exportCsv = async (type: 'orders' | 'products' | 'customers') => {
    setExporting(type);
    try {
      await downloadFile(`/admin/stats/export?type=${type}`);
      toast.success(`Đã tải báo cáo ${type}`);
    } catch {
      toast.error('Không xuất được báo cáo');
    } finally {
      setExporting(null);
    }
  };

  const totalStatus = (byStatus ?? []).reduce((s, x) => s + x.count, 0);

  return (
    <div className="space-y-6">
      {/* ── Cảnh báo cần xử lý ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Bảng điều khiển</h1>
          <p className="mt-1 text-sm text-ink-500">Toàn cảnh hoạt động kinh doanh của ShopVN</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['orders', 'products', 'customers'] as const).map((type) => (
            <Button key={type} variant="outline" size="sm" loading={exporting === type} onClick={() => exportCsv(type)}>
              <Download className="h-4 w-4" /> Xuất {type === 'orders' ? 'đơn hàng' : type === 'products' ? 'sản phẩm' : 'khách hàng'}
            </Button>
          ))}
        </div>
      </div>

      {overview && (overview.alerts.pendingPayments > 0 || overview.alerts.lowStock > 0 || overview.alerts.pendingReviews > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Đơn chờ đối soát thanh toán', value: overview.alerts.pendingPayments, href: '/admin/orders?paymentStatus=PENDING_REVIEW' },
            { label: 'Sản phẩm sắp hết hàng', value: overview.alerts.lowStock, href: '/admin/products?status=active' },
            { label: 'Đánh giá chờ duyệt', value: overview.alerts.pendingReviews, href: '/admin/reviews?status=PENDING' },
          ]
            .filter((a) => a.value > 0)
            .map((a) => (
              <Link key={a.label} href={a.href} className="card-surface flex items-center gap-3 border-amber-200 bg-amber-50/70 p-4 transition hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/30">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <span className="text-sm">
                  <b className="block text-lg">{a.value}</b>
                  <span className="text-ink-600 dark:text-ink-400">{a.label}</span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 text-amber-600" />
              </Link>
            ))}
        </div>
      )}

      {/* ── Thẻ số liệu ── */}
      {isLoading || !overview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard index={0} label="Doanh thu tháng này" value={formatVND(overview.revenue.value)} changePercent={overview.revenue.changePercent} icon={DollarSign} tone="brand" hint={`Tháng trước: ${formatVND(overview.revenue.previous)}`} />
          <StatCard index={1} label="Đơn hàng tháng này" value={formatNumber(overview.orders.value)} changePercent={overview.orders.changePercent} icon={ShoppingBag} tone="sky" hint={`${overview.orders.delivered} đơn đã giao thành công`} />
          <StatCard index={2} label="Khách hàng mới" value={formatNumber(overview.customers.value)} changePercent={overview.customers.changePercent} icon={Users} tone="emerald" hint={`Tháng trước: ${overview.customers.previous}`} />
          <StatCard index={3} label="Giá trị đơn trung bình" value={formatVND(overview.avgOrderValue.value)} changePercent={overview.avgOrderValue.changePercent} icon={Wallet} tone="amber" hint={`Tỷ lệ huỷ: ${overview.cancelRate}%`} />
        </div>
      )}

      {/* ── Biểu đồ doanh thu ── */}
      <section className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <TrendingUp className="h-4 w-4 text-brand-600" /> Doanh thu theo thời gian
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">Không tính đơn đã huỷ / hoàn tiền</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold transition', range === r.value ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-900' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200')}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5">{revenue && <RevenueAreaChart data={revenue} />}</div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Trạng thái đơn ── */}
        <section className="card-surface p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Boxes className="h-4 w-4 text-brand-600" /> Phân bố trạng thái đơn
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">Tổng {totalStatus} đơn hàng</p>
          <div className="mt-4">
            {byStatus && (
              <StatusDonut data={byStatus.map((s) => ({ name: ORDER_STATUS[s.status]?.label ?? s.status, value: s.count }))} />
            )}
          </div>
        </section>

        {/* ── Top sản phẩm ── */}
        <section className="card-surface p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Percent className="h-4 w-4 text-brand-600" /> Top 5 sản phẩm bán chạy
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">Theo số lượng đã bán</p>
          <div className="mt-4">
            {topProducts && <TopProductsBarChart data={topProducts.map((p) => ({ name: p.name.length > 22 ? `${p.name.slice(0, 22)}…` : p.name, soldQuantity: p.soldQuantity }))} />}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* ── Đơn hàng mới nhất ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Đơn hàng mới nhất</h2>
            <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <TableWrap>
            <thead>
              <tr>
                <Th>Mã đơn</Th>
                <Th>Khách hàng</Th>
                <Th>Thanh toán</Th>
                <Th className="text-right">Tổng tiền</Th>
                <Th>Trạng thái</Th>
              </tr>
            </thead>
            <tbody>
              {(recentOrders ?? []).map((o) => (
                <tr key={o.orderCode} className="transition hover:bg-ink-50 dark:hover:bg-ink-900/40">
                  <Td>
                    <Link href={`/admin/orders/${o.orderCode}`} className="font-semibold tracking-wide hover:text-brand-600">
                      {o.orderCode}
                    </Link>
                    <span className="mt-0.5 block text-xs text-ink-400">{formatDate(o.createdAt, true)}</span>
                  </Td>
                  <Td>
                    <span className="block font-medium">{o.user?.fullName ?? 'Khách vãng lai'}</span>
                    <span className="text-xs text-ink-400">{o.user?.email}</span>
                  </Td>
                  <Td className="text-xs text-ink-500">{PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod}</Td>
                  <Td className="text-right font-bold">{formatVND(o.totalAmount)}</Td>
                  <Td>
                    <Badge className={ORDER_STATUS[o.status]?.className}>{ORDER_STATUS[o.status]?.label ?? o.status}</Badge>
                  </Td>
                </tr>
              ))}
              {recentOrders?.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-ink-500" >Chưa có đơn hàng nào</Td>
                </tr>
              )}
            </tbody>
          </TableWrap>
        </section>

        <div className="space-y-5">
          {/* ── Sắp hết hàng ── */}
          <section className="card-surface p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Sản phẩm sắp hết hàng
            </h2>
            <div className="mt-3 space-y-2">
              {(lowStock ?? []).slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 p-3 text-sm dark:border-ink-800">
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-medium">{p.name}</p>
                    <p className="text-xs text-ink-400">SKU {p.sku}</p>
                  </div>
                  <Badge tone={p.isOut ? 'danger' : 'warning'}>{p.isOut ? 'Hết hàng' : `Còn ${p.stock}`}</Badge>
                </div>
              ))}
              {lowStock?.length === 0 && <p className="text-sm text-ink-500">Tất cả sản phẩm đều đủ hàng 👍</p>}
            </div>
          </section>

          {/* ── Phương thức thanh toán ── */}
          <section className="card-surface p-5">
            <h2 className="font-bold">Phương thức thanh toán</h2>
            <div className="mt-3 space-y-2">
              {(payments ?? []).map((p) => {
                const total = (payments ?? []).reduce((s, x) => s + x.count, 0) || 1;
                const percent = Math.round((p.count / total) * 100);
                return (
                  <div key={p.paymentMethod}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{PAYMENT_METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}</span>
                      <span className="font-semibold">
                        {p.count} <span className="text-xs text-ink-400">({percent}%)</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ── Top sản phẩm dạng bảng ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-bold">
          <MessageSquare className="h-4 w-4 text-brand-600" /> Chi tiết sản phẩm bán chạy
        </h2>
        <TableWrap>
          <thead>
            <tr>
              <Th>Sản phẩm</Th>
              <Th className="text-center">Đã bán</Th>
              <Th className="text-right">Doanh thu</Th>
              <Th className="text-center">Tồn kho</Th>
            </tr>
          </thead>
          <tbody>
            {(topProducts ?? []).map((p) => (
              <tr key={p.productId} className="transition hover:bg-ink-50 dark:hover:bg-ink-900/40">
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                      {p.thumbnail && <Image src={p.thumbnail} alt={p.name} fill sizes="40px" className="object-cover" />}
                    </div>
                    <span className="line-clamp-1 font-medium">{p.name}</span>
                  </div>
                </Td>
                <Td className="text-center font-bold">{p.soldQuantity}</Td>
                <Td className="text-right font-semibold text-brand-700 dark:text-brand-400">{formatVND(p.revenue)}</Td>
                <Td className="text-center">
                  <Badge tone={p.stock === 0 ? 'danger' : p.stock <= 5 ? 'warning' : 'neutral'}>{p.stock}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </section>
    </div>
  );
}
