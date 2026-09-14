import { PrismaClient } from '@prisma/client';
import { env, isDev } from '../config/env.js';

/**
 * Singleton Prisma Client — tránh tạo nhiều connection khi hot-reload.
 * Xem docs/03 mục "Prisma + serverless" khi deploy lên Neon/Supabase.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev ? [{ emit: 'event', level: 'query' }, 'warn', 'error'] : ['error'],
  });

if (isDev) {
  // Chỉ log query chậm (>200ms) để phát hiện N+1 mà không ngập log
  (prisma as unknown as { $on: (e: string, cb: (d: { duration: number; query: string }) => void) => void }).$on(
    'query',
    (e) => {
      if (e.duration > 200) {
        // eslint-disable-next-line no-console
        console.warn(`🐢 Query chậm ${e.duration}ms: ${e.query.slice(0, 160)}`);
      }
    },
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
env.DATABASE_URL;

if (isDev) globalForPrisma.prisma = prisma;
