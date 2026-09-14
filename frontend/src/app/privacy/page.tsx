import type { Metadata } from 'next';
import Link from 'next/link';
import { Cookie, Database, KeyRound, Lock, Mail, ShieldCheck, UserCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description:
    'ShopVN thu thập dữ liệu gì, dùng để làm gì, lưu trong bao lâu và bạn có những quyền nào với dữ liệu cá nhân của mình.',
};

const ITEMS = [
  {
    icon: Database,
    title: '1. Chúng tôi thu thập những dữ liệu gì',
    body: [
      'Thông tin tài khoản: họ tên, email, số điện thoại, ngày sinh, giới tính (không bắt buộc), ảnh đại diện.',
      'Thông tin đơn hàng: sản phẩm, số lượng, địa chỉ giao hàng, phương thức thanh toán, trạng thái đơn.',
      'Dữ liệu kỹ thuật: địa chỉ IP, trình duyệt, thời điểm truy cập — dùng để bảo vệ tài khoản và chống gian lận.',
      'Mật khẩu của bạn được băm một chiều (bcrypt/argon) trước khi lưu. Chúng tôi KHÔNG đọc được mật khẩu gốc.',
    ],
  },
  {
    icon: UserCheck,
    title: '2. Mục đích sử dụng',
    body: [
      'Xử lý đơn hàng, giao hàng và hỗ trợ đổi trả, bảo hành.',
      'Cá nhân hoá trải nghiệm: gợi ý sản phẩm, lưu sản phẩm yêu thích, nhắc lại giỏ hàng.',
      'Gửi thông báo giao dịch (xác nhận đơn, xác thực email, đặt lại mật khẩu). Email khuyến mãi chỉ gửi khi bạn đồng ý và có thể tắt bất kỳ lúc nào.',
      'Phát hiện và ngăn chặn hành vi gian lận, lạm dụng khuyến mãi.',
    ],
  },
  {
    icon: ShieldCheck,
    title: '3. Chúng tôi chia sẻ dữ liệu cho ai',
    body: [
      'Đơn vị vận chuyển: chỉ họ tên, số điện thoại và địa chỉ giao hàng — đủ để giao kiện hàng.',
      'Ngân hàng/cổng thanh toán: mã đơn và số tiền, để đối chiếu giao dịch chuyển khoản QR.',
      'Chúng tôi KHÔNG bán, KHÔNG trao đổi dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích quảng cáo.',
    ],
  },
  {
    icon: KeyRound,
    title: '4. Bảo mật hệ thống',
    body: [
      'Phiên đăng nhập dùng JWT lưu trong cookie httpOnly (JavaScript không đọc được) + cơ chế làm mới token luân phiên, thu hồi được khi đăng xuất.',
      'Mọi thao tác thay đổi dữ liệu đều kiểm tra quyền và xác thực CSRF (double-submit cookie).',
      'Các điểm cuối nhạy cảm như đăng nhập, quên mật khẩu được giới hạn tần suất để chống dò mật khẩu.',
      'Toàn bộ kết nối được mã hoá qua HTTPS khi triển khai chính thức.',
    ],
  },
  {
    icon: Cookie,
    title: '5. Cookie và bộ nhớ trình duyệt',
    body: [
      'Cookie bắt buộc: phiên đăng nhập (httpOnly) và csrf_token — không thể tắt vì hệ thống cần để hoạt động.',
      'Cookie tiện ích: mã giỏ hàng cho khách chưa đăng nhập (cart_id), ghi nhớ chế độ sáng/tối.',
      'Bạn có thể xoá cookie trong phần cài đặt trình duyệt; khi đó bạn sẽ được đăng xuất và giỏ hàng khách sẽ làm mới.',
    ],
  },
  {
    icon: Lock,
    title: '6. Thời gian lưu trữ',
    body: [
      'Dữ liệu tài khoản: giữ trong thời gian tài khoản còn hoạt động; xoá trong vòng 30 ngày kể từ khi bạn yêu cầu.',
      'Hồ sơ đơn hàng: lưu tối thiểu 24 tháng theo quy định về kế toán, thuế.',
      'Log kỹ thuật và log bảo mật: tối đa 90 ngày, sau đó tự động dọn.',
    ],
  },
  {
    icon: UserCheck,
    title: '7. Quyền của bạn',
    body: [
      'Xem và cập nhật thông tin cá nhân tại mục Tài khoản → Hồ sơ.',
      'Đổi mật khẩu, đăng xuất khỏi mọi thiết bị đang đăng nhập.',
      'Yêu cầu xuất bản sao hoặc xoá dữ liệu cá nhân bằng cách gửi yêu cầu tới hotro@shopvn.vn — chúng tôi phản hồi trong tối đa 72 giờ.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="container-page py-10 lg:py-14">
      <nav className="mb-6 text-sm text-ink-500">
        <Link href="/" className="hover:text-brand-600">
          Trang chủ
        </Link>
        <span className="mx-2">/</span>
        <span className="font-semibold text-ink-700">Chính sách bảo mật</span>
      </nav>

      <div className="relative overflow-hidden rounded-3xl border border-ink-900/20 bg-ink-950 p-8 text-white shadow-lg lg:p-12">
        <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Quyền riêng tư
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight lg:text-4xl">Chính sách bảo mật</h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Chúng tôi chỉ thu thập dữ liệu cần thiết để bán hàng và phục vụ bạn — không hơn. Bản cập nhật ngày 14/09/2026.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <section key={title} className="card-surface card-hover rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-sm">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink-900">{title}</h2>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-600">
                  {body.map((p) => (
                    <li key={p.slice(0, 24)} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}

        <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
            <Mail className="h-5 w-5 text-brand-600" aria-hidden /> Liên hệ về dữ liệu cá nhân
          </h2>
          <p className="mt-2 text-sm text-ink-600">
            Gửi yêu cầu tới <span className="font-semibold text-ink-900">hotro@shopvn.vn</span> hoặc gọi hotline{' '}
            <span className="font-semibold text-ink-900">1900 1234</span>. Nếu không hài lòng với cách chúng tôi xử lý, bạn có
            quyền khiếu nại tới cơ quan quản lý về bảo vệ dữ liệu cá nhân.
          </p>
          <Link
            href="/terms"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-600"
          >
            Xem thêm: Điều khoản sử dụng →
          </Link>
        </div>
      </div>
    </div>
  );
}
