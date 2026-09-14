'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, EmptyState, Input, Modal, Skeleton } from '@/components/ui';
import { api, apiData, ApiError } from '@/lib/api';
import { cx } from '@/lib/format';
import type { Address } from '@/types';

const EMPTY = {
  fullName: '',
  phone: '',
  provinceName: '',
  districtName: '',
  wardName: '',
  detail: '',
  note: '',
  isDefault: false,
};

export default function AddressesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<Address | null>(null);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiData<Address[]>('/addresses'),
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? apiData<Address>(`/addresses/${editing.id}`, { method: 'PATCH', body: form })
        : apiData<Address>('/addresses', { method: 'POST', body: form }),
    onSuccess: () => {
      toast.success(editing ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ mới');
      qc.invalidateQueries({ queryKey: ['addresses'] });
      closeModal();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không lưu được địa chỉ');
    },
  });

  const openModal = (address?: Address) => {
    setEditing(address ?? null);
    setErrors({});
    setForm(
      address
        ? {
            fullName: address.fullName,
            phone: address.phone,
            provinceName: address.provinceName,
            districtName: address.districtName ?? '',
            wardName: address.wardName ?? '',
            detail: address.detail,
            note: address.note ?? '',
            isDefault: address.isDefault,
          }
        : EMPTY,
    );
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const setDefault = async (id: string) => {
    try {
      await api(`/addresses/${id}/default`, { method: 'PATCH' });
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Đã đặt làm địa chỉ mặc định');
    } catch {
      toast.error('Không đặt được mặc định');
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/addresses/${id}`, { method: 'DELETE' });
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Đã xoá địa chỉ');
      setConfirmDelete(null);
    } catch {
      toast.error('Không xoá được địa chỉ');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Sổ địa chỉ</h1>
          <p className="mt-1 text-sm text-ink-500">Lưu tối đa 10 địa chỉ để thanh toán nhanh hơn</p>
        </div>
        <Button onClick={() => openModal()} disabled={(addresses?.length ?? 0) >= 10}>
          <Plus className="h-4 w-4" /> Thêm địa chỉ
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : (addresses ?? []).length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-7 w-7" />}
          title="Chưa có địa chỉ nào"
          description="Thêm địa chỉ giao hàng để đặt hàng chỉ trong vài cú nhấp."
          action={<Button onClick={() => openModal()}>Thêm địa chỉ đầu tiên</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses!.map((a) => (
            <article key={a.id} className={cx('card-surface p-5', a.isDefault && 'border-brand-300 ring-1 ring-brand-500/20')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {a.fullName}
                    {a.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                        <Star className="h-3 w-3 fill-current" /> Mặc định
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-500">{a.phone}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
                    {[a.detail, a.wardName, a.districtName, a.provinceName].filter(Boolean).join(', ')}
                  </p>
                  {a.note && <p className="mt-2 text-xs text-ink-400">Ghi chú: {a.note}</p>}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!a.isDefault && (
                  <Button variant="outline" size="sm" onClick={() => setDefault(a.id)}>
                    <Check className="h-4 w-4" /> Đặt mặc định
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => openModal(a)}>
                  <Pencil className="h-4 w-4" /> Sửa
                </Button>
                <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setConfirmDelete(a)}>
                  <Trash2 className="h-4 w-4" /> Xoá
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Modal thêm/sửa ── */}
      <Modal open={open} onClose={closeModal} title={editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Input label="Tên người nhận *" name="fullName" value={form.fullName} error={errors.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Số điện thoại *" name="phone" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" inputMode="tel" required />
          <Input label="Tỉnh / Thành phố *" name="provinceName" value={form.provinceName} error={errors.provinceName} onChange={(e) => setForm({ ...form, provinceName: e.target.value })} placeholder="Lâm Đồng" required />
          <Input label="Quận / Huyện" name="districtName" value={form.districtName} onChange={(e) => setForm({ ...form, districtName: e.target.value })} placeholder="TP. Đà Lạt" />
          <Input label="Phường / Xã" name="wardName" value={form.wardName} onChange={(e) => setForm({ ...form, wardName: e.target.value })} placeholder="Phường 1" />
          <Input label="Địa chỉ chi tiết *" name="detail" value={form.detail} error={errors.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="Số 12, đường Trần Phú" required />
          <div className="sm:col-span-2">
            <Input label="Ghi chú" name="note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ví dụ: gọi trước khi giao" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="h-4 w-4 rounded text-brand-600" />
            Đặt làm địa chỉ mặc định
          </label>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Huỷ
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal xác nhận xoá ── */}
      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Xoá địa chỉ">
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Xoá địa chỉ của <b>{confirmDelete?.fullName}</b> ({confirmDelete?.phone})? Hành động này không thể hoàn tác.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Đóng
          </Button>
          <Button variant="danger" onClick={() => confirmDelete && remove(confirmDelete.id)}>
            Xoá địa chỉ
          </Button>
        </div>
      </Modal>
    </div>
  );
}
