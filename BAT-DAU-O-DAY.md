# 🚀 BẮT ĐẦU Ở ĐÂY — ShopVN E-commerce

> **Bạn đã có Docker Desktop + Node.js** ⇒ chỉ cần **1 lệnh** cho tất cả các bước cài đặt.
> Thời gian: ~3–5 phút (chủ yếu là tải thư viện npm).

---

> 📖 **Muốn bản đầy đủ (cài đặt, xử lý sự cố, checklist demo)?** Mở **`HUONG-DAN-SETUP.md`** —
> đó là hướng dẫn chính thức, file này chỉ là bản tóm tắt nhanh.

## ⚡ CÁCH CHẮC CHĂN NHẤT — 3 lệnh (Git Bash)

Mở **Docker Desktop**, đợi góc dưới trái hiện chữ **Engine running**.
Rồi dán nguyên khối này vào Git Bash (đổi đường dẫn cho đúng máy bạn):

```bash
cd "/c/protect code/shopvn-ecommerce-fullstack/ecommerce-fullstack"
bash stop-all.sh      # tắt sạch server cũ (nếu có) — chạy được cả khi chưa có gì
bash start-all.sh     # tự cài + tự sửa + tự chạy + TỰ KIỂM TRA
bash kiem-tra.sh      # (tuỳ chọn) kiểm tra 29 mục: API, đăng nhập, phân quyền, 14 trang
```

> 💡 **Máy ít RAM hoặc muốn nhanh nhất để demo?** Dùng chế độ production:
> `bash start-all.sh prod` — tự build rồi chạy, **nhẹ RAM hơn nhiều và mở trang chỉ ~10 ms**.
> Nếu máy dưới ~3 GB RAM, script **tự chuyển** sang chế độ này cho cậu (khỏi lo web tự tắt giữa chừng).
> Muốn ép chạy dev để có hot-reload: `bash start-all.sh dev`.

`start-all.sh` tự làm hết: bật database → **tự tạo/sửa `.env`** → cài thư viện nếu thiếu → tạo bảng + nạp dữ liệu mẫu → dọn cổng → chạy API + website → **đợi tới khi cả hai trả HTTP 200** rồi mới báo thành công:

```
  [OK] API       → http://127.0.0.1:4000/api/v1/health trả 200
  [OK] Website   → http://localhost:3000 trả 200
  ✅ CHẠY ĐƯỢC — mở trình duyệt:  http://localhost:3000
```

Nếu có server **không lên**, script **tự in 25 dòng log cuối** của server đó kèm cách sửa — không còn cảnh web trắng mà không biết vì sao.

### Bảng lệnh

| Lệnh | Việc |
|---|---|
| `bash start-all.sh` | **Bật database + API + web** (kiêm luôn cài đặt & tự sửa lỗi) |
| `bash start-all.sh prod` | Bật ở **chế độ production**: nhẹ RAM, mở trang ~10 ms (ổn định nhất khi demo) |
| `bash kiem-tra.sh` | **Tự kiểm tra 29 mục**: API, database, đăng nhập, phân quyền, QR, 14 trang web |
| `bash stop-all.sh` | Tắt API + web (database vẫn chạy, dữ liệu còn nguyên) |
| `bash xem-log.sh` | Xem log đang chạy — **Ctrl+C để thoát** |
| `bash xem-log.sh loi` | Chỉ in các dòng có lỗi |
| `bash chan-doan.sh` | Chẩn đoán sâu, lưu ra `chan-doan-ket-qua.txt` |

> 🖱️ Không thích gõ lệnh? Nháy đúp **`start-all.cmd`** để bật, **`stop-all.cmd`** để tắt.

---

## ⚠️ Trước tiên: chắc chắn bạn dùng **đúng gói mới**

Mở file **`BUILD-INFO.txt`** ở thư mục gốc — phải thấy dòng **`BẢN DỰNG #5`**.
Hoặc chạy 1 lệnh này (Git Bash) và thấy **đủ 4 file**:

```bash
ls BAT-DAU-O-DAY.md start-all.cmd setup-gitbash.sh backend/scripts/doctor.mjs
```

> Nếu thiếu file nào ⇒ bạn đang dùng zip cũ. Đây chính là nguyên nhân lỗi
> `npm error Missing script: "doctor"` — chỉ cần tải lại zip mới.
> Từ bản #5, `npm run doctor` có mục **“1/6 Gói cài đặt”** tự báo cho bạn biết.

---

## 0. Chuẩn bị (30 giây)

| Cần gì | Kiểm tra | Nếu chưa có |
|---|---|---|
| **Docker Desktop** đang chạy | Mở Docker Desktop → góc dưới trái hiện **Engine running** (icon cá voi xanh, không còn chữ *Starting*) | Bật Docker Desktop lên |
| **Node.js ≥ 20** | Mở terminal, gõ `node -v` → phải ra `v20.x` hoặc `v22.x` | Tải LTS tại https://nodejs.org rồi mở lại terminal |
| **Giải nén zip** | Thư mục có file `setup-windows.cmd`, `setup-gitbash.sh`, `docker-compose.yml` | — |

**Nên giải nén vào đường dẫn ngắn, không dấu tiếng Việt**, ví dụ `C:\projects\ecommerce-fullstack`.

> Dấu cách trong đường dẫn (kiểu `C:\protect code\...`) **không sao** — `docker-compose.yml` dùng named volume chứ không mount thư mục dự án, nên Docker không gặp vấn đề.

---

## 1. Cài đặt — chọn **1 trong 4** cách

> 💻 **Dùng VS Code?** Xem [`VSCODE.md`](VSCODE.md) — cấu hình Tasks + Debug đã làm sẵn,
> cài đặt chỉ cần `Ctrl+Shift+P` → `Tasks: Run Task` → **⚙️ CÀI ĐẶT LẦN ĐẦU**, chạy web bằng **Ctrl+Shift+B**.


### 🅰️ Cách A — Git Bash (khuyên dùng nếu bạn đang dùng MINGW64)

```bash
cd "/c/projects/ecommerce-fullstack"     # ← thay bằng đường dẫn thật của bạn
bash setup-gitbash.sh
```

### 🅱️ Cách B — Không cần gõ lệnh

**Double-click** file `setup-windows.cmd` → nó tự mở PowerShell, chạy hết, rồi **hỏi bạn có bật server luôn không**.

### 🅲 Cách C — PowerShell

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-windows.ps1
```

### 🅳 Cách D — Trong VS Code (khuyên dùng nếu bạn code bằng VS Code)

1. **File → Open Folder** → chọn thư mục gốc dự án (nơi có `BAT-DAU-O-DAY.md`)
2. `Ctrl+Shift+P` → gõ `Run Task` → chọn **⚙️ CÀI ĐẶT LẦN ĐẦU (chạy cái này trước)**
3. Lần sau chỉ cần **`Ctrl+Shift+B`** để bật cả API + Web

Chi tiết đầy đủ (debug breakpoint, Prisma Studio, demo webhook…): xem [`VSCODE.md`](VSCODE.md)

### Script tự làm 7 bước này:

| Bước | Nội dung |
|---|---|
| 1 | Kiểm tra **Node.js ≥ 20** |
| 2 | Kiểm tra **Docker Desktop** đang chạy |
| 3 | `docker compose up -d` → **PostgreSQL + Redis + pgAdmin**, đợi DB báo `healthy` |
| 4 | Tạo `backend/.env` + **sinh ngẫu nhiên** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WEBHOOK_SECRET` |
| 5 | `npm install` cho **backend** và **frontend** |
| 6 | `npm run setup` = Prisma Client → migrate → bật extension tiếng Việt → **nạp dữ liệu mẫu** |
| 7 | `npm run doctor` → quét lại toàn bộ môi trường |

> Chạy lại **nhiều lần cũng an toàn**: khoá bí mật bạn đã tự đặt sẽ **không bị ghi đè**.

---

## 2. Bật website

### Cách nhanh nhất

| Bạn đang ở đâu | Làm gì |
|---|---|
| **VS Code** | Bấm **`Ctrl+Shift+B`** — bật DB + API + Web trong 2 panel terminal |
| **Git Bash / terminal** | `bash start-all.sh` — bật DB + 2 server, log ghi vào `logs/api.log` và `logs/web.log`. **Ctrl+C để tắt.** |
| **Không muốn gõ lệnh** | Nháy đúp **`start-all.cmd`** — bật DB + mở 2 cửa sổ server + tự mở trình duyệt. |



### Hoặc tự mở 2 terminal:

```bash
# Terminal 1 — API
cd backend
npm run dev            # → http://localhost:4000

# Terminal 2 — Giao diện
cd frontend
npm run dev            # → http://localhost:3000
```

---

## 3. Tài khoản & đường dẫn

| | |
|---|---|
| 🌐 **Website** | http://localhost:3000 |
| 📚 **Swagger API** | http://localhost:4000/api/docs · health: http://localhost:4000/api/v1/health |
| 🗄️ **pgAdmin** | http://localhost:5050 — `admin@shop.vn` / `admin` |
| 🐳 **PostgreSQL** | `127.0.0.1:5432` — user/pass `postgres` / `postgres`, DB `ecommerce` |
| 👤 **Khách hàng** | `customer@shop.vn` / `Customer@123456` |
| 👑 **Quản trị** | `admin@shop.vn` / `Admin@123456` (vào `/admin`) |

**Dữ liệu mẫu:** 20 sản phẩm, 6 danh mục, 8 thương hiệu, 24 đơn hàng, coupon `WELCOME10`, `GIAM50K`, `FREESHIP`, `SALE20`.

---

## 4. Bảng lỗi thường gặp & cách xử lý

| Bạn thấy | Nghĩa là | Cách sửa |
|---|---|---|
| **`@prisma/client did not initialize yet`** (khi nạp dữ liệu mẫu hoặc API chết) | Prisma Client **chưa generate thật** — npm tạo bản giả | Sửa nhanh: `cd backend && npx prisma generate` rồi `cd .. && bash start-all.sh`. Bản #11 trở đi **tự phát hiện và tự generate** |
| `npm error Missing script: "doctor"` | Đang dùng **zip cũ** (bản mới đã có script `doctor`) | Tải zip mới, hoặc bỏ qua bước doctor — không bắt buộc |
| **`npm error code ENOENT` khi gõ `npm start`** | Bạn đang ở **thư mục gốc** — ở đây **không có `package.json`**, và `npm start` cũng chỉ dùng cho bản production | Đừng dùng `npm start`. Để chạy dev: `cd backend && npm run dev` **và** `cd frontend && npm run dev` (hoặc nháy đúp `start-all.cmd`) |
| **`ERR_CONNECTION_REFUSED` ở `localhost:4000`** | **API chưa chạy** (không phải lỗi mạng/trình duyệt — cổng 4000 không có ai lắng nghe) | Bật API: nháy đúp `backend\run-dev.cmd` hoặc `cd backend && npm run dev`. Xem cửa sổ đó có dòng `🚀 ShopVN API đang chạy` chưa |
| **Mở `localhost:3000` không lên** | Xem mục "4b. Web không mở lên?" ngay bên dưới | — |
| Khối **đỏ** `npm error code 1` ngay dưới `CÒN n VIỆC PHẢI SỬA` | **Không phải lỗi.** Doctor cố tình trả mã thoát 1 khi còn việc cần sửa (để dùng được trong CI) | Đọc danh sách `[ X]` phía trên rồi làm theo |
| `npm.ps1 cannot be loaded because running scripts is disabled` | Execution Policy chặn `npm.ps1` | Dùng `npm.cmd` thay cho `npm`, hoặc double-click `setup-windows.cmd` |
| `port is already allocated` / `address already in use` (5432) | Bạn đã cài PostgreSQL trực tiếp trên Windows | Mở **Services** → `PostgreSQL` → **Stop**, rồi chạy lại. Hoặc sửa port trong `docker-compose.yml` **và** `DATABASE_URL` |
| `P1001: Can't reach database server` | Container postgres chưa lên / chưa healthy | `docker compose ps` (phải thấy `healthy`) → `docker compose logs postgres` |
| `EADDRINUSE :3000` hoặc `:4000` | Cổng đang bị chiếm bởi tiến trình cũ | Windows: `netstat -ano \| findstr :3000` → `taskkill /PID <pid> /F` |
| `Cannot find module '@prisma/client'` | Chưa generate Prisma Client | `cd backend && npm run prisma:generate` |
| Lỗi `unaccent` / `pg_trgm` khi migrate | Chưa bật extension tiếng Việt | `cd backend && npm run db:extensions` |
| Docker chạy nhưng web báo "Không kết nối được máy chủ" | Backend chưa bật hoặc chết | Xem cửa sổ **ShopVN API** có dòng `API đang chạy` chưa |
| Tiếng Việt trong terminal hiện ký tự lạ | Code page console cũ | `chcp 65001` trước khi chạy (các file `.cmd` đã tự làm việc này) |

**Muốn tớ (AI) xem giúp lỗi?** Chạy lệnh này rồi gửi file log:

```bash
cd backend
npm run doctor *> doctor-log.txt
```

---

## 4b. Web không mở lên? (làm theo thứ tự)

### Bước 1 — Chắc chắn bạn chạy đúng lệnh

Lệnh đúng **phải ở trong thư mục con**, không phải thư mục gốc:

```bash
# Cửa sổ 1
cd backend
npm run dev            # đợi thấy: 🚀 ShopVN API đang chạy tại http://localhost:4000/api/v1

# Cửa sổ 2
cd frontend
npm run dev            # đợi thấy: ✓ Ready in ... + Local: http://localhost:3000
```

> ❌ `npm start` ở thư mục gốc → `npm error code ENOENT` (thư mục gốc không có `package.json`).
> ✅ Cách gọn nhất: **nháy đúp `start-all.cmd`** — nó tự mở đúng 2 cửa sổ và chờ server lên rồi mới mở trình duyệt.

### Bước 2 — Đọc lỗi trong 2 cửa sổ server

Hai cửa sổ **không tự đóng** khi lỗi (bản mới). Dòng cuối cùng là nguyên nhân:

| Dòng lỗi trong cửa sổ | Nghĩa là | Cách sửa |
|---|---|---|
| `Can't reach database server` / `P1001` | Database chưa lên | `docker compose up -d` rồi `docker compose ps` (phải thấy `healthy`) |
| `Docker Desktop chua chay` | Docker chưa mở | Mở Docker Desktop, đợi **Engine running** |
| `EADDRINUSE :3000` | Cổng bị chiếm | Đóng cửa sổ server cũ, hoặc `netstat -ano \| findstr :3000` → `taskkill /PID <pid> /F` |
| `Missing script: "dev"` | Đang ở **thư mục gốc** | `cd backend` hoặc `cd frontend` rồi chạy lại |
| `Cannot find module` | Thiếu thư viện | `bash setup-gitbash.sh` (hoặc task **⚙️ CÀI ĐẶT LẦN ĐẦU** trong VS Code) |

### Bước 3 — Vẫn không lên? Chạy công cụ chẩn đoán

**Nháy đúp `chan-doan.cmd`** (hoặc Git Bash: `bash chan-doan.sh`).
Nó kiểm tra: Docker → container → `.env`/thư viện/DB → cổng 3000/4000 → thử kết nối, rồi **lưu tất cả vào `chan-doan-ket-qua.txt`**.
Gửi file đó (hoặc dán nội dung) vào khung chat là tớ chỉ đúng chỗ cần sửa.

---

## 4c. `ERR_CONNECTION_REFUSED` — nghĩa là gì?

Khi trình duyệt báo **`localhost refused to connect`** / **`ERR_CONNECTION_REFUSED`**, điều đó có nghĩa:
**không có tiến trình nào đang chạy ở cổng đó**. Không phải lỗi mạng, không phải lỗi trình duyệt, không phải lỗi tường lửa.

| Bạn mở | Báo lỗi | Nghĩa là | Cách sửa |
|---|---|---|---|
| `localhost:4000/api/docs` | ERR_CONNECTION_REFUSED | **API chưa chạy** | `cd backend && npm run dev` (hoặc nháy đúp `backend\run-dev.cmd`) |
| `localhost:3000` | ERR_CONNECTION_REFUSED | **Web chưa chạy** | `cd frontend && npm run dev` (hoặc nháy đúp `frontend\run-dev.cmd`) |
| Vào được `:3000` nhưng sản phẩm trống | — | Web chạy, **API chưa chạy** | Bật API trước rồi tải lại trang |

### 🛡️ Từ bản #8: server tự kiểm tra và báo lỗi rõ ràng

`npm run dev` giờ chạy **lớp kiểm tra trước** (`predev`). Nếu có vấn đề, nó in ra **đúng lý do + cách sửa** thay vì thoát im lặng:

```
▶ Chuẩn bị khởi động API ShopVN (kiểm tra nhanh vài thứ)
  [ X] Khoá bí mật chưa đạt yêu cầu (cần ≥ 32 ký tự): JWT_ACCESS_SECRET = 31 ký tự (vẫn là giá trị mẫu)
  [OK] Thư viện + Prisma Client đã sẵn sàng
  [OK] Cổng 4000 đang trống
  [OK] PostgreSQL kết nối được (127.0.0.1:5432 · database: ecommerce)

  ✖ CHƯA khởi động được API — cần sửa 1 việc ở trên.

  1. Sinh lại khoá tự động:  cd backend && node scripts/bootstrap-env.mjs
```

**Nó chặn khởi động (phải sửa) khi:** thiếu `.env` · khoá JWT < 32 ký tự hoặc còn giá trị mẫu · thiếu thư viện/Prisma Client · **cổng 4000 (hoặc 3000) đang bị chiếm**.
**Nó chỉ cảnh báo vàng (vẫn chạy) khi:** chưa bật PostgreSQL · API chưa chạy (phía frontend).

> 💡 Nhờ vậy, thay vì "mở web không lên" mà không biết vì sao, cửa sổ server sẽ **nói thẳng** việc cần làm.

---

## 5. Lệnh dùng hằng ngày

```bash
# Database
.\db-start.cmd                                  # bật DB (Docker)
.\db-stop.cmd                                   # tắt DB, dữ liệu vẫn còn
docker compose down -v                          # XOÁ SẠCH dữ liệu (cần cẩn thận)

# Kiểm tra sức khoẻ dự án
cd backend && npm run doctor                    # quét môi trường
cd backend && npm run seed                      # nạp lại dữ liệu mẫu
cd backend && npm test                          # chạy 36 test
cd backend && npx prisma studio                 # xem/sửa DB bằng giao diện web

# Đổi code xong
cd frontend && npm run build                    # kiểm tra build production
```

---

## 6. Checklist trước khi demo / phỏng vấn (5 phút)

- [ ] `docker compose ps` → `shopvn_postgres` ở trạng thái **healthy**
- [ ] Mở http://localhost:3000 → trang chủ có sản phẩm + ảnh
- [ ] Đăng nhập `customer@shop.vn` → thêm 1 sản phẩm vào giỏ → **checkout COD** → xem đơn trong `/account/orders`
- [ ] Thử **chuyển khoản QR**: checkout với `BANK_TRANSFER` → trang đơn hiện **mã QR VietQR**
- [ ] Đăng nhập `admin@shop.vn` → `/admin` xem dashboard → `/admin/orders` **đổi trạng thái đơn** vừa tạo
- [ ] `/admin/statistics` → biểu đồ doanh thu
- [ ] Tìm kiếm **có dấu và không dấu** (`loa bluetooth` / `loa bluetooth`) — nhờ extension `unaccent`
- [ ] Mở http://localhost:4000/api/docs → Swagger hiện danh sách API

> **Mẹo demo email:** `MAIL_DRIVER=console` nên mail xác thực / quên mật khẩu **in thẳng ra cửa sổ terminal backend**. Muốn gửi mail thật: điền `SMTP_USER` + `SMTP_PASS` (Gmail App Password) trong `backend/.env`.

---

## 7. Nếu bạn **không** muốn dùng Docker

Vẫn chạy được với PostgreSQL cài trực tiếp trên Windows:

1. Tạo database tên `ecommerce`
2. Sửa `backend/.env`:
   ```
   DATABASE_URL=postgresql://postgres:MAT_KHAU_CUA_BAN@127.0.0.1:5432/ecommerce?schema=public
   ```
3. Chạy:
   ```bash
   cd backend
   npm install
   npm run setup        # generate -> migrate -> extension -> seed
   ```

---

## 8. Các file tiện dụng có trong dự án

| File | Dùng để |
|---|---|
| `start-all.cmd` | **Bật tất cả**: kiểm tra Docker/thư viện/cổng → mở 2 server → **đợi server lên** rồi mới mở trình duyệt |
| `start-all.sh` | **Bật tất cả** cho Git Bash — log ở `logs/api.log`, `logs/web.log` |
| `chan-doan.cmd` / `chan-doan.sh` | **Chẩn đoán khi web không mở lên** — tự lưu kết quả ra `chan-doan-ket-qua.txt` |
| `stop-all.sh` / `stop-all.cmd` | Tắt sạch API + web (giải phóng cổng 3000/4000) |
| `xem-log.sh` | Xem log realtime (`bash xem-log.sh`, `bash xem-log.sh loi`) |
| `kiem-tra.cmd` | Bản nháy đúp của `kiem-tra.sh` cho Windows |
| `BUILD-INFO.txt` | Xem bạn đang dùng bản dựng nào (chống nhầm zip cũ) |
| `VSCODE.md` | Hướng dẫn chạy/debug bằng VS Code (Tasks, breakpoint, Prisma Studio) |
| `.vscode/` | Cấu hình sẵn: 22 task, 5 cấu hình debug, extension gợi ý |
| `db-start.cmd` / `db-stop.cmd` | Chỉ bật / tắt database |
| `backend/run-dev.cmd` | Chạy riêng server API (nháy đúp cũng được) |
| `frontend/run-dev.cmd` | Chạy riêng server giao diện |
| `setup-windows.cmd` | Cài đặt lần đầu (Windows, không cần Git Bash) |
| `setup-gitbash.sh` | Cài đặt lần đầu (Git Bash / WSL / macOS / Linux) |
| `backend/scripts/doctor.mjs` | Quét môi trường: `cd backend && npm run doctor` |
| `backend/scripts/bootstrap-env.mjs` | Tạo/sửa `backend/.env` + sinh khoá bí mật |

---

## 9. Đọc thêm

| File | Nội dung |
|---|---|
| `README.md` | Tổng quan dự án, công nghệ, cấu trúc thư mục |
| `WINDOWS-SETUP.md` | Hướng dẫn Windows chi tiết (nhiều tình huống, có cả bản không Docker) |
| `docs/01-LO-TRINH-ROADMAP.md` | Lộ trình 4 tuần và tiêu chí hoàn thành |
| `docs/02-YEU-CAU-CHUC-NANG.md` | Đặc tả chức năng (khách hàng + quản trị) |
| `docs/03-KIEN-TRUC-VA-DATABASE.md` | Kiến trúc hệ thống, 27 model, sơ đồ quan hệ |
| `docs/04-BAO-MAT-VA-TICH-HOP.md` | Bảo mật, rate limit, webhook, tích hợp bên thứ ba |
| `docs/05-SETUP-VA-YEU-CAU.md` | Yêu cầu môi trường, biến môi trường |
| `docs/06-UI-UX-DESIGN-SYSTEM.md` | Design system, màu sắc, animation |
| `docs/07-HUONG-DAN-CAI-DAT-VA-CHAY-DU-AN.md` | Cài đặt chi tiết, kiểm thử, checklist bàn giao, kịch bản demo |
