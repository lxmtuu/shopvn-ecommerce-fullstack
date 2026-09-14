'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Facebook, Instagram, Mail, MapPin, Phone, Send, ShoppingBag, Youtube } from 'lucide-react';
import { apiFull } from '@/lib/api';
import type { BankInfo } from '@/types';

/**
 * Liên kết mạng xã hội lấy từ API /bank-info (đọc từ SiteSetting)
 * → admin có thể sửa trong trang quản trị mà không cần deploy lại.
 */
export function Footer() {
  const [info, setInfo] = useState<BankInfo | null>(null);

  useEffect(() => {
    apiFull<{ data: BankInfo }>('/bank-info')
      .then((res) => setInfo(res.data))
      .catch(() => setInfo(null));
  }, []);

  const socials = [
    { key: 'facebook', icon: Facebook, label: 'Facebook' },
    { key: 'instagram', icon: Instagram, label: 'Instagram' },
    { key: 'youtube', icon: Youtube, label: 'YouTube' },
    { key: 'zalo', icon: Send, label: 'Zalo' },
  ].filter((s) => info?.social?.[s.key]);

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
      {/* hoa văn mờ + vệt sáng trên cùng cho footer bớt phẳng */}
      <div className="bg-grid-dark mask-fade-b pointer-events-none absolute inset-0 opacity-60 dark:opacity-20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/70 to-transparent" />
      <div className="container-page relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/25">
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.6} />
            </span>
            <span className="text-lg font-extrabold">Shop<span className="text-brand-600">VN</span></span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
            Sàn thương mại điện tử chính hãng: điện thoại, laptop, tai nghe, gia dụng. Giao nhanh toàn quốc, đổi trả trong 7 ngày.
          </p>

          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map(({ key, icon: Icon, label }) => (
                <a
                  key={key}
                  href={info?.social?.[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 text-ink-500 transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-600 dark:border-ink-700 dark:text-ink-400"
                >
                  <Icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">Mua sắm</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-500 dark:text-ink-400">
            <li><Link href="/products" className="transition hover:text-brand-600">Tất cả sản phẩm</Link></li>
            <li><Link href="/products?sort=best_selling" className="transition hover:text-brand-600">Bán chạy nhất</Link></li>
            <li><Link href="/products?onSale=true" className="transition hover:text-brand-600">Đang khuyến mãi</Link></li>
            <li><Link href="/account/wishlist" className="transition hover:text-brand-600">Sản phẩm yêu thích</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">Hỗ trợ khách hàng</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-500 dark:text-ink-400">
            <li><Link href="/account/orders" className="transition hover:text-brand-600">Tra cứu đơn hàng</Link></li>
            <li><span className="cursor-default">Chính sách đổi trả 7 ngày</span></li>
            <li><span className="cursor-default">Chính sách bảo hành</span></li>
            <li><span className="cursor-default">Câu hỏi thường gặp</span></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">Liên hệ</h3>
          <ul className="mt-4 space-y-3 text-sm text-ink-500 dark:text-ink-400">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              123 Lê Lợi, Quận 1, TP. Hồ Chí Minh
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-brand-600" />
              <a href={`tel:${info?.hotline ?? '19001234'}`} className="transition hover:text-brand-600">{info?.hotline ?? '1900 1234'}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-brand-600" />
              <a href={`mailto:${info?.email ?? 'hotro@shopvn.vn'}`} className="transition hover:text-brand-600">{info?.email ?? 'hotro@shopvn.vn'}</a>
            </li>
          </ul>

          {info?.bankName && (
            <div className="mt-5 rounded-xl border border-ink-200 p-3 text-xs dark:border-ink-700">
              <p className="font-bold text-ink-700 dark:text-ink-200">Thanh toán chuyển khoản</p>
              <p className="mt-1 text-ink-500 dark:text-ink-400">
                {info.bankName} · {info.accountNo}
                <br />
                {info.accountName}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-ink-200 py-5 dark:border-ink-800">
        <div className="container-page flex flex-col items-center justify-between gap-3 text-xs text-ink-500 sm:flex-row">
          <p>© {new Date().getFullYear()} ShopVN. Đã đăng ký bản quyền.</p>
          <p className="flex items-center gap-3">
            <span>Thanh toán: COD · Chuyển khoản QR · VNPay · MoMo</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
