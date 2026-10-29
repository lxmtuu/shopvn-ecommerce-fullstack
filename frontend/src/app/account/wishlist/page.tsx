'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Package, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { api, apiData } from '@/lib/api';
import { formatDate, formatVND } from '@/lib/format';
import { useCartStore } from '@/store/cart.store';

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  brand: { name: string; slug: string } | null;
  price: string;
  salePrice: string | null;
  effectivePrice: string;
  inStock: boolean;
  stock: number;
  addedAt: string;
}

export default function WishlistPage() {
  const qc = useQueryClient();
  const add = useCartStore((s) => s.add);
  const pendingId = useCartStore((s) => s.pendingId);

  const { data: items, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiData<WishlistItem[]>('/wishlist'),
  });

  const remove = useMutation({
    mutationFn: (productId: string) => api(`/wishlist/${productId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Đã bỏ khỏi danh sách yêu thích');
    },
    onError: () => toast.error('Không xoá được sản phẩm'),
  });

  const addToCart = async (item: WishlistItem) => {
    const result = await add(item.productId, 1);
    if (result.ok) toast.success(result.message, { description: item.name });
    else toast.error(result.message);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-52" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const list = items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Heart className="h-6 w-6 text-rose-500" /> Sản phẩm yêu thích
        </h1>
        <p className="mt-1 text-sm text-ink-500">{list.length} sản phẩm đã lưu — giá có thể thay đổi, hãy theo dõi thường xuyên!</p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-7 w-7" />}
          title="Danh sách yêu thích trống"
          description="Nhấn vào biểu tượng trái tim ở bất kỳ sản phẩm nào để lưu lại và xem sau."
          action={
            <Link href="/products">
              <Button>Khám phá sản phẩm</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <article key={item.id} className="card-surface flex flex-wrap items-center gap-4 p-4">
              <Link href={`/products/${item.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-ink-400">
                    <Package className="h-6 w-6" />
                  </span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                {item.brand && <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{item.brand.name}</p>}
                <Link href={`/products/${item.slug}`} className="line-clamp-2 font-semibold hover:text-brand-600">
                  {item.name}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-brand-700 dark:text-brand-400">{formatVND(item.effectivePrice)}</span>
                  {item.salePrice && <span className="text-sm text-ink-400 line-through">{formatVND(item.price)}</span>}
                  <span className="text-xs text-ink-400">· đã lưu {formatDate(item.addedAt)}</span>
                </div>
                {!item.inStock && <p className="mt-1 text-xs font-semibold text-rose-600">Tạm hết hàng</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={!item.inStock} loading={pendingId === item.productId} onClick={() => addToCart(item)}>
                  <ShoppingCart className="h-4 w-4" /> Thêm vào giỏ
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600"
                  loading={remove.isPending && remove.variables === item.productId}
                  onClick={() => remove.mutate(item.productId)}
                >
                  <Trash2 className="h-4 w-4" /> Bỏ
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
