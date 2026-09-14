'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Eye, Filter, Package, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Modal, Pagination, Input } from '@/components/ui';
import { TableSkeleton, TableWrap, Td, Th } from '@/components/admin/AdminTable';
import { useCategories } from '@/hooks/useCategories';
import { api, apiData, apiFull, ApiError } from '@/lib/api';
import { cx, formatDate, formatNumber, formatVND } from '@/lib/format';
import type { Category, Paginated, ProductCard } from '@/types';

interface AdminProduct extends ProductCard {
  sku: string;
  isActive: boolean;
  lowStockAlert: number;
  viewCount: number;
  variantCount: number;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}

const STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'active', label: 'Đang bán' },
  { value: 'inactive', label: 'Đã ẩn' },
  { value: 'deleted', label: 'Đã xoá' },
];

function AdminProductsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const category = params.get('category') ?? '';
  const page = Number(params.get('page') ?? 1);

  const [search, setSearch] = useState(q);
  const [selected, setSelected] = useState<string[]>([]);
  const [stockTarget, setStockTarget] = useState<AdminProduct | null>(null);
  const [stockChange, setStockChange] = useState('10');
  const [stockReason, setStockReason] = useState<'RESTOCK' | 'ADJUSTMENT'>('RESTOCK');
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);

  const setParam = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => (v === undefined || v === '' ? sp.delete(k) : sp.set(k, String(v))));
    if (!('page' in next)) sp.delete('page');
    router.push(`/admin/products?${sp.toString()}`);
  };

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (status) query.set('status', status);
  if (category) query.set('category', category);
  query.set('page', String(page));
  query.set('limit', '15');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', query.toString()],
    queryFn: () => apiFull<Paginated<AdminProduct>>(`/admin/products?${query.toString()}`),
    placeholderData: keepPreviousData,
  });

  const { data: categories } = useCategories();

  const bulk = useMutation({
    mutationFn: (action: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature') =>
      api('/admin/products/bulk', { method: 'PATCH', body: { ids: selected, action } }),
    onSuccess: () => {
      toast.success('Đã áp dụng cho các sản phẩm đã chọn');
      setSelected([]);
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: () => toast.error('Thao tác hàng loạt thất bại'),
  });

  const updateStock = useMutation({
    mutationFn: () =>
      apiData(`/admin/products/${stockTarget!.id}/stock`, {
        method: 'PATCH',
        body: { change: Number(stockChange), reason: stockReason, note: 'Cập nhật từ trang quản trị' },
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật tồn kho');
      setStockTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Không cập nhật được tồn kho'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá sản phẩm');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: () => toast.error('Không xoá được sản phẩm'),
  });

  const rows = data?.data ?? [];
  const allChecked = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Quản lý sản phẩm</h1>
          <p className="mt-1 text-sm text-ink-500">{data ? `${formatNumber(data.meta.total)} sản phẩm` : 'Đang tải…'}</p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4" /> Thêm sản phẩm
          </Button>
        </Link>
      </div>

      {/* ── Bộ lọc ── */}
      <div className="card-surface flex flex-wrap items-center gap-3 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ q: search.trim() });
          }}
          className="relative min-w-56 flex-1"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc SKU…"
            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3 text-sm dark:border-ink-700 dark:bg-ink-900"
          />
        </form>

        <select value={status} onChange={(e) => setParam({ status: e.target.value })} className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900">
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select value={category} onChange={(e) => setParam({ category: e.target.value })} className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900">
          <option value="">Tất cả danh mục</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        {(q || status || category) && (
          <Button variant="ghost" onClick={() => router.push('/admin/products')}>
            <X className="h-4 w-4" /> Xoá lọc
          </Button>
        )}
      </div>

      {/* ── Thao tác hàng loạt ── */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-900 dark:bg-brand-950/40">
          <span className="text-sm font-semibold">Đã chọn {selected.length} sản phẩm</span>
          <Button size="sm" variant="outline" onClick={() => bulk.mutate('activate')} loading={bulk.isPending}>
            Hiện bán
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk.mutate('deactivate')} loading={bulk.isPending}>
            Ẩn
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk.mutate('feature')} loading={bulk.isPending}>
            Đánh dấu nổi bật
          </Button>
          <Button size="sm" variant="danger" onClick={() => bulk.mutate('delete')} loading={bulk.isPending}>
            Xoá
          </Button>
          <button onClick={() => setSelected([])} className="ml-auto text-xs font-semibold text-ink-500 hover:underline">
            Bỏ chọn
          </button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th className="w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                  className="h-4 w-4 rounded text-brand-600"
                  aria-label="Chọn tất cả"
                />
              </Th>
              <Th>Sản phẩm</Th>
              <Th>Danh mục</Th>
              <Th className="text-right">Giá bán</Th>
              <Th className="text-center">Tồn kho</Th>
              <Th className="text-center">Đã bán</Th>
              <Th className="text-center">Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={cx('transition hover:bg-ink-50 dark:hover:bg-ink-900/40', selected.includes(p.id) && 'bg-brand-50/60 dark:bg-brand-950/30')}>
                <Td>
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((x) => x !== p.id))}
                    className="h-4 w-4 rounded text-brand-600"
                    aria-label={`Chọn ${p.name}`}
                  />
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                      {p.thumbnail && <Image src={p.thumbnail} alt={p.name} fill sizes="44px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/admin/products/${p.slug}`} className="line-clamp-1 font-semibold hover:text-brand-600">
                        {p.name}
                      </Link>
                      <p className="text-xs text-ink-400">
                        SKU {p.sku} · {p.variantCount} phân loại · {formatNumber(p.viewCount)} lượt xem
                      </p>
                    </div>
                  </div>
                </Td>
                <Td className="text-sm text-ink-600 dark:text-ink-400">{p.category.name}</Td>
                <Td className="text-right">
                  <span className="font-semibold">{formatVND(p.effectivePrice)}</span>
                  {p.isOnSale && <span className="mt-0.5 block text-xs text-ink-400 line-through">{formatVND(p.price)}</span>}
                </Td>
                <Td className="text-center">
                  <Badge tone={p.stock === 0 ? 'danger' : p.stock <= p.lowStockAlert ? 'warning' : 'neutral'}>{p.stock}</Badge>
                </Td>
                <Td className="text-center text-sm">{p.sold}</Td>
                <Td className="text-center">
                  <Badge tone={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Đang bán' : 'Đã ẩn'}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/products/${p.slug}`} target="_blank">
                      <Button size="sm" variant="ghost" aria-label="Xem trên shop">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => setStockTarget(p)} aria-label="Cập nhật tồn kho">
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                    <Link href={`/admin/products/${p.slug}`}>
                      <Button size="sm" variant="ghost" aria-label="Sửa sản phẩm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setDeleteTarget(p)} aria-label="Xoá sản phẩm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Td className="py-10 text-center text-ink-500" >
                  <Package className="mx-auto mb-2 h-7 w-7 text-ink-300" />
                  Không tìm thấy sản phẩm nào phù hợp bộ lọc
                </Td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      )}

      {data && data.meta.totalPages > 1 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => setParam({ page: p })} />}

      {/* ── Modal tồn kho ── */}
      <Modal open={Boolean(stockTarget)} onClose={() => setStockTarget(null)} title={`Cập nhật tồn kho — ${stockTarget?.name ?? ''}`}>
        <div className="space-y-4">
          <Input label="Số lượng thay đổi" name="stockChange" value={stockChange} onChange={(e) => setStockChange(e.target.value.replace(/[^\d-]/g, ''))} hint="Nhập số dương để nhập thêm hàng, số âm để trừ (kiểm kê, hỏng…)" />
          <div>
            <p className="mb-1.5 text-sm font-medium">Lý do</p>
            <div className="flex gap-2">
              {[
                { value: 'RESTOCK', label: 'Nhập thêm hàng' },
                { value: 'ADJUSTMENT', label: 'Điều chỉnh / kiểm kê' },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setStockReason(r.value as typeof stockReason)}
                  className={cx('rounded-xl border-2 px-4 py-2 text-sm font-semibold transition', stockReason === r.value ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950' : 'border-ink-200 dark:border-ink-700')}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setStockTarget(null)}>
              Huỷ
            </Button>
            <Button loading={updateStock.isPending} onClick={() => updateStock.mutate()}>
              Cập nhật
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal xoá ── */}
      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Xoá sản phẩm">
        <p className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          Sản phẩm <b>{deleteTarget?.name}</b> sẽ bị ẩn khỏi shop (xoá mềm). Bạn có thể khôi phục bằng cách lọc “Đã xoá”.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Đóng
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>
            Xoá sản phẩm
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <AdminProductsContent />
    </Suspense>
  );
}
