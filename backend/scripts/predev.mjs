#!/usr/bin/env node
/**
 * ============================================================================
 *  predev.mjs — Chạy TRƯỚC khi khởi động API (npm run dev)
 * ============================================================================
 *  Mục đích: biến những lỗi "chết im lặng" thành thông báo tiếng Việt dễ hiểu.
 *
 *  Thứ tự kiểm tra (nhanh, chỉ dùng thư viện có sẵn của Node):
 *    1. backend/.env có chưa?           → thiếu = CHẶN (in cách tạo)
 *    2. Các biến bắt buộc + khoá JWT ≥32 ký tự → sai = CHẶN (giống env.ts)
 *    3. node_modules + Prisma Client     → thiếu = CHẶN (in lệnh cài)
 *    4. Cổng 4000 có bị chiếm?          → bị chiếm = CHẶN (in cách tắt tiến trình cũ)
 *    5. PostgreSQL có kết nối được?      → không = CẢNH BÁO (không chặn)
 * ============================================================================
 */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.platform === 'win32') {
  try { execSync('chcp 65001 > nul', { stdio: 'ignore' }); } catch { /* bỏ qua */ }
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '..');
const ROOT = path.resolve(BACKEND, '..');
const ENV_PATH = path.join(BACKEND, '.env');

const useColor = Boolean(process.stdout.isTTY);
const c = (code) => (useColor ? code : '');
const G = c('\x1b[32m'), Y = c('\x1b[33m'), R = c('\x1b[31m'), B = c('\x1b[1m'), D = c('\x1b[2m'), N = c('\x1b[0m');

const blockers = [];
const warnings = [];

const ok = (m) => console.log(`  ${G}[OK]${N} ${m}`);
const warn = (m) => { console.log(`  ${Y}[ !]${N} ${m}`); warnings.push(m); };
const bad = (m, fix) => { console.log(`  ${R}[ X]${N} ${m}`); blockers.push(fix); };

function parseEnv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function portBusy(port, host = '127.0.0.1', ms = 800) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const done = (v) => { s.removeAllListeners(); s.destroy(); resolve(v); };
    s.setTimeout(ms);
    s.once('connect', () => done(true));
    s.once('timeout', () => done(false));
    s.once('error', () => done(false));
    try { s.connect(Number(port), host); } catch { done(false); }
  });
}

async function main() {
  console.log(`\n${B}▶ Chuẩn bị khởi động API ShopVN${N} ${D}(kiểm tra nhanh vài thứ)${N}`);

  // ── 1. .env ──────────────────────────────────────────────────────────────
  if (!fs.existsSync(ENV_PATH)) {
    bad('Chưa có file backend/.env — API không thể khởi động.',
      'Tạo backend/.env bằng 1 trong 2 cách:\n' +
      '       · Nháy đúp  setup-windows.cmd  ở thư mục gốc (tự tạo + sinh khoá bí mật)\n' +
      '       · Hoặc Git Bash:  bash setup-gitbash.sh\n' +
      '       · Hoặc nhanh nhất:  cd backend && node scripts/bootstrap-env.mjs');
    return finish();
  }
  const env = parseEnv(ENV_PATH);

  // ── 2. Biến bắt buộc (giống điều kiện trong src/config/env.ts) ───────────
  const PLACEHOLDER = /(thay_bang|change[_-]?me|your[_-]|placeholder|xxx)/i;
  const required = [
    ['DATABASE_URL', 'chuỗi kết nối PostgreSQL'],
    ['JWT_ACCESS_SECRET', 'khoá ký access token'],
    ['JWT_REFRESH_SECRET', 'khoá ký refresh token'],
  ];
  const missing = required.filter(([k]) => !env[k]).map(([k, d]) => `${k} (${d})`);

  if (missing.length) {
    bad(`backend/.env thiếu biến bắt buộc: ${missing.join(', ')}`,
      'Sinh lại .env tự động:  cd backend && node scripts/bootstrap-env.mjs');
  }

  const shortSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter(
    (k) => env[k] && (env[k].length < 32 || PLACEHOLDER.test(env[k])),
  );
  if (shortSecrets.length) {
    const detail = shortSecrets
      .map((k) => `${k} = ${env[k].length} ký tự${PLACEHOLDER.test(env[k]) ? ' (vẫn là giá trị mẫu)' : ''}`)
      .join(' · ');
    bad(`Khoá bí mật chưa đạt yêu cầu (cần ≥ 32 ký tự): ${detail}`,
      'Sinh lại khoá tự động:  cd backend && node scripts/bootstrap-env.mjs\n' +
      '       (Script giữ nguyên khoá bạn đã đặt đúng, chỉ sửa khoá thiếu/quá ngắn.)');
  }

  if (!blockers.length) {
    ok('.env hợp lệ (đủ biến bắt buộc, khoá bí mật ≥ 32 ký tự)');
  }

  // ── 3. Thư viện + Prisma Client ──────────────────────────────────────────
  if (!fs.existsSync(path.join(BACKEND, 'node_modules'))) {
    bad('Chưa cài thư viện backend (thiếu thư mục node_modules).',
      'Cài thư viện:  cd backend && npm install\n' +
      '       (hoặc chạy  setup-windows.cmd  /  bash setup-gitbash.sh  để làm tất cả)');
  } else {
    const idx = path.join(BACKEND, 'node_modules', '.prisma', 'client', 'index.js');
    const dfl = path.join(BACKEND, 'node_modules', '.prisma', 'client', 'default.js');
    const isStub = [idx, dfl].some((f) => {
      try { return fs.readFileSync(f, 'utf8').includes('did not initialize yet'); } catch { return false; }
    });
    if (!fs.existsSync(idx) || isStub) {
      bad('Prisma Client chưa generate thật (đang là bản giả của npm) → API/seed sẽ báo "did not initialize yet".',
        'Chạy:  cd backend && npm run prisma:generate');
    } else {
      ok('Thư viện + Prisma Client đã sẵn sàng');
    }
  }

  // ── 4. Cổng 4000 ─────────────────────────────────────────────────────────
  const PORT = Number(env.PORT || 4000);
  if (await portBusy(PORT)) {
    bad(`Cổng ${PORT} đang bị tiến trình khác chiếm → API không thể khởi động (EADDRINUSE).`,
      `Cách xử lý:\n` +
      `       · Có thể cửa sổ "ShopVN API" cũ vẫn đang chạy → tìm và đóng cửa sổ đó.\n` +
      `       · Windows:  netstat -ano | findstr :${PORT}     rồi    taskkill /PID <pid> /F\n` +
      `       · Git Bash:  bash chan-doan.sh  (báo rõ tiến trình nào đang giữ cổng)`);
  } else {
    ok(`Cổng ${PORT} đang trống`);
  }

  // ── 5. PostgreSQL (chỉ cảnh báo — API vẫn lên, nhưng truy vấn sẽ lỗi) ────
  if (env.DATABASE_URL) {
    let host = '127.0.0.1', port = 5432, dbName = '';
    try {
      const u = new URL(env.DATABASE_URL.replace(/^postgres(ql)?:\/\//, 'http://'));
      host = u.hostname === 'localhost' ? '127.0.0.1' : u.hostname;
      port = Number(u.port || 5432);
      dbName = u.pathname.replace(/^\//, '');
    } catch { /* bỏ qua */ }

    if (await portBusy(port, host, 1500)) {
      ok(`PostgreSQL kết nối được (${host}:${port} · database: ${dbName || '?'})`);
    } else {
      warn(`Không kết nối được PostgreSQL ở ${host}:${port} — API vẫn khởi động nhưng trang web sẽ báo lỗi khi tải dữ liệu.`);
      warn('Bật database:  nháy đúp db-start.cmd   (hoặc  docker compose up -d  rồi đợi "healthy")');
    }
  }

  return finish();
}

function finish() {
  if (blockers.length) {
    console.log(`\n${R}${B}  ✖ CHƯA khởi động được API — cần sửa ${blockers.length} việc ở trên.${N}`);
    blockers.forEach((b, i) => console.log(`\n  ${B}${i + 1}.${N} ${b}`));
    console.log(`\n${D}  Gợi ý: nếu chưa rõ lỗi ở đâu, nháy đúp  chan-doan.cmd  ở thư mục gốc dự án.${N}`);
    console.log(`${D}         Nó kiểm tra Docker, database, cổng, .env… và lưu kết quả ra chan-doan-ket-qua.txt${N}\n`);
    process.exit(1);
  }

  const tip = warnings.length
    ? `${Y}  (có ${warnings.length} cảnh báo vàng ở trên — không chặn khởi động)${N}`
    : '';
  console.log(`\n${G}${B}  ✔ Sẵn sàng — đang khởi động API...${N}${tip}`);
  console.log(`${D}  Đợi vài giây tới khi thấy dòng: 🚀 ShopVN API đang chạy tại http://localhost:4000/api/v1${N}\n`);
}

main().catch((err) => {
  console.log(`\n  ${R}[ X]${N} Kiểm tra trước khi chạy gặp lỗi: ${err?.message ?? err}\n`);
  process.exit(1);
});
