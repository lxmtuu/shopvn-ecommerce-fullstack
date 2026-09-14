import type { Request } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { generateToken, hashToken, randomId } from '../../lib/crypto.js';
import { signAccessToken, signRefreshToken, ttlToMs, verifyRefreshToken } from '../../lib/jwt.js';
import { mailer } from '../../lib/mailer.js';
import { logger, securityLog } from '../../lib/logger.js';
import { AppError } from '../../utils/AppError.js';
import type { LoginInput, RegisterInput, UpdateProfileInput } from './auth.schema.js';

const CLIENT = env.CLIENT_URL;

/** Lấy IP + user-agent để lưu vào Session (hiển thị "thiết bị đang đăng nhập") và log bảo mật */
function deviceInfo(req: Request) {
  return {
    userAgent: String(req.headers['user-agent'] ?? 'unknown').slice(0, 200),
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || undefined,
  };
}

/**
 * Cấp cặp token mới + tạo Session.
 * LƯU HASH của refresh token (SHA-256), không lưu bản thô → DB rò rỉ cũng không dùng được token.
 */
async function issueTokens(params: {
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  family?: string;
  replacedSessionId?: string;
  req: Request;
}) {
  const { userId, email, role, req } = params;
  const sessionId = randomId(12);
  const family = params.family ?? randomId(12);

  const accessToken = signAccessToken({ sub: userId, email, role, sid: sessionId }, sessionId);
  const refreshToken = signRefreshToken(userId, sessionId, family);
  const { userAgent, ip } = deviceInfo(req);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      family,
      tokenHash: hashToken(refreshToken),
      userAgent,
      ip,
      expiresAt: new Date(Date.now() + ttlToMs(env.REFRESH_TOKEN_TTL)),
    },
  });

  if (params.replacedSessionId) {
    await prisma.session.update({
      where: { id: params.replacedSessionId },
      data: { revokedAt: new Date(), revokedReason: 'rotated', replacedBySessionId: sessionId },
    });
  }

  return { accessToken, refreshToken, sessionId };
}

export const authService = {
  /** Đăng ký: tạo user + gửi mail xác thực */
  async register(input: RegisterInput, req: Request) {
    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) {
      throw AppError.conflict(
        'Email này đã được đăng ký. Bạn có thể đăng nhập hoặc đặt lại mật khẩu.',
        'EMAIL_EXISTS',
      );
    }

    const user = await prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        phone: input.phone || null,
        passwordHash: await hashPassword(input.password),
        role: 'CUSTOMER',
      },
      select: { id: true, email: true, fullName: true, role: true, emailVerified: true },
    });

    const token = generateToken();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await mailer.verifyEmail(user.email, user.fullName, `${CLIENT}/verify-email?token=${token}`);
    void mailer.welcome(user.email, user.fullName, `${CLIENT}/products`);

    logger.info({ userId: user.id, ...deviceInfo(req) }, '👤 Đăng ký tài khoản mới');
    return { user, verificationToken: token };
  },

  /** Đăng nhập */
  async login(input: LoginInput, req: Request) {
    const { userAgent, ip } = deviceInfo(req);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Cùng một thông báo cho mọi trường hợp sai → chống email enumeration
    const invalid = () => new AppError(401, 'Email hoặc mật khẩu không đúng', 'INVALID_CREDENTIALS');

    if (!user || !user.passwordHash) {
      securityLog('login_failed', { email: input.email, reason: 'user_not_found', ip });
      throw invalid();
    }
    if (user.status === 'BLOCKED') {
      throw new AppError(403, 'Tài khoản của bạn đã bị khoá. Liên hệ hotline 1900 1234.', 'ACCOUNT_BLOCKED');
    }
    if (user.status === 'DELETED') throw invalid();

    const okPwd = await verifyPassword(input.password, user.passwordHash);
    if (!okPwd) {
      securityLog('login_failed', { userId: user.id, email: user.email, reason: 'wrong_password', ip, userAgent });
      throw invalid();
    }

    const tokens = await issueTokens({ userId: user.id, email: user.email, role: user.role, req });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
        avatarUrl: user.avatarUrl,
      },
    };
  },

  /**
   * Xoay refresh token (ROTATION) + phát hiện tái sử dụng.
   * Refresh token đã bị revoke mà vẫn được dùng ⇒ coi như bị đánh cắp:
   * revoke TOÀN BỘ session cùng family + gửi email cảnh báo.
   */
  async refresh(rawRefreshToken: string, req: Request) {
    const payload = verifyRefreshToken(rawRefreshToken);

    const session = await prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (!session || session.tokenHash !== hashToken(rawRefreshToken)) {
      throw AppError.unauthorized('Phiên đăng nhập không hợp lệ');
    }

    if (session.revokedAt) {
      // 🚨 DẤU HIỆU TOKEN BỊ ĐÁNH CẮP
      securityLog(
        'refresh_token_reuse_detected',
        { userId: session.userId, family: session.family, ...deviceInfo(req) },
        'error',
      );

      await prisma.session.updateMany({
        where: { family: session.family, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'token_reuse_detected' },
      });

      const { ip, userAgent } = deviceInfo(req);
      void mailer.securityAlert(session.user.email, session.user.fullName, {
        ip,
        userAgent,
        time: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      });

      throw AppError.unauthorized(
        'Phát hiện hoạt động bất thường. Vì an toàn, tất cả phiên đăng nhập đã được kết thúc. Vui lòng đăng nhập lại.',
      );
    }

    if (session.expiresAt < new Date()) {
      throw AppError.unauthorized('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    }
    if (session.user.status !== 'ACTIVE') throw AppError.forbidden('Tài khoản không khả dụng');

    return issueTokens({
      userId: session.userId,
      email: session.user.email,
      role: session.user.role,
      family: session.family,
      replacedSessionId: session.id,
      req,
    });
  },

  async logout(sessionId?: string) {
    if (!sessionId) return { loggedOut: false };
    await prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' },
    });
    return { loggedOut: true };
  },

  async logoutAll(userId: string) {
    const res = await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout_all' },
    });
    return { revokedCount: res.count };
  },

  async verifyEmail(rawToken: string) {
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: { select: { id: true, email: true, fullName: true, emailVerified: true } } },
    });
    if (!record || record.type !== 'EMAIL_VERIFICATION') throw AppError.badRequest('Link xác thực không hợp lệ');
    if (record.usedAt) throw AppError.badRequest('Link xác thực đã được sử dụng');
    if (record.expiresAt < new Date())
      throw AppError.badRequest('Link xác thực đã hết hạn, vui lòng gửi lại email mới');

    await prisma.$transaction([
      prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    ]);

    return { email: record.user.email, fullName: record.user.fullName };
  },

  async resendVerification(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('Không tìm thấy tài khoản');
    if (user.emailVerified) throw AppError.badRequest('Email của bạn đã được xác thực rồi');

    const recent = await prisma.verificationToken.count({
      where: { userId, type: 'EMAIL_VERIFICATION', createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= 3) throw AppError.tooMany('Bạn đã yêu cầu gửi lại quá nhiều lần. Vui lòng thử lại sau 1 giờ.');

    await prisma.verificationToken.updateMany({
      where: { userId, type: 'EMAIL_VERIFICATION', usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateToken();
    await prisma.verificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await mailer.verifyEmail(user.email, user.fullName, `${CLIENT}/verify-email?token=${token}`);
    return { sent: true };
  },

  /**
   * Quên mật khẩu — LUÔN trả thành công, dù email có tồn tại hay không.
   * Đây là điểm chống enumeration quan trọng nhất của luồng này.
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.status !== 'DELETED') {
      await prisma.verificationToken.updateMany({
        where: { userId: user.id, type: 'PASSWORD_RESET', usedAt: null },
        data: { usedAt: new Date() }, // vô hiệu token cũ — chỉ token mới nhất dùng được
      });

      const token = generateToken();
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          type: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      await mailer.resetPassword(user.email, user.fullName, `${CLIENT}/reset-password?token=${token}`, 15);
      logger.info({ userId: user.id }, '🔑 Yêu cầu đặt lại mật khẩu');
    } else {
      securityLog('forgot_password_unknown_email', { email });
    }

    return { sent: true };
  },

  async resetPassword(rawToken: string, newPassword: string, req: Request) {
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true },
    });
    if (!record || record.type !== 'PASSWORD_RESET') throw AppError.badRequest('Token không hợp lệ');
    if (record.usedAt) throw AppError.badRequest('Token đã được sử dụng, vui lòng yêu cầu link mới');
    if (record.expiresAt < new Date()) throw AppError.badRequest('Token đã hết hạn, vui lòng yêu cầu link mới');

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      // Đổi mật khẩu → kết thúc mọi phiên cũ (kể cả kẻ tấn công đang giữ token)
      prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'password_reset' },
      }),
    ]);

    const { ip } = deviceInfo(req);
    void mailer.passwordChanged(record.user.email, record.user.fullName, ip);
    securityLog('password_reset_success', { userId: record.userId, ip }, 'info');
    return { email: record.user.email };
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string, req: Request) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('Không tìm thấy tài khoản');
    if (!user.passwordHash)
      throw AppError.badRequest('Tài khoản này đăng nhập bằng Google, không có mật khẩu để đổi');

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      securityLog('change_password_wrong_current', { userId }, 'warn');
      throw AppError.badRequest('Mật khẩu hiện tại không đúng');
    }

    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });

    // Giữ lại phiên hiện tại, kết thúc các phiên khác
    const currentSessionId = req.user?.sessionId;
    await prisma.session.updateMany({
      where: { userId, revokedAt: null, id: { not: currentSessionId } },
      data: { revokedAt: new Date(), revokedReason: 'password_changed' },
    });

    const { ip } = deviceInfo(req);
    void mailer.passwordChanged(user.email, user.fullName, ip);
    return { changed: true };
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
      },
      select: { id: true, email: true, fullName: true, phone: true, avatarUrl: true, dateOfBirth: true, gender: true },
    });
  },

  async listSessions(userId: string, currentSessionId?: string) {
    const sessions = await prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, userAgent: true, ip: true, createdAt: true, lastUsedAt: true, expiresAt: true },
    });
    return sessions.map((s) => ({ ...s, isCurrent: s.id === currentSessionId }));
  },

  async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw AppError.notFound('Không tìm thấy phiên đăng nhập');
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokedReason: 'revoked_by_user' },
    });
    return { revoked: true };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
        dateOfBirth: true,
        gender: true,
        createdAt: true,
        _count: { select: { orders: true, wishlist: true } },
      },
    });
    if (!user) throw AppError.notFound('Không tìm thấy tài khoản');
    return user;
  },

  // ── Google OAuth ──────────────────────────────────────────────────────────
  googleAuthUrl(state: string) {
    if (!env.GOOGLE_CLIENT_ID) throw AppError.badRequest('Chưa cấu hình GOOGLE_CLIENT_ID trong .env');
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /** Đổi code → token → profile, rồi đăng nhập hoặc liên kết tài khoản có sẵn */
  async googleCallback(code: string, req: Request) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw AppError.badRequest('Chưa cấu hình Google OAuth trong .env');
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw AppError.unauthorized('Không đổi được mã xác thực Google');
    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) throw AppError.unauthorized('Không lấy được thông tin Google');
    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name: string;
      picture?: string;
      verified_email?: boolean;
    };

    if (!profile.verified_email) throw AppError.forbidden('Email Google chưa được xác thực');

    const account = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: 'google', providerAccountId: profile.id } },
      include: { user: true },
    });

    let user = account?.user;

    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });
      if (byEmail) {
        // Liên kết provider vào tài khoản đã tồn tại (email đã được Google xác thực)
        user = byEmail;
        await prisma.account.create({
          data: {
            userId: byEmail.id,
            provider: 'google',
            providerAccountId: profile.id,
            email: profile.email,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: tokens.expires_in,
          },
        });
        if (!byEmail.emailVerified) {
          await prisma.user.update({ where: { id: byEmail.id }, data: { emailVerified: true } });
        }
        logger.info({ userId: byEmail.id }, '🔗 Liên kết tài khoản Google vào user có sẵn');
      } else {
        user = await prisma.user.create({
          data: {
            email: profile.email.toLowerCase(),
            fullName: profile.name || profile.email.split('@')[0],
            avatarUrl: profile.picture,
            emailVerified: true,
            role: 'CUSTOMER',
            accounts: {
              create: {
                provider: 'google',
                providerAccountId: profile.id,
                email: profile.email,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: tokens.expires_in,
              },
            },
          },
        });
        logger.info({ userId: user.id }, '🆕 Tạo tài khoản mới từ Google');
      }
    } else if (tokens.refresh_token && account) {
      await prisma.account.update({
        where: { id: account.id },
        data: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: tokens.expires_in },
      });
    }

    if (user.status === 'BLOCKED') throw AppError.forbidden('Tài khoản của bạn đã bị khoá');

    const issued = await issueTokens({ userId: user.id, email: user.email, role: user.role, req });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return { ...issued, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
  },
};
