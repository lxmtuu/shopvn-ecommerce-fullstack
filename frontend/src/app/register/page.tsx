'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff, Lock, Mail, Phone, User as UserIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiData, ApiError } from '@/lib/api';
import { cx } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';

const RULES = [
  { label: 'Ít nhất 8 ký tự', test: (v: string) => v.length >= 8 },
  { label: 'Có chữ hoa (A–Z)', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Có chữ thường (a–z)', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Có chữ số (0–9)', test: (v: string) => /\d/.test(v) },
  { label: 'Có ký tự đặc biệt (!@#…)', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [accept, setAccept] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passed = RULES.filter((r) => r.test(form.password)).length;
  const strength = form.password.length === 0 ? 0 : passed;
  const strengthLabel = ['', 'Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'][strength];
  const strengthColor = ['bg-ink-200', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'][strength];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (form.password !== form.confirm) {
      setErrors({ confirm: 'Mật khẩu nhập lại không khớp' });
      return toast.error('Mật khẩu nhập lại không khớp');
    }
    if (strength < 5) {
      return toast.error('Mật khẩu chưa đủ mạnh — hãy đáp ứng đủ 5 điều kiện');
    }

    setLoading(true);
    try {
      const { user } = await apiData<{ user: { id: string; email: string; fullName: string; role: 'CUSTOMER' | 'ADMIN' } }>('/auth/register', {
        method: 'POST',
        body: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          acceptTerms: accept,
        },
      });
      setUser({ ...user, emailVerified: false, role: user.role });
      toast.success('Đăng ký thành công!', { description: 'Chúng tôi đã gửi email xác minh tài khoản cho bạn.' });
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không đăng ký được, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Tạo tài khoản mới"
      subtitle="Chỉ mất 30 giây — nhận ngay ưu đãi cho thành viên mới"
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Input
          label="Họ và tên"
          name="fullName"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          error={errors.fullName}
          placeholder="Nguyễn Văn A"
          icon={<UserIcon className="h-4 w-4" />}
          autoComplete="name"
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          placeholder="ban@example.com"
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          required
        />

        <Input
          label="Số điện thoại"
          name="phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          error={errors.phone}
          placeholder="0901234567"
          hint="Không bắt buộc — dùng để liên hệ giao hàng"
          icon={<Phone className="h-4 w-4" />}
          inputMode="tel"
          autoComplete="tel"
        />

        <div className="relative">
          <Input
            label="Mật khẩu"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            className="pr-11"
            autoComplete="new-password"
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

        {/* Độ mạnh mật khẩu */}
        {form.password.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={cx('h-full flex-1 rounded-full transition-colors', i <= strength ? strengthColor : 'bg-ink-200 dark:bg-ink-700')} />
                ))}
              </div>
              <span className="text-xs font-semibold text-ink-500">{strengthLabel}</span>
            </div>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {RULES.map((r) => {
                const ok = r.test(form.password);
                return (
                  <li key={r.label} className={cx('flex items-center gap-1.5 text-xs', ok ? 'text-emerald-600' : 'text-ink-400')}>
                    {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {r.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Input
          label="Nhập lại mật khẩu"
          name="confirm"
          type={showPassword ? 'text' : 'password'}
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          error={errors.confirm}
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          autoComplete="new-password"
          required
        />

        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 rounded text-brand-600" />
          <span className="text-ink-600 dark:text-ink-400">
            Tôi đồng ý với{' '}
            <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
              điều khoản sử dụng
            </Link>{' '}
            và{' '}
            <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">
              chính sách bảo mật
            </Link>
          </span>
        </label>
        {errors.acceptTerms && <p className="text-xs font-medium text-rose-600">{errors.acceptTerms}</p>}

        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!accept}>
          Đăng ký
        </Button>
      </form>
    </AuthShell>
  );
}
