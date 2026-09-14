# 🚀 07 — Hướng dẫn cài đặt, chạy thử & bàn giao (ShopVN)

> ⚡ **Chỉ muốn chạy nhanh trên Windows + Docker?** Xem [`BAT-DAU-O-DAY.md`](../BAT-DAU-O-DAY.md) trước — gọn 3 bước. File dưới đây là bản đầy đủ, giải thích từng chi tiết.
>
> Đọc file này **trước khi** bắt tay vào cài. Nó mô tả đúng trạng thái dự án đang có trong tay bạn:
> cái gì đã chạy được, cần chuẩn bị gì, chạy lệnh nào theo thứ tự nào, và những chỗ còn phải làm tiếp.

---

## 1. Trạng thái bàn giao (cập nhật 14/09/2026)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| **Backend API** (Express + Prisma + PostgreSQL) | ✅ Hoàn thành, đã kiểm thử end-to-end trên PostgreSQL thật | 27 model, 13 enum, 48+ endpoint, 7 middleware |
| **Thanh toán VietQR + webhook đối soát tự động** | ✅ Chạy thật | Sinh QR chuẩn EMVCo, xác thực chữ ký HMAC, chống trùng lặp, tự cộng tiền + chuyển đơn sang CONFIRMED |
| **Bảo mật** | ✅ Chạy thật | JWT access/refresh xoay vòng + phát hiện tái sử dụng, CSRF double-submit, rate limit, RBAC, audit log |
| **Unit test** | ✅ 36/36 pass | `npx vitest run` (VietQR, order code, mật khẩu) |
| **Frontend** (Next.js 15 + TS + Tailwind v4) | ✅ 29 route, build production thành công, `tsc --noEmit` 0 lỗi | Đã nối API thật: xác thực, sản phẩm, giỏ, checkout, QR, tài khoản, toàn bộ trang quản trị |
| **Tài liệu** | ✅ 7 file | `docs/01` → `docs/07` |
| **Seed dữ liệu mẫu** | ✅ | 20 sản phẩm, 6 danh mục, 8 thương hiệu, 4 mã giảm giá, 24 đơn hàng, đánh giá, 10 khách |

**Đã kiểm thử E2E thật (không phải "chắc là chạy"):** đăng ký/đăng nhập → giỏ khách vãng lai → gộp giỏ khi đăng nhập → áp mã `WELCOME10` → tạo đơn `DH…` → lấy QR → gọi webhook có chữ ký → đơn tự chuyển **CONFIRMED / PAID** → gọi lại webhook lần 2 trả `alreadyPaid`. Kèm kiểm thử IDOR (404), khách gọi API admin (403), chữ ký sai (401), CSRF thiếu token (403), brute-force login (lần thứ 6 → 429), chuyển trạng thái sai (bị chặn kèm danh sách trạng thái hợp lệ), export CSV (HTTP 200, có BOM tiếng Việt).

---

## 2. Yêu cầu môi trường

| Phần mềm | Phiên bản tối thiểu | Bắt buộc? | Ghi chú |
|---|---|---|---|
| Node.js | **20 LTS** (đã test trên 20/22) | ✅ | `node -v` |
| npm | 10+ | ✅ | hoặc pnpm/yarn (nhớ xoá `package-lock.json` cũ nếu đổi) |
| PostgreSQL | **16** hoặc 17 | ✅ | Cài trực tiếp, hoặc `docker compose up -d` |
| Redis | 7 | ⬜ | Không có vẫn chạy (rate limit dùng memory store). **Production nhiều instance thì bắt buộc** |
| Git | 2.30+ | ⬜ | Để nộp bài / quản lý phiên bản |
| Docker Desktop | 24+ | ⬜ | Chỉ cần nếu bạn thích chạy DB bằng container |

**Lưu ý về tiếng Việt:** toàn bộ source dùng UTF-8. Trên Windows nên dùng **PowerShell 7** hoặc **Git Bash** (không dùng CMD cũ vì hiển thị sai dấu).

---

## 3. Chuẩn bị TRƯỚC khi cài (checklist 15 phút)

### 3.1 Bắt buộc

- [ ] **PostgreSQL đang chạy** và bạn có `user` / `password` / tên database. Ví dụ mặc định: `postgres / postgres`, DB `ecommerce`.
      Kiểm tra nhanh: `psql -U postgres -c "SELECT version();"`
- [ ] **2 chuỗi bí mật ngẫu nhiên** cho JWT (khác nhau, mỗi chuỗi ≥ 32 ký tự). Sinh bằng:
      ```bash
      node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
      ```
      Chạy 2 lần ⇒ dán vào `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET`. **Không dùng giá trị mẫu trong `.env.example`.**
- [ ] **1 bí mật cho webhook ngân hàng** (`BANK_WEBHOOK_SECRET`) — cùng cách sinh. Đây là khoá để cổng thanh toán ký payload.

### 3.2 Nên có (để demo "đủ bài")

- [ ] **SMTP để gửi email thật** (xác thực email, quên mật khẩu, xác nhận đơn). Cách rẻ nhất là Gmail **App Password**
      (Bật 2FA → https://myaccount.google.com/apppasswords), hoặc Mailtrap/Brevo.
      Không cấu hình ⇒ mail chỉ được **ghi ra log** (`console` transport), mọi luồng vẫn chạy bình thường.
- [ ] **Thông tin ngân hàng** để nhận chuyển khoản: `BANK_BIN` (6 số), số tài khoản, tên chủ tài khoản.
      Tra mã BIN: https://api.vietqr.io/v2/banks (Vietcombank `970436`, Techcombank `970407`, MB `970422`, ACB `970416`).
      Bạn cũng có thể nhập trực tiếp trong **Admin → Cấu hình shop** sau khi chạy.
- [ ] **Google OAuth** (tuỳ chọn): tạo OAuth Client tại Google Cloud Console, Redirect URI = `http://localhost:4000/api/v1/auth/google/callback`.

### 3.3 Không cần chuẩn bị

- Ảnh sản phẩm: seed dùng ảnh mẫu từ `picsum.photos`. Upload ảnh thật thì backend tự nén (`sharp`) và lưu vào `backend/uploads/` — **chưa cần Cloudinary** (đã có sẵn `STORAGE_DRIVER` để đổi sang Cloudinary/S3 sau).
- Cổng thanh toán: VNPay/MoMo đã có sẵn enum + chỗ nối, nhưng giao diện đang ẩn (ghi "Sắp ra mắt") để không hứa hẹn tính năng chưa xong.

---

## 4. Cài đặt từng bước

> 🪟 **Dùng Windows?** Đừng làm tay theo 7 bước dưới — chỉ cần nháy đúp **`setup-windows.cmd`** ở thư mục gốc dự án.
> Script tự kiểm tra Node/Docker, bật PostgreSQL bằng Docker, sinh khoá bí mật, cài thư viện, tạo bảng + seed, rồi tự kiểm tra lại.
> Hướng dẫn chi tiết + xử lý lỗi đặc thù Windows: [`WINDOWS-SETUP.md`](../WINDOWS-SETUP.md)

> 💡 **Có 2 lệnh tự kiểm tra/tự cài giúp bạn khỏi mò:**
> ```bash
> cd backend
> npm run doctor    # quét môi trường: .env, Node, node_modules, Prisma Client, kết nối PostgreSQL, frontend
> npm run setup     # generate Prisma Client → migrate deploy → bật extension → seed dữ liệu mẫu
> ```
> `npm run doctor` in ra ✓ / ! / ✗ cho từng mục kèm **đúng lệnh cần chạy** để sửa, và trả mã thoát `1` nếu còn lỗi
> (nên dùng được trong CI). Chạy lại nó sau mỗi lần sửa là biết đã ổn chưa.


### Bước 1 — Lấy mã nguồn & cài phụ thuộc

```bash
# Giải nén file .zip đã tải về, rồi:
cd ecommerce-fullstack

cd backend  && npm install && cd ..
cd frontend && npm install && cd ..
```

### Bước 2 — Tạo database (chọn 1 trong 2 cách)

**Cách A — Docker (nhanh nhất, có sẵn Redis + pgAdmin)**

```bash
docker compose up -d
docker compose ps          # phải thấy postgres healthy
```

**Cách B — PostgreSQL cài trên máy**

```bash
# Ubuntu/Debian
sudo -u postgres psql -c "CREATE DATABASE ecommerce;"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```
```powershell
# Windows (PowerShell, sau khi đã cài PostgreSQL)
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE ecommerce;"
```

### Bước 3 — Điền biến môi trường cho backend

```bash
cp .env.example backend/.env
# mở backend/.env và điền tối thiểu:
#   DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
```

`DATABASE_URL` đúng định dạng Prisma:

```
postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public
```

> Mật khẩu có ký tự đặc biệt phải **URL-encode**, ví dụ `p@ss#1` → `p%40ss%231`.

### Bước 4 — Tạo bảng & dữ liệu mẫu

```bash
cd backend
npx prisma generate                # sinh Prisma Client theo schema
npx prisma migrate deploy          # tạo bảng theo migration có sẵn (không hỏi gì)
npm run db:extensions              # bật unaccent + pg_trgm (phục vụ tìm kiếm tiếng Việt)
npm run seed                       # 20 sản phẩm, 24 đơn hàng, 2 tài khoản demo…
```

Nếu bạn muốn tự sinh migration mới trong lúc phát triển: dùng `npx prisma migrate dev --name <tên>`.

### Bước 5 — Chạy API

```bash
cd backend
npm run dev        # http://localhost:4000
```

Kiểm tra sống/chết:

```bash
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/health/deep   # kiểm tra luôn DB + Redis
```

Mở **Swagger UI**: http://localhost:4000/api/docs

### Bước 6 — Chạy frontend

```bash
cd frontend
npm run dev        # http://localhost:3000
```

### Bước 7 — Đăng nhập và thử

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị | `admin@shop.vn` | `Admin@123456` |
| Khách hàng | `customer@shop.vn` | `Customer@123456` |

Mã giảm giá có sẵn: `WELCOME10` (−10%, tối đa 200.000đ) · `GIAM50K` · `FREESHIP` · `SALE20`.

---

## 5. Kịch bản demo 10 phút (dùng khi bảo vệ đồ án / phỏng vấn)

1. **Trang chủ** → hero, danh mục, sản phẩm nổi bật, chuyển **dark mode** ở góc phải header.
2. **/products** → gõ "tai nghe" (tìm không dấu cũng ra), lọc theo *Thương hiệu + Khoảng giá + Từ 4★*.
   ⬅️ **Chỉ vào URL**: bộ lọc nằm trên URL ⇒ copy link gửi cho người khác vẫn giữ nguyên bộ lọc.
3. **Chi tiết sản phẩm** → chọn phân loại, chọn số lượng, **Thêm vào giỏ** ⇒ drawer giỏ hàng mở ra, thanh freeship chạy.
4. **Giỏ hàng** → sửa số lượng thử vượt tồn kho ⇒ bị chặn kèm cảnh báo "Chỉ còn N sản phẩm".
5. **Đăng nhập** `customer@shop.vn` ⇒ giỏ vãng lai **được gộp** vào tài khoản (giải thích: bảng `carts` có `userId` hoặc `guestId`).
6. **Checkout** → thêm địa chỉ mới → chọn **Chuyển khoản QR** → nhập `WELCOME10` ⇒ tổng tiền nhảy sau khi áp mã.
7. **Trang thanh toán** → QR hiện ra kèm **đếm ngược 24h**, nút copy từng trường, tải QR về máy, gửi ảnh bill.
8. **Giả lập ngân hàng báo có tiền** (terminal thứ hai) — điểm nhấn kỹ thuật đáng nói nhất:
   ```bash
   cd backend
   npm run webhook:simulate -- --order=DH26091403325 --amount=9870000
   ```
   → quay lại tab trình duyệt: đơn **tự chuyển sang Đã xác nhận / Đã thanh toán** (gọi lại lần 2 sẽ trả `alreadyPaid` — chống trùng lặp).
9. **Tài khoản** → timeline đơn hàng, huỷ đơn, mua lại, sổ địa chỉ, đổi mật khẩu, **quản lý thiết bị đăng nhập**.
10. **/admin** → KPI tháng này so với tháng trước, biểu đồ doanh thu 7/30/90 ngày/12 tháng, donut trạng thái, top sản phẩm,
    **Export CSV** (mở bằng Excel — tiếng Việt không lỗi font nhờ BOM).
    → Đổi trạng thái đơn, xác nhận thanh toán thủ công, duyệt đánh giá, cấu hình shop (hotline, mạng xã hội, tài khoản ngân hàng).

**Câu chốt khi demo:** *"Điểm khó nhất không phải CRUD mà là đối soát thanh toán: em dùng mã đơn 13 ký tự làm nội dung chuyển khoản, webhook ký HMAC, chống gọi trùng bằng khoá idempotency, và tất cả nằm trong một transaction Serializable nên tồn kho không bao giờ bị âm."*

---

## 6. Kiểm thử

```bash
cd backend
npm run typecheck            # TypeScript 0 lỗi
npx vitest run               # 36 unit test (VietQR, order code, mật khẩu)
npm run test                 # chế độ watch khi đang code

# Giả lập webhook ngân hàng (tự lấy số tiền từ DB nếu không truyền --amount)
npm run webhook:simulate -- --order=<MÃ_ĐƠN>
npm run webhook:simulate -- --order=<MÃ_ĐƠN> --amount=500000     # cố tình chuyển thiếu → UNDERPAID
npm run webhook:simulate -- --order=<MÃ_ĐƠN> --signature=bad     # chữ ký sai → 401
```

```bash
cd frontend
npm run typecheck            # 0 lỗi
npm run build                # build production (đã pass: 29 route)
npm run start                # chạy bản production ở cổng 3000
```

---

## 7. Sự cố thường gặp

| Triệu chứng | Nguyên nhân & cách xử lý |
|---|---|
| `Can't reach database server at localhost:5432` | PostgreSQL chưa chạy, hoặc sai cổng. `docker compose ps` / `sudo systemctl status postgresql` |
| `P1000: Authentication failed` | Sai user/password trong `DATABASE_URL`, hoặc chưa URL-encode ký tự đặc biệt |
| `function unaccent(text) does not exist` | Chưa chạy `npm run db:extensions`. Chạy lại rồi `npx prisma migrate deploy` |
| Đăng nhập luôn báo **429** | Rate limit 5 lần/15 phút theo `ip:email`. Đổi email khác, hoặc chờ, hoặc restart API (memory store reset) |
| Login trả **403 CSRF** | Frontend phải đi qua proxy `/api/*` (mặc định) hoặc gọi thẳng `:4000` với `credentials:'include'`. Kiểm tra cookie `csrf_token` có trong DevTools → Application → Cookies |
| Ảnh sản phẩm trắng/ broken | Ảnh seed cần internet (`picsum.photos`). Ảnh upload cần backend chạy và `PUBLIC_UPLOAD_URL` đúng |
| Gửi mail lỗi `Invalid login` | App Password của Gmail sai (không phải mật khẩu Gmail). Bỏ trống `SMTP_*` để tắt gửi mail, mail sẽ được in ra log |
| `next build` lỗi `Image with src ... not configured` | Thêm domain ảnh mới vào `remotePatterns` trong `frontend/next.config.ts` |
| Webhook trả 401 | `BANK_WEBHOOK_SECRET` ở hai bên không khớp, hoặc payload bị sửa sau khi ký (script `webhook:simulate` đã ký đúng theo secret trong `.env`) |
| Cổng 3000/4000 đã bị chiếm | `npx kill-port 3000` (hoặc đổi `-p` trong script `dev`) |

---

## 8. Cấu trúc dự án

```
ecommerce-fullstack/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # 27 model — nguồn sự thật của DB
│   │   ├── migrations/            # lịch sử thay đổi schema
│   │   ├── sql/extensions.sql     # unaccent + pg_trgm
│   │   └── seed.ts                # dữ liệu mẫu
│   ├── src/
│   │   ├── config/                # env (zod validate), constants
│   │   ├── lib/                   # prisma, redis, jwt, mailer, vietqr, storage, crypto
│   │   ├── middlewares/           # auth, csrf, validate, error, rateLimit, upload, logger
│   │   ├── modules/               # 15 module nghiệp vụ (auth, products, orders, payments…)
│   │   ├── templates/email/       # template email tiếng Việt
│   │   ├── jobs/                  # cron: huỷ đơn quá hạn, dọn session, cảnh báo tồn kho
│   │   ├── scripts/               # công cụ CLI (giả lập webhook…)
│   │   ├── tests/                 # unit test
│   │   ├── docs/swagger.ts        # OpenAPI 3
│   │   └── app.ts · routes.ts · server.ts
│   └── .env                       # KHÔNG commit file này
├── frontend/
│   └── src/
│       ├── app/                   # 29 route App Router (shop · account · admin · auth)
│       ├── components/            # ui · shop · layout · admin · auth
│       ├── lib/                   # api client, format (tiền/ngày/trạng thái)
│       ├── store/                 # zustand: auth · cart · ui
│       └── types/                 # type dùng chung khớp với API
└── docs/                          # 01 → 07 (roadmap, SRS, kiến trúc, bảo mật, setup, UI/UX, hướng dẫn này)
```

---

## 9. Những việc nên làm tiếp (theo thứ tự ưu tiên)

Mình cố tình **không** giấu phần chưa xong — đây là danh sách để bạn tiếp tục:

1. **Đăng nhập Google**: backend đã có `/auth/google` + callback, frontend đã có nút — cần điền `GOOGLE_CLIENT_ID/SECRET` để chạy thật.
2. **Cổng thanh toán online (VNPay/MoMo)**: đã có enum + chỗ nối trong `payments.service.ts`; cần thêm chữ ký theo tài liệu từng cổng.
3. **Upload ảnh bill chuyển khoản**: endpoint `/payments/:orderCode/proof` hiện chỉ nhận URL ảnh (đã lưu `Payment.proofImageUrl`); nên lưu thêm `PaymentProof` để có lịch sử.
4. **Redis cho rate limit & cache**: đã viết sẵn `lib/redis.ts`; chỉ cần điền `REDIS_URL` là tự chuyển store (bắt buộc khi chạy nhiều instance).
5. **Gửi mail theo hàng đợi (BullMQ)**: hiện gửi trực tiếp, đủ cho đồ án; production nên đẩy vào queue.
6. **Test tích hợp (Supertest) cho luồng đơn hàng**: hiện có 36 unit test; nên thêm test cho `orders.service` + webhook.
7. **i18n (next-intl)** nếu muốn thêm tiếng Anh; **PWA** nếu muốn điểm cộng về trải nghiệm.
8. **CI/CD**: GitHub Actions chạy `typecheck` + `vitest` + `next build` mỗi lần push.

---

## 10. Checklist trước khi nộp / đưa lên portfolio

- [ ] `backend/.env` **không** nằm trong git (`git status` không thấy file này) — đã có `.gitignore`
- [ ] Đã đổi `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BANK_WEBHOOK_SECRET` khỏi giá trị mẫu
- [ ] `NODE_ENV=production` + `COOKIE_SECURE=true` nếu deploy HTTPS
- [ ] `CORS_ORIGIN` / `CLIENT_URL` trỏ đúng domain frontend thật
- [ ] `npm run build` ở cả hai thư mục đều xanh
- [ ] Đã chạy thử kịch bản demo ở §5 một lần từ đầu đến cuối
- [ ] Có ảnh chụp màn hình: trang chủ, chi tiết sản phẩm, QR thanh toán, dashboard quản trị
- [ ] `README.md` đã sửa link demo + ảnh + mô tả ngắn (phần "About" của repo)
