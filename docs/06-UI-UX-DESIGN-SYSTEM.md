# 🎨 06 — UI/UX & Design System (ShopVN)

> Tài liệu này là "hợp đồng" giữa **thiết kế** và **code frontend**. Mọi component, màu, chữ, khoảng cách,
> chuyển động trong dự án đều lấy từ đây — không tự nghĩ thêm màu mới khi làm từng trang.

**Stack UI:** Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Framer Motion · lucide-react · Recharts · sonner

---

## 1. Nguyên tắc thiết kế (5 điều không thoả hiệp)

| # | Nguyên tắc | Cách thể hiện trong code |
|---|---|---|
| 1 | **Rõ ràng hơn đẹp** — khách phải biết bấm gì tiếp theo | Mỗi màn hình chỉ có **1 hành động chính** (nút `primary`); phụ dùng `outline/ghost` |
| 2 | **Phản hồi tức thì** — không có hành động nào im lặng | Loading: nút có spinner · Toast cho mọi mutation · Skeleton khi tải danh sách |
| 3 | **Mobile-first, không phải mobile-only** | Mọi grid viết từ 2 cột mobile → mở rộng lên `lg`; bảng admin bọc trong `overflow-x-auto` |
| 4 | **Tiền Việt luôn hiển thị đúng** | Không bao giờ `Number(x).toString()` trong JSX — luôn dùng `formatVND()` |
| 5 | **Không "dead-end"** | Trang trống/ lỗi luôn kèm `EmptyState` có nút hành động (Mua sắm ngay / Xoá bộ lọc / Về trang chủ) |

---

## 2. Design tokens

Toàn bộ token khai báo **một chỗ duy nhất**: `frontend/src/app/globals.css` (cú pháp `@theme` của Tailwind v4).
Không tạo `tailwind.config.js` — Tailwind v4 đọc token trực tiếp từ CSS.

### 2.1 Màu

| Token | Giá trị | Dùng ở đâu |
|---|---|---|
| `brand-50 … brand-950` | Hồng sen (rose) | Nút chính, giá tiền, badge nổi bật, active nav, biểu đồ doanh thu |
| `ink-50 … ink-950` | Xám slate | Nền, chữ, viền, dark mode |
| `emerald-*` | | Trạng thái thành công (đã giao, đã thanh toán, gửi tiền thành công) |
| `amber-*` | | Cảnh báo (chờ thanh toán, sắp hết hàng, email chưa xác thực) |
| `rose-*` | | Lỗi / nguy hiểm (huỷ đơn, xoá, thất bại) |
| `blue-*, violet-*, indigo-*, teal-*, orange-*` | | Riêng cho badge trạng thái đơn (9 trạng thái = 9 màu, xem `lib/format.ts → ORDER_STATUS`) |

**Quy tắc đối chiếu trạng thái:** màu trạng thái **chỉ** định nghĩa trong `ORDER_STATUS` / `PAYMENT_STATUS`.
Component `Badge` khi nhận `className` sẽ **không** trộn thêm màu mặc định — tránh xung đột CSS giữa 2 class `bg-*`.

### 2.2 Chữ (typography)

Không dùng webfont ngoài (bảo vệ tốc độ tải + build offline): hệ font hệ thống với stack
`ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`.

| Vai trò | Class dùng chung |
|---|---|
| H1 trang | `text-2xl font-extrabold tracking-tight sm:text-3xl` |
| H2 section | `text-xl font-extrabold` |
| Tiêu đề card | `font-bold` |
| Giá tiền | `text-3xl font-extrabold text-brand-700 dark:text-brand-400` |
| Ghi chú phụ | `text-xs text-ink-500` |
| Nhãn form | do component `Input` sinh ra (`text-sm font-medium`) |

Tiện ích `.text-balance-vi` được thêm cho tiêu đề tiếng Việt: `text-wrap: balance` để dòng không bị "mồ côi" 1 chữ.

### 2.3 Bo góc · bóng · khoảng cách

| Token | Dùng cho |
|---|---|
| `rounded-xl` | Input, nút, badge nhỏ, ô bảng |
| `rounded-2xl` | Card, panel |
| `rounded-3xl` / `rounded-[2rem]` | Khối hero, banner QR |
| `shadow-sm` → hover `shadow-lg` | Nút chính (nhấn mạnh khi hover) |
| `var(--shadow-lift)` | Card sản phẩm khi hover (bóng mềm + nhấc 4px) |
| `.card-surface` | Tiện ích nền card: `bg-white border rounded-2xl dark:bg-ink-900` |
| `.container-page` | Khung nội dung: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |

### 2.4 Dark mode

Dùng **class-based** (`.dark`) + `@custom-variant dark` của Tailwind v4 — không theo `prefers-color-scheme` sau lần chọn đầu.
Trạng thái lưu ở `localStorage` qua zustand `persist` (`store/ui.store.ts`), áp vào `<html>` bằng `applyTheme()`.
Lần đầu truy cập: tự chọn theo cài đặt hệ điều hành. **Mọi component mới bắt buộc có biến thể `dark:`.**

---

## 3. Thư viện component

Tất cả primitive nằm trong `src/components/ui/index.tsx` (một file, dễ copy sang dự án khác).

| Component | Props chính | Ghi chú thiết kế |
|---|---|---|
| `Button` | `variant: primary\|secondary\|outline\|ghost\|danger`, `size: sm\|md\|lg\|icon`, `loading` | Có `active:scale-[0.97]` khi bấm, tự chặn khi `loading`, focus ring rõ |
| `Input` | `label`, `error`, `hint`, `icon` | `aria-invalid` + `aria-describedby` trỏ tới dòng lỗi ⇒ screen reader đọc được |
| `Badge` | `tone` hoặc `className` | Xem quy tắc màu trạng thái ở §2.1 |
| `StarRating` | `value`, `size`, `showValue`, `count` | Hiển thị 5 sao + số, dùng cho sản phẩm và đánh giá |
| `Skeleton` / `ProductCardSkeleton` | | Dùng animation `shimmer` (CSS keyframe, không phải JS) |
| `EmptyState` | `icon`, `title`, `description`, `action` | Bắt buộc có `action` để không tạo dead-end |
| `Modal` | `open`, `title`, `maxWidth` | Đóng bằng `Esc` + click backdrop, khoá scroll nền, `aria-modal` |
| `Drawer` | `side: right \| bottom` | `right` = giỏ hàng nhanh; `bottom` = bộ lọc trên mobile |
| `Pagination` | `page`, `totalPages`, `onChange` | Có nút trước/sau + rút gọn dãy số |

Component nghiệp vụ:

| Nhóm | File | Vai trò |
|---|---|---|
| Shop | `components/shop/ProductCard.tsx` | Card sản phẩm: ảnh blur-placeholder, badge giảm giá, nút yêu thích, CTA hover |
| Shop | `components/shop/FilterPanel.tsx` | Bộ lọc dùng chung cho sidebar desktop và bottom-sheet mobile |
| Shop | `components/shop/MiniCartDrawer.tsx` | Giỏ nhanh: thanh tiến trình freeship, sửa số lượng, chặn checkout khi có `hasIssues` |
| Shop | `components/shop/SearchBox.tsx` | Gợi ý tìm kiếm (debounce 300ms → `/products/suggestions`) |
| Shop | `components/shop/ReviewsSection.tsx` | Tổng quan điểm + phân bố sao + gửi đánh giá kèm ảnh |
| Layout | `components/layout/Header.tsx` | Sticky, blur, badge giỏ hàng, menu người dùng, chuyển dark mode, menu mobile |
| Layout | `components/layout/Footer.tsx` | Hotline, **liên kết mạng xã hội**, thông tin ngân hàng (lấy từ `/bank-info`) |
| Admin | `components/admin/StatCard.tsx` | Thẻ KPI có % tăng/giảm so với kỳ trước |
| Admin | `components/admin/Charts.tsx` | `RevenueAreaChart`, `StatusDonut`, `TopProductsBarChart` (Recharts) |
| Admin | `components/admin/AdminTable.tsx` | `TableWrap/Th/Td/TableSkeleton` — chuẩn hoá bảng quản trị |

---

## 4. Bố cục & responsive

| Breakpoint | Bố cục |
|---|---|
| `< sm (640px)` | 2 cột sản phẩm · lọc trong bottom-sheet · menu trong Drawer · bảng admin cuộn ngang |
| `sm – lg` | 3 cột sản phẩm · hiện sidebar lọc ở `lg` |
| `lg (1024px)` | 4 cột sản phẩm · sidebar lọc cố định `sticky top-24` · trang chi tiết 2 cột (ảnh trái / mua phải) |
| `xl (1280px)` | Giữ 4 cột, container `max-w-7xl` để dòng chữ không quá dài |

**Quy tắc sticky:** header cao `64px`, mọi thứ sticky khác phải dùng `top-24` (96px) để không bị header che.
Trang quản trị dùng sidebar cố định `w-64` + `lg:pl-64` cho vùng nội dung.

---

## 5. Chuyển động (animation)

Nguyên tắc: **ngắn, có mục đích, không cản thao tác**. Tổng thời lượng một animation ≤ 500ms.

| Tình huống | Hiệu ứng | Thông số |
|---|---|---|
| Trang chủ hero | `opacity 0→1`, `y 20→0` | 0.6s, `ease: [0.22,1,0.36,1]` |
| Danh sách sản phẩm | xuất hiện lần lượt theo `index * 0.05s` | 0.35s |
| Khối theo scroll | `whileInView` + `viewport={{ once: true }}` | delay 0.06s bước |
| Card sản phẩm hover | `translateY(-4px)` + bóng + ảnh `scale(1.06)` | 300ms |
| Thêm/xoá dòng giỏ hàng | `AnimatePresence` + `layout` (tự dồn dòng) | 250ms |
| Thanh freeship | `width 0 → %` | 600ms easeOut |
| Tab chi tiết sản phẩm | gạch chân chạy `layoutId` | 200ms |
| Toast | sonner mặc định | 4s |
| Skeleton | `shimmer` chạy nền | 1.4s lặp vô hạn |

**Tôn trọng người dùng:** có khối `@media (prefers-reduced-motion: reduce)` tắt toàn bộ animation/transition.
Không animate `width/height` của phần tử lớn (gây reflow) — chỉ animate `opacity`, `transform`, và `layout`.

---

## 6. Ảnh & placeholder

1. Backend (`sharp`) sinh **3 biến thể** cho mỗi ảnh upload: `url` (full), `cardUrl` (lưới), `thumbUrl` (bảng admin) + `blurData` (chuỗi base64 4–8px).
2. Frontend **luôn** dùng `next/image` với `sizes` khớp bố cục, `placeholder="blur"` khi có `blurData`.
3. Ảnh hero: `priority`; ảnh dưới màn hình đầu: `loading="lazy"` (mặc định).
4. Tỉ lệ khung: sản phẩm `1:1` (`aspect-square`), avatar `1:1` bo tròn, ảnh đánh giá 80×80.
5. `next.config.ts` khai báo `remotePatterns` cho picsum (dữ liệu seed) + `localhost:4000` (ảnh upload khi dev).

---

## 7. Trạng thái & UX writing

**Bốn trạng thái bắt buộc cho mọi vùng dữ liệu:** đang tải (Skeleton) → có dữ liệu → rỗng (EmptyState) → lỗi (thông báo + nút thử lại).

Giọng văn tiếng Việt, thân thiện, **nói cho người dùng biết phải làm gì**, không đổ lỗi:

| Tình huống | ❌ Tránh | ✅ Dùng |
|---|---|---|
| Giỏ vượt tồn kho | "Invalid quantity" | "Chỉ còn 3 sản phẩm trong kho" |
| Hết hàng | "Product unavailable" | "Tạm hết hàng" |
| Mã giảm giá sai | "COUPON_INVALID" | "Mã giảm giá không hợp lệ hoặc đã hết hạn" |
| Chưa đăng nhập khi checkout | "401 Unauthorized" | "Vui lòng đăng nhập để thanh toán" |
| Thao tác trạng thái sai | "INVALID_STATUS_TRANSITION" | "Không thể chuyển từ *Chờ thanh toán* sang *Đã giao hàng*. Trạng thái hợp lệ: **Đã xác nhận, Đã huỷ**" |

---

## 8. Khả năng truy cập (a11y checklist)

- [x] Liên kết "Bỏ qua tới nội dung chính" ở đầu `layout.tsx`
- [x] Mọi nút chỉ có icon đều có `aria-label` tiếng Việt
- [x] `aria-invalid` + `aria-describedby` cho input lỗi
- [x] Focus ring nhìn thấy rõ (`focus-visible:outline-brand-600`) — không tắt outline
- [x] Modal/Drawer: `role="dialog"`, `aria-modal`, đóng bằng `Esc`
- [x] Ảnh có `alt` (ảnh trang trí để `alt=""`)
- [x] Phân cấp tiêu đề đúng thứ tự `h1 → h2 → h3`
- [x] Vùng chạm tối thiểu 40×40px (nút `icon` là `h-10 w-10`)
- [x] Không dùng màu làm tín hiệu duy nhất — badge luôn kèm **chữ**

---

## 9. Bản đồ màn hình (route → mục tiêu UX)

| Route | Mục tiêu | Điểm nhấn thiết kế |
|---|---|---|
| `/` | Gây ấn tượng & dẫn vào sản phẩm | Hero gradient + ảnh nổi, 4 khối tin cậy, danh mục, 2 lưới sản phẩm, banner QR |
| `/products` | Lọc nhanh, không mất trạng thái | **Toàn bộ bộ lọc lưu trên URL** ⇒ share link + Back/Forward + refresh đều đúng |
| `/products/[slug]` | Thuyết phục mua | Gallery zoom khi hover, chọn biến thể, mã giảm giá copy 1 chạm, tab mô tả/thông số/đánh giá |
| `/cart` | Xử lý do dự trước khi trả tiền | Thanh tiến trình freeship, cảnh báo tồn kho, tạm tính phí ship |
| `/checkout` | Chốt đơn nhanh, ít lỗi | 3 bước đánh số, chọn/ thêm địa chỉ ngay tại chỗ, mã giảm giá gợi ý, chỉ hỗ trợ 2 phương thức đang hoạt động |
| `/order-success/[code]` | Trả tiền thành công | QR cỡ lớn + **đếm ngược 24h**, nút copy từng trường, gửi ảnh bill, tự kiểm tra mỗi 10 giây |
| `/account/*` | Tự phục vụ | Sidebar tài khoản, timeline đơn, sổ địa chỉ dạng card |
| `/admin/*` | Ra quyết định | KPI + biểu đồ trước, bảng chi tiết sau, cảnh báo việc cần xử lý lên đầu |

---

## 10. Checklist trước khi merge một màn hình mới

- [ ] Không có mã màu hex nào ngoài `globals.css` / badge trạng thái
- [ ] Có trạng thái loading (Skeleton) và rỗng (EmptyState có nút)
- [ ] Có biến thể `dark:` cho mọi nền/chữ mới
- [ ] Kiểm tra ở 3 kích thước: 375px, 768px, 1440px
- [ ] Mọi mutation đều có toast thành công **và** toast lỗi
- [ ] Tiền tệ dùng `formatVND`, ngày dùng `formatDate/formatRelative`
- [ ] Nút chỉ có icon đã có `aria-label`
- [ ] Chạy `npm run typecheck` = 0 lỗi · `npm run build` thành công
