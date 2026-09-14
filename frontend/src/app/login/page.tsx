'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Skeleton } from '@/components/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const fetchCart = useCartStore((s) => s.fetch);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const next = params.get('next') ?? '/';

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const logged = await login(email, password);
      await fetchCart();
      toast.success(`Xin chào ${logged.fullName}!`, { description: 'Đăng nhập thành công' });
      router.replace(logged.role === 'ADMIN' && next === '/' ? '/admin' : next);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không đăng nhập được, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'customer' | 'admin') => {
    setEmail(role === 'admin' ? 'admin@shop.vn' : 'customer@shop.vn');
    setPassword(role === 'admin' ? 'Admin@123456' : 'Customer@123456');
    toast.info('Đã điền tài khoản demo — bấm Đăng nhập');
  };

  return (
    <AuthShell
      title="Đăng nhập tài khoản"
      subtitle="Tiếp tục mua sắm và theo dõi đơn hàng của bạn"
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link href="/register" className="font-semibold text-brand-600 hover:underline">
            Đăng ký ngay
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="ban@example.com"
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          required
        />

        <div className="relative">
          <Input
            label="Mật khẩu"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            autoComplete="current-password"
            className="pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-[3.05rem] -translate-y-1/2 text-ink-400 transition hover:text-ink-700"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded text-brand-600" />
            Ghi nhớ đăng nhập
          </label>
          <Link href="/forgot-password" className="font-semibold text-brand-600 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Đăng nhập
        </Button>
      </form>

      {/* Tài khoản demo — hữu ích khi review portfolio */}
      <div className="mt-6 rounded-xl border border-dashed border-ink-300 p-4 dark:border-ink-700">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Tài khoản demo (đã seed sẵn)</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => fillDemo('customer')} className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-semibold transition hover:bg-ink-200 dark:bg-ink-800">
            Khách hàng — customer@shop.vn
          </button>
          <button onClick={() => fillDemo('admin')} className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-semibold transition hover:bg-ink-200 dark:bg-ink-800">
            Quản trị — admin@shop.vn
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-400">Mật khẩu: Customer@123456 / Admin@123456</p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-page py-20"><Skeleton className="mx-auto h-96 w-full max-w-md rounded-3xl" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
