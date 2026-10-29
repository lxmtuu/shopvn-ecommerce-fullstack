'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Globe, Save, Settings as SettingsIcon, Truck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Skeleton } from '@/components/ui';
import { apiData, ApiError } from '@/lib/api';
import { formatVND } from '@/lib/format';

interface Settings {
  siteName: string;
  logoUrl: string | null;
  hotline: string | null;
  email: string | null;
  address: string | null;
  taxCode: string | null;
  social: Record<string, string>;
  bankBin: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  shippingFees: Record<string, number>;
  freeShipThreshold: number | null;
  seoTitle: string | null;
  seoDesc: string | null;
  maintenance: boolean;
}

export default function AdminSettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => apiData<Settings>('/admin/settings'),
  });

  const [form, setForm] = useState<Settings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setForm({ ...data, social: data.social ?? {}, shippingFees: data.shippingFees ?? { STANDARD: 30000, EXPRESS: 50000, INSTANT: 80000 } });
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      apiData<Settings>('/admin/settings', {
        method: 'PATCH',
        body: {
          siteName: form!.siteName,
          logoUrl: form!.logoUrl || null,
          hotline: form!.hotline || null,
          email: form!.email || null,
          address: form!.address || null,
          taxCode: form!.taxCode || null,
          social: form!.social,
          bankBin: form!.bankBin || null,
          bankAccountNo: form!.bankAccountNo || null,
          bankAccountName: form!.bankAccountName || null,
          bankName: form!.bankName || null,
          shippingFees: form!.shippingFees,
          freeShipThreshold: form!.freeShipThreshold ?? 0,
          seoTitle: form!.seoTitle || null,
          seoDesc: form!.seoDesc || null,
          maintenance: form!.maintenance,
        },
      }),
    onSuccess: () => {
      toast.success('Đã lưu cấu hình shop');
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      qc.invalidateQueries({ queryKey: ['bankInfo'] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không lưu được cấu hình');
    },
  });

  const setSocial = (key: string, value: string) => setForm((f) => (f ? { ...f, social: { ...f.social, [key]: value } } : f));
  const setFee = (key: string, value: string) => setForm((f) => (f ? { ...f, shippingFees: { ...f.shippingFees, [key]: Number(value || 0) } } : f));

  if (isLoading || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Cấu hình shop</h1>
          <p className="mt-1 text-sm text-ink-500">Thông tin hiển thị trên hoá đơn, footer, email và trang thanh toán QR</p>
        </div>
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          <Save className="h-4 w-4" /> Lưu cấu hình
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Thông tin shop ── */}
        <section className="card-surface p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <SettingsIcon className="h-4 w-4 text-brand-600" /> Thông tin cửa hàng
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Tên shop" name="siteName" value={form.siteName} error={errors.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
            </div>
            <Input label="Hotline" name="hotline" value={form.hotline ?? ''} onChange={(e) => setForm({ ...form, hotline: e.target.value })} placeholder="1900 1234" />
            <Input label="Email liên hệ" name="email" type="email" value={form.email ?? ''} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hotro@shopvn.vn" />
            <Input label="Mã số thuế" name="taxCode" value={form.taxCode ?? ''} onChange={(e) => setForm({ ...form, taxCode: e.target.value })} />
            <Input label="Logo (URL)" name="logoUrl" value={form.logoUrl ?? ''} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
            <div className="sm:col-span-2">
              <Input label="Địa chỉ" name="address" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Trần Phú, Đà Lạt" />
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <input type="checkbox" checked={form.maintenance} onChange={(e) => setForm({ ...form, maintenance: e.target.checked })} className="h-4 w-4 rounded text-amber-600" />
            <span>
              <b>Chế độ bảo trì</b> — hiển thị thông báo bảo trì cho khách truy cập
            </span>
          </label>
        </section>

        {/* ── Mạng xã hội ── */}
        <section className="card-surface p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Globe className="h-4 w-4 text-brand-600" /> Mạng xã hội
          </h2>
          <p className="mt-1 text-xs text-ink-500">Hiển thị ở footer, header và email gửi khách</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ['facebook', 'Facebook'],
              ['instagram', 'Instagram'],
              ['tiktok', 'TikTok'],
              ['youtube', 'YouTube'],
              ['zalo', 'Zalo'],
            ].map(([key, label]) => (
              <Input key={key} label={label} name={key} value={form.social[key] ?? ''} onChange={(e) => setSocial(key, e.target.value)} placeholder={`https://${key}.com/shopvn`} />
            ))}
          </div>
        </section>

        {/* ── Thanh toán QR ── */}
        <section className="card-surface p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Wallet className="h-4 w-4 text-brand-600" /> Tài khoản nhận tiền (VietQR)
          </h2>
          <p className="mt-1 text-xs text-ink-500">QR sinh tự động theo chuẩn VietQR — cần đúng BIN ngân hàng (6 số)</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Mã BIN ngân hàng" name="bankBin" value={form.bankBin ?? ''} error={errors.bankBin} onChange={(e) => setForm({ ...form, bankBin: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="970436" />
            <Input label="Tên ngân hàng" name="bankName" value={form.bankName ?? ''} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Vietcombank" />
            <Input label="Số tài khoản" name="bankAccountNo" value={form.bankAccountNo ?? ''} onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })} placeholder="0011000123456" />
            <Input label="Chủ tài khoản" name="bankAccountName" value={form.bankAccountName ?? ''} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value.toUpperCase() })} placeholder="NGUYEN VAN A" />
          </div>
          <p className="mt-3 rounded-xl bg-ink-50 p-3 text-xs text-ink-500 dark:bg-ink-900">
            Mã BIN tra cứu tại <a href="https://api.vietqr.io/v2/banks" target="_blank" rel="noreferrer" className="font-semibold text-brand-600 hover:underline">api.vietqr.io/v2/banks</a> — Vietcombank 970436, Techcombank 970407, MB 970422, ACB 970416.
          </p>
        </section>

        {/* ── Vận chuyển ── */}
        <section className="card-surface p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Truck className="h-4 w-4 text-brand-600" /> Phí vận chuyển
          </h2>
          <div className="mt-4 space-y-4">
            {[
              ['STANDARD', 'Giao tiêu chuẩn (3–5 ngày)'],
              ['EXPRESS', 'Giao nhanh (1–2 ngày)'],
              ['INSTANT', 'Giao hoả tốc (trong ngày)'],
            ].map(([key, label]) => (
              <div key={key}>
                <Input label={label} name={key} inputMode="numeric" value={String(form.shippingFees[key] ?? 0)} onChange={(e) => setFee(key, e.target.value.replace(/\D/g, ''))} />
                <p className="mt-1 text-xs text-ink-400">{formatVND(form.shippingFees[key] ?? 0)}</p>
              </div>
            ))}
            <div>
              <Input label="Ngưỡng miễn phí vận chuyển" name="freeShipThreshold" inputMode="numeric" value={String(form.freeShipThreshold ?? 0)} onChange={(e) => setForm({ ...form, freeShipThreshold: Number(e.target.value.replace(/\D/g, '')) })} />
              <p className="mt-1 text-xs text-ink-400">Đơn từ {formatVND(form.freeShipThreshold ?? 0)} trở lên sẽ được miễn phí ship</p>
            </div>
          </div>
        </section>

        {/* ── SEO ── */}
        <section className="card-surface p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-bold">
            <Building2 className="h-4 w-4 text-brand-600" /> SEO &amp; chia sẻ mạng xã hội
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Tiêu đề SEO (≤ 70 ký tự)" name="seoTitle" value={form.seoTitle ?? ''} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
            <Input label="Mô tả SEO (≤ 160 ký tự)" name="seoDesc" value={form.seoDesc ?? ''} onChange={(e) => setForm({ ...form, seoDesc: e.target.value })} />
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <Button size="lg" loading={save.isPending} onClick={() => save.mutate()}>
          <Save className="h-4 w-4" /> Lưu toàn bộ cấu hình
        </Button>
      </div>

      <p className="text-xs text-ink-400">Ghi chú kỹ thuật: cấu hình được lưu vào bảng <code>site_settings</code> (id = “default”) và mọi thay đổi đều được ghi vào nhật ký hệ thống.</p>
    </div>
  );
}
