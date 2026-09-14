import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { orderLimiter } from '../../middlewares/rateLimit.js';
import { validateBody, validateQuery } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ordersController } from './orders.controller.js';
import { cancelOrderSchema, createOrderSchema, orderQuerySchema, returnOrderSchema, updateOrderStatusSchema } from './orders.schema.js';

const router = Router();
router.use(requireAuth);

router.post('/', orderLimiter, validateBody(createOrderSchema), asyncHandler(ordersController.create));
router.get('/', validateQuery(orderQuerySchema), asyncHandler(ordersController.list));
router.get('/:orderCode', asyncHandler(ordersController.detail));
router.post('/:orderCode/cancel', validateBody(cancelOrderSchema), asyncHandler(ordersController.cancel));
router.post('/:orderCode/reorder', asyncHandler(ordersController.reorder));
router.post('/:orderCode/return', validateBody(returnOrderSchema), asyncHandler(ordersController.requestReturn));

export const adminOrderRoutes = Router();
adminOrderRoutes.get('/', validateQuery(orderQuerySchema), asyncHandler(ordersController.adminList));
adminOrderRoutes.get('/:orderCode', asyncHandler(ordersController.adminDetail));
adminOrderRoutes.patch('/:id/status', validateBody(updateOrderStatusSchema), asyncHandler(ordersController.updateStatus));

export default router;
