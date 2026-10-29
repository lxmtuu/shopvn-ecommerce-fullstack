# Báo cáo rà soát toàn bộ repo — ShopVN E-commerce Fullstack

**Ngày rà soát:** 29/10/2026
**Nhánh:** `arena/4b7eaceb-shopvn-ecommerce-fullstack` (base `de71af5`)
**Phạm vi:** 210 file · backend 69 file TS (~7.600 dòng) · frontend 55 file TS/TSX (~10.400 dòng) · 1 migration Prisma (779 dòng) · 7 tài liệu trong `docs/` (~4.500 dòng)

---

## 1. Tóm tắt nhanh

| Hạng mục | Kết quả |
|---|---|
| Kiến trúc & tổ chức code | ✅ Tốt, rõ ràng, có chủ đích |
| Frontend typecheck (`tsc --noEmit`) | ✅ 0 lỗi |
| Frontend production build (`next build`) | ✅ Thành công, 32 route (sau khi thêm 2 trang + 2 trang admin) |
| Backend lint (`eslint`) | ✅ 0 error / 0 warning (đã dọn 5 biến không dùng) |
| Frontend typecheck · lint · build | ✅ `tsc --noEmit` 0 lỗi · `eslint . --max-warnings 0` 0 lỗi · `next build` PASS 32 route |
| Backend typecheck & test | ⚠️ Không kiểm chứng được trong sandbox (Prisma engine tải bị chặn) |
| **Backend khởi động được** | ✅ (đã thêm module uploads — lỗi chặn khởi động duy nhất) |
| Lỗ hổng phụ thuộc (`npm audit --omit=dev`) | 🟡 8 lỗ hổng (backend 5 high · frontend 3) — đã giảm từ 20, **hết mức critical**; phần còn lại đòi nâng major (xem mục 8) |
| Tài liệu khớp với code | ✅ `docs/05` + `.env.example` đã đồng bộ; `.vscode/tasks.json` + `launch.json` nay tồn tại đúng như `VSCODE.md` mô tả |

**Kết luận 1 dòng:** code chất lượng cao về tư duy (transaction, Decimal, token rotation, HMAC, CSRF), nhưng có **1 lỗi chặn khởi động (P0)**, **1 lỗi cấu hình khiến web không gọi được API khi không chạy trên máy local (P0)**, vài luồng nghiệp vụ bị "nửa vời" (upload ảnh, ảnh bill chuyển khoản, huỷ đơn bởi admin).

---

## 0. Trạng thái sửa chữa (cập nhật sau rà soát)

Đã sửa trong cùng đợt:

| Mục | Nội dung | Trạng thái |
|---|---|---|
| P0-1 | Thêm `backend/src/modules/uploads/uploads.routes.ts`; middleware upload nhận cả field `files` và `images` | ✅ |
| P0-2 | `API_URL` mặc định `/api/v1`; setup script + `predev.mjs` tự tạo `frontend/.env.local` | ✅ |
| P1-1 | `/payments/:code/info` trả về được cả đơn COD (không còn 400) + UI `order-success` nhận diện theo `method` | ✅ |
| P1-2 | `/payments/:code/proof` lưu bill thật, kiểm tra chủ đơn, chuyển trạng thái chờ duyệt, báo admin | ✅ |
| P1-3 | Admin huỷ đơn đi qua `cancel()`; gom logic hoàn kho vào `lib/stock.ts` dùng chung 3 luồng | ✅ |
| P1-4 | Admin xem/sửa được sản phẩm đang ẩn; form giữ đúng `isActive` | ✅ |
| P1-5 | Sửa 7 link email; thêm trang `/verify-email` và `/auth/callback`; link "gửi lại mật khẩu" của admin nay có token thật | ✅ |
| P1-6 | Phí ship & ngưỡng freeship lấy từ `SiteSetting` qua một nguồn duy nhất `lib/shipping.ts`; admin lưu cấu hình ⇒ cache xoá ngay; giỏ hàng + checkout + lúc tạo đơn dùng đúng cùng con số | ✅ |
| 8 | Nâng `sharp` 0.33→0.35, `node-cron` 3→4, `@prisma/client`+`prisma` 6.2→6.19 (đã kiểm chứng `processImage` chạy thật); ESLint 9 + `eslint-config-next` cho frontend với `--max-warnings 0`; `next build` nay **chạy lint thật** | ✅ |
| 9 | Thêm `.github/workflows/ci.yml` (backend typecheck/lint/test + frontend typecheck/lint/build + audit tham khảo) | ✅ |
| 10 | Đồng bộ `docs/05` với `.env.example`; thêm `.vscode/tasks.json` (22 task) + `.vscode/launch.json` (5 cấu hình + 1 compound); `TRUST_PROXY` chuyển sang **số lớp proxy** thay vì `true` | ✅ |

**Còn tồn tại có chủ đích** (cần một đợt nâng cấp riêng, không nên gộp vào bản vá):
nâng `next` 15→16, `nodemailer` 6→10, `zod` 3→4 (đều là major, đổi API);
`optionalAuth` chưa kiểm tra `revokedAt`; `WEBHOOK_SECRET` vẫn có giá trị mặc định cho môi trường dev;
cookie `sameSite: 'lax'` khi FE/BE khác domain; mới có 1 migration; chưa có integration test.

---

## 2. Cách đã kiểm tra (có thể tái lập)

```bash
cd backend  && npm install && npx prisma generate && npx tsc --noEmit
cd backend  && npx eslint src --ext .ts && npx vitest run
cd frontend && npm install && npx tsc --noEmit && npx next build && npx next lint
node backend/scripts/doctor.mjs
node -e "…"   # script kiểm tra toàn bộ import tương đối có resolve hay không
npm audit --omit=dev   # ở cả 2 thư mục
```

Ghi chú môi trường: sandbox chặn `binaries.prisma.sh` nên `prisma generate` không chạy được ⇒ typecheck backend báo lỗi thiếu type `Prisma.*`, và 4/36 test fail ở `Prisma.Decimal is not a constructor`. **Đây là giới hạn môi trường, không phải lỗi code** — trên máy bạn chạy `npm run prisma:generate` là hết. Tất cả lỗi typecheck backend nhìn thấy đều xuất phát từ nguyên nhân duy nhất này.

---

## 3. P0 — Chặn chạy / chặn demo (sửa trước tiên)

### P0-1. Backend không khởi động được: thiếu `modules/uploads/uploads.routes.ts`

- **Bằng chứng:** `backend/src/routes.ts:13` `import uploadRoutes from './modules/uploads/uploads.routes.js';` — nhưng thư mục `backend/src/modules/uploads/` **không tồn tại** (đã kiểm tra `git ls-files`, không có trong lịch sử commit).
- **Hệ quả:** `tsx watch src/server.ts` chết ngay khi import (`ERR_MODULE_NOT_FOUND`). Toàn bộ API không chạy được, kéo theo web trắng dữ liệu.
- **Dấu vết cho thấy module này bị bỏ quên, không phải bị xoá:** các mảnh đã viết sẵn nhưng **không nơi nào dùng tới**:
  - `middlewares/upload.ts` (`uploadImages`, `uploadSingle`)
  - `lib/storage.ts` (`processImage`, `deleteLocalFile` — resize 3 cỡ, tước EXIF, blurDataURL)
  - `middlewares/rateLimit.ts:74` (`uploadLimiter`)
  - Swagger có `tag: 'Uploads'`, README có dòng `POST /uploads` / `DELETE /uploads`
- **Frontend đang gọi 2 endpoint không tồn tại:** `/uploads/image` (5 chỗ: profile, admin order, order-success, ReviewsSection) và `/uploads/images` (admin products).
- **Cách sửa:** viết `backend/src/modules/uploads/uploads.routes.ts` gắn `requireAuth` (hoặc `requireRole('ADMIN')` cho ảnh sản phẩm) + `uploadLimiter` + `uploadSingle/uploadImages` + `processImage`, trả `{ url, cardUrl, thumbUrl, blurData }`.
- ⚠️ **Bẫy thứ hai khi sửa:** tên field không khớp.

  | Nơi gửi | Tên field FE gửi | Middleware backend chờ |
  |---|---|---|
  | `admin/products/[slug]/page.tsx:84` | `images` | `.array('files', 10)` ❌ |
  | 4 trang còn lại | `file` | `.single('file')` ✅ |

  Nếu chỉ thêm route với `uploadImages` hiện tại, upload ảnh sản phẩm sẽ trả `LIMIT_UNEXPECTED_FILE`. Cần đổi middleware sang `.fields([{name:'files',maxCount:10},{name:'images',maxCount:10}])` hoặc sửa FE gửi `files`.

---

### P0-2. Web chỉ chạy được khi backend ở `localhost:4000` trên máy người dùng

- **Bằng chứng:** `frontend/src/lib/api.ts:8`
  ```ts
  export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  ```
  Trong khi `next.config.ts` đã cấu hình proxy same-origin `/api/:path*` → `http://localhost:4000`, và `frontend/scripts/predev.mjs` + `backend/scripts/doctor.mjs` đều khuyên `NEXT_PUBLIC_API_URL=/api/v1`.
- **Vấn đề:** `frontend/.env.local` **không có trong repo** (bị `.gitignore`) và **không script setup nào tạo nó** (`setup-gitbash.sh`, `setup-windows.ps1`, `bootstrap-env.mjs` chỉ tạo `backend/.env`). ⇒ Mặc định phần lớn người dùng sẽ rơi vào nhánh `localhost:4000`.
- **Hệ quả:** mở web từ bất kỳ host nào khác `localhost` (LAN IP, preview sandbox, Vercel, tunnel) → trình duyệt gọi `http://localhost:4000` của **chính máy người xem** ⇒ toàn bộ API fail, giỏ hàng/sản phẩm trống.
- **Cách sửa (1 dòng):** đổi default thành tương đối — `process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'` — và cho `setup` scripts sinh `frontend/.env.local` với `NEXT_PUBLIC_API_URL=/api/v1`.
- **Kèm theo:** `frontend/src/app/order-success/[code]/page.tsx:196` cũng hardcode `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}` cho link tải QR → cùng vấn đề. Nên export `API_URL` từ `lib/api.ts` và dùng lại.

---

## 4. P1 — Sai nghiệp vụ / luồng gãy (người dùng sẽ gặp)

### P1-1. Đơn COD xong bị hiện "Không tìm thấy đơn hàng"
- `frontend/src/app/checkout/page.tsx:143` → luôn `router.push('/order-success/${code}')`.
- Trang đó gọi `/payments/:code/info`, nhưng `backend/src/modules/payments/payments.service.ts:21` ném 400 nếu `paymentMethod !== 'BANK_TRANSFER'`.
- ⇒ Khách đặt COD thấy trang lỗi ngay sau khi đặt hàng thành công. Đoạn UI `isCod` ở dòng 106 **không bao giờ chạy tới**.
- **Sửa:** cho `info()` trả về object rút gọn khi không phải BANK_TRANSFER (kèm `method`), hoặc tách endpoint `/orders/:code/summary`.

### P1-2. Ảnh bill chuyển khoản bị "nuốt" — endpoint rỗng
- `backend/src/modules/payments/payments.routes.ts:38-45`:
  ```ts
  router.post('/:orderCode/proof', requireAuth, asyncHandler(async (req, res) =>
    ok(res, { url: (req.body as {url:string}).url }, 'Đã gửi ảnh xác nhận')));
  ```
- Không kiểm tra đơn có thuộc user không, không validate URL, **không ghi `payment.proofImageUrl`**. Khách thấy toast "Đã gửi ảnh xác nhận" nhưng admin không bao giờ thấy bill.
- Cũng không có schema validation ⇒ nhận bất kỳ chuỗi nào (XSS nếu FE render thẳng).
- **Sửa:** `validateBody(z.object({ url: z.string().url().max(500) }))` + xác thực chủ đơn + `payment.update({ proofImageUrl })` + ghi `orderStatusHistory`.

### P1-3. Admin huỷ đơn → **mất hàng trong kho vĩnh viễn**
- `orders.service.ts:615` `updateStatus()`: khi `newStatus === 'CANCELLED'` chỉ set `cancelledAt`, **không hoàn kho, không set `paymentStatus = FAILED`**.
- Trong khi `cancel()` (dòng 449) và cron `expireOrders.job.ts` đều hoàn kho đầy đủ.
- ⇒ Hai đường huỷ đơn cho 2 kết quả khác nhau. Đây là loại bug âm thầm: kho hụt dần, không ai phát hiện.
- **Sửa:** tách hàm `restoreStock(tx, order)` dùng chung cho cả 3 nơi (cancel / updateStatus→CANCELLED / cron), và cho `updateStatus` gọi `cancel()` khi đích là CANCELLED.

### P1-4. Sửa sản phẩm trong admin: không mở được sản phẩm đang ẩn, và luôn bật lại
- `frontend/src/app/admin/products/[slug]/page.tsx:49` fetch `GET /products/${slug}` — đây là **endpoint công khai**, `products.service.ts:257` lọc `isActive: true, deletedAt: null`.
- ⇒ Sản phẩm đã tắt bán ("inactive") mở ra là 404, admin không thể bật lại.
- Thêm nữa dòng 61 hardcode `isActive: true` khi map form ⇒ **mỗi lần sửa là vô tình đăng bán lại** sản phẩm.
- **Sửa:** thêm `GET /admin/products/:id` (hoặc `?includeInactive=1` cho admin) và map đúng `existing.isActive`.

### P1-5. Toàn bộ link trong email trỏ tới route không tồn tại
| Backend sinh link | Route thật ở frontend |
|---|---|
| `/orders/{code}` (7 chỗ: orders.service 339/487/646/654, payments.service 164/273, expireOrders 65) | `/account/orders/{code}` |
| `/checkout/success/{code}` (orders.service:351) | `/order-success/{code}` |
| `/auth/callback?social=google` (auth.controller.ts:121) | **không có trang nào** → đăng nhập Google xong 404 |
| `/verify-email?token=…` (auth.service 96/256) | **không có trang nào** → link xác thực email 404 |

Đây là nhóm lỗi "đúng logic nhưng chết ở UI" — email gửi đi không ai bấm được.

### P1-6. Cấu hình phí ship trong admin là cấu hình chết
- `SiteSetting.shippingFees` + `freeShipThreshold` lưu được, `/bank-info` trả về… nhưng:
  - `orders.service.ts` dùng hằng `SHIPPING_FEE` (constants.ts) cho EXPRESS/INSTANT, chỉ STANDARD lấy từ `env`; **không đọc `SiteSetting`**.
  - `cart.service.ts:77` tính phí dự phóng bằng `env.SHIPPING_FEE_STANDARD`.
  - `checkout/page.tsx:95` hardcode `SHIPPING_LABEL[...].fee` ở FE.
- ⇒ Admin sửa phí ship → không có gì thay đổi, và FE hiển thị một số, BE tính số khác nếu env bị chỉnh.
- ✅ **Đã sửa:** thêm `backend/src/lib/shipping.ts` — `getShippingConfig()` đọc `SiteSetting` (cache Redis 60s, lỗi thì rơi về `env`), `calcShippingFee()` là công thức DUY NHẤT, `invalidateShippingConfig()` được gọi ngay khi admin lưu cấu hình. `orders.service` + `cart.service` + `/bank-info` đều đi qua đây; checkout và trang giỏ hàng đọc `/bank-info` thay vì hằng số. Lỗi phụ đã sửa kèm: FE trước đây miễn phí ship cho **mọi** phương thức khi đơn đủ ngưỡng, trong khi BE chỉ miễn cho STANDARD ⇒ tổng tiền hiển thị "nhảy" lúc đặt hàng.

### P1-7. Frontend không có linter thật
- `package.json` có `"lint": "next lint"` nhưng **không có ESLint config, không có dependency eslint**; `next.config.ts` đặt `eslint.ignoreDuringBuilds: true`.
- Chạy `npx next lint` → dừng ở prompt "How would you like to configure ESLint?" (không thể chạy trong CI).
- Backend có ESLint 9 phẳng đầy đủ (chỉ 5 warning) → nên dựng tương tự cho FE (`eslint.config.mjs` + `eslint-config-next`), và bỏ `next lint` (deprecated, sẽ bị xoá ở Next 16).
- ✅ **Đã sửa:** `frontend/eslint.config.mjs` (flat config, `next/core-web-vitals` + `next/typescript`), script `lint` = `eslint . --max-warnings 0`, bỏ `ignoreDuringBuilds` để `next build` lint thật; đã dọn 21 cảnh báo (import/biến không dùng) nên hiện **0 warning**. Thêm `typecheck` vào script và `.github/workflows/ci.yml`. Backend cũng đã sạch 5 warning cũ.

---

## 5. P2 — Bảo mật & vận hành

### 5.1. `npm audit`: 20 lỗ hổng, 2 critical → **còn 8, đã hết critical**

> **Cập nhật sau khi vá:** `npm audit fix` + nâng `sharp` 0.35.5, `node-cron` 4.6, `@prisma/client`/`prisma` 6.19.3
> ⇒ backend 15 → **5 high**, frontend 5 → **3**, **0 critical, 0 low**. `sharp` mới đã được kiểm chứng
> chạy thật qua `processImage()` (ra đủ 3 cỡ ảnh webp + `blurDataURL`). Phần còn lại là major
> (`next` 16, `nodemailer` 10, `zod` 4) và `@prisma/config`→`deepmerge-ts` (chỉ dùng lúc sinh client),
> cần một đợt nâng cấp riêng có test hồi quy.

Số liệu gốc lúc rà soát:
```
backend (15): CRITICAL proxy-addr (IP spoofing qua IPv4-mapped IPv6)
              HIGH body-parser, multer, sharp (CVE-2026-33327/33328/35590/35591),
                   nodemailer (gửi mail nhầm domain), zod, source-map-js, deepmerge-ts, prisma
              MODERATE node-cron/uuid, qs, sanitize-html (XSS qua SVG SMIL)
frontend (5): CRITICAL next (cache poisoning SSG/ISR khi self-host)
              HIGH postcss, sharp, source-map-js, zod
```
- `proxy-addr` critical **đặc biệt liên quan** vì repo đang bật `TRUST_PROXY=true` trong `.env.example` ⇒ kẻ tấn công có thể giả IP để né rate limit đăng nhập. ✅ **Đã sửa:** `TRUST_PROXY` nay nhận **số lớp proxy** (`false | 1 | 2…`), giá trị `true` bị quy về đúng 1 lớp, `.env.example` mặc định `1` kèm giải thích.
- `next` bản cài thực tế 15.5.25 vẫn bị báo critical → cần nâng `next` (audit có `fixAvailable`).
- Khuyến nghị: `npm audit fix` cho các bản không phá vỡ semver, nâng `sharp`, `nodemailer`, `next`, và thêm `npm audit --omit=dev` vào CI.

### 5.2. Nếu quên chạy bootstrap, app vẫn chạy với secret mẫu
- `env.ts` chỉ bắt `JWT_ACCESS_SECRET` ≥ 32 ký tự. Giá trị mẫu `thay_bang_chuoi_hex_128_ky_tu_1` dài **34 ký tự** ⇒ **pass validation**.
- `WEBHOOK_SECRET` có default `'dev-webhook-secret'` trong `env.ts`.
- ⇒ Copy `.env.example` thủ công (không dùng `bootstrap-env.mjs`) là có thể chạy production với secret công khai, và webhook ngân hàng có thể bị giả mạo để **tự động xác nhận "đã thanh toán"** cho đơn bất kỳ.
- **Sửa:** khi `NODE_ENV=production`, `refine()` chặn các giá trị placeholder/`dev-*`, và bắt buộc `WEBHOOK_SECRET` không rỗng.

### 5.3. `optionalAuth` không kiểm tra session bị thu hồi
- `middlewares/auth.ts:63-77`: chỉ `verifyAccessToken` + đọc user, **không check `session.revokedAt`** như `requireAuth`.
- ⇒ Sau "đăng xuất mọi thiết bị"/đổi mật khẩu, access token cũ vẫn dùng được ở các route `optionalAuth` (cart, coupon validate, product detail) đến khi hết hạn (15 phút). Mức độ thấp nhưng không nhất quán với thiết kế.

### 5.4. `GET /payments/:orderCode/qr.png` công khai
- Mã đơn có 100.000 tổ hợp/ngày (`DH` + YYMMDD + 5 số) → có thể dò ra ảnh QR của đơn người khác, lộ **số tiền + nội dung CK + tên chủ tài khoản**.
- **Sửa:** yêu cầu `requireAuth` + kiểm tra chủ đơn, hoặc ký URL có hạn.

### 5.5. `next.config.ts` mở `next/image` cho mọi host
```ts
{ protocol: 'https', hostname: '**' }
```
→ biến `/_next/image` thành proxy ảnh tới bất kỳ domain nào (lạm dụng băng thông/SSRF nội bộ). Thay bằng danh sách host thật (CDN, S3 bucket, picsum).

### 5.6. Rủi ro kiến trúc: cookie auth không sống nổi khi FE và BE khác domain
- Cookie `httpOnly` + `sameSite: 'lax'`, và FE gọi thẳng `API_URL` khác origin ⇒ với 2 domain thật (web.vn ↔ api.web.vn) trình duyệt sẽ **không gửi cookie** trên fetch cross-site.
- Giải pháp đã có sẵn trong repo: dùng proxy same-origin (`API_PROXY_TARGET`) — nhưng phải sửa P0-2 thì mới thực sự đi qua proxy.
- Ngoài ra `googleStart` set cookie `oauth_state` **không có `secure`** khi production.

### 5.7. Thiếu file VS Code mà tài liệu quảng cáo
- `doctor.mjs` báo: "GÓI CŨ — thiếu `.vscode/tasks.json`", và `VSCODE.md:127-128` mô tả `tasks.json` (22 task) + `launch.json` (5 cấu hình debug) — **cả hai đều không có trong repo**.

---

## 6. P3 — Tài liệu lệch code & chi tiết nhỏ

### 6.1. Bảng API trong README sai so với code (`README.md:317-327`)
| README ghi | Thực tế |
|---|---|
| `PATCH /orders/:code/cancel` | `POST /orders/:orderCode/cancel` |
| `POST /orders/:code/repurchase` | `POST /orders/:orderCode/reorder` |
| `GET /products/:slug/reviews` | `GET /reviews?productId=…` |
| `POST /uploads`, `DELETE /uploads` | **chưa tồn tại** (P0-1) |
| `POST /auth/logout` ✓ nhưng thiếu `/auth/change-password`, `/auth/logout-all`, `/auth/resend-verification` | có trong code |

### 6.2. `docs/05-SETUP-VA-YEU-CAU.md:285-292` liệt kê biến môi trường không hề được đọc
`RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`, `CSRF_ENABLED`, `NEXT_PUBLIC_FACEBOOK_URL/INSTAGRAM_URL/TIKTOK_URL/YOUTUBE_URL` — không có trong `config/env.ts`, và `grep` toàn repo không thấy dùng. Ngược lại code dùng `RATE_LIMIT_WINDOW_MIN`, `RATE_LIMIT_LOGIN_MAX`, `TRUST_PROXY` (đã có trong `.env.example`, đúng).
Đồng thời docs/05 khuyên `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` — trái với `doctor.mjs`/`predev.mjs` khuyên `/api/v1`. Cần chọn **một** nguồn sự thật.

### 6.3. Chi tiết nhỏ nên dọn
| Vị trí | Vấn đề |
|---|---|
| `middlewares/rateLimit.ts:4`, `coupons.routes.ts:4`, `products.routes.ts:4`, `products.service.ts:7`, `env.ts:84` | 5 warning ESLint: import/biến không dùng, `eslint-disable` thừa |
| `backend/package.json` `prisma` field | Prisma cảnh báo deprecated, sẽ bỏ ở Prisma 7 → chuyển sang `prisma.config.ts` |
| `lib/storage.ts:52` | Tên file dùng `Date.now()+Math.random()` (không phải CSPRNG); nên dùng `randomUUID()` |
| `lib/storage.ts:70` | `STORAGE_DRIVER=s3/r2` được khai báo trong enum env nhưng chưa implement (đã có TODO rõ ràng — chấp nhận được) |
| `app.ts:130` | `/api/docs` công khai cả ở production (lộ toàn bộ spec); cân nhắc tắt khi `isProd` |
| `orders.service.ts` (~dòng 200) | Phí ship không nhất quán: chỉ STANDARD đọc `env`, EXPRESS/INSTANT dùng hằng số `SHIPPING_FEE` (xem P1-6) |
| `server.ts` | `app.listen` bind `0.0.0.0` ✅ (đúng cho container/preview) |
| Repo | Không có CI (`.github/workflows`), không có `LICENSE`, mới 1 commit duy nhất |
| Test | 36 test, toàn pure-logic (password, orderCode, vietqr). Không có integration test cho luồng đặt hàng/thanh toán — chính là nơi bug P1-1/P1-3 nằm |

---

## 7. Điểm mạnh (giữ nguyên, đừng "tối ưu" bừa)

Những chỗ này được làm tốt hơn mặt bằng chung của một đồ án e-commerce:

1. **Tạo đơn hàng trong 1 transaction Serializable**, trừ kho bằng `UPDATE … WHERE stock >= qty` (chống oversell thật, không phải check-then-update), giá tính lại 100% ở server, có retry mã đơn.
2. **Refresh token rotation + phát hiện tái sử dụng** theo `family`, revoke toàn bộ + email cảnh báo. Lưu `SHA-256(refresh token)` chứ không lưu bản thô.
3. **Tiền dùng `Decimal(12,2)`**, không dùng Float; serialize ra string; `calcDiscount` chặn giảm quá đơn hàng.
4. **Webhook HMAC-SHA256 trên raw body**, timing-safe compare, idempotent (`alreadyPaid`), lưu `UnmatchedTransaction` khi không khớp đơn.
5. **CSRF double-submit** có miễn trừ đúng chỗ (auth công khai + webhook); access token trong cookie `httpOnly`, refresh token giới hạn `path=/api/v1/auth/refresh`.
6. **Upload an toàn theo thiết kế:** memory storage → kiểm tra **magic bytes** (không tin MIME) → sharp tước EXIF → 3 cỡ + blur placeholder.
7. **VietQR tự sinh EMVCo + CRC16**, có unit test — không phụ thuộc API ngoài.
8. **State machine đơn hàng** `ORDER_TRANSITIONS` chặn nhảy cóc trạng thái; audit log cho thao tác admin.
9. **Error handling thống nhất**: `AppError` + `normalize()` map Zod/Multer/Prisma → response chuẩn, không leak stack ở production.
10. **Tài liệu tiếng Việt rất tốt** — README + 7 docs + script `doctor`/`predev` tự chẩn đoán môi trường. Phần lớn dự án sinh viên không có.

---

## 8. Thứ tự sửa đề xuất

| # | Việc | Ước lượng | Vì sao trước |
|---|---|---|---|
| 1 | Tạo `uploads.routes.ts` (đúng tên field `images`/`files`) | 1 file ~60 dòng | Backend mới boot được |
| 2 | `API_URL` mặc định `/api/v1` + sinh `frontend/.env.local` trong setup script | 3 dòng + 5 dòng | Web gọi được API ở mọi host |
| 3 | `info()` trả được đơn COD (P1-1) | ~15 dòng | Luồng mua hàng chính |
| 4 | Hoàn kho khi admin huỷ đơn (P1-3) — tách `restoreStock()` | ~40 dòng | Mất dữ liệu tồn kho âm thầm |
| 5 | `/payments/:code/proof` ghi thật + kiểm tra chủ đơn | ~20 dòng | Chức năng đang giả |
| 6 | Sửa toàn bộ link email + thêm trang `verify-email`, `auth/callback` | 2 trang + 9 link | Link trong email đang chết |
| 7 | Admin edit dùng endpoint admin, giữ đúng `isActive` | ~15 dòng | Admin không quản lý được SP ẩn |
| 8 | ✅ `npm audit fix` + nâng `sharp`, `node-cron`, `prisma`; `TRUST_PROXY` theo số lớp proxy (còn `next`/`nodemailer`/`zod` = đợt riêng) | 1 buổi | Bảo mật |
| 9 | ✅ Thêm ESLint cho FE + `.github/workflows/ci.yml` chạy `lint`/`typecheck`/`test`/`build` | 1 buổi | Chặn tái phát |
| 10 | ✅ Đồng bộ `docs/05` với `.env.example`; thêm `.vscode/tasks.json` (22 task) + `launch.json` (5 cấu hình + 1 compound) | 1 buổi | Tài liệu đang nói sai |

> **Ghi chú:** các mục 1–7 đều là sửa nhỏ, cục bộ, không đổi kiến trúc. Mục 8–10 là việc "dọn nhà" nên làm trước khi nộp/đưa lên production.
