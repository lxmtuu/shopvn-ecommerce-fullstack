'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/format';

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  changePercent?: number;
  hint?: string;
  tone?: 'brand' | 'emerald' | 'amber' | 'sky' | 'rose';
  index?: number;
}

const TONES: Record<NonNullable<Props['tone']>, string> = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950',
};

export function StatCard({ label, value, icon: Icon, changePercent, hint, tone = 'brand', index = 0 }: Props) {
  const trend = changePercent === undefined ? null : changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="card-surface p-5"
    >
      <div className="flex items-start justify-between">
        <span className={cx('grid h-11 w-11 place-items-center rounded-xl', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </span>

        {trend && (
          <span
            className={cx(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold',
              trend === 'up' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950',
              trend === 'down' && 'bg-rose-50 text-rose-600 dark:bg-rose-950',
              trend === 'flat' && 'bg-ink-100 text-ink-500 dark:bg-ink-800',
            )}
          >
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : trend === 'down' ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(changePercent!).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="mt-4 text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-sm text-ink-500">{label}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </motion.div>
  );
}
