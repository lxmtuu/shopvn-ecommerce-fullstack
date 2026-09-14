# 🪟 WINDOWS — Cài đặt trong 1 lệnh

> Dành cho: **Windows + Docker Desktop**. Nếu chưa cài Docker thì xem mục "Chưa có Docker" ở cuối file.
>
> ⚡ Bản ngắn gọn 3 bước: [`BAT-DAU-O-DAY.md`](BAT-DAU-O-DAY.md). File dưới đây là bản chi tiết.
>
> 🆕 Bản cập nhật: script **tự sửa `backend/.env`** (khoá mẫu/quá ngắn/`localhost` → sinh khoá mới, đổi sang `127.0.0.1`),
> thêm **`start-all.cmd`** để bật cả hệ thống bằng 1 nháy đúp, và **`setup-gitbash.sh`** cho Git Bash.

---

## ⚡ Cách nhanh nhất (khuyên dùng)

1. Giải nén `shopvn-ecommerce-fullstack.zip` ra một thư mục (ví dụ `C:\dev\`).
   ⚠️ Tránh giải nén vào `Downloads` hoặc thư mục có dấu tiếng Việt — một số công cụ Node/Docker gặp lỗi với đường dẫn có dấu/có khoảng trắng.
2. Mở **Docker Desktop** và đợi đến khi góc dưới bên trái hiện **"Engine running"**.
3. Nháy đúp file **`setup-windows.cmd`** trong thư mục vừa giải nén.
   (Đang dùng Git Bash? `cd` vào thư mục dự án rồi chạy `bash setup-gitbash.sh`.)

Xong. Script tự làm hết 7 bước, in hướng dẫn bật server ở cuối và **hỏi bạn có bật server luôn không**.
Hoặc nháy đúp **`start-all.cmd`** — nó bật Docker + 2 server + mở trình duyệt.

> Nếu bị Windows SmartScreen chặn: bấm **More info → Run anyway**.
> Nếu muốn chạy bằng dòng lệnh thay vì nháy đúp:
> ```powershell
> cd C:\dev\ecommerce-fullstack
> powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-windows.ps1
> ```

---

## 🐚 Nếu bạn dùng **Git Bash** (MINGW64) thay vì PowerShell

Dùng script bash có sẵn (không cần `chmod`, không cần PowerShell):

```bash
cd "/c/protect code/shopvn-ecommerce-fullstack/ecommerce-fullstack"   # thư mục gốc dự án
bash setup-gitbash.sh
```

Script này làm đúng 7 bước như bản PowerShell, nhưng dành cho Git Bash/WSL/macOS/Linux.
Chạy lại nhiều lần cũng an toàn — **không ghi đè** khoá bí mật bạn đã tự đặt.

### Kiểm tra nhanh tình trạng hiện tại (dán nguyên khối này vào Git Bash)

```bash
cd "/c/protect code/shopvn-ecommerce-fullstack/ecommerce-fullstack/backend"
echo "── 1. Node ─────────"; node -v
echo "── 2. Docker ───────"; docker compose ps --format '{{.Name}}  {{.State}}  {{.Health}}' 2>/dev/null || echo "CHƯA chạy Docker"
echo "── 3. .env ─────────"; test -f .env && grep -E '^(DATABASE_URL|JWT_ACCESS_SECRET)=' .env | sed 's/=.*/= <đã có>/' || echo "THIẾU backend/.env"
echo "── 4. Thư viện ─────"; test -d node_modules && echo "backend: OK" || echo "backend: CHƯA cài (chạy npm install)"
echo "── 5. Prisma ───────"; test -d node_modules/.prisma/client && echo "Prisma Client: OK" || echo "Prisma Client: chưa generate"
```

### Đường dẫn có dấu cách (`C:\protect code\...`) có sao không?

Không sao. Các script đều đặt đường dẫn trong dấu nháy kép, và `docker-compose.yml` dùng **named volume**
(`pgdata`) chứ không bind-mount thư mục dự án, nên Docker không gặp vấn đề với dấu cách.

---

## 🔍 Script làm gì (và bạn sẽ thấy gì)

| Bước | Việc | Kết quả mong đợi |
|---|---|---|
| 1 | Kiểm tra Node.js | `[OK] Node.js v20.x` |
| 2 | Kiểm tra Docker Desktop đang chạy | `[OK] Docker Desktop dang chay` |
| 3 | `docker compose up -d` (PostgreSQL 16 + Redis 7 + pgAdmin) rồi đợi DB healthy | `[OK] PostgreSQL san sang tai localhost:5432` |
| 4 | Tạo `backend\.env`, **sinh ngẫu nhiên 3 khoá bí mật**, trỏ `DATABASE_URL` vào Docker | `[OK] Da tao backend\.env` |
| 5 | `npm install` cho backend + frontend (1–3 phút) | `[OK] backend: xong` · `[OK] frontend: xong` |
| 6 | `npm run setup`: Prisma Client → migrate → bật `unaccent/pg_trgm` → seed dữ liệu mẫu | `✅ Seed xong!` |
| 7 | `npm run doctor` quét lại toàn bộ môi trường | `✅ Môi trường OK` |

Script **dừng ngay** khi gặp lỗi và in ra đúng lệnh cần chạy để sửa. Chạy lại nhiều lần cũng an toàn — nó **không ghi đè** `backend\.env` nếu file đã tồn tại.

---

## ▶️ Bật server (sau khi script chạy xong)

Mở **2 cửa sổ PowerShell**:

```powershell
# ── Terminal 1: API ──
cd C:\dev\ecommerce-fullstack\backend
npm run dev              # → http://localhost:4000

# ── Terminal 2: giao diện web ──
cd C:\dev\ecommerce-fullstack\frontend
npm run dev              # → http://localhost:3000
```

Kiểm tra:

| Địa chỉ | Phải thấy |
|---|---|
| http://localhost:4000/api/v1/health | `{"status":"ok"}` |
| http://localhost:4000/api/docs | Swagger UI hiện danh sách API |
| http://localhost:3000 | Trang chủ ShopVN có sản phẩm |

**Đăng nhập thử:**

| Vai trò | Email | Mật khẩu | Vào đâu |
|---|---|---|---|
| Khách hàng | `customer@shop.vn` | `Customer@123456` | http://localhost:3000 |
| Quản trị | `admin@shop.vn` | `Admin@123456` | http://localhost:3000/admin |

---

## 💳 Thử luồng thanh toán QR (phần ăn điểm khi demo)

1. Trên web: thêm sản phẩm vào giỏ → đăng nhập → **Thanh toán** → chọn **Chuyển khoản QR** → đặt hàng.
2. Trang xác nhận hiện **mã QR + đồng hồ đếm ngược 24h**. Ghi lại mã đơn (dạng `DH2609…`).
3. Mở PowerShell thứ 3, giả lập ngân hàng báo có tiền:

```powershell
cd C:\dev\ecommerce-fullstack\backend
npm run webhook:simulate -- --order=DH26091403325      # dán mã đơn của bạn vào
```

4. Quay lại tab trình duyệt (đợi ~10 giây, trang tự kiểm tra lại) → đơn **tự chuyển sang "Đã xác nhận / Đã thanh toán"**.
   Gọi lại lệnh lần 2 sẽ thấy `alreadyPaid` — đó là cơ chế chống xử lý trùng.

---

## 🛠 Lỗi thường gặp trên Windows

| Lỗi | Cách sửa |
|---|---|
| `...setup-windows.ps1 cannot be loaded because running scripts is disabled` | Bạn mở thẳng file .ps1 bằng PowerShell. Hãy dùng `setup-windows.cmd`, hoặc chạy `powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1` |
| `npm.ps1 cannot be loaded` | Script đã tự dùng `npm.cmd` để né lỗi này. Nếu bạn chạy lệnh bằng tay và gặp lỗi, gõ `npm.cmd install` thay vì `npm install` |
| Docker báo `port is already allocated` (5432) | Máy đang có PostgreSQL cài trực tiếp. Mở **Services** → `postgresql-x64-17` → **Stop**, hoặc sửa `docker-compose.yml` thành `"5433:5432"` rồi đổi `DATABASE_URL` thành cổng `5433` |
| `Docker Desktop is starting` / lệnh docker treo | Docker chưa khởi động xong. Đợi tới khi thấy "Engine running" rồi chạy lại |
| `EACCES` / `EPERM` khi `npm install` | Đóng VS Code / terminal đang khoá thư mục, hoặc chạy PowerShell bằng **Run as administrator**, hoặc tạm tắt Windows Defender real-time protection |
| `Can't reach database server at localhost:5432` | Container chưa lên: `docker compose ps` xem trạng thái, `docker compose logs postgres` xem log |
| Đăng nhập báo **429** | Rate limit 5 lần/15 phút theo `ip:email`. Chờ hoặc restart API (Ctrl+C rồi `npm run dev` lại) |
| Trang web trắng, Console báo lỗi mạng | Backend chưa chạy (Terminal 1). Kiểm tra http://localhost:4000/api/v1/health |
| Cổng 3000/4000 bị chiếm | `npx kill-port 3000` hoặc `npx kill-port 4000` |

Chạy `cd backend; npm run doctor` bất cứ lúc nào để biết đang thiếu gì — nó in kèm lệnh cần chạy.

### Riêng lỗi ở bước `npm run doctor`

| Bạn thấy gì | Nghĩa là | Cách sửa |
|---|---|---|
| `Missing script: "doctor"` | Bạn đang ở thư mục `frontend`, hoặc chưa giải nén bản zip mới | Chắc chắn đang ở `...\ecommerce-fullstack\backend` rồi chạy lại `npm run doctor` |
| `Cannot find module ...\scripts\doctor.mjs` | Chưa có file mới (zip cũ) | Tải lại zip mới, giải nén đè, hoặc chạy tay `node scripts/doctor.mjs` |
| **Khối đỏ `npm error code 1`** + bên trên là `CÒN n VIỆC PHẢI SỬA` | **Đây không phải lỗi script.** Doctor cố tình trả mã thoát 1 khi còn việc cần sửa (để dùng được trong CI). Nó đã liệt kê sẵn việc cần làm | Đọc danh sách `[ X]` phía trên, làm theo, rồi chạy lại `npm run doctor` |
| `npm.ps1 cannot be loaded because running scripts is disabled` | Execution Policy chặn `npm.ps1` | Gõ `npm.cmd run doctor` (thay vì `npm`) |
| Tiếng Việt hiện thành ký tự lạ | Console Windows dùng code page cũ | Gõ `chcp 65001` trước, hoặc bỏ qua vì bản doctor mới đã tự đổi code page |
| Muốn tớ xem giúp | — | Chạy `npm run doctor *> doctor-log.txt` rồi gửi file `doctor-log.txt` cho tớ |

> Bản doctor mới (trong zip này) đã in nhãn `[OK] / [ !] / [ X]` thay cho ký tự ✓ ✗ và tự chuyển console sang UTF-8, nên không còn lỗi hiển thị nữa.

---

## 🐳 Chưa có Docker?

**Cách 1 — Cài Docker Desktop** (khuyên dùng, 5 phút): https://www.docker.com/products/docker-desktop/
→ Cần bật **WSL 2** (Docker Desktop sẽ tự hướng dẫn).

**Cách 2 — Dùng PostgreSQL cài trực tiếp:**

1. Tải **PostgreSQL 17** tại https://www.postgresql.org/download/windows/ (ghi nhớ mật khẩu user `postgres`).
2. Mở **SQL Shell (psql)** hoặc pgAdmin, tạo database:
   ```sql
   CREATE DATABASE ecommerce;
   ```
3. Tạo `backend\.env` bằng tay:
   ```powershell
   Copy-Item .env.example backend\.env
   # sinh 3 khoá (chạy 3 lần, dán vào JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / WEBHOOK_SECRET)
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   Sửa `DATABASE_URL` cho khớp mật khẩu của bạn:
   ```
   DATABASE_URL=postgresql://postgres:MATKHAU_CUA_BAN@localhost:5432/ecommerce?schema=public
   ```
   > Mật khẩu có ký tự đặc biệt phải URL-encode: `@` → `%40`, `#` → `%23`, `:` → `%3A`.
4. Bỏ qua bước 3 của script, còn lại chạy y như trên:
   ```powershell
   cd backend
   npm install; npm run setup; npm run dev
   ```

---

## 📋 Danh sách kiểm tra nhanh (in ra dán lên tường)

- [ ] Node.js ≥ 20 — `node -v`
- [ ] Docker Desktop đang chạy — biểu tượng cá voi không có dấu chấm than
- [ ] Đã nháy đúp `setup-windows.cmd` và thấy dòng **XONG!**
- [ ] Terminal 1 chạy `npm run dev` trong `backend` → http://localhost:4000/api/v1/health trả `ok`
- [ ] Terminal 2 chạy `npm run dev` trong `frontend` → http://localhost:3000 mở được
- [ ] Đăng nhập được bằng `customer@shop.vn / Customer@123456`
- [ ] Vào `/admin` bằng `admin@shop.vn / Admin@123456` thấy dashboard có biểu đồ
- [ ] Thử `npm run webhook:simulate -- --order=<mã đơn>` → đơn tự chuyển sang Đã thanh toán
