'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Drawer, EmptyState } from '@/components/ui';
import { formatVND } from '@/lib/format';
import { useCartStore } from '@/store/cart.store';

export function MiniCartDrawer() {
  const { cart, drawerOpen, closeDrawer, updateQuantity, removeItem } = useCartStore();

  const freeShipGap = Number(cart?.amountToFreeShipping ?? 0);

  return (
    <Drawer open={drawerOpen} onClose={closeDrawer} title={`Giỏ hàng (${cart?.distinctCount ?? 0})`}>
      {!cart || cart.items.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<ShoppingBag className="h-7 w-7" />}
            title="Giỏ hàng đang trống"
            description="Thêm sản phẩm bạn thích để tiến hành đặt hàng nhé!"
            action={
              <Link href="/products" onClick={closeDrawer}>
                <Button>Khám phá sản phẩm</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {freeShipGap > 0 && (
            <div className="flex items-center gap-2 border-b border-ink-200 bg-brand-50 px-5 py-3 text-xs font-medium text-brand-700 dark:border-ink-800 dark:bg-brand-950 dark:text-brand-300">
              <Truck className="h-4 w-4 shrink-0" />
              Mua thêm <strong>{formatVND(freeShipGap)}</strong> để được miễn phí vận chuyển
            </div>
          )}

          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {cart.items.map((item) => (
              <li key={item.id} className="flex gap-3 p-4">
                <Link href={`/products/${item.slug}`} onClick={closeDrawer} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
                  {item.image && <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.slug}`} onClick={closeDrawer} className="line-clamp-2 text-sm font-semibold hover:text-brand-600">
                    {item.name}
                  </Link>
                  {item.variantName && <p className="text-xs text-ink-500">{item.variantName}</p>}
                  <p className="mt-1 text-sm font-bold text-brand-600">{formatVND(item.unitPrice)}</p>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-ink-200 dark:border-ink-700">
                      <button
                        aria-label="Giảm số lượng"
                        onClick={() => updateQuantity(item.id, item.quantity - 1).catch((e) => toast.error(e.message))}
                        disabled={item.quantity <= 1}
                        className="grid h-8 w-8 place-items-center text-ink-500 disabled:opacity-40 hover:text-brand-600"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        aria-label="Tăng số lượng"
                        onClick={() => updateQuantity(item.id, item.quantity + 1).catch((e) => toast.error(e.message))}
                        disabled={item.quantity >= item.maxQuantity}
                        className="grid h-8 w-8 place-items-center text-ink-500 disabled:opacity-40 hover:text-brand-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      aria-label="Xoá sản phẩm"
                      onClick={() => removeItem(item.id).then(() => toast.success('Đã xoá khỏi giỏ hàng'))}
                      className="rounded-lg p-2 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="sticky bottom-0 space-y-3 border-t border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Tạm tính</span>
              <span className="font-bold">{formatVND(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Phí vận chuyển (tạm tính)</span>
              <span className="font-semibold">{Number(cart.shippingFeeEstimate) === 0 ? 'Miễn phí' : formatVND(cart.shippingFeeEstimate)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-ink-200 pt-3 text-base dark:border-ink-700">
              <span className="font-semibold">Tổng cộng</span>
              <span className="font-extrabold text-brand-600">{formatVND(cart.totalEstimate)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cart" onClick={closeDrawer}>
                <Button variant="outline" className="w-full">
                  Xem giỏ
                </Button>
              </Link>
              <Link href="/checkout" onClick={closeDrawer}>
                <Button className="w-full" disabled={cart.hasIssues}>
                  Thanh toán
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
}
