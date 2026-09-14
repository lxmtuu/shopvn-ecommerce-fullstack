/**
 * Seed dữ liệu mẫu để chạy demo/phỏng vấn ngay sau khi cài.
 * Chạy: npm run seed
 */
import { PrismaClient, Prisma, type Product } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@shop.vn';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';
const USER_EMAIL = process.env.SEED_USER_EMAIL ?? 'customer@shop.vn';
const USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'Customer@123456';

/**
 * Ảnh sản phẩm lấy từ bộ ảnh có sẵn trong frontend/public/img/products
 * (ảnh thật cho điện thoại/laptop/tai nghe, hình minh hoạ SVG cho đồng hồ/gia dụng/phụ kiện).
 * Không phụ thuộc internet ⇒ trang luôn hiển thị đẹp kể cả khi mạng chậm.
 */
/**
 * ẢNH SẢN PHẨM — dùng bộ ảnh có sẵn trong frontend/public/img/products
 * (16 ảnh chụp studio, không phụ thuộc internet ⇒ trang luôn hiển thị đẹp).
 *
 * · PRODUCT_IMG_BY_NAME: ảnh CHÍNH XÁC cho từng sản phẩm (khớp đúng chủng loại)
 * · PRODUCT_IMAGES:      ảnh dự phòng theo danh mục (dùng làm ảnh xem thêm + khi
 *                        thêm sản phẩm mới mà chưa có ảnh riêng)
 */
const PRODUCT_IMG_BY_NAME: Record<string, string> = {
  // Điện thoại
  'iPhone 15 Pro Max 256GB': '/img/products/phone-1.jpg',
  'Samsung Galaxy S24 Ultra 512GB': '/img/products/phone-2.jpg',
  'Xiaomi 14 5G 256GB': '/img/products/phone-3.jpg',
  'iPhone 13 128GB': '/img/products/phone-1.jpg',
  // Laptop
  'MacBook Air M3 13 inch 256GB': '/img/products/laptop-1.jpg',
  'Dell XPS 13 Plus': '/img/products/laptop-1.jpg',
  'Asus ROG Strix G16': '/img/products/laptop-2.jpg',
  // Tai nghe & loa
  'Sony WH-1000XM5': '/img/products/audio-1.jpg',
  'AirPods Pro 2 USB-C': '/img/products/audio-2.jpg',
  'JBL Tune 770NC': '/img/products/audio-1.jpg',
  'Loa Bluetooth JBL Charge 5': '/img/products/audio-2.jpg',
  // Đồng hồ thông minh
  'Apple Watch Series 9 GPS 45mm': '/img/products/watch-1.jpg',
  'Samsung Galaxy Watch 6': '/img/products/watch-2.jpg',
  // Gia dụng
  'Nồi chiên không dầu Philips 6.2L': '/img/products/home-1.jpg',
  'Máy hút bụi Xiaomi G20': '/img/products/home-2.jpg',
  // Phụ kiện
  'Sạc dự phòng Anker 20000mAh': '/img/products/accessory-1.jpg',
  'Cáp sạc Type-C 100W 2m': '/img/products/accessory-2.jpg',
  'Ốp lưng MagSafe iPhone 15': '/img/products/accessory-3.jpg',
  'Chuột không dây Logitech MX Master 3S': '/img/products/accessory-4.jpg',
  'Bàn phím cơ Keychron K2 Pro': '/img/products/accessory-5.jpg',
};

const PRODUCT_IMAGES: Record<string, string[]> = {
  'dien-thoai': ['/img/products/phone-1.jpg', '/img/products/phone-2.jpg', '/img/products/phone-3.jpg'],
  laptop: ['/img/products/laptop-1.jpg', '/img/products/laptop-2.jpg'],
  'tai-nghe': ['/img/products/audio-1.jpg', '/img/products/audio-2.jpg'],
  'dong-ho-thong-minh': ['/img/products/watch-1.jpg', '/img/products/watch-2.jpg'],
  'gia-dung': ['/img/products/home-1.jpg', '/img/products/home-2.jpg'],
  'phu-kien': [
    '/img/products/accessory-1.jpg',
    '/img/products/accessory-2.jpg',
    '/img/products/accessory-3.jpg',
    '/img/products/accessory-4.jpg',
    '/img/products/accessory-5.jpg',
  ],
};

const FALLBACK_IMG = '/img/products/phone-1.jpg';

/** Bộ 3 ảnh của 1 sản phẩm: ảnh chính xác + các ảnh cùng danh mục làm ảnh xem thêm. */
const galleryFor = (name: string, catSlug: string): string[] => {
  const pool = PRODUCT_IMAGES[catSlug] ?? [FALLBACK_IMG];
  const primary = PRODUCT_IMG_BY_NAME[name];
  if (!primary) return pool;
  const extras = pool.filter((u) => u !== primary);
  return [primary, ...(extras.length ? extras : [primary])].slice(0, 3);
};

/** Ảnh chính (dùng cho danh sách, đơn hàng…). */
const productImg = (name: string, catSlug: string) => galleryFor(name, catSlug)[0];

/** Ảnh danh mục (lấy ảnh đầu của chính danh mục đó). */
const catImg = (catSlug: string) => (PRODUCT_IMAGES[catSlug] ?? [FALLBACK_IMG])[0];

const img = (seed: string, size = 800) => `https://picsum.photos/seed/${seed}/${size}/${size}`;
const pick = <T>(arr: T[], i: number) => arr[i % arr.length];

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...');


  // ── Người dùng ─────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const userHash = await bcrypt.hash(USER_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      fullName: 'Quản trị viên ShopVN',
      passwordHash: adminHash,
      role: 'ADMIN',
      emailVerified: true,
      phone: '0900000001',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: {},
    create: {
      email: USER_EMAIL,
      fullName: 'Nguyễn Văn Khách',
      passwordHash: userHash,
      role: 'CUSTOMER',
      emailVerified: true,
      phone: '0900000002',
    },
  });

  // Khách hàng phụ để dashboard có dữ liệu trực quan hơn
  const extraCustomers = [];
  for (let i = 1; i <= 8; i++) {
    const u = await prisma.user.upsert({
      where: { email: `khach${i}@shop.vn` },
      update: {},
      create: {
        email: `khach${i}@shop.vn`,
        fullName: pick(['Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E', 'Vũ Thị F', 'Đặng Văn G', 'Bùi Thị H', 'Ngô Văn I'], i - 1) + ` ${i}`,
        passwordHash: userHash,
        role: 'CUSTOMER',
        emailVerified: true,
        phone: `09000000${10 + i}`,
      },
    });
    extraCustomers.push(u);
  }

  // ── Địa chỉ ────────────────────────────────────────────────────────────────
  const existingAddress = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!existingAddress) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        fullName: 'Nguyễn Văn Khách',
        phone: '0900000002',
        provinceName: 'TP. Hồ Chí Minh',
        districtName: 'Quận 1',
        wardName: 'Phường Bến Nghé',
        detail: '123 Lê Lợi',
        isDefault: true,
      },
    });
  }

  // ── Danh mục ───────────────────────────────────────────────────────────────
  const categoryData = [
    { name: 'Điện thoại', slug: 'dien-thoai', iconName: 'smartphone' },
    { name: 'Laptop', slug: 'laptop', iconName: 'laptop' },
    { name: 'Tai nghe', slug: 'tai-nghe', iconName: 'headphones' },
    { name: 'Đồng hồ thông minh', slug: 'dong-ho-thong-minh', iconName: 'watch' },
    { name: 'Gia dụng', slug: 'gia-dung', iconName: 'home' },
    { name: 'Phụ kiện', slug: 'phu-kien', iconName: 'cable' },
  ];

  const categories = [];
  for (const [i, c] of categoryData.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { imageUrl: catImg(c.slug) },   // chạy lại seed là ảnh danh mục được cập nhật
      create: {
        name: c.name,
        slug: c.slug,
        iconName: c.iconName,
        description: `Danh mục ${c.name} chính hãng, giá tốt`,
        sortOrder: i,
        isActive: true,
        imageUrl: catImg(c.slug),
      },
    });
    categories.push(cat);
  }

  // ── Thương hiệu ────────────────────────────────────────────────────────────
  const brandNames = ['Apple', 'Samsung', 'Sony', 'Xiaomi', 'JBL', 'Dell', 'Asus', 'Anker'];
  const brands = [];
  for (const name of brandNames) {
    const b = await prisma.brand.upsert({
      where: { slug: name.toLowerCase() },
      update: {},
      create: { name, slug: name.toLowerCase(), logoUrl: img(`brand-${name}`, 200), description: `Thương hiệu ${name}` },
    });
    brands.push(b);
  }

  // ── Sản phẩm ───────────────────────────────────────────────────────────────
  const productsSeed: Array<{
    name: string; cat: string; brand: string; price: number; sale?: number; specs: Record<string, string>; stock: number; featured?: boolean;
  }> = [
    { name: 'iPhone 15 Pro Max 256GB', cat: 'dien-thoai', brand: 'Apple', price: 34990000, sale: 31990000, stock: 25, featured: true, specs: { 'Màn hình': '6.7 inch Super Retina XDR', Chip: 'A17 Pro', Camera: '48MP + 12MP + 12MP', Pin: '4441 mAh' } },
    { name: 'Samsung Galaxy S24 Ultra 512GB', cat: 'dien-thoai', brand: 'Samsung', price: 33990000, sale: 29990000, stock: 18, featured: true, specs: { 'Màn hình': '6.8 inch Dynamic AMOLED 2X', Chip: 'Snapdragon 8 Gen 3', Camera: '200MP', Pin: '5000 mAh' } },
    { name: 'Xiaomi 14 5G 256GB', cat: 'dien-thoai', brand: 'Xiaomi', price: 18990000, sale: 16490000, stock: 30, specs: { 'Màn hình': '6.36 inch AMOLED', Chip: 'Snapdragon 8 Gen 3', Camera: '50MP Leica' } },
    { name: 'iPhone 13 128GB', cat: 'dien-thoai', brand: 'Apple', price: 15990000, sale: 13490000, stock: 40, specs: { 'Màn hình': '6.1 inch', Chip: 'A15 Bionic' } },
    { name: 'MacBook Air M3 13 inch 256GB', cat: 'laptop', brand: 'Apple', price: 31990000, sale: 28990000, stock: 12, featured: true, specs: { Chip: 'Apple M3', RAM: '8GB', Ổ: '256GB SSD', 'Màn hình': '13.6 inch Liquid Retina' } },
    { name: 'Dell XPS 13 Plus', cat: 'laptop', brand: 'Dell', price: 38990000, stock: 6, specs: { CPU: 'Intel Core i7-1360P', RAM: '16GB', Ổ: '512GB SSD' } },
    { name: 'Asus ROG Strix G16', cat: 'laptop', brand: 'Asus', price: 35990000, sale: 32490000, stock: 9, specs: { CPU: 'Intel Core i7-13650HX', GPU: 'RTX 4060', RAM: '16GB' } },
    { name: 'Sony WH-1000XM5', cat: 'tai-nghe', brand: 'Sony', price: 7990000, sale: 6490000, stock: 22, featured: true, specs: { Loại: 'Over-ear chống ồn', Pin: '30 giờ', Bluetooth: '5.2' } },
    { name: 'AirPods Pro 2 USB-C', cat: 'tai-nghe', brand: 'Apple', price: 6190000, sale: 5490000, stock: 35, specs: { Loại: 'In-ear', 'Chống ồn': 'ANC chủ động', Pin: '6 giờ' } },
    { name: 'JBL Tune 770NC', cat: 'tai-nghe', brand: 'JBL', price: 2990000, sale: 2490000, stock: 28, specs: { Loại: 'Over-ear', 'Chống ồn': 'ANC', Pin: '70 giờ' } },
    { name: 'Apple Watch Series 9 GPS 45mm', cat: 'dong-ho-thong-minh', brand: 'Apple', price: 12990000, sale: 11490000, stock: 15, featured: true, specs: { 'Màn hình': '1.9 inch', 'Chống nước': '50m', Pin: '18 giờ' } },
    { name: 'Samsung Galaxy Watch 6', cat: 'dong-ho-thong-minh', brand: 'Samsung', price: 8490000, sale: 6990000, stock: 20, specs: { 'Màn hình': '1.5 inch AMOLED', Pin: '40 giờ' } },
    { name: 'Nồi chiên không dầu Philips 6.2L', cat: 'gia-dung', brand: 'Anker', price: 4290000, sale: 3290000, stock: 25, specs: { 'Dung tích': '6.2L', 'Công suất': '2000W' } },
    { name: 'Máy hút bụi Xiaomi G20', cat: 'gia-dung', brand: 'Xiaomi', price: 6990000, sale: 5490000, stock: 11, specs: { 'Công suất hút': '150AW', Pin: '60 phút' } },
    { name: 'Sạc dự phòng Anker 20000mAh', cat: 'phu-kien', brand: 'Anker', price: 1390000, sale: 1090000, stock: 60, specs: { 'Dung lượng': '20000mAh', 'Công suất': '30W PD' } },
    { name: 'Cáp sạc Type-C 100W 2m', cat: 'phu-kien', brand: 'Anker', price: 390000, sale: 290000, stock: 120, specs: { 'Chiều dài': '2m', 'Công suất': '100W' } },
    { name: 'Ốp lưng MagSafe iPhone 15', cat: 'phu-kien', brand: 'Apple', price: 1290000, stock: 80, specs: { 'Chất liệu': 'Silicone', 'Tương thích': 'iPhone 15 series' } },
    { name: 'Chuột không dây Logitech MX Master 3S', cat: 'phu-kien', brand: 'Anker', price: 2490000, sale: 2090000, stock: 33, specs: { 'Kết nối': 'Bluetooth + USB', DPI: '8000' } },
    { name: 'Bàn phím cơ Keychron K2 Pro', cat: 'phu-kien', brand: 'Asus', price: 2690000, sale: 2290000, stock: 17, specs: { Layout: '75%', Switch: 'Gateron Brown' } },
    { name: 'Loa Bluetooth JBL Charge 5', cat: 'tai-nghe', brand: 'JBL', price: 3990000, sale: 3290000, stock: 19, specs: { 'Công suất': '40W', 'Chống nước': 'IP67', Pin: '20 giờ' } },
  ];

  type SeededProduct = Prisma.ProductGetPayload<{ include: { category: { select: { slug: true } } } }>;
  const createdProducts: SeededProduct[] = [];
  for (const [i, p] of productsSeed.entries()) {
    const cat = categories.find((c) => c.slug === p.cat)!;
    const brand = brands.find((b) => b.name === p.brand)!;
    const slug = p.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // 3 ảnh cho mỗi sản phẩm: ảnh chính xác theo tên + ảnh xem thêm cùng danh mục
    const gallery = galleryFor(p.name, p.cat);
    const imageRows = [0, 1, 2].map((k) => {
      const url = gallery[k % gallery.length];
      return {
        url,
        cardUrl: url,
        thumbUrl: url,
        alt: `${p.name} - ảnh ${k + 1}`,
        sortOrder: k,
        isPrimary: k === 0,
      };
    });

    const product = await prisma.product.upsert({
      where: { slug },
      // Chạy lại `npm run seed` sẽ CẬP NHẬT ảnh mới mà KHÔNG xoá đơn hàng đang có
      update: {
        images: { deleteMany: {}, create: imageRows },
      },
      include: { category: { select: { slug: true } } },
      create: {
        name: p.name,
        slug,
        sku: `SKU${String(i + 1).padStart(4, '0')}`,
        shortDesc: `${p.name} chính hãng, bảo hành 12 tháng, giao hàng toàn quốc.`,
        description: `<p><strong>${p.name}</strong> — sản phẩm chính hãng, nguyên seal, bảo hành chính thức 12 tháng.</p><ul><li>Giao hàng nhanh toàn quốc</li><li>Đổi trả trong 7 ngày nếu lỗi nhà sản xuất</li><li>Hỗ trợ trả góp 0% qua thẻ tín dụng</li></ul>`,
        specs: p.specs as Prisma.InputJsonValue,
        price: new Prisma.Decimal(p.price),
        salePrice: p.sale ? new Prisma.Decimal(p.sale) : null,
        costPrice: new Prisma.Decimal(Math.round(p.price * 0.75)),
        stock: p.stock,
        categoryId: cat.id,
        brandId: brand.id,
        tags: [cat.slug, p.brand.toLowerCase(), p.sale ? 'khuyen-mai' : 'hang-moi'],
        isActive: true,
        isFeatured: Boolean(p.featured),
        warrantyMonths: 12,
        weightGram: 500,
        publishedAt: new Date(),
        metaTitle: `${p.name} chính hãng giá tốt | ShopVN`,
        metaDesc: `Mua ${p.name} chính hãng, bảo hành 12 tháng, giao nhanh. Giá chỉ từ ${p.price.toLocaleString('vi-VN')}đ.`,
        images: { create: imageRows },
      },
    });
    createdProducts.push(product);
  }

  // ── Mã giảm giá ────────────────────────────────────────────────────────────
  const coupons = [
    { code: 'WELCOME10', name: 'Chào bạn mới', type: 'PERCENT' as const, value: 10, minOrderValue: 0, maxDiscount: 200000, usageLimit: 1000, usageLimitPerUser: 1 },
    { code: 'GIAM50K', name: 'Giảm 50K đơn từ 500K', type: 'FIXED' as const, value: 50000, minOrderValue: 500000, usageLimit: 500, usageLimitPerUser: 2 },
    { code: 'FREESHIP', name: 'Miễn phí vận chuyển', type: 'FIXED' as const, value: 30000, minOrderValue: 200000, usageLimit: null, usageLimitPerUser: 3 },
    { code: 'SALE20', name: 'Sale lớn 20%', type: 'PERCENT' as const, value: 20, minOrderValue: 2000000, maxDiscount: 500000, usageLimit: 100, usageLimitPerUser: 1 },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        type: c.type,
        value: new Prisma.Decimal(c.value),
        minOrderValue: new Prisma.Decimal(c.minOrderValue),
        maxDiscount: c.maxDiscount ? new Prisma.Decimal(c.maxDiscount) : null,
        usageLimit: c.usageLimit,
        usageLimitPerUser: c.usageLimitPerUser,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 86400000),
        isActive: true,
      },
    });
  }

  // ── Đơn hàng mẫu (để dashboard/thống kê có dữ liệu) ────────────────────────
  const existingOrders = await prisma.order.count();
  if (existingOrders === 0) {
    const allCustomers = [customer, ...extraCustomers];
    const statuses = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPING', 'CONFIRMED', 'PENDING_PAYMENT', 'CANCELLED', 'DELIVERED', 'PACKING', 'DELIVERED'] as const;

    for (let i = 0; i < 24; i++) {
      const buyer = allCustomers[i % allCustomers.length];
      const status = statuses[i % statuses.length];
      const itemCount = 1 + (i % 3);
      const chosen = Array.from({ length: itemCount }, (_, k) => createdProducts[(i * 3 + k) % createdProducts.length]);

      const subtotal = chosen.reduce((s, p) => s + Number((p.salePrice ?? p.price).toString()), 0);
      const shippingFee = subtotal >= 500000 ? 0 : 30000;
      const total = subtotal + shippingFee;
      const daysAgo = 40 - i * 1.5;
      const createdAt = new Date(Date.now() - daysAgo * 86400000);

      const order = await prisma.order.create({
        data: {
          orderCode: `DH${String(createdAt.getFullYear()).slice(-2)}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}${String(10000 + i)}`,
          userId: buyer.id,
          status,
          paymentMethod: i % 3 === 0 ? 'BANK_TRANSFER' : 'COD',
          paymentStatus: status === 'DELIVERED' ? 'PAID' : status === 'CANCELLED' ? 'FAILED' : 'UNPAID',
          shippingAddress: {
            fullName: buyer.fullName,
            phone: buyer.phone ?? '0900000000',
            provinceName: 'TP. Hồ Chí Minh',
            districtName: 'Quận 1',
            wardName: 'Phường Bến Nghé',
            detail: `${i + 1} Lê Lợi`,
          } as Prisma.InputJsonValue,
          recipientName: buyer.fullName,
          recipientPhone: buyer.phone ?? '0900000000',
          subtotal: new Prisma.Decimal(subtotal),
          shippingFee: new Prisma.Decimal(shippingFee),
          totalAmount: new Prisma.Decimal(total),
          createdAt,
          confirmedAt: status !== 'PENDING_PAYMENT' ? createdAt : null,
          deliveredAt: status === 'DELIVERED' ? new Date(createdAt.getTime() + 3 * 86400000) : null,
          items: {
            create: chosen.map((p, k) => {
              const unit = new Prisma.Decimal(Number((p.salePrice ?? p.price).toString()));
              return {
                productId: p.id,
                productName: p.name,
                productSlug: p.slug,
                sku: p.sku,
                imageUrl: productImg(p.name, p.category?.slug ?? 'phu-kien'),
                unitPrice: unit,
                quantity: 1 + (k % 2),
                totalPrice: unit.times(1 + (k % 2)),
              };
            }),
          },
          history: { create: { status, note: 'Dữ liệu mẫu' } },
          payment: {
            create: {
              method: i % 3 === 0 ? 'BANK_TRANSFER' : 'COD',
              amount: new Prisma.Decimal(total),
              status: status === 'DELIVERED' ? 'PAID' : 'UNPAID',
              paidAmount: status === 'DELIVERED' ? new Prisma.Decimal(total) : new Prisma.Decimal(0),
              paidAt: status === 'DELIVERED' ? createdAt : null,
              transferCode: `DH${String(createdAt.getFullYear()).slice(-2)}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}${String(10000 + i)}`,
              bankBin: process.env.BANK_BIN ?? '970436',
              bankAccountNo: process.env.BANK_ACCOUNT_NO ?? '0011000123456',
              bankAccountName: process.env.BANK_ACCOUNT_NAME ?? 'NGUYEN VAN A',
            },
          },
        },
        include: { items: true },
      });

      // Tăng sold cho sản phẩm đã giao
      if (status === 'DELIVERED') {
        await prisma.product.updateMany({
          where: { id: { in: chosen.map((c) => c.id) } },
          data: { sold: { increment: 1 } },
        });

        // Đánh giá mẫu
        for (const [k, p] of chosen.entries()) {
          await prisma.review
            .create({
              data: {
                productId: p.id,
                userId: buyer.id,
                orderId: order.id,
                rating: 4 + (k % 2),
                title: k % 2 === 0 ? 'Sản phẩm rất tốt' : 'Đúng mô tả, giao nhanh',
                content:
                  k % 2 === 0
                    ? 'Hàng chính hãng, đóng gói cẩn thận, giao trong 2 ngày. Rất hài lòng với chất lượng so với giá tiền.'
                    : 'Shop tư vấn nhiệt tình, sản phẩm đúng mô tả. Sẽ ủng hộ shop thêm.',
                images: [],
                status: 'APPROVED',
                isVerified: true,
                helpfulCount: (i + k) % 12,
              },
            })
            .catch(() => {}); // user có thể đã đánh giá sp này ở đơn khác
        }
      }
    }
  }

  // ── Cấu hình shop ──────────────────────────────────────────────────────────
  await prisma.siteSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      siteName: 'ShopVN',
      hotline: '1900 1234',
      email: 'hotro@shopvn.vn',
      address: '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
      taxCode: '0312345678',
      bankBin: process.env.BANK_BIN ?? '970436',
      bankAccountNo: process.env.BANK_ACCOUNT_NO ?? '0011000123456',
      bankAccountName: process.env.BANK_ACCOUNT_NAME ?? 'NGUYEN VAN A',
      bankName: 'Vietcombank',
      social: {
        facebook: 'https://facebook.com/shopvn',
        instagram: 'https://instagram.com/shopvn',
        tiktok: 'https://tiktok.com/@shopvn',
        youtube: 'https://youtube.com/@shopvn',
        zalo: 'https://zalo.me/0900000000',
      } as Prisma.InputJsonValue,
      shippingFees: { STANDARD: 30000, EXPRESS: 50000, INSTANT: 80000 } as Prisma.InputJsonValue,
      freeShipThreshold: new Prisma.Decimal(500000),
      seoTitle: 'ShopVN — Mua sắm trực tuyến chính hãng',
      seoDesc: 'Hàng nghìn sản phẩm chính hãng: điện thoại, laptop, tai nghe, gia dụng. Giao nhanh, đổi trả 7 ngày.',
    },
  });

  // ── Đồng bộ ảnh cho các dòng hàng ĐÃ CÓ (đơn cũ vẫn dùng ảnh picsum) ────────
  if (createdProducts.length) {
    let synced = 0;
    for (const p of createdProducts) {
      const rows = await prisma.orderItem.updateMany({
        where: { productSlug: p.slug },
        data: { imageUrl: productImg(p.name, p.category?.slug ?? 'phu-kien') },
      });
      synced += rows.count;
    }
    if (synced > 0) console.log(`   🖼️  Đã cập nhật ảnh cho ${synced} dòng hàng trong đơn cũ`);
  }

  console.log('✅ Seed xong!');
  console.log(`   👑 Admin   : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`   👤 Customer: ${USER_EMAIL} / ${USER_PASSWORD}`);
  console.log(`   📦 ${createdProducts.length} sản phẩm, ${categories.length} danh mục, ${brands.length} thương hiệu`);
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
