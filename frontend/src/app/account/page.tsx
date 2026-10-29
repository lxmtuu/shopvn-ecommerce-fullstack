'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Heart, Package, ShoppingBag, TrendingUp } from 'lucide-react';
import { Badge, Button, EmptyState, Skeleton } from '@/components/ui';
import { apiFull, apiData } from '@/lib/api';
import { cx, formatDate, formatVND, ORDER_STATUS, PAYMENT_STATUS } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import type { OrderSummary, Paginated } from '@/types';

export default function AccountOverviewPage() {
  const user = useAuthStore((s) => s.user);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => apiFull<Paginated<OrderSummary>>('/orders?limit=5'),
  });

  const { data: wishlistCount } = useQuery({
    queryKey: ['wishlist', 'count'],
    queryFn: () => apiData<unknown[]>('/wishlist'),
    select: (items) => items.length,
  });

  const all = orders?.data ?? [];
  const stats = [
    { label: 'Tổng đơn hàng', value: orders?.meta.total ?? 0, icon: Package, tone: 'text-brand-600 bg-brand-50 dark:bg-brand-950' },
    { label: 'Đang giao / chờ xử lý', value: all.filter((o) => ['CONFIRMED', 'PACKING', 'SHIPPING', 'PENDING_PAYMENT'].includes(o.status)).length, icon: Clock, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
    { label: 'Đã giao thành công', value: all.filter((o) => o.status === 'DELIVERED').length, icon: TrendingUp, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
    { label: 'Sản phẩm yêu thích', value: wishlistCount ?? 0, icon: Heart, tone: 'text-rose-600 bg-rose-50 dark:bg-rose-950' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Xin chào, {user?.fullName?.split(' ').slice(-1)[0]} 👋</h1>
        <p className="mt-1 text-sm text-ink-500">Đây là tổng quan hoạt động mua sắm của bạn tại ShopVN</p>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card-surface p-5">
            <span className={cx('grid h-10 w-10 place-items-center rounded-xl', tone)}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-2xl font-extrabold">{value}</p>
            <p className="text-xs text-ink-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Đơn hàng gần đây */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Đơn hàng gần đây</h2>
          <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : all.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-7 w-7" />}
            title="Bạn chưa có đơn hàng nào"
            description="Bắt đầu mua sắm để nhận ưu đãi thành viên và theo dõi đơn hàng ngay tại đây."
            action={
              <Link href="/products">
                <Button>Mua sắm ngay</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {all.map((order) => (
              <Link key={order.id} href={`/account/orders/${order.orderCode}`} className="card-surface block p-4 transition hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {order.previewItems.slice(0, 3).map((item, i) => (
                        <div key={i} className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-ink-100 dark:border-ink-900 dark:bg-ink-800">
                          {item.image && <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="font-bold tracking-wide">{order.orderCode}</p>
                      <p className="text-xs text-ink-500">
                        {formatDate(order.createdAt, true)} · {order.itemCount} sản phẩm
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={ORDER_STATUS[order.status]?.className}>{ORDER_STATUS[order.status]?.label ?? order.status}</Badge>
                    <Badge className={PAYMENT_STATUS[order.paymentStatus]?.className}>{PAYMENT_STATUS[order.paymentStatus]?.label ?? order.paymentStatus}</Badge>
                    <span className="font-bold text-brand-700 dark:text-brand-400">{formatVND(order.totalAmount)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
