'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Input, Modal } from '@/components/ui';
import { TableSkeleton, TableWrap, Td, Th } from '@/components/admin/AdminTable';
import { api, apiData, ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type { Category } from '@/types';

const EMPTY = { name: '', description: '', parentId: '', imageUrl: '', iconName: '', sortOrder: '0', isActive: true };

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => apiData<Category[]>('/admin/categories'),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        parentId: form.parentId || null,
        imageUrl: form.imageUrl || undefined,
        iconName: form.iconName || undefined,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive,
      };
      return editing ? api(`/admin/categories/${editing.id}`, { method: 'PATCH', body: payload }) : api('/admin/categories', { method: 'POST', body: payload });
    },
    onSuccess: () => {
      toast.success(editing ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục');
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không lưu được danh mục');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá danh mục');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Không xoá được — danh mục còn sản phẩm?'),
  });

  const list = categories ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Danh mục sản phẩm</h1>
          <p className="mt-1 text-sm text-ink-500">{list.length} danh mục — hỗ trợ danh mục cha / con</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm(EMPTY);
            setErrors({});
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Thêm danh mục
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Danh mục</Th>
              <Th>Đường dẫn</Th>
              <Th className="text-center">Sản phẩm</Th>
              <Th className="text-center">Thứ tự</Th>
              <Th className="text-center">Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="transition hover:bg-ink-50 dark:hover:bg-ink-900/40">
                <Td>
                  <span className="font-medium">{c.name}</span>
                  {c.children && c.children.length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {c.children.map((child) => (
                        <span key={child.id} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] dark:bg-ink-800">
                          {child.name}
                        </span>
                      ))}
                    </span>
                  )}
                </Td>
                <Td className="text-xs text-ink-500">/{c.slug}</Td>
                <Td className="text-center">{formatNumber(c.productCount ?? 0)}</Td>
                <Td className="text-center text-ink-500">{(c as { sortOrder?: number }).sortOrder ?? 0}</Td>
                <Td className="text-center">
                  <Badge tone={(c as { isActive?: boolean }).isActive === false ? 'neutral' : 'success'}>
                    {(c as { isActive?: boolean }).isActive === false ? 'Đã ẩn' : 'Hiển thị'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(c);
                        setErrors({});
                        setForm({
                          name: c.name,
                          description: (c as { description?: string }).description ?? '',
                          parentId: (c as { parentId?: string | null }).parentId ?? '',
                          imageUrl: c.imageUrl ?? '',
                          iconName: c.iconName ?? '',
                          sortOrder: String((c as { sortOrder?: number }).sortOrder ?? 0),
                          isActive: (c as { isActive?: boolean }).isActive !== false,
                        });
                        setOpen(true);
                      }}
                      aria-label="Sửa danh mục"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setDeleteTarget(c)} aria-label="Xoá danh mục">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <Td className="py-10 text-center text-ink-500">
                  <FolderTree className="mx-auto mb-2 h-7 w-7 text-ink-300" />
                  Chưa có danh mục nào
                </Td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Sửa danh mục — ${editing.name}` : 'Thêm danh mục'}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Input label="Tên danh mục *" name="name" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Điện thoại & Máy tính bảng" />
          </div>
          <div>
            <label htmlFor="parentId" className="mb-1.5 block text-sm font-medium">
              Danh mục cha
            </label>
            <select id="parentId" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm dark:border-ink-700 dark:bg-ink-900">
              <option value="">— Danh mục gốc —</option>
              {list.filter((c) => c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input label="Thứ tự hiển thị" name="sortOrder" inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/\D/g, '') })} />
          <Input label="Ảnh danh mục (URL)" name="imageUrl" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
          <Input label="Icon (tên lucide)" name="iconName" value={form.iconName} onChange={(e) => setForm({ ...form, iconName: e.target.value })} placeholder="Smartphone" />
          <div className="sm:col-span-2">
            <Input label="Mô tả" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded text-brand-600" />
            Hiển thị trên shop
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" loading={save.isPending}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Xoá danh mục">
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Danh mục <b>{deleteTarget?.name}</b> sẽ bị xoá mềm. Nếu còn sản phẩm, hãy chuyển sản phẩm sang danh mục khác trước.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Đóng
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>
            Xoá danh mục
          </Button>
        </div>
      </Modal>
    </div>
  );
}
