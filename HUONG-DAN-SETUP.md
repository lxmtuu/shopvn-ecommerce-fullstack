# HƯỚNG DẪN SETUP HOÀN CHỈNH — ShopVN E-commerce

> **Đây là hướng dẫn chính thức.** Cứ làm tuần tự từ mục 1 → mục 9 là chạy được.
> Gặp lỗi thì nhảy thẳng tới **mục 8 (Xử lý sự cố)** — hầu hết lỗi đều có sẵn cách sửa ở đó.
>
> Thời gian cài đặt lần đầu: **~5 phút** (chưa tính thời gian Docker tải image).

---

## 1. Cần chuẩn bị gì trước khi bắt đầu

| Cần | Kiểm tra thế nào | Ghi chú |
|---|---|---|
| **Node.js ≥ 20 LTS** | `node -v` → phải in ra `v20…` hoặc cao hơn | Chưa có thì tải: <https://nodejs.org> · Cài xong **mở lại** Git Bash |
| **Docker Desktop** | Mở app, đợi tới khi góc dưới trái hiện **Engine running** | Cậu đã cài sẵn — không cần cài lại |
| **Git Bash** | Menu Start → gõ "Git Bash" | Có sẵn khi cài Git for Windows. **Dùng Git Bash, đừng dùng PowerShell** (tránh lỗi `npm.ps1 cannot be loaded`) |
| **RAM trống ≥ 1,5 GB** | Mở Task Manager → Performance | Máy yếu RAM thì dùng chế độ `prod` (mục 7) |
| Ổ đĩa trống ~2 GB | — | Riêng `node_modules` đã ~600 MB |

**Nên để dự án ở ngoài OneDrive/Desktop** (ví dụ `C:\protect code\...` hoặc `C:\dev\...`).
OneDrive đồng bộ liên tục có thể khoá file trong `node_modules` làm lệnh cài đặt chạy sai.

---

## 2. Tải và giải nén đúng cách

1. Tải `shopvn-ecommerce-fullstack.zip` → chuột phải → **Extract All…**
2. ⚠️ **Xoá thư mục dự án cũ trước khi giải nén** (nếu đã từng tải bản trước). Giải nén đè nhiều lần dễ làm lẫn file giữa các bản dựng.
3. Ví dụ thư mục chuẩn sau khi giải nén:

   ```
   C:\protect code\shopvn-ecommerce-fullstack\ecommerce-fullstack\
   ```

   Đường dẫn **có dấu cách và tiếng Việt vẫn chạy tốt** — tớ đã test thật với đường dẫn có dấu cách. Nhưng khi gõ lệnh trong Git Bash thì **luôn đặt trong dấu ngoặc kép**.

### 2.1. Kiểm tra có đúng gói mới không

Trong thư mục gốc dự án, phải có đủ các file sau (mở bằng File Explorer là thấy ngay):

```
BAT-DAU-O-DAY.md        ← đọc đầu tiên sau khi lên được
HUONG-DAN-SETUP.md      ← file bạn đang đọc
BUILD-INFO.txt          ← ghi rõ "BẢN DỰNG #10"
start-all.sh            ← lệnh bật hệ thống
stop-all.sh             ← lệnh tắt
xem-log.sh              ← xem log
kiem-tra.sh             ← tự kiểm tra 29 mục
chan-doan.sh            ← chẩn đoán khi lỗi
backend\scripts\doctor.mjs
```

Hoặc kiểm tra bằng lệnh (Git Bash):

```bash
cd "/c/protect code/shopvn-ecommerce-fullstack/ecommerce-fullstack"
ls BUILD-INFO.txt HUONG-DAN-SETUP.md start-all.sh stop-all.sh xem-log.sh kiem-tra.sh
```

**Thiếu bất kỳ mục nào ⇒ cậu đang dùng zip cũ.** Tải lại zip mới nhất.

---

## 3. Bật Docker Desktop

Mở **Docker Desktop** và **đợi** tới khi:

- Góc dưới trái hiện chữ **Engine running** (màu xanh), và
- Dòng trạng thái ở trên có chữ **running**.

> Đây là nguyên nhân số 1 khiến app không lên. Docker mở lên nhưng engine chưa chạy là chưa dùng được.

---

## 4. Chạy setup — 3 lệnh

Mở **Git Bash** (chuột phải trong thư mục dự án → *Open Git Bash here*), rồi dán nguyên khối:

```bash
cd "/c/protect code/shopvn-ecommerce-fullstack/ecommerce-fullstack"   # ← đổi thành đường dẫn máy cậu
bash stop-all.sh        # tắt sạch server cũ (chạy được cả khi chưa có gì)
bash start-all.sh       # tự cài + tự sửa + tự chạy + TỰ KIỂM TRA
```

### `start-all.sh` tự làm gì (không cần làm tay gì cả)

| Bước | Việc |
|---|---|
| 1 | Kiểm tra Node.js ≥ 20 + **đọc RAM trống** (nhắc nếu máy yếu) |
| 2 | Kết nối PostgreSQL; nếu chưa chạy thì tự `docker compose up -d` và **đợi tới khi DB sẵn sàng** |
| 3 | **Tự tạo/sửa `backend/.env`** — sinh khoá bí mật mạnh nếu thiếu/quá ngắn/còn là khoá mẫu |
| 4 | Cài thư viện (`npm install`) nếu thiếu `node_modules` |
| 5 | Tạo bảng (Prisma migrate) + **nạp dữ liệu mẫu nếu database còn trống** |
| 6 | Dọn tiến trình cũ của dự án đang giữ cổng 3000/4000 (chương trình lạ thì chỉ báo, không tự tắt) |
| 7 | Chạy API + website ở chế độ nền, ghi log, **đợi tới khi cả hai trả HTTP 200** |
| 8 | **Mở thử 4 trang chính** — lỗi lộ ra ngay, không đợi tới lúc demo |

⏱️ **Lần đầu: 2–5 phút** (chủ yếu là tải thư viện). **Các lần sau: ~10–40 giây.**

---

## 5. Kết quả đúng trông như thế này

```
▸ 5/8  Database: bảng + dữ liệu mẫu
  [OK] Đã áp dụng cấu trúc bảng
  [OK] Database đã có dữ liệu mẫu

▸ 7/8  Chạy API + website
  [OK] API       → http://127.0.0.1:4000/api/v1/health trả 200
  [OK] Website   → http://localhost:3000 trả 200

▸ 8/8  Mở thử các trang chính
  [OK] Trang /            → 200
  [OK] Trang /products    → 200
  [OK] Trang /login       → 200
  [OK] Trang /admin       → 200

════════════════════════════════════════════════════════════
  ✅ CHẠY ĐƯỢC — mở trình duyệt:  http://localhost:3000
════════════════════════════════════════════════════════════
```

Thấy dòng **✅ CHẠY ĐƯỢC** ⇒ xong. Mở trình duyệt: <http://localhost:3000>

### Tài khoản & địa chỉ

| | |
|---|---|
| **Website** | <http://localhost:3000> |
| **API** | <http://localhost:4000/api/v1> |
| **Swagger (thử API trực tiếp)** | <http://localhost:4000/api/docs> |
| **pgAdmin** (xem database) | <http://localhost:5050> — `admin@shop.vn` / `admin` |
| **Khách hàng** | `customer@shop.vn` / `Customer@123456` |
| **Quản trị** (vào `/admin`) | `admin@shop.vn` / `Admin@123456` |

Dữ liệu mẫu: **20 sản phẩm · 8 danh mục/thương hiệu · 24 đơn hàng**.

---

## 6. Kiểm tra lại cho chắc (khuyến nghị)

```bash
bash kiem-tra.sh
```

Script tự thử **29 mục**: API, database có dữ liệu, tìm kiếm, đăng nhập khách + quản trị,
phân quyền (khách bị chặn khỏi trang quản trị), mã QR chuyển khoản, và mở 15 trang web.

Kết quả đạt:

```
════════════════════════════════════════════════════
  ✅ TẤT CẢ ĐỀU ĐẠT — 29 mục kiểm tra
════════════════════════════════════════════════════
```

Có mục `[ X]` ⇒ script in ra **lý do + cách xử lý** ngay bên dưới.

---

## 7. Dùng hằng ngày — bảng lệnh

Mở Git Bash tại thư mục dự án:

| Lệnh | Việc |
|---|---|
| `bash start-all.sh` | **Bật hệ thống** ở chế độ dev (sửa code có hot-reload) |
| `bash start-all.sh prod` | **Bật ở chế độ production** — nhẹ RAM, mở trang ~10 ms, ổn định nhất khi **demo** |
| `bash stop-all.sh` | Tắt API + web (database vẫn chạy, dữ liệu còn nguyên) |
| `bash xem-log.sh` | Xem log realtime — **Ctrl+C để thoát** |
| `bash xem-log.sh loi` | Chỉ in các dòng có lỗi |
| `bash kiem-tra.sh` | Tự kiểm tra 29 mục |
| `bash chan-doan.sh` | Chẩn đoán sâu, lưu ra `chan-doan-ket-qua.txt` (để gửi khi cần trợ giúp) |
| `bash stop-all.sh` + `docker compose stop` | Tắt luôn cả database |

> 🖱️ **Không thích gõ lệnh?** Nháy đúp **`start-all.cmd`** (bật), **`stop-all.cmd`** (tắt), **`kiem-tra.cmd`** (kiểm tra).

### Máy ít RAM thì sao?

Script **tự phát hiện** máy dưới ~3 GB RAM (hoặc RAM trống dưới 900 MB) và **tự chuyển sang chế độ production** —
vì ở chế độ dev, Next.js biên dịch dần từng trang và có thể bị hệ điều hành tắt giữa chừng khiến web "biến mất".

```
  [ !] Máy chỉ có 1984 MB RAM (trống ~1431 MB) — tự chuyển sang chế độ PRODUCTION
  Chế độ chạy: PRODUCTION — nhẹ RAM, mượt, tự build rồi chạy
```

Muốn **ép chạy chế độ dev** (khi đang sửa code và đã đóng bớt ứng dụng):

```bash
bash start-all.sh dev
```

### Chọn chế độ nào?

| | `bash start-all.sh` (dev) | `bash start-all.sh prod` |
|---|---|---|
| Tốc độ mở trang | 0,5–9 giây (biên dịch dần) | **~10 ms** |
| RAM | Cao hơn | **Thấp hơn nhiều** |
| Sửa code | Có hot-reload ngay | Phải chạy lại lệnh |
| Dùng khi nào | **Đang lập trình** | **Demo, chụp ảnh, quay video, máy yếu RAM** |

---

## 8. Xử lý sự cố — gặp lỗi thì tra ở đây

| Hiện tượng | Nguyên nhân & cách sửa |
|---|---|
| `ERR_CONNECTION_REFUSED` ở `localhost:3000` **hoặc** `localhost:4000` | Chưa có gì chạy ở cổng đó. Chạy `bash start-all.sh`. Nếu vẫn vậy: `bash xem-log.sh` để xem server chết vì lý do gì. **Không phải lỗi mạng/firewall.** |
| Web mở ra nhưng **trắng trang** | Web đang chạy nhưng không gọi được API. Chạy `bash kiem-tra.sh` → xem mục `1. API & database`. Thường do API chưa lên. |
| Web **tự tắt** khi bấm vào `/admin` | Hết RAM khi Next.js biên dịch. **Sửa:** `bash start-all.sh prod`, hoặc đóng Chrome/Docker bớt. |
| `npm.ps1 cannot be loaded because running scripts is disabled` | Cậu đang dùng **PowerShell**. Chuyển sang **Git Bash** (VS Code: chọn terminal Git Bash, hoặc xem `VSCODE.md`). |
| Docker **chưa chạy** | Mở Docker Desktop, đợi **Engine running**, chạy lại `bash start-all.sh`. Script cũng sẽ báo đúng lỗi này. |
| Cổng 3000/4000 **bị chương trình khác chiếm** | Script không tự tắt tiến trình lạ. Chạy `bash chan-doan.sh` để xem PID rồi tự đóng chương trình đó (hoặc khởi động lại máy). |
| `npm error code ENOENT` khi gõ lệnh ở **thư mục gốc** | Thư mục gốc **không có** `package.json`. Lệnh `npm` phải chạy trong `backend/` hoặc `frontend/`, hoặc dùng `start-all.sh`. |
| `@prisma/client did not initialize yet` (khi seed hoặc API chết) | Prisma Client **chưa được generate thật** (npm tạo bản giả). Sửa: `cd backend && npx prisma generate` rồi `cd .. && bash start-all.sh`. Bản #11 trở đi **tự phát hiện và tự generate**. |
| API chạy nhưng **đăng nhập mãi không được** | Bị giới hạn 5 lần/15 phút (chống dò mật khẩu). Khởi động lại API: `bash stop-all.sh` rồi `bash start-all.sh`. |
| Muốn **xoá sạch dữ liệu, về ban đầu** | `bash stop-all.sh` rồi `cd backend && npx prisma migrate reset --force` (tự tạo lại bảng + nạp lại dữ liệu mẫu), sau đó `cd .. && bash start-all.sh`. |
| Đổi **mật khẩu/tài khoản demo** | Sửa trong `backend/prisma/seed.ts` rồi chạy lại lệnh reset ở trên. |
| Muốn **gửi email thật** (quên mật khẩu) | Mở `backend/.env`, điền `MAIL_DRIVER=smtp`, `SMTP_USER`, `SMTP_PASS` (Gmail App Password). Mặc định email chỉ ghi ra log — không ảnh hưởng việc chạy app. |

**Khi cần trợ giúp**, gửi tớ 1 trong các file sau (đều nằm trong thư mục dự án):

- `chan-doan-ket-qua.txt` (do `bash chan-doan.sh` tạo) ← **tốt nhất**
- `logs/api.log`, `logs/web.log`
- hoặc ảnh chụp màn hình terminal

---

## 9. Checklist trước khi demo / nộp bài

- [ ] Docker Desktop đang ở **Engine running**
- [ ] `bash start-all.sh prod` chạy tới dòng **✅ CHẠY ĐƯỢC**
- [ ] `bash kiem-tra.sh` → **✅ 26/26 ĐẠT**
- [ ] Vào được `/` , `/products`, `/cart`, `/checkout`, `/login`
- [ ] Đăng nhập khách `customer@shop.vn` → đặt được 1 đơn hàng
- [ ] Đăng nhập admin `admin@shop.vn` → vào `/admin` xem thống kê
- [ ] Mở `/api/docs` → Swagger hiện danh sách API
- [ ] Đã thử tắt rồi bật lại 1 lần cho quen tay (`bash stop-all.sh` → `bash start-all.sh prod`)

---

## 10. VS Code (khuyến nghị cho việc lập trình)

Mở thư mục dự án trong VS Code rồi:

- **`Ctrl+Shift+B`** → chạy task *🚀 CHẠY CẢ HỆ THỐNG*
- **`F5`** → chạy/debug API + web bằng launch config (có breakpoint)
- **`Ctrl+Shift+P` → `Tasks: Run Task`** → xem toàn bộ 19 task (cài đặt, chạy, test, seed, log…)

Chi tiết đầy đủ (cài extension, đặt breakpoint, demo webhook thanh toán): xem **`VSCODE.md`**.

---

## Phụ lục — Cấu trúc & cổng

```
ecommerce-fullstack/
├── BAT-DAU-O-DAY.md        hướng dẫn nhanh + bảng lỗi
├── HUONG-DAN-SETUP.md      ← file này (hướng dẫn đầy đủ)
├── VSCODE.md               hướng dẫn VS Code
├── BUILD-INFO.txt          bản dựng nào, có gì mới
├── start-all.sh / .cmd     bật hệ thống
├── stop-all.sh / .cmd      tắt hệ thống
├── xem-log.sh              xem log
├── kiem-tra.sh / .cmd      tự kiểm tra 29 mục
├── chan-doan.sh / .cmd     chẩn đoán sự cố
├── docker-compose.yml      PostgreSQL + Redis + pgAdmin
├── backend/                Node.js + Express + Prisma  (API, .env, prisma/, scripts/)
└── frontend/               Next.js + TypeScript + Tailwind  (src/app, src/components)
```

| Cổng | Dịch vụ |
|---|---|
| 3000 | Website (Next.js) |
| 4000 | API + Swagger |
| 5050 | pgAdmin |
| 5432 | PostgreSQL |
| 6379 | Redis |

**Lệnh `npm` chỉ chạy trong `backend/` hoặc `frontend/`** — thư mục gốc cố ý không có `package.json`.

---

*Bản dựng #10 — cập nhật 14/09/2026*
