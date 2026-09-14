'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Star, X } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useEffect } from 'react';
import { cx } from '@/lib/format';

/* ────────────────────────────── Button ────────────────────────────── */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'light' | 'glass';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-lg hover:shadow-brand-600/20',
  secondary: 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100',
  outline:
    'border border-ink-200 bg-white text-ink-800 hover:border-brand-500 hover:text-brand-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  /**
   * Hai biến thể dùng TRÊN NỀN TỐI (hero, banner) — tránh phải truyền className đè
   * `bg-*`/`text-*` của variant (dễ bị xung đột thứ tự CSS ⇒ chữ trắng trên nền trắng,
   * đúng lỗi "nút trắng trơn không có chữ" ở trang chủ trước đây).
   */
  light: 'bg-white text-brand-700 hover:bg-brand-50 shadow-lg shadow-black/10',
  glass: 'border border-white/40 bg-white/10 text-white backdrop-blur-md hover:border-white hover:bg-white/20',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
  icon: 'h-10 w-10',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200',
        'active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/* ────────────────────────────── Input ────────────────────────────── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
          {label}
          {props.required && <span className="ml-0.5 text-brand-600">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cx(
            'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-ink-900 transition-all',
            'placeholder:text-ink-400 focus:outline-none focus:ring-4',
            'dark:bg-ink-900 dark:text-ink-100',
            Boolean(icon) && 'pl-10',
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
              : 'border-ink-200 focus:border-brand-500 focus:ring-brand-500/10 dark:border-ink-700',
            className,
          )}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
});

/* ────────────────────────────── Badge ────────────────────────────── */
export function Badge({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  };
  // Nếu truyền className (ví dụ màu theo trạng thái đơn) thì KHÔNG trộn thêm màu mặc định
  // — tránh việc Tailwind không biết class nào thắng.
  const toneClass = tone ? tones[tone] : className ? '' : tones.neutral;
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', toneClass, className)}>
      {children}
    </span>
  );
}

/* ────────────────────────────── Rating ────────────────────────────── */
export function StarRating({ value, size = 14, showValue = false, count }: { value: number; size?: number; showValue?: boolean; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Đánh giá ${value} trên 5`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            width={size}
            height={size}
            className={cx(star <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-ink-200 text-ink-200 dark:fill-ink-700 dark:text-ink-700')}
          />
        ))}
      </span>
      {showValue && <span className="text-xs font-semibold text-ink-600 dark:text-ink-300">{value.toFixed(1)}</span>}
      {count !== undefined && <span className="text-xs text-ink-400">({count})</span>}
    </span>
  );
}

/* ────────────────────────────── Skeleton ────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('shimmer rounded-xl bg-ink-200/60 dark:bg-ink-800/60', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card-surface overflow-hidden p-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <Skeleton className="mt-3 h-5 w-1/3" />
    </div>
  );
}

/* ────────────────────────────── Empty state ────────────────────────────── */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 px-6 py-16 text-center dark:border-ink-700">
      {icon && <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800">{icon}</div>}
      <h3 className="text-lg font-bold text-ink-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-ink-500 dark:text-ink-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ────────────────────────────── Modal / Drawer ────────────────────────────── */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; maxWidth?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cx('relative w-full rounded-2xl bg-white p-6 shadow-2xl dark:bg-ink-900', maxWidth)}
          >
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{title}</h2>
                <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({ open, onClose, title, children, side = 'right' }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; side?: 'right' | 'bottom' }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isBottom = side === 'bottom';
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={isBottom ? { y: '100%' } : { x: '100%' }}
            animate={isBottom ? { y: 0 } : { x: 0 }}
            exit={isBottom ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cx(
              'absolute flex flex-col bg-white shadow-2xl dark:bg-ink-900',
              isBottom ? 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl' : 'inset-y-0 right-0 w-full max-w-md',
            )}
          >
            <header className="flex items-center justify-between border-b border-ink-200 px-5 py-4 dark:border-ink-800">
              <h2 className="text-base font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────── Phân trang ────────────────────────────── */
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Phân trang">
      <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        Trước
      </Button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-ink-400">…</span>}
          <button
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cx(
              'h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition',
              p === page ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
            )}
          >
            {p}
          </button>
        </span>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Sau
      </Button>
    </nav>
  );
}
