# ShopVN — CHUẨN BỊ DEMO 10 PHÚT

> Tài liệu này để bạn **tự tin đứng demo và trả lời bảo vệ**. Đọc 1 lần trước, luyện 1 lần
> bấm theo kịch bản là đủ. Tổng thời gian chuẩn bị: ~20 phút.

---

## PHẦN 0 — SỐ LIỆU THẬT CỦA DỰ ÁN (dùng khi nói, không cần đoán)

| Hạng mục | Con số | Ghi chú |
|---|---|---|
| Tổng dòng mã | **~17.300 dòng** | backend 6.932 dòng / 70 file · frontend 10.396 dòng / 55 file |
| API endpoints | **70 endpoint** | chia theo 15 module nghiệp vụ |
| Model dữ liệu (Prisma) | **26 model** | Có migration thật (`prisma/migrations`) |
| Trang giao diện | **30 trang** | 12 cho khách/mua hàng + 12 trang quản trị + phụ trợ |
| Component React | **12 component dùng chung** | Button, Drawer, ProductCard, SearchBox… |
| Ảnh sản phẩm | **16 ảnh studio** | Nằm trong repo, không phụ thuộc internet |
| Tự kiểm tra | **29 mục** | `bash kiem-tra.sh` — 3 nhóm: API, phân quyền, 14+ trang web |
| Tài khoản mẫu | 2 | admin@shop.vn / customer@shop.vn |

**Câu mở đầu gợi ý:**
> *"Đồ án của em là ShopVN — website thương mại điện tử fullstack, viết bằng Next.js +
> TypeScript + Tailwind cho giao diện, Node.js REST API cho nghiệp vụ, PostgreSQL + Prisma
> cho dữ liệu. Tổng cộng khoảng 17.300 dòng code, 70 API, 26 bảng dữ liệu và 30 trang."*

---

## PHẦN 1 — CHECKLIST TRƯỚC KHI DEMO (làm 15 phút trước)

```bash
# 1. Mở Git Bash tại thư mục dự án, chạy:
bash kiem-tra.sh          # Phải thấy: ✅ TẤT CẢ ĐỀU ĐẠT — 29 mục kiểm tra
```

| # | Việc cần làm | Cách kiểm |
|---|---|---|
| 1 | Docker Desktop đang chạy (icon không còn xám) | Mở Docker Desktop |
| 2 | Hệ thống đã bật | `bash start-all.sh` → chờ dòng báo web + API sẵn sàng |
| 3 | Tự kiểm tra 29 mục | `bash kiem-tra.sh` |
| 4 | Mở sẵn 2 tab trình duyệt | tab 1: `http://localhost:3000` · tab 2: `http://localhost:4000/api/docs` (Swagger) |
| 5 | Đăng nhập sẵn **khách hàng** ở tab 1 | customer@shop.vn / `Customer@123456` |
| 6 | Chuẩn bị sẵn cửa sổ **ẩn danh** để đăng nhập admin | admin@shop.vn / `Admin@123456` |
| 7 | Tắt thông báo/Teams/Zalo | tránh popup che màn hình |
| 8 | Zoom trình duyệt **100%** (Ctrl+0) | giao diện hiển thị đủ, đẹp nhất |
| 9 | Để sẵn file này trên màn hình phụ / điện thoại | nhìn kịch bản khi nói |

> **Nếu chỉ có 30 giây:** `bash start-all.sh` → `bash kiem-tra.sh` → mở `localhost:3000`. Xong.

---

## PHẦN 2 — KỊCH BẢN 10 PHÚT (bấm đúng theo thứ tự)

### ⏱️ 0:00 – 0:45 · Mở đầu (KHÔNG bấm gì)
Nói về bản thân, tên đồ án, công nghệ dùng, và 1 câu chốt:
> *"Điểm em muốn cho thầy/cô thấy hôm nay là: hệ thống chạy thật — có phân quyền, có
> thanh toán QR, và em có sẵn bộ tự kiểm tra để chứng minh mọi thứ hoạt động."*

### ⏱️ 0:45 – 1:30 · Trang chủ + điểm nhấn kỹ thuật ở giao diện
**Bấm:** mở `http://localhost:3000` · cuộn chậm xuống hết trang.

**Nói:**
- Hero có ảnh nền + hiệu ứng chuyển động; dải chữ chạy; 6 danh mục; sản phẩm nổi bật.
- Ảnh sản phẩm là **ảnh thật lưu trong dự án** (`frontend/public/img/products/`), không gọi
  từ internet → mạng yếu vẫn hiển thị đủ.
- Mọi icon đều là **icon vector (lucide)**, không dùng emoji → không bị lỗi ô vuông trên
  máy thiếu font.

### ⏱️ 1:30 – 3:00 · Luồng khách hàng: tìm → lọc → chi tiết → giỏ hàng
**Bấm:**
1. Menu **Sản phẩm** → gõ `tai nghe` vào ô tìm kiếm → Enter.
2. Cột trái: tích **Sony** (hoặc chọn khoảng giá) → xem danh sách thu hẹp.
3. Bấm 1 sản phẩm (ví dụ **Sony WH-1000XM5**) → trang chi tiết.
4. Bấm **Thêm vào giỏ** → mở **Giỏ hàng**.

**Nói:**
- Tìm kiếm, lọc theo danh mục/thương hiệu/khoảng giá, sắp xếp — đều gọi API thật
  (`GET /api/v1/products?search=…&brand=…`).
- Giỏ hàng của khách chưa đăng nhập vẫn hoạt động (lưu theo `cart_id`), và **khi đăng nhập
  sẽ tự gộp giỏ** vào tài khoản (`POST /cart/merge`) — đây là chi tiết nhiều đồ án bỏ sót.

### ⏱️ 3:00 – 4:30 · Đặt hàng + THANH TOÁN QR (điểm nhấn chính)
**Bấm:**
1. Ở giỏ hàng → **Thanh toán** → điền địa chỉ (hoặc chọn địa chỉ có sẵn).
2. Chọn phương thức **Chuyển khoản QR** → bấm **Đặt hàng**.
3. Trang thành công: chỉ vào **mã QR** và nội dung chuyển khoản.

**Nói:**
- Mã QR sinh theo chuẩn **VietQR**, nội dung chuyển khoản **chính là mã đơn** → hệ thống đối
  chiếu tự động, không cần nhân viên kiểm tra thủ công.
- Có **webhook ngân hàng** (`POST /api/v1/webhooks/bank`) ký HMAC để xác nhận thanh toán.
- Đơn chưa thanh toán sau **15 phút** sẽ được **cron job tự huỷ** và trả hàng về kho
  (thấy trong log API: "Đã đăng ký cron jobs").
- **Mẹo khi bảo vệ:** nếu thầy/cô hỏi "làm sao biết tiền đã vào?", mở Swagger → gọi
  `POST /webhooks/bank` (có nút *Try it out*) để mô phỏng ngân hàng báo có → đơn tự chuyển
  sang **Đã xác nhận**.

### ⏱️ 4:30 – 6:00 · Quản trị: sản phẩm + danh mục + đơn hàng
**Bấm:** mở **cửa sổ ẩn danh** → `localhost:3000/login` → đăng nhập admin.

1. **Bảng điều khiển**: doanh thu, số đơn, biểu đồ, đơn mới nhất.
2. **Sản phẩm**: gõ tìm kiếm, đổi bộ lọc *Trạng thái* và *Danh mục* (thử vài lần cho thấy mượt).
3. Bấm **Sửa** 1 sản phẩm → sửa giá → **Lưu** → quay lại thấy giá đổi.
4. **Danh mục**: thêm/sửa danh mục.
5. **Đơn hàng**: mở đơn vừa tạo ở bước 3:00 → **đổi trạng thái** (Đã xác nhận → Đang giao).

**Nói:**
- Toàn bộ danh sách đều phân trang, tìm kiếm, lọc ở **phía server** (không tải hết rồi lọc
  ở trình duyệt).
- Mỗi hành động quản trị đều ghi **Audit log** (trang *Nhật ký hệ thống*) — ai đổi gì, lúc nào.
- Đây là chỗ em từng gặp lỗi bấm vào **Sản phẩm/Danh mục bị trắng trang**; nguyên nhân là
  dữ liệu danh mục được cache dưới 2 khoá khác nhau (1 chỗ là mảng, 1 chỗ là object
  `{data:[…]}`) nên `.map()` lỗi. Em đã sửa bằng 1 hook dùng chung
  `useCategories.ts` và viết **script bấm chuột thật 10 bước** để chứng minh sạch lỗi.

### ⏱️ 6:00 – 7:00 · Phân quyền & bảo mật (rất được điểm)
**Bấm:** Ở tab khách hàng (đã đăng nhập customer), gõ thẳng `http://localhost:3000/admin`.

**Nói:**
- Bị **chặn ngay** — kiểm tra phân quyền ở **cả 2 lớp**: middleware phía API (trả 403/401) và
  guard phía giao diện.
- Phiên đăng nhập lưu trong **cookie httpOnly + SameSite=Lax** (JavaScript không đọc được,
  chống XSS lấy token) + **refresh token luân phiên** (dùng 1 lần, thu hồi được khi đăng xuất).
- Ghi dữ liệu phải có **xác thực CSRF** (double-submit cookie).
- Mật khẩu băm **bcrypt**, không lưu bản gốc.
- Có **giới hạn tần suất chống dò mật khẩu** ở các endpoint nhạy cảm (đăng nhập, quên mật khẩu).
- **Helmet** đặt header bảo mật, **Zod** kiểm tra dữ liệu đầu vào ở mọi request.
- Điểm em tâm đắc: em phát hiện biến `COOKIE_SECURE=false` trong `.env` bị đọc thành `true`
  (`Boolean("false") === true`), làm cookie luôn gắn cờ `Secure` → đăng nhập mất phiên khi
  chạy trên IP khác. Em sửa cách đọc biến và kiểm chứng bằng cách giả lập một tên miền khác
  `localhost`.

### ⏱️ 7:00 – 8:00 · Quên mật khẩu, hồ sơ, yêu thích
**Bấm:** **Đăng xuất** khách hàng → **Quên mật khẩu** → nhập email → mở link đặt lại (chế độ
dev hiển thị link ngay để test, không cần hộp thư thật).

Sau đó đăng nhập lại → **Tài khoản → Hồ sơ**: đổi tên, upload ảnh đại diện; **Sản phẩm yêu thích**;
**Số địa chỉ**; **Đơn hàng của tôi** → mở chi tiết đơn.

**Nói:** luồng quên mật khẩu dùng **token dùng 1 lần có thời hạn**, có giới hạn tần suất
chống spam mail.

### ⏱️ 8:00 – 9:00 · Chứng minh bằng bộ tự kiểm tra (rất thuyết phục)
**Bấm:** quay lại Git Bash, chạy
```bash
bash kiem-tra.sh
```

**Nói:**
- 29 mục: API còn sống, database có dữ liệu, tìm kiếm OK, đăng nhập 2 vai trò, phân quyền
  chặn đúng, sinh **mã QR thật** (6391 byte PNG), và **mở thật 18 trang web** trả về 200.
- Đây là bằng chứng hệ thống chạy được ở máy sạch, chứ không phải "chạy trên máy em thôi".
- Em còn có `bash start-all.sh` tự cài, tự sửa `.env`, tự chạy migration + nạp dữ liệu mẫu
  bằng **một lệnh duy nhất**; và `chan-doan.cmd` để chẩn đoán khi web không mở lên.

### ⏱️ 9:00 – 10:00 · Kiến trúc + khó khăn + hướng phát triển (kết)
**Bấm:** chuyển tab Swagger `http://localhost:4000/api/docs` — cuộn xem danh sách endpoint.

**Nói (theo thứ tự này):**
1. **Kiến trúc:** tách hẳn frontend/backend; API theo module
   (`auth / products / cart / orders / payments / reviews / admin …`), mỗi module có
   3 lớp *route → controller → service*; Prisma là lớp truy cập dữ liệu; Zod kiểm tra đầu vào;
   middleware xử lý lỗi tập trung + trả envelope thống nhất `{success, message, data}`.
2. **Khó khăn đã gặp và cách xử lý** (kể 1–2 cái là đủ):
   - Bấm Sản phẩm/Danh mục trắng trang → sai khoá cache → tách hook dùng chung + test tự động.
   - Cookie `Secure` bị bật nhầm → sinh viên khác chạy trên máy khác sẽ tưởng "đăng nhập lỗi"
     → sửa cách đọc biến môi trường, kiểm chứng qua tên miền khác.
   - Ảnh do AI sinh không có header JFIF → bộ tối ưu ảnh của Next trả 400 → chuẩn hoá lại
     16 ảnh (1000×1000 baseline JPEG, giảm 1.483 KB → 1.090 KB).
   - Giới hạn tần suất tính theo IP của proxy Next → cả website dùng chung 300 request/15 phút
     → đưa ngưỡng ra biến môi trường + bật đọc IP thật qua `X-Forwarded-For`.
3. **Hướng phát triển:** cổng thanh toán online (VNPay/Momo), đa ngôn ngữ, PWA, viết thêm
   test tự động cho các luồng nghiệp vụ, tách cache Redis khi lượng truy cập lớn.

---

## PHẦN 3 — PHƯƠNG ÁN DỰ PHÒNG (khi có sự cố)

| Tình huống | Xử lý ngay |
|---|---|
| Web trắng / không mở lên | Mở Git Bash: `bash chan-doan.cmd` (hoặc `chan-doan.sh`) → làm theo hướng dẫn in ra. Nhanh nhất: `bash stop-all.sh` rồi `bash start-all.sh` |
| Docker chưa bật | Mở Docker Desktop → đợi Engine chạy → `bash start-all.sh` |
| Mạng phòng thi lỗi | Không sao: **ảnh nằm trong dự án**, không cần internet |
| Lỡ bấm hỏng dữ liệu | `cd backend && npx prisma migrate reset --force` (xoá sạch, nạp lại dữ liệu mẫu) |
| Máy yếu, web tự tắt khi mở /admin | `bash start-all.sh` đã **tự chuyển chế độ production** khi RAM < 3 GB |
| Thầy/cô hỏi "có phải em chỉ chạy trên máy em?" | Mở `bash kiem-tra.sh` và chỉ vào 29 mục ✅ |
| Quên mật khẩu demo | `admin@shop.vn` / `Admin@123456` · `customer@shop.vn` / `Customer@123456` |
| Bị chặn 429 (quá nhiều request) | Chờ 1 phút, hoặc tăng `RATE_LIMIT_MAX` trong `backend/.env` rồi chạy lại |

**Câu chữa cháy khi có lỗi bất ngờ:**
> *"Đây là chỗ em từng gặp lỗi, em đã ghi lại nguyên nhân và cách xử lý trong BUILD-INFO.txt.
> Em xin phép chạy lại bộ tự kiểm tra để thầy/cô xem hệ thống vẫn ổn."* → `bash kiem-tra.sh`

---

## PHẦN 4 — 20 CÂU HỎI THƯỜNG GẶP KHI BẢO VỆ

**1. Vì sao chọn Next.js thay vì React thuần?**
Next.js cho SSR/SSG (tốt SEO cho thương mại điện tử), có sẵn routing theo thư mục, tối ưu ảnh,
và tách rõ server/client component. Em vẫn dùng React thuần bên trong (hooks, zustand, react-query).

**2. Vì sao tách backend riêng mà không dùng API routes của Next?**
Để thể hiện kiến trúc tách lớp và để API độc lập, có thể tái sử dụng cho app di động sau này.
Backend cũng là nơi xử lý webhook ngân hàng — thứ nên nằm ngoài frontend.

**3. PostgreSQL khác MySQL ở đâu, sao em chọn nó?**
PostgreSQL mạnh về ràng buộc dữ liệu, kiểu dữ liệu phong phú (JSONB cho thông số sản phẩm,
enum cho trạng thái đơn), transaction chắc chắn — phù hợp đơn hàng/thanh toán.

**4. Prisma là gì, lợi ích?**
ORM có schema khai báo, sinh type TypeScript tự động (an toàn khi code), có migration có
version, hỗ trợ transaction. Nhờ Prisma mà query trả về đúng kiểu, giảm lỗi runtime.

**5. Làm sao bảo mật mật khẩu người dùng?**
Băm bằng **bcrypt** (12 rounds), chỉ lưu hash; không log mật khẩu; endpoint đăng nhập có giới
hạn tần suất chống dò.

**6. Phiên đăng nhập lưu ở đâu, có an toàn không?**
Access token + refresh token trong **cookie httpOnly** (JS không đọc được → chống XSS đánh cắp
token). `SameSite=Lax` chống CSRF cơ bản; thao tác ghi còn có `x-csrf-token` (double-submit).

**7. Chống CSRF thế nào?**
Double-submit cookie: server đặt `csrf_token` (không httpOnly), client gửi lại trong header
`x-csrf-token`; server so khớp. Kèm `SameSite=Lax` cho cookie phiên.

**8. SQL Injection thì sao?**
Prisma dùng truy vấn có tham số hoá; không nối chuỗi SQL thủ công. Đầu vào còn qua Zod kiểm tra
kiểu/biên độ.

**9. Phân quyền được làm ở lớp nào?**
Ba tầng: (1) middleware `requireAuth` đọc token, (2) `requireRole('ADMIN')` cho nhóm route
quản trị, (3) kiểm tra quyền sở hữu dữ liệu trong service (ví dụ chỉ xem được **đơn của mình**,
`GET /orders/:code` kiểm tra `userId`).

**10. Đơn hàng có những trạng thái nào?**
9 trạng thái: `PENDING_PAYMENT → CONFIRMED → PACKING → SHIPPING → DELIVERED`, nhánh huỷ
`CANCELLED`, nhánh trả hàng `RETURN_REQUESTED → RETURNED → REFUNDED`. Mỗi lần đổi trạng thái
đều ghi log.

**11. Thanh toán QR hoạt động thế nào?**
Sinh mã **VietQR** theo `BANK_ID + số tài khoản + số tiền + nội dung = mã đơn`. Khách quét
bằng app ngân hàng. Ngân hàng báo có → gọi webhook `POST /webhooks/bank` (xác thực HMAC-SHA256
bằng `WEBHOOK_SECRET`) → đối chiếu mã đơn → tự chuyển đơn sang **Đã xác nhận**.

**12. Nếu khách chuyển khoản mà không bấm đặt hàng / đơn quá hạn?**
Cron job chạy mỗi 15 phút huỷ đơn quá hạn thanh toán và **hoàn số lượng về kho** (tránh giữ
hàng ảo).

**13. Tồn kho được trừ lúc nào? Có sợ bán quá số lượng không?**
Trừ trong **transaction** khi tạo đơn. Điều kiện chống bán quá số lượng nằm **ngay trong câu
UPDATE** (`UPDATE product_variants SET stock = stock − qty WHERE stock >= qty`), rồi mới kiểm
tra số dòng bị ảnh hưởng — nên 2 người bấm mua cùng lúc cũng không thể làm âm kho
(xem `backend/src/modules/orders/orders.service.ts`, phần "Trừ kho NGUYÊN TỬ").

**14. Tìm kiếm/lọc có phân trang ở đâu?**
Ở **server** (`page`, `limit`, `search`, `category`, `brand`, `minPrice`, `maxPrice`, `sort`),
trả kèm `meta` (tổng số, số trang) để giao diện chỉ vẽ những gì cần.

**15. Ảnh sản phẩm lưu ở đâu?**
Ảnh có sẵn nằm trong `frontend/public/img/products/`. Ảnh do người dùng tải lên (ảnh đại diện,
ảnh sản phẩm) đi qua `multer` → lưu `backend/uploads/` → phục vụ qua `/uploads/...`. Có kiểm tra
loại file, kích thước (≤ 5 MB) và giới hạn tần suất upload.

**16. Có test tự động chưa?**
Có: 3 bộ test (Vitest) cho các hàm nghiệp vụ quan trọng, và quan trọng hơn là **bộ kiểm tra
tích hợp 29 mục** (`kiem-tra.sh`) chạy thật API + database + 18 trang web.

**17. Nếu lượng truy cập lớn thì làm gì?**
Thêm cache Redis cho danh mục/sản phẩm nổi bật, dùng chỉ mục (index) hợp lý (đã có index cho
`slug`, `categoryId`, `brandId`, `status`), đọc/ghi tách riêng (read replica) và đặt CDN cho ảnh.

**18. Vì sao có nhiều lệnh script tự động (.sh/.cmd/.ps1) như vậy?**
Vì mục tiêu là **người khác clone về là chạy được**: `start-all.sh` tự kiểm tra Node/Docker,
tự sinh `.env` với khoá bí mật, tự chạy migration + seed, tự kiểm tra Prisma Client thật
(không tin vào file có sẵn) — em từng gặp lỗi `@prisma/client did not initialize yet` do file
giả do npm tạo, nên đã làm bước kiểm tra thật.

**19. Điểm khác biệt so với các đồ án cùng đề tài?**
Bốn thứ thường bị bỏ qua mà em có: (1) **gộp giỏ hàng** khi đăng nhập, (2) **webhook ngân hàng
+ tự huỷ đơn quá hạn** bằng cron, (3) **Audit log** cho mọi hành động quản trị, (4) **bộ tự
kiểm tra 29 mục** chứng minh hệ thống chạy được ở máy sạch.

**20. Nếu được làm lại, em sẽ làm gì khác?**
Tách trạng thái đơn thành state machine rõ ràng ngay từ đầu, thêm test tự động cho từng API
(E2E), và dùng Redis cho giỏ hàng/session ngay từ đầu thay vì database.

---

## PHẦN 5 — 6 ĐIỂM "ĂN ĐIỂM" NHỚ NHẤN MẠNH

1. **29/29 mục tự kiểm tra đạt** — mở ra cho thầy/cô xem, không chỉ nói miệng.
2. **Thanh toán QR + webhook + cron tự huỷ đơn** — nghiệp vụ thật, không phải demo giả.
3. **Bảo mật làm ở cả 3 tầng** (cookie httpOnly, CSRF, phân quyền API + UI + sở hữu dữ liệu).
4. **Một lệnh chạy được toàn hệ thống** (`bash start-all.sh`) — thể hiện tư duy "sản phẩm cho
   người khác dùng", không chỉ code cho mình chạy.
5. **Nhật ký hệ thống (audit log)** trong trang quản trị.
6. **Em chủ động tìm và sửa lỗi bằng cách kiểm chứng**: viết script bấm chuột thật 10 bước,
   giả lập tên miền khác localhost để bắt lỗi cookie — thầy/cô rất thích phần này.

---

*Chúc bạn demo suôn sẻ. Nếu có lỗi bất ngờ: bình tĩnh, chạy `bash kiem-tra.sh`, rồi kể lại
nguyên nhân như một câu chuyện kỹ thuật — đó là cách ghi điểm tốt nhất.*
