'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PackageSearch, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, EmptyState, Pagination, ProductCardSkeleton, Badge } from '@/components/ui';
import { ProductCard } from '@/components/shop/ProductCard';
import { EMPTY_FILTERS, FilterMobileDrawer, FilterSidebar, countActive, type FilterState } from '@/components/shop/FilterPanel';
import { useCategories } from '@/hooks/useCategories';
import { apiFull } from '@/lib/api';
import { cx, formatNumber } from '@/lib/format';
import type { Brand, Category, ProductListResponse } from '@/types';

const SORTS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best_selling', label: 'Bán chạy' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'discount', label: 'Giảm giá nhiều' },
];

function ProductsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(params.get('q') ?? '');

  useEffect(() => {
    setSearchInput(params.get('q') ?? '');
  }, [params]);

  const filters: FilterState = useMemo(
    () => ({
      q: params.get('q') ?? '',
      category: params.get('category') ?? '',
      brands: params.get('brand') ? params.get('brand')!.split(',').filter(Boolean) : [],
      minPrice: params.get('minPrice') ?? '',
      maxPrice: params.get('maxPrice') ?? '',
      rating: params.get('rating') ?? '',
      inStock: params.get('inStock') === 'true',
      onSale: params.get('onSale') === 'true',
    }),
    [params],
  );

  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page') ?? 1);

  const updateParams = (next: Record<string, string | number | boolean | undefined | null>) => {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === false) sp.delete(key);
      else sp.set(key, String(value));
    });
    if (!('page' in next)) sp.delete('page');
    router.push(`/products?${sp.toString()}`, { scroll: false });
  };

  const applyFilters = (patch: Partial<FilterState>) => {
    const next = { ...filters, ...patch };
    updateParams({
      q: next.q,
      category: next.category,
      brand: next.brands.join(',') || undefined,
      minPrice: next.minPrice || undefined,
      maxPrice: next.maxPrice || undefined,
      rating: next.rating || undefined,
      inStock: next.inStock || undefined,
      onSale: next.onSale || undefined,
    });
  };

  const resetFilters = () => {
    setSearchInput('');
    router.push('/products', { scroll: false });
  };

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (filters.q) sp.set('q', filters.q);
    if (filters.category) sp.set('category', filters.category);
    if (filters.brands.length) sp.set('brand', filters.brands.join(','));
    if (filters.minPrice) sp.set('minPrice', filters.minPrice);
    if (filters.maxPrice) sp.set('maxPrice', filters.maxPrice);
    if (filters.rating) sp.set('rating', filters.rating);
    if (filters.inStock) sp.set('inStock', 'true');
    if (filters.onSale) sp.set('onSale', 'true');
    sp.set('sort', sort);
    sp.set('page', String(page));
    sp.set('limit', '24');
    return sp.toString();
  }, [filters, sort, page]);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['products', queryString],
    queryFn: () => apiFull<ProductListResponse>(`/products?${queryString}`),
    placeholderData: (prev) => prev,
  });

  const { data: categories } = useCategories();

  useEffect(() => {
    document.title = filters.q ? `Tìm "${filters.q}" | ShopVN` : 'Sản phẩm | ShopVN';
  }, [filters.q]);

  const activeCount = countActive(filters);
  const facets = data?.facets;
  const brandList: Brand[] = facets?.brands ?? [];

  return (
    <div className="container-page py-8">
      <nav aria-label="Đường dẫn" className="mb-5 flex items-center gap-2 text-sm text-ink-500">
        <button onClick={() => router.push('/')} className="hover:text-brand-600">Trang chủ</button>
        <span>/</span>
        <span className="font-medium text-ink-800 dark:text-ink-200">Sản phẩm</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {filters.q ? `Kết quả cho “${filters.q}”` : categories?.find((c) => c.slug === filters.category)?.name ?? 'Tất cả sản phẩm'}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {data ? `${formatNumber(data.meta.total)} sản phẩm` : 'Đang tải…'}
          {activeCount > 0 && ` · ${activeCount} bộ lọc đang áp dụng`}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters({ q: searchInput.trim() });
        }}
        className="mb-6 flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên sản phẩm, thương hiệu…"
            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-900"
          />
        </div>
        <Button type="submit">Tìm</Button>
        {filters.q && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchInput('');
              applyFilters({ q: '' });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {activeCount > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {filters.category && (
            <Chip label={`Danh mục: ${categories?.find((c) => c.slug === filters.category)?.name ?? filters.category}`} onRemove={() => applyFilters({ category: '' })} />
          )}
          {filters.brands.map((b) => (
            <Chip key={b} label={brandList.find((x) => x.slug === b)?.name ?? b} onRemove={() => applyFilters({ brands: filters.brands.filter((s) => s !== b) })} />
          ))}
          {filters.minPrice && <Chip label={`Từ ${formatNumber(filters.minPrice)}đ`} onRemove={() => applyFilters({ minPrice: '', maxPrice: '' })} />}
          {filters.maxPrice && <Chip label={`Đến ${formatNumber(filters.maxPrice)}đ`} onRemove={() => applyFilters({ maxPrice: '' })} />}
          {filters.rating && <Chip label={`Từ ${filters.rating}★`} onRemove={() => applyFilters({ rating: '' })} />}
          {filters.inStock && <Chip label="Còn hàng" onRemove={() => applyFilters({ inStock: false })} />}
          {filters.onSale && <Chip label="Đang giảm giá" onRemove={() => applyFilters({ onSale: false })} />}
          <button onClick={resetFilters} className="text-xs font-semibold text-brand-600 hover:underline">
            Xoá hết
          </button>
        </div>
      )}

      <div className="flex gap-8">
        <FilterSidebar
          filters={filters}
          brands={brandList}
          priceRange={facets?.priceRange ?? { min: 0, max: 50000000 }}
          categories={categories ?? []}
          onChange={applyFilters}
          onReset={resetFilters}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileFilterOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" /> Bộ lọc
                {activeCount > 0 && <Badge tone="brand">{activeCount}</Badge>}
              </Button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <span className="text-ink-500">Sắp xếp:</span>
              <select
                value={sort}
                onChange={(e) => updateParams({ sort: e.target.value })}
                className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm font-medium focus:border-brand-500 focus:outline-none dark:border-ink-700 dark:bg-ink-900"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : data && data.data.length > 0 ? (
            <div className={cx('grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-3 xl:grid-cols-4', isPlaceholderData && 'opacity-60')}>
              {data.data.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<PackageSearch className="h-7 w-7" />}
              title="Không tìm thấy sản phẩm nào"
              description="Thử bỏ bớt bộ lọc hoặc tìm với từ khoá khác — ví dụ “tai nghe”, “laptop”, “dien thoai”."
              action={<Button onClick={resetFilters}>Xoá bộ lọc</Button>}
            />
          )}

          {data && data.meta.totalPages > 1 && (
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => updateParams({ page: p })} />
          )}
        </div>
      </div>

      <FilterMobileDrawer
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        brands={brandList}
        priceRange={facets?.priceRange ?? { min: 0, max: 50000000 }}
        categories={categories ?? []}
        onChange={applyFilters}
        onReset={resetFilters}
      />
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-ink-700 dark:bg-ink-900">
      {label}
      <button onClick={onRemove} aria-label={`Bỏ lọc ${label}`} className="text-ink-400 transition hover:text-rose-600">
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-10">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
