import type { Request, Response } from 'express';
import { created, ok } from '../../utils/response.js';
import { ordersService } from './orders.service.js';
import type { OrderQuery } from './orders.schema.js';
import { p } from "../../utils/params.js";

export const ordersController = {
  create: async (req: Request, res: Response) =>
    created(res, await ordersService.create(req.user!.id, req.body), 'Đặt hàng thành công!'),

  list: async (req: Request, res: Response) => {
    const result = await ordersService.list(req.user!.id, req.query as unknown as OrderQuery);
    return res.json({ success: true, message: 'Thành công', data: result.data, meta: result.meta });
  },

  detail: async (req: Request, res: Response) =>
    ok(res, await ordersService.detail(p(req.params.orderCode), req.user!.id, req.user!.role === 'ADMIN')),

  cancel: async (req: Request, res: Response) =>
    ok(res, await ordersService.cancel(p(req.params.orderCode), req.user!.id, req.body.reason, req.user!.role === 'ADMIN'), 'Đã huỷ đơn hàng'),

  reorder: async (req: Request, res: Response) =>
    ok(res, await ordersService.reorder(p(req.params.orderCode), req.user!.id), 'Đã thêm sản phẩm vào giỏ hàng'),

  requestReturn: async (req: Request, res: Response) =>
    ok(res, await ordersService.requestReturn(p(req.params.orderCode), req.user!.id, req.body.reason, req.body.images), 'Đã gửi yêu cầu trả hàng'),

  // ── Admin ────────────────────────────────────────────────────────────────
  adminList: async (req: Request, res: Response) => {
    const result = await ordersService.adminList(req.query as never);
    return res.json({ success: true, message: 'Thành công', data: result.data, meta: result.meta });
  },

  adminDetail: async (req: Request, res: Response) =>
    ok(res, await ordersService.detail(p(req.params.orderCode), req.user!.id, true)),

  updateStatus: async (req: Request, res: Response) =>
    ok(res, await ordersService.updateStatus(p(req.params.id), req.body.status, req.user!.id, req.body.note), 'Đã cập nhật trạng thái đơn hàng'),
};
