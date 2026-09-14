'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Minus, Package, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { formatVND } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';

const FREE_SHIP = 500000;

export default function CartPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { cart, loading, fetch, updateQuantity, removeItem, clear } = useCartStore();
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const items = cart?.items ?? [];
  const subtotal = Number(cart?.subtotal ?? 0);
  const freeShipThreshold = cart?.freeShippingThreshold ?? FREE_SHIP;
  const remaining = Math.max(0, freeShipThreshold - subtotal);
  const progress = Math.min(100, (subtotal / freeShipThreshold) * 100);

  const changeQuantity = async (itemId: string, quantity: number) => {
    setBusyId(itemId);
    try {
      await updateQuantity(itemId, quantity);
    } catch {
      toast.error('Không cập nhật được số lượng — có thể đã vượt tồn kho');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (itemId: string, name: string) => {
    try {
      await removeItem(itemId);
      toast.success('Đã xoá sản phẩm khỏi giỏ', { description: name });
    } catch {
      toast.error('Không xoá được sản phẩm');
    }
  };

  const goCheckout = () => {
    if (!user) {
      toast.info('Vui lòng đăng nhập để thanh toán');
      router.push('/login?next=/checkout');
      return;
    }
    router.push('/checkout');
  };

  if (loading && !cart) {
    return (
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Giỏ hàng của bạn đang trống"
          description="Khám phá hàng nghìn sản phẩm chính hãng — thêm vào giỏ để bắt đầu mua sắm nhé!"
          action={
            <Link href="/products">
              <Button size="lg">
                Mua sắm ngay <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Giỏ hàng của bạn</h1>
          <p className="mt-1 text-sm text-ink-500">
            {cart?.totalQuantity} sản phẩm · {cart?.distinctCount} loại
          </p>
        </div>
        <button
          onClick={async () => {
            if (!confirm('Xoá toàn bộ giỏ hàng?')) return;
            await clear();
            toast.success('Đã xoá toàn bộ giỏ hàng');
          }}
          className="text-sm font-semibold text-rose-600 hover:underline"
        >
          Xoá tất cả
        </button>
      </div>

      {/* Thanh tiến trình freeship */}
      <div className="card-surface mb-6 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Truck className="h-4 w-4 text-brand-600" />
          {remaining > 0 ? (
            <span>
              Mua thêm <b className="text-brand-600">{formatVND(remaining)}</b> để được <b>miễn phí vận chuyển</b>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 font-semibold text-emerald-600"><Truck className="h-4 w-4" aria-hidden /> Đơn hàng của bạn được miễn phí vận chuyển!</span>
          )}
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ───────── Danh sách sản phẩm ───────── */}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="card-surface flex gap-4 p-4"
              >
                <Link href={`/products/${item.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="96px"
                      placeholder={item.blurData ? 'blur' : 'empty'}
                      blurDataURL={item.blurData ?? undefined}
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-ink-400">
                      <Package className="h-6 w-6" />
                    </span>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/products/${item.slug}`} className="line-clamp-2 font-semibold leading-snug hover:text-brand-600">
                        {item.name}
                      </Link>
                      {item.variantName && <p className="mt-0.5 text-xs text-ink-500">Phân loại: {item.variantName}</p>}
                    </div>
                    <button
                      onClick={() => remove(item.id, item.name)}
                      className="shrink-0 rounded-lg p-2 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                      aria-label={`Xoá ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {!item.available && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> Sản phẩm đã ngừng bán — hãy xoá khỏi giỏ
                    </p>
                  )}
                  {item.available && item.exceedsStock && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> Chỉ còn {item.stock} sản phẩm trong kho
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                    <div className="flex items-center rounded-xl border border-ink-200 dark:border-ink-700">
                      <button
                        onClick={() => changeQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || busyId === item.id}
                        className="grid h-9 w-9 place-items-center disabled:opacity-40"
                        aria-label="Giảm"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => changeQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.maxQuantity || busyId === item.id}
                        className="grid h-9 w-9 place-items-center disabled:opacity-40"
                        aria-label="Tăng"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-brand-700 dark:text-brand-400">{formatVND(item.lineTotal)}</p>
                      <p className="text-xs text-ink-500">{formatVND(item.unitPrice)} / sản phẩm</p>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>

          <Link href="/products" className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-brand-600 hover:underline">
            ← Tiếp tục mua sắm
          </Link>
        </div>

        {/* ───────── Tóm tắt đơn ───────── */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card-surface p-5">
            <h2 className="text-lg font-bold">Tóm tắt đơn hàng</h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Tạm tính ({cart?.totalQuantity} sản phẩm)</dt>
                <dd className="font-semibold">{formatVND(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Phí vận chuyển (tạm tính)</dt>
                <dd className="font-semibold">{Number(cart?.shippingFeeEstimate ?? 0) === 0 ? 'Miễn phí' : formatVND(cart?.shippingFeeEstimate)}</dd>
              </div>
              <div className="flex justify-between border-t border-dashed border-ink-200 pt-3 text-base dark:border-ink-700">
                <dt className="font-bold">Tổng cộng</dt>
                <dd className="text-xl font-extrabold text-brand-700 dark:text-brand-400">{formatVND(cart?.totalEstimate)}</dd>
              </div>
            </dl>

            <p className="mt-3 text-xs text-ink-400">Phí ship chính xác được tính lại ở bước thanh toán theo địa chỉ và hình thức giao hàng.</p>

            {cart?.hasIssues && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                Một số sản phẩm không còn đủ số lượng. Vui lòng xử lý trước khi thanh toán.
              </p>
            )}

            <Button size="lg" className="mt-5 w-full" disabled={cart?.hasIssues} onClick={goCheckout}>
              Tiến hành thanh toán <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="mt-4 space-y-2 text-xs text-ink-500">
              <p className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Thanh toán QR chuyển khoản — xác nhận tự động
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Hoặc thanh toán khi nhận hàng (COD)
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Kiểm tra hàng trước khi thanh toán
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
