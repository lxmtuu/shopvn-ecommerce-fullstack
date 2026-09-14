#!/usr/bin/env node
/**
 * db-check.mjs — Database đã có dữ liệu chưa?
 *
 * Dùng trong start-all.sh để quyết định có cần seed hay không.
 *   exit 0 = đã có dữ liệu (bảng products có ít nhất 1 dòng)
 *   exit 3 = database trống hoặc bảng chưa tồn tại (cần seed)
 *   exit 2 = không kết nối được / chưa generate Prisma Client
 *
 * In ra 1 dòng mô tả ngắn gọn.
 */
import 'dotenv/config';

try {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const [products, users] = await Promise.all([
      prisma.product.count(),
      prisma.user.count(),
    ]);
    await prisma.$disconnect();
    if (products > 0) {
      console.log(`  [OK] Database có ${products} sản phẩm · ${users} tài khoản`);
      process.exit(0);
    }
    console.log('  [ !] Database chưa có sản phẩm nào → cần nạp dữ liệu mẫu');
    process.exit(3);
  } catch (err) {
    await prisma.$disconnect().catch(() => {});
    console.log(`  [ !] Không truy vấn được bảng (có thể chưa migrate): ${err?.message ?? err}`);
    process.exit(3);
  }
} catch (err) {
  console.log(`  [ !] Chưa dùng được Prisma Client: ${err?.message ?? err}`);
  process.exit(2);
}
