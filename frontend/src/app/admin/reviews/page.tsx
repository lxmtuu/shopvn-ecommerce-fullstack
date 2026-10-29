'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageSquare, Reply, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Modal, Pagination, StarRating } from '@/components/ui';
import { TableSkeleton } from '@/components/admin/AdminTable';
import { api, apiFull } from '@/lib/api';
import type { Paginated } from '@/types';
import { cx, formatDate } from '@/lib/format';

interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  images: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isVerified: boolean;
  adminReply: string | null;
  helpfulCount: number;
  createdAt: string;
  user: { fullName: string; email: string };
  product: { name: string; slug: string; images: { thumbUrl: string | null }[] };
}

const TABS = [
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã ẩn' },
  { value: '', label: 'Tất cả' },
];

function AdminReviewsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();

  const status = params.get('status') ?? 'PENDING';
  const page = Number(params.get('page') ?? 1);

  const [replyTarget, setReplyTarget] = useState<AdminReview | null>(null);
  const [reply, setReply] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reviews', status, page],
    queryFn: () => apiFull<Paginated<AdminReview>>(`/admin/reviews?${status ? `status=${status}&` : ''}page=${page}&limit=10`),
    placeholderData: keepPreviousData,
  });

  const moderate = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api(`/admin/reviews/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      toast.success('Đã cập nhật đánh giá');
      setReplyTarget(null);
      setReply('');
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: () => toast.error('Không cập nhật được đánh giá'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/reviews/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá đánh giá');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Kiểm duyệt đánh giá</h1>
        <p className="mt-1 text-sm text-ink-500">Chỉ đánh giá ở trạng thái “Đã duyệt” mới hiển thị trên trang sản phẩm</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => router.push(`/admin/reviews?status=${t.value}`)}
            className={cx('shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition', status === t.value ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-ink-300" />
          <p className="mt-3 font-semibold">Không có đánh giá nào</p>
          <p className="mt-1 text-sm text-ink-500">Mọi thứ đã được xử lý xong</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <article key={r.id} className="card-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
                    {r.product.images[0]?.thumbUrl && <Image src={r.product.images[0].thumbUrl} alt={r.product.name} fill sizes="56px" className="object-cover" />}
                  </div>
                  <div>
                    <Link href={`/products/${r.product.slug}`} target="_blank" className="line-clamp-1 font-semibold hover:text-brand-600">
                      {r.product.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {r.user.fullName} · {r.user.email} · {formatDate(r.createdAt, true)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StarRating value={r.rating} size={13} />
                      {r.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <ShieldCheck className="h-3 w-3" /> Đã mua
                        </span>
                      )}
                      <Badge tone={r.status === 'APPROVED' ? 'success' : r.status === 'PENDING' ? 'warning' : 'neutral'}>
                        {r.status === 'APPROVED' ? 'Đã duyệt' : r.status === 'PENDING' ? 'Chờ duyệt' : 'Đã ẩn'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {r.status !== 'APPROVED' && (
                    <Button size="sm" onClick={() => moderate.mutate({ id: r.id, body: { status: 'APPROVED' } })} loading={moderate.isPending}>
                      <Check className="h-4 w-4" /> Duyệt
                    </Button>
                  )}
                  {r.status !== 'REJECTED' && (
                    <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: r.id, body: { status: 'REJECTED' } })} loading={moderate.isPending}>
                      <X className="h-4 w-4" /> Ẩn
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyTarget(r);
                      setReply(r.adminReply ?? '');
                    }}
                  >
                    <Reply className="h-4 w-4" /> Phản hồi
                  </Button>
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setDeleteTarget(r)} aria-label="Xoá đánh giá">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700 dark:text-ink-300">{r.content}</p>

              {r.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.images.map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noreferrer" className="relative h-16 w-16 overflow-hidden rounded-lg border border-ink-200 dark:border-ink-700">
                      <Image src={src} alt={`Ảnh ${i + 1}`} fill sizes="64px" className="object-cover" />
                    </a>
                  ))}
                </div>
              )}

              {r.adminReply && (
                <div className="mt-3 rounded-xl border-l-4 border-brand-500 bg-brand-50/70 p-3 text-sm dark:bg-brand-950/40">
                  <p className="text-xs font-bold text-brand-700 dark:text-brand-300">ShopVN đã phản hồi</p>
                  <p className="mt-1">{r.adminReply}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {data && data.meta.totalPages > 1 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => router.push(`/admin/reviews?status=${status}&page=${p}`)} />}

      {/* Modal phản hồi */}
      <Modal open={Boolean(replyTarget)} onClose={() => setReplyTarget(null)} title="Phản hồi đánh giá của khách">
        <p className="text-sm text-ink-500">Phản hồi sẽ hiển thị công khai bên dưới đánh giá của khách hàng.</p>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Cảm ơn bạn đã tin tưởng ShopVN…"
          className="mt-4 w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm dark:border-ink-700 dark:bg-ink-900"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setReplyTarget(null)}>
            Huỷ
          </Button>
          <Button
            loading={moderate.isPending}
            onClick={() => replyTarget && moderate.mutate({ id: replyTarget.id, body: { adminReply: reply, status: 'APPROVED' } })}
            disabled={reply.trim().length < 3}
          >
            Gửi phản hồi
          </Button>
        </div>
      </Modal>

      {/* Modal xoá */}
      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Xoá đánh giá">
        <p className="text-sm text-ink-600 dark:text-ink-400">Đánh giá sẽ bị ẩn vĩnh viễn khỏi trang sản phẩm. Bạn chắc chắn chứ?</p>
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

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <AdminReviewsContent />
    </Suspense>
  );
}
