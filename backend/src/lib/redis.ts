import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Redis là TÙY CHỌN. Không cấu hình → fallback bộ nhớ trong (đủ cho dev).
 * Ở production nhiều instance thì BẮT BUỘC có Redis để rate-limit & cache dùng chung.
 */
let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (client) return client;
  try {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    });
    client.on('error', (e) => logger.warn({ err: e.message }, 'Redis không khả dụng — dùng fallback bộ nhớ'));
    void client.connect().catch(() => {
      client = null;
    });
    return client;
  } catch {
    return null;
  }
}

interface MemEntry {
  value: string;
  expiresAt: number;
}
const memory = new Map<string, MemEntry>();

export const cache = {
  async get(key: string): Promise<string | null> {
    const r = getRedis();
    if (r) {
      try {
        return await r.get(key);
      } catch {
        /* fallthrough */
      }
    }
    const entry = memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      memory.delete(key);
      return null;
    }
    return entry.value;
  },
  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    const r = getRedis();
    if (r) {
      try {
        await r.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {
        /* fallthrough */
      }
    }
    memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },
  async del(pattern: string): Promise<void> {
    const r = getRedis();
    if (r) {
      try {
        const keys = await r.keys(pattern);
        if (keys.length) await r.del(...keys);
      } catch {
        /* ignore */
      }
    }
    for (const key of memory.keys()) {
      if (key.startsWith(pattern.replace('*', ''))) memory.delete(key);
    }
  },
};
