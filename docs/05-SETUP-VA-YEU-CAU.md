# ⚙️ YÊU CẦU MÔI TRƯỜNG & HƯỚNG DẪN SET UP

> Đọc kỹ file này **TRƯỚC KHI** chạy `npm install`. Làm đúng thứ tự sẽ tiết kiệm cho bạn vài giờ debugging.

---

## PHẦN A — YÊU CẦU BẮT BUỘC (must-have)

| # | Thành phần | Phiên bản tối thiểu | Kiểm tra bằng | Ghi chú |
|---|---|---|---|---|
| 1 | **Node.js** | `20.x` LTS (khuyến nghị 20.11+) | `node -v` | **KHÔNG dùng Node 18** — một số package yêu cầu ≥20 |
| 2 | **npm** | `10.x` | `npm -v` | Hoặc pnpm 9 (`corepack enable`) |
| 3 | **Docker Desktop** | 4.x | `docker -v`, `docker compose version` | Dùng để chạy PostgreSQL — nhẹ đầu nhất |
| 4 | **Git** | 2.40+ | `git --version` | |
| 5 | **PostgreSQL** | 16 | `psql --version` | Chỉ cần nếu KHÔNG dùng Docker |
| 6 | **VS Code** | mới nhất | – | Extension ở Phần C |

> 💡 **Không có Docker?** Cài PostgreSQL 16 trực tiếp (Windows: installer EDB; macOS: `brew install postgresql@16`; Ubuntu: repo pgdg). Sau đó **bỏ qua** `docker compose up` và sửa `DATABASE_URL` trong `.env` thành `postgresql://postgres:matkhau@localhost:5432/ecommerce`.

---

## PHẦN B — CHUẨN BỊ TÀI KHOẢN / API KEY (làm trước khi code)

Đánh dấu ✅ những cái bạn sẽ dùng. **Phần 1–4 là bắt buộc cho v1.**

### 1. 🔐 Biến bí mật của bạn (bắt buộc, sinh ngay)
```bash
# Sinh JWT secret an toàn (chạy 2 lần để có 2 secret khác nhau)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
→ dán vào `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET`.

### 2. 📧 Email (bắt buộc — cho verify email & quên mật khẩu)
Chọn **1** trong 2:
- **Cách A — Gmail SMTP (nhanh nhất để dev):**
  1. Bật 2FA cho tài khoản Google → https://myaccount.google.com/security
  2. Vào https://myaccount.google.com/apppasswords → tạo App Password (16 ký tự)
  3. Điền: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app-password-16-ký-tự>`
  > ⚠️ Dùng **App Password**, KHÔNG dùng mật khẩu Google thường (sẽ bị chặn).
- **Cách B — Resend (khuyến nghị cho prod):** đăng ký https://resend.com → lấy API key → `RESEND_API_KEY=re_...`
- **Cách C — Dev, không gửi mail thật:** dùng **Mailtrap** (https://mailtrap.io) hoặc **MailHog**, hoặc đặt `MAIL_DRIVER=console` để mail in ra terminal.

### 3. 🏦 Ngân hàng (bắt buộc — cho thanh toán chuyển khoản + QR)
Đây là **thông tin tài khoản nhận tiền của bạn** (hoặc tài khoản test):
```
BANK_BIN=970436              # 970436 = Vietcombank (mã BIN theo NAPAS)
BANK_ACCOUNT_NO=0011000123456
BANK_ACCOUNT_NAME=NGUYEN VAN A
```
Tra mã BIN tại: https://api.vietqr.io/v2/banks (miễn phí) hoặc danh sách trong file này.

<details>
<summary><b>Mã BIN một số ngân hàng phổ biến (bấm để mở)</b></summary>

| Ngân hàng | BIN | Ngân hàng | BIN |
|---|---|---|---|
| Vietcombank | 970436 | Techcombank | 970407 |
| BIDV | 970418 | MB Bank | 970422 |
| VietinBank | 970415 | ACB | 970416 |
| Agribank | 970405 | VPBank | 970432 |
| Sacombank | 970403 | TPBank | 970423 |
| VIB | 970441 | MSB | 970426 |
| SHB | 970443 | Eximbank | 970431 |
| OCB | 970448 | SeABank | 970440 |
| HDBank | 970437 | Liên Việt (LPB) | 970449 |
| Shinhan VN | 970424 | Cake/CAKE | 546034 |
</details>

### 4. 🤖 Webhook đối soát tự động (bắt buộc nếu muốn auto-confirm đơn)
- **Casso** (https://casso.vn) — có gói free, hỗ trợ webhook giao dịch.
- **SePay** (https://sepay.vn) — tương tự, có sandbox.
→ Lấy `WEBHOOK_SECRET` để verify chữ ký HMAC. Nếu chưa có, vẫn chạy được: admin xác nhận thủ công trên trang quản trị.
- **Test không cần tài khoản thật:** dùng `npm run webhook:simulate` (script có sẵn trong repo) để giả lập 1 giao dịch đến.

### 5. 🔗 Đăng nhập mạng xã hội — Google OAuth (tùy chọn, nên có)
1. https://console.cloud.google.com → tạo Project mới
2. APIs & Services → OAuth consent screen → chọn **External** → điền tên app, email, để test mode
3. Credentials → **Create OAuth client ID** → Web application
4. Authorized redirect URIs:
   - `http://localhost:4000/api/v1/auth/google/callback`
   - `https://api.yourdomain.com/api/v1/auth/google/callback` (prod)
5. Lấy `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
> Facebook Login làm tương tự tại https://developers.facebook.com (thêm `FACEBOOK_APP_ID/SECRET`) — có sẵn interface `OAuthProvider` để cắm vào.

### 6. ☁️ Lưu trữ ảnh (tùy chọn — mặc định lưu local `uploads/`)
- **Cloudflare R2** (khuyến nghị, free 10GB): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
- hoặc **AWS S3** / **Cloudinary** / **ImageKit**
- Đặt `STORAGE_DRIVER=local` để bỏ qua bước này khi dev.

### 7. 🔴 Redis (tùy chọn — khuyến nghị)
Dùng cho rate limit phân tán + cache. `docker compose up -d` đã bao gồm Redis.
- Local: `REDIS_URL=redis://localhost:6379`
- Prod: **Upstash** (`rediss://...`), có gói free.
- Nếu không set → hệ thống tự fallback sang in-memory store (đủ cho dev).

### 8. 📊 Monitoring (tùy chọn)
- **Sentry** (https://sentry.io) cho error tracking: `SENTRY_DSN`
- **Axiom/Logtail** cho log tập trung

### 9. 🧪 Tài khoản demo cho người xem portfolio
```
DEMO_ADMIN_EMAIL=admin@shop.vn      / DEMO_ADMIN_PASSWORD=Admin@123456
DEMO_USER_EMAIL=customer@shop.vn    / DEMO_USER_PASSWORD=Customer@123456
```
> Dùng **đúng 2 tài khoản này** trong seed script. Ghi vào README để nhà tuyển dụng đăng nhập thử ngay.

---

## PHẦN C — VS CODE EXTENSIONS

```
dbaeumer.vscode-eslint
esbenp.prettier-vscode
Prisma.prisma
bradlc.vscode-tailwindcss
usernamehw.errorlens
streetsidesoftware.code-spell-checker
christian-kohler.path-intellisense
eamodio.gitlens
rangav.vscode-thunder-client   (thay Postman, test API ngay trong editor)
ms-azuretools.vscode-docker
```

`.vscode/settings.json` khuyến nghị:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [["cn\\(([^)]*)\\)", "'([^']*)'"]]
}
```

---

## PHẦN D — THỨ TỰ SET UP (làm đúng theo số)

### Bước 1 — Clone & cài đặt
```bash
git clone <repo-url> ecommerce-fullstack
cd ecommerce-fullstack
```

### Bước 2 — Bật database
```bash
docker compose up -d
# Kiểm tra
docker compose ps
# postgres  → Up (healthy)  :5432
# redis     → Up            :6379
# pgadmin   → Up            :5050   (admin@shop.vn / admin)
```

### Bước 3 — Cấu hình biến môi trường
```bash
cp .env.example backend/.env
cp .env.example frontend/.env.local   # chỉ giữ các biến NEXT_PUBLIC_*
code backend/.env                     # điền theo Phần B
```

⚠️ **Bắt buộc kiểm tra 5 biến này trước khi chạy:**
```
DATABASE_URL      # postgresql://postgres:postgres@localhost:5432/ecommerce
JWT_ACCESS_SECRET # chuỗi hex 128 ký tự
JWT_REFRESH_SECRET
BANK_BIN / BANK_ACCOUNT_NO / BANK_ACCOUNT_NAME   # để QR sinh đúng
SMTP_*            # để test quên mật khẩu
```

### Bước 4 — Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```
→ Mở http://localhost:4000/api/v1/health — phải thấy `{"success":true,...}`

### Bước 5 — Frontend
```bash
cd ../frontend
npm install
npm run dev
```
→ Mở http://localhost:3000

### Bước 6 — Kiểm tra luồng quan trọng nhất
1. Đăng ký tài khoản mới → kiểm tra mail verify (hoặc terminal nếu `MAIL_DRIVER=console`)
2. Quên mật khẩu → nhận mail → đặt lại → đăng nhập được
3. Thêm 2 sản phẩm vào giỏ → checkout → chọn **Chuyển khoản** → thấy QR
4. Giả lập ngân hàng báo có tiền:
   ```bash
   npm run webhook:simulate -- --order=DH26091400123 --amount=499000
   ```
5. Refresh trang đơn → trạng thái đã thành **Đã thanh toán** ✅
6. Đăng nhập `admin@shop.vn` → /admin → Dashboard có số liệu

---

## PHẦN E — XỬ LÝ SỰ CỐ THƯỜNG GẶP

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | Postgres chưa chạy | `docker compose up -d postgres`, đợi `healthy` |
| `P1001: Can't reach database server` | Sai `DATABASE_URL` hoặc sai port | Kiểm tra user/pass/db trong chuỗi kết nối |
| `P3005: The database schema is not empty` | DB đã có bảng cũ | `npx prisma migrate reset` (⚠️ xoá data) |
| `Environment variable not found: X` | Thiếu trong `.env` | `cp .env.example .env` rồi điền; restart dev server |
| CORS error trên FE | `CORS_ORIGIN` không khớp port FE | Đặt `CORS_ORIGIN=http://localhost:3000` |
| 401 liên tục dù đã login | Cookie không được set | Nhớ `credentials: 'include'` ở FE; `withCredentials` khi dùng axios |
| Gmail SMTP `535-5.7.8` | Dùng mật khẩu thường | Bật 2FA + dùng **App Password** |
| QR quét ra sai số tiền | `BANK_BIN` hoặc `amount` sai định dạng | BIN phải là 6 số; amount làm tròn về số nguyên VND |
| Prisma Client out of date | Chưa generate sau khi đổi schema | `npx prisma generate` |
| `Port 3000 already in use` | Tiến trình cũ còn sống | `npx kill-port 3000` (hoặc đổi port) |

---

## PHẦN F — BIẾN MÔI TRƯỜNG ĐẦY ĐỦ (tham chiếu)

```env
# ── APP ──────────────────────────────────────────────
NODE_ENV=development
PORT=4000
API_PREFIX=/api/v1
APP_NAME=ShopVN
CLIENT_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# ── DATABASE ─────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public
# Prod (Neon/Supabase) — thêm pooling:
# DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1

# ── REDIS (tùy chọn) ─────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── JWT ──────────────────────────────────────────────
JWT_ACCESS_SECRET=<hex 128>
JWT_REFRESH_SECRET=<hex 128>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false          # true ở prod (HTTPS)

# ── EMAIL ────────────────────────────────────────────
MAIL_DRIVER=smtp             # smtp | resend | console
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="ShopVN <no-reply@shop.vn>"
RESEND_API_KEY=

# ── OAUTH ────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback

# ── THANH TOÁN ───────────────────────────────────────
BANK_BIN=970436
BANK_ACCOUNT_NO=0011000123456
BANK_ACCOUNT_NAME=NGUYEN VAN A
BANK_NAME=Vietcombank
WEBHOOK_SECRET=<chuỗi bí mật để verify HMAC>
ORDER_PAYMENT_TTL_MINUTES=1440
FREE_SHIPPING_THRESHOLD=500000
SHIPPING_FEE_STANDARD=30000
SHIPPING_FEE_EXPRESS=50000
SHIPPING_FEE_INSTANT=80000

# ── UPLOAD ───────────────────────────────────────────
STORAGE_DRIVER=local          # local | s3 | r2
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=5
PUBLIC_UPLOAD_URL=http://localhost:4000/uploads

# ── BẢO MẬT / CHỐNG SPAM ────────────────────────────
BCRYPT_ROUNDS=12
# Cửa sổ & hạn mức rate limit chung (phút / số request mỗi IP)
RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX=2000
# Số lần thử đăng nhập tối đa cho mỗi IP + email trong 15 phút
RATE_LIMIT_LOGIN_MAX=10
# Số lớp proxy tin cậy: false | 1 (khuyến nghị) | 2, 3…
TRUST_PROXY=1
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# ── FRONTEND (đặt trong frontend/.env.local) ─────────
# /api/v1 = gọi qua proxy same-origin của Next (khuyến nghị, tránh CORS)
NEXT_PUBLIC_API_URL=/api/v1
API_PROXY_TARGET=http://127.0.0.1:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=ShopVN
```

> ⚠️ **Production:** `env.ts` sẽ TỪ CHỐI khởi động nếu `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` /
> `WEBHOOK_SECRET` vẫn là giá trị mẫu (`thay_bang…`, `change_me…`, `dev-webhook-secret`), hoặc nếu hai
> JWT secret giống nhau. Sinh bằng: `openssl rand -hex 32`.
>
> Danh sách biến ĐẦY ĐỦ và luôn đúng là [`.env.example`](../.env.example) ở thư mục gốc —
> `backend/src/config/env.ts` validate đúng theo file đó. Các thông tin mạng xã hội
> (Facebook/Instagram/TikTok/YouTube) nay nhập trong **Admin → Cấu hình shop**, không
> dùng biến môi trường nữa.

---

## PHẦN G — LỆNH HAY DÙNG (cheat sheet)

```bash
# ── Database ──────────────────────────────────────────
npx prisma studio                 # GUI xem/sửa dữ liệu  → localhost:5555
npx prisma migrate dev --name x    # tạo migration mới
npx prisma migrate reset           # xoá sạch + migrate lại + seed
npx prisma generate                # sau khi sửa schema
npm run seed                       # nạp dữ liệu mẫu

# ── Dev ───────────────────────────────────────────────
npm run dev                        # backend: tsx watch
npm run dev --prefix ../frontend   # frontend: next dev
npm run lint  /  npm run typecheck / npm test

# ── Tiện ích ──────────────────────────────────────────
npm run webhook:simulate -- --order=DH26091400123 --amount=499000
npm run db:backup                  # pg_dump ra ./backups
docker compose logs -f postgres    # xem log DB
```

---

## PHẦN H — CHECKLIST TRƯỚC KHI BẮT ĐẦU CODE

- [ ] `node -v` ≥ 20
- [ ] `docker compose ps` → postgres & redis đều `Up`
- [ ] Đã `cp .env.example backend/.env` và điền đủ 5 biến bắt buộc
- [ ] Đã sinh 2 JWT secret riêng biệt
- [ ] Đã có App Password Gmail (hoặc chọn `MAIL_DRIVER=console`)
- [ ] Đã điền `BANK_BIN` + `BANK_ACCOUNT_NO` (test QR ngay từ đầu)
- [ ] `npx prisma migrate dev` chạy xanh
- [ ] `npm run seed` tạo được 2 tài khoản demo
- [ ] `GET /api/v1/health` trả 200
- [ ] http://localhost:3000 hiển thị trang chủ

**Xong 10 mục này → bạn đã sẵn sàng bước vào Tuần 2 (Authentication).** 🚀
