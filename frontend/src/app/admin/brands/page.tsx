'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Input, Modal } from '@/components/ui';
import { TableSkeleton, TableWrap, Td, Th } from '@/components/admin/AdminTable';
import { api, apiData } from '@/lib/api';
import type { Brand } from '@/types';

interface AdminBrand extends Brand {
  logoUrl?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export default function AdminBrandsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBrand | null>(null);
  const [form, setForm] = useState({ name: '', logoUrl: '', description: '', isActive: true });
  const [deleteTarget, setDeleteTarget] = useState<AdminBrand | null>(null);

  const { data: brands, isLoading } = useQuery({
    queryKey: ['admin', 'brands'],
    queryFn: () => apiData<AdminBrand[]>('/admin/brands'),
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api(`/admin/brands/${editing.id}`, { method: 'PATCH', body: { name: form.name, logoUrl: form.logoUrl || undefined, description: form.description || undefined, isActive: form.isActive } })
        : api('/admin/brands', { method: 'POST', body: { name: form.name, logoUrl: form.logoUrl || undefined, description: form.description || undefined, isActive: form.isActive } }),
    onSuccess: () => {
      toast.success(editing ? 'Đã cập nhật thương hiệu' : 'Đã tạo thương hiệu');
      qc.invalidateQueries({ queryKey: ['admin', 'brands'] });
      qc.invalidateQueries({ queryKey: ['brands'] });
      setOpen(false);
      setEditing(null);
    },
    onError: () => toast.error('Không lưu được thương hiệu'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/brands/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá thương hiệu');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'brands'] });
      qc.invalidateQueries({ queryKey: ['brands'] });
    },
  });

  const list = brands ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Thương hiệu</h1>
          <p className="mt-1 text-sm text-ink-500">{list.length} thương hiệu đang quản lý</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm({ name: '', logoUrl: '', description: '', isActive: true });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Thêm thương hiệu
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Thương hiệu</Th>
              <Th>Slug</Th>
              <Th className="text-center">Sản phẩm</Th>
              <Th className="text-center">Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} className="transition hover:bg-ink-50 dark:hover:bg-ink-900/40">
                <Td>
                  <span className="font-medium">{b.name}</span>
                  {b.description && <span className="mt-0.5 block line-clamp-1 text-xs text-ink-400">{b.description}</span>}
                </Td>
                <Td className="text-xs text-ink-500">{b.slug}</Td>
                <Td className="text-center">{b.count ?? 0}</Td>
                <Td className="text-center">
                  <Badge tone={b.isActive === false ? 'neutral' : 'success'}>{b.isActive === false ? 'Đã ẩn' : 'Hiển thị'}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(b);
                        setForm({ name: b.name, logoUrl: b.logoUrl ?? '', description: b.description ?? '', isActive: b.isActive !== false });
                        setOpen(true);
                      }}
                      aria-label="Sửa thương hiệu"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setDeleteTarget(b)} aria-label="Xoá thương hiệu">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <Td className="py-10 text-center text-ink-500">
                  <Tags className="mx-auto mb-2 h-7 w-7 text-ink-300" />
                  Chưa có thương hiệu nào
                </Td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Sửa — ${editing.name}` : 'Thêm thương hiệu'}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <Input label="Tên thương hiệu *" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sony" />
          <Input label="Logo (URL)" name="logoUrl" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://…" />
          <Input label="Mô tả" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded text-brand-600" />
            Hiển thị
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" loading={save.isPending}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Xoá thương hiệu">
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Thương hiệu <b>{deleteTarget?.name}</b> sẽ bị ẩn khỏi shop. Sản phẩm thuộc thương hiệu này vẫn được giữ nguyên.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Đóng
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>
            Xoá
          </Button>
        </div>
      </Modal>
    </div>
  );
}
