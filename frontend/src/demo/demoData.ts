/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DỮ LIỆU DEMO cho bản xem trước trên hosting không có backend
 * ═══════════════════════════════════════════════════════════════════════════
 *  Mục đích: cho phép deploy RIÊNG frontend (Vercel, Netlify…) và vẫn bấm xem
 *  được mọi trang. Chỉ hoạt động khi đặt biến môi trường `DEMO_MODE=1` —
 *  không có biến này thì `/demo-api/*` trả 404 và ứng dụng dùng backend thật
 *  như bình thường.
 *
 *  ⚠️ Đây là dữ liệu TĨNH để xem giao diện: không có đăng nhập thật, không lưu
 *  giỏ hàng, không tạo được đơn. Muốn dùng thật thì chạy backend + PostgreSQL.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const money = (n: number) => String(n);

const cat = {
  phone: { id: 'c1', name: 'Điện thoại', slug: 'dien-thoai', parentId: null },
  laptop: { id: 'c2', name: 'Laptop', slug: 'laptop', parentId: null },
  audio: { id: 'c3', name: 'Tai nghe', slug: 'tai-nghe', parentId: null },
  watch: { id: 'c4', name: 'Đồng hồ thông minh', slug: 'dong-ho-thong-minh', parentId: null },
  home: { id: 'c5', name: 'Gia dụng', slug: 'gia-dung', parentId: null },
  acc: { id: 'c6', name: 'Phụ kiện', slug: 'phu-kien', parentId: null },
};

const brand = {
  apple: { id: 'b1', name: 'Apple', slug: 'apple' },
  samsung: { id: 'b2', name: 'Samsung', slug: 'samsung' },
  sony: { id: 'b3', name: 'Sony', slug: 'sony' },
  xiaomi: { id: 'b4', name: 'Xiaomi', slug: 'xiaomi' },
  dell: { id: 'b5', name: 'Dell', slug: 'dell' },
  logitech: { id: 'b6', name: 'Logitech', slug: 'logitech' },
  philips: { id: 'b7', name: 'Philips', slug: 'philips' },
};

interface Seed {
  id: string;
  name: string;
  slug: string;
  img: string;
  price: number;
  salePrice: number | null;
  cat: typeof cat.phone;
  brand: { id: string; name: string; slug: string };
  sold: number;
  rating: number;
  reviewCount: number;
  stock: number;
}

const SEED: Seed[] = [
  { id: 'p1', name: 'iPhone 15 Pro Max 256GB', slug: 'iphone-15-pro-max-256gb', img: 'phone-1', price: 34990000, salePrice: 31490000, cat: cat.phone, brand: brand.apple, sold: 128, rating: 4.8, reviewCount: 42, stock: 18 },
  { id: 'p2', name: 'Samsung Galaxy S24 Ultra 512GB', slug: 'samsung-galaxy-s24-ultra-512gb', img: 'phone-2', price: 33990000, salePrice: 29990000, cat: cat.phone, brand: brand.samsung, sold: 96, rating: 4.7, reviewCount: 31, stock: 25 },
  { id: 'p3', name: 'Xiaomi 14 5G 256GB', slug: 'xiaomi-14-5g-256gb', img: 'phone-3', price: 19990000, salePrice: null, cat: cat.phone, brand: brand.xiaomi, sold: 74, rating: 4.6, reviewCount: 19, stock: 33 },
  { id: 'p4', name: 'MacBook Air M3 13 inch 256GB', slug: 'macbook-air-m3-13-inch-256gb', img: 'laptop-1', price: 27990000, salePrice: 26490000, cat: cat.laptop, brand: brand.apple, sold: 58, rating: 4.9, reviewCount: 27, stock: 12 },
  { id: 'p5', name: 'Dell XPS 13 Plus', slug: 'dell-xps-13-plus', img: 'laptop-2', price: 32990000, salePrice: null, cat: cat.laptop, brand: brand.dell, sold: 31, rating: 4.5, reviewCount: 14, stock: 8 },
  { id: 'p6', name: 'Sony WH-1000XM5', slug: 'sony-wh-1000xm5', img: 'audio-1', price: 8490000, salePrice: 6990000, cat: cat.audio, brand: brand.sony, sold: 210, rating: 4.8, reviewCount: 88, stock: 46 },
  { id: 'p7', name: 'AirPods Pro 2 USB-C', slug: 'airpods-pro-2-usb-c', img: 'audio-2', price: 5990000, salePrice: 5490000, cat: cat.audio, brand: brand.apple, sold: 320, rating: 4.7, reviewCount: 102, stock: 64 },
  { id: 'p8', name: 'Apple Watch Series 9 GPS 45mm', slug: 'apple-watch-series-9-gps-45mm', img: 'watch-1', price: 10990000, salePrice: 9990000, cat: cat.watch, brand: brand.apple, sold: 88, rating: 4.7, reviewCount: 36, stock: 21 },
  { id: 'p9', name: 'Samsung Galaxy Watch 6', slug: 'samsung-galaxy-watch-6', img: 'watch-2', price: 6990000, salePrice: null, cat: cat.watch, brand: brand.samsung, sold: 63, rating: 4.4, reviewCount: 22, stock: 30 },
  { id: 'p10', name: 'Nồi chiên không dầu Philips 6.2L', slug: 'noi-chien-khong-dau-philips-6-2l', img: 'home-1', price: 3290000, salePrice: 2790000, cat: cat.home, brand: brand.philips, sold: 152, rating: 4.6, reviewCount: 47, stock: 55 },
  { id: 'p11', name: 'Máy hút bụi Xiaomi G20', slug: 'may-hut-bui-xiaomi-g20', img: 'home-2', price: 4990000, salePrice: 4290000, cat: cat.home, brand: brand.xiaomi, sold: 47, rating: 4.3, reviewCount: 16, stock: 4 },
  { id: 'p12', name: 'Chuột không dây Logitech MX Master 3S', slug: 'chuot-khong-day-logitech-mx-master-3s', img: 'accessory-4', price: 2490000, salePrice: 2190000, cat: cat.acc, brand: brand.logitech, sold: 401, rating: 4.9, reviewCount: 133, stock: 72 },
];

const image = (img: string) => `/img/products/${img}.jpg`;

const card = (s: Seed) => ({
  id: s.id,
  name: s.name,
  slug: s.slug,
  thumbnail: image(s.img),
  thumbUrl: image(s.img),
  blurData: null,
  price: money(s.price),
  salePrice: s.salePrice ? money(s.salePrice) : null,
  effectivePrice: money(s.salePrice ?? s.price),
  discountPercent: s.salePrice ? Math.round((1 - s.salePrice / s.price) * 100) : 0,
  isOnSale: Boolean(s.salePrice),
  stock: s.stock,
  inStock: s.stock > 0,
  sold: s.sold,
  isFeatured: true,
  tags: ['Chính hãng', 'Bảo hành 12 tháng'],
  warrantyMonths: 12,
  brand: s.brand,
  category: { id: s.cat.id, name: s.cat.name, slug: s.cat.slug },
  avgRating: s.rating,
  reviewCount: s.reviewCount,
});

const CARDS = SEED.map(card);

const REVIEWS = [
  {
    id: 'r1', rating: 5, title: 'Đúng mô tả, máy đẹp',
    content: 'Máy nguyên seal, giao trong 2 ngày. Pin dùng cả ngày không hết, camera chụp đêm rất tốt. Shop đóng gói cẩn thận, có tặng kèm ốp lưng.',
    images: [], isVerified: true, helpfulCount: 24,
    adminReply: 'Cảm ơn anh đã tin tưởng ShopVN! Cần hỗ trợ gì anh nhắn shop nhé.',
    createdAt: '2026-10-12T09:10:00.000Z', user: { fullName: 'Nguyễn Văn An', avatarUrl: null },
  },
  {
    id: 'r2', rating: 5, title: 'Nâng cấp từ 13 Pro rất đáng',
    content: 'Màn 120Hz mượt, sạc USB-C tiện vì dùng chung cáp với MacBook. Nhiệt độ ổn định khi chơi game 30 phút.',
    images: [], isVerified: true, helpfulCount: 11, adminReply: null,
    createdAt: '2026-10-08T15:30:00.000Z', user: { fullName: 'Trần Thị Bích', avatarUrl: null },
  },
  {
    id: 'r3', rating: 4, title: 'Tốt nhưng hơi nặng',
    content: 'Máy hơi nặng so với bản thường, cầm lâu mỏi tay. Còn lại mọi thứ ổn, giao hàng nhanh.',
    images: [], isVerified: true, helpfulCount: 5, adminReply: null,
    createdAt: '2026-09-28T11:05:00.000Z', user: { fullName: 'Lê Quốc Huy', avatarUrl: null },
  },
];

const CART = {
  id: 'cart1',
  items: [
    {
      id: 'ci1', productId: 'p1', variantId: null, name: 'iPhone 15 Pro Max 256GB', slug: 'iphone-15-pro-max-256gb',
      variantName: 'Titan tự nhiên', image: image('phone-1'), blurData: null,
      unitPrice: money(31490000), quantity: 1, lineTotal: money(31490000), stock: 18, inStock: true,
      available: true, exceedsStock: false, maxQuantity: 18,
    },
    {
      id: 'ci2', productId: 'p6', variantId: null, name: 'Sony WH-1000XM5', slug: 'sony-wh-1000xm5',
      variantName: null, image: image('audio-1'), blurData: null,
      unitPrice: money(6990000), quantity: 2, lineTotal: money(13980000), stock: 46, inStock: true,
      available: true, exceedsStock: false, maxQuantity: 46,
    },
  ],
  totalQuantity: 3, distinctCount: 2, subtotal: money(45470000), shippingFeeEstimate: money(0),
  freeShippingThreshold: 500000, amountToFreeShipping: money(0), totalEstimate: money(45470000), hasIssues: false,
};

const ORDER = {
  id: 'o1', orderCode: 'DH26103012345', status: 'SHIPPING', paymentMethod: 'BANK_TRANSFER', paymentStatus: 'PAID',
  subtotal: money(31490000), shippingFee: money(0), discountAmount: money(1000000), totalAmount: money(30490000),
  couponCode: 'SHOPVN10', shippingMethod: 'STANDARD', recipientName: 'Nguyễn Văn A', recipientPhone: '0901234567',
  shippingAddress: { provinceName: 'TP. Hồ Chí Minh', districtName: 'Quận 1', wardName: 'Phường Bến Nghé', detail: '123 Lê Lợi' },
  note: null, trackingCode: 'GHN2610300012', createdAt: '2026-10-28T03:20:00.000Z',
  confirmedAt: '2026-10-28T03:40:00.000Z', shippedAt: '2026-10-29T01:00:00.000Z', deliveredAt: null,
  cancelledAt: null, paymentDueAt: null, canCancel: false, bankInfo: null,
  itemCount: 1,
  previewItems: [{ name: 'iPhone 15 Pro Max 256GB', image: image('phone-1'), quantity: 1 }],
  items: [{
    id: 'oi1', productName: 'iPhone 15 Pro Max 256GB', variantName: 'Titan tự nhiên', productSlug: 'iphone-15-pro-max-256gb',
    sku: 'IP15PM-256', imageUrl: image('phone-1'), unitPrice: money(31490000), quantity: 1, totalPrice: money(31490000),
  }],
  history: [
    { id: 'h1', status: 'PENDING_PAYMENT', note: 'Khách tạo đơn', createdAt: '2026-10-28T03:20:00.000Z' },
    { id: 'h2', status: 'CONFIRMED', note: 'Đã nhận chuyển khoản', createdAt: '2026-10-28T03:40:00.000Z' },
    { id: 'h3', status: 'SHIPPING', note: 'Đơn vị vận chuyển đã lấy hàng', createdAt: '2026-10-29T01:00:00.000Z' },
  ],
  payment: { id: 'pay1', status: 'PAID', amount: money(30490000), paidAmount: money(30490000), paidAt: '2026-10-28T03:38:00.000Z' },
};

const DEMO_USER = {
  id: 'u1', email: 'admin@shop.vn', fullName: 'Nguyễn Quản Trị', phone: '0901234567', avatarUrl: null,
  role: 'ADMIN', emailVerified: true, createdAt: '2026-01-01T00:00:00.000Z', _count: { orders: 12, wishlist: 3 },
};

const detail = (slug: string) => {
  const s = SEED.find((x) => x.slug === slug) ?? SEED[0];
  const base = card(s);
  const main = image(s.img);
  const alt = s.img.replace(/-1$/, '-2');
  const second = alt !== s.img && SEED.some((x) => x.img === alt) ? image(alt) : main;

  return {
    ...base,
    sku: 'IP15PM-256',
    isActive: true,
    shortDesc: 'Chip A17 Pro, khung titan, camera 48MP zoom quang 5x — bản chính hãng VN/A, bảo hành 12 tháng.',
    description:
      'iPhone 15 Pro Max là thế hệ flagship với khung titan nhẹ hơn 19g so với thép không gỉ, viền màn hình mỏng hơn và nút Tác vụ mới.\nCamera chính 48MP cho phép chụp ảnh độ phân giải siêu cao, zoom quang 5x trên ống kính tele tiềm vọng.\nCổng USB-C hỗ trợ truyền dữ liệu tốc độ cao và sạc nhanh 27W.',
    specs: {
      'Màn hình': '6.7 inch Super Retina XDR 120Hz', Chip: 'Apple A17 Pro', RAM: '8GB',
      'Bộ nhớ': '256GB', Camera: '48MP + 12MP + 12MP', Pin: '4441 mAh',
    },
    viewCount: 12480,
    lowStockAlert: 5,
    weightGram: 221,
    images: [
      { id: 'i1', url: main, cardUrl: main, thumbUrl: main, blurData: null, alt: s.name },
      { id: 'i2', url: second, cardUrl: second, thumbUrl: second, blurData: null, alt: s.name },
    ],
    variants: [
      { id: 'v1', name: 'Titan tự nhiên', sku: 'IP15PM-256-TN', price: money(34990000), salePrice: money(31490000), effectivePrice: money(31490000), stock: 18, imageUrl: main, attributes: { 'Màu sắc': 'Titan tự nhiên' }, isActive: true },
      { id: 'v2', name: 'Titan xanh', sku: 'IP15PM-256-TX', price: money(34990000), salePrice: money(31490000), effectivePrice: money(31490000), stock: 7, imageUrl: second, attributes: { 'Màu sắc': 'Titan xanh' }, isActive: true },
    ],
    category: { ...s.cat, parentId: null },
    coupons: [{ code: 'SHOPVN10', type: 'PERCENT', value: money(10), minOrderValue: money(5000000), expiresAt: '2026-12-31T00:00:00.000Z' }],
    rating: {
      average: s.rating,
      count: s.reviewCount,
      distribution: [
        { star: 5, count: Math.round(s.reviewCount * 0.72) },
        { star: 4, count: Math.round(s.reviewCount * 0.18) },
        { star: 3, count: Math.round(s.reviewCount * 0.06) },
        { star: 2, count: Math.round(s.reviewCount * 0.03) },
        { star: 1, count: Math.round(s.reviewCount * 0.01) },
      ],
    },
    latestReviews: REVIEWS,
    isWishlisted: false,
  };
};

const ok = (data: unknown) => ({ success: true, message: 'OK', data });
const paged = (data: unknown, total: number) => ({
  success: true,
  message: 'OK',
  data,
  meta: { page: 1, limit: 10, total, totalPages: 1, hasNext: false, hasPrev: false },
});

/** Trả dữ liệu demo theo path (đã bỏ tiền tố /demo-api/v1) */
export function demoResponse(path: string, _query: URLSearchParams, method = 'GET'): unknown {
  if (path === '/bank-info')
    return ok({
      bankBin: '970436', bankName: 'Vietcombank', accountNo: '0011000123456', accountName: 'NGUYEN VAN A',
      hotline: '1900 1234', email: 'hotro@shopvn.vn',
      social: { facebook: 'https://facebook.com/shopvn', instagram: 'https://instagram.com/shopvn' },
      siteName: 'ShopVN', shippingFees: { STANDARD: 30000, EXPRESS: 50000, INSTANT: 80000 }, freeShipThreshold: 500000,
    });

  if (path === '/categories') return ok(Object.values(cat).map((c) => ({ ...c, productCount: 24, children: [] })));
  if (path === '/brands') return ok(Object.values(brand).map((b) => ({ ...b, count: 12 })));

  if (path === '/products') {
    return {
      ...paged(CARDS, CARDS.length),
      facets: { brands: Object.values(brand).map((b) => ({ ...b, count: 12 })), priceRange: { min: 2190000, max: 34990000 } },
    };
  }
  if (path === '/products/featured' || path === '/products/best-sellers' || path === '/products/newest') return ok(CARDS);
  if (path === '/products/suggestions')
    return ok(CARDS.slice(0, 5).map((c) => ({ name: c.name, slug: c.slug, thumbnail: c.thumbnail, price: c.effectivePrice })));
  if (path.endsWith('/related')) return ok(CARDS.slice(1, 5));
  if (path.startsWith('/products/')) return ok(detail(path.replace('/products/', '')));

  if (path === '/reviews') {
    if (method === 'POST') return { success: true, message: 'Cảm ơn bạn! Đánh giá đang chờ duyệt.', data: REVIEWS[0] };
    return paged(REVIEWS, REVIEWS.length);
  }

  // Giỏ hàng demo: mọi thao tác đều trả lại giỏ mẫu (không lưu thật)
  if (path === '/cart' || path === '/cart/merge' || path.startsWith('/cart/items')) return ok(CART);
  if (path === '/coupons/validate') return ok({ code: 'SHOPVN10', discountAmount: money(1000000), description: 'Giảm 10%' });
  if (path === '/addresses')
    return ok([
      {
        id: 'a1', fullName: 'Nguyễn Văn A', phone: '0901234567', provinceName: 'TP. Hồ Chí Minh',
        districtName: 'Quận 1', wardName: 'Phường Bến Nghé', detail: '123 Lê Lợi',
        note: 'Giao giờ hành chính', isDefault: true,
      },
    ]);
  if (path === '/coupons/available')
    return ok([
      { code: 'SHOPVN10', name: 'Giảm 10% đơn từ 5 triệu', description: 'Áp dụng cho toàn bộ sản phẩm', minOrderValue: money(5000000), eligible: true },
      { code: 'FREESHIP', name: 'Miễn phí vận chuyển', description: 'Đơn từ 2 triệu', minOrderValue: money(2000000), eligible: true },
    ]);
  if (path === '/wishlist') return ok(CARDS.slice(0, 3));

  // Đăng nhập demo: nhận mọi tài khoản/mật khẩu để xem được cả khu quản trị
  if (path === '/auth/login') return ok({ user: DEMO_USER });
  if (path === '/auth/me') return ok(DEMO_USER);
  if (path === '/auth/logout' || path === '/auth/refresh') return ok({ ok: true });

  if (path === '/orders') {
    // Đặt hàng (demo): trả mã đơn để FE chuyển sang trang cảm ơn
    if (method === 'POST') return ok({ orderCode: ORDER.orderCode, totalAmount: ORDER.totalAmount });
    return paged([ORDER], 1);
  }
  if (path.startsWith('/payments/')) {
    return ok({
      orderCode: ORDER.orderCode, method: 'BANK_TRANSFER', status: 'PENDING', orderStatus: 'PENDING_PAYMENT',
      amount: ORDER.totalAmount, paidAmount: money(0), transferContent: ORDER.orderCode, qrPayload: null,
      qrDataUrl: null, expiresAt: null, expired: false, secondsLeft: 1800, proofImageUrl: null,
      bank: { bin: '970436', name: 'Vietcombank', accountNo: '0011000123456', accountName: 'NGUYEN VAN A', branch: 'Hội Sở' },
    });
  }
  if (path.startsWith('/orders/')) return ok(ORDER);

  // ── QUẢN TRỊ ────────────────────────────────────────────────────────────
  if (path === '/admin/stats/overview')
    return ok({
      revenue: { value: money(486250000), previous: money(401300000), changePercent: 21.2 },
      orders: { value: 168, previous: 142, changePercent: 18.3, delivered: 141, deliveredPrevious: 120 },
      customers: { value: 92, previous: 74, changePercent: 24.3 },
      avgOrderValue: { value: money(2894345), previous: money(2826056), changePercent: 2.4 },
      cancelRate: 3.6,
      alerts: { pendingPayments: 4, lowStock: 2, pendingReviews: 3 },
    });
  if (path === '/admin/stats/revenue') {
    const labels = ['01/10', '05/10', '09/10', '13/10', '17/10', '21/10', '25/10', '29/10'];
    return ok(labels.map((label, i) => ({ label, revenue: 38000000 + i * 5400000 + (i % 3) * 7300000, orders: 14 + i * 2 })));
  }
  if (path === '/admin/stats/orders-by-status')
    return ok([
      { status: 'DELIVERED', count: 141 }, { status: 'SHIPPING', count: 12 }, { status: 'CONFIRMED', count: 7 },
      { status: 'PENDING_PAYMENT', count: 4 }, { status: 'CANCELLED', count: 6 }, { status: 'RETURN_REQUESTED', count: 2 },
    ]);
  if (path === '/admin/stats/top-products')
    return ok([
      { productId: 'p1', name: 'iPhone 15 Pro Max 256GB', soldQuantity: 128, revenue: money(4030720000), stock: 18, thumbnail: image('phone-1') },
      { productId: 'p6', name: 'Sony WH-1000XM5', soldQuantity: 210, revenue: money(1467900000), stock: 46, thumbnail: image('audio-1') },
      { productId: 'p7', name: 'AirPods Pro 2 USB-C', soldQuantity: 320, revenue: money(1756800000), stock: 64, thumbnail: image('audio-2') },
      { productId: 'p10', name: 'Nồi chiên không dầu Philips 6.2L', soldQuantity: 152, revenue: money(424080000), stock: 55, thumbnail: image('home-1') },
      { productId: 'p12', name: 'Chuột Logitech MX Master 3S', soldQuantity: 401, revenue: money(878190000), stock: 72, thumbnail: image('accessory-4') },
    ]);
  if (path === '/admin/stats/low-stock')
    return ok([
      { id: 'p5', name: 'Dell XPS 13 Plus', sku: 'DELL-XPS13', stock: 8, lowStockAlert: 10, isOut: false },
      { id: 'p11', name: 'Máy hút bụi Xiaomi G20', sku: 'XIAO-G20', stock: 4, lowStockAlert: 10, isOut: false },
    ]);
  if (path === '/admin/stats/recent-orders')
    return ok([
      { orderCode: 'DH26103012345', totalAmount: money(30490000), status: 'SHIPPING', paymentMethod: 'BANK_TRANSFER', createdAt: '2026-10-28T03:20:00.000Z', user: { fullName: 'Nguyễn Văn A', email: 'a@example.com' } },
      { orderCode: 'DH26102912001', totalAmount: money(6990000), status: 'DELIVERED', paymentMethod: 'COD', createdAt: '2026-10-29T02:10:00.000Z', user: { fullName: 'Trần Thị B', email: 'b@example.com' } },
      { orderCode: 'DH26102911230', totalAmount: money(10990000), status: 'CONFIRMED', paymentMethod: 'VNPAY', createdAt: '2026-10-29T06:45:00.000Z', user: { fullName: 'Lê Quốc C', email: 'c@example.com' } },
    ]);
  if (path === '/admin/stats/payment-methods')
    return ok([
      { paymentMethod: 'BANK_TRANSFER', count: 74 }, { paymentMethod: 'COD', count: 61 },
      { paymentMethod: 'VNPAY', count: 22 }, { paymentMethod: 'MOMO', count: 11 },
    ]);
  if (path === '/admin/products')
    return paged(
      SEED.map((s) => ({
        ...card(s),
        sku: `SKU-${s.id.toUpperCase()}`,
        isActive: true,
        lowStockAlert: 5,
        viewCount: 1200 + s.sold * 7,
        variantCount: 2,
        orderCount: s.sold,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-10-20T00:00:00.000Z',
      })),
      SEED.length,
    );
  if (path === '/admin/orders')
    return {
      ...paged([
        { ...ORDER, user: { fullName: 'Nguyễn Văn A', email: 'a@example.com' }, recipientName: 'Nguyễn Văn A', recipientPhone: '0901234567', trackingCode: 'GHN2610300012' },
        { ...ORDER, id: 'o2', orderCode: 'DH26102912001', status: 'DELIVERED', paymentMethod: 'COD', paymentStatus: 'PAID', totalAmount: money(6990000), createdAt: '2026-10-29T02:10:00.000Z', trackingCode: null, user: { fullName: 'Trần Thị B', email: 'b@example.com' }, recipientName: 'Trần Thị B', recipientPhone: '0912345678' },
        { ...ORDER, id: 'o3', orderCode: 'DH26102911230', status: 'CONFIRMED', paymentMethod: 'VNPAY', paymentStatus: 'PAID', totalAmount: money(10990000), createdAt: '2026-10-29T06:45:00.000Z', trackingCode: null, user: { fullName: 'Lê Quốc C', email: 'c@example.com' }, recipientName: 'Lê Quốc C', recipientPhone: '0987654321' },
      ], 3),
      meta: { page: 1, limit: 10, total: 3, totalPages: 1, hasNext: false, hasPrev: false, totalRevenue: money(48480000) },
    };
  if (path === '/admin/settings')
    return ok({
      siteName: 'ShopVN', logoUrl: null, hotline: '1900 1234', email: 'hotro@shopvn.vn',
      address: '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh', taxCode: '0312345678',
      social: { facebook: 'https://facebook.com/shopvn', instagram: 'https://instagram.com/shopvn', tiktok: '', youtube: '' },
      bankBin: '970436', bankAccountNo: '0011000123456', bankAccountName: 'NGUYEN VAN A', bankName: 'Vietcombank',
      shippingFees: { STANDARD: 30000, EXPRESS: 50000, INSTANT: 80000 }, freeShipThreshold: 500000,
      seoTitle: 'ShopVN — Đồ điện tử chính hãng', seoDesc: 'Laptop, điện thoại, phụ kiện chính hãng giá tốt.', maintenance: false,
    });
  if (path === '/admin/customers')
    return paged([
      { id: 'u1', fullName: 'Nguyễn Văn A', email: 'a@example.com', phone: '0901234567', role: 'CUSTOMER', status: 'ACTIVE', createdAt: '2026-02-10T00:00:00.000Z', _count: { orders: 6 } },
      { id: 'u2', fullName: 'Trần Thị B', email: 'b@example.com', phone: '0912345678', role: 'CUSTOMER', status: 'ACTIVE', createdAt: '2026-03-04T00:00:00.000Z', _count: { orders: 3 } },
    ], 2);
  if (path === '/admin/reviews')
    return paged(
      REVIEWS.map((r) => ({ ...r, product: { name: 'iPhone 15 Pro Max 256GB', slug: 'iphone-15-pro-max-256gb' }, status: 'PENDING' })),
      REVIEWS.length,
    );
  if (path === '/admin/categories') return ok(Object.values(cat).map((c) => ({ ...c, productCount: 24 })));
  if (path === '/admin/brands') return ok(Object.values(brand).map((b) => ({ ...b, productCount: 12 })));
  if (path === '/admin/coupons' || path === '/admin/audit-logs') return paged([], 0);

  return ok({});
}
