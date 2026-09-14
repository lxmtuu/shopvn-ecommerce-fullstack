'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck, Copy, ImageUp, Mail, MapPin, Phone, Printer, Truck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Input, Skeleton } from '@/components/ui';
import { api, apiData, ApiError } from '@/lib/api';
import { formatDate, formatVND, ORDER_STATUS, PAYMENT_METHOD_LABEL, PAYMENT_STATUS, SHIPPING_LABEL } from '@/lib/format';
import type { OrderDetail } from '@/types';

const NEXT_STATUS: Record<string, string[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKING', 'CANCELLED'],
  PACKING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
};

interface AdminOrderDetail extends OrderDetail {
  user?: { id: string; fullName: string; email: string; phone: string | null } | null;
}

export default function AdminOrderDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [proofBusy, setProofBusy] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'order', code],
    queryFn: () => apiData<AdminOrderDetail>(`/admin/orders/${code}`),
    retry: 1,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      apiData(`/admin/orders/${order!.id}/status`, { method: 'PATCH', body: { status, note: note || undefined, trackingCode: trackingCode || undefined } }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái');
      setNote('');
      setTrackingCode('');
      qc.invalidateQueries({ queryKey: ['admin', 'order', code] });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Không cập nhật được'),
  });

  const confirmPayment = useMutation({
    mutationFn: () =>
      apiData(`/admin/payments/orders/${order!.id}/confirm`, {
        method: 'PATCH',
        body: { paidAmount: paidAmount ? Number(paidAmount) : Number(order!.totalAmount), proofImageUrl: proofUrl ?? undefined, note: note || undefined },
      }),
    onSuccess: () => {
      toast.success('Đã xác nhận thanh toán — đơn chuyển sang Đã xác nhận');
      qc.invalidateQueries({ queryKey: ['admin', 'order', code] });
      refetch();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Không xác nhận được thanh toán'),
  });

  const uploadProof = async (file: File) => {
    setProofBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploaded = await api<{ data: { url: string } }>('/uploads/image', { method: 'POST', body: fd });
      setProofUrl(uploaded.data.url);
      toast.success('Đã tải ảnh bill');
    } catch {
      toast.error('Tải ảnh thất bại');
    } finally {
      setProofBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card-surface p-10 text-center">
        <p className="font-bold">Không tìm thấy đơn hàng {code}</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft className="h-4 w-4" /> Về danh sách
        </Button>
      </div>
    );
  }

  const address = [order.shippingAddress.detail, order.shippingAddress.wardName, order.shippingAddress.districtName, order.shippingAddress.provinceName].filter(Boolean).join(', ');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="mb-1 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
            <ArrowLeft className="h-4 w-4" /> Danh sách đơn hàng
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight">
            {order.orderCode}
            <button
              onClick={() => {
                navigator.clipboard.writeText(order.orderCode);
                toast.success('Đã copy mã đơn');
              }}
              className="text-ink-400 hover:text-brand-600"
              aria-label="Copy mã đơn"
            >
              <Copy className="h-4 w-4" />
            </button>
          </h1>
          <p className="mt-1 text-sm text-ink-500">Tạo lúc {formatDate(order.createdAt, true)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={ORDER_STATUS[order.status]?.className}>{ORDER_STATUS[order.status]?.label}</Badge>
          <Badge className={PAYMENT_STATUS[order.paymentStatus]?.className}>{PAYMENT_STATUS[order.paymentStatus]?.label}</Badge>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> In
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* ── Cột trái ── */}
        <div className="space-y-5">
          <section className="card-surface overflow-hidden">
            <h2 className="border-b border-ink-100 px-5 py-4 font-bold dark:border-ink-800">Sản phẩm ({order.items.length})</h2>
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                    {item.imageUrl && <Image src={item.imageUrl} alt={item.productName} fill sizes="64px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${item.productSlug}`} target="_blank" className="line-clamp-1 font-medium hover:text-brand-600">
                      {item.productName}
                    </Link>
                    <p className="text-xs text-ink-400">
                      SKU {item.sku} {item.variantName ? `· ${item.variantName}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{formatVND(item.totalPrice)}</p>
                    <p className="text-xs text-ink-400">
                      {formatVND(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-bold">Lịch sử xử lý</h2>
            <ol className="mt-4 space-y-4">
              {order.history.map((h) => (
                <li key={h.id} className="border-l-2 border-brand-200 pl-4 dark:border-brand-900">
                  <p className="text-sm font-semibold">{ORDER_STATUS[h.status]?.label ?? h.status}</p>
                  <p className="text-xs text-ink-500">{formatDate(h.createdAt, true)}</p>
                  {h.note && <p className="mt-1 text-xs text-ink-500">{h.note}</p>}
                </li>
              ))}
              {order.history.length === 0 && <p className="text-sm text-ink-500">Chưa có lịch sử.</p>}
            </ol>
          </section>
        </div>

        {/* ── Cột phải ── */}
        <aside className="space-y-5">
          {order.paymentStatus !== 'PAID' && order.paymentMethod === 'BANK_TRANSFER' && (
            <section className="card-surface border-brand-200 p-5 dark:border-brand-900">
              <h2 className="flex items-center gap-2 font-bold text-brand-700 dark:text-brand-400">
                <Wallet className="h-4 w-4" /> Đối soát thanh toán
              </h2>
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
                Khách cần chuyển <b>{formatVND(order.totalAmount)}</b> với nội dung <b className="tracking-wider">{order.orderCode}</b>
              </p>

              <div className="mt-4 space-y-3">
                <Input label="Số tiền đã nhận" name="paidAmount" inputMode="numeric" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value.replace(/\D/g, ''))} hint={`Mặc định ${formatVND(order.totalAmount)}`} />
                <label className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink-200 text-sm font-semibold transition hover:border-brand-500 hover:text-brand-600 dark:border-ink-700">
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])} disabled={proofBusy} />
                  <ImageUp className="h-4 w-4" /> {proofUrl ? 'Đã tải ảnh bill' : 'Tải ảnh bill (không bắt buộc)'}
                </label>
                <Button className="w-full" loading={confirmPayment.isPending} onClick={() => confirmPayment.mutate()}>
                  <BadgeCheck className="h-4 w-4" /> Xác nhận đã nhận tiền
                </Button>
              </div>
            </section>
          )}

          <section className="card-surface p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <Truck className="h-4 w-4 text-brand-600" /> Cập nhật trạng thái
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(NEXT_STATUS[order.status] ?? []).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === 'CANCELLED' ? 'danger' : 'primary'}
                  loading={updateStatus.isPending && updateStatus.variables === s}
                  onClick={() => updateStatus.mutate(s)}
                >
                  → {ORDER_STATUS[s]?.label ?? s}
                </Button>
              ))}
              {(NEXT_STATUS[order.status]?.length ?? 0) === 0 && <p className="text-sm text-ink-500">Đơn đã ở trạng thái cuối, không thể chuyển tiếp.</p>}
            </div>
            <div className="mt-4 space-y-3">
              {NEXT_STATUS[order.status]?.includes('SHIPPING') && <Input label="Mã vận đơn" name="trackingCode" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="GHN123456789" />}
              <div>
                <label htmlFor="statusNote" className="mb-1.5 block text-sm font-medium">
                  Ghi chú kèm theo
                </label>
                <textarea id="statusNote" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-xl border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900" />
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-bold">Người nhận</h2>
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-semibold">{order.recipientName}</p>
              <p className="flex items-center gap-2 text-ink-600 dark:text-ink-400">
                <Phone className="h-3.5 w-3.5" /> {order.recipientPhone}
              </p>
              <p className="flex items-start gap-2 leading-relaxed text-ink-600 dark:text-ink-400">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {address}
              </p>
              {order.user && (
                <p className="flex items-center gap-2 border-t border-ink-100 pt-3 text-ink-600 dark:border-ink-800 dark:text-ink-400">
                  <Mail className="h-3.5 w-3.5" /> {order.user.email}
                </p>
              )}
              {order.note && <p className="rounded-lg bg-ink-50 p-3 text-xs dark:bg-ink-900">Ghi chú khách: {order.note}</p>}
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-bold">Tổng kết</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Tạm tính</dt>
                <dd>{formatVND(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Vận chuyển ({SHIPPING_LABEL[order.shippingMethod]?.label ?? order.shippingMethod})</dt>
                <dd>{formatVND(order.shippingFee)}</dd>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Giảm giá {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                  <dd>−{formatVND(order.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed border-ink-200 pt-2 dark:border-ink-700">
                <dt className="font-bold">Tổng</dt>
                <dd className="text-lg font-extrabold text-brand-700 dark:text-brand-400">{formatVND(order.totalAmount)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-500">
              {PAYMENT_METHOD_LABEL[order.paymentMethod]} {order.payment ? `· đã nhận ${formatVND(order.payment.paidAmount)}` : ''}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
