'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck, ChevronLeft, ChevronRight, Copy, Facebook, Heart, Minus, Package, Plus, RotateCcw,
  Share2, ShieldCheck, ShoppingCart, Tag, Truck, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, EmptyState, Skeleton, StarRating } from '@/components/ui';
import { ProductCard } from '@/components/shop/ProductCard';
import { ReviewsSection } from '@/components/shop/ReviewsSection';
import { api, apiData, ApiError } from '@/lib/api';
import { cx, formatNumber, formatVND } from '@/lib/format';
import { SITE_URL } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import type { ProductCard as ProductCardType, ProductDetail, ProductVariant } from '@/types';

const TABS = [
  { id: 'desc', label: 'Mô tả sản phẩm' },
  { id: 'specs', label: 'Thông số kỹ thuật' },
  { id: 'reviews', label: 'Đánh giá' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** `?tab=reviews` / `?tab=specs` trên URL → tab tương ứng (mặc định: mô tả) */
const tabFromQuery = (value: string | null): TabId =>
  value === 'reviews' || value === 'specs' ? value : 'desc';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') ?? null;
  const user = useAuthStore((s) => s.user);
  const addToCart = useCartStore((s) => s.add);

  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  // Đọc tab từ URL ngay từ lần render đầu → mở link ?tab=reviews là thấy đánh giá luôn.
  const [tab, setTab] = useState<TabId>(() => tabFromQuery(tabParam));
  const [tabsEl, setTabsEl] = useState<HTMLDivElement | null>(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [busy, setBusy] = useState(false);

  // Đồng bộ khi URL đổi (bấm back/forward, dán link khác tab) và cuộn tới phần tab
  useEffect(() => {
    setTab(tabFromQuery(tabParam));
    if (tabParam === 'reviews' && tabsEl) {
      tabsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  /**
   * Đổi tab + ghi lên URL → link đánh giá/specs chia sẻ được:
   * `/products/<slug>?tab=reviews`. Nhờ vậy README có thể trỏ thẳng tới phần đánh giá.
   */
  const changeTab = (id: TabId) => {
    setTab(id);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (id === 'desc') params.delete('tab');
    else params.set('tab', id);
    const qs = params.toString();
    router.replace(`/products/${slug}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => apiData<ProductDetail>(`/products/${slug}`),
    retry: 1,
  });

  const { data: related } = useQuery({
    queryKey: ['product-related', slug],
    queryFn: () => apiData<ProductCardType[]>(`/products/${slug}/related`),
  });

  useEffect(() => {
    if (product) {
      setWishlisted(product.isWishlisted);
      document.title = `${product.name} | ShopVN`;
    }
  }, [product]);

  const variant: ProductVariant | null = useMemo(
    () => product?.variants.find((v) => v.id === variantId) ?? null,
    [product, variantId],
  );

  const unitPrice = variant ? variant.effectivePrice : product?.effectivePrice ?? '0';
  const basePrice = variant ? variant.price : product?.price ?? '0';
  const salePrice = variant ? variant.salePrice : product?.salePrice ?? null;
  const stock = variant ? variant.stock : product?.stock ?? 0;
  const inStock = stock > 0;
  const discount = product ? (salePrice && Number(salePrice) < Number(basePrice) ? Math.round(((Number(basePrice) - Number(salePrice)) / Number(basePrice)) * 100) : 0) : 0;
  const savings = Number(basePrice) - Number(unitPrice);

  const gallery = useMemo(() => {
    if (!product) return [];
    const list = product.images.map((i) => ({ url: i.url, cardUrl: i.cardUrl ?? i.url, alt: i.alt, blurData: i.blurData }));
    if (variant?.imageUrl) list.unshift({ url: variant.imageUrl, cardUrl: variant.imageUrl, alt: variant.name, blurData: null });
    return list;
  }, [product, variant]);

  useEffect(() => setActiveImage(0), [variantId]);

  const onAddToCart = async (buyNow = false) => {
    if (!product) return;
    setBusy(true);
    const result = await addToCart(product.id, quantity, variantId);
    setBusy(false);
    if (!result.ok) return toast.error(result.message);
    toast.success(result.message, { description: `${product.name} × ${quantity}` });
    if (buyNow) router.push('/checkout');
  };

  const onWishlist = async () => {
    if (!product) return;
    if (!user) return toast.error('Vui lòng đăng nhập để lưu sản phẩm yêu thích');
    try {
      const res = await api<{ data: { wishlisted: boolean } }>('/wishlist', { method: 'POST', body: { productId: product.id } });
      setWishlisted(res.data.wishlisted);
      toast.success(res.data.wishlisted ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thực hiện được');
    }
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `${SITE_URL}/products/${slug}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Đã copy liên kết sản phẩm');
    } catch {
      toast.error('Không copy được — hãy copy thủ công trên thanh địa chỉ');
    }
  };

  /* ─────────────────────── Trạng thái tải / lỗi ─────────────────────── */
  if (isLoading) {
    return (
      <div className="container-page grid gap-10 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-52" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="Không tìm thấy sản phẩm"
          description="Sản phẩm có thể đã ngừng bán hoặc đường dẫn không đúng."
          action={<Button onClick={() => router.push('/products')}>Về danh sách sản phẩm</Button>}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      {/* ── Breadcrumb ── */}
      <nav aria-label="Đường dẫn" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-ink-500">
        <Link href="/" className="hover:text-brand-600">Trang chủ</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand-600">Sản phẩm</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-brand-600">{product.category.name}</Link>
        <span>/</span>
        <span className="line-clamp-1 font-medium text-ink-800 dark:text-ink-200">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* ══════════════ THƯ VIỆN ẢNH ══════════════ */}
        <div>
          <div className="group relative aspect-square overflow-hidden rounded-3xl border border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeImage}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
              >
                {gallery[activeImage] ? (
                  <Image
                    src={gallery[activeImage].cardUrl}
                    alt={gallery[activeImage].alt ?? product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                    placeholder={gallery[activeImage].blurData ? 'blur' : 'empty'}
                    blurDataURL={gallery[activeImage].blurData ?? undefined}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.35]"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-ink-400">
                    <Package className="h-16 w-16" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {discount > 0 && (
              <span className="absolute left-4 top-4 rounded-full bg-rose-600 px-3 py-1.5 text-sm font-bold text-white shadow-lg">-{discount}%</span>
            )}

            {gallery.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-800 opacity-0 shadow-lg transition group-hover:opacity-100"
                  aria-label="Ảnh trước"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setActiveImage((i) => (i + 1) % gallery.length)}
                  className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-800 opacity-0 shadow-lg transition group-hover:opacity-100"
                  aria-label="Ảnh sau"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-3">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={cx(
                    'relative aspect-square overflow-hidden rounded-xl border-2 transition',
                    i === activeImage ? 'border-brand-600 ring-2 ring-brand-500/20' : 'border-ink-200 opacity-70 hover:opacity-100 dark:border-ink-700',
                  )}
                  aria-label={`Xem ảnh ${i + 1}`}
                >
                  <Image src={img.cardUrl} alt="" fill sizes="120px" className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Chính sách ngắn dưới ảnh */}
          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
            {[
              { icon: RotateCcw, label: 'Đổi trả 7 ngày' },
              { icon: ShieldCheck, label: `Bảo hành ${product.warrantyMonths ?? 12} tháng` },
              { icon: Truck, label: 'Miễn phí ship đơn 500K+' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl bg-ink-50 py-3 dark:bg-ink-900">
                <Icon className="mx-auto h-4 w-4 text-brand-600" />
                <p className="mt-1.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════ THÔNG TIN MUA ══════════════ */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.brand && (
              <Link href={`/products?brand=${product.brand.slug}`} className="text-sm font-semibold text-brand-600 hover:underline">
                {product.brand.name}
              </Link>
            )}
            <span className="text-ink-300">•</span>
            <span className="text-xs text-ink-500">Mã SP: {product.sku}</span>
            {product.isFeatured && <Badge tone="brand">Nổi bật</Badge>}
          </div>

          <h1 className="text-balance-vi mt-2 text-2xl font-extrabold leading-snug sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <StarRating value={product.rating.average} size={15} />
              <span className="font-bold">{product.rating.average.toFixed(1)}</span>
            </span>
            <button
              onClick={() => {
                changeTab('reviews');
                tabsEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="text-ink-500 hover:text-brand-600 dark:hover:text-brand-400"
            >
              ({product.rating.count} đánh giá)
            </button>
            <span className="text-ink-300">•</span>
            <span className="text-ink-500">Đã bán {formatNumber(product.sold)}</span>
            <span className="text-ink-300">•</span>
            <span className="text-ink-500">{formatNumber(product.viewCount)} lượt xem</span>
          </div>

          {product.shortDesc && <p className="mt-4 leading-relaxed text-ink-600 dark:text-ink-400">{product.shortDesc}</p>}

          {/* Giá */}
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-brand-50 to-white p-5 dark:from-brand-950/60 dark:to-ink-900">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-extrabold text-brand-700 dark:text-brand-400">{formatVND(unitPrice)}</span>
              {savings > 0 && (
                <>
                  <span className="text-lg text-ink-400 line-through">{formatVND(basePrice)}</span>
                  <Badge tone="danger">Tiết kiệm {formatVND(savings)}</Badge>
                </>
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-500">Giá đã gồm VAT — chưa gồm phí vận chuyển</p>
          </div>

          {/* Biến thể */}
          {product.variants.length > 0 && (
            <div className="mt-6">
              <p className="mb-2.5 text-sm font-bold">
                Chọn phân loại: <span className="font-normal text-ink-500">{variant?.name ?? 'Mặc định'}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const active = v.id === variantId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setVariantId(active ? null : v.id);
                        setQuantity(1);
                      }}
                      disabled={v.stock === 0}
                      className={cx(
                        'rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
                        active ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950' : 'border-ink-200 hover:border-brand-400 dark:border-ink-700',
                      )}
                    >
                      {v.name}
                      <span className="ml-2 text-xs font-normal text-ink-500">{formatVND(v.effectivePrice)}</span>
                      {v.stock === 0 && <span className="ml-2 text-xs text-rose-500">(hết)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tồn kho */}
          <div className="mt-5 flex items-center gap-2 text-sm">
            {inStock ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-600">Còn hàng</span>
                <span className="text-ink-500">({stock} sản phẩm{product.lowStockAlert > 0 && stock <= product.lowStockAlert ? ' — sắp hết' : ''})</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="font-semibold text-rose-600">Tạm hết hàng</span>
              </>
            )}
          </div>

          {/* Số lượng + hành động */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-ink-200 dark:border-ink-700">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="grid h-12 w-12 place-items-center text-ink-600 disabled:opacity-40"
                aria-label="Giảm số lượng"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                value={quantity}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, '')) || 1;
                  setQuantity(Math.min(Math.max(1, n), Math.min(stock || 1, 99)));
                }}
                className="h-12 w-14 border-x border-ink-200 bg-transparent text-center font-bold dark:border-ink-700"
                inputMode="numeric"
                aria-label="Số lượng"
              />
              <button
                onClick={() => setQuantity((q) => Math.min(q + 1, Math.min(stock, 99)))}
                disabled={quantity >= stock}
                className="grid h-12 w-12 place-items-center text-ink-600 disabled:opacity-40"
                aria-label="Tăng số lượng"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button size="lg" className="flex-1" disabled={!inStock} loading={busy} onClick={() => onAddToCart(false)}>
              <ShoppingCart className="h-5 w-5" /> Thêm vào giỏ
            </Button>

            <Button size="lg" variant="outline" onClick={onWishlist} aria-label="Yêu thích">
              <Heart className={cx('h-5 w-5', wishlisted && 'fill-rose-500 text-rose-500')} />
            </Button>
          </div>

          <Button size="lg" variant="secondary" className="mt-3 w-full" disabled={!inStock} onClick={() => onAddToCart(true)}>
            <Zap className="h-5 w-5" /> Mua ngay — thanh toán QR
          </Button>

          {/* Mã giảm giá của sản phẩm */}
          {product.coupons.length > 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-950/40">
              <p className="flex items-center gap-2 text-sm font-bold text-brand-700 dark:text-brand-300">
                <Tag className="h-4 w-4" /> Ưu đãi áp dụng cho sản phẩm này
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.coupons.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      navigator.clipboard.writeText(c.code).then(() => toast.success(`Đã copy mã ${c.code}`));
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-white px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100 dark:bg-ink-900"
                  >
                    {c.code}
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-500">Nhập mã ở bước thanh toán để được giảm giá</p>
            </div>
          )}

          {/* Chia sẻ */}
          <div className="mt-6 flex items-center gap-3 border-t border-ink-200 pt-5 dark:border-ink-800">
            <span className="flex items-center gap-1.5 text-sm text-ink-500">
              <Share2 className="h-4 w-4" /> Chia sẻ:
            </span>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#1877F2] text-white transition hover:opacity-85"
              aria-label="Chia sẻ Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href={`https://zalo.me/share?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#0068FF] text-xs font-bold text-white transition hover:opacity-85"
              aria-label="Chia sẻ Zalo"
            >
              Za
            </a>
            <button onClick={copyLink} className="grid h-9 w-9 place-items-center rounded-full bg-ink-100 transition hover:bg-ink-200 dark:bg-ink-800" aria-label="Copy liên kết">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════ TABS ══════════════ */}
      <div className="mt-14 scroll-mt-24" id="danh-gia" ref={setTabsEl}>
        <div className="flex gap-1 border-b border-ink-200 dark:border-ink-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
              className={cx(
                'relative px-4 py-3 text-sm font-semibold transition',
                tab === t.id ? 'text-brand-600' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200',
              )}
            >
              {t.label}
              {t.id === 'reviews' && ` (${product.rating.count})`}
              {tab === t.id && <motion.span layoutId="tab-underline" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
            </button>
          ))}
        </div>

        <div className="py-8">
          {tab === 'desc' && (
            <div className="max-w-3xl space-y-4 leading-relaxed text-ink-700 dark:text-ink-300">
              {(product.description ?? 'Thông tin mô tả đang được cập nhật.').split('\n').filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-ink-50 p-4 dark:bg-ink-900">
                  <p className="flex items-center gap-2 text-sm font-bold"><BadgeCheck className="h-4 w-4 text-brand-600" /> Cam kết chính hãng</p>
                  <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-400">Sản phẩm nhập khẩu chính ngạch, đầy đủ hoá đơn và tem bảo hành.</p>
                </div>
                <div className="rounded-xl bg-ink-50 p-4 dark:bg-ink-900">
                  <p className="flex items-center gap-2 text-sm font-bold"><Truck className="h-4 w-4 text-brand-600" /> Vận chuyển &amp; đổi trả</p>
                  <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-400">Giao toàn quốc, kiểm tra hàng trước khi thanh toán, đổi trả trong 7 ngày.</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'specs' && (
            <div className="max-w-3xl overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
              {product.specs && Object.keys(product.specs).length > 0 ? (
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(product.specs).map(([key, value], i) => (
                      <tr key={key} className={cx(i % 2 === 0 ? 'bg-ink-50 dark:bg-ink-900' : 'bg-white dark:bg-ink-950')}>
                        <td className="w-1/3 px-4 py-3 font-semibold text-ink-600 dark:text-ink-400">{key}</td>
                        <td className="px-4 py-3">{value}</td>
                      </tr>
                    ))}
                    <tr className="bg-ink-50 dark:bg-ink-900">
                      <td className="px-4 py-3 font-semibold text-ink-600 dark:text-ink-400">Khối lượng</td>
                      <td className="px-4 py-3">{product.weightGram ? `${product.weightGram} g` : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="p-6 text-sm text-ink-500">Chưa có thông số kỹ thuật cho sản phẩm này.</p>
              )}
            </div>
          )}

          {tab === 'reviews' && <ReviewsSection productId={product.id} rating={product.rating} />}
        </div>
      </div>

      {/* ══════════════ SẢN PHẨM LIÊN QUAN ══════════════ */}
      {related && related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-extrabold">Sản phẩm tương tự</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
