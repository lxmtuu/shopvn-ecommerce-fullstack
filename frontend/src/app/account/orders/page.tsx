'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Package, RotateCcw, Search, ShoppingBag, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, EmptyState, Modal, Pagination, Skeleton } from '@/components/ui';
import { apiData, apiFull, ApiError } from '@/lib/api';
import { cx, formatDate, formatVND, ORDER_STATUS, PAYMENT_STATUS } from '@/lib/format';
import type { OrderSummary, Paginated } from '@/types';

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PACKING', label: 'Đang đóng gói' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

function OrdersContent() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1);

  const [search, setSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState<OrderSummary | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', status, page],
    queryFn: () => apiFull<Paginated<OrderSummary>>(`/orders?limit=10&page=${page}${status ? `&status=${status}` : ''}`),
  });

  const setParam = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v) sp.delete(k);
      else sp.set(k, String(v));
    });
    if (!('page' in next)) sp.delete('page');
    router.push(`/account/orders?${sp.toString()}`);
  };

  const cancelOrder = async () => {
    if (!cancelTarget) return;
    setBusy(cancelTarget.orderCode);
    try {
      await apiData(`/orders/${cancelTarget.orderCode}/cancel`, { method: 'POST', body: { reason: cancelReason || 'Khách hàng huỷ đơn' } });
      toast.success('Đã huỷ đơn hàng');
      setCancelTarget(null);
      setCancelReason('');
      refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không huỷ được đơn hàng');
    } finally {
      setBusy(null);
    }
  };

  const reorder = async (orderCode: string) => {
    setBusy(orderCode);
    try {
      await apiData(`/orders/${orderCode}/reorder`, { method: 'POST' });
      toast.success('Đã thêm lại sản phẩm vào giỏ hàng');
      router.push('/cart');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không mua lại được đơn này');
    } finally {
      setBusy(null);
    }
  };

  const orders = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Đơn hàng của tôi</h1>
        <p className="mt-1 text-sm text-ink-500">Theo dõi trạng thái, huỷ đơn hoặc mua lại chỉ với một cú nhấp</p>
      </div>

      {/* Tabs trạng thái */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setParam({ status: t.value })}
            className={cx(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              status === t.value ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.info('Tìm theo mã đơn — ví dụ DH26091400123');
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã đơn hàng…"
            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3 text-sm dark:border-ink-700 dark:bg-ink-900"
          />
        </div>
        <Button type="submit" variant="outline">
          Tìm
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title={status ? 'Không có đơn hàng ở trạng thái này' : 'Bạn chưa có đơn hàng nào'}
          description="Khám phá sản phẩm và đặt đơn đầu tiên — thanh toán QR siêu nhanh."
          action={
            <Link href="/products">
              <Button>Mua sắm ngay</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="card-surface overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-5 py-3.5 dark:border-ink-800 dark:bg-ink-900/40">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold tracking-wide">{order.orderCode}</span>
                  <span className="text-xs text-ink-500">{formatDate(order.createdAt, true)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={ORDER_STATUS[order.status]?.className}>{ORDER_STATUS[order.status]?.label ?? order.status}</Badge>
                  <Badge className={PAYMENT_STATUS[order.paymentStatus]?.className}>{PAYMENT_STATUS[order.paymentStatus]?.label ?? order.paymentStatus}</Badge>
                </div>
              </header>

              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="flex flex-1 gap-3">
                  <div className="flex -space-x-3">
                    {order.previewItems.slice(0, 3).map((item, i) => (
                      <div key={i} className="relative h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-ink-100 dark:border-ink-900 dark:bg-ink-800">
                        {item.image && <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />}
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="line-clamp-2 font-medium">{order.previewItems[0]?.name}{order.itemCount > 1 ? ` và ${order.itemCount - 1} sản phẩm khác` : ''}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{order.itemCount} sản phẩm (SL {order.previewItems.reduce((s, i) => s + i.quantity, 0)})</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <div className="text-right">
                    <p className="text-xs text-ink-500">Tổng tiền</p>
                    <p className="text-lg font-extrabold text-brand-700 dark:text-brand-400">{formatVND(order.totalAmount)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.status === 'PENDING_PAYMENT' && (
                      <Link href={`/order-success/${order.orderCode}`}>
                        <Button size="sm">Thanh toán ngay</Button>
                      </Link>
                    )}
                    <Link href={`/account/orders/${order.orderCode}`}>
                      <Button size="sm" variant="outline">
                        Chi tiết
                      </Button>
                    </Link>
                    {(order.status === 'CANCELLED' || order.status === 'DELIVERED') && (
                      <Button size="sm" variant="ghost" loading={busy === order.orderCode} onClick={() => reorder(order.orderCode)}>
                        <RotateCcw className="h-4 w-4" /> Mua lại
                      </Button>
                    )}
                    {order.canCancel && (
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setCancelTarget(order)}>
                        <XCircle className="h-4 w-4" /> Huỷ đơn
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && data.meta.totalPages > 1 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => setParam({ page: p })} />}

      {/* Modal huỷ đơn */}
      <Modal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title={`Huỷ đơn ${cancelTarget?.orderCode ?? ''}`}>
        <p className="text-sm text-ink-600 dark:text-ink-400">Bạn chắc chắn muốn huỷ đơn hàng này? Hành động không thể hoàn tác.</p>
        <label htmlFor="cancel-reason" className="mt-4 block text-sm font-semibold">
          Lý do huỷ (không bắt buộc)
        </label>
        <textarea
          id="cancel-reason"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Ví dụ: đổi ý, muốn mua sản phẩm khác…"
          className="mt-2 w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm dark:border-ink-700 dark:bg-ink-900"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCancelTarget(null)}>
            Không huỷ
          </Button>
          <Button variant="danger" loading={busy === cancelTarget?.orderCode} onClick={cancelOrder}>
            <Package className="h-4 w-4" /> Xác nhận huỷ
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>}>
      <OrdersContent />
    </Suspense>
  );
}
