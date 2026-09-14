import { z } from 'zod';

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().optional(), // slug hoặc id
  brand: z.string().trim().optional(), // "sony,jbl" — nhiều giá trị cách nhau dấu phẩy
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  inStock: z.coerce.boolean().optional(),
  onSale: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  tag: z.string().trim().optional(),
  sort: z
    .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'best_selling', 'rating', 'discount'])
    .optional()
    .default('newest'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(24),
});

export const productImageInput = z.object({
  url: z.string().min(1),
  thumbUrl: z.string().optional(),
  cardUrl: z.string().optional(),
  blurData: z.string().optional(),
  alt: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
  isPrimary: z.boolean().optional().default(false),
});

export const productVariantInput = z.object({
  name: z.string().min(1, 'Tên biến thể không được để trống'),
  sku: z.string().min(2),
  price: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0),
  imageUrl: z.string().optional().nullable(),
  attributes: z.record(z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

export const createProductSchema = z
  .object({
    name: z.string().trim().min(3, 'Tên sản phẩm tối thiểu 3 ký tự').max(200),
    sku: z.string().trim().min(2).max(60),
    shortDesc: z.string().trim().max(300).optional(),
    description: z.string().optional(),
    specs: z.record(z.string()).optional(),
    price: z.coerce.number().positive('Giá phải lớn hơn 0'),
    salePrice: z.coerce.number().min(0).optional().nullable(),
    costPrice: z.coerce.number().min(0).optional().nullable(),
    stock: z.coerce.number().int().min(0).default(0),
    categoryId: z.string().min(1, 'Chọn danh mục'),
    brandId: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
    weightGram: z.coerce.number().int().min(0).optional().nullable(),
    warrantyMonths: z.coerce.number().int().min(0).optional().nullable(),
    isActive: z.boolean().optional().default(true),
    isFeatured: z.boolean().optional().default(false),
    metaTitle: z.string().max(70).optional(),
    metaDesc: z.string().max(160).optional(),
    images: z.array(productImageInput).optional().default([]),
    variants: z.array(productVariantInput).optional().default([]),
  })
  .refine((d) => !d.salePrice || d.salePrice < d.price, {
    message: 'Giá khuyến mãi phải nhỏ hơn giá gốc',
    path: ['salePrice'],
  });

export const updateProductSchema = createProductSchema.innerType().partial().extend({
  images: z.array(productImageInput).optional(),
  variants: z.array(productVariantInput).optional(),
});

export const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1, 'Chọn ít nhất 1 sản phẩm'),
  action: z.enum(['activate', 'deactivate', 'delete', 'feature', 'unfeature']),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
