import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { buildMeta } from '../../utils/pagination.js';
import { money } from '../../utils/money.js';
import { cleanHtml, cleanText } from '../../utils/sanitize.js';
import { toSlug, toUniqueSlug } from '../../utils/slug.js';
import { cache } from '../../lib/redis.js';
import type { CreateProductInput, ProductQuery, UpdateProductInput } from './products.schema.js';

const CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  salePrice: true,
  stock: true,
  sold: true,
  tags: true,
  isFeatured: true,
  warrantyMonths: true,
  images: { where: { isPrimary: true }, take: 1, select: { url: true, cardUrl: true, thumbUrl: true, blurData: true, alt: true } },
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { reviews: { where: { status: 'APPROVED' } } } },
} satisfies Prisma.ProductSelect;

interface CardProduct {
  id: string;
  name: string;
  slug: string;
  price: Prisma.Decimal;
  salePrice: Prisma.Decimal | null;
  stock: number;
  sold: number;
  tags: string[];
  isFeatured: boolean;
  warrantyMonths: number | null;
  images: { url: string; cardUrl: string | null; thumbUrl: string | null; blurData: string | null; alt: string | null }[];
  brand: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
  _count: { reviews: number };
  avgRating?: number;
  reviewCount?: number;
}

/** Chuẩn hoá sản phẩm cho FE: thêm giá hiệu lực, % giảm, ảnh chính */
function toCard(p: CardProduct, ratingMap?: Map<string, { avg: number; count: number }>) {
  const effective = p.salePrice && Number(p.salePrice) < Number(p.price) ? p.salePrice : p.price;
  const discountPercent = p.salePrice ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
  const rating = ratingMap?.get(p.id);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    thumbnail: p.images[0]?.cardUrl ?? p.images[0]?.url ?? null,
    thumbUrl: p.images[0]?.thumbUrl ?? null,
    blurData: p.images[0]?.blurData ?? null,
    price: money(p.price),
    salePrice: p.salePrice ? money(p.salePrice) : null,
    effectivePrice: money(effective),
    discountPercent,
    isOnSale: discountPercent > 0,
    stock: p.stock,
    inStock: p.stock > 0,
    sold: p.sold,
    isFeatured: p.isFeatured,
    tags: p.tags,
    warrantyMonths: p.warrantyMonths,
    brand: p.brand,
    category: p.category,
    avgRating: rating?.avg ?? 0,
    reviewCount: rating?.count ?? 0,
  };
}

/**
 * Tìm kiếm KHÔNG DẤU: dùng unaccent của PostgreSQL.
 *  "dien thoai" → khớp "điện thoại". Đây là lý do phải cài extension (prisma/sql/extensions.sql).
 */
async function searchProductIds(q: string, limit = 500): Promise<string[] | null> {
  try {
    const pattern = `%${q}%`;
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p."id"
      FROM "products" p
      LEFT JOIN "categories" c ON c."id" = p."categoryId"
      LEFT JOIN "brands" b ON b."id" = p."brandId"
      WHERE p."deletedAt" IS NULL
        AND (
          unaccent(lower(p."name")) LIKE unaccent(lower(${pattern}))
          OR unaccent(lower(coalesce(p."shortDesc", ''))) LIKE unaccent(lower(${pattern}))
          OR unaccent(lower(p."sku")) LIKE unaccent(lower(${pattern}))
          OR unaccent(lower(coalesce(b."name", ''))) LIKE unaccent(lower(${pattern}))
          OR unaccent(lower(coalesce(c."name", ''))) LIKE unaccent(lower(${pattern}))
        )
      ORDER BY p."sold" DESC, p."createdAt" DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => r.id);
  } catch {
    // Chưa cài extension unaccent → quay về tìm kiếm thường của Prisma (vẫn chạy được)
    return null;
  }
}

async function ratingMap(ids: string[]) {
  if (!ids.length) return new Map<string, { avg: number; count: number }>();
  const rows = await prisma.review.groupBy({
    by: ['productId'],
    where: { productId: { in: ids }, status: 'APPROVED', deletedAt: null },
    _avg: { rating: true },
    _count: true,
  });
  return new Map(rows.map((r) => [r.productId, { avg: Number((r._avg.rating ?? 0).toFixed(1)), count: r._count }]));
}

export const productsService = {
  /** Danh sách + filter + search + sort + phân trang + facets */
  async list(query: ProductQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    // ── Bộ lọc chung ────────────────────────────────────────────────────────
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(query.inStock ? { stock: { gt: 0 } } : {}),
      ...(query.onSale ? { salePrice: { not: null } } : {}),
      ...(query.featured ? { isFeatured: true } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.brand ? { brand: { slug: { in: query.brand.split(',').map((b) => b.trim()) } } } : {}),
      ...(query.minPrice || query.maxPrice
        ? {
            OR: [
              {
                salePrice: {
                  ...(query.minPrice ? { gte: query.minPrice } : {}),
                  ...(query.maxPrice ? { lte: query.maxPrice } : {}),
                },
              },
              {
                salePrice: null,
                price: {
                  ...(query.minPrice ? { gte: query.minPrice } : {}),
                  ...(query.maxPrice ? { lte: query.maxPrice } : {}),
                },
              },
            ],
          }
        : {}),
    };

    // ── Tìm kiếm ────────────────────────────────────────────────────────────
    if (query.q) {
      const ids = await searchProductIds(query.q);
      if (ids) {
        where.id = { in: ids };
      } else {
        where.OR = [
          { name: { contains: query.q, mode: 'insensitive' } },
          { shortDesc: { contains: query.q, mode: 'insensitive' } },
          { sku: { contains: query.q, mode: 'insensitive' } },
        ];
      }
    }

    // ── Lọc theo đánh giá (lọc sau khi có rating vì rating là dữ liệu tổng hợp) ──
    let candidateIds: string[] | null = null;
    if (query.rating) {
      const rows = await prisma.review.groupBy({
        by: ['productId'],
        where: { status: 'APPROVED', deletedAt: null },
        _avg: { rating: true },
        having: { rating: { _avg: { gte: query.rating } } },
      });
      candidateIds = rows.map((r) => r.productId);
      where.id = candidateIds.length ? { in: candidateIds } : { in: ['__none__'] };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { price: 'asc' }
        : query.sort === 'price_desc'
          ? { price: 'desc' }
          : query.sort === 'best_selling'
            ? { sold: 'desc' }
            : query.sort === 'oldest'
              ? { createdAt: 'asc' }
              : { createdAt: 'desc' };

    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip, take: limit, select: CARD_SELECT }),
      prisma.product.count({ where }),
    ]);

    const ratings = await ratingMap(rows.map((r) => r.id));
    let items = rows.map((r) => toCard(r as CardProduct, ratings));

    // Sort theo rating / discount cần dữ liệu tính toán → làm ở tầng ứng dụng
    if (query.sort === 'rating') items = items.sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount);
    if (query.sort === 'discount') items = items.sort((a, b) => b.discountPercent - a.discountPercent);

    // ── Facets: số lượng theo brand + khoảng giá (để FE hiển thị "Sony (12)") ──
    const facetWhere = { ...where, id: where.id ?? undefined };
    const [brandFacets, priceAgg] = await Promise.all([
      prisma.product.groupBy({ by: ['brandId'], where: facetWhere, _count: true }),
      prisma.product.aggregate({ where: facetWhere, _min: { price: true }, _max: { price: true } }),
    ]);
    const brandIds = brandFacets.map((b) => b.brandId).filter((id): id is string => Boolean(id));
    const brands = brandIds.length
      ? await prisma.brand.findMany({ where: { id: { in: brandIds } }, select: { id: true, name: true, slug: true } })
      : [];

    return {
      data: items,
      meta: buildMeta(total, { page, limit }),
      facets: {
        brands: brandFacets
          .map((f) => {
            const brand = brands.find((b) => b.id === f.brandId);
            return brand ? { ...brand, count: f._count } : null;
          })
          .filter(Boolean),
        priceRange: {
          min: Number(priceAgg._min.price ?? 0),
          max: Number(priceAgg._max.price ?? 0),
        },
      },
    };
  },

  /** Gợi ý autocomplete — cache 60s vì gọi liên tục khi gõ */
  async suggestions(q: string) {
    const key = `suggest:${q.toLowerCase()}`;
    const cached = await cache.get(key);
    if (cached) return JSON.parse(cached) as unknown[];

    const ids = await searchProductIds(q, 8);
    const products = await prisma.product.findMany({
      where: ids ? { id: { in: ids } } : { name: { contains: q, mode: 'insensitive' }, deletedAt: null, isActive: true },
      take: 6,
      select: CARD_SELECT,
    });
    const data = products.map((p) => {
      const card = toCard(p as CardProduct);
      return { id: card.id, name: card.name, slug: card.slug, thumbnail: card.thumbUrl, price: card.price, salePrice: card.salePrice };
    });
    await cache.set(key, JSON.stringify(data), 60);
    return data;
  },

  /** Chi tiết theo slug — kèm biến thể, ảnh, thống kê đánh giá */
  async detail(
    slug: string,
    opts: { userId?: string; sessionId?: string; ip?: string; isAdmin?: boolean } = {},
  ) {
    /**
     * Khách chỉ thấy sản phẩm đang bán. ADMIN thấy cả sản phẩm đã tắt bán —
     * nếu không, trang "Sửa sản phẩm" sẽ 404 đúng lúc admin cần bật lại.
     */
    const product = await prisma.product.findFirst({
      where: { slug, deletedAt: null, ...(opts.isAdmin ? {} : { isActive: true }) },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          // Admin thấy cả biến thể đã tắt bán; khách chỉ thấy biến thể đang bán
          where: opts.isAdmin ? {} : { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
        category: { select: { id: true, name: true, slug: true, parentId: true } },
        coupons: {
          where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          select: { code: true, type: true, value: true, minOrderValue: true, expiresAt: true },
          take: 3,
        },
      },
    });
    if (!product) throw AppError.notFound('Sản phẩm không tồn tại hoặc đã ngừng kinh doanh');

    // Ghi nhận lượt xem (không chặn response nếu lỗi)
    void prisma
      .$transaction([
        prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }),
        prisma.productView.create({
          data: { productId: product.id, userId: opts.userId, sessionId: opts.sessionId, ip: opts.ip },
        }),
      ])
      .catch(() => {});

    const [ratingStats, distribution, reviews] = await Promise.all([
      prisma.review.aggregate({
        where: { productId: product.id, status: 'APPROVED', deletedAt: null },
        _avg: { rating: true },
        _count: true,
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId: product.id, status: 'APPROVED', deletedAt: null },
        _count: true,
        orderBy: { rating: 'desc' },
      }),
      prisma.review.findMany({
        where: { productId: product.id, status: 'APPROVED', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          rating: true,
          title: true,
          content: true,
          images: true,
          isVerified: true,
          helpfulCount: true,
          adminReply: true,
          createdAt: true,
          user: { select: { fullName: true, avatarUrl: true } },
        },
      }),
    ]);

    const isWishlisted = opts.userId
      ? Boolean(await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: opts.userId, productId: product.id } } }))
      : false;

    const effectivePrice = product.salePrice && Number(product.salePrice) < Number(product.price) ? product.salePrice : product.price;

    return {
      ...product,
      price: money(product.price),
      salePrice: product.salePrice ? money(product.salePrice) : null,
      costPrice: undefined, // không bao giờ trả giá nhập cho client
      effectivePrice: money(effectivePrice),
      discountPercent: product.salePrice ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100) : 0,
      variants: product.variants.map((v) => ({
        ...v,
        price: money(v.price),
        salePrice: v.salePrice ? money(v.salePrice) : null,
        effectivePrice: money(v.salePrice && Number(v.salePrice) < Number(v.price) ? v.salePrice : v.price),
      })),
      rating: {
        average: Number((ratingStats._avg.rating ?? 0).toFixed(1)),
        count: ratingStats._count,
        distribution: [5, 4, 3, 2, 1].map((star) => ({
          star,
          count: distribution.find((d) => d.rating === star)?._count ?? 0,
        })),
      },
      latestReviews: reviews,
      isWishlisted,
    };
  },

  async featured(limit = 8) {
    const rows = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true, isFeatured: true },
      orderBy: { sold: 'desc' },
      take: limit,
      select: CARD_SELECT,
    });
    const ratings = await ratingMap(rows.map((r) => r.id));
    return rows.map((r) => toCard(r as CardProduct, ratings));
  },

  async bestSellers(limit = 8) {
    const rows = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { sold: 'desc' },
      take: limit,
      select: CARD_SELECT,
    });
    const ratings = await ratingMap(rows.map((r) => r.id));
    return rows.map((r) => toCard(r as CardProduct, ratings));
  },

  async newest(limit = 8) {
    const rows = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: CARD_SELECT,
    });
    const ratings = await ratingMap(rows.map((r) => r.id));
    return rows.map((r) => toCard(r as CardProduct, ratings));
  },

  /** Sản phẩm liên quan: cùng danh mục, khác sản phẩm hiện tại */
  async related(slug: string, limit = 8) {
    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true, categoryId: true } });
    if (!product) throw AppError.notFound('Sản phẩm không tồn tại');

    const rows = await prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, deletedAt: null, isActive: true },
      orderBy: { sold: 'desc' },
      take: limit,
      select: CARD_SELECT,
    });
    const ratings = await ratingMap(rows.map((r) => r.id));
    return rows.map((r) => toCard(r as CardProduct, ratings));
  },

  /** Đã xem gần đây — dựa trên bảng product_views */
  async recentlyViewed(userId: string, limit = 8) {
    const views = await prisma.productView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { productId: true },
    });
    const uniqueIds = [...new Set(views.map((v) => v.productId))].slice(0, limit);
    if (!uniqueIds.length) return [];

    const rows = await prisma.product.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null, isActive: true },
      select: CARD_SELECT,
    });
    const ratings = await ratingMap(rows.map((r) => r.id));
    const cards = rows.map((r) => toCard(r as CardProduct, ratings));
    // giữ đúng thứ tự vừa xem
    return uniqueIds.map((id) => cards.find((c) => c.id === id)).filter(Boolean);
  },

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  async adminList(query: ProductQuery & { status?: 'active' | 'inactive' | 'deleted' }) {
    const { page, limit } = query;
    const where: Prisma.ProductWhereInput = {
      ...(query.status === 'deleted' ? { deletedAt: { not: null } } : { deletedAt: null }),
      ...(query.status === 'active' ? { isActive: true } : {}),
      ...(query.status === 'inactive' ? { isActive: false } : {}),
      ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { sku: { contains: query.q, mode: 'insensitive' } }] } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          ...CARD_SELECT,
          sku: true,
          isActive: true,
          lowStockAlert: true,
          viewCount: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { variants: true, orderItems: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: rows.map((r) => {
        const card = toCard(r as unknown as CardProduct);
        return { ...card, sku: r.sku, isActive: r.isActive, lowStockAlert: r.lowStockAlert, viewCount: r.viewCount, variantCount: r._count.variants, orderCount: r._count.orderItems, createdAt: r.createdAt, updatedAt: r.updatedAt };
      }),
      meta: buildMeta(total, { page, limit }),
    };
  },

  async create(input: CreateProductInput, adminId?: string) {
    const slug = await toUniqueSlug(input.name, async (s) => Boolean(await prisma.product.findUnique({ where: { slug: s }, select: { id: true } })));

    const totalStock = input.variants?.length ? input.variants.reduce((s, v) => s + v.stock, 0) : input.stock;

    const product = await prisma.product.create({
      data: {
        name: input.name,
        slug,
        sku: input.sku,
        shortDesc: input.shortDesc ? cleanText(input.shortDesc) : null,
        description: input.description ? cleanHtml(input.description) : null,
        specs: input.specs ?? undefined,
        price: input.price,
        salePrice: input.salePrice ?? null,
        costPrice: input.costPrice ?? null,
        stock: totalStock,
        categoryId: input.categoryId,
        brandId: input.brandId ?? null,
        tags: input.tags,
        weightGram: input.weightGram ?? null,
        warrantyMonths: input.warrantyMonths ?? null,
        isActive: input.isActive,
        isFeatured: input.isFeatured,
        metaTitle: input.metaTitle ?? input.name,
        metaDesc: input.metaDesc ?? input.shortDesc ?? null,
        publishedAt: input.isActive ? new Date() : null,
        images: {
          create: input.images.map((img, i) => ({
            url: img.url,
            thumbUrl: img.thumbUrl,
            cardUrl: img.cardUrl,
            blurData: img.blurData,
            alt: img.alt ?? input.name,
            sortOrder: img.sortOrder ?? i,
            isPrimary: img.isPrimary ?? i === 0,
          })),
        },
        variants: input.variants?.length
          ? { create: input.variants.map((v, i) => ({ ...v, sortOrder: i })) }
          : undefined,
      },
    });

    await prisma.auditLog.create({
      data: { userId: adminId, action: 'product.create', entity: 'Product', entityId: product.id, after: { name: product.name, sku: product.sku } },
    });

    return product;
  },

  async update(id: string, input: UpdateProductInput, adminId?: string) {
    const before = await prisma.product.findUnique({ where: { id } });
    if (!before) throw AppError.notFound('Không tìm thấy sản phẩm');

    const product = await prisma.$transaction(async (tx) => {
      // Thay ảnh & biến thể: xoá cũ → tạo mới (đơn giản, tránh state rối)
      if (input.images) await tx.productImage.deleteMany({ where: { productId: id } });
      if (input.variants) await tx.productVariant.deleteMany({ where: { productId: id } });

      return tx.product.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.sku !== undefined ? { sku: input.sku } : {}),
          ...(input.shortDesc !== undefined ? { shortDesc: input.shortDesc ? cleanText(input.shortDesc) : null } : {}),
          ...(input.description !== undefined ? { description: input.description ? cleanHtml(input.description) : null } : {}),
          ...(input.specs !== undefined ? { specs: input.specs } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.salePrice !== undefined ? { salePrice: input.salePrice } : {}),
          ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
          ...(input.stock !== undefined ? { stock: input.stock } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
          ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
          ...(input.metaDesc !== undefined ? { metaDesc: input.metaDesc } : {}),
          ...(input.images
            ? {
                images: {
                  create: input.images.map((img, i) => ({
                    url: img.url,
                    thumbUrl: img.thumbUrl,
                    cardUrl: img.cardUrl,
                    blurData: img.blurData,
                    alt: img.alt ?? input.name ?? before.name,
                    sortOrder: img.sortOrder ?? i,
                    isPrimary: img.isPrimary ?? i === 0,
                  })),
                },
              }
            : {}),
          ...(input.variants
            ? { variants: { create: input.variants.map((v, i) => ({ ...v, sortOrder: i })) } }
            : {}),
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'product.update',
        entity: 'Product',
        entityId: id,
        before: { name: before.name, price: String(before.price), isActive: before.isActive },
        after: { name: product.name, price: String(product.price), isActive: product.isActive },
      },
    });

    return product;
  },

  /** Xoá MỀM — giữ dữ liệu cho hoá đơn cũ */
  async softDelete(id: string, adminId?: string) {
    const product = await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, name: true },
    });
    await prisma.auditLog.create({
      data: { userId: adminId, action: 'product.delete', entity: 'Product', entityId: id, after: { deletedAt: new Date().toISOString() } },
    });
    return product;
  },

  async bulkAction(ids: string[], action: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature', adminId?: string) {
    const data: Prisma.ProductUpdateManyMutationInput =
      action === 'activate'
        ? { isActive: true }
        : action === 'deactivate'
          ? { isActive: false }
          : action === 'feature'
            ? { isFeatured: true }
            : action === 'unfeature'
              ? { isFeatured: false }
              : { deletedAt: new Date(), isActive: false };

    const result = await prisma.product.updateMany({ where: { id: { in: ids } }, data });
    await prisma.auditLog.create({
      data: { userId: adminId, action: `product.bulk_${action}`, entity: 'Product', after: { ids, count: result.count } },
    });
    return { affected: result.count };
  },

  /** Cập nhật tồn kho thủ công + ghi vết StockMovement */
  async adjustStock(productId: string, change: number, reason: 'RESTOCK' | 'ADJUSTMENT', adminId?: string, note?: string) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true, stock: true } });
      if (!product) throw AppError.notFound('Không tìm thấy sản phẩm');
      const after = product.stock + change;
      if (after < 0) throw AppError.conflict('Tồn kho không thể âm');

      await tx.product.update({ where: { id: productId }, data: { stock: after } });
      await tx.stockMovement.create({
        data: { productId, userId: adminId, change, before: product.stock, after, reason, reference: note },
      });
      return { before: product.stock, after };
    });
  },
};
