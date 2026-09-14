'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, Package, Printer, QrCode, RotateCcw, Truck, Undo2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Modal, Skeleton } from '@/components/ui';
import { apiData, ApiError } from '@/lib/api';
import { cx, formatDate, formatVND, ORDER_STATUS, PAYMENT_METHOD_LABEL, PAYMENT_STATUS, SHIPPING_LABEL } from '@/lib/format';
import type { OrderDetail } from '@/types';

const FLOW = ['PENDING_PAYMENT', 'CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED'];

export default function OrderDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', code],
    queryFn: () => apiData<OrderDetail>(`/orders/${code}`),
    retry: 1,
  });

  const doCancel = async () => {
    setBusy(true);
    try {
      await apiData(`/orders/${code}/cancel`, { method: 'POST', body: { reason: reason || 'Khách hàng huỷ đơn' } });
      toast.success('Đã huỷ đơn hàng');
      setCancelOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không huỷ được đơn');
    } finally {
      setBusy(false);
    }
  };

  const doReturn = async () => {
    if (reason.trim().length < 5) return toast.error('Vui lòng mô tả lý do trả hàng (ít nhất 5 ký tự)');
    setBusy(true);
    try {
      await apiData(`/orders/${code}/return`, { method: 'POST', body: { reason, images: [] } });
      toast.success('Đã gửi yêu cầu trả hàng');
      setReturnOpen(false);
      setReason('');
      refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không gửi được yêu cầu');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="card-surface p-10 text-center">
        <Package className="mx-auto h-10 w-10 text-ink-300" />
        <h1 className="mt-3 font-bold">Không tìm thấy đơn hàng</h1>
        <Button className="mt-5" variant="outline" onClick={() => router.push('/account/orders')}>
          <ArrowLeft className="h-4 w-4" /> Về danh sách đơn
        </Button>
      </div>
    );
  }

  const currentStep = FLOW.indexOf(order.status);
  const cancelled = ['CANCELLED', 'RETURNED', 'REFUNDED', 'RETURN_REQUESTED'].includes(order.status);
  const shipping = SHIPPING_LABEL[order.shippingMethod];
  const address = [order.shippingAddress.detail, order.shippingAddress.wardName, order.shippingAddress.districtName, order.shippingAddress.provinceName].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push('/account/orders')} className="mb-2 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
            <ArrowLeft className="h-4 w-4" /> Danh sách đơn hàng
          </button>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold tracking-tight">
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
          <p className="mt-1 text-sm text-ink-500">Đặt lúc {formatDate(order.createdAt, true)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={ORDER_STATUS[order.status]?.className}>{ORDER_STATUS[order.status]?.label ?? order.status}</Badge>
          <Badge className={PAYMENT_STATUS[order.paymentStatus]?.className}>{PAYMENT_STATUS[order.paymentStatus]?.label ?? order.paymentStatus}</Badge>
        </div>
      </div>

      {/* ── Hành động ── */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {order.status === 'PENDING_PAYMENT' && (
          <Link href={`/order-success/${order.orderCode}`}>
            <Button>
              <QrCode className="h-4 w-4" /> Thanh toán / xem QR
            </Button>
          </Link>
        )}
        {order.canCancel && (
          <Button variant="outline" className="text-rose-600" onClick={() => setCancelOpen(true)}>
            <XCircle className="h-4 w-4" /> Huỷ đơn
          </Button>
        )}
        {(order.status === 'CANCELLED' || order.status === 'DELIVERED') && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await apiData(`/orders/${order.orderCode}/reorder`, { method: 'POST' });
                toast.success('Đã thêm lại vào giỏ hàng');
                router.push('/cart');
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : 'Không mua lại được');
              }
            }}
          >
            <RotateCcw className="h-4 w-4" /> Mua lại
          </Button>
        )}
        {order.status === 'DELIVERED' && (
          <Button variant="outline" onClick={() => setReturnOpen(true)}>
            <Undo2 className="h-4 w-4" /> Yêu cầu trả hàng
          </Button>
        )}
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> In hoá đơn
        </Button>
      </div>

      {/* ── Tiến trình đơn ── */}
      {!cancelled ? (
        <section className="card-surface p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Truck className="h-4 w-4 text-brand-600" /> Trạng thái đơn hàng
          </h2>
          <ol className="mt-6 flex items-start">
            {FLOW.map((step, i) => {
              const done = i <= currentStep;
              return (
                <li key={step} className="flex flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <span className={cx('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700')} />
                    <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold', done ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-500 dark:bg-ink-700')}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={cx('h-0.5 flex-1', i === FLOW.length - 1 ? 'bg-transparent' : i < currentStep ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700')} />
                  </div>
                  <span className={cx('mt-2 text-[11px] font-semibold sm:text-xs', done ? 'text-brand-700 dark:text-brand-400' : 'text-ink-400')}>
                    {ORDER_STATUS[step]?.label ?? step}
                  </span>
                </li>
              );
            })}
          </ol>

          {order.trackingCode && (
            <p className="mt-5 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-900">
              Mã vận đơn: <b className="tracking-wider">{order.trackingCode}</b>
            </p>
          )}
        </section>
      ) : (
        <section className="card-surface border-rose-200 bg-rose-50/50 p-6 dark:border-rose-900 dark:bg-rose-950/20">
          <p className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" /> Đơn hàng {ORDER_STATUS[order.status]?.label.toLowerCase() ?? order.status}
          </p>
          <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-400">
            Nếu bạn đã thanh toán, số tiền sẽ được hoàn trong 3–5 ngày làm việc. Liên hệ hotline nếu cần hỗ trợ thêm.
          </p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* ── Sản phẩm ── */}
          <section className="card-surface overflow-hidden">
            <h2 className="border-b border-ink-100 px-5 py-4 font-bold dark:border-ink-800">Sản phẩm ({order.items.length})</h2>
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 p-5">
                  <Link href={`/products/${item.productSlug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
                    {item.imageUrl && <Image src={item.imageUrl} alt={item.productName} fill sizes="80px" className="object-cover" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${item.productSlug}`} className="line-clamp-2 font-semibold hover:text-brand-600">
                      {item.productName}
                    </Link>
                    {item.variantName && <p className="mt-0.5 text-xs text-ink-500">Phân loại: {item.variantName}</p>}
                    <p className="mt-1 text-xs text-ink-500">SKU: {item.sku}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-ink-500">
                        {formatVND(item.unitPrice)} × {item.quantity}
                      </span>
                      <span className="font-bold">{formatVND(item.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Lịch sử trạng thái ── */}
          {order.history.length > 0 && (
            <section className="card-surface p-5">
              <h2 className="font-bold">Lịch sử đơn hàng</h2>
              <ol className="mt-4 space-y-4">
                {order.history.map((h, i) => (
                  <li key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={cx('h-2.5 w-2.5 rounded-full', i === 0 ? 'bg-brand-600' : 'bg-ink-300 dark:bg-ink-600')} />
                      {i < order.history.length - 1 && <span className="w-px flex-1 bg-ink-200 dark:bg-ink-700" />}
                    </div>
                    <div className="pb-1 text-sm">
                      <p className="font-semibold">{ORDER_STATUS[h.status]?.label ?? h.status}</p>
                      <p className="text-xs text-ink-500">{formatDate(h.createdAt, true)}</p>
                      {h.note && <p className="mt-1 text-xs text-ink-500">{h.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {/* ── Thanh toán ── */}
          {order.status === 'PENDING_PAYMENT' && order.paymentMethod === 'BANK_TRANSFER' && order.bankInfo && (
            <section className="card-surface border-brand-200 p-5 dark:border-brand-900">
              <h2 className="flex items-center gap-2 font-bold text-brand-700 dark:text-brand-400">
                <QrCode className="h-4 w-4" /> Chờ thanh toán
              </h2>
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
                Chuyển <b>{formatVND(order.bankInfo.amount)}</b> tới {order.bankInfo.bankName} — nội dung <b className="tracking-wider">{order.bankInfo.content}</b>
              </p>
              {order.paymentDueAt && <p className="mt-2 text-xs text-rose-600">Hạn thanh toán: {formatDate(order.paymentDueAt, true)}</p>}
              <Link href={`/order-success/${order.orderCode}`}>
                <Button className="mt-4 w-full">Xem mã QR &amp; xác nhận</Button>
              </Link>
            </section>
          )}

          {/* ── Tổng kết ── */}
          <section className="card-surface p-5">
            <h2 className="font-bold">Tổng kết đơn hàng</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Tạm tính</dt>
                <dd className="font-semibold">{formatVND(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Phí vận chuyển {shipping ? `(${shipping.label})` : ''}</dt>
                <dd className="font-semibold">{Number(order.shippingFee) === 0 ? 'Miễn phí' : formatVND(order.shippingFee)}</dd>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Giảm giá {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                  <dd className="font-semibold">−{formatVND(order.discountAmount)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-dashed border-ink-200 pt-3 dark:border-ink-700">
                <dt className="font-bold">Tổng cộng</dt>
                <dd className="text-xl font-extrabold text-brand-700 dark:text-brand-400">{formatVND(order.totalAmount)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-500">Phương thức: {PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
          </section>

          {/* ── Địa chỉ giao ── */}
          <section className="card-surface p-5">
            <h2 className="font-bold">Địa chỉ giao hàng</h2>
            <p className="mt-3 text-sm font-semibold">{order.recipientName}</p>
            <p className="text-sm text-ink-500">{order.recipientPhone}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{address}</p>
            {order.note && <p className="mt-3 rounded-lg bg-ink-50 p-3 text-xs dark:bg-ink-900">Ghi chú: {order.note}</p>}
          </section>
        </aside>
      </div>

      {/* ── Modal huỷ ── */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Huỷ đơn hàng">
        <p className="text-sm text-ink-600 dark:text-ink-400">Đơn hàng sẽ bị huỷ ngay. Bạn có thể đặt lại bất cứ lúc nào.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Lý do huỷ đơn (ít nhất 3 ký tự)"
          className="mt-4 w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm dark:border-ink-700 dark:bg-ink-900"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCancelOpen(false)}>
            Đóng
          </Button>
          <Button variant="danger" loading={busy} onClick={doCancel}>
            Xác nhận huỷ
          </Button>
        </div>
      </Modal>

      {/* ── Modal trả hàng ── */}
      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Yêu cầu trả hàng">
        <p className="text-sm text-ink-600 dark:text-ink-400">Shop sẽ liên hệ trong 24h để xác nhận và hướng dẫn gửi hàng về.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Mô tả lý do trả hàng (sản phẩm lỗi, không đúng mô tả…)"
          className="mt-4 w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm dark:border-ink-700 dark:bg-ink-900"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setReturnOpen(false)}>
            Đóng
          </Button>
          <Button loading={busy} onClick={doReturn}>
            Gửi yêu cầu
          </Button>
        </div>
      </Modal>
    </div>
  );
}
