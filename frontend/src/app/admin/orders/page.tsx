'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Download, Eye, Search, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Input, Modal, Pagination } from '@/components/ui';
import { TableSkeleton, TableWrap, Td, Th } from '@/components/admin/AdminTable';
import { apiData, apiFull, downloadFile, ApiError } from '@/lib/api';
import { formatDate, formatVND, ORDER_STATUS, PAYMENT_METHOD_LABEL, PAYMENT_STATUS } from '@/lib/format';
import type { OrderSummary, Paginated } from '@/types';

interface AdminOrder extends OrderSummary {
  user?: { fullName: string; email: string } | null;
  shippingMethod: string;
  recipientName: string;
  recipientPhone: string;
  trackingCode: string | null;
}

const STATUS_OPTIONS = Object.keys(ORDER_STATUS);
const NEXT_STATUS: Record<string, string[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKING', 'CANCELLED'],
  PACKING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
};

function AdminOrdersContent() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();

  const status = params.get('status') ?? '';
  const paymentStatus = params.get('paymentStatus') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 1);

  const [search, setSearch] = useState(q);
  const [target, setTarget] = useState<AdminOrder | null>(null);
  const [nextStatus, setNextStatus] = useState('');
  const [note, setNote] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [exporting, setExporting] = useState(false);

  const setParam = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => (v === undefined || v === '' ? sp.delete(k) : sp.set(k, String(v))));
    if (!('page' in next)) sp.delete('page');
    router.push(`/admin/orders?${sp.toString()}`);
  };

  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (paymentStatus) query.set('paymentStatus', paymentStatus);
  if (q) query.set('q', q);
  query.set('page', String(page));
  query.set('limit', '15');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', query.toString()],
    queryFn: () => apiFull<Paginated<AdminOrder> & { meta: { totalRevenue: string } }>(`/admin/orders?${query.toString()}`),
    placeholderData: keepPreviousData,
  });

  const updateStatus = useMutation({
    mutationFn: (order: AdminOrder) =>
      apiData(`/admin/orders/${order.id}/status`, { method: 'PATCH', body: { status: nextStatus, note: note || undefined, trackingCode: trackingCode || undefined } }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái đơn hàng');
      setTarget(null);
      setNote('');
      setTrackingCode('');
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Không cập nhật được trạng thái'),
  });

  const openStatusModal = (order: AdminOrder) => {
    setTarget(order);
    setNextStatus(NEXT_STATUS[order.status]?.[0] ?? '');
  };

  const rows = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Quản lý đơn hàng</h1>
          <p className="mt-1 text-sm text-ink-500">
            {data ? `${data.meta.total} đơn · tổng giá trị ${formatVND((data.meta as { totalRevenue?: string }).totalRevenue ?? 0)}` : 'Đang tải…'}
          </p>
        </div>
        <Button
          variant="outline"
          loading={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              await downloadFile('/admin/stats/export?type=orders');
              toast.success('Đã tải báo cáo đơn hàng');
            } catch {
              toast.error('Không xuất được báo cáo');
            } finally {
              setExporting(false);
            }
          }}
        >
          <Download className="h-4 w-4" /> Xuất CSV
        </Button>
      </div>

      {/* Bộ lọc */}
      <div className="card-surface flex flex-wrap items-center gap-3 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ q: search.trim() });
          }}
          className="relative min-w-56 flex-1"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã đơn, tên hoặc SĐT người nhận…"
            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3 text-sm dark:border-ink-700 dark:bg-ink-900"
          />
        </form>
        <select value={status} onChange={(e) => setParam({ status: e.target.value })} className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900">
          <option value="">Mọi trạng thái</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS[s].label}
            </option>
          ))}
        </select>
        <select value={paymentStatus} onChange={(e) => setParam({ paymentStatus: e.target.value })} className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900">
          <option value="">Mọi thanh toán</option>
          {Object.keys(PAYMENT_STATUS).map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS[s].label}
            </option>
          ))}
        </select>
        {(q || status || paymentStatus) && (
          <Button variant="ghost" onClick={() => router.push('/admin/orders')}>
            <X className="h-4 w-4" /> Xoá lọc
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Mã đơn</Th>
              <Th>Khách hàng</Th>
              <Th>Người nhận</Th>
              <Th className="text-right">Tổng tiền</Th>
              <Th>Thanh toán</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="transition hover:bg-ink-50 dark:hover:bg-ink-900/40">
                <Td>
                  <Link href={`/admin/orders/${o.orderCode}`} className="font-semibold tracking-wide hover:text-brand-600">
                    {o.orderCode}
                  </Link>
                  <span className="mt-0.5 block text-xs text-ink-400">{formatDate(o.createdAt, true)}</span>
                </Td>
                <Td>
                  <span className="block text-sm font-medium">{o.user?.fullName ?? 'Khách vãng lai'}</span>
                  <span className="text-xs text-ink-400">{o.user?.email ?? '—'}</span>
                </Td>
                <Td>
                  <span className="block text-sm">{o.recipientName}</span>
                  <span className="text-xs text-ink-400">{o.recipientPhone}</span>
                </Td>
                <Td className="text-right font-bold">{formatVND(o.totalAmount)}</Td>
                <Td>
                  <Badge className={PAYMENT_STATUS[o.paymentStatus]?.className}>{PAYMENT_STATUS[o.paymentStatus]?.label}</Badge>
                  <span className="mt-1 block text-xs text-ink-400">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</span>
                </Td>
                <Td>
                  <Badge className={ORDER_STATUS[o.status]?.className}>{ORDER_STATUS[o.status]?.label}</Badge>
                  {o.trackingCode && <span className="mt-1 block text-xs text-ink-400">VĐ {o.trackingCode}</span>}
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/orders/${o.orderCode}`}>
                      <Button size="sm" variant="ghost" aria-label="Xem chi tiết">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {(NEXT_STATUS[o.status]?.length ?? 0) > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => openStatusModal(o)} aria-label="Đổi trạng thái">
                        <Truck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Td className="py-10 text-center text-ink-500">
                  <Boxes className="mx-auto mb-2 h-7 w-7 text-ink-300" />
                  Không có đơn hàng nào khớp bộ lọc
                </Td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      )}

      {data && data.meta.totalPages > 1 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => setParam({ page: p })} />}

      {/* Modal đổi trạng thái */}
      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title={`Cập nhật trạng thái — ${target?.orderCode ?? ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            Trạng thái hiện tại: <b>{ORDER_STATUS[target?.status ?? '']?.label}</b>
          </p>
          <div className="flex flex-wrap gap-2">
            {(NEXT_STATUS[target?.status ?? ''] ?? []).map((s) => (
              <button
                key={s}
                onClick={() => setNextStatus(s)}
                className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition ${nextStatus === s ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950' : 'border-ink-200 dark:border-ink-700'}`}
              >
                {ORDER_STATUS[s]?.label ?? s}
              </button>
            ))}
          </div>

          {nextStatus === 'SHIPPING' && (
            <Input label="Mã vận đơn (không bắt buộc)" name="trackingCode" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="VD: GHN123456789" />
          )}

          <div>
            <label htmlFor="admin-note" className="mb-1.5 block text-sm font-medium">
              Ghi chú nội bộ
            </label>
            <textarea
              id="admin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm dark:border-ink-700 dark:bg-ink-900"
              placeholder="VD: đã gọi xác nhận với khách"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Huỷ
            </Button>
            <Button loading={updateStatus.isPending} disabled={!nextStatus} onClick={() => target && updateStatus.mutate(target)}>
              Xác nhận
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <AdminOrdersContent />
    </Suspense>
  );
}
