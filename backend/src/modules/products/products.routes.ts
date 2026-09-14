import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { optionalAuth, requireAuth, requireRole } from '../../middlewares/auth.js';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.js';
import { productsController } from './products.controller.js';
import { bulkActionSchema, createProductSchema, productQuerySchema, updateProductSchema } from './products.schema.js';

const router = Router();

// ── Công khai (optionalAuth để biết user đã wishlist chưa) ────────────────────
router.get('/', validateQuery(productQuerySchema), asyncHandler(productsController.list));
router.get('/suggestions', asyncHandler(productsController.suggestions));
router.get('/featured', asyncHandler(productsController.featured));
router.get('/best-sellers', asyncHandler(productsController.bestSellers));
router.get('/newest', asyncHandler(productsController.newest));
router.get('/recently-viewed', requireAuth, asyncHandler(productsController.recentlyViewed));
router.get('/:slug', optionalAuth, asyncHandler(productsController.detail));
router.get('/:slug/related', asyncHandler(productsController.related));

// ── Admin ────────────────────────────────────────────────────────────────────
export const adminProductRoutes = Router();
adminProductRoutes.get('/', validateQuery(productQuerySchema.extend({ status: z.enum(['active', 'inactive', 'deleted']).optional() })), asyncHandler(productsController.adminList));
adminProductRoutes.post('/', validateBody(createProductSchema), asyncHandler(productsController.create));
adminProductRoutes.patch('/bulk', validateBody(bulkActionSchema), asyncHandler(productsController.bulk));
adminProductRoutes.patch('/:id/stock', validateBody(z.object({ change: z.number().int(), reason: z.enum(['RESTOCK', 'ADJUSTMENT']), note: z.string().optional() })), asyncHandler(productsController.adjustStock));
adminProductRoutes.patch('/:id', validateParams(z.object({ id: z.string() })), validateBody(updateProductSchema), asyncHandler(productsController.update));
adminProductRoutes.delete('/:id', asyncHandler(productsController.remove));

export default router;
