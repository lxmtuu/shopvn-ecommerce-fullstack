import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        sessionId?: string;
      };
      /** id giỏ hàng: userId (đã đăng nhập) hoặc guestId (cookie) */
      cartOwner?: { userId?: string; guestId?: string };
      requestId?: string;
      validated?: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}

export {};
