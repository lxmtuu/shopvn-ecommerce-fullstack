/**
 * API client dùng chung.
 *  • Tự gắn `credentials: 'include'` để cookie httpOnly được gửi kèm
 *  • Tự đọc cookie `csrf_token` và gửi lại qua header `x-csrf-token` (chống CSRF)
 *  • Tự refresh token khi gặp 401 TOKEN_EXPIRED rồi thử lại request 1 lần
 *  • Ném ApiError có `code` + `errors` để form hiển thị lỗi theo từng field
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'ShopVN';

export interface ApiFieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  errors?: ApiFieldError[];

  constructor(status: number, message: string, code = 'ERROR', errors?: ApiFieldError[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }

  /** Lấy lỗi của 1 field cụ thể để hiện dưới ô input */
  fieldError(field: string): string | undefined {
    return this.errors?.find((e) => e.field === field || e.field.endsWith(`.${field}`))?.message;
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Bỏ qua việc thử refresh token (dùng cho chính endpoint refresh) */
  skipRefresh?: boolean;
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const { body, skipRefresh: _skip, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();
  const headers = new Headers(rest.headers);

  if (body !== undefined && !(body instanceof FormData)) headers.set('Content-Type', 'application/json');

  // Double-submit CSRF: chỉ cần cho các request có thay đổi dữ liệu
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = readCookie('csrf_token');
    if (csrf) headers.set('x-csrf-token', csrf);
  }

  return fetch(`${API_URL}${path}`, {
    ...rest,
    method,
    headers,
    credentials: 'include', // BẮT BUỘC: cookie httpOnly chứa access token
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    cache: 'no-store',
  });
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, options);

  // Access token hết hạn → xoay token rồi thử lại đúng 1 lần
  if (res.status === 401 && !options.skipRefresh) {
    const body = await res.clone().json().catch(() => ({}));
    if (body?.code === 'TOKEN_EXPIRED' || body?.code === 'UNAUTHORIZED') {
      const refreshed = await rawRequest('/auth/refresh', { method: 'POST', skipRefresh: true });
      if (refreshed.ok) res = await rawRequest(path, options);
    }
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? 'Đã có lỗi xảy ra', data?.code, data?.errors);
  }
  return data as T;
}

/** Gọi API và trả về `data` (bỏ lớp envelope) */
export async function apiData<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const json = await api<{ data: T }>(path, options);
  return json.data;
}

/** Gọi API trả về cả envelope (cần `meta` phân trang, `facets`…) */
export async function apiFull<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return api<T>(path, options);
}

/**
 * Tải file (CSV, ảnh QR…) kèm cookie xác thực.
 * Không dùng `api()` vì response là blob, không phải JSON envelope.
 */
export async function downloadFile(path: string, filename?: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message ?? 'Không tải được file', body?.code);
  }

  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const name = filename ?? match?.[1] ?? `shopvn-download-${Date.now()}`;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
