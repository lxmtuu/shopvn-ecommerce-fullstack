import { z } from 'zod';

export const adminUserQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(['CUSTOMER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'BLOCKED', 'DELETED']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'spent_desc', 'orders_desc']).optional().default('newest'),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'BLOCKED']),
  reason: z.string().trim().max(300).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['CUSTOMER', 'ADMIN']),
});

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
