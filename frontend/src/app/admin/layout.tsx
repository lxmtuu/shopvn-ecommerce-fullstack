'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, Boxes, FolderTree, LayoutDashboard, Menu, MessageSquare, Moon, Package, Percent, ScrollText,
  Settings, ShieldCheck, Store, Sun, Tags, Users, X,
} from 'lucide-react';
import { cx } from '@/lib/format';
import { Skeleton } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';

const NAV = [
  { href: '/admin', label: 'Bảng điều khiển', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Sản phẩm', icon: Package },
  { href: '/admin/categories', label: 'Danh mục', icon: FolderTree },
  { href: '/admin/brands', label: 'Thương hiệu', icon: Tags },
  { href: '/admin/orders', label: 'Đơn hàng', icon: Boxes },
  { href: '/admin/customers', label: 'Khách hàng', icon: Users },
  { href: '/admin/reviews', label: 'Đánh giá', icon: MessageSquare },
  { href: '/admin/coupons', label: 'Mã giảm giá', icon: Percent },
  { href: '/admin/settings', label: 'Cấu hình shop', icon: Settings },
  { href: '/admin/audit-logs', label: 'Nhật ký hệ thống', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status } = useAuthStore();
  const { theme, toggleTheme } = useUiStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'guest') router.replace('/login?next=/admin');
    else if (status === 'authenticated' && user?.role !== 'ADMIN') router.replace('/');
  }, [status, user, router]);

  useEffect(() => setSidebarOpen(false), [pathname]);

  if (status !== 'authenticated' || user?.role !== 'ADMIN') {
    return (
      <div className="container-page flex gap-6 py-10">
        <Skeleton className="hidden h-96 w-64 rounded-2xl lg:block" />
        <Skeleton className="h-96 flex-1 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50/60 dark:bg-ink-950">
      {/* ── Sidebar ── */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 w-64 shrink-0 overflow-y-auto border-r border-ink-200 bg-white transition-transform duration-300 dark:border-ink-800 dark:bg-ink-900 lg:translate-x-0 scroll-brand',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* hoa văn mờ + vệt sáng cho sidebar */}
        <div className="bg-grid-dark mask-fade-b pointer-events-none absolute inset-0 opacity-50 dark:opacity-25" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-brand-500/50 to-transparent" />
        <div className="relative flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
          <Link href="/admin" className="flex items-center gap-2 font-extrabold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              ShopVN
              <span className="block text-[11px] font-medium text-ink-400">Trang quản trị</span>
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden" aria-label="Đóng menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative p-3">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cx(
                  'mb-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                  active ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="relative p-3">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-ink-100 dark:hover:bg-ink-800">
            <Store className="h-4 w-4" />
            Về trang bán hàng
          </Link>
        </div>

        <div className="relative mx-3 mb-4 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-lg shadow-brand-900/20">
          <p className="flex items-center gap-1.5 text-xs font-bold">
            <BarChart3 className="h-3.5 w-3.5" /> Mẹo quản trị
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/85">
            Dùng nút “Xuất CSV” ở bảng điều khiển để tải báo cáo đơn hàng, sản phẩm và khách hàng.
          </p>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Nội dung ── */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-ink-200 bg-white/85 px-4 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/85 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden" aria-label="Mở menu">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-bold">{NAV.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)))?.label ?? 'Quản trị'}</p>
              <p className="hidden text-xs text-ink-400 sm:block">Xin chào {user.fullName} — vai trò ADMIN</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 transition hover:border-brand-400 dark:border-ink-700" aria-label="Đổi giao diện">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <span className="hidden items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-xs font-semibold sm:flex dark:border-ink-700">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{user.fullName.charAt(0).toUpperCase()}</span>
              {user.email}
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
