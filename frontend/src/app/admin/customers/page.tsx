'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, KeyRound, Search, Shield, ShieldOff, UserCog, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Modal, Pagination } from '@/components/ui';
import { TableSkeleton, TableWrap, Td, Th } from '@/components/admin/AdminTable';
import { api, apiFull, ApiError } from '@/lib/api';
import type { Paginated } from '@/types';
import { cx, formatDate, formatVND } from '@/lib/format';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  status: 'ACTIVE' | 'BLOCKED' | 'DELETED';
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  _count?: { orders: number; reviews: number };
  totalSpent?: string;
}

const STATUS_TONE: Record<string, 'success' | 'danger' | 'neutral'> = { ACTIVE: 'success', BLOCKED: 'danger', DELETED: 'neutral' };

function AdminCustomersContent() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();

  const q = params.get('q') ?? '';
  const role = params.get('role') ?? '';
  const status = params.get('status') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page') ?? 1);

  const [search, setSearch] = useState(q);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');

  const setParam = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => (v === undefined || v === '' ? sp.delete(k) : sp.set(k, String(v))));
    if (!('page' in next)) sp.delete('page');
    router.push(`/admin/customers?${sp.toString()}`);
  };

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (role) query.set('role', role);
  if (status) query.set('status', status);
  query.set('sort', sort);
  query.set('page', String(page));
  query.set('limit', '15');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', query.toString()],
    queryFn: () => apiFull<Paginated<AdminUser>>(`/admin/users?${query.toString()}`),
    placeholderData: keepPreviousData,
  });

  const setUserStatus = useMutation({
    mutationFn: ({ id, status: next }: { id: string; status: 'ACTIVE' | 'BLOCKED' }) =>
      api(`/admin/users/${id}/status`, { method: 'PATCH', body: { status: next, reason: reason || undefined } }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái người dùng');
      setTarget(null);
      setReason('');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Không cập nhật được'),
  });

  const setRole = useMutation({
    mutationFn: ({ id, role: next }: { id: string; role: 'CUSTOMER' | 'ADMIN' }) => api(`/admin/users/${id}/role`, { method: 'PATCH', body: { role: next } }),
    onSuccess: () => {
      toast.success('Đã đổi vai trò');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Không đổi được vai trò'),
  });

  const sendReset = async (id: string) => {
    try {
      await api(`/admin/users/${id}/send-reset-link`, { method: 'POST' });
      toast.success('Đã gửi email đặt lại mật khẩu');
    } catch {
      toast.error('Không gửi được email');
    }
  };

  const rows = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-ink-500">{data ? `${data.meta.total} tài khoản` : 'Đang tải…'}</p>
      </div>

      <div className="card-surface flex flex-wrap items-center gap-3 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ q: search.trim() });
          }}
          className="relative min-w-56 flex-1"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, email, SĐT…" className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3 text-sm dark:border-ink-700 dark:bg-ink-900" />
        </form>
        <select value={role} onChange={(e) => setParam({ role: e.target.value })} className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900">
          <option value="">Mọi vai trò</option>
          <option value="CUSTOMER">Khách hàng</option>
          <option value="ADMIN">Quản trị</option>
        </select>
        <select value={status} onChange={(e) => setParam({ status: e.target.value })} className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900">
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="BLOCKED">Đã khoá</option>
        </select>
        <select value={sort} onChange={(e) => setParam({ sort: e.target.value })} className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900">
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="spent_desc">Chi tiêu nhiều nhất</option>
          <option value="orders_desc">Nhiều đơn nhất</option>
        </select>
        {(q || role || status) && (
          <Button variant="ghost" onClick={() => router.push('/admin/customers')}>
            <X className="h-4 w-4" /> Xoá lọc
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Khách hàng</Th>
              <Th>Liên hệ</Th>
              <Th className="text-center">Đơn hàng</Th>
              <Th className="text-right">Chi tiêu</Th>
              <Th className="text-center">Vai trò</Th>
              <Th className="text-center">Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="transition hover:bg-ink-50 dark:hover:bg-ink-900/40">
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-950">
                      {u.avatarUrl ? (
                        <Image src={u.avatarUrl} alt={u.fullName} fill sizes="36px" className="object-cover" />
                      ) : (
                        <span className="grid h-full place-items-center text-xs font-bold text-brand-700 dark:text-brand-300">{u.fullName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-xs text-ink-400">Tham gia {formatDate(u.createdAt)}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <p className="text-sm">{u.email}</p>
                  <p className="text-xs text-ink-400">{u.phone ?? 'Chưa có SĐT'}</p>
                </Td>
                <Td className="text-center font-semibold">{u._count?.orders ?? 0}</Td>
                <Td className="text-right font-semibold">{u.totalSpent ? formatVND(u.totalSpent) : '—'}</Td>
                <Td className="text-center">
                  <Badge tone={u.role === 'ADMIN' ? 'brand' : 'neutral'}>{u.role === 'ADMIN' ? 'Quản trị' : 'Khách hàng'}</Badge>
                </Td>
                <Td className="text-center">
                  <Badge tone={STATUS_TONE[u.status]}>{u.status === 'ACTIVE' ? 'Hoạt động' : u.status === 'BLOCKED' ? 'Đã khoá' : 'Đã xoá'}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => sendReset(u.id)} aria-label="Gửi link đặt lại mật khẩu">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRole.mutate({ id: u.id, role: u.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN' })}
                      aria-label="Đổi vai trò"
                    >
                      {u.role === 'ADMIN' ? <ShieldOff className="h-4 w-4 text-amber-600" /> : <Shield className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cx(u.status === 'BLOCKED' ? 'text-emerald-600' : 'text-rose-600')}
                      onClick={() => (u.status === 'BLOCKED' ? setUserStatus.mutate({ id: u.id, status: 'ACTIVE' }) : setTarget(u))}
                      aria-label={u.status === 'BLOCKED' ? 'Mở khoá' : 'Khoá tài khoản'}
                    >
                      {u.status === 'BLOCKED' ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Td className="py-10 text-center text-ink-500">
                  <Users className="mx-auto mb-2 h-7 w-7 text-ink-300" />
                  Không tìm thấy người dùng nào
                </Td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      )}

      {data && data.meta.totalPages > 1 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => setParam({ page: p })} />}

      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title={`Khoá tài khoản — ${target?.fullName ?? ''}`}>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Người dùng sẽ không thể đăng nhập cho tới khi được mở khoá. Hành động này được ghi vào nhật ký hệ thống.
        </p>
        <div className="mt-4">
          <label htmlFor="reason" className="mb-1.5 block text-sm font-medium">
            Lý do khoá
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="VD: có dấu hiệu spam đơn hàng ảo"
            className="w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm dark:border-ink-700 dark:bg-ink-900"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setTarget(null)}>
            Huỷ
          </Button>
          <Button variant="danger" loading={setUserStatus.isPending} onClick={() => target && setUserStatus.mutate({ id: target.id, status: 'BLOCKED' })}>
            <UserCog className="h-4 w-4" /> Khoá tài khoản
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminCustomersPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <AdminCustomersContent />
    </Suspense>
  );
}
