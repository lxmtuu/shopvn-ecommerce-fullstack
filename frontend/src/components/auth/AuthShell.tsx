'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Facebook, Instagram, ShieldCheck, ShoppingBag, Sparkles, Truck, Youtube } from 'lucide-react';
import type { ReactNode } from 'react';
import { API_URL } from '@/lib/api';

/**
 * Khung chung cho các trang xác thực (đăng nhập / đăng ký / quên mật khẩu).
 * Bên trái là "poster" thương hiệu, bên phải là form.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  showSocial = true,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  showSocial?: boolean;
}) {
  return (
    <div className="container-page grid min-h-[calc(100vh-8rem)] items-center gap-10 py-10 lg:grid-cols-2">
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative hidden overflow-hidden rounded-3xl bg-ink-950 p-10 text-white shadow-2xl lg:block"
      >
        {/* Ảnh nền thương hiệu + lớp phủ để chữ trắng luôn rõ */}
        <Image src="/img/auth-bg.jpg" alt="" fill sizes="(min-width:1024px) 50vw, 0px" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950/85 via-brand-900/70 to-ink-950/90" />
        <div className="bg-grid mask-fade-b absolute inset-0 opacity-30" />
        <div className="animate-aurora absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-aurora-slow absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-brand-400/25 blur-3xl" />

        <Link href="/" className="relative inline-flex items-center gap-2 text-lg font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/30">
            <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.6} />
          </span>
          ShopVN
        </Link>

        <h2 className="text-balance-vi relative mt-12 text-3xl font-extrabold leading-tight">
          Mua sắm thông minh,
          <br />
          thanh toán bằng QR
        </h2>
        <p className="relative mt-4 max-w-sm text-sm leading-relaxed text-white/80">
          Tạo tài khoản để theo dõi đơn hàng, lưu sản phẩm yêu thích và nhận ưu đãi dành riêng cho thành viên.
        </p>

        <ul className="relative mt-10 space-y-4 text-sm">
          {[
            { icon: ShieldCheck, text: 'Bảo mật JWT + refresh token xoay vòng' },
            { icon: Truck, text: 'Theo dõi đơn hàng theo thời gian thực' },
            { icon: Sparkles, text: 'Ưu đãi riêng: WELCOME10, GIAM50K, FREESHIP' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15">
                <Icon className="h-4 w-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="relative mt-12 flex items-center gap-3">
          {[Facebook, Instagram, Youtube].map((Icon, i) => (
            <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
              <Icon className="h-4 w-4" />
            </span>
          ))}
          <span className="text-xs text-white/60">Kết nối với ShopVN</span>
        </div>
      </motion.aside>

      <motion.main initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-lg font-extrabold lg:hidden">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">SV</span>
          ShopVN
        </Link>

        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">{subtitle}</p>

        <div className="mt-8">{children}</div>

        {showSocial && (
          <div className="mt-6">
            <div className="relative">
              <span className="absolute inset-x-0 top-1/2 h-px bg-ink-200 dark:bg-ink-800" />
              <span className="relative mx-auto block w-fit bg-white px-3 text-xs text-ink-400 dark:bg-ink-950">hoặc tiếp tục với</span>
            </div>
            <a
              href={`${API_URL}/auth/google`}
              className="mt-4 flex h-11 items-center justify-center gap-2.5 rounded-xl border border-ink-200 text-sm font-semibold transition hover:border-brand-400 hover:text-brand-600 dark:border-ink-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
              </svg>
              Google
            </a>
          </div>
        )}

        {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
      </motion.main>
    </div>
  );
}
