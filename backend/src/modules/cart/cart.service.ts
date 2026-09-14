import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { D, money } from '../../utils/money.js';

type Owner = { userId?: string; guestId?: string };

const ITEM_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      salePrice: true,
      stock: true,
      isActive: true,
      deletedAt: true,
      images: { where: { isPrimary: true }, take: 1, select: { cardUrl: true, url: true, blurData: true } },
    },
  },
  variant: { select: { id: true, name: true, price: true, salePrice: true, stock: true, imageUrl: true, isActive: true } },
} satisfies Prisma.CartItemInclude;

/** Tìm hoặc tạo giỏ hàng theo chủ sở hữu (user hoặc khách vãng lai) */
async function getOrCreateCart(owner: Owner) {
  if (!owner.userId && !owner.guestId) throw AppError.badRequest('Không xác định được giỏ hàng');

  const existing = await prisma.cart.findFirst({
    where: owner.userId ? { userId: owner.userId } : { guestId: owner.guestId },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.cart.create({
    data: { userId: owner.userId ?? null, guestId: owner.guestId ?? null },
    select: { id: true },
  });
}

const unitPrice = (item: { product: { price: Prisma.Decimal; salePrice: Prisma.Decimal | null }; variant: { price: Prisma.Decimal; salePrice: Prisma.Decimal | null } | null }) => {
  const src = item.variant ?? item.product;
  return src.salePrice && Number(src.salePrice) < Number(src.price) ? src.salePrice : src.price;
};

const availableStock = (item: { product: { stock: number }; variant: { stock: number } | null }) =>
  item.variant ? item.variant.stock : item.product.stock;

/** Chuẩn hoá giỏ hàng trả về FE: giá hiệu lực, cảnh báo tồn kho, tổng tiền */
function serialize(cart: Prisma.CartGetPayload<{ include: { items: { include: typeof ITEM_INCLUDE } } }>) {
  const items = cart.items.map((item) => {
    const price = unitPrice(item as never);
    const stock = availableStock(item as never);
    const lineTotal = D(price).times(item.quantity);
    const unavailable = item.product.deletedAt !== null || !item.product.isActive;
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.product.name,
      slug: item.product.slug,
      variantName: item.variant?.name ?? null,
      image: item.variant?.imageUrl ?? item.product.images[0]?.cardUrl ?? item.product.images[0]?.url ?? null,
      blurData: item.product.images[0]?.blurData ?? null,
      unitPrice: money(price),
      quantity: item.quantity,
      lineTotal: money(lineTotal),
      stock,
      inStock: stock > 0,
      available: !unavailable,
      exceedsStock: item.quantity > stock,
      maxQuantity: Math.min(stock, 99),
    };
  });

  const subtotal = items.filter((i) => i.available).reduce((s, i) => s.plus(D(i.lineTotal)), D(0));
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const shippingFee = subtotal.gte(env.FREE_SHIPPING_THRESHOLD) || subtotal.eq(0) ? D(0) : D(env.SHIPPING_FEE_STANDARD);

  return {
    id: cart.id,
    items,
    totalQuantity,
    distinctCount: items.length,
    subtotal: money(subtotal),
    shippingFeeEstimate: money(shippingFee),
    freeShippingThreshold: env.FREE_SHIPPING_THRESHOLD,
    amountToFreeShipping: money(Prisma.Decimal.max(D(env.FREE_SHIPPING_THRESHOLD).minus(subtotal), 0)),
    totalEstimate: money(subtotal.plus(shippingFee)),
    hasIssues: items.some((i) => !i.available || i.exceedsStock),
  };
}

export const cartService = {
  async get(owner: Owner) {
    const { id } = await getOrCreateCart(owner);
    const cart = await prisma.cart.findUniqueOrThrow({ where: { id }, include: { items: { include: ITEM_INCLUDE, orderBy: { createdAt: 'desc' } } } });
    return serialize(cart);
  },

  async addItem(owner: Owner, input: { productId: string; variantId?: string | null; quantity: number }) {
    const { id: cartId } = await getOrCreateCart(owner);

    const product = await prisma.product.findFirst({
      where: { id: input.productId, deletedAt: null, isActive: true },
      select: { id: true, stock: true, name: true, variants: { where: { isActive: true }, select: { id: true, stock: true } } },
    });
    if (!product) throw AppError.notFound('Sản phẩm không tồn tại hoặc đã ngừng kinh doanh');

    let stock = product.stock;
    if (input.variantId) {
      const variant = product.variants.find((v) => v.id === input.variantId);
      if (!variant) throw AppError.badRequest('Biến thể sản phẩm không hợp lệ');
      stock = variant.stock;
    }

    if (stock <= 0) throw AppError.conflict(`"${product.name}" đã hết hàng`, 'OUT_OF_STOCK');

    // Đã có trong giỏ → cộng dồn số lượng
    const existing = await prisma.cartItem.findFirst({
      where: { cartId, productId: input.productId, variantId: input.variantId ?? null },
    });

    const nextQty = (existing?.quantity ?? 0) + input.quantity;
    if (nextQty > stock) {
      throw AppError.conflict(
        existing
          ? `Bạn đã có ${existing.quantity} sản phẩm trong giỏ, chỉ còn ${stock} sản phẩm có sẵn`
          : `Chỉ còn ${stock} sản phẩm có sẵn`,
        'OUT_OF_STOCK',
      );
    }

    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
    } else {
      await prisma.cartItem.create({
        data: { cartId, productId: input.productId, variantId: input.variantId ?? null, quantity: input.quantity },
      });
    }

    return this.get(owner);
  },

  async updateItem(owner: Owner, itemId: string, quantity: number) {
    const { id: cartId } = await getOrCreateCart(owner);
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId }, include: ITEM_INCLUDE });
    if (!item) throw AppError.notFound('Không tìm thấy sản phẩm trong giỏ');

    const stock = availableStock(item as never);
    if (quantity > stock) {
      throw AppError.conflict(`Chỉ còn ${stock} sản phẩm có sẵn`, 'OUT_OF_STOCK');
    }

    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.get(owner);
  },

  async removeItem(owner: Owner, itemId: string) {
    const { id: cartId } = await getOrCreateCart(owner);
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw AppError.notFound('Không tìm thấy sản phẩm trong giỏ');
    await prisma.cartItem.delete({ where: { id: itemId } });
    return this.get(owner);
  },

  async clear(owner: Owner) {
    const { id: cartId } = await getOrCreateCart(owner);
    await prisma.cartItem.deleteMany({ where: { cartId } });
    return this.get(owner);
  },

  /**
   * GỘP giỏ khách vãng lai vào giỏ user sau khi đăng nhập.
   * Quy tắc: cùng sản phẩm/biến thể → cộng dồn số lượng, giới hạn theo tồn kho.
   */
  async merge(userId: string, guestId: string) {
    if (!guestId) return this.get({ userId });

    const [guestCart, userCart] = await Promise.all([
      prisma.cart.findFirst({ where: { guestId }, select: { id: true } }),
      getOrCreateCart({ userId }),
    ]);
    if (!guestCart) return this.get({ userId });
    if (guestCart.id === userCart.id) return this.get({ userId });

    const guestItems = await prisma.cartItem.findMany({ where: { cartId: guestCart.id }, include: ITEM_INCLUDE });

    for (const item of guestItems) {
      const stock = availableStock(item as never);
      const existing = await prisma.cartItem.findFirst({
        where: { cartId: userCart.id, productId: item.productId, variantId: item.variantId },
      });
      const keepQty = Math.max(0, Math.min((existing?.quantity ?? 0) + item.quantity, stock));

      if (existing) {
        if (keepQty > 0) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: keepQty } });
      } else if (keepQty > 0) {
        await prisma.cartItem.create({
          data: { cartId: userCart.id, productId: item.productId, variantId: item.variantId, quantity: keepQty },
        });
      }
    }

    await prisma.cart.delete({ where: { id: guestCart.id } });
    return this.get({ userId });
  },
};
