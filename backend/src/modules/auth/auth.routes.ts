import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { validateBody, validateQuery } from '../../middlewares/validate.js';
import { forgotPasswordLimiter, loginLimiter, registerLimiter } from '../../middlewares/rateLimit.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authController } from './auth.controller.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './auth.schema.js';
import { z } from 'zod';

const router = Router();

// ── Công khai ────────────────────────────────────────────────────────────────
router.post('/register', registerLimiter, validateBody(registerSchema), asyncHandler(authController.register));
router.post('/login', loginLimiter, validateBody(loginSchema), asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.get('/verify-email', validateQuery(z.object({ token: z.string().min(10) })), asyncHandler(authController.verifyEmail));
router.post('/forgot-password', forgotPasswordLimiter, validateBody(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(authController.resetPassword));

// ── OAuth Google ─────────────────────────────────────────────────────────────
router.get('/google', authController.googleStart);
router.get('/google/callback', asyncHandler(authController.googleCallback));

// ── Cần đăng nhập ────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, asyncHandler(authController.logout));
router.post('/logout-all', requireAuth, asyncHandler(authController.logoutAll));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.patch('/me', requireAuth, validateBody(updateProfileSchema), asyncHandler(authController.updateProfile));
router.post('/resend-verification', requireAuth, asyncHandler(authController.resendVerification));
router.patch('/change-password', requireAuth, validateBody(changePasswordSchema), asyncHandler(authController.changePassword));
router.get('/sessions', requireAuth, asyncHandler(authController.sessions));
router.delete('/sessions/:id', requireAuth, asyncHandler(authController.revokeSession));

export default router;
