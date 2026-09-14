# 🛒 ShopVN — E-commerce Fullstack (Next.js + Express + PostgreSQL + Prisma)

Sàn thương mại điện tử full-stack: **Next.js 15 App Router + Express REST API + PostgreSQL 16 + Prisma**,
có xác thực JWT (refresh-token rotation), phân quyền RBAC, thanh toán **chuyển khoản VietQR tự sinh chuẩn EMVCo**
với webhook đối soát tự động, quên mật khẩu qua email, đăng nhập Google, và dashboard quản trị có thống kê.

> ⚡ **Mới tải về và muốn chạy ngay?** Đọc [`BAT-DAU-O-DAY.md`](BAT-DAU-O-DAY.md) — 3 bước: bật Docker → chạy 1 lệnh setup → nháy đúp `start-all.cmd`.
>
> 💻 **Code bằng VS Code?** Đọc [`VSCODE.md`](VSCODE.md) — Tasks + Debug cấu hình sẵn: `Ctrl+Shift+B` để chạy, `F5` để debug có breakpoint.
>
> 📚 **Bắt đầu ở đây:** [`docs/07-HUONG-DAN-CAI-DAT-VA-CHAY-DU-AN.md`](docs/07-HUONG-DAN-CAI-DAT-VA-CHAY-DU-AN.md) (cài & chạy) ·
> [`docs/01-LO-TRINH-ROADMAP.md`](docs/01-LO-TRINH-ROADMAP.md) (lộ trình) · [`docs/02-YEU-CAU-CHUC-NANG.md`](docs/02-YEU-CAU-CHUC-NANG.md) (đặc tả)

### ✅ Trạng thái hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Backend API (Express · Prisma · PostgreSQL) | ✅ Chạy thật — đã kiểm thử E2E cả luồng mua hàng + webhook đối soát |
| Thanh toán VietQR + tự động xác nhận đơn | ✅ Chạy thật (HMAC + chống trùng lặp + transaction Serializable) |
| Unit test backend | ✅ 36/36 pass · `tsc --noEmit` 0 lỗi |
| Frontend Next.js 15 | ✅ 29 route, `next build` pass, `tsc --noEmit` 0 lỗi |
| Tài liệu | ✅ `docs/01` → `docs/07` |

---

## 📁 Tài liệu dự án

| File | Nội dung |
|---|---|
| [`docs/01-LO-TRINH-ROADMAP.md`](docs/01-LO-TRINH-ROADMAP.md) | Lộ trình 10 tuần / 8 phase, checklist tiến độ, rủi ro & cách né |
| [`docs/02-YEU-CAU-CHUC-NANG.md`](docs/02-YEU-CAU-CHUC-NANG.md) | SRS đầy đủ: 90+ yêu cầu có mã, tiêu chí chấp nhận, user story, RBAC matrix |
| [`docs/03-KIEN-TRUC-VA-DATABASE.md`](docs/03-KIEN-TRUC-VA-DATABASE.md) | ADR, ERD, Prisma design, 48 endpoint, chuẩn response/error, sequence diagram |
| [`docs/04-BAO-MAT-VA-TICH-HOP.md`](docs/04-BAO-MAT-VA-TICH-HOP.md) | OWASP checklist, token rotation, VietQR/EMVCo, email, OAuth & social |
| [`docs/05-SETUP-VA-YEU-CAU.md`](docs/05-SETUP-VA-YEU-CAU.md) | Yêu cầu môi trường, API key cần chuẩn bị, xử lý sự cố |
| [`docs/06-UI-UX-DESIGN-SYSTEM.md`](docs/06-UI-UX-DESIGN-SYSTEM.md) | Design system: token màu/chữ/khoảng cách, thư viện component, animation, a11y, map màn hình |
| [`docs/07-HUONG-DAN-CAI-DAT-VA-CHAY-DU-AN.md`](docs/07-HUONG-DAN-CAI-DAT-VA-CHAY-DU-AN.md) | 🔥 **Đọc file này trước khi cài**: checklist chuẩn bị, cài từng bước, kịch bản demo 10 phút, xử lý sự cố, việc cần làm tiếp |

---

## 🚀 Quick start (3 lệnh)

```bash
# 1) Database (chọn 1): docker compose up -d   HOẶC   tạo DB trên PostgreSQL có sẵn
docker compose up -d

# 2) Biến môi trường — nhớ sinh JWT secret mới, đừng dùng giá trị mẫu
cp .env.example backend/.env

# 3) Backend
cd backend && npm install
npx prisma generate && npx prisma migrate deploy
npm run db:extensions && npm run seed
npm run dev            # http://localhost:4000 · Swagger: /api/docs

# 4) Frontend (mở terminal khác)
cd frontend && npm install && npm run dev    # http://localhost:3000
```

> 🪟 **Windows + Docker, muốn nhanh nhất?** Nháy đúp **`setup-windows.cmd`** (hoặc Git Bash: `bash setup-gitbash.sh`) — script tự làm hết 7 bước: bật DB, **tự tạo & sửa `backend/.env` + sinh khoá bí mật**, migrate, seed, kiểm tra lại. Sau đó bật web bằng **`start-all.cmd`** (nháy đúp) hoặc **`bash start-all.sh`** (Git Bash).
> Chi tiết: [`WINDOWS-SETUP.md`](WINDOWS-SETUP.md)

> Chi tiết đầy đủ (kể cả chạy PostgreSQL không cần Docker): [`docs/07`](docs/07-HUONG-DAN-CAI-DAT-VA-CHAY-DU-AN.md) · kiểm tra môi trường bất cứ lúc nào: `cd backend && npm run doctor`

| Dịch vụ | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger UI | http://localhost:4000/api/docs |
| pgAdmin | http://localhost:5050 |

**Tài khoản demo (sau khi `npm run seed`):**

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@shop.vn` | `Admin@123456` |
| Khách hàng | `customer@shop.vn` | `Customer@123456` |

---

## ✨ Tính năng

**Customer:** đăng ký/đăng nhập · quên & đặt lại mật khẩu · xác thực email · Google OAuth · quản lý phiên thiết bị ·
sản phẩm · tìm kiếm không dấu · lọc/sắp xếp theo URL · giỏ hàng (kể cả khách chưa đăng nhập) · yêu thích ·
checkout 3 bước · **thanh toán QR chuyển khoản** · COD · mã giảm giá · theo dõi đơn có timeline · huỷ/mua lại/trả hàng · đánh giá · hồ sơ & sổ địa chỉ

**Admin:** dashboard KPI + biểu đồ · CRUD sản phẩm (upload nhiều ảnh, biến thể) · CRUD danh mục/thương hiệu/mã giảm giá ·
quản lý đơn (đổi trạng thái có validate) · xác nhận thanh toán thủ công · quản lý người dùng (khoá/mở, đổi role) ·
duyệt đánh giá · thống kê & export CSV · cấu hình shop + **liên kết mạng xã hội** · audit log

---

## 🔒 Bảo mật (tóm tắt)

- Refresh token **rotation** + phát hiện tái sử dụng → revoke cả họ token (family) và gửi email cảnh báo
- Token lưu **hash SHA-256** trong DB, không lưu bản thô
- Cookie `httpOnly` + `SameSite` + `Secure` (prod) + **CSRF double-submit token**
- RBAC 3 tầng + chống **IDOR** (mọi truy vấn đều gắn `userId` của chính chủ)
- Zod validate toàn bộ body/query/params; Prisma chống SQL injection
- Rate limit theo nhóm endpoint (login 5/15', quên mật khẩu 3/h…)
- Helmet + CSP, upload whitelist MIME & magic bytes, resized bằng sharp, tước EXIF
- Webhook ngân hàng verify **HMAC SHA-256 timing-safe** + idempotent
- Error handler không leak stack trace ở production

Xem checklist đầy đủ OWASP Top 10 trong `docs/04`.

---

## 🧱 Tech stack

**FE** Next.js 15 · React 19 · TypeScript strict · Tailwind CSS v4 · Radix UI · Framer Motion · Zustand · TanStack Query · React Hook Form + Zod · Recharts
**BE** Node 20 · Express 5 · TypeScript · Prisma · PostgreSQL 16 · Redis (tuỳ chọn) · Zod · pino · Nodemailer · Sharp · Swagger
**Test/CI** Vitest · Supertest · Playwright · GitHub Actions · Docker

---

## 📄 Giấy phép

MIT — dùng tự do cho mục đích học tập & portfolio.
