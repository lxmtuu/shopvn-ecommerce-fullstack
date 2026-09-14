'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button, Drawer } from '@/components/ui';
import { cx, formatVND } from '@/lib/format';
import type { Brand } from '@/types';

export interface FilterState {
  q: string;
  category: string;
  brands: string[];
  minPrice: string;
  maxPrice: string;
  rating: string;
  inStock: boolean;
  onSale: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  q: '',
  category: '',
  brands: [],
  minPrice: '',
  maxPrice: '',
  rating: '',
  inStock: false,
  onSale: false,
};

export function countActive(f: FilterState) {
  return [f.category, ...f.brands, f.minPrice, f.maxPrice, f.rating, f.inStock, f.onSale].filter(Boolean).length;
}

interface Props {
  filters: FilterState;
  brands: Brand[];
  priceRange: { min: number; max: number };
  categories: { id: string; name: string; slug: string; productCount?: number }[];
  onChange: (next: Partial<FilterState>) => void;
  onReset: () => void;
}

/** Nội dung bộ lọc — dùng chung cho sidebar desktop và drawer mobile */
function FilterContent({ filters, brands, priceRange, categories, onChange, onReset }: Props) {
  const [minLocal, setMinLocal] = useState(filters.minPrice);
  const [maxLocal, setMaxLocal] = useState(filters.maxPrice);

  const applyPrice = () => onChange({ minPrice: minLocal, maxPrice: maxLocal });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Danh mục</h3>
        <div className="space-y-1">
          <button
            onClick={() => onChange({ category: '' })}
            className={cx('w-full rounded-lg px-3 py-2 text-left text-sm transition', !filters.category ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'hover:bg-ink-100 dark:hover:bg-ink-800')}
          >
            Tất cả danh mục
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => onChange({ category: filters.category === c.slug ? '' : c.slug })}
              className={cx('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition', filters.category === c.slug ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'hover:bg-ink-100 dark:hover:bg-ink-800')}
            >
              <span>{c.name}</span>
              <span className="text-xs text-ink-400">{c.productCount ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Thương hiệu</h3>
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {brands.map((b) => {
            const checked = filters.brands.includes(b.slug);
            return (
              <label key={b.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-ink-100 dark:hover:bg-ink-800">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange({ brands: checked ? filters.brands.filter((s) => s !== b.slug) : [...filters.brands, b.slug] })}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="flex-1">{b.name}</span>
                <span className="text-xs text-ink-400">{b.count ?? 0}</span>
              </label>
            );
          })}
          {brands.length === 0 && <p className="px-3 text-sm text-ink-400">Chưa có dữ liệu</p>}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Khoảng giá</h3>
        <p className="mb-3 text-xs text-ink-400">
          {formatVND(priceRange.min)} — {formatVND(priceRange.max)}
        </p>
        <div className="flex items-center gap-2">
          <input
            inputMode="numeric"
            value={minLocal}
            onChange={(e) => setMinLocal(e.target.value.replace(/\D/g, ''))}
            placeholder="Từ"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900"
          />
          <span className="text-ink-400">—</span>
          <input
            inputMode="numeric"
            value={maxLocal}
            onChange={(e) => setMaxLocal(e.target.value.replace(/\D/g, ''))}
            placeholder="Đến"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            ['Dưới 1 triệu', '', '1000000'],
            ['1–5 triệu', '1000000', '5000000'],
            ['5–15 triệu', '5000000', '15000000'],
            ['Trên 15 triệu', '15000000', ''],
          ].map(([label, min, max]) => (
            <button
              key={label}
              onClick={() => {
                setMinLocal(min);
                setMaxLocal(max);
                onChange({ minPrice: min, maxPrice: max });
              }}
              className="rounded-full border border-ink-200 px-3 py-1 text-xs font-medium transition hover:border-brand-500 hover:text-brand-600 dark:border-ink-700"
            >
              {label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={applyPrice}>
          Áp dụng giá
        </Button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Đánh giá</h3>
        <div className="flex flex-wrap gap-1.5">
          {['4', '3', ''].map((r) => (
            <button
              key={r || 'all'}
              onClick={() => onChange({ rating: r })}
              className={cx('rounded-full border px-3 py-1.5 text-xs font-medium transition', filters.rating === r ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'border-ink-200 hover:border-brand-300 dark:border-ink-700')}
            >
              {r ? `Từ ${r}★` : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-ink-100 dark:hover:bg-ink-800">
          <input type="checkbox" checked={filters.inStock} onChange={(e) => onChange({ inStock: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600" />
          Chỉ hiện sản phẩm còn hàng
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-ink-100 dark:hover:bg-ink-800">
          <input type="checkbox" checked={filters.onSale} onChange={(e) => onChange({ onSale: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600" />
          Đang giảm giá
        </label>
      </div>

      <Button variant="ghost" className="w-full" onClick={onReset}>
        <X className="h-4 w-4" /> Xoá tất cả bộ lọc
      </Button>
    </div>
  );
}

export function FilterSidebar(props: Props) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="card-surface sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-5">
        <h2 className="mb-5 flex items-center gap-2 text-base font-bold">
          <SlidersHorizontal className="h-4 w-4 text-brand-600" /> Bộ lọc
        </h2>
        <FilterContent {...props} />
      </div>
    </aside>
  );
}

export function FilterMobileDrawer(props: Props & { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={props.open} onClose={props.onClose} title="Bộ lọc sản phẩm" side="bottom">
      <div className="p-5">
        <FilterContent {...props} />
      </div>
    </Drawer>
  );
}
