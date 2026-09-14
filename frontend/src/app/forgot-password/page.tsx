'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiData, ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      await apiData('/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(true);
      toast.success('Đã gửi email hướng dẫn đặt lại mật khẩu');
    } catch (err) {
      const message = err instanceof ApiError ? err.fieldError('email') ?? err.message : 'Không gửi được yêu cầu';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Quên mật khẩu?"
      subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn"
      showSocial={false}
      footer={
        <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Về trang đăng nhập
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
          <MailCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-3 font-bold">Kiểm tra hộp thư của bạn</p>
          <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-400">
            Nếu <b>{email}</b> tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Link có hiệu lực trong 30 phút.
          </p>
          <p className="mt-3 text-xs text-ink-500">Không thấy email? Hãy kiểm tra cả thư mục Spam/Quảng cáo.</p>
          <Button variant="outline" className="mt-5" onClick={() => setSent(false)}>
            Gửi lại với email khác
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <Input
            label="Email đã đăng ký"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            placeholder="ban@example.com"
            icon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            required
          />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Gửi link đặt lại mật khẩu
          </Button>
          <p className="text-center text-xs leading-relaxed text-ink-400">
            Vì lý do bảo mật, chúng tôi luôn hiển thị cùng một thông báo dù email có tồn tại hay không — điều này ngăn kẻ xấu dò tìm tài khoản.
          </p>
        </form>
      )}
    </AuthShell>
  );
}
