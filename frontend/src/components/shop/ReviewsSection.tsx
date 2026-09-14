'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, ImagePlus, MessageSquare, Star, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, EmptyState, Modal, StarRating } from '@/components/ui';
import { api, apiFull, apiData, ApiError } from '@/lib/api';
import { cx, formatRelative } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import type { Paginated, Review } from '@/types';

interface Props {
  productId: string;
  rating: { average: number; count: number; distribution: { star: number; count: number }[] };
}

export function ReviewsSection({ productId, rating }: Props) {
  const [page, setPage] = useState(1);
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', productId, page],
    queryFn: () => apiFull<Paginated<Review>>(`/reviews?productId=${productId}&page=${page}&limit=5`),
  });

  const reviews = data?.data ?? [];
  const shown = filterStar ? reviews.filter((r) => r.rating === filterStar) : reviews;

  return (
    <section id="reviews" className="scroll-mt-24">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-extrabold">
        <MessageSquare className="h-5 w-5 text-brand-600" /> Đánh giá từ khách hàng
      </h2>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* ── Tổng quan điểm số ── */}
        <div className="card-surface h-fit p-5 text-center lg:sticky lg:top-24">
          <p className="text-5xl font-extrabold text-brand-600">{rating.average.toFixed(1)}</p>
          <div className="mt-2 flex justify-center">
            <StarRating value={rating.average} size={18} />
          </div>
          <p className="mt-2 text-sm text-ink-500">{rating.count} đánh giá đã duyệt</p>

          <div className="mt-5 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = rating.distribution.find((d) => d.star === star)?.count ?? 0;
              const percent = rating.count ? Math.round((count / rating.count) * 100) : 0;
              return (
                <button
                  key={star}
                  onClick={() => {
                    setFilterStar(filterStar === star ? null : star);
                    setPage(1);
                  }}
                  className={cx('flex w-full items-center gap-2 rounded-lg px-1 py-1 text-xs transition hover:bg-ink-100 dark:hover:bg-ink-800', filterStar === star && 'bg-brand-50 dark:bg-brand-950')}
                >
                  <span className="flex w-8 items-center gap-0.5 font-semibold">
                    {star}
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
                    <span className="block h-full rounded-full bg-amber-400 transition-all" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="w-8 text-right text-ink-500">{count}</span>
                </button>
              );
            })}
          </div>

          <Button
            className="mt-5 w-full"
            variant={user ? 'primary' : 'outline'}
            onClick={() => (user ? setWriteOpen(true) : toast.error('Vui lòng đăng nhập để đánh giá'))}
          >
            Viết đánh giá
          </Button>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-400">Chỉ khách đã mua và nhận hàng thành công mới đánh giá được</p>
        </div>

        {/* ── Danh sách ── */}
        <div>
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card-surface p-5">
                  <div className="shimmer h-4 w-32 rounded" />
                  <div className="shimmer mt-3 h-3 w-full rounded" />
                  <div className="shimmer mt-2 h-3 w-4/5 rounded" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && shown.length === 0 && (
            <EmptyState icon={<MessageSquare className="h-7 w-7" />} title="Chưa có đánh giá nào" description="Hãy là người đầu tiên chia sẻ cảm nhận về sản phẩm này." />
          )}

          <div className="space-y-3">
            {shown.map((r) => (
              <article key={r.id} className="card-surface p-5">
                <header className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                    {r.user.avatarUrl ? (
                      <Image src={r.user.avatarUrl} alt={r.user.fullName} width={40} height={40} className="h-full w-full object-cover" />
                    ) : (
                      r.user.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{r.user.fullName}</span>
                      {r.isVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          <BadgeCheck className="h-3 w-3" /> Đã mua hàng
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <StarRating value={r.rating} size={13} />
                      <span className="text-xs text-ink-400">{formatRelative(r.createdAt)}</span>
                    </div>
                  </div>
                </header>

                {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700 dark:text-ink-300">{r.content}</p>

                {r.images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.images.map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noreferrer" className="relative h-20 w-20 overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
                        <Image src={src} alt={`Ảnh đánh giá ${i + 1}`} fill sizes="80px" className="object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                {r.adminReply && (
                  <div className="mt-4 rounded-xl border-l-4 border-brand-500 bg-brand-50/70 p-3.5 dark:bg-brand-950/40">
                    <p className="text-xs font-bold text-brand-700 dark:text-brand-300">Phản hồi từ ShopVN</p>
                    <p className="mt-1 text-sm leading-relaxed">{r.adminReply}</p>
                  </div>
                )}

                <footer className="mt-3 flex items-center gap-3 text-xs text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5" /> {r.helpfulCount} hữu ích
                  </span>
                </footer>
              </article>
            ))}
          </div>

          {data && data.meta.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={!data.meta.hasPrev} onClick={() => setPage((p) => p - 1)}>
                Trước
              </Button>
              <span className="text-sm text-ink-500">
                Trang {data.meta.page}/{data.meta.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={!data.meta.hasNext} onClick={() => setPage((p) => p + 1)}>
                Sau
              </Button>
            </div>
          )}
        </div>
      </div>

      <WriteReviewModal open={writeOpen} onClose={() => setWriteOpen(false)} productId={productId} />
    </section>
  );
}

/* ──────────────────────── Modal viết đánh giá ──────────────────────── */
function WriteReviewModal({ open, onClose, productId }: { open: boolean; onClose: () => void; productId: string }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useMutation({
    mutationFn: () => apiData('/reviews', { method: 'POST', body: { productId, rating, title: title || undefined, content, images } }),
    onSuccess: () => {
      toast.success('Cảm ơn bạn! Đánh giá đang chờ kiểm duyệt.');
      qc.invalidateQueries({ queryKey: ['reviews', productId] });
      onClose();
      setTitle('');
      setContent('');
      setImages([]);
      setRating(5);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries((err.errors ?? []).map((e) => [e.field, e.message])));
        toast.error(err.message);
      } else toast.error('Không gửi được đánh giá');
    },
  });

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    try {
      // Upload 1 ảnh / request để có thể hiển thị tiến trình rõ ràng
      for (const file of Array.from(files).slice(0, 5 - images.length)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api<{ data: { url: string } }>('/uploads/image', { method: 'POST', body: fd });
        setImages((prev) => [...prev, res.data.url]);
      }
      toast.success('Đã tải ảnh lên');
    } catch {
      toast.error('Tải ảnh thất bại — chỉ nhận JPG/PNG/WEBP dưới 5MB');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Viết đánh giá của bạn">
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold">Bạn cho sản phẩm mấy sao?</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} sao`} className="p-1 transition hover:scale-110">
                <Star className={cx('h-8 w-8', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300 dark:text-ink-600')} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="rv-title" className="mb-1.5 block text-sm font-semibold">
            Tiêu đề <span className="font-normal text-ink-400">(không bắt buộc)</span>
          </label>
          <input
            id="rv-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Ví dụ: Âm thanh rất tốt, đóng gói cẩn thận"
            className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm dark:border-ink-700 dark:bg-ink-900"
          />
        </div>

        <div>
          <label htmlFor="rv-content" className="mb-1.5 block text-sm font-semibold">
            Nội dung đánh giá
          </label>
          <textarea
            id="rv-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            minLength={10}
            maxLength={2000}
            placeholder="Chia sẻ trải nghiệm thực tế của bạn về sản phẩm…"
            className="w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm dark:border-ink-700 dark:bg-ink-900"
          />
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-rose-600">{errors.content}</span>
            <span className="text-ink-400">{content.length}/2000</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">
            Thêm ảnh thực tế <span className="font-normal text-ink-400">(tối đa 5)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
                <Image src={src} alt={`Ảnh ${i + 1}`} fill sizes="80px" className="object-cover" />
                <button
                  onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                  aria-label="Xoá ảnh"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink-300 text-ink-400 transition hover:border-brand-500 hover:text-brand-600 dark:border-ink-600">
                <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} disabled={uploading} />
                <ImagePlus className="h-6 w-6" />
              </label>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button loading={submit.isPending || uploading} onClick={() => submit.mutate()} disabled={content.trim().length < 10}>
            Gửi đánh giá
          </Button>
        </div>
      </div>
    </Modal>
  );
}
