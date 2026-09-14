/**
 * ============================================================================
 *  ShopVN — TỰ KIỂM TRA TOÀN HỆ THỐNG
 * ============================================================================
 *  Chạy sau khi đã bật hệ thống (bash start-all.sh):
 *
 *      node backend/scripts/kiem-tra.mjs          (hoặc: bash kiem-tra.sh)
 *
 *  Script sẽ tự thử: API, database có dữ liệu, đăng nhập khách/quản trị,
 *  phân quyền, mã QR chuyển khoản, và mở 14 trang web.
 *  Kết quả: [OK] là đạt, [ X] là lỗi kèm lý do.
 *
 *  Lưu ý: mỗi lần chạy chỉ đăng nhập 2 lần (hạn mức là 5 lần/15 phút).
 * ============================================================================
 */

const API = (process.env.API_BASE ?? 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');
const WEB = (process.env.WEB_BASE ?? 'http://localhost:3000').replace(/\/$/, '');

const C = process.stdout.isTTY
  ? { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', b: '\x1b[1m', d: '\x1b[2m', n: '\x1b[0m' }
  : { g: '', r: '', y: '', b: '', d: '', n: '' };

let pass = 0;
const fails = [];

function ok(name, extra = '') {
  pass++;
  console.log(`  ${C.g}[OK]${C.n} ${name}${extra ? ` ${C.d}${extra}${C.n}` : ''}`);
}
function bad(name, why) {
  fails.push(`${name} — ${why}`);
  console.log(`  ${C.r}[ X]${C.n} ${name} ${C.y}${why}${C.n}`);
}
function group(t) {
  console.log(`\n${C.b}>> ${t}${C.n}`);
}

/** Kho cookie đơn giản (đủ dùng cho kịch bản đăng nhập + CSRF). */
function makeJar() {
  const jar = new Map();
  return {
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
    get: (k) => jar.get(k),
    read(res) {
      const raw = typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : [res.headers.get('set-cookie')].filter(Boolean);
      for (const line of raw) {
        const [pair] = String(line).split(';');
        const i = pair.indexOf('=');
        if (i > 0) {
          const k = pair.slice(0, i).trim();
          const v = pair.slice(i + 1).trim();
          if (v === '' || v === 'deleted') jar.delete(k);
          else jar.set(k, v);
        }
      }
      return this;
    },
  };
}

async function req(url, opts = {}) {
  const jar = opts.jar;
  const headers = { ...(opts.headers ?? {}) };
  if (jar && jar.header()) headers.cookie = jar.header();
  const csrf = jar?.get('csrf_token');
  if (csrf && opts.method && opts.method !== 'GET') headers['x-csrf-token'] = csrf;
  if (opts.body) headers['content-type'] = 'application/json';

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    redirect: 'manual',
    signal: AbortSignal.timeout(opts.timeout ?? 15000),
  }).catch((e) => ({ __err: e }));

  if (res.__err) return { status: 0, error: res.__err.message, json: async () => ({}), text: async () => '' };
  jar?.read(res);
  return res;
}

async function login(jar, email, password) {
  await req(`${API}/products?limit=1`, { jar });                       // lấy cookie (kể cả csrf)
  const res = await req(`${API}/auth/login`, { jar, method: 'POST', body: { email, password } });
  let body = {};
  try { body = await res.json(); } catch { /* bỏ qua */ }
  return { status: res.status, user: body?.data?.user, raw: body };
}

async function png(url, jar) {
  const res = await req(url, { jar, timeout: 20000 });
  if (res.status !== 200) return { status: res.status };
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: 200, bytes: buf.length, isPng: buf.subarray(0, 4).toString('hex') === '89504e47' };
}

// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${C.b}ShopVN — tự kiểm tra toàn hệ thống${C.n}`);
  console.log(`${C.d}API: ${API}\nWeb: ${WEB}${C.n}`);

  // ── 1. API + database ─────────────────────────────────────────────────
  group('1. API & database');
  const health = await req(`${API}/health`);
  if (health.status === 200) ok('API phản hồi (GET /health)');
  else bad('API phản hồi (GET /health)', health.status === 0 ? `không kết nối được (${health.error})` : `HTTP ${health.status}`);

  const list = await req(`${API}/products?limit=5`);
  let productCount = 0, firstSlug = null;
  if (list.status === 200) {
    const j = await list.json();
    const items = Array.isArray(j?.data) ? j.data : (j?.data?.items ?? []);
    productCount = j?.meta?.total ?? j?.data?.pagination?.total ?? items.length;
    firstSlug = items[0]?.slug ?? null;
    if (items.length > 0) ok('Sản phẩm lấy được', `(tổng ${productCount})`);
    else bad('Sản phẩm lấy được', 'không có sản phẩm — database trống? chạy: cd backend && npm run seed');
  } else bad('Sản phẩm lấy được', `HTTP ${list.status}`);

  const search = await req(`${API}/products?search=loa&limit=3`);
  if (search.status === 200) ok('Tìm kiếm sản phẩm', '(q=loa)');
  else bad('Tìm kiếm sản phẩm', `HTTP ${search.status}`);

  // ── 2. Đăng nhập & phân quyền ─────────────────────────────────────────
  group('2. Đăng nhập & phân quyền');
  const custJar = makeJar();
  const cust = await login(custJar, 'customer@shop.vn', 'Customer@123456');
  if (cust.status === 200 && cust.user?.role === 'CUSTOMER') {
    ok('Đăng nhập khách hàng', `(${cust.user.email})`);
  } else if (cust.status === 429) {
    bad('Đăng nhập khách hàng', 'quá nhiều lần thử (429) — đợi 15 phút hoặc chạy lại API');
  } else {
    bad('Đăng nhập khách hàng', `HTTP ${cust.status} — tài khoản chưa có? chạy: cd backend && npm run seed`);
  }

  if (cust.status === 200) {
    const prof = await req(`${API}/auth/me`, { jar: custJar });
    if (prof.status === 200) ok('Lấy thông tin cá nhân (GET /auth/me)');
    else bad('Lấy thông tin cá nhân (GET /auth/me)', `HTTP ${prof.status}`);

    const wish = await req(`${API}/wishlist`, { jar: custJar });
    if (wish.status === 200) ok('Danh sách yêu thích (GET /wishlist)');
    else bad('Danh sách yêu thích (GET /wishlist)', `HTTP ${wish.status}`);

    const forbid = await req(`${API}/admin/stats/overview`, { jar: custJar });
    if (forbid.status === 403) ok('Phân quyền: khách KHÔNG vào được trang quản trị', '(đúng như mong đợi)');
    else bad('Phân quyền: khách KHÔNG vào được trang quản trị', `nhận HTTP ${forbid.status}, đáng lẽ là 403`);
  } else {
    console.log(`  ${C.d}(bỏ qua các mục cần đăng nhập)${C.n}`);
  }

  const adminJar = makeJar();
  const adm = await login(adminJar, 'admin@shop.vn', 'Admin@123456');
  if (adm.status === 200 && adm.user?.role === 'ADMIN') ok('Đăng nhập quản trị', `(${adm.user.email})`);
  else bad('Đăng nhập quản trị', `HTTP ${adm.status}`);

  if (adm.status === 200) {
    const stats = await req(`${API}/admin/stats/overview`, { jar: adminJar });
    if (stats.status === 200) {
      const j = await stats.json();
      const rev = j?.data?.revenue?.value ?? j?.data?.revenue;
      ok('Thống kê quản trị', typeof rev === 'number' ? `(doanh thu ${rev.toLocaleString('vi-VN')}đ)` : '');
    } else bad('Thống kê quản trị', `HTTP ${stats.status}`);

    const orders = await req(`${API}/admin/orders?limit=1`, { jar: adminJar });
    let orderCode = null;
    if (orders.status === 200) {
      const j = await orders.json();
      const items = Array.isArray(j?.data) ? j.data : (j?.data?.items ?? []);
      orderCode = items[0]?.orderCode ?? null;
      ok('Danh sách đơn hàng (quản trị)');
    } else bad('Danh sách đơn hàng (quản trị)', `HTTP ${orders.status}`);

    if (orderCode) {
      const qr = await png(`${API}/payments/${orderCode}/qr.png`, adminJar);
      if (qr.status === 200 && qr.isPng) ok('Mã QR chuyển khoản', `(${orderCode} · ${qr.bytes} byte PNG)`);
      else bad('Mã QR chuyển khoản', qr.status === 200 ? 'nội dung trả về không phải ảnh PNG' : `HTTP ${qr.status}`);
    }
  }

  // ── 3. Trang web ──────────────────────────────────────────────────────
  group('3. Trang web (đang chạy ở http://localhost:3000)');
  const pages = [
    ['/', 'Trang chủ'],
    ['/products', 'Danh sách sản phẩm'],
    ['/cart', 'Giỏ hàng'],
    ['/checkout', 'Thanh toán'],
    ['/login', 'Đăng nhập'],
    ['/register', 'Đăng ký'],
    ['/forgot-password', 'Quên mật khẩu'],
    ['/account', 'Tài khoản'],
    ['/account/orders', 'Đơn hàng của tôi'],
    ['/admin', 'Quản trị — tổng quan'],
    ['/admin/products', 'Quản trị — sản phẩm'],
    ['/admin/orders', 'Quản trị — đơn hàng'],
    ['/admin/customers', 'Quản trị — người dùng'],
    ['/admin/coupons', 'Quản trị — mã giảm giá'],
    ['/admin/categories', 'Quản trị — danh mục'],
    ['/terms', 'Điều khoản sử dụng'],
    ['/privacy', 'Chính sách bảo mật'],
  ];
  if (firstSlug) pages.push([`/products/${firstSlug}`, 'Chi tiết sản phẩm']);

  for (const [path, label] of pages) {
    // Lần 1: chờ vừa phải. Ở chế độ dev, Next.js biên dịch trang ngay lần đầu
    // nên có thể lâu hơn — khi đó thử lại lần 2 với thời gian chờ dài hơn.
    let res = await req(`${WEB}${path}`, { timeout: 45000 });
    let retried = false;
    if (res.status !== 200) {
      retried = true;
      if (res.status === 0 && /abort|timeout/i.test(String(res.error))) {
        console.log(`  ${C.d}… ${path} chưa phản hồi (có thể Next.js đang biên dịch) — thử lại…${C.n}`);
      }
      await new Promise((r) => setTimeout(r, 2000));
      res = await req(`${WEB}${path}`, { timeout: 120000 });
    }

    if (res.status === 200) {
      ok(`${label} ${C.d}${path}${C.n}${retried ? ` ${C.d}(lần 2)${C.n}` : ''}`);
    } else if (res.status === 0) {
      const timedOut = /abort|timeout/i.test(String(res.error));
      const webAlive = await new Promise((done) => {
        const s2 = require('node:net').connect({ host: '127.0.0.1', port: Number(new URL(WEB).port || 3000) });
        s2.setTimeout(2500);
        s2.once('connect', () => { s2.destroy(); done(true); });
        s2.once('timeout', () => { s2.destroy(); done(false); });
        s2.once('error', () => done(false));
      });
      bad(`${label} ${path}`, !webAlive
        ? 'máy chủ website ĐÃ TẮT — thường do hết RAM ở chế độ dev. Cách sửa: bash start-all.sh prod'
        : timedOut
          ? 'hết thời gian chờ — Next.js còn đang biên dịch. Thử lại sau ~15 giây, hoặc dùng: bash start-all.sh prod'
          : `không kết nối được (${res.error}) — xem: bash xem-log.sh web`);
      if (!timedOut) break;
    } else {
      bad(`${label} ${path}`, `HTTP ${res.status}`);
    }
  }

  // ── Tổng kết ─────────────────────────────────────────────────────────
  console.log('');
  if (fails.length === 0) {
    console.log(`${C.g}${C.b}════════════════════════════════════════════════════${C.n}`);
    console.log(`${C.g}${C.b}  ✅ TẤT CẢ ĐỀU ĐẠT — ${pass} mục kiểm tra${C.n}`);
    console.log(`${C.g}${C.b}════════════════════════════════════════════════════${C.n}`);
    console.log(`\n  Mở trình duyệt:  http://localhost:3000\n`);
    process.exit(0);
  }
  console.log(`${C.r}${C.b}════════════════════════════════════════════════════${C.n}`);
  console.log(`${C.r}${C.b}  ■ CÓ ${fails.length} MỤC LỖI (đạt ${pass} mục)${C.n}`);
  console.log(`${C.r}${C.b}════════════════════════════════════════════════════${C.n}`);
  for (const f of fails) console.log(`  • ${f}`);
  console.log(`\n  Cần giúp?  bash chan-doan.sh   rồi gửi file chan-doan-ket-qua.txt\n`);
  process.exit(1);
})();
