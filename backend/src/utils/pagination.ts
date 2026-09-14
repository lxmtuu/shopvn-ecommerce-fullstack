import { PAGINATION } from '../config/constants.js';

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(query: Record<string, unknown>): PageParams {
  const rawPage = Number(query.page ?? PAGINATION.DEFAULT_PAGE);
  const rawLimit = Number(query.limit ?? PAGINATION.DEFAULT_LIMIT);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : PAGINATION.DEFAULT_PAGE;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), PAGINATION.MAX_LIMIT) : PAGINATION.DEFAULT_LIMIT;
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(total: number, { page, limit }: Pick<PageParams, 'page' | 'limit'>) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
