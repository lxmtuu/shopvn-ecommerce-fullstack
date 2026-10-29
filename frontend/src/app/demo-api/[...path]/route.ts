import { NextResponse } from 'next/server';
import { demoResponse } from '@/demo/demoData';

/**
 * API DEMO — chỉ dùng cho bản xem trước không có backend (Vercel/Netlify…).
 * Bật bằng biến môi trường `DEMO_MODE=1` + `NEXT_PUBLIC_API_URL=/demo-api/v1`.
 * Không đặt `DEMO_MODE` thì route này trả 404 và ứng dụng dùng backend thật.
 */
export const dynamic = 'force-dynamic';

const disabled = () =>
  NextResponse.json(
    { success: false, message: 'API demo đang tắt (đặt DEMO_MODE=1 để bật)', code: 'DEMO_DISABLED' },
    { status: 404 },
  );

async function handle(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  if (process.env.DEMO_MODE !== '1') return disabled();

  const { path } = await ctx.params;
  const url = new URL(req.url);
  // Next giữ nguyên tiền tố phiên bản (`/demo-api/v1/...`) ⇒ bỏ `v1` để khớp bảng route
  const segments = path ?? [];
  const routePath = `/${(segments[0] === 'v1' ? segments.slice(1) : segments).join('/')}`;
  return NextResponse.json(demoResponse(routePath, url.searchParams, req.method));
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
