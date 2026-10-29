'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuthStore } from '@/store/auth.store';
import { apiData, ApiError } from '@/lib/api';
import type { User } from '@/types';

/**
 * Trang đích sau khi đăng nhập Google: `${CLIENT_URL}/auth/callback?social=google`
 * Backend đã set cookie httpOnly trước khi redirect về đây, nên việc còn lại chỉ là
 * đọc lại phiên (/auth/me) và đưa người dùng vào đúng khu vực.
 *
 * Lưu ý: KHÔNG dùng `bootstrap()` của auth store vì hàm đó bỏ qua khi chưa có
 * "auth hint" trong localStorage (khách vừa đăng nhập Google lần đầu sẽ không có).
 */
function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    apiData<User>('/auth/me')
      .then((user) => {
        setUser(user);
        router.replace(user.role === 'ADMIN' ? '/admin' : '/');
      })
      .catch((err) => {
        const social = params.get('social') ?? 'Google';
        setError(
          err instanceof ApiError
            ? err.message
            : `Đăng nhập bằng ${social} thất bại. Vui lòng thử lại.`,
        );
      });
  }, [router, params, setUser]);

  if (!error) {
    return (
      <AuthShell title="Đang đăng nhập..." subtitle="Đang hoàn tất phiên đăng nhập của bạn" showSocial={false}>
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
          <p className="text-sm text-ink-500">Bạn không cần làm gì, hệ thống sẽ tự chuyển trang.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Đăng nhập thất bại" subtitle="Không tạo được phiên đăng nhập" showSocial={false}>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/40">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <p className="mt-3 font-bold">Không đăng nhập được</p>
        <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-400">{error}</p>
        <Link href="/login">
          <Button className="mt-5">Quay lại trang đăng nhập</Button>
        </Link>
      </div>
    </AuthShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-20">
          <Skeleton className="mx-auto h-80 w-full max-w-md rounded-3xl" />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
