'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Heart, LayoutDashboard, LogOut, MapPin, Package, ShieldCheck, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui';
import { cx } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';

const NAV = [
  { href: '/account', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: '/account/orders', label: 'Đơn hàng của tôi', icon: Package },
  { href: '/account/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
  { href: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
  { href: '/account/profile', label: 'Hồ sơ & bảo mật', icon: UserIcon },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, logout } = useAuthStore();
  const resetCart = useCartStore((s) => s.reset);

  useEffect(() => {
    if (status === 'guest') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="container-page flex gap-8 py-10">
        <Skeleton className="hidden h-80 w-64 rounded-2xl lg:block" />
        <Skeleton className="h-80 flex-1 rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  const onLogout = async () => {
    await logout();
    resetCart();
    toast.success('Đã đăng xuất');
    router.push('/');
  };

  return (
    <div className="container-page flex flex-col gap-8 py-10 lg:flex-row">
      {/* ── Sidebar tài khoản ── */}
      <aside className="lg:w-64 lg:shrink-0">
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-3 bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20 text-lg font-bold">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold">{user.fullName}</p>
              <p className="truncate text-xs text-white/75">{user.email}</p>
            </div>
          </div>

          {!user.emailVerified && (
            <div className="border-b border-ink-100 bg-amber-50 p-3 text-xs text-amber-800 dark:border-ink-800 dark:bg-amber-950/40 dark:text-amber-300">
              Email chưa xác thực — kiểm tra hộp thư để kích hoạt đầy đủ tính năng.
            </div>
          )}

          <nav className="p-2">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cx(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                    active ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}

            {user.role === 'ADMIN' && (
              <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                Trang quản trị
              </Link>
            )}

            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
