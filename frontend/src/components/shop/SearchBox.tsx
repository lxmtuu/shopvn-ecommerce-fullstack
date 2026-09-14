'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFull } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  price: string;
  salePrice: string | null;
}

export function SearchBox({ onNavigate }: { onNavigate?: () => void }) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(term, 300);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Gợi ý trực tiếp từ API (debounce 300ms) — có cache 60s ở phía server
  useEffect(() => {
    if (debounced.trim().length < 1) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFull<{ data: Suggestion[] }>(`/products/suggestions?q=${encodeURIComponent(debounced)}`)
      .then((res) => !cancelled && setItems(res.data))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/products?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Tìm sản phẩm… (gõ không dấu cũng ra)"
            aria-label="Tìm kiếm sản phẩm"
            className="h-11 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-10 text-sm transition-all placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:focus:bg-ink-900"
          />
          {term && (
            <button type="button" onClick={() => setTerm('')} aria-label="Xoá tìm kiếm" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {open && term.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xl dark:border-ink-700 dark:bg-ink-900"
          >
            {loading && <p className="px-4 py-3 text-sm text-ink-500">Đang tìm…</p>}
            {!loading && items.length === 0 && (
              <p className="px-4 py-3 text-sm text-ink-500">
                Không tìm thấy sản phẩm nào cho “{term}”.
              </p>
            )}
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.slug}`}
                onClick={() => {
                  setOpen(false);
                  setTerm('');
                  onNavigate?.();
                }}
                className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-ink-50 dark:hover:bg-ink-800"
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                  {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="44px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-sm font-bold text-brand-600">{formatVND(item.salePrice ?? item.price)}</p>
                </div>
              </Link>
            ))}
            <button
              onClick={submit as unknown as () => void}
              className="w-full border-t border-ink-200 px-4 py-3 text-left text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:border-ink-700 dark:hover:bg-ink-800"
            >
              Xem tất cả kết quả cho “{term}” →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
