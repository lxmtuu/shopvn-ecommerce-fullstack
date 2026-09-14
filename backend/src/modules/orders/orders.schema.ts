import { z } from 'zod';

export const createOrderSchema = z
  .object({
    addressId: z.string().optional(),
    // Hoặc nhập địa chỉ mới ngay tại checkout
    recipientName: z.string().trim().min(2).max(80).optional(),
    recipientPhone: z
      .string()
      .trim()
      .regex(/^(0|\+84)(3|5|7|8|9)\d{8}$/, 'Số điện thoại không hợp lệ')
      .optional(),
    provinceName: z.string().trim().optional(),
    districtName: z.string().trim().optional(),
    wardName: z.string().trim().optional(),
    detail: z.string().trim().max(200).optional(),
    shippingMethod: z.enum(['STANDARD', 'EXPRESS', 'INSTANT']).default('STANDARD'),
    paymentMethod: z.enum(['COD', 'BANK_TRANSFER', 'VNPAY', 'MOMO']),
    couponCode: z.string().trim().max(40).optional(),
    note: z.string().trim().max(500).optional(),
    saveAddress: z.boolean().optional().default(false),
  })
  .refine((d) => Boolean(d.addressId) || Boolean(d.recipientName && d.recipientPhone && d.provinceName && d.detail), {
    message: 'Vui lòng chọn địa chỉ đã lưu hoặc nhập đầy đủ thông tin giao hàng',
    path: ['addressId'],
  });

export const orderQuerySchema = z.object({
  status: z
    .enum(['PENDING_PAYMENT', 'CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'])
    .optional(),
  paymentStatus: z.enum(['UNPAID', 'PENDING_REVIEW', 'PAID', 'UNDERPAID', 'FAILED', 'REFUNDED']).optional(),
  paymentMethod: z.enum(['COD', 'BANK_TRANSFER', 'VNPAY', 'MOMO']).optional(),
  q: z.string().trim().max(60).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED']),
  note: z.string().trim().max(300).optional(),
  trackingCode: z.string().trim().max(60).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Vui lòng cho biết lý do huỷ đơn').max(300),
});

export const returnOrderSchema = z.object({
  reason: z.string().trim().min(5, 'Vui lòng mô tả lý do trả hàng').max(500),
  images: z.array(z.string()).max(5).optional().default([]),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
