#!/usr/bin/env node
/**
 * ShopVN Doctor — kiểm tra môi trường trước khi chạy dự án.
 *
 *   cd backend && npm run doctor
 *   # hoặc chạy trực tiếp từ bất kỳ thư mục nào:
 *   node backend/scripts/doctor.mjs
 *
 * Không cần cài thêm gì (chỉ dùng thư viện có sẵn của Node).
 * Mỗi mục in ra:  [OK] xong  ·  [!] cảnh báo (vẫn chạy được)  ·  [X] phải sửa
 * 7 mục: gói cài đặt · .env · Node & thư viện · PostgreSQL · Frontend · server đang chạy · kết luận
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Console Windows mặc định dùng code page cũ ⇒ tiếng Việt bị vỡ.
// Đổi sang UTF-8 cho dễ đọc (nếu bị chặn thì bỏ qua, không ảnh hưởng gì).
if (process.platform === 'win32') {
  try {
    execSync('chcp 65001 > nul', { stdio: 'ignore' });
  } catch {
    /* bỏ qua */
  }
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '..');
const ROOT = path.resolve(BACKEND, '..');

/* ── ANSI: tự tắt màu khi output bị redirect ra file ── */
const useColor = Boolean(process.stdout.isTTY);
const raw = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m' };
const C = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, useColor ? v : '']));

const problems = [];

const ok = (m) => console.log(`  ${C.green}[OK]${C.reset} ${m}`);
const warn = (m) => console.log(`  ${C.yellow}[ !]${C.reset} ${m}`);
const bad = (m) => {
  console.log(`  ${C.red}[ X]${C.reset} ${m}`);
  problems.push(m);
};
const section = (t) => console.log(`\n${C.bold}${C.cyan}>> ${t}${C.reset}`);

/* ───────────────────────── Đọc file .env ───────────────────────── */
function parseEnv(file) {
  if (!fs.existsSync(file)) return null;
  // Bỏ BOM (Notepad / PowerShell 5.1 có thể ghi thêm) để key đầu tiên không bị hỏng
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/* ───────────────────── Kiểm tra cổng TCP ───────────────────── */
function tryConnect(host, port, timeout = 4000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const finish = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    try {
      socket.connect(Number(port), host);
    } catch {
      finish(false);
    }
  });
}

/**
 * Trên Windows, `localhost` có thể phân giải thành IPv6 (::1) trong khi Docker chỉ mở IPv4.
 * Nên thử lần lượt nhiều địa chỉ — đây là lớp bảo hiểm thứ hai sau autoSelectFamily của Node 20.
 */
async function checkDb(host, port) {
  const candidates = host === 'localhost' ? ['127.0.0.1', 'localhost', '::1'] : [host, '127.0.0.1'];
  for (const candidate of candidates) {
    if (await tryConnect(candidate, port)) return { alive: true, via: candidate };
  }
  return { alive: false, via: null };
}

/* ───────────────────── Kiểm tra HTTP (fetch có timeout) ───────────────────── */
async function httpStatus(url, ms = 4000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.status;
  } catch {
    return null; // không kết nối được
  }
}

/* ───────────────────────── Nội dung chính ───────────────────────── */
async function main() {
  console.log(`\n${C.bold}ShopVN Doctor${C.reset} ${C.dim}— kiểm tra môi trường trước khi chạy${C.reset}`);
  console.log(`${C.dim}Thư mục dự án: ${ROOT}${C.reset}`);

  /* ═══════════ 1. Gói cài đặt (chống dùng nhầm zip cũ) ═══════════ */
  section('1/7  Gói cài đặt');
  const expected = [
    'BAT-DAU-O-DAY.md',
    'setup-windows.cmd',
    'setup-windows.ps1',
    'setup-gitbash.sh',
    'start-all.cmd',
    'VSCODE.md',
    'chan-doan.cmd',
    'stop-all.sh',
    'stop-all.cmd',
    'xem-log.sh',
    'backend/scripts/db-check.mjs',
    'HUONG-DAN-SETUP.md',
    'kiem-tra.sh',
    'kiem-tra.cmd',
    'backend/scripts/kiem-tra.mjs',
    'backend/scripts/predev.mjs',
    'frontend/scripts/predev.mjs',
    '.vscode/tasks.json',
    'backend/scripts/bootstrap-env.mjs',
  ];
  const missing = expected.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  let buildNote = '';
  const buildInfo = path.join(ROOT, 'BUILD-INFO.txt');
  if (fs.existsSync(buildInfo)) {
    const m = /BẢN DỰNG #(\d+)/.exec(fs.readFileSync(buildInfo, 'utf8'));
    if (m) buildNote = ` (bản dựng #${m[1]})`;
  }
  if (missing.length === 0) {
    ok(`Gói cài đặt đầy đủ${buildNote}`);
  } else {
    warn(`Bạn đang dùng GÓI CŨ — thiếu ${missing.length} file: ${missing.join(', ')}`);
    warn('Hãy tải lại zip mới nhất rồi giải nén đè (hoặc xoá thư mục cũ trước). Không chặn chạy nếu các mục dưới đây đều [OK].');
    if (missing.includes('.vscode/tasks.json')) {
      warn('Thiếu cấu hình VS Code — tải zip mới rồi mở lại VS Code để thấy các task (Ctrl+Shift+P → "Tasks: Run Task").');
    }
  }

  /* ═══════════ 2. .env ═══════════ */
  section('2/7  Biến môi trường (backend/.env)');
  const env = parseEnv(path.join(BACKEND, '.env'));
  const PLACEHOLDER = /(thay_bang|change_me|your_|xxx|placeholder|__)/i;

  if (!env) {
    bad('Chưa có backend/.env — tạo bằng:  cp .env.example backend/.env   (Windows: Copy-Item .env.example backend\\.env)');
  } else {
    ok(`Đã tìm thấy backend/.env (${Object.keys(env).length} biến)`);

    const must = [
      ['DATABASE_URL', 'chuỗi kết nối PostgreSQL'],
      ['JWT_ACCESS_SECRET', 'khoá ký access token (≥ 32 ký tự)'],
      ['JWT_REFRESH_SECRET', 'khoá ký refresh token (≥ 32 ký tự)'],
    ];
    for (const [key, desc] of must) {
      if (!env[key]) bad(`Thiếu ${key} — ${desc}`);
      else if (PLACEHOLDER.test(env[key])) bad(`${key} vẫn là giá trị mẫu — ${desc}`);
    }
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'WEBHOOK_SECRET']) {
      if (env[key] && env[key].length < 32) {
        warn(`${key} chỉ có ${env[key].length} ký tự (nên ≥ 32). Sinh lại:  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`);
      }
    }
    if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      bad('JWT_ACCESS_SECRET và JWT_REFRESH_SECRET đang GIỐNG NHAU — phải khác nhau, nếu không refresh token dùng được như access token.');
    }
    if (!env.WEBHOOK_SECRET || PLACEHOLDER.test(env.WEBHOOK_SECRET)) {
      warn('WEBHOOK_SECRET còn là giá trị mẫu — webhook ngân hàng sẽ không xác thực được chữ ký.');
    }
    if (env.MAIL_DRIVER === 'console' || !env.SMTP_USER) {
      warn('Email đang log ra console (MAIL_DRIVER=console). Muốn gửi mail thật thì điền SMTP_USER + SMTP_PASS (Gmail App Password). Không ảnh hưởng việc chạy app.');
    } else {
      ok('Đã cấu hình SMTP để gửi email thật.');
    }
    if (env.BANK_BIN) ok(`Tài khoản nhận tiền: BIN ${env.BANK_BIN} · ${env.BANK_NAME ?? '?'} · ${env.BANK_ACCOUNT_NO ?? '?'}`);
    else warn('Chưa có BANK_BIN — có thể nhập sau trong Admin → Cấu hình shop.');
  }

  /* ═══════════ 3. Node & thư viện ═══════════ */
  section('3/7  Node.js & thư viện');
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 20) ok(`Node.js v${process.versions.node}`);
  else bad(`Node.js v${process.versions.node} quá cũ — cần ≥ 20 LTS (tải tại nodejs.org)`);

  for (const [name, dir] of [['backend', BACKEND], ['frontend', path.join(ROOT, 'frontend')]]) {
    if (fs.existsSync(path.join(dir, 'node_modules'))) ok(`${name}: đã cài node_modules`);
    else bad(`${name}: chưa cài phụ thuộc — chạy:  cd ${name} && npm install`);
  }
  // Kiểm tra THẬT: npm tạo sẵn file giả ở .prisma/client ⇒ không tin vào việc "file tồn tại"
  {
    const idx = path.join(BACKEND, 'node_modules', '.prisma', 'client', 'index.js');
    const dfl = path.join(BACKEND, 'node_modules', '.prisma', 'client', 'default.js');
    const isStub = [idx, dfl].some((f) => {
      try { return fs.readFileSync(f, 'utf8').includes('did not initialize yet'); } catch { return false; }
    });
    const probe = spawnSync(process.execPath, ['-e',
      "try{const{PrismaClient}=require('@prisma/client');new PrismaClient();process.exit(0)}catch(e){process.exit(1)}"],
      { cwd: BACKEND, stdio: 'ignore' });
    if (!fs.existsSync(idx)) bad('Chưa generate Prisma Client — chạy:  cd backend && npm run prisma:generate');
    else if (isStub) bad('Prisma Client đang là BẢN GIẢ (npm tạo, chưa generate thật) → seed sẽ báo "did not initialize yet". Sửa:  cd backend && npm run prisma:generate');
    else if (probe.status !== 0) bad('PrismaClient không khởi tạo được — chạy:  cd backend && npm run prisma:generate');
    else ok('Prisma Client đã được generate (đã thử khởi tạo thật: OK)');
  }

  /* ═══════════ 4. Database ═══════════ */
  section('4/7  Kết nối PostgreSQL');
  let db = null;
  if (env?.DATABASE_URL) {
    try {
      const u = new URL(env.DATABASE_URL.replace(/^postgres(ql)?:\/\//, 'http://'));
      db = { host: u.hostname, port: u.port || '5432', name: u.pathname.replace(/^\//, '') || '(trống)' };
    } catch {
      bad('DATABASE_URL sai định dạng. Mẫu:  postgresql://postgres:matkhau@localhost:5432/ecommerce?schema=public');
    }
  } else if (env) {
    bad('Chưa có DATABASE_URL trong backend/.env');
  }

  if (db) {
    const result = await checkDb(db.host, db.port);
    if (result.alive) {
      const note = result.via !== db.host ? ` ${C.dim}(kết nối qua ${result.via})${C.reset}` : '';
      ok(`PostgreSQL đang chạy tại ${db.host}:${db.port} — database: ${db.name}${note}`);
    } else {
      bad(`Không kết nối được ${db.host}:${db.port}. Cách kiểm tra:
       · Docker:   docker compose up -d    rồi    docker compose ps     (phải thấy postgres "healthy")
       · Windows:  Services -> PostgreSQL -> Start
       · macOS:    brew services start postgresql@17
       · Ubuntu:   sudo systemctl start postgresql
       · Đổi cổng? Nếu docker-compose map "5433:5432" thì DATABASE_URL phải dùng cổng 5433.`);
    }
  }

  /* ═══════════ 5. Frontend ═══════════ */
  section('5/7  Frontend');
  const feEnvPath = path.join(ROOT, 'frontend', '.env.local');
  if (fs.existsSync(feEnvPath)) {
    const fe = parseEnv(feEnvPath);
    ok('Đã có frontend/.env.local');
    if (fe.NEXT_PUBLIC_API_URL === '/api/v1') {
      ok('Frontend gọi API qua proxy của Next (same-origin) — không cần chỉnh CORS.');
    } else if (fe.NEXT_PUBLIC_API_URL) {
      warn(`Frontend gọi trực tiếp ${fe.NEXT_PUBLIC_API_URL} ⇒ phải khớp CORS_ORIGIN trong backend/.env (hiện tại: ${env?.CORS_ORIGIN ?? '?'}).`);
    }
  } else {
    bad('Thiếu frontend/.env.local — tạo file với nội dung:\n       NEXT_PUBLIC_API_URL=/api/v1\n       API_PROXY_TARGET=http://localhost:4000\n       NEXT_PUBLIC_SITE_URL=http://localhost:3000\n       NEXT_PUBLIC_SITE_NAME=ShopVN');
  }

  /* ═══════════ 6. Server đang chạy? (thông tin) ═══════════ */
  section('6/7  Server đang chạy (thông tin)');

  const apiStatus = await httpStatus('http://127.0.0.1:4000/api/v1/health');
  if (apiStatus === 200) {
    ok('API đang chạy ở cổng 4000 — /api/v1/health trả 200');
  } else if (await tryConnect('127.0.0.1', 4000)) {
    warn('Cổng 4000 đang mở nhưng /api/v1/health không trả 200 — có thể là tiến trình KHÁC đang chiếm cổng. Chạy:  netstat -ano | findstr :4000');
  } else {
    warn('API chưa chạy (bình thường nếu bạn chưa bật). Bật bằng:  nháy đúp backend\\run-dev.cmd   hoặc   cd backend && npm run dev');
  }

  const webStatus = await httpStatus('http://127.0.0.1:3000/');
  if (webStatus === 200) {
    ok('Website đang chạy ở cổng 3000 — mở http://localhost:3000');
  } else if (await tryConnect('127.0.0.1', 3000)) {
    warn('Cổng 3000 đang mở nhưng chưa trả trang (Next.js còn đang build lần đầu — đợi 20–30 giây rồi thử lại).');
  } else {
    warn('Website chưa chạy (bình thường nếu bạn chưa bật). Bật bằng:  nháy đúp frontend\\run-dev.cmd   hoặc   cd frontend && npm run dev');
  }

  if (apiStatus === 200 && webStatus === 200) {
    ok('Cả 2 server đều OK — mở http://localhost:3000');
  }

  /* ═══════════ 7. Kết luận ═══════════ */
  section('7/7  Kết luận');
  console.log(`${C.dim}${'-'.repeat(60)}${C.reset}`);

  if (problems.length === 0) {
    console.log(`${C.green}${C.bold}  MÔI TRƯỜNG OK — chạy tiếp:${C.reset}

     cd backend
     npm run setup      ${C.dim}# generate + migrate + extension + seed (nếu chưa chạy)${C.reset}
     npm run dev        ${C.dim}# http://localhost:4000/api/v1  ·  Swagger: /api/docs  ·  health: /api/v1/health${C.reset}

     ${C.dim}# mở terminal khác${C.reset}
     cd frontend && npm run dev      ${C.dim}# http://localhost:3000${C.reset}
`);
    return;
  }

  console.log(`${C.red}${C.bold}  CÒN ${problems.length} VIỆC PHẢI SỬA:${C.reset}`);
  problems.forEach((p, i) => console.log(`   ${i + 1}. ${p.split('\n')[0]}`));
  console.log(`\n${C.dim}  Sửa xong chạy lại:  npm run doctor${C.reset}`);
  console.log(`${C.dim}  Muốn lưu toàn bộ kết quả ra file:  npm run doctor *> doctor-log.txt${C.reset}`);
  console.log(`${C.dim}  Hoặc nháy đúp file chan-doan.cmd ở thư mục gốc dự án (tự lưu ra chan-doan-ket-qua.txt)${C.reset}`);
  console.log(`
${C.yellow}  [!] LƯU Ý: npm sẽ in thêm khối đỏ "npm error code 1" ngay bên dưới.
      Đó CHỈ là dấu hiệu "còn việc cần sửa" — KHÔNG phải script bị hỏng.${C.reset}
`);

  // Mã thoát 1 để dùng được trong CI (GitHub Actions đọc được), nhưng người dùng không bị hoang mang
  // nhờ dòng lưu ý in ngay trước đó.
  process.exitCode = 1;
}

main().catch((err) => {
  console.log(`\n${C.red}${C.bold}  Doctor gặp lỗi không mong đợi:${C.reset} ${err?.message ?? err}`);
  console.log(`${C.dim}  Hãy copy toàn bộ khung này gửi lại để được hỗ trợ.${C.reset}\n`);
  if (err?.stack) console.log(`${C.dim}${err.stack}${C.reset}\n`);
  process.exitCode = 1;
});
