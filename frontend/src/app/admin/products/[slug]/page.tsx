'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ImagePlus, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Skeleton } from '@/components/ui';
import { useCategories } from '@/hooks/useCategories';
import { api, apiData, ApiError } from '@/lib/api';
import { cx, formatVND } from '@/lib/format';
import type { Brand, Category, ProductDetail } from '@/types';

interface ImageRow { url: string; cardUrl?: string; thumbUrl?: string; blurData?: string; alt?: string; sortOrder: number }
interface VariantRow { name: string; sku: string; price: string; salePrice: string; stock: string }

const EMPTY = {
  name: '', sku: '', categoryId: '', brandId: '', price: '', salePrice: '', costPrice: '', stock: '0',
  shortDesc: '', description: '', tags: '', weightGram: '', warrantyMonths: '12', isActive: true, isFeatured: false,
};

export default function AdminProductFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const isNew = slug === 'new';

  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  const { data: categories } = useCategories();
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: () => apiData<Brand[]>('/brands') });
  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin', 'product', slug],
    queryFn: () => apiData<ProductDetail>(`/products/${slug}`),
    enabled: !isNew,
    retry: 1,
  });

  useEffect(() => {
    if (!existing) return;
    setProductId(existing.id);
    setForm({
      name: existing.name,
      sku: existing.sku,
      categoryId: existing.category.id,
      brandId: existing.brand?.id ?? '',
      price: String(Number(existing.price)),
      salePrice: existing.salePrice ? String(Number(existing.salePrice)) : '',
      costPrice: '',
      stock: String(existing.stock),
      shortDesc: existing.shortDesc ?? '',
      description: existing.description ?? '',
      tags: existing.tags.join(', '),
      weightGram: existing.weightGram ? String(existing.weightGram) : '',
      warrantyMonths: existing.warrantyMonths ? String(existing.warrantyMonths) : '12',
      // Giữ đúng trạng thái hiện tại — trước đây hardcode `true` nên mỗi lần sửa
      // là vô tình đăng bán lại sản phẩm đang bị ẩn.
      isActive: existing.isActive,
      isFeatured: existing.isFeatured,
    });
    setImages(existing.images.map((img, i) => ({
      url: img.url, cardUrl: img.cardUrl ?? undefined, thumbUrl: img.thumbUrl ?? undefined,
      blurData: img.blurData ?? undefined, alt: img.alt ?? undefined, sortOrder: i,
    })));
    setSpecs(Object.entries(existing.specs ?? {}).map(([key, value]) => ({ key, value })));
    setVariants(existing.variants.map((v) => ({
      name: v.name, sku: v.sku, price: String(Number(v.price)),
      salePrice: v.salePrice ? String(Number(v.salePrice)) : '', stock: String(v.stock),
    })));
  }, [existing]);

  const uploadImages = async (files: FileList) => {
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f));
      const res = await api<{ data: { url: string; cardUrl: string; thumbUrl: string; blurData?: string }[] }>('/uploads/images', { method: 'POST', body: fd });
      setImages((prev) => [
        ...prev,
        ...res.data.map((img, i) => ({ url: img.url, cardUrl: img.cardUrl, thumbUrl: img.thumbUrl, blurData: img.blurData, alt: form.name, sortOrder: prev.length + i })),
      ]);
      toast.success(`Đã tải lên ${res.data.length} ảnh`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Tải ảnh thất bại');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        sku: form.sku,
        categoryId: form.categoryId,
        brandId: form.brandId || null,
        price: Number(form.price),
        salePrice: form.salePrice ? Number(form.salePrice) : null,
        costPrice: form.costPrice ? Number(form.costPrice) : null,
        stock: Number(form.stock),
        shortDesc: form.shortDesc || undefined,
        description: form.description || undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        weightGram: form.weightGram ? Number(form.weightGram) : null,
        warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : null,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        specs: Object.fromEntries(specs.filter((s) => s.key.trim()).map((s) => [s.key.trim(), s.value])),
        images: images.map((img, i) => ({ ...img, sortOrder: i, isPrimary: i === 0 })),
        variants: variants
          .filter((v) => v.name && v.sku)
          .map((v) => ({ name: v.name, sku: v.sku, price: Number(v.price || form.price), salePrice: v.salePrice ? Number(v.salePrice) : null, stock: Number(v.stock || 0) })),
      };

      if (isNew) {
        await apiData('/admin/products', { method: 'POST', body: payload });
        toast.success('Đã tạo sản phẩm mới');
      } else {
        await apiData(`/admin/products/${productId}`, { method: 'PATCH', body: payload });
        toast.success('Đã lưu thay đổi');
      }
      router.push('/admin/products');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không lưu được sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/products" className="mb-1 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
            <ArrowLeft className="h-4 w-4" /> Danh sách sản phẩm
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{isNew ? 'Thêm sản phẩm mới' : `Sửa: ${form.name}`}</h1>
          <p className="mt-0.5 text-sm text-ink-500">Slug (đường dẫn) được sinh tự động từ tên và đảm bảo không trùng</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/products')}>Huỷ</Button>
          <Button loading={saving} onClick={save}>
            <Save className="h-4 w-4" /> {isNew ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-bold">Thông tin cơ bản</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Tên sản phẩm *" name="name" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tai nghe Sony WH-1000XM5" />
              </div>
              <Input label="SKU *" name="sku" value={form.sku} error={errors.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="SONY-WH1000XM5" />
              <div>
                <label htmlFor="categoryId" className="mb-1.5 block text-sm font-medium">Danh mục *</label>
                <select id="categoryId" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm dark:border-ink-700 dark:bg-ink-900">
                  <option value="">— Chọn danh mục —</option>
                  {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.categoryId && <p className="mt-1.5 text-xs text-rose-600">{errors.categoryId}</p>}
              </div>
              <div>
                <label htmlFor="brandId" className="mb-1.5 block text-sm font-medium">Thương hiệu</label>
                <select id="brandId" value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })} className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm dark:border-ink-700 dark:bg-ink-900">
                  <option value="">— Không có —</option>
                  {(brands ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <Input label="Thẻ tag (cách nhau dấu phẩy)" name="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tai nghe, bluetooth, chống ồn" />
            </div>

            <div className="mt-4">
              <label htmlFor="shortDesc" className="mb-1.5 block text-sm font-medium">Mô tả ngắn</label>
              <textarea id="shortDesc" value={form.shortDesc} onChange={(e) => setForm({ ...form, shortDesc: e.target.value })} rows={2} maxLength={300} className="w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm dark:border-ink-700 dark:bg-ink-900" />
            </div>
            <div className="mt-4">
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium">Mô tả chi tiết</label>
              <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={8} className="w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm dark:border-ink-700 dark:bg-ink-900" placeholder="Mỗi đoạn cách nhau 1 dòng trống…" />
            </div>
          </section>

          <section className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Hình ảnh sản phẩm</h2>
              <span className="text-xs text-ink-500">Ảnh đầu tiên là ảnh chính</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className={cx('group relative h-28 w-28 overflow-hidden rounded-xl border-2', i === 0 ? 'border-brand-600' : 'border-ink-200 dark:border-ink-700')}>
                  <Image src={img.cardUrl ?? img.url} alt={img.alt ?? ''} fill sizes="112px" className="object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Ảnh chính</span>}
                  <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100" aria-label="Xoá ảnh">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {i > 0 && (
                    <button
                      onClick={() => {
                        const next = [...images];
                        const [moved] = next.splice(i, 1);
                        next.unshift(moved);
                        setImages(next);
                      }}
                      className="absolute bottom-1 left-1 right-1 rounded bg-black/60 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
                    >
                      Đặt làm ảnh chính
                    </button>
                  )}
                </div>
              ))}
              <label className="grid h-28 w-28 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink-300 text-ink-400 transition hover:border-brand-500 hover:text-brand-600 dark:border-ink-600">
                <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && uploadImages(e.target.files)} disabled={uploading} />
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
              </label>
            </div>
            <p className="mt-2 text-xs text-ink-400">JPG/PNG/WEBP ≤ 5MB. Hệ thống tự nén 3 kích cỡ + blur placeholder.</p>
          </section>

          <section className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Phân loại / biến thể</h2>
              <Button size="sm" variant="outline" onClick={() => setVariants([...variants, { name: '', sku: '', price: '', salePrice: '', stock: '0' }])}>
                <Plus className="h-4 w-4" /> Thêm biến thể
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {variants.map((v, i) => (
                <div key={i} className="grid gap-3 rounded-xl border border-ink-200 p-3 sm:grid-cols-[1.4fr_1.2fr_1fr_1fr_0.8fr_auto] dark:border-ink-700">
                  <Input placeholder="Tên (Đen / 256GB)" value={v.name} onChange={(e) => setVariants(variants.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))} />
                  <Input placeholder="SKU" value={v.sku} onChange={(e) => setVariants(variants.map((x, idx) => (idx === i ? { ...x, sku: e.target.value.toUpperCase() } : x)))} />
                  <Input placeholder="Giá" inputMode="numeric" value={v.price} onChange={(e) => setVariants(variants.map((x, idx) => (idx === i ? { ...x, price: e.target.value.replace(/\D/g, '') } : x)))} />
                  <Input placeholder="Giá sale" inputMode="numeric" value={v.salePrice} onChange={(e) => setVariants(variants.map((x, idx) => (idx === i ? { ...x, salePrice: e.target.value.replace(/\D/g, '') } : x)))} />
                  <Input placeholder="Kho" inputMode="numeric" value={v.stock} onChange={(e) => setVariants(variants.map((x, idx) => (idx === i ? { ...x, stock: e.target.value.replace(/\D/g, '') } : x)))} />
                  <Button variant="ghost" className="text-rose-600" onClick={() => setVariants(variants.filter((_, idx) => idx !== i))} aria-label="Xoá biến thể">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {variants.length === 0 && <p className="text-sm text-ink-500">Chưa có biến thể — dùng tồn kho ở cột bên phải.</p>}
            </div>
          </section>

          <section className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Thông số kỹ thuật</h2>
              <Button size="sm" variant="outline" onClick={() => setSpecs([...specs, { key: '', value: '' }])}>
                <Plus className="h-4 w-4" /> Thêm thông số
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {specs.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <Input placeholder="Tên thông số (Pin)" value={s.key} onChange={(e) => setSpecs(specs.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x)))} />
                  <Input placeholder="Giá trị (30 giờ)" value={s.value} onChange={(e) => setSpecs(specs.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))} />
                  <Button variant="ghost" className="text-rose-600" onClick={() => setSpecs(specs.filter((_, idx) => idx !== i))} aria-label="Xoá thông số">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {specs.length === 0 && <p className="text-sm text-ink-500">Chưa có thông số kỹ thuật.</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          <section className="card-surface p-5">
            <h2 className="font-bold">Giá &amp; kho</h2>
            <div className="mt-4 space-y-4">
              <Input label="Giá bán *" name="price" inputMode="numeric" value={form.price} error={errors.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, '') })} />
              {form.price && <p className="-mt-2 text-xs text-ink-500">Hiển thị: {formatVND(form.price)}</p>}
              <Input label="Giá khuyến mãi" name="salePrice" inputMode="numeric" value={form.salePrice} error={errors.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value.replace(/\D/g, '') })} hint="Phải nhỏ hơn giá bán" />
              <Input label="Giá nhập (nội bộ)" name="costPrice" inputMode="numeric" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value.replace(/\D/g, '') })} />
              <Input label="Tồn kho" name="stock" inputMode="numeric" value={form.stock} error={errors.stock} onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/\D/g, '') })} hint="Bỏ qua nếu có biến thể" />
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-bold">Thuộc tính khác</h2>
            <div className="mt-4 space-y-4">
              <Input label="Khối lượng (gram)" name="weightGram" inputMode="numeric" value={form.weightGram} onChange={(e) => setForm({ ...form, weightGram: e.target.value.replace(/\D/g, '') })} />
              <Input label="Bảo hành (tháng)" name="warrantyMonths" inputMode="numeric" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value.replace(/\D/g, '') })} />
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded text-brand-600" />
                Đang bán (hiển thị trên shop)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="h-4 w-4 rounded text-brand-600" />
                Sản phẩm nổi bật (trang chủ)
              </label>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
