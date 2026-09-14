import type { Request, Response } from 'express';
import { ok } from '../../utils/response.js';
import { productsService } from './products.service.js';
import type { ProductQuery } from './products.schema.js';
import { p } from "../../utils/params.js";

export const productsController = {
  list: async (req: Request, res: Response) => {
    const result = await productsService.list(req.query as unknown as ProductQuery);
    return res.json({
      success: true,
      message: 'Lấy danh sách sản phẩm thành công',
      data: result.data,
      meta: result.meta,
      facets: result.facets,
    });
  },

  suggestions: async (req: Request, res: Response) => {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 1) return ok(res, []);
    return ok(res, await productsService.suggestions(q));
  },

  detail: async (req: Request, res: Response) => {
    const product = await productsService.detail(p(req.params.slug), {
      userId: req.user?.id,
      ip: req.ip,
    });
    return ok(res, product);
  },

  related: async (req: Request, res: Response) => {
    return ok(res, await productsService.related(p(req.params.slug)));
  },

  featured: async (req: Request, res: Response) => {
    return ok(res, await productsService.featured(Number(req.query.limit ?? 8)));
  },

  bestSellers: async (req: Request, res: Response) => {
    return ok(res, await productsService.bestSellers(Number(req.query.limit ?? 8)));
  },

  newest: async (req: Request, res: Response) => {
    return ok(res, await productsService.newest(Number(req.query.limit ?? 8)));
  },

  recentlyViewed: async (req: Request, res: Response) => {
    return ok(res, await productsService.recentlyViewed(req.user!.id));
  },

  // ── Admin ────────────────────────────────────────────────────────────────
  adminList: async (req: Request, res: Response) => {
    const result = await productsService.adminList(req.query as never);
    return res.json({ success: true, message: 'Thành công', data: result.data, meta: result.meta });
  },

  create: async (req: Request, res: Response) => {
    const product = await productsService.create(req.body, req.user?.id);
    return res.status(201).json({ success: true, message: 'Tạo sản phẩm thành công', data: product });
  },

  update: async (req: Request, res: Response) => {
    return ok(res, await productsService.update(p(req.params.id), req.body, req.user?.id), 'Cập nhật sản phẩm thành công');
  },

  remove: async (req: Request, res: Response) => {
    return ok(res, await productsService.softDelete(p(req.params.id), req.user?.id), 'Đã xoá sản phẩm');
  },

  bulk: async (req: Request, res: Response) => {
    const { ids, action } = req.body as { ids: string[]; action: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature' };
    return ok(res, await productsService.bulkAction(ids, action, req.user?.id), 'Thao tác hàng loạt thành công');
  },

  adjustStock: async (req: Request, res: Response) => {
    const { change, reason, note } = req.body as { change: number; reason: 'RESTOCK' | 'ADJUSTMENT'; note?: string };
    return ok(res, await productsService.adjustStock(p(req.params.id), change, reason, req.user?.id, note), 'Cập nhật tồn kho thành công');
  },
};
