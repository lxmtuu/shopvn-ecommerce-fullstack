'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Copy, Download, Loader2, Package, RefreshCw, Upload, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Skeleton } from '@/components/ui';
import { api, apiData, ApiError } from '@/lib/api';
import { cx, formatVND } from '@/lib/format';
import type { PaymentInfo } from '@/types';

export default function OrderSuccessPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['payment', code],
    queryFn: () => apiData<PaymentInfo>(`/payments/${code}/info`),
    // Đang chờ tiền về → tự động kiểm tra lại mỗi 10 giây (webhook có thể đã xác nhận)
    refetchInterval: (q) => {
      const d = q.state.data as PaymentInfo | undefined;
      return d && d.status === 'UNPAID' && d.orderStatus === 'PENDING_PAYMENT' ? 10000 : false;
    },
    retry: 1,
  });

  /* Đồng hồ đếm ngược tới hạn thanh toán */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = data?.expiresAt ? Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - now) / 1000)) : null;
  const expired = secondsLeft === 0;
  const countdown = secondsLeft === null ? null : `${String(Math.floor(secondsLeft / 3600)).padStart(2, '0')}:${String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const confirmTransfer = useMutation({
    mutationFn: () => apiData(`/payments/${code}/confirm-transfer`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Đã ghi nhận! Shop sẽ kiểm tra và xác nhận đơn của bạn.');
      qc.invalidateQueries({ queryKey: ['payment', code] });
      refetch();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Không gửi được xác nhận'),
  });

  const uploadProof = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploaded = await api<{ data: { url: string } }>('/uploads/image', { method: 'POST', body: fd });
      await api(`/payments/${code}/proof`, { method: 'POST', body: { url: uploaded.data.url } });
      setProofUrl(uploaded.data.url);
      toast.success('Đã gửi ảnh xác nhận chuyển khoản');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Tải ảnh thất bại');
    } finally {
      setUploading(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`Đã copy ${label}`))
      .catch(() => toast.error('Không copy được'));
  };

  if (isLoading) {
    return (
      <div className="container-page max-w-3xl py-12">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="mt-6 h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <Package className="mx-auto h-12 w-12 text-ink-300" />
        <h1 className="mt-4 text-xl font-bold">Không tìm thấy đơn hàng</h1>
        <p className="mt-2 text-sm text-ink-500">Mã đơn “{code}” không tồn tại hoặc bạn không có quyền xem.</p>
        <Button className="mt-6" onClick={() => router.push('/account/orders')}>
          Xem đơn hàng của tôi
        </Button>
      </div>
    );
  }

  const paid = data.status === 'PAID' || data.orderStatus === 'CONFIRMED' || !['PENDING_PAYMENT'].includes(data.orderStatus);
  const isCod = !data.qrDataUrl && !data.bank?.accountNo;

  return (
    <div className="container-page max-w-4xl py-10">
      {/* ═════ Banner trạng thái ═════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={cx(
          'relative overflow-hidden rounded-3xl p-8 text-center text-white',
          paid ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-brand-600 to-brand-800',
        )}
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/20 backdrop-blur"
        >
          <CheckCircle2 className="h-9 w-9" />
        </motion.span>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{paid ? 'Đơn hàng đã được xác nhận!' : 'Đặt hàng thành công!'}</h1>
        <p className="mt-2 text-sm text-white/85">
          Mã đơn hàng: <b className="tracking-wider">{data.orderCode}</b> · Tổng tiền: <b>{formatVND(data.amount)}</b>
        </p>
        <p className="mt-1 text-xs text-white/70">Chúng tôi đã gửi email xác nhận đơn hàng cho bạn</p>
      </motion.div>

      {/* ═════ Trạng thái đơn ═════ */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cx('inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold', paid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400')}>
            {paid ? 'Đã thanh toán' : expired ? 'Quá hạn thanh toán' : 'Đang chờ thanh toán'}
            {!paid && !expired && <Loader2 className="h-3 w-3 animate-spin" />}
          </span>
          {countdown && !paid && (
            <span className="text-xs text-ink-500">
              Còn lại <b className="tabular-nums text-rose-600">{countdown}</b>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Kiểm tra lại
          </Button>
          <Link href={`/account/orders/${data.orderCode}`}>
            <Button size="sm" variant="outline">
              Chi tiết đơn
            </Button>
          </Link>
        </div>
      </div>

      {/* ═════ Nội dung thanh toán ═════ */}
      {paid ? (
        <div className="card-surface mt-6 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-3 font-semibold">Cảm ơn bạn đã mua sắm tại ShopVN!</p>
          <p className="mt-1 text-sm text-ink-500">Đơn hàng đang được chuẩn bị. Bạn sẽ nhận email khi đơn được giao cho đơn vị vận chuyển.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/products">
              <Button>Tiếp tục mua sắm</Button>
            </Link>
            <Link href="/account/orders">
              <Button variant="outline">Xem tất cả đơn hàng</Button>
            </Link>
          </div>
        </div>
      ) : isCod ? (
        <div className="card-surface mt-6 p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Wallet className="h-5 w-5 text-brand-600" /> Thanh toán khi nhận hàng (COD)
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
            Bạn sẽ thanh toán <b>{formatVND(data.amount)}</b> cho nhân viên giao hàng. Vui lòng kiểm tra kỹ sản phẩm trước khi trả tiền. Đơn hàng đang chờ shop xác nhận.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* QR */}
          <div className="card-surface p-6 text-center">
            <h2 className="font-bold">Quét mã để thanh toán</h2>
            <p className="mt-1 text-xs text-ink-500">Mở app ngân hàng → quét QR → số tiền điền sẵn</p>

            <div className="relative mx-auto mt-4 aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl border-2 border-ink-200 bg-white p-3 dark:border-ink-700">
              {data.qrDataUrl ? (
                <Image src={data.qrDataUrl} alt={`QR thanh toán đơn ${data.orderCode}`} fill sizes="260px" className="object-contain" unoptimized />
              ) : (
                <div className="grid h-full place-items-center text-ink-400">
                  <AlertTriangle className="h-8 w-8" />
                </div>
              )}
            </div>

            <a
              href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/payments/${data.orderCode}/qr.png`}
              download={`QR-${data.orderCode}.png`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
            >
              <Download className="h-4 w-4" /> Tải ảnh QR về máy
            </a>
          </div>

          {/* Thông tin chuyển khoản */}
          <div className="space-y-4">
            <div className="card-surface p-6">
              <h2 className="font-bold">Thông tin chuyển khoản</h2>
              <dl className="mt-4 divide-y divide-ink-100 dark:divide-ink-800">
                {[
                  ['Ngân hàng', data.bank.name],
                  ['Số tài khoản', data.bank.accountNo],
                  ['Chủ tài khoản', data.bank.accountName],
                  ['Số tiền', formatVND(data.amount)],
                  ['Nội dung chuyển khoản', data.transferContent],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-3">
                    <dt className="text-sm text-ink-500">{label}</dt>
                    <dd className="flex items-center gap-2 text-right text-sm font-bold">
                      <span className={label === 'Nội dung chuyển khoản' ? 'tracking-wider text-brand-700 dark:text-brand-400' : ''}>{value}</span>
                      <button onClick={() => copy(String(value), label)} className="text-ink-400 transition hover:text-brand-600" aria-label={`Copy ${label}`}>
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <b>Lưu ý quan trọng:</b> ghi đúng nội dung <b className="tracking-wider">{data.transferContent}</b> để hệ thống tự động xác nhận đơn. Sai nội dung có thể khiến đơn bị chậm xử lý.
              </div>
            </div>

            <div className="card-surface p-6">
              <h2 className="font-bold">Đã chuyển khoản rồi?</h2>
              <p className="mt-1 text-sm text-ink-500">Bấm xác nhận để shop kiểm tra nhanh hơn, hoặc gửi ảnh bill chuyển khoản.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button loading={confirmTransfer.isPending} onClick={() => confirmTransfer.mutate()}>
                  Tôi đã chuyển khoản
                </Button>
                <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink-200 px-5 text-sm font-semibold transition hover:border-brand-500 hover:text-brand-600 dark:border-ink-700">
                  <input type="file" accept="image/*" hidden disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])} />
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Gửi ảnh bill
                </label>
              </div>

              {proofUrl && (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg">
                    <Image src={proofUrl} alt="Ảnh bill" fill sizes="56px" className="object-cover" />
                  </div>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Đã gửi ảnh — shop sẽ xác nhận trong ít phút</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
