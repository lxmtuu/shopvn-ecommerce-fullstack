'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Building2, Check, CreditCard, Loader2, MapPin, Plus, QrCode, ShieldCheck, Tag, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, EmptyState, Input, Skeleton } from '@/components/ui';
import { apiData, ApiError } from '@/lib/api';
import { cx, formatVND, SHIPPING_LABEL } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import type { Address, BankInfo } from '@/types';

interface CouponResult {
  valid: boolean;
  code: string;
  name: string;
  description: string | null;
  discountAmount: string;
}

const PAYMENTS = [
  { id: 'BANK_TRANSFER', label: 'Chuyển khoản QR', desc: 'Quét mã VietQR — đơn tự động xác nhận khi nhận tiền', icon: QrCode, badge: 'Khuyên dùng' },
  { id: 'COD', label: 'Thanh toán khi nhận hàng (COD)', desc: 'Kiểm tra hàng rồi mới trả tiền cho shipper', icon: Truck, badge: null },
] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const { cart, fetch: fetchCart } = useCartStore();

  const [addressId, setAddressId] = useState<string>('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'STANDARD' | 'EXPRESS' | 'INSTANT'>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'COD'>('BANK_TRANSFER');
  const [note, setNote] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    provinceName: '',
    districtName: '',
    wardName: '',
    detail: '',
  });

  /* ── Chặn truy cập khi chưa đăng nhập ── */
  useEffect(() => {
    if (status === 'guest') router.replace('/login?next=/checkout');
  }, [status, router]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const { data: addresses, isLoading: loadingAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiData<Address[]>('/addresses'),
    enabled: status === 'authenticated',
  });

  const { data: availableCoupons } = useQuery({
    queryKey: ['coupons', 'available'],
    queryFn: () => apiData<{ code: string; name: string; description: string | null; minOrderValue: string; eligible: boolean | null }[]>('/coupons/available'),
  });

  // Phí ship + ngưỡng freeship do admin cấu hình trong trang Cấu hình shop.
  // Backend đọc cùng nguồn này (lib/shipping.ts) nên số hiển thị = số thu thật.
  const { data: shop } = useQuery({
    queryKey: ['bank-info'],
    queryFn: () => apiData<BankInfo>('/bank-info'),
    staleTime: 5 * 60 * 1000,
  });

  /* ── Điền sẵn tên/SĐT từ hồ sơ ── */
  useEffect(() => {
    if (user && !form.fullName) setForm((f) => ({ ...f, fullName: user.fullName, phone: user.phone ?? '' }));
  }, [user, form.fullName]);

  /* ── Chọn địa chỉ mặc định ── */
  useEffect(() => {
    if (addresses && addresses.length > 0 && !addressId) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      setAddressId(def.id);
      setShowNewAddress(false);
    } else if (addresses && addresses.length === 0) {
      setShowNewAddress(true);
    }
  }, [addresses, addressId]);

  const selectedAddress = addresses?.find((a) => a.id === addressId) ?? null;
  const subtotal = Number(cart?.subtotal ?? 0);
  const shippingFees = shop?.shippingFees ?? {};
  const shippingFee = Number(shippingFees[shippingMethod] ?? SHIPPING_LABEL[shippingMethod].fee);
  const freeShipThreshold = shop?.freeShipThreshold ?? cart?.freeShippingThreshold ?? 500000;
  /**
   * Chỉ đơn STANDARD được miễn phí ship (đúng như backend tính): trước đây FE
   * miễn phí cho mọi phương thức nên đơn EXPRESS/INSTANT hiển thị 0đ nhưng
   * khi đặt lại bị thu tiền ⇒ khách thấy tổng tiền "nhảy".
   */
  const isFreeShip = shippingMethod === 'STANDARD' && subtotal >= freeShipThreshold;
  const effectiveShipping = subtotal <= 0 ? 0 : isFreeShip ? 0 : shippingFee;
  const discount = Number(coupon?.discountAmount ?? 0);
  const total = Math.max(0, subtotal + effectiveShipping - discount);

  const validateCoupon = useMutation({
    mutationFn: (code: string) => apiData<CouponResult>('/coupons/validate', { method: 'POST', body: { code } }),
    onSuccess: (res) => {
      setCoupon(res);
      toast.success(`Áp dụng mã ${res.code}: −${formatVND(res.discountAmount)}`);
    },
    onError: (err) => {
      setCoupon(null);
      toast.error(err instanceof ApiError ? err.message : 'Mã giảm giá không hợp lệ');
    },
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        shippingMethod,
        paymentMethod,
        note: note || undefined,
        couponCode: coupon?.code,
      };

      if (showNewAddress || !selectedAddress) {
        Object.assign(payload, {
          recipientName: form.fullName,
          recipientPhone: form.phone,
          provinceName: form.provinceName,
          districtName: form.districtName || undefined,
          wardName: form.wardName || undefined,
          detail: form.detail,
          saveAddress,
        });
      } else {
        payload.addressId = selectedAddress.id;
      }

      return apiData<{ orderCode: string; totalAmount: string }>('/orders', { method: 'POST', body: payload });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      fetchCart();
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Đặt hàng thành công!');
      router.push(`/order-success/${res.orderCode}`);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không đặt được hàng, vui lòng thử lại');
    },
  });

  const items = useMemo(() => cart?.items ?? [], [cart]);

  if (status === 'loading' || (status === 'authenticated' && !cart)) {
    return (
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={<Truck className="h-7 w-7" />}
          title="Không có sản phẩm để thanh toán"
          description="Giỏ hàng của bạn đang trống hoặc sản phẩm đã được đặt ở tab khác."
          action={
            <Link href="/products">
              <Button>Chọn sản phẩm</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Thanh toán</h1>
      <p className="mt-1 text-sm text-ink-500">Hoàn tất 3 bước: địa chỉ giao hàng → hình thức giao → thanh toán</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* ══════════ 1. ĐỊA CHỈ ══════════ */}
          <section className="card-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>
              <MapPin className="h-4 w-4 text-brand-600" /> Địa chỉ giao hàng
            </h2>

            {loadingAddresses ? (
              <Skeleton className="mt-4 h-20 w-full rounded-xl" />
            ) : (
              <>
                {addresses && addresses.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {addresses.map((a) => (
                      <label
                        key={a.id}
                        className={cx(
                          'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition',
                          !showNewAddress && addressId === a.id ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40' : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
                        )}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={!showNewAddress && addressId === a.id}
                          onChange={() => {
                            setAddressId(a.id);
                            setShowNewAddress(false);
                          }}
                          className="mt-1 h-4 w-4 text-brand-600"
                        />
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="flex flex-wrap items-center gap-2 font-bold">
                            {a.fullName} · {a.phone}
                            {a.isDefault && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">Mặc định</span>}
                          </span>
                          <span className="mt-1 block text-ink-600 dark:text-ink-400">
                            {[a.detail, a.wardName, a.districtName, a.provinceName].filter(Boolean).join(', ')}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setShowNewAddress((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
                >
                  {showNewAddress ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showNewAddress ? 'Dùng địa chỉ đã lưu' : 'Giao đến địa chỉ khác'}
                </button>

                <AnimatePresence>
                  {showNewAddress && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-4 grid gap-4 rounded-xl bg-ink-50 p-4 sm:grid-cols-2 dark:bg-ink-900">
                        <Input label="Tên người nhận *" value={form.fullName} error={errors.recipientName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Nguyễn Văn A" />
                        <Input label="Số điện thoại *" value={form.phone} error={errors.recipientPhone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0912345678" inputMode="tel" />
                        <Input label="Tỉnh / Thành phố *" value={form.provinceName} error={errors.provinceName} onChange={(e) => setForm({ ...form, provinceName: e.target.value })} placeholder="Lâm Đồng" />
                        <Input label="Quận / Huyện" value={form.districtName} onChange={(e) => setForm({ ...form, districtName: e.target.value })} placeholder="TP. Đà Lạt" />
                        <Input label="Phường / Xã" value={form.wardName} onChange={(e) => setForm({ ...form, wardName: e.target.value })} placeholder="Phường 1" />
                        <Input label="Địa chỉ chi tiết *" value={form.detail} error={errors.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="Số 12, đường Trần Phú" />
                        <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
                          <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 rounded text-brand-600" />
                          Lưu địa chỉ này vào sổ địa chỉ của tôi
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </section>

          {/* ══════════ 2. HÌNH THỨC GIAO ══════════ */}
          <section className="card-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>
              <Truck className="h-4 w-4 text-brand-600" /> Hình thức giao hàng
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {Object.entries(SHIPPING_LABEL).map(([key, value]) => {
                // Phí hiển thị theo cấu hình shop; freeship chỉ áp dụng cho STANDARD
                const fee = Number(shippingFees[key] ?? value.fee);
                const free = key === 'STANDARD' && subtotal > 0 && subtotal >= freeShipThreshold;
                return (
                <button
                  key={key}
                  onClick={() => setShippingMethod(key as typeof shippingMethod)}
                  className={cx(
                    'rounded-xl border-2 p-4 text-left transition',
                    shippingMethod === key ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40' : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
                  )}
                >
                  <p className="text-sm font-bold">{value.label}</p>
                  <p className="mt-1 text-xs text-ink-500">{value.desc}</p>
                  <p className="mt-2 text-sm font-bold text-brand-700 dark:text-brand-400">{free ? 'Miễn phí' : formatVND(fee)}</p>
                </button>
                );
              })}
            </div>
          </section>

          {/* ══════════ 3. THANH TOÁN ══════════ */}
          <section className="card-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">3</span>
              <CreditCard className="h-4 w-4 text-brand-600" /> Phương thức thanh toán
            </h2>
            <div className="mt-4 space-y-3">
              {PAYMENTS.map(({ id, label, desc, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className={cx(
                    'flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition',
                    paymentMethod === id ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40' : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
                  )}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-bold">
                      {label}
                      {badge && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">{badge}</span>}
                    </span>
                    <span className="mt-1 block text-xs text-ink-500">{desc}</span>
                  </span>
                  {paymentMethod === id && <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />}
                </button>
              ))}

              <div className="grid gap-3 sm:grid-cols-2">
                {['VNPay', 'Ví MoMo'].map((name) => (
                  <div key={name} className="flex items-center gap-3 rounded-xl border-2 border-dashed border-ink-200 p-4 opacity-60 dark:border-ink-700">
                    <Building2 className="h-5 w-5 text-ink-400" />
                    <span className="text-sm">
                      <span className="block font-semibold">{name}</span>
                      <span className="text-xs text-ink-500">Sắp ra mắt</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════ Ghi chú ══════════ */}
          <section className="card-surface p-5">
            <label htmlFor="note" className="text-lg font-bold">
              Ghi chú đơn hàng
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ví dụ: giao ngoài giờ hành chính, gọi trước khi giao…"
              className="mt-3 w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm dark:border-ink-700 dark:bg-ink-900"
            />
          </section>
        </div>

        {/* ══════════ TÓM TẮT ══════════ */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card-surface p-5">
            <h2 className="text-lg font-bold">Đơn hàng ({cart?.totalQuantity} sản phẩm)</h2>

            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((i) => (
                <li key={i.id} className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                    {i.image && <Image src={i.image} alt={i.name} fill sizes="56px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="line-clamp-2 leading-snug">{i.name}</p>
                    {i.variantName && <p className="text-xs text-ink-500">{i.variantName}</p>}
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatVND(i.unitPrice)} × {i.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{formatVND(i.lineTotal)}</span>
                </li>
              ))}
            </ul>

            {/* Mã giảm giá */}
            <div className="mt-5 border-t border-ink-200 pt-5 dark:border-ink-800">
              <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                <Tag className="h-4 w-4 text-brand-600" /> Mã giảm giá
              </label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-3.5 text-sm uppercase dark:border-ink-700 dark:bg-ink-900"
                />
                <Button
                  variant="outline"
                  loading={validateCoupon.isPending}
                  onClick={() => couponCode && validateCoupon.mutate(couponCode)}
                >
                  Áp dụng
                </Button>
              </div>

              {coupon && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <BadgeCheck className="h-3.5 w-3.5" /> Đã áp dụng {coupon.code} — giảm {formatVND(coupon.discountAmount)}
                  <button onClick={() => setCoupon(null)} className="ml-1 text-ink-400 hover:text-rose-600" aria-label="Bỏ mã">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </p>
              )}

              {availableCoupons && availableCoupons.length > 0 && !coupon && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {availableCoupons.slice(0, 3).map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCouponCode(c.code);
                        validateCoupon.mutate(c.code);
                      }}
                      disabled={c.eligible === false}
                      className="rounded-full border border-dashed border-brand-400 px-2.5 py-1 text-[11px] font-bold text-brand-700 transition hover:bg-brand-50 disabled:opacity-40 dark:text-brand-300"
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-ink-200 pt-5 text-sm dark:border-ink-800">
              <div className="flex justify-between">
                <dt className="text-ink-500">Tạm tính</dt>
                <dd className="font-semibold">{formatVND(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Phí vận chuyển</dt>
                <dd className="font-semibold">{effectiveShipping === 0 ? 'Miễn phí' : formatVND(effectiveShipping)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt className="flex items-center gap-1">Giảm giá ({coupon?.code})</dt>
                  <dd className="font-semibold">−{formatVND(discount)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-dashed border-ink-200 pt-3 text-base dark:border-ink-700">
                <dt className="font-bold">Tổng thanh toán</dt>
                <dd className="text-xl font-extrabold text-brand-700 dark:text-brand-400">{formatVND(total)}</dd>
              </div>
            </dl>

            <Button size="lg" className="mt-5 w-full" loading={placeOrder.isPending} onClick={() => placeOrder.mutate()}>
              {placeOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Đặt hàng
            </Button>

            <p className="mt-3 text-center text-xs leading-relaxed text-ink-400">
              Bằng việc đặt hàng, bạn đồng ý với <Link href="/terms" className="underline">điều khoản</Link> và{' '}
              <Link href="/privacy" className="underline">chính sách bảo mật</Link> của ShopVN.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
