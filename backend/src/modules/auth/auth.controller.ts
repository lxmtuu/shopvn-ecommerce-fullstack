import type { Request, Response } from 'express';
import { randomId } from '../../lib/crypto.js';
import { clearAuthCookies, setAuthCookies } from '../../lib/cookies.js';
import { env } from '../../config/env.js';
import { COOKIES } from '../../config/constants.js';
import { AppError } from '../../utils/AppError.js';
import { created, ok } from '../../utils/response.js';
import { authService } from './auth.service.js';
import { p } from "../../utils/params.js";

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body, req);
    // Ở môi trường dev, trả luôn token để test nhanh mà không cần mở mail
    return created(
      res,
      {
        user: result.user,
        ...(env.NODE_ENV !== 'production' ? { devVerificationToken: result.verificationToken } : {}),
      },
      'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
    );
  },

  async login(req: Request, res: Response) {
    const { accessToken, refreshToken, user } = await authService.login(req.body, req);
    setAuthCookies(res, { accessToken, refreshToken });
    return ok(res, { user }, 'Đăng nhập thành công');
  },

  async refresh(req: Request, res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[COOKIES.REFRESH];
    if (!token) throw AppError.unauthorized('Không tìm thấy phiên đăng nhập');
    const { accessToken, refreshToken } = await authService.refresh(token, req);
    setAuthCookies(res, { accessToken, refreshToken });
    return ok(res, { refreshed: true }, 'Làm mới phiên đăng nhập thành công');
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.user?.sessionId);
    clearAuthCookies(res);
    return ok(res, { loggedOut: true }, 'Đã đăng xuất');
  },

  async logoutAll(req: Request, res: Response) {
    const result = await authService.logoutAll(req.user!.id);
    clearAuthCookies(res);
    return ok(res, result, `Đã đăng xuất khỏi ${result.revokedCount} thiết bị`);
  },

  async me(req: Request, res: Response) {
    return ok(res, await authService.me(req.user!.id), 'Lấy thông tin thành công');
  },

  async updateProfile(req: Request, res: Response) {
    return ok(res, await authService.updateProfile(req.user!.id, req.body), 'Cập nhật hồ sơ thành công');
  },

  async verifyEmail(req: Request, res: Response) {
    const token = String(req.query.token ?? '');
    if (!token) throw AppError.badRequest('Thiếu token xác thực');
    return ok(res, await authService.verifyEmail(token), 'Xác thực email thành công! Bạn có thể đăng nhập.');
  },

  async resendVerification(req: Request, res: Response) {
    return ok(res, await authService.resendVerification(req.user!.id), 'Đã gửi lại email xác thực');
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    // Thông báo trung tính — không tiết lộ email có tồn tại hay không
    return ok(
      res,
      { sent: true },
      'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả Spam).',
    );
  },

  async resetPassword(req: Request, res: Response) {
    const result = await authService.resetPassword(req.body.token, req.body.password, req);
    clearAuthCookies(res); // buộc đăng nhập lại bằng mật khẩu mới
    return ok(res, result, 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
  },

  async changePassword(req: Request, res: Response) {
    const result = await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
      req,
    );
    return ok(res, result, 'Đổi mật khẩu thành công. Các thiết bị khác đã được đăng xuất.');
  },

  async sessions(req: Request, res: Response) {
    return ok(res, await authService.listSessions(req.user!.id, req.user!.sessionId));
  },

  async revokeSession(req: Request, res: Response) {
    return ok(res, await authService.revokeSession(req.user!.id, p(req.params.id)), 'Đã thu hồi phiên đăng nhập');
  },

  // ── Google OAuth ──────────────────────────────────────────────────────────
  googleStart(_req: Request, res: Response) {
    const state = randomId(16);
    res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 5 * 60 * 1000, path: '/' });
    return res.redirect(authService.googleAuthUrl(state));
  },

  async googleCallback(req: Request, res: Response) {
    const { code, state } = req.query as { code?: string; state?: string };
    const savedState = (req.cookies as Record<string, string> | undefined)?.oauth_state;

    // Chống CSRF cho luồng OAuth: state phải khớp cookie đã set
    if (!code) throw AppError.badRequest('Google không trả về mã xác thực');
    if (!state || !savedState || state !== savedState) throw AppError.forbidden('State OAuth không hợp lệ (có thể bị tấn công CSRF)');

    const { accessToken, refreshToken } = await authService.googleCallback(code, req);
    setAuthCookies(res, { accessToken, refreshToken });
    res.clearCookie('oauth_state', { path: '/' });
    return res.redirect(`${env.CLIENT_URL}/auth/callback?social=google`);
  },
};
