'use client';

import type { ReactNode } from 'react';
import { cx } from '@/lib/format';
import { Skeleton } from '@/components/ui';

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('card-surface overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cx('whitespace-nowrap border-b border-ink-100 bg-ink-50/70 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500 dark:border-ink-800 dark:bg-ink-900/50', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx('border-b border-ink-100 px-4 py-3 align-middle dark:border-ink-800', className)}>{children}</td>;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card-surface p-4">
      <Skeleton className="h-8 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="mt-2 h-12 w-full rounded-lg" />
      ))}
      <span className="sr-only">{cols} cột</span>
    </div>
  );
}
