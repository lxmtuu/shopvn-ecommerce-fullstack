'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Gift, Headphones, QrCode, RotateCcw, ShieldCheck, Sparkles, Truck, Zap } from 'lucide-react';
import { Button, ProductCardSkeleton } from '@/components/ui';
import { ProductCard } from '@/components/shop/ProductCard';
import { useCategories } from '@/hooks/useCategories';
import { apiFull } from '@/lib/api';
import type { Category, ProductCard as ProductCardType } from '@/types';

const MARQUEE = [
  { icon: Gift, text: 'Nhập WELCOME10 — giảm 10% cho đơn đầu tiên' },
  { icon: Truck, text: 'Miễn phí vận chuyển từ 500.000đ' },
  { icon: QrCode, text: 'Thanh toán QR — xác nhận tự động trong vài giây' },
  { icon: RotateCcw, text: 'Đổi trả trong 7 ngày · bảo hành 12 tháng' },
  { icon: Zap, text: 'Sale cuối tuần: giảm đến 40%' },
];

const TRUST = [
  { icon: Truck, title: 'Giao nhanh toàn quốc', desc: 'Nội thành trong ngày, tỉnh 1–3 ngày' },
  { icon: QrCode, title: 'Thanh toán QR', desc: 'Quét QR chuyển khoản, tự động xác nhận' },
  { icon: ShieldCheck, title: 'Bảo mật tuyệt đối', desc: 'Mã hoá JWT, chống gian lận thanh toán' },
  { icon: BadgeCheck, title: 'Chính hãng 100%', desc: 'Bảo hành 12 tháng, đổi trả 7 ngày' },
];

export default function HomePage() {
  const { data: categories } = useCategories();

  const { data: featured, isLoading: loadingFeatured } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => apiFull<{ data: ProductCardType[] }>('/products/featured?limit=8'),
    select: (r) => r.data,
  });

  const { data: bestSellers, isLoading: loadingBest } = useQuery({
    queryKey: ['products', 'best-sellers'],
    queryFn: () => apiFull<{ data: ProductCardType[] }>('/products/best-sellers?limit=8'),
    select: (r) => r.data,
  });

  const { data: newest } = useQuery({
    queryKey: ['products', 'newest'],
    queryFn: () => apiFull<{ data: ProductCardType[] }>('/products/newest?limit=4'),
    select: (r) => r.data,
  });

  return (
    <>
      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-ink-950 text-white">
        {/* Ảnh nền thương hiệu + lớp phủ để chữ luôn đọc được */}
        <Image
          src="/img/hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-right opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/40" />
        <div className="bg-grid mask-fade-b absolute inset-0 opacity-40" />

        {/* Hai khối sáng chuyển động chậm tạo chiều sâu */}
        <div className="animate-aurora absolute -left-24 top-10 h-80 w-80 rounded-full bg-brand-600/40 blur-3xl" />
        <div className="animate-aurora-slow absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl" />

        <div className="container-page relative grid items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <span className="rise glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide">
              <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-brand-400 text-brand-400" />
              Sale cuối tuần — giảm đến 40%
            </span>

            <h1 className="rise rise-1 text-balance-vi mt-6 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Mua sắm <span className="text-gradient">chính hãng</span>,
              <br />
              giao nhanh tận nơi
            </h1>

            <p className="rise rise-2 mt-6 max-w-xl text-base leading-relaxed text-white/80">
              Hàng nghìn sản phẩm công nghệ &amp; gia dụng với giá tốt nhất. Thanh toán bằng QR chuyển khoản —
              hệ thống tự động xác nhận trong vài giây, không cần chờ shop kiểm tra.
            </p>

            <div className="rise rise-3 mt-9 flex flex-wrap items-center gap-3">
              <Link href="/products">
                <Button size="lg" variant="light" className="sheen">
                  Mua sắm ngay <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/products?onSale=true">
                <Button size="lg" variant="glass">
                  Xem khuyến mãi
                </Button>
              </Link>
            </div>

            <dl className="rise rise-4 mt-11 grid max-w-lg grid-cols-3 gap-6 border-t border-white/15 pt-7">
              {[
                ['20+', 'Sản phẩm chính hãng'],
                ['1.2k+', 'Khách hàng tin dùng'],
                ['4.9/5', 'Đánh giá trung bình'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-2xl font-extrabold sm:text-3xl">{value}</dt>
                  <dd className="mt-1 text-[13px] leading-snug text-white/65">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Thẻ kính nổi bên phải */}
          <div className="relative hidden lg:block">
            <div className="animate-float glass ring-glow relative overflow-hidden rounded-[2rem] p-3">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.6rem]">
                <Image
                  src="/img/auth-bg.jpg"
                  alt="Bộ sưu tập sản phẩm ShopVN"
                  fill
                  sizes="480px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />
                <div className="absolute inset-x-4 bottom-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">Bộ sưu tập mới</p>
                  <p className="mt-1 text-lg font-bold leading-tight">Thiết bị công nghệ<br />chính hãng 100%</p>
                </div>
              </div>
            </div>

            <div className="glass absolute -bottom-5 -left-7 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
                <QrCode className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-white/70">Thanh toán QR</p>
                <p className="text-sm font-bold">Xác nhận tự động</p>
              </div>
            </div>

            <div className="glass absolute -right-4 top-8 rounded-2xl px-4 py-3 text-center shadow-2xl">
              <p className="text-[11px] font-medium text-white/70">Giảm thêm</p>
              <p className="text-2xl font-black text-brand-300">40%</p>
            </div>
          </div>
        </div>

        {/* Đường sáng mảnh phân cách hero với nội dung */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />
      </section>

      {/* ──────────────── DẢI CHỮ CHẠY (khuyến mãi) ──────────────── */}
      <div className="relative overflow-hidden border-y border-brand-700/30 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 py-2.5 text-white">
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap text-sm font-semibold tracking-wide">
          {Array.from({ length: 2 }).flatMap((_, dup) =>
            MARQUEE.map(({ icon: Icon, text }) => (
              <span key={`${dup}-${text}`} className="flex items-center gap-10">
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
                  {text}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
              </span>
            )),
          )}
        </div>
      </div>

      {/* ──────────────── CAM KẾT DỊCH VỤ ──────────────── */}
      <section className="container-page relative z-10 mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.45 }}
            className="card-surface card-hover group flex items-start gap-3 p-4 backdrop-blur"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/25 transition-transform duration-300 group-hover:scale-110">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">{desc}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* ─────────────────────────── DANH MỤC ─────────────────────────── */}
      <section className="container-page mt-16">
        <SectionHeading title="Danh mục nổi bật" subtitle="Chọn nhanh theo nhu cầu của bạn" href="/products" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {(categories ?? []).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/products?category=${c.slug}`}
                className="card-surface group flex flex-col items-center gap-3 p-4 text-center transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-ink-100 dark:bg-ink-800">
                  {c.imageUrl && <Image src={c.imageUrl} alt={c.name} fill sizes="64px" className="object-cover transition-transform group-hover:scale-110" />}
                </div>
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="text-xs text-ink-400">{c.productCount} sản phẩm</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────── NỔI BẬT ─────────────────────────── */}
      <section className="container-page mt-16">
        <SectionHeading title="Sản phẩm nổi bật" subtitle="Được khách hàng yêu thích nhất" href="/products?featured=true" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {loadingFeatured
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : (featured ?? []).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* ─────────────────────────── BANNER QR ─────────────────────────── */}
      <section className="container-page mt-16">
        <div className="relative isolate overflow-hidden rounded-3xl bg-ink-900 p-8 text-white shadow-2xl sm:p-12">
          <Image src="/img/pattern-tech.jpg" alt="" fill sizes="100vw" className="object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-br from-ink-950/90 via-ink-950/80 to-brand-950/60" />
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-600/20 px-3 py-1.5 text-xs font-bold text-brand-300">
                <QrCode className="h-3.5 w-3.5" /> Thanh toán thông minh
              </span>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
                Chuyển khoản bằng QR,
                <br />
                đơn tự động xác nhận
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                Sau khi đặt hàng, hệ thống sinh mã QR theo chuẩn VietQR kèm nội dung là mã đơn. Khi ngân hàng báo có tiền, đơn hàng của bạn được xác nhận tự động — không cần chờ shop kiểm tra thủ công.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/products">
                  <Button variant="light">Bắt đầu mua sắm</Button>
                </Link>
                <Link href="/products?payment=qr">
                  <Button variant="glass">Tìm hiểu thêm</Button>
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="rounded-2xl bg-white p-4 shadow-2xl">
                <Image src="https://picsum.photos/seed/shopvn-qr/400/400" alt="Minh hoạ QR thanh toán" width={220} height={220} className="rounded-xl" />
                <p className="mt-3 text-center text-xs font-semibold text-ink-500">Quét bằng app ngân hàng bất kỳ</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── BÁN CHẠY ─────────────────────────── */}
      <section className="container-page mt-16">
        <SectionHeading title="Bán chạy nhất" subtitle="Sản phẩm được mua nhiều trong tháng" href="/products?sort=best_selling" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {loadingBest
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : (bestSellers ?? []).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* ─────────────────────────── MỚI VỀ ─────────────────────────── */}
      <section className="container-page mt-16">
        <SectionHeading title="Hàng mới về" subtitle="Vừa cập bến ShopVN" href="/products?sort=newest" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(newest ?? []).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* ─────────────────── ĐĂNG KÝ NHẬN ƯU ĐÃI ─────────────────── */}
      <section className="container-page mt-16">
        <div className="relative isolate overflow-hidden rounded-3xl text-white shadow-2xl">
          <Image src="/img/cta-bg.jpg" alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/75 to-ink-950/35" />

          <div className="relative grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:p-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Ưu đãi thành viên
              </span>
              <h2 className="text-balance-vi mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
                Nhận mã giảm giá <span className="text-gradient-brand">sớm nhất</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                Đăng ký để nhận thông báo về đợt sale, sản phẩm mới và mã giảm giá riêng cho thành viên.
                Chúng tớ chỉ gửi email khi có ưu đãi thật sự đáng giá.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
                {['Không spam', 'Huỷ đăng ký bất cứ lúc nào', 'Ưu đãi riêng mỗi tháng'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-brand-300" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <form
              className="glass rounded-2xl p-5 sm:p-6"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                form.reset();
                const { toast } = await import('sonner');
                toast.success('Đã đăng ký nhận ưu đãi!', {
                  description: 'Kiểm tra hộp thư của bạn để nhận mã giảm giá.',
                });
              }}
            >
              <label htmlFor="newsletter-email" className="text-sm font-semibold">Email của bạn</label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  placeholder="ban@email.com"
                  className="h-12 min-w-0 flex-1 rounded-xl border border-white/25 bg-white/10 px-4 text-sm text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none"
                />
                <Button type="submit" variant="light" size="lg" className="sheen shrink-0">
                  Nhận ưu đãi <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/60">
                Bằng việc đăng ký, bạn đồng ý nhận email khuyến mãi từ ShopVN.
              </p>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ title, subtitle, href }: { title: string; subtitle: string; href: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
          <span className="h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-brand-500 to-brand-700" />
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>
      </div>
      <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:gap-2.5">
        Xem tất cả <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
