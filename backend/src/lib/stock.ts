import type { Prisma } from '@prisma/client';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  HOÀN KHO — một chỗ duy nhất cho MỌI luồng huỷ/trả đơn
 * ══════════════════════════════════════════════════════════════════════════
 *  Vì sao phải gom: trước đây có 3 nơi cùng "hoàn kho" (khách huỷ, cron quá hạn,
 *  admin đổi trạng thái) nhưng chỉ 2 nơi làm đúng — admin huỷ đơn thì hàng biến
 *  mất khỏi kho mà không ai thấy. Gom về đây để không thể tái phát.
 *
 *  Ghi vết StockMovement với `before`/`after` LẤY TỪ DB thật (dùng RETURNING),
 *  không đoán giá trị như bản cũ (before luôn = 0).
 * ══════════════════════════════════════════════════════════════════════════
 */

export interface StockLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface RestoreStockOptions {
  /** Lý do theo enum StockReason */
  reason: 'ORDER_CANCELLED' | 'RETURN';
  /** Mã đơn / chứng từ để tra cứu sau này */
  reference: string;
  /** Người thực hiện (khách tự huỷ / admin / hệ thống) */
  userId?: string | null;
}

/**
 * Cộng trả tồn kho cho từng dòng hàng và ghi StockMovement.
 * BẮT BUỘC gọi trong transaction cùng với việc đổi trạng thái đơn.
 */
export async function restoreStock(
  tx: Prisma.TransactionClient,
  lines: StockLine[],
  opts: RestoreStockOptions,
): Promise<number> {
  let restored = 0;

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) continue;

    // Biến thể: cộng kho biến thể trước
    if (line.variantId) {
      await tx.$queryRaw`
        UPDATE "product_variants" SET "stock" = "stock" + ${line.quantity}
        WHERE "id" = ${line.variantId}`;
    }

    // Tồn kho tổng của sản phẩm (denormalized) — luôn cộng để khớp với lúc trừ
    const rows = await tx.$queryRaw<Array<{ stock: number }>>`
      UPDATE "products" SET "stock" = "stock" + ${line.quantity}
      WHERE "id" = ${line.productId}
      RETURNING "stock"`;

    const after = rows[0]?.stock ?? line.quantity;

    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        variantId: line.variantId ?? null,
        userId: opts.userId ?? null,
        change: line.quantity,
        before: after - line.quantity,
        after,
        reason: opts.reason,
        reference: opts.reference,
      },
    });

    restored += line.quantity;
  }

  return restored;
}

/** Đổi từ danh sách OrderItem sang StockLine */
export const linesOfOrderItems = (
  items: Array<{ productId: string; variantId: string | null; quantity: number }>,
): StockLine[] => items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }));
