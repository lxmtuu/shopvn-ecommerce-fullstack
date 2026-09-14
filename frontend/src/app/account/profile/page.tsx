'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, KeyRound, LogOut, MonitorSmartphone, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui';
import { api, apiData, ApiError } from '@/lib/api';
import { cx, formatRelative } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types';

interface SessionRow {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

const GENDERS = [
  { value: '', label: 'Không tiết lộ' },
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
];

export default function ProfilePage() {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ fullName: '', phone: '', dateOfBirth: '', gender: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName,
        phone: user.phone ?? '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '',
        gender: user.gender ?? '',
      });
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: () =>
      apiData<User>('/auth/me', {
        method: 'PATCH',
        body: {
          fullName: form.fullName,
          phone: form.phone || undefined,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
        },
      }),
    onSuccess: (updated) => {
      setUser(updated);
      toast.success('Đã cập nhật hồ sơ');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không cập nhật được hồ sơ');
    },
  });

  const changePassword = useMutation({
    mutationFn: () => apiData('/auth/change-password', { method: 'PATCH', body: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword } }),
    onSuccess: () => {
      toast.success('Đã đổi mật khẩu', { description: 'Các phiên đăng nhập khác đã bị thu hồi để bảo mật.' });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setPwErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không đổi được mật khẩu');
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiData<SessionRow[]>('/auth/sessions'),
  });

  const revoke = async (id: string) => {
    try {
      await api(`/auth/sessions/${id}`, { method: 'DELETE' });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Đã thu hồi phiên đăng nhập');
    } catch {
      toast.error('Không thu hồi được phiên');
    }
  };

  const onAvatar = async (file: File) => {
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploaded = await api<{ data: { url: string } }>('/uploads/image', { method: 'POST', body: fd });
      const updated = await apiData<User>('/auth/me', { method: 'PATCH', body: { avatarUrl: uploaded.data.url } });
      setUser(updated);
      toast.success('Đã cập nhật ảnh đại diện');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Tải ảnh thất bại');
    } finally {
      setAvatarBusy(false);
    }
  };

  const resendVerification = async () => {
    try {
      await api('/auth/resend-verification', { method: 'POST' });
      toast.success('Đã gửi lại email xác thực');
    } catch {
      toast.error('Không gửi được email — vui lòng thử lại sau');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Hồ sơ &amp; bảo mật</h1>
        <p className="mt-1 text-sm text-ink-500">Quản lý thông tin cá nhân, mật khẩu và các thiết bị đã đăng nhập</p>
      </div>

      {/* ── Ảnh đại diện + thông tin ── */}
      <section className="card-surface p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <UserCog className="h-4 w-4 text-brand-600" /> Thông tin cá nhân
        </h2>

        <div className="mt-5 flex flex-wrap items-center gap-5">
          <div className="relative">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-700">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.fullName} fill sizes="80px" className="object-cover" />
              ) : (
                <span className="grid h-full place-items-center text-2xl font-bold text-white">{user.fullName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-ink-900 text-white transition hover:bg-brand-600 disabled:opacity-50 dark:border-ink-900"
              aria-label="Đổi ảnh đại diện"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])}
            />
          </div>

          <div className="text-sm">
            <p className="font-bold">{user.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> Email đã xác thực
                </span>
              ) : (
                <button onClick={resendVerification} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:underline dark:bg-amber-950 dark:text-amber-400">
                  Email chưa xác thực — gửi lại link
                </button>
              )}
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold dark:bg-ink-800">
                {user.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-400">
              {user._count?.orders ?? 0} đơn hàng · {user._count?.wishlist ?? 0} sản phẩm yêu thích
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate();
          }}
          className="mt-6 grid gap-5 sm:grid-cols-2"
        >
          <Input label="Họ và tên" name="fullName" value={form.fullName} error={errors.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Số điện thoại" name="phone" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" inputMode="tel" />
          <Input label="Ngày sinh" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          <div>
            <label htmlFor="gender" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
              Giới tính
            </label>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm dark:border-ink-700 dark:bg-ink-900"
            >
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" loading={updateProfile.isPending}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </section>

      {/* ── Đổi mật khẩu ── */}
      <section className="card-surface p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <KeyRound className="h-4 w-4 text-brand-600" /> Đổi mật khẩu
        </h2>
        <p className="mt-1 text-sm text-ink-500">Mật khẩu mới cần tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPwErrors({});
            if (pwForm.newPassword !== pwForm.confirm) return toast.error('Mật khẩu nhập lại không khớp');
            changePassword.mutate();
          }}
          className="mt-5 grid gap-5 sm:grid-cols-3"
        >
          <Input label="Mật khẩu hiện tại" name="currentPassword" type="password" value={pwForm.currentPassword} error={pwErrors.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} autoComplete="current-password" />
          <Input label="Mật khẩu mới" name="newPassword" type="password" value={pwForm.newPassword} error={pwErrors.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} autoComplete="new-password" />
          <Input label="Nhập lại mật khẩu mới" name="confirm" type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} autoComplete="new-password" />
          <div className="sm:col-span-3">
            <Button type="submit" variant="secondary" loading={changePassword.isPending}>
              <ShieldCheck className="h-4 w-4" /> Đổi mật khẩu
            </Button>
          </div>
        </form>
      </section>

      {/* ── Phiên đăng nhập ── */}
      <section className="card-surface p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <MonitorSmartphone className="h-4 w-4 text-brand-600" /> Thiết bị đang đăng nhập
        </h2>
        <p className="mt-1 text-sm text-ink-500">Nếu thấy thiết bị lạ, hãy thu hồi phiên và đổi mật khẩu ngay.</p>

        <div className="mt-5 space-y-2">
          {(sessions ?? []).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 p-4 dark:border-ink-700">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {s.userAgent ? s.userAgent.slice(0, 70) : 'Thiết bị không xác định'}
                  {s.isCurrent && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">Thiết bị này</span>}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  IP {s.ip ?? '—'} · hoạt động {formatRelative(s.lastUsedAt)}
                </p>
              </div>
              {!s.isCurrent && (
                <Button variant="ghost" size="sm" onClick={() => revoke(s.id)}>
                  <Trash2 className="h-4 w-4" /> Thu hồi
                </Button>
              )}
            </div>
          ))}
          {sessions && sessions.length === 0 && <p className="text-sm text-ink-500">Không có phiên nào đang hoạt động.</p>}
        </div>

        <div className="mt-5 border-t border-ink-100 pt-5 dark:border-ink-800">
          <Button
            variant="outline"
            onClick={async () => {
              await api('/auth/logout-all', { method: 'POST' });
              toast.success('Đã đăng xuất khỏi tất cả thiết bị');
              window.location.href = '/login';
            }}
          >
            <LogOut className="h-4 w-4" /> Đăng xuất khỏi tất cả thiết bị
          </Button>
        </div>
      </section>

      {/* ── Vùng nguy hiểm ── */}
      <section className={cx('card-surface border-rose-200 p-6 dark:border-rose-900')}>
        <h2 className="font-bold text-rose-600">Vùng nguy hiểm</h2>
        <p className="mt-1 text-sm text-ink-500">
          Yêu cầu xoá tài khoản sẽ ẩn toàn bộ dữ liệu cá nhân (soft delete) và đăng xuất mọi thiết bị. Vui lòng liên hệ hotline để được hỗ trợ nhanh nhất.
        </p>
        <a href="tel:1900123456" className="mt-4 inline-block text-sm font-semibold text-rose-600 hover:underline">
          Gọi hotline 1900 1234 để yêu cầu xoá tài khoản
        </a>
      </section>
    </div>
  );
}
