/**
 * ============================================================================
 *  bootstrap-env.mjs — Chuẩn hoá backend/.env trước khi chạy dự án
 * ============================================================================
 *  Được gọi tự động bởi setup-windows.ps1 và setup-gitbash.sh.
 *  Cũng có thể chạy tay:   cd backend && node scripts/bootstrap-env.mjs
 *
 *  Việc nó làm (an toàn khi chạy lại nhiều lần):
 *    1. Chưa có backend/.env  ->  tạo từ .env.example
 *    2. Khoá bí mật thiếu / còn giá trị mẫu / ngắn hơn 32 ký tự  ->  sinh mới
 *       (khoá nào bạn đã tự đặt đúng thì GIỮ NGUYÊN, không ghi đè)
 *    3. Đảm bảo JWT_ACCESS_SECRET khác JWT_REFRESH_SECRET
 *    4. DATABASE_URL trỏ về 127.0.0.1 (tránh lỗi IPv6 ::1 với Docker Desktop)
 *    5. Ghi file UTF-8 KHÔNG kèm BOM (để dotenv đọc đúng dòng đầu tiên)
 *
 *  Chỉ dùng thư viện có sẵn của Node — không cần npm install.
 * ============================================================================
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // backend/scripts
const BACKEND = path.resolve(HERE, '..'); // backend
const ROOT = path.resolve(BACKEND, '..'); // thư mục gốc dự án
const ENV_PATH = path.join(BACKEND, '.env');
const EXAMPLE_PATH = path.join(ROOT, '.env.example');

const DOCKER_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/ecommerce?schema=public';
const SECRET_KEYS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'WEBHOOK_SECRET'];
const PLACEHOLDER = /(thay_bang|change[_-]?me|your[_-]|placeholder|xxxx|\.\.\.|\{\{)/i;

const ok = (t) => console.log(`  [OK] ${t}`);
const warn = (t) => console.log(`  [ !] ${t}`);
const bad = (t) => console.log(`  [ X] ${t}`);

function die(message) {
  bad(message);
  process.exit(1);
}

if (!fs.existsSync(EXAMPLE_PATH)) {
  die(`Không thấy file .env.example trong ${ROOT} — bạn có đang chạy trong thư mục dự án không?`);
}

// ── 1. Tạo file nếu chưa có ────────────────────────────────────────────────
let created = false;
if (!fs.existsSync(ENV_PATH)) {
  fs.copyFileSync(EXAMPLE_PATH, ENV_PATH);
  created = true;
}

let text = fs.readFileSync(ENV_PATH, 'utf8');
if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // bỏ BOM nếu Notepad/PowerShell thêm vào
text = text.replace(/\r\n/g, '\n');
if (!text.endsWith('\n')) text += '\n';

const getValue = (key) => {
  const m = new RegExp(`^${key}=(.*)$`, 'm').exec(text);
  return m ? m[1].trim() : '';
};
const setValue = (key, value) => {
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) text = text.replace(re, `${key}=${value}`);
  else text += `${key}=${value}\n`;
};

// ── 2 + 3. Khoá bí mật ─────────────────────────────────────────────────────
const genSecret = () => crypto.randomBytes(48).toString('hex'); // 96 ký tự

const regenerated = [];
for (const key of SECRET_KEYS) {
  const current = getValue(key);
  const tooShort = current.length < 32; // env.ts yêu cầu tối thiểu 32 ký tự
  if (!current || tooShort || PLACEHOLDER.test(current)) {
    setValue(key, genSecret());
    regenerated.push(key);
  }
}

if (getValue('JWT_ACCESS_SECRET') === getValue('JWT_REFRESH_SECRET')) {
  setValue('JWT_REFRESH_SECRET', genSecret());
  if (!regenerated.includes('JWT_REFRESH_SECRET')) regenerated.push('JWT_REFRESH_SECRET');
}

// ── 4. DATABASE_URL ────────────────────────────────────────────────────────
const dbValue = getValue('DATABASE_URL');
let dbNote = '';

if (!dbValue) {
  setValue('DATABASE_URL', DOCKER_DATABASE_URL);
  dbNote = 'đã thêm mới';
} else {
  try {
    const url = new URL(dbValue);
    if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) {
      const before = url.toString();
      url.hostname = '127.0.0.1';
      const after = url.toString();
      if (before !== after) {
        setValue('DATABASE_URL', after);
        dbNote = 'đã đổi localhost -> 127.0.0.1 (tránh lỗi IPv6 với Docker)';
      } else {
        dbNote = 'giữ nguyên (đã dùng 127.0.0.1)';
      }
    } else {
      dbNote = `giữ nguyên (host: ${url.hostname})`;
    }
  } catch {
    warn(`DATABASE_URL hiện tại không phải URL hợp lệ: ${dbValue}`);
    dbNote = 'KHÔNG bị thay đổi — bạn kiểm tra lại giúp';
  }
}

// ── 5. Ghi lại file (UTF-8, không BOM) ─────────────────────────────────────
fs.writeFileSync(ENV_PATH, text, 'utf8');

// ── Báo cáo ────────────────────────────────────────────────────────────────
ok(created ? 'backend/.env: vừa tạo từ .env.example' : 'backend/.env: đã có sẵn');
if (regenerated.length) {
  ok(`Sinh khoá bí mật ngẫu nhiên cho: ${regenerated.join(', ')}`);
} else {
  ok('Khoá bí mật đã đủ mạnh — giữ nguyên, không ghi đè');
}
ok(`DATABASE_URL: ${dbNote}  ->  ${getValue('DATABASE_URL')}`);

const jwtLen = getValue('JWT_ACCESS_SECRET').length;
if (jwtLen < 32) {
  die('Khoá JWT vẫn ngắn hơn 32 ký tự — hãy xoá backend/.env rồi chạy lại.');
}
