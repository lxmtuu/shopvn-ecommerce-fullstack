'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent, Plus, Tag, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Input, Modal } from '@/components/ui';
import { TableSkeleton, TableWrap, Td, Th } from '@/components/admin/AdminTable';
import { api, apiData, ApiError } from '@/lib/api';
import { cx, formatDate, formatVND } from '@/lib/format';

interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: 'PERCENT' | 'FIXED';
  value: string;
  minOrderValue: string;
  maxDiscount: string | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

const EMPTY = {
  code: '',
  name: '',
  description: '',
  type: 'PERCENT' as 'PERCENT' | 'FIXED',
  value: '',
  minOrderValue: '0',
  maxDiscount: '',
  usageLimit: '',
  usageLimitPerUser: '1',
  expiresAt: '',
  isActive: true,
};

export default function AdminCouponsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: () => apiData<Coupon[]>('/admin/coupons'),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        code: form.code.toUpperCase(),
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        value: Number(form.value),
        minOrderValue: Number(form.minOrderValue || 0),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        usageLimitPerUser: form.usageLimitPerUser ? Number(form.usageLimitPerUser) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        isActive: form.isActive,
      };
      return editing ? api(`/admin/coupons/${editing.id}`, { method: 'PATCH', body: payload }) : api('/admin/coupons', { method: 'POST', body: payload });
    },
    onSuccess: () => {
      toast.success(editing ? 'Đã cập nhật mã giảm giá' : 'Đã tạo mã giảm giá');
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không lưu được mã giảm giá');
    },
  });

  const toggle = useMutation({
    mutationFn: (c: Coupon) => api(`/admin/coupons/${c.id}`, { method: 'PATCH', body: { isActive: !c.isActive } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast.success('Đã đổi trạng thái mã');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá mã giảm giá');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
  });

  const list = coupons ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Mã giảm giá</h1>
          <p className="mt-1 text-sm text-ink-500">{list.length} mã — hỗ trợ giảm theo % hoặc số tiền cố định</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm(EMPTY);
            setErrors({});
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Tạo mã mới
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Mã</Th>
              <Th>Giảm giá</Th>
              <Th className="text-right">Đơn tối thiểu</Th>
              <Th className="text-center">Đã dùng</Th>
              <Th>Hiệu lực</Th>
              <Th className="text-center">Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="transition hover:bg-ink-50 dark:hover:bg-ink-900/40">
                <Td>
                  <span className="inline-flex items-center gap-1.5 font-bold tracking-wide">
                    <Tag className="h-3.5 w-3.5 text-brand-600" /> {c.code}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-400">{c.name}</span>
                </Td>
                <Td className="font-semibold">
                  {c.type === 'PERCENT' ? `${Number(c.value)}%` : formatVND(c.value)}
                  {c.maxDiscount && <span className="ml-1 text-xs font-normal text-ink-400">(tối đa {formatVND(c.maxDiscount)})</span>}
                </Td>
                <Td className="text-right">{Number(c.minOrderValue) === 0 ? '—' : formatVND(c.minOrderValue)}</Td>
                <Td className="text-center">
                  {c.usedCount}
                  {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                </Td>
                <Td className="text-xs text-ink-500">
                  {formatDate(c.startsAt)}
                  <span className="mx-1">→</span>
                  {c.expiresAt ? formatDate(c.expiresAt) : 'không giới hạn'}
                </Td>
                <Td className="text-center">
                  <Badge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Đang chạy' : 'Đã tắt'}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggle.mutate(c)} aria-label="Bật/tắt mã">
                      {c.isActive ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(c);
                        setErrors({});
                        setForm({
                          code: c.code,
                          name: c.name,
                          description: c.description ?? '',
                          type: c.type,
                          value: String(Number(c.value)),
                          minOrderValue: String(Number(c.minOrderValue)),
                          maxDiscount: c.maxDiscount ? String(Number(c.maxDiscount)) : '',
                          usageLimit: c.usageLimit ? String(c.usageLimit) : '',
                          usageLimitPerUser: c.usageLimitPerUser ? String(c.usageLimitPerUser) : '',
                          expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : '',
                          isActive: c.isActive,
                        });
                        setOpen(true);
                      }}
                    >
                      Sửa
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setDeleteTarget(c)} aria-label="Xoá mã">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <Td className="py-10 text-center text-ink-500">
                  <Percent className="mx-auto mb-2 h-7 w-7 text-ink-300" />
                  Chưa có mã giảm giá nào
                </Td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Sửa mã ${editing.code}` : 'Tạo mã giảm giá'} maxWidth="max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Input label="Mã code *" name="code" value={form.code} error={errors.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" />
          <Input label="Tên hiển thị *" name="name" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Giảm 10% cho khách mới" />

          <div>
            <p className="mb-1.5 text-sm font-medium">Loại giảm giá</p>
            <div className="flex gap-2">
              {[
                { value: 'PERCENT', label: 'Theo %' },
                { value: 'FIXED', label: 'Số tiền cố định' },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.value as 'PERCENT' | 'FIXED' })}
                  className={cx('rounded-xl border-2 px-4 py-2 text-sm font-semibold transition', form.type === t.value ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950' : 'border-ink-200 dark:border-ink-700')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={form.type === 'PERCENT' ? 'Giá trị (%) *' : 'Giá trị (VND) *'}
            name="value"
            inputMode="numeric"
            value={form.value}
            error={errors.value}
            onChange={(e) => setForm({ ...form, value: e.target.value.replace(/\D/g, '') })}
          />
          <Input label="Đơn tối thiểu" name="minOrderValue" inputMode="numeric" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value.replace(/\D/g, '') })} hint="0 = không yêu cầu" />
          <Input label="Giảm tối đa" name="maxDiscount" inputMode="numeric" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value.replace(/\D/g, '') })} hint="Bỏ trống = không giới hạn" />
          <Input label="Tổng lượt dùng" name="usageLimit" inputMode="numeric" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value.replace(/\D/g, '') })} hint="Bỏ trống = không giới hạn" />
          <Input label="Lượt dùng / khách" name="usageLimitPerUser" inputMode="numeric" value={form.usageLimitPerUser} onChange={(e) => setForm({ ...form, usageLimitPerUser: e.target.value.replace(/\D/g, '') })} />
          <Input label="Ngày hết hạn" name="expiresAt" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <div className="sm:col-span-2">
            <Input label="Mô tả" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Áp dụng cho mọi sản phẩm" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded text-brand-600" />
            Kích hoạt ngay
          </label>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Lưu thay đổi' : 'Tạo mã'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Xoá mã giảm giá">
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Mã <b>{deleteTarget?.code}</b> sẽ bị xoá. Khách đang có mã này sẽ không dùng được nữa.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Đóng
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>
            Xoá mã
          </Button>
        </div>
      </Modal>
    </div>
  );
}
