import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { toSlug, toUniqueSlug } from '../../utils/slug.js';

export const categoriesService = {
  /** Trả về dạng CÂY để render menu đa cấp */
  async tree(includeInactive = false) {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: { where: { deletedAt: null, isActive: true } } } } },
    });

    const map = new Map(categories.map((c) => [c.id, { ...c, productCount: c._count.products, children: [] as unknown[] }]));
    const roots: unknown[] = [];
    for (const c of map.values()) {
      if (c.parentId && map.has(c.parentId)) {
        (map.get(c.parentId)!.children as unknown[]).push(c);
      } else {
        roots.push(c);
      }
    }
    return roots;
  },

  async bySlug(slug: string) {
    const category = await prisma.category.findFirst({
      where: { slug, deletedAt: null },
      include: {
        children: { where: { isActive: true }, select: { id: true, name: true, slug: true, imageUrl: true } },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw AppError.notFound('Danh mục không tồn tại');
    return category;
  },

  async create(input: { name: string; description?: string; parentId?: string | null; imageUrl?: string; sortOrder?: number; isActive?: boolean }) {
    const slug = await toUniqueSlug(input.name, async (s) => Boolean(await prisma.category.findUnique({ where: { slug: s } })));
    return prisma.category.create({
      data: { ...input, slug, parentId: input.parentId ?? null, sortOrder: input.sortOrder ?? 0 },
    });
  },

  async update(id: string, input: Record<string, unknown>) {
    const exists = await prisma.category.findUnique({ where: { id } });
    if (!exists) throw AppError.notFound('Danh mục không tồn tại');

    const data: Record<string, unknown> = { ...input };
    if (typeof input.name === 'string' && input.name !== exists.name) {
      data.slug = await toUniqueSlug(input.name, async (s) =>
        Boolean(await prisma.category.findFirst({ where: { slug: s, id: { not: id } } })),
      );
    }
    if (input.parentId === id) throw AppError.badRequest('Danh mục không thể là cha của chính nó');

    return prisma.category.update({ where: { id }, data });
  },

  /** Xoá mềm, chặn nếu còn sản phẩm đang bán */
  async remove(id: string) {
    const count = await prisma.product.count({ where: { categoryId: id, deletedAt: null } });
    if (count > 0) throw AppError.conflict(`Danh mục còn ${count} sản phẩm, hãy chuyển sản phẩm sang danh mục khác trước`);
    return prisma.category.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  },

  slugFor: toSlug,
};
