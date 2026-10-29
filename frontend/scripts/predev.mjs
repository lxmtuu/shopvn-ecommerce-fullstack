#!/usr/bin/env node
/**
 * ============================================================================
 *  predev.mjs — Chạy TRƯỚC khi khởi động giao diện web (npm run dev)
 * ============================================================================
 *  Kiểm tra nhanh để tránh 3 tình huống gây hoang mang:
 *    · Cổng 3000 đã bị chiếm  (=> lần trước bạn chưa tắt server cũ)
 *    · API :4000 chưa chạy     (=> web mở được nhưng dữ liệu trắng/lỗi)
 *    · Thiếu .env.local        (=> web gọi nhầm địa chỉ API)
 *
 *  Chỉ CHẶN khi cổng 3000 bị chiếm hoặc thiếu thư viện; còn lại chỉ cảnh báo.
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
const FRONTEND = path.resolve(HERE, '..');
const ROOT = path.resolve(FRONTEND, '..');

const useColor = Boolean(process.stdout.isTTY);
const c = (code) => (useColor ? code : '');
const G = c('\x1b[32m'), Y = c('\x1b[33m'), R = c('\x1b[31m'), B = c('\x1b[1m'), D = c('\x1b[2m'), N = c('\x1b[0m');

const blockers = [];
const warnings = [];
const ok = (m) => console.log(`  ${G}[OK]${N} ${m}`);
const warn = (m) => { console.log(`  ${Y}[ !]${N} ${m}`); warnings.push(m); };
const bad = (m, fix) => { console.log(`  ${R}[ X]${N} ${m}`); blockers.push(fix); };

function portBusy(port, host = '127.0.0.1', ms = 1000) {
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
  console.log(`\n${B}▶ Chuẩn bị khởi động giao diện ShopVN${N} ${D}(kiểm tra nhanh vài thứ)${N}`);

  // ── 1. Thư viện ──────────────────────────────────────────────────────────
  if (!fs.existsSync(path.join(FRONTEND, 'node_modules'))) {
    bad('Chưa cài thư viện frontend (thiếu node_modules).',
      'Cài thư viện:  cd frontend && npm install\n       (hoặc chạy  setup-windows.cmd  /  bash setup-gitbash.sh)');
  } else {
    ok('Thư viện frontend đã sẵn sàng');
  }

  // ── 2. .env.local ────────────────────────────────────────────────────────
  const envLocal = path.join(FRONTEND, '.env.local');
  if (!fs.existsSync(envLocal)) {
    // Tự tạo — đây là file cấu hình dev, KHÔNG chứa bí mật và đã nằm trong .gitignore.
    // Nhờ vậy `npm run dev` chạy được ngay cả khi người dùng bỏ qua bước setup.
    const content = [
      '# === ShopVN - cau hinh giao dien web ===',
      '# Goi API qua proxy same-origin cua Next (next.config.ts -> API_PROXY_TARGET).',
      '# KHONG doi thanh http://localhost:4000/api/v1 tru khi ban that su muon goi',
      '# thang backend khac origin (se dinh CORS + khong gui duoc cookie).',
      'NEXT_PUBLIC_API_URL=/api/v1',
      'API_PROXY_TARGET=http://127.0.0.1:4000',
      'NEXT_PUBLIC_SITE_URL=http://localhost:3000',
      'NEXT_PUBLIC_SITE_NAME=ShopVN',
      '',
    ].join('\n');
    fs.writeFileSync(envLocal, content, 'utf8');
    ok('Đã tự tạo frontend/.env.local (API qua proxy /api/v1)');
  } else {
    const txt = fs.readFileSync(envLocal, 'utf8');
    const apiUrl = (/^\s*NEXT_PUBLIC_API_URL\s*=\s*(.*)$/m.exec(txt)?.[1] || '').trim();
    const target = (/^\s*API_PROXY_TARGET\s*=\s*(.*)$/m.exec(txt)?.[1] || '').trim();
    if (apiUrl === '/api/v1') ok(`.env.local OK (gọi API qua proxy Next → ${target || 'http://127.0.0.1:4000'})`);
    else warn(`NEXT_PUBLIC_API_URL = "${apiUrl || '(trống)'}" — mặc định nên là /api/v1 để tránh lỗi CORS.`);
  }

  // ── 3. Cổng 3000 ─────────────────────────────────────────────────────────
  if (await portBusy(3000)) {
    bad('Cổng 3000 đang bị chiếm → web không khởi động được (EADDRINUSE).',
      'Nhiều khả năng bạn còn cửa sổ "ShopVN WEB" từ lần chạy trước.\n' +
      '       · Tìm và đóng cửa sổ đó, rồi chạy lại.\n' +
      '       · Windows:  netstat -ano | findstr :3000     rồi    taskkill /PID <pid> /F');
  } else {
    ok('Cổng 3000 đang trống');
  }

  // ── 4. API :4000 (chỉ cảnh báo) ──────────────────────────────────────────
  if (await portBusy(4000)) {
    ok('API đang chạy ở cổng 4000 — web sẽ lấy được dữ liệu');
  } else {
    warn('API (cổng 4000) CHƯA chạy — web vẫn mở được nhưng sản phẩm/đơn hàng sẽ trống hoặc báo lỗi.');
    warn('Bật API trước:  nháy đúp backend\\run-dev.cmd   (hoặc  cd backend && npm run dev )');
  }

  if (blockers.length) {
    console.log(`\n${R}${B}  ✖ CHƯA khởi động được giao diện — cần sửa ${blockers.length} việc ở trên.${N}`);
    blockers.forEach((b, i) => console.log(`\n  ${B}${i + 1}.${N} ${b}`));
    console.log(`\n${D}  Cách gọn nhất để bật đúng thứ tự: nháy đúp  start-all.cmd  ở thư mục gốc dự án.${N}\n`);
    process.exit(1);
  }

  const tip = warnings.length ? `${Y}  (có ${warnings.length} cảnh báo vàng — không chặn khởi động)${N}` : '';
  console.log(`\n${G}${B}  ✔ Sẵn sàng — đang khởi động giao diện...${N}${tip}`);
  console.log(`${D}  Lần đầu Next.js phải build, mất 10–30 giây. Khi thấy "✓ Ready" thì mở http://localhost:3000${N}\n`);
}

main().catch((err) => {
  console.log(`\n  ${R}[ X]${N} Kiểm tra trước khi chạy gặp lỗi: ${err?.message ?? err}\n`);
  process.exit(1);
});
