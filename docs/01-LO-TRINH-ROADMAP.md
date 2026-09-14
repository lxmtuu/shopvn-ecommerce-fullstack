# 🗺️ LỘ TRÌNH XÂY DỰNG E-COMMERCE FULLSTACK (Production-grade)

> **Mục tiêu:** Chứng minh bạn có thể tự tay xây **một hệ thống hoàn chỉnh** — không phải demo CRUD.
> **Thời lượng tham chiếu:** 10 tuần (~15–20h/tuần), chia 8 phase. Có thể nén xuống 6 tuần nếu làm full-time.
> **Nguyên tắc xuyên suốt:** *Mỗi tuần phải có thứ chạy được (demo-able). Không build "ngầm" 3 tuần rồi mới bật lên.*

---

## 0. Định vị dự án (đọc trước khi viết dòng code đầu tiên)

Đây là **project portfolio chính**. Nhà tuyển dụng không đọc hết code — họ xem:

| Họ quan tâm | Bạn phải có |
|---|---|
| Sản phẩm chạy được | Deploy live + tài khoản demo admin/customer |
| Kiến trúc rõ ràng | Sơ đồ kiến trúc, ERD, API spec trong `docs/` |
| Code sạch, có tổ chức | Layer rõ (route → controller → service → repository), TypeScript strict |
| Bảo mật | Refresh token rotation, RBAC, rate limit, validation, OWASP checklist |
| UI chỉn chu | Animation mượt, responsive thật, dark mode, skeleton, empty state |
| Trắc nghiệm & CI | Ít nhất unit test cho service + 1 e2e flow, GitHub Actions |

**Câu chuyện kể trong CV / phỏng vấn:**
> "Tôi xây một sàn TMĐT full-stack: Next.js App Router + Express REST API + PostgreSQL/Prisma. Điểm tôi tự hào nhất là luồng thanh toán chuyển khoản: hệ thống sinh mã VietQR chuẩn EMVCo, mỗi đơn có mã đối soát riêng, và webhook ngân hàng tự động xác nhận thanh toán. Bảo mật dùng refresh-token rotation có phát hiện tái sử dụng, RBAC 3 tầng, và toàn bộ input validate bằng Zod."

---

## 1. Stack chốt (và lý do chọn)

| Layer | Công nghệ | Vì sao |
|---|---|---|
| Frontend | **Next.js 15 (App Router)** + React 19 | SSR/ISR cho SEO sản phẩm, Server Components giảm JS bundle |
| Ngôn ngữ | **TypeScript strict** | Bắt lỗi sớm, share type giữa FE/BE |
| Styling | **Tailwind CSS v4** + CSS variables design token | Nhanh, nhất quán, dark mode dễ |
| UI primitives | **Radix UI** (headless) tự style theo design system riêng | Accessibility chuẩn, không bị "nhìn là biết shadcn mặc định" |
| Animation | **Framer Motion** + Tailwind transitions | Chỉn chu, không giật |
| State | **Zustand** (client state: cart/wishlist/UI) + **TanStack Query** (server state) | Tách đúng loại state — điểm cộng lớn khi phỏng vấn |
| Form | **React Hook Form + Zod** | Validate 1 lần, dùng chung schema với backend |
| Backend | **Node.js + Express 5 + TypeScript** | REST thuần, dễ đọc, thể hiện rõ middleware/RBAC |
| ORM | **Prisma** | Type-safe, migration rõ ràng, seed dễ |
| Database | **PostgreSQL 16** | Transaction, JSONB, full-text search |
| Auth | **JWT (opaque-style)** access 15' + refresh 7 ngày, httpOnly cookie, rotation | Bảo mật thực chiến |
| Validate | **Zod** | Một nguồn sự thật cho schema |
| Upload | **Multer + sharp** (local/S3/R2) | Resize + strip EXIF |
| Thanh toán | **VietQR (EMVCo)** + webhook đối soát; mở rộng VNPay/MoMo | Đúng bối cảnh VN |
| Mail | **Nodemailer** + template HTML (Resend/SMTP) | Verify email, quên mật khẩu, xác nhận đơn |
| Chart | **Recharts** | Dashboard admin |
| Test | **Vitest** (unit) + **Supertest** (API) + **Playwright** (e2e) | Có test = khác biệt lớn |
| DevOps | **Docker Compose**, GitHub Actions, Vercel (FE) + Railway/Render (BE) + Neon (DB) | Deploy được = điểm cộng tuyệt đối |

---

## 2. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────┐
│                   NEXT.JS 15 (App Router)                    │
│  Server Components (SEO, ISR)  │  Client Components (interact)│
│  Zustand: cart/wishlist/auth-ui │  TanStack Query: server data│
└───────────────┬──────────────────────────────────────────────┘
                │  REST /api/v1  (credentials: include, CSRF header)
┌───────────────▼──────────────────────────────────────────────┐
│                    EXPRESS REST API (Node)                   │
│  middleware → route → validate(Zod) → controller → service   │
│                                  ↓                            │
│                          repository (Prisma)                  │
│  Cross-cutting: auth(RBAC) · error handler · rate limit ·     │
│                 logger(pino) · CSRF · helmet · upload         │
└───────┬───────────────────────────┬──────────────────────────┘
        │                           │
┌───────▼────────┐        ┌─────────▼──────────┐      ┌──────────────┐
│  PostgreSQL 16 │        │  Redis (tùy chọn)  │      │  Storage     │
│  Prisma models │        │  cache · ratelimit │      │  local/S3/R2 │
└────────────────┘        └────────────────────┘      └──────────────┘
        ▲
        │  webhook (HMAC verify)
┌───────┴──────────────────────────────────────────────────────┐
│  Ngân hàng / Casso / Sepay  →  tự động xác nhận đơn đã CK     │
└──────────────────────────────────────────────────────────────┘
```

### Cấu trúc thư mục (đã có sẵn trong repo này)

```
ecommerce-fullstack/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # ~30 model
│   │   ├── migrations/
│   │   └── seed.ts                # dữ liệu mẫu: 6 danh mục, 40 sản phẩm, 2 user, 20 đơn
│   └── src/
│       ├── config/                # env, constants
│       ├── lib/                   # prisma, jwt, password, mailer, logger, vietqr, uploader
│       ├── middlewares/           # auth, rbac, validate, error, rateLimit, csrf, notFound
│       ├── modules/               # auth · users · products · categories · brands
│       │                          # cart · wishlist · orders · payments · reviews
│       │                          # coupons · addresses · uploads · admin(stats)
│       │   └── <module>/          # .routes.ts  .controller.ts  .service.ts  .schema.ts
│       ├── utils/                 # AppError, asyncHandler, pagination, slug, money
│       ├── templates/email/       # HTML email
│       ├── app.ts                 # express app + middleware chain
│       └── server.ts              # bootstrap + graceful shutdown
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (shop)/            # home, products, product detail, cart, checkout…
│       │   ├── (auth)/            # login, register, forgot/reset password
│       │   ├── (account)/         # profile, orders, wishlist, addresses
│       │   └── admin/             # dashboard, products, orders, users, statistics
│       ├── components/            # ui/ (primitives) · shop/ · admin/ · layout/
│       ├── hooks/                 # useAuth, useCart, useDebounce, useMediaQuery
│       ├── lib/                   # apiClient (fetch + CSRF + refresh), utils, format
│       ├── store/                 # cart.store.ts, wishlist.store.ts, ui.store.ts
│       └── types/                 # mirror type từ backend
├── docs/                          # 6 tài liệu (bạn đang đọc 1 trong số đó)
├── docker-compose.yml
└── .env.example
```

---

## 3. Lộ trình 10 tuần — chi tiết từng phase

### 🟦 PHASE 0 — Chuẩn bị (1–2 ngày)
**Việc cần làm**
- Cài Node 20 (nvm), Docker Desktop, VS Code + extension (ESLint, Prettier, Prisma, Tailwind IntelliSense, Error Lens).
- Tạo repo GitHub, `main` + `develop`, conventional commits.
- Đọc `docs/05-SETUP-VA-YEU-CAU.md` → chuẩn bị API key / tài khoản (mục *Prerequisites*).
- Viết ADR đầu tiên: "Vì sao tách FE/BE thay vì Next.js API Routes".

**Definition of Done:** `docker compose up -d` chạy được PostgreSQL; `psql` kết nối thành công.

---

### 🟦 PHASE 1 — Nền móng & Database (Tuần 1)

| Ngày | Công việc | Kết quả |
|---|---|---|
| 1 | `docker-compose.yml` (postgres + pgadmin + redis). Khởi tạo backend Express + TS (tsconfig strict, path alias `@/*`) | Server `GET /health` trả 200 |
| 2 | Chuỗi middleware: helmet → cors → json → cookie → logger(pino) → rate limit | Log request ra console có requestId |
| 3 | **Thiết kế Prisma schema** toàn bộ (User, Product, Order, …) — xem `03-KIEN-TRUC-VA-DATABASE.md` | `npx prisma migrate dev` xanh |
| 4 | Seed script: categories, brands, 40 products có ảnh thật, coupons, 2 tài khoản demo | `prisma studio` thấy dữ liệu |
| 5 | Error handling: `AppError`, `asyncHandler`, `notFound`, `errorHandler` map Prisma error code → HTTP | Test bằng Postman, đúng status code |
| 6 | Repository + pagination util, response envelope `{ success, data, meta }` chuẩn hóa | Mọi API sau này dùng chung format |
| 7 | CI: GitHub Actions chạy lint + typecheck + test | Badge xanh trên README |

**DoD tuần 1:** Có DB đầy đủ + nền tảng backend vững, đã có CI.

---

### 🟦 PHASE 2 — Authentication & Authorization (Tuần 2) 🔐

Đây là phần **ăn điểm nhiều nhất** — làm kỹ.

**Tính năng**
1. `POST /auth/register` — Zod validate, hash bcrypt(12), gửi email verify.
2. `POST /auth/login` — trả access (15') + refresh (7 ngày); **httpOnly cookie**, `SameSite=Lax`, `Secure` ở prod.
3. `POST /auth/refresh` — **rotation**: refresh cũ bị revoke, cấp cặp token mới. Nếu refresh cũ bị dùng lại → **revoke toàn bộ session của user** (phát hiện token theft).
4. `POST /auth/logout` (1 thiết bị) / `logout-all` (mọi thiết bị).
5. `POST /auth/forgot-password` — luôn trả 200 (không leak email tồn tại hay không), token hash SHA-256 lưu DB, TTL 15', dùng 1 lần.
6. `POST /auth/reset-password` — đổi mật khẩu + revoke mọi session cũ + email thông báo.
7. `GET /auth/verify-email?token=…` + `resend-verification`.
8. `GET /auth/me`, `PATCH /auth/change-password`, `GET /auth/sessions`, `DELETE /auth/sessions/:id`.
9. **Google OAuth** (`/auth/google`, `/auth/google/callback`) — liên kết mạng xã hội. Bảng `Account` lưu provider + providerAccountId.
10. Rate limit riêng: login 5 lần/15', forgot-password 3 lần/giờ. Khoá tạm sau 5 lần sai.

**Middleware RBAC**
```ts
requireAuth          // verify access token → req.user
requireRole('ADMIN') // 403 nếu không đủ quyền
requireOwner(...)    // chặn user A xem đơn của user B (IDOR)
optionalAuth         // có thì gắn user, không thì thôi (guest cart)
```

**DoD tuần 2:** Postman collection chạy hết 12 endpoint auth; có test cho rotation & reuse detection.

---

### 🟦 PHASE 3 — Catalog: Product / Category / Brand / Search / Filter (Tuần 3)

**Backend**
- `GET /products` — query params:
  `q, category, brand, minPrice, maxPrice, rating, inStock, tags, sort (newest|price_asc|price_desc|best_selling|rating), page, limit`
  → Prisma `where` động + `orderBy`, trả `meta: { page, limit, total, totalPages }`.
- `GET /products/:slug` — kèm variants, images, specs, review summary, sản phẩm liên quan.
- `GET /products/suggestions?q=` — autocomplete (trả 5 kết quả, cache 60s).
- `GET /categories` (dạng cây), `GET /brands`.
- **Search nâng cao:** `pg_trgm` + `unaccent` (tìm "dien thoai" ra "điện thoại") — viết raw query trong migration.
- Admin CRUD: `POST/PATCH/DELETE /products`, soft delete, ghi `AuditLog`.

**Frontend**
- `/products` — **sidebar filter** (desktop) / **bottom sheet filter** (mobile), sort dropdown, grid/list toggle, phân trang, skeleton grid.
- URL là **source of truth** cho filter (share link được, back/forward hoạt động) — dùng `useSearchParams`.
- `/products/[slug]` — gallery zoom, chọn variant (đổi giá/tồn kho theo variant), sticky "Mua ngay" bar trên mobile, tabs (Mô tả / Thông số / Đánh giá / Vận chuyển).
- Debounce search 300ms, transition `Framer Motion` cho grid item xuất hiện.

**DoD tuần 3:** Tìm "tai nghe" + filter category + giá 200k–1tr + sort giảm dần → đúng kết quả, URL chia sẻ được.

---

### 🟦 PHASE 4 — Cart · Wishlist · Address · Coupon (Tuần 4)

- **Cart linh hoạt:** user chưa đăng nhập dùng **guest cart** (`cartId` trong cookie 30 ngày) → **merge vào cart DB khi login**. Đây là chi tiết nhỏ nhưng gây ấn tượng mạnh.
- `GET/POST/PATCH/DELETE /cart/items` — kiểm tra tồn kho realtime, cảnh báo khi vượt `stock`.
- **Wishlist:** thêm/bớt, chuyển từ wishlist → cart.
- **Address book:** CRUD, tỉnh/phường theo **API đơn vị hành chính VN** (hoặc dữ liệu JSON tĩnh 34 tỉnh mới), địa chỉ mặc định.
- **Coupon:** `POST /coupons/validate` — kiểm tra `isActive`, thời gian, `minOrderValue`, `usageLimit`, tính discount, trả lỗi rõ ràng.
- **Mini cart drawer** (animation trượt từ phải), badge số lượng ở header, optimistic update.
- Áp dụng coupon ở UI hiển thị dòng "Giảm giá" trong summary.

**DoD tuần 4:** Thêm 3 sản phẩm khi chưa login → login → giỏ vẫn còn, đúng số lượng.

---

### 🟦 PHASE 5 — Order + Checkout + Thanh toán chuyển khoản/QR (Tuần 5) 💳

> Đây là **trái tim** của dự án. Làm chắc phase này.

**Luồng checkout 3 bước (stepper có animation)**
```
Bước 1: Thông tin nhận hàng (chọn địa chỉ có sẵn | nhập mới)
Bước 2: Vận chuyển (Tiêu chuẩn 30k / Nhanh 50k / Hỏa tốc 80k) + Mã giảm giá + Ghi chú
Bước 3: Phương thức thanh toán
         ○ COD (thanh toán khi nhận hàng)
         ○ Chuyển khoản ngân hàng (hiện QR VietQR)   ← trọng tâm
         ○ Ví điện tử (VNPay/MoMo sandbox — mở rộng)
→ Xác nhận → POST /orders (transaction: trừ kho, tạo order + items + history + payment)
```

**Thanh toán chuyển khoản + QR (chi tiết)**
1. Khi tạo đơn chọn `BANK_TRANSFER`, backend sinh:
   - `transferCode` duy nhất, ví dụ `DH26091400123` (đối soát bằng mã này).
   - **VietQR payload chuẩn EMVCo** (tự build, không phụ thuộc dịch vụ ngoài) → render PNG bằng thư viện `qrcode` (server-side, trả data URI hoặc `GET /payments/:orderCode/qr.png`).
   - `qrPayload` + `bankInfo` lưu vào bảng `Payment`.
2. Trang `/checkout/success/[orderCode]` hiển thị: QR lớn, số tài khoản + nút **Copy**, số tiền, **nội dung chuyển khoản chính xác**, **đồng hồ đếm ngược 24h** hết hạn giữ đơn, nút "Tôi đã chuyển khoản" (→ `paymentStatus = PENDING_REVIEW`).
3. **Tự động đối soát:** `POST /webhooks/bank` nhận callback từ **Casso / SePay** (verify HMAC signature), match `transferCode` trong nội dung CK → cập nhật `paymentStatus = PAID`, `order.status = CONFIRMED`, gửi email xác nhận, ghi `OrderStatusHistory`.
4. **Fallback thủ công:** Admin xem danh sách chờ duyệt, upload ảnh bill → `PATCH /admin/orders/:id/payment` xác nhận.
5. **Đơn hết hạn:** cron job mỗi 15' — đơn `PENDING_PAYMENT` quá 24h → `CANCELLED`, hoàn tồn kho.

**Order management (customer)**
- `/orders` (filter theo trạng thái, search mã đơn), `/orders/[code]` — **timeline dọc có animation** theo `OrderStatusHistory`.
- Hủy đơn (chỉ khi `PENDING_PAYMENT`/`CONFIRMED`), yêu cầu trả hàng, mua lại (re-order).

**State machine trạng thái đơn (validate chuyển trạng thái, không cho nhảy bừa)**
```
PENDING_PAYMENT → CONFIRMED → PACKING → SHIPPING → DELIVERED
       ↓              ↓          ↓
   CANCELLED      CANCELLED   CANCELLED
DELIVERED → RETURN_REQUESTED → REFUNDED
```

**DoD tuần 5:** Đặt đơn CK → quét QR bằng app ngân hàng thật ra đúng STK/số tiền/nội dung → giả lập webhook → đơn tự chuyển "Đã thanh toán".

---

### 🟦 PHASE 6 — Admin Panel (Tuần 6)

| Trang | Nội dung |
|---|---|
| **Dashboard** | 4 KPI card (doanh thu, đơn, khách mới, TB/đơn) có animation đếm số; line chart doanh thu 30 ngày; donut trạng thái đơn; top 5 sản phẩm bán chạy; 5 đơn mới nhất |
| **Products** | Bảng có sort/filter/bulk action; drawer form tạo/sửa (upload nhiều ảnh kéo-thả, preview, sắp xếp); toggle ẩn/hiện inline |
| **Orders** | Bảng + filter trạng thái/ngày/PTTT; xem chi tiết; **cập nhật trạng thái có xác nhận**; xác nhận thanh toán; in hoá đơn |
| **Users** | Danh sách, tìm kiếm, xem chi tiết (đơn hàng, tổng chi tiêu), **khoá/mở khoá**, đổi role |
| **Categories / Brands** | CRUD dạng cây |
| **Coupons** | CRUD mã giảm giá |
| **Reviews** | Duyệt / ẩn đánh giá |
| **Statistics** | Doanh thu theo danh mục, theo tháng; tỷ lệ chuyển đổi; sản phẩm sắp hết hàng; export CSV |
| **Settings** | Thông tin shop, STK ngân hàng (dùng cho QR), phí ship, liên kết mạng xã hội ở footer |

**Bảo vệ:** mọi route `/admin/*` chặn bằng middleware ở **cả Next.js (layout guard) và backend (requireRole)** — nhớ nhấn mạnh: *"bảo vệ ở FE chỉ là UX, chốt chặn thật là ở API"*.

**DoD tuần 6:** Đăng nhập tài khoản admin → tạo sản phẩm có ảnh → nó hiện ngay bên shop; user thường truy cập `/admin` bị chặn cả 2 tầng.

---

### 🟦 PHASE 7 — Polish UI/UX & Animation (Tuần 7) ✨

Đây là phase khiến sản phẩm **"trông có tiền"**.

**Design system (làm 1 lần, dùng mọi nơi)**
- Bảng màu: `brand` (primary), `surface`, `muted`, `success/warning/danger`; dark mode qua `class` strategy.
- Typography scale, spacing scale, radius (8/12/16/999), shadow 4 cấp, transition tokens.
- Component: Button (5 variant × 4 size × loading state), Input, Select, Checkbox, Radio, Modal (Radix + focus trap), Drawer, Tooltip, Tabs, Badge, Skeleton, Toast (sonner), Pagination, EmptyState, Breadcrumb, Rating stars.

**Chuyển động (nhớ nguyên tắc: mục đích > hào nhoáng)**
| Vị trí | Hiệu ứng |
|---|---|
| Chuyển trang | Fade + slide-up nhẹ 0.25s, không chặn tương tác |
| Hero | Gradient động + ảnh floating, parallax nhẹ theo chuột |
| Product card | Hover: nâng 4px, shadow tăng, ảnh scale 1.05, nút "Thêm vào giỏ" trượt lên |
| Grid sản phẩm | Stagger fade-in (delay 30ms/item, chỉ 12 item đầu) |
| Thêm vào giỏ | Bay vào icon giỏ + badge bounce + toast |
| Skeleton | Shimmer, khớp layout thật (không layout shift) |
| Filter/Drawer | Spring physics, backdrop blur |
| Checkout | Stepper progress line vẽ dần, đếm số tiền |
| Scroll | Header sticky đổi nền + blur khi cuộn; nút scroll-to-top |
| Micro | Nút có ripple/press-scale 0.97, focus ring rõ |

**Bắt buộc kiểm**: `prefers-reduced-motion` → tắt animation; ảnh `next/image` với `sizes`; lazy load; skeleton cho mọi fetch.

**DoD tuần 7:** Lighthouse (mobile) ≥ 90 ở Performance/Accessibility/Best Practices/SEO.

---

### 🟦 PHASE 8 — Hardening, Test, Deploy, Viết hồ sơ (Tuần 8–10)

**Bảo mật — checklist OWASP Top 10 (xem chi tiết `04-BAO-MAT-VA-TICH-HOP.md`)**
- [ ] Helmet + CSP, ẩn `x-powered-by`
- [ ] Rate limit toàn cục 100 req/15'/IP + riêng cho auth/upload/checkout
- [ ] Validate **mọi** input bằng Zod (body + query + params)
- [ ] Prisma parameterized → chống SQLi; DOMPurify/sanitize-html cho nội dung rich text
- [ ] Chống IDOR: query luôn kèm `userId` của chính chủ
- [ ] Upload: whitelist MIME + magic bytes, max 5MB, random filename, strip EXIF, không serve file thực thi
- [ ] Cookie: httpOnly, Secure, SameSite; CSRF double-submit token
- [ ] Secrets qua `.env` + validation lúc khởi động (fail fast), không commit .env
- [ ] Log không chứa password/token/PII; không leak stack trace ra client ở prod
- [ ] `npm audit` + Dependabot bật

**Test**
- Unit (Vitest): `auth.service` (hash, token, rotation), `vietqr` (build payload + CRC đúng), `order.service` (tính tiền, trừ kho, không âm kho), `coupon.service`.
- API (Supertest): luồng register → login → thêm cart → checkout → xem đơn; case 401/403/400/404.
- E2E (Playwright): 3 kịch bản — mua hàng COD, mua hàng CK (thấy QR), admin tạo sản phẩm.

**Deploy**
| Thành phần | Nền tảng | Ghi chú |
|---|---|---|
| Frontend | Vercel | Env `NEXT_PUBLIC_API_URL` |
| Backend | Railway / Render / Fly.io | Dockerfile multi-stage, `prisma migrate deploy` trong release |
| Database | Neon / Supabase | Connection pooling (`?pgbouncer=true&connection_limit=1`) |
| Redis | Upstash | Rate limit phân tán |
| Storage | Cloudflare R2 / S3 | Ảnh sản phẩm |
| Domain | Tên miền riêng + HTTPS bắt buộc | `api.` và `www.` |

**Hồ sơ dự án (Project README — quan trọng ngang code)**
- Banner + mô tả 1 câu + **link demo + tài khoản demo**
- Ảnh/GIF demo (dùng ScreenToGif / LICEcap)
- Sơ đồ kiến trúc + ERD + screenshot
- Bảng tính năng, tech stack có logo
- Hướng dẫn chạy local (3 lệnh), biến môi trường
- Mục "Security", "Testing", "Roadmap tương lai"
- ADR cho 3–5 quyết định kỹ thuật lớn

**DoD cuối:** Người lạ clone repo → chạy `npm run setup` → có app chạy trong ≤ 10 phút.

---

## 4. Bảng tổng hợp tiến độ (dùng để tự check)

| Phase | Tuần | Sản phẩm bàn giao | Trạng thái |
|---|---|---|---|
| 0 | – | Môi trường + repo + ADR | ⬜ |
| 1 | 1 | DB schema, Express nền tảng, CI | ⬜ |
| 2 | 2 | Auth đầy đủ + RBAC | ⬜ |
| 3 | 3 | Catalog, search, filter | ⬜ |
| 4 | 4 | Cart, wishlist, address, coupon | ⬜ |
| 5 | 5 | Checkout, order, **thanh toán QR** | ⬜ |
| 6 | 6 | Admin panel + thống kê | ⬜ |
| 7 | 7 | UI/UX polish + animation + a11y | ⬜ |
| 8 | 8–10 | Test, deploy, hồ sơ | ⬜ |

---

## 5. Rủi ro thường gặp & cách né (học từ lỗi của người khác)

| Rủi ro | Cách né ngay từ đầu |
|---|---|
| **Dataset nổ (scope creep)** | Chốt cứng: KHÔNG làm đa ngôn ngữ, KHÔNG làm đa shop/đa vendor, KHÔNG làm app mobile ở v1. Ghi vào mục "Không nằm trong phạm vi". |
| **Design xấu vì code luôn** | Tuần 7 làm design system trước, sau đó mới ráp. Hoặc dùng Figma community làm reference. |
| **Auth làm nửa vời** | Làm rotation + reuse detection ngay từ lần đầu. Sau này sửa rất mệt. |
| **Ảnh sản phẩm lởm** | Seed bằng ảnh Unsplash/Pexels thật (URL photo), hoặc ảnh AI-generated. Đừng để placeholder xám. |
| **Luồng tiền sai** | Mọi thao tác tiền + tồn kho PHẢI nằm trong `prisma.$transaction`. Test case: 2 người mua cùng lúc sản phẩm còn 1 cái. |
| **Hết động lực giữa chừng** | Deploy sớm ở tuần 2 (dù chỉ là /health). Mỗi phase đều deploy, có link gửi cho bạn bè. |
| **Không viết test** | Viết test cho `vietqr` + `order.service` trước tiên — 2 chỗ dễ sai nhất, và test nhanh gọn. |
| **README sơ sài** | Viết README song song, cập nhật mỗi phase. Đừng để đến cuối. |

---

## 6. Checklist "sẵn sàng đi phỏng vấn"

- [ ] Có link demo + tài khoản demo admin/customer hoạt động
- [ ] Giải thích được **luồng refresh token rotation** và tại sao cần
- [ ] Giải thích được **vì sao tách Zustand (client) và TanStack Query (server)**
- [ ] Chỉ ra được chỗ dùng **`$transaction`** và lý do
- [ ] Nêu được **3 lỗ hổng bảo mật đã chủ động phòng** (IDOR, CSRF, token theft)
- [ ] Có **1 câu chuyện bug thật** bạn từng gặp và cách fix (ví dụ: race condition tồn kho)
- [ ] Nói được **vì sao QR VietQR build thủ công theo EMVCo** thay vì gọi API bên thứ 3
- [ ] Có số liệu: "Lighthouse 96", "40 API endpoint", "12 test case"

---

## 7. Bước tiếp theo — làm ngay hôm nay

Bạn đang ở **PHASE 0 → PHASE 1**. Thứ tự thao tác:

```bash
# 1. Chuẩn bị (xem docs/05)
cp .env.example backend/.env      # rồi điền giá trị
docker compose up -d              # bật PostgreSQL + Redis + pgAdmin

# 2. Backend
cd backend && npm install
npx prisma migrate dev --name init
npm run seed
npm run dev                       # → http://localhost:4000/api/v1/health

# 3. Frontend (terminal khác)
cd frontend && npm install
npm run dev                       # → http://localhost:3000
```

Sau đó mở `docs/02-YEU-CAU-CHUC-NANG.md` và bắt đầu **Tuần 2 — Phase Authentication**.
