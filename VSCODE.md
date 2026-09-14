# 💻 Chạy dự án bằng VS Code (Windows + Docker)

> Cấu hình đã có sẵn trong thư mục `.vscode/` của dự án — **cậu không cần cài gì thêm ngoài VS Code + Docker Desktop**.
> Muốn nhanh? Xem mục **3. Chạy dự án** ngay bên dưới.

---

> **Bật nhanh bằng 1 lệnh (khuyên dùng khi mới clone):** trong terminal Git Bash của VS Code —
> `bash start-all.sh` (chế độ dev) hoặc `bash start-all.sh prod` (nhẹ RAM, nhanh, ổn định nhất).
> Kiểm tra toàn hệ thống: `bash kiem-tra.sh` (26 mục). Tắt: `bash stop-all.sh`.

## 1. Mở đúng thư mục

**File → Open Folder…** → chọn **thư mục gốc dự án** (thư mục chứa `BAT-DAU-O-DAY.md`, `docker-compose.yml`, `backend/`, `frontend/`).

> ⚠️ Đừng mở thư mục `backend` hay `frontend` riêng lẻ — phải mở **thư mục gốc**, vì các task và cấu hình debug đều tính từ đó.
>
> Nếu đang mở đúng, thanh Explorer bên trái sẽ hiện `backend`, `frontend`, `docs`, `.vscode`…

Khi mở lần đầu, VS Code sẽ hỏi **"This workspace has extension recommendations"** → bấm **Install**.
Nếu lỡ bỏ qua: `Ctrl+Shift+P` → gõ `Show Recommended Extensions` → cài các mục sau (quan trọng nhất ở trên):

| Extension | Để làm gì |
|---|---|
| **Prisma** | Tô màu `schema.prisma`, format, gợi ý model |
| **ESLint** + **Prettier** | Bắt lỗi + tự format khi lưu |
| **Tailwind CSS IntelliSense** | Gợi ý class Tailwind |
| **Error Lens** | Hiện lỗi ngay bên dòng code |
| **Docker** | Xem container, bật/tắt DB bằng chuột |
| **Vitest** | Chạy/debug từng test trong test explorer |
| **dotenv** | Tô màu file `.env` |

---

## 2. Bật Docker Desktop

Mở Docker Desktop, đợi góc dưới trái hiện **Engine running**.
(Kiểm tra nhanh: `Ctrl+Shift+P` → `Tasks: Run Task` → `1 · Docker: bật database`.)

---

## 3. Chạy dự án

### 🅰️ Cài đặt lần đầu (chỉ 1 lần)

`Ctrl+Shift+P` → gõ `Run Task` → chọn **⚙️ CÀI ĐẶT LẦN ĐẦU (chạy cái này trước)**

Task này tự chạy tuần tự 5 việc trong 1 panel terminal:

| | Việc | Nội dung |
|---|---|---|
| 1 | Docker | `docker compose up -d` → PostgreSQL + Redis + pgAdmin |
| 2 | npm install | thư viện backend |
| 3 | npm install | thư viện frontend |
| 4 | migrate + seed | tạo bảng, bật extension tiếng Việt, nạp **20 sản phẩm + 24 đơn hàng** |
| 5 | doctor | quét lại môi trường, in ra việc còn thiếu (nếu có) |

⏱ Khoảng **3–5 phút** ở lần đầu (chủ yếu là tải thư viện).

> 💡 Thích dùng Git Bash hơn? Mở terminal trong VS Code (`` Ctrl+` ``) và chạy `bash setup-gitbash.sh` — tác dụng y hệt.

### 🅱️ Chạy website — **Ctrl+Shift+B**

Bấm **`Ctrl+Shift+B`** → task **🚀 CHẠY CẢ HỆ THỐNG** tự:
1. bật database (Docker),
2. mở 2 panel terminal: **▶️ API — cổng 4000** và **▶️ WEB — cổng 3000**.

Sau ~15 giây, mở http://localhost:3000

> Task API và WEB chạy **nền trong 2 panel riêng** — cậu sửa code, cả hai tự reload (hot reload).
> Tắt: bấm vào panel rồi `Ctrl+C`.

---

## 4. Debug bằng breakpoint (điểm cộng khi demo)

1. Mở tab **Run and Debug** (`Ctrl+Shift+D`).
2. Chọn cấu hình:
   - **🐞 API — debug** — debug backend, đặt breakpoint trong `backend/src/**`
   - **🌐 WEB — debug** — debug frontend Next.js (tự mở trình duyệt)
   - **🚀 Debug CẢ HAI** — chạy song song cả hai (compound)
3. Bấm **F5**.

**Thử ngay:** mở `backend/src/modules/orders/orders.service.ts`, tìm hàm tạo đơn (khoảng dòng 100–200), bấm vào **lề trái số dòng** để đặt chấm đỏ → trên web, thêm sản phẩm vào giỏ và bấm **Đặt hàng** → VS Code sẽ **dừng ngay tại breakpoint**, cậu xem được biến `items`, `subtotal`, `coupon`…

> Breakpoint chạy được nhờ `autoAttachChildProcesses` + `tsx` (đã cấu hình sẵn, không cần `--inspect` thủ công).

---

## 5. Danh sách task có sẵn

`Ctrl+Shift+P` → `Tasks: Run Task`

| Task | Việc |
|---|---|
| **🚀 CHẠY CẢ HỆ THỐNG** (Ctrl+Shift+B) | Bật DB + API + Web |
| ▶️ API — cổng 4000 | Chỉ chạy backend (có lớp kiểm tra trước, báo lỗi rõ ràng) |
| ▶️ WEB — cổng 3000 | Chỉ chạy frontend |
| 🛑 Tắt database | `docker compose stop` (dữ liệu vẫn còn) |
| 🩺 Kiểm tra môi trường (doctor) | Biết ngay đang thiếu gì |
| 🌱 Nạp lại dữ liệu mẫu | Reset dữ liệu demo |
| 🗄️ Mở Prisma Studio | Xem/sửa DB bằng web (http://localhost:5555) — **rất tiện khi demo** |
| 🧪 Chạy test backend | 36 test (vitest) |
| 🔍 Kiểm tra kiểu TypeScript | `tsc --noEmit` |
| 🏗️ Build production frontend | Kiểm tra trước khi demo/nộp |
| 🔔 Giả lập webhook ngân hàng | **Demo hay nhất**: tự xác nhận đã thanh toán |
| 📜 Xem log API / WEB (realtime) | Chỉ dùng khi chạy bằng `start-all.sh` |

### 🔔 Demo webhook ngân hàng (30 giây, rất "ăn điểm")

1. Trên web: đặt 1 đơn với phương thức **Chuyển khoản** → ghi lại mã đơn (vd `DH26091470870`).
2. `Ctrl+Shift+P` → `Tasks: Run Task` → **🔔 Giả lập webhook ngân hàng**, nhưng task cần tham số mã đơn → hãy mở terminal (`` Ctrl+` ``) và chạy:

```bash
cd backend
npm run webhook:simulate -- --order=DH26091470870
```

3. Tải lại trang đơn hàng → đơn đã chuyển **Đã thanh toán / Đã xác nhận** mà không bấm gì thêm.

---

## 6. Cấu trúc đã cấu hình cho cậu

```
.vscode/
├── tasks.json       ← 22 task (cài đặt, chạy, test, build, seed, log, kiểm tra 26 mục…)
├── launch.json      ← 5 cấu hình debug + 1 compound
├── settings.json    ← terminal mặc định = Git Bash, format khi lưu, ẩn node_modules
└── extensions.json  ← danh sách extension gợi ý
```

`settings.json` đã đặt sẵn **terminal mặc định là Git Bash** — tránh đúng lỗi `npm.ps1 cannot be loaded because running scripts is disabled` mà PowerShell hay gặp.

---

## 7. Lỗi thường gặp trong VS Code

| Hiện tượng | Nguyên nhân | Cách sửa |
|---|---|---|
| Task không thấy trong danh sách | Chưa mở đúng thư mục gốc (không thấy `.vscode/`) | File → Open Folder → chọn thư mục gốc |
| `npm error code ENOENT` | Gõ `npm start` ở **thư mục gốc** (không có `package.json`) | Bấm **`Ctrl+Shift+B`** thay vì gõ tay; hoặc `cd backend` / `cd frontend` rồi `npm run dev` |
| **Web mở không lên** | Xem panel **▶️ WEB** có dòng `✓ Ready` chưa, panel **▶️ API** có dòng `🚀 ShopVN API đang chạy` chưa | Nếu có lỗi: mở terminal chạy `bash chan-doan.sh` → gửi file `chan-doan-ket-qua.txt` |
| `ERR_CONNECTION_REFUSED` ở `localhost:4000` | Panel **▶️ API** chưa chạy hoặc đã thoát | Bấm `Ctrl+Shift+B`; rồi đọc dòng `✖ CHƯA khởi động được API` trong panel API — nó ghi rõ việc cần sửa |
| `npm.ps1 cannot be loaded…` | Terminal đang là PowerShell + Execution Policy | VS Code đã đặt mặc định Git Bash; nếu vẫn lỗi: `Ctrl+Shift+P` → `Terminal: Select Default Profile` → **Git Bash** |
| Task báo `docker: command not found` | Docker Desktop chưa chạy | Mở Docker Desktop, đợi **Engine running** |
| API chạy nhưng web báo "Không kết nối được máy chủ" | Panel **API** bị lỗi hoặc chưa chạy | Xem panel API: phải có dòng `🚀 ShopVN API đang chạy tại http://localhost:4000/api/v1` |
| `EADDRINUSE :3000` / `:4000` | Cổng đang bị tiến trình cũ chiếm | Tắt panel cũ, hoặc PowerShell: `netstat -ano \| findstr :3000` rồi `taskkill /PID <pid> /F` |
| Prisma báo thiếu `@prisma/client` | Chưa generate sau khi cài | Task **4 · Tạo bảng + nạp dữ liệu mẫu** |
| Extension Prisma báo lỗi đỏ trong `schema.prisma` | Chưa `prisma generate` | Chạy task 4, rồi `Ctrl+Shift+P` → `Developer: Reload Window` |
| Breakpoint không dừng | Đang chạy `npm run dev` bằng terminal thường (không qua F5) | Bấm **F5** với cấu hình **🐞 API — debug** |
| Tìm kiếm (`Ctrl+Shift+F`) rất chậm | Quét cả `node_modules` | Đã cấu hình `search.exclude` sẵn — nếu vẫn chậm, reload window |

---

## 8. Tài khoản & đường dẫn

| | |
|---|---|
| Website | http://localhost:3000 |
| API / Swagger | http://localhost:4000/api/v1 · http://localhost:4000/api/docs |
| Prisma Studio | http://localhost:5555 (nhờ task 🗄️) |
| pgAdmin | http://localhost:5050 — `admin@shop.vn` / `admin` |
| Khách hàng | `customer@shop.vn` / `Customer@123456` |
| Quản trị | `admin@shop.vn` / `Admin@123456` → `/admin` |

---

## 9. Mẹo VS Code hữu ích khi làm đồ án

| Phím | Việc |
|---|---|
| `Ctrl+Shift+B` | Bật cả API + Web |
| `F5` | Debug (breakpoint) |
| `Ctrl+Shift+F` | Tìm trong toàn dự án (đã ẩn `node_modules`) |
| `Ctrl+P` | Mở nhanh file theo tên |
| `Ctrl+Shift+P` → `Prisma: Generate` | Generate Prisma Client ngay trong VS Code |
| `Ctrl+Shift+P` → `Docker: Focus on Containers View` | Bật/tắt container bằng chuột (xem log DB trực tiếp) |
| `Ctrl+K Ctrl+0` | Gập hết code, dễ nhìn tổng thể file |

> 📸 **Chụp ảnh cho báo cáo/phỏng vấn:** dùng task **⛶** hoặc `Ctrl+Shift+P` → `Screenshot` (extension CodeSnap) để chụp code, và mở **Prisma Studio** chụp bảng dữ liệu — trông chuyên nghiệp hơn ảnh terminal.
