import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Mail, ShieldCheck, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description:
    'Điều khoản và điều kiện sử dụng website ShopVN: tài khoản, đặt hàng, thanh toán, vận chuyển, đổi trả và bảo hành.',
};

const SECTIONS = [
  {
    title: '1. Giới thiệu',
    body: [
      'ShopVN là website thương mại điện tử bán thiết bị công nghệ và đồ gia dụng chính hãng. Khi truy cập hoặc mua hàng tại ShopVN, bạn đồng ý với các điều khoản được nêu trong trang này.',
      'Chúng tôi có thể cập nhật điều khoản theo từng thời điểm; phiên bản mới nhất luôn hiển thị tại địa chỉ /terms kèm ngày cập nhật.',
    ],
  },
  {
    title: '2. Tài khoản người dùng',
    body: [
      'Bạn cần đăng ký tài khoản bằng email hợp lệ để theo dõi đơn hàng, lưu sản phẩm yêu thích và dùng các tính năng dành riêng cho thành viên.',
      'Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động phát sinh từ tài khoản của mình. Vui lòng thông báo ngay cho ShopVN khi phát hiện truy cập bất thường.',
      'ShopVN không bao giờ hỏi mật khẩu của bạn qua điện thoại, email hay tin nhắn.',
    ],
  },
  {
    title: '3. Đặt hàng và xác nhận đơn',
    body: [
      'Sau khi bạn nhấn “Đặt hàng”, hệ thống ghi nhận đơn và hiển thị mã đơn (ví dụ DH26090910023). Đơn hàng được xem là hình thành khi ShopVN gửi thông báo xác nhận.',
      'Trường hợp sản phẩm hết hàng sau khi bạn đặt, ShopVN sẽ liên hệ để đổi sản phẩm tương đương hoặc hoàn tiền 100% trong vòng 3 ngày làm việc.',
    ],
  },
  {
    title: '4. Giá và khuyến mãi',
    body: [
      'Giá hiển thị là giá cuối cùng bằng Việt Nam Đồng (VND), đã bao gồm thuế giá trị gia tăng, chưa bao gồm phí vận chuyển (trừ khi có ghi chú “miễn phí vận chuyển”).',
      'Mã giảm giá chỉ áp dụng một lần cho mỗi đơn, không quy đổi thành tiền mặt và không dùng đồng thời với các chương trình khác nếu không có ghi chú.',
    ],
  },
  {
    title: '5. Thanh toán',
    body: [
      'ShopVN hỗ trợ hai hình thức: thanh toán khi nhận hàng (COD) và chuyển khoản ngân hàng bằng mã QR theo chuẩn VietQR.',
      'Với đơn chuyển khoản, hệ thống hiển thị mã QR kèm số tiền và nội dung chuyển khoản chính là mã đơn hàng. Đơn được xác nhận tự động sau khi ngân hàng báo có; đơn chưa thanh toán sau 15 phút sẽ tự động huỷ để nhường hàng cho khách khác.',
    ],
  },
  {
    title: '6. Vận chuyển và giao nhận',
    body: [
      'Nội thành: giao trong ngày hoặc trong 24 giờ. Các tỉnh thành khác: 1–3 ngày làm việc.',
      'Miễn phí vận chuyển cho đơn hàng từ 500.000đ. Bạn được kiểm tra ngoại quan kiện hàng trước khi thanh toán COD.',
    ],
  },
  {
    title: '7. Đổi trả và bảo hành',
    body: [
      'Đổi mới trong 7 ngày nếu sản phẩm lỗi do nhà sản xuất, còn đủ hộp và phụ kiện.',
      'Bảo hành 12 tháng theo tiêu chuẩn của nhà sản xuất. Không bảo hành các trường hợp rơi vỡ, vào nước, tự tháo sửa hoặc hết thời hạn bảo hành.',
    ],
  },
  {
    title: '8. Quyền và nghĩa vụ của ShopVN',
    body: [
      'ShopVN có quyền từ chối hoặc huỷ đơn hàng có dấu hiệu gian lận, spam, hoặc lợi dụng khuyến mãi.',
      'ShopVN có nghĩa vụ bảo mật thông tin cá nhân của bạn theo Chính sách bảo mật và không bán dữ liệu khách hàng cho bên thứ ba.',
    ],
  },
  {
    title: '9. Sở hữu trí tuệ',
    body: [
      'Toàn bộ nội dung, hình ảnh, mã nguồn và thương hiệu ShopVN thuộc quyền sở hữu của ShopVN. Vui lòng không sao chép cho mục đích thương mại khi chưa có sự đồng ý bằng văn bản.',
    ],
  },
  {
    title: '10. Luật áp dụng và giải quyết tranh chấp',
    body: [
      'Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp được ưu tiên giải quyết thông qua thương lượng; nếu không đạt kết quả, một trong hai bên có quyền khởi kiện tại Toà án có thẩm quyền.',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="container-page py-10 lg:py-14">
      <nav className="mb-6 text-sm text-ink-500">
        <Link href="/" className="hover:text-brand-600">
          Trang chủ
        </Link>
        <span className="mx-2">/</span>
        <span className="font-semibold text-ink-700">Điều khoản sử dụng</span>
      </nav>

      <div className="relative overflow-hidden rounded-3xl border border-ink-200/60 bg-gradient-to-br from-brand-600 to-brand-500 p-8 text-white shadow-lg lg:p-12">
        <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/25">
            <FileText className="h-3.5 w-3.5" aria-hidden /> Văn bản pháp lý
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight lg:text-4xl">Điều khoản sử dụng</h1>
          <p className="mt-3 max-w-2xl text-white/85">
            Những quy định áp dụng khi bạn mua sắm tại ShopVN. Bản cập nhật ngày 14/09/2026.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="space-y-5">
          {SECTIONS.map((s) => (
            <section key={s.title} className="card-surface rounded-2xl p-6">
              <h2 className="text-lg font-bold text-ink-900">{s.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-600">
                {s.body.map((p) => (
                  <p key={p.slice(0, 24)} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                    <span>{p}</span>
                  </p>
                ))}
              </div>
            </section>
          ))}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card-surface rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden /> Cam kết của ShopVN
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>• Hàng chính hãng 100%, bảo hành 12 tháng</li>
              <li>• Đổi trả 7 ngày nếu lỗi nhà sản xuất</li>
              <li>• Không bán dữ liệu khách hàng</li>
            </ul>
          </div>
          <div className="card-surface rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Truck className="h-4 w-4 text-brand-600" aria-hidden /> Vận chuyển
            </h3>
            <p className="mt-2 text-sm text-ink-600">
              Miễn phí cho đơn từ 500.000đ · Nội thành giao trong ngày · Tỉnh 1–3 ngày.
            </p>
          </div>
          <div className="card-surface rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Mail className="h-4 w-4 text-brand-600" aria-hidden /> Cần hỗ trợ?
            </h3>
            <p className="mt-2 text-sm text-ink-600">
              Hotline <span className="font-semibold text-ink-900">1900 1234</span> · Email{' '}
              <span className="font-semibold text-ink-900">hotro@shopvn.vn</span>
            </p>
          </div>
          <Link
            href="/privacy"
            className="block rounded-2xl border border-brand-200 bg-brand-50/60 p-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Xem thêm: Chính sách bảo mật →
          </Link>
        </aside>
      </div>
    </div>
  );
}
