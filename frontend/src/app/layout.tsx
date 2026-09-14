import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: {
    default: 'ShopVN — Mua sắm trực tuyến chính hãng',
    template: '%s | ShopVN',
  },
  description:
    'Hàng nghìn sản phẩm chính hãng: điện thoại, laptop, tai nghe, gia dụng. Giao nhanh toàn quốc, đổi trả 7 ngày, thanh toán QR tiện lợi.',
  keywords: ['shop online', 'thương mại điện tử', 'điện thoại', 'laptop', 'ShopVN'],
  openGraph: {
    title: 'ShopVN — Mua sắm trực tuyến chính hãng',
    description: 'Giao nhanh, đổi trả 7 ngày, thanh toán chuyển khoản QR.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white">
            Bỏ qua điều hướng
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
