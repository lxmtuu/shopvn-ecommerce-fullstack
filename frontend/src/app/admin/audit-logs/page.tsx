'use client';

import { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ScrollText } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { TableWrap, Td, Th } from '@/components/admin/AdminTable';
import { apiData } from '@/lib/api';
import { formatDate } from '@/lib/format';

interface AuditLog {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  user: { fullName: string; email: string } | null;
  after?: unknown;
}

export default function AdminAuditLogsPage() {
  const [limit, setLimit] = useState(50);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: logs, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'audit-logs', limit],
    queryFn: () => apiData<AuditLog[]>(`/admin/audit-logs?limit=${limit}`),
  });

  useEffect(() => {
    const t = setInterval(() => refetch(), 60000);
    return () => clearInterval(t);
  }, [refetch]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Nhật ký hệ thống</h1>
          <p className="mt-1 text-sm text-ink-500">Ghi lại các hành động quản trị quan trọng (tự làm mới mỗi 60 giây)</p>
        </div>
        <div className="flex gap-2">
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900">
            {[50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n} bản ghi gần nhất
              </option>
            ))}
          </select>
          <Button variant="outline" loading={isFetching} onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Làm mới
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Thời gian</Th>
              <Th>Người thực hiện</Th>
              <Th>Hành động</Th>
              <Th>Đối tượng</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <Fragment key={log.id}>
                <tr className="cursor-pointer transition hover:bg-ink-50 dark:hover:bg-ink-900/40" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                  <Td className="whitespace-nowrap text-sm">{formatDate(log.createdAt, true)}</Td>
                  <Td>
                    <span className="block text-sm">{log.user?.fullName ?? 'Hệ thống'}</span>
                    <span className="text-xs text-ink-400">{log.user?.email ?? '—'}</span>
                  </Td>
                  <Td>
                    <code className="rounded bg-ink-100 px-2 py-0.5 text-xs dark:bg-ink-800">{log.action}</code>
                  </Td>
                  <Td className="text-sm text-ink-500">
                    {log.entity ?? '—'}
                    {log.entityId && <span className="block text-xs text-ink-400">{log.entityId.slice(0, 12)}…</span>}
                  </Td>
                  <Td className="text-xs text-ink-500">{log.ip ?? '—'}</Td>
                </tr>
                {expanded === log.id && log.after != null && (
                  <tr>
                    <Td className="bg-ink-50 dark:bg-ink-900/50">
                      <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(log.after, null, 2)}</pre>
                    </Td>
                  </tr>
                )}
              </Fragment>
            ))}
            {(logs ?? []).length === 0 && (
              <tr>
                <Td className="py-10 text-center text-ink-500">
                  <ScrollText className="mx-auto mb-2 h-7 w-7 text-ink-300" />
                  Chưa có bản ghi nào
                </Td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
