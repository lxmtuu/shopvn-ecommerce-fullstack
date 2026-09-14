'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { cx, formatVND } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { Badge, StarRating } from '@/components/ui';
import type { ProductCard as ProductCardType } from '@/types';

export function ProductCard({ product, index = 0 }: { product: ProductCardType; index?: number }) {
  const add = useCartStore((s) => s.add);
  const pendingId = useCartStore((s) => s.pendingId);
  const user = useAuthStore((s) => s.user);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);

  const image = product.thumbnail ?? product.thumbUrl ?? null;

  const onAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    const result = await add(product.id, 1);
    if (result.ok) toast.success(result.message, { description: product.name });
    else toast.error(result.message);
  };

  const onWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Vui lòng đăng nhập để lưu sản phẩm yêu thích');
    setWishBusy(true);
    try {
      const res = await api<{ data: { wishlisted: boolean } }>('/wishlist', { method: 'POST', body: { productId: product.id } });
      const next = res.data.wishlisted;
      setWishlisted(next);
      toast.success(next ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Có lỗi xảy ra');
    } finally {
      setWishBusy(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: Math.min(index, 11) * 0.03, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <Link
        href={`/products/${product.slug}`}
        className="card-surface block overflow-hidden p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
      >
        <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              {...(product.blurData ? { placeholder: 'blur' as const, blurDataURL: product.blurData } : {})}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-400">
              <ShoppingCart className="h-10 w-10" />
            </div>
          )}

          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            {product.discountPercent > 0 && <Badge tone="danger">-{product.discountPercent}%</Badge>}
            {product.isFeatured && <Badge tone="brand">Nổi bật</Badge>}
            {!product.inStock && <Badge tone="neutral">Hết hàng</Badge>}
          </div>

          <button
            onClick={onWishlist}
            disabled={wishBusy}
            aria-label="Thêm vào yêu thích"
            className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-ink-500 opacity-0 shadow-sm backdrop-blur transition-all duration-200 hover:text-brand-600 group-hover:opacity-100 focus:opacity-100 dark:bg-ink-900/90"
          >
            <Heart className={cx('h-4 w-4', wishlisted && 'fill-brand-600 text-brand-600')} />
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          {product.brand && <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">{product.brand.name}</p>}
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-ink-900 transition-colors group-hover:text-brand-600 dark:text-ink-50">
            {product.name}
          </h3>

          <StarRating value={product.avgRating} count={product.reviewCount} />

          <div className="flex items-end justify-between gap-2 pt-0.5">
            <div>
              <p className="text-base font-extrabold text-brand-600">{formatVND(product.effectivePrice)}</p>
              {product.salePrice && <p className="text-xs text-ink-400 line-through">{formatVND(product.price)}</p>}
            </div>
            <span className="text-[11px] text-ink-400">Đã bán {product.sold}</span>
          </div>
        </div>

        {/* Nút thêm vào giỏ: trượt lên khi hover (desktop) / luôn hiện (mobile) */}
        <div className="mt-3 translate-y-0 opacity-100 transition-all duration-300 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <button
            onClick={onAdd}
            disabled={!product.inStock || pendingId === product.id}
            className={cx(
              'flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all',
              product.inStock
                ? 'bg-ink-900 text-white hover:bg-brand-600 dark:bg-white dark:text-ink-900 dark:hover:bg-brand-600 dark:hover:text-white'
                : 'cursor-not-allowed bg-ink-200 text-ink-400 dark:bg-ink-800',
            )}
          >
            {product.inStock ? (
              <>
                <ShoppingCart className="h-4 w-4" />
                Thêm vào giỏ
              </>
            ) : (
              'Tạm hết hàng'
            )}
          </button>
        </div>
      </Link>

      {product.stock > 0 && product.stock <= 5 && (
        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-600">
          <Zap className="h-3 w-3" /> Chỉ còn {product.stock} sản phẩm
        </p>
      )}
    </motion.article>
  );
}
