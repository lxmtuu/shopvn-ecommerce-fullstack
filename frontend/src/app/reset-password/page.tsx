'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Check, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Skeleton } from '@/components/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiData, ApiError } from '@/lib/api';
import { cx } from '@/lib/format';

const RULES = [
  { label: 'Ít nhất 8 ký tự', test: (v: string) => v.length >= 8 },
  { label: 'Có chữ hoa (A–Z)', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Có chữ thường (a–z)', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Có chữ số (0–9)', test: (v: string) => /\d/.test(v) },
  { label: 'Có ký tự đặc biệt (!@#…)', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = RULES.filter((r) => r.test(password)).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (password !== confirm) {
      setErrors({ confirm: 'Mật khẩu nhập lại không khớp' });
      return toast.error('Mật khẩu nhập lại không khớp');
    }

    setLoading(true);
    try {
      await apiData('/auth/reset-password', { method: 'POST', body: { token, password } });
      toast.success('Đặt lại mật khẩu thành công!', { description: 'Hãy đăng nhập bằng mật khẩu mới.' });
      router.replace('/login');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không đặt lại được mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Link không hợp lệ" subtitle="Link đặt lại mật khẩu thiếu token hoặc đã bị cắt khi copy" showSocial={false}>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
          <p className="mt-3 font-bold">Không tìm thấy token</p>
          <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-400">Hãy mở lại link trong email hoặc yêu cầu gửi lại email mới.</p>
          <Link href="/forgot-password">
            <Button className="mt-5">Yêu cầu link mới</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Đặt lại mật khẩu" subtitle="Chọn mật khẩu mới mạnh hơn để bảo vệ tài khoản của bạn" showSocial={false}>
      <form onSubmit={submit} className="space-y-5">
        <Input
          label="Mật khẩu mới"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          autoComplete="new-password"
          required
        />

        <ul className="grid gap-1.5 sm:grid-cols-2">
          {RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.label} className={cx('flex items-center gap-1.5 text-xs', ok ? 'text-emerald-600' : 'text-ink-400')}>
                {ok ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                {r.label}
              </li>
            );
          })}
        </ul>

        <Input
          label="Nhập lại mật khẩu mới"
          name="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          autoComplete="new-password"
          required
        />

        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={strength < 5}>
          <ShieldCheck className="h-4 w-4" /> Đặt lại mật khẩu
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container-page py-20"><Skeleton className="mx-auto h-80 w-full max-w-md rounded-3xl" /></div>}>
      <ResetForm />
    </Suspense>
  );
}
