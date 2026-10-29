'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, LayoutDashboard, LogOut, Menu, Moon, Phone, QrCode, ShoppingBag, ShoppingCart, Sun, Truck, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Drawer } from '@/components/ui';
import { SearchBox } from '@/components/shop/SearchBox';
import { MiniCartDrawer } from '@/components/shop/MiniCartDrawer';
import { cx } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { useCategories } from '@/hooks/useCategories';
import { useCartStore } from '@/store/cart.store';
import { useUiStore } from '@/store/ui.store';
import type { Category } from '@/types';

const NAV = [
  { href: '/', label: 'Trang chủ' },
  { href: '/products', label: 'Sản phẩm' },
  { href: '/products?sort=best_selling', label: 'Bán chạy' },
  { href: '/products?onSale=true', label: 'Khuyến mãi' },
];

export function Header() {
  const pathname = usePathname();
  const { user, status, logout } = useAuthStore();
  const { cart, openDrawer } = useCartStore();
  const { theme, toggleTheme, mobileMenuOpen, setMobileMenuOpen } = useUiStore();
  const [scrolled, setScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Dùng chung hook với các trang khác ⇒ một nguồn dữ liệu, không tải trùng
  const { data: categoriesData } = useCategories();
  useEffect(() => {
    setCategories(categoriesData ?? []);
  }, [categoriesData]);

  useEffect(() => setMobileMenuOpen(false), [pathname, setMobileMenuOpen]);

  const itemCount = cart?.totalQuantity ?? 0;

  return (
    <>
      {/* Thanh thông báo trên cùng */}
      <div className="bg-ink-900 py-2 text-center text-xs font-medium text-ink-100 dark:bg-black">
        <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" aria-hidden /> Miễn phí vận chuyển cho đơn từ 500.000đ</span>
        <span className="mx-2 opacity-50">·</span>
        <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" aria-hidden /> Hotline <span className="font-bold">1900 1234</span></span>
        <span className="mx-2 opacity-50">·</span>
        <span className="inline-flex items-center gap-1.5"><QrCode className="h-3.5 w-3.5" aria-hidden /> Thanh toán QR tiện lợi</span>
      </div>

      <header
        className={cx(
          'sticky top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-ink-200/70 bg-white/85 backdrop-blur-lg dark:border-ink-800 dark:bg-ink-950/85'
            : 'bg-white dark:bg-ink-950',
        )}
      >
        <div className="container-page flex h-16 items-center gap-3 lg:gap-6">
          <button onClick={() => setMobileMenuOpen(true)} aria-label="Mở menu" className="grid h-10 w-10 place-items-center rounded-xl text-ink-600 hover:bg-ink-100 lg:hidden dark:text-ink-300 dark:hover:bg-ink-800">
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30">
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.6} />
            </span>
            <span className="hidden text-lg font-extrabold tracking-tight sm:block">
              Shop<span className="text-brand-600">VN</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cx(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  pathname === item.href ? 'text-brand-600' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white',
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="group relative">
              <button className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800">
                Danh mục ▾
              </button>
              <div className="invisible absolute left-0 top-full w-56 translate-y-1 rounded-2xl border border-ink-200 bg-white p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-ink-700 dark:bg-ink-900">
                {categories.map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-ink-50 dark:hover:bg-ink-800">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-ink-400">{c.productCount}</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div className="mx-auto hidden max-w-md flex-1 md:block">
            <SearchBox />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button onClick={toggleTheme} aria-label="Đổi giao diện sáng/tối" className="grid h-10 w-10 place-items-center rounded-xl text-ink-600 transition hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <Link href="/account/wishlist" aria-label="Sản phẩm yêu thích" className="hidden h-10 w-10 place-items-center rounded-xl text-ink-600 transition hover:bg-ink-100 sm:grid dark:text-ink-300 dark:hover:bg-ink-800">
              <Heart className="h-5 w-5" />
            </Link>

            <button
              onClick={openDrawer}
              aria-label={`Giỏ hàng, ${itemCount} sản phẩm`}
              className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-600 transition hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </motion.span>
              )}
            </button>

            {/* Tài khoản */}
            <div className="relative">
              {status === 'authenticated' && user ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2.5 transition hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {user.fullName.charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden max-w-[90px] truncate text-sm font-semibold lg:block">{user.fullName.split(' ')[0]}</span>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-200 bg-white p-2 shadow-xl dark:border-ink-700 dark:bg-ink-900"
                        >
                          <div className="border-b border-ink-100 px-3 py-2.5 dark:border-ink-800">
                            <p className="truncate text-sm font-bold">{user.fullName}</p>
                            <p className="truncate text-xs text-ink-500">{user.email}</p>
                          </div>
                          <Link href="/account" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-ink-50 dark:hover:bg-ink-800">
                            <UserIcon className="h-4 w-4 text-ink-400" /> Tài khoản của tôi
                          </Link>
                          <Link href="/account/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-ink-50 dark:hover:bg-ink-800">
                            <ShoppingCart className="h-4 w-4 text-ink-400" /> Đơn hàng
                          </Link>
                          {user.role === 'ADMIN' && (
                            <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:hover:bg-ink-800">
                              <LayoutDashboard className="h-4 w-4" /> Trang quản trị
                            </Link>
                          )}
                          <button
                            onClick={async () => {
                              setUserMenuOpen(false);
                              await logout();
                              toast.success('Đã đăng xuất');
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950"
                          >
                            <LogOut className="h-4 w-4" /> Đăng xuất
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="ml-1 hidden items-center gap-2 sm:flex">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Đăng nhập</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Đăng ký</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ô tìm kiếm trên mobile */}
        <div className="container-page pb-3 md:hidden">
          <SearchBox />
        </div>
      </header>

      {/* Menu mobile */}
      <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} title="Menu" side="bottom">
        <nav className="p-4">
          {NAV.map((item) => (
            <Link key={item.label} href={item.href} className="block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-ink-100 dark:hover:bg-ink-800">
              {item.label}
            </Link>
          ))}
          <p className="mt-3 px-4 text-xs font-bold uppercase tracking-wide text-ink-400">Danh mục</p>
          {categories.map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`} className="block rounded-xl px-4 py-2.5 text-sm transition hover:bg-ink-100 dark:hover:bg-ink-800">
              {c.name}
            </Link>
          ))}
          {status !== 'authenticated' && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/login"><Button variant="outline" className="w-full">Đăng nhập</Button></Link>
              <Link href="/register"><Button className="w-full">Đăng ký</Button></Link>
            </div>
          )}
        </nav>
      </Drawer>

      <MiniCartDrawer />
    </>
  );
}
