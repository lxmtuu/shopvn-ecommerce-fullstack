import type { NextConfig } from 'next';

/**
 * Địa chỉ backend dùng cho phần `rewrites` (chạy ở phía server Next).
 * Đặt trong .env.local:  API_PROXY_TARGET=http://localhost:4000
 */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    // Ảnh seed dùng picsum; lên production nhớ thêm domain CDN thật của bạn.
    // Lưu ý: ảnh upload từ backend chạy ở http://localhost:4000/uploads/...
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      { protocol: 'https', hostname: 'api.vietqr.io' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: '**' },
    ],
  },

  /**
   * Dev proxy: gọi `/api/v1/...` từ trình duyệt sẽ được chuyển tiếp sang backend.
   *  → Toàn bộ request là same-origin ⇒ không dính CORS, cookie httpOnly + csrf hoạt động như production.
   * Nếu bạn muốn gọi thẳng backend (khác origin) thì đặt NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
   * và đảm bảo CORS_ORIGIN trong backend/.env trỏ đúng địa chỉ frontend.
   */
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_PROXY_TARGET}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_PROXY_TARGET}/uploads/:path*` },
    ];
  },

  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
