'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiData, ApiError } from '@/lib/api';

/**
 * Trang đích của link xác thực email: `${CLIENT_URL}/verify-email?token=...`
 * Trước đây backend gửi link này nhưng frontend KHÔNG có trang tương ứng ⇒
 * khách bấm vào là 404. Trang này tự gọi API 1 lần rồi báo kết quả.
 */
function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [state, setState] = useState<'loading' | 'ok' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Link xác thực thiếu token hoặc đã bị cắt khi copy.');
  const [email, setEmail] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current || !token) return;
    called.current = true; // chặn gọi 2 lần ở React StrictMode (token chỉ dùng được 1 lần)

    apiData<{ email: string; fullName: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setEmail(data.email);
        setState('ok');
      })
      .catch((err) => {
        setState('error');
        setMessage(err instanceof ApiError ? err.message : 'Không xác thực được email, vui lòng thử lại.');
      });
  }, [token]);

  if (state === 'loading') {
    return (
      <AuthShell title="Đang xác thực email..." subtitle="Chỉ mất vài giây" showSocial={false}>
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
          <p className="text-sm text-ink-500">Hệ thống đang kiểm tra link xác thực của bạn.</p>
        </div>
      </AuthShell>
    );
  }

  if (state === 'ok') {
    return (
      <AuthShell title="Xác thực thành công" subtitle={email || 'Email của bạn đã được xác thực'} showSocial={false}>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <p className="mt-3 font-bold">Tài khoản đã được kích hoạt</p>
          <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-400">
            Giờ bạn có thể đăng nhập và bắt đầu mua sắm. Bạn cũng sẽ nhận được thông báo về đơn hàng qua email này.
          </p>
          <Link href="/login">
            <Button className="mt-5">
              <MailCheck className="h-4 w-4" /> Đăng nhập ngay
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Không xác thực được" subtitle="Link có thể đã hết hạn hoặc đã dùng rồi" showSocial={false}>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/40">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <p className="mt-3 font-bold">Xác thực email thất bại</p>
        <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-400">{message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/login">
            <Button variant="outline">Về trang đăng nhập</Button>
          </Link>
          <Link href="/account/profile">
            <Button>Gửi lại email xác thực</Button>
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-20">
          <Skeleton className="mx-auto h-80 w-full max-w-md rounded-3xl" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
