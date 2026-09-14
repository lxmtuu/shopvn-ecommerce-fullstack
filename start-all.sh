#!/usr/bin/env bash
# ==============================================================================
#  ShopVN — BẬT HỆ THỐNG (tự sửa + tự kiểm tra)   ·   dành cho Git Bash / WSL
# ==============================================================================
#  CÁCH DÙNG (chạy từ thư mục gốc dự án — nơi có file này):
#
#      bash start-all.sh            # bật database + API + website (chế độ DEV)
#      bash start-all.sh prod       # chế độ PRODUCTION: nhẹ RAM, mượt, ổn định nhất
#                                     (tự 'npm run build' rồi 'npm start')
#      bash stop-all.sh             # tắt hết
#      bash xem-log.sh              # xem log đang chạy (Ctrl+C để thoát)
#      bash xem-log.sh api          # chỉ xem log API
#      bash xem-log.sh web          # chỉ xem log website
#
#  Script TỰ LÀM:
#    1. Kiểm tra Node.js ≥ 20
#    2. Bật Docker/PostgreSQL và ĐỢI database sẵn sàng
#    3. Tự tạo/sửa backend/.env (sinh khoá bí mật nếu thiếu)
#    4. Cài thư viện nếu chưa có
#    5. Tạo bảng + dữ liệu mẫu nếu database trống
#    6. Dọn tiến trình cũ đang giữ cổng 3000/4000 (chỉ tiến trình của dự án)
#    7. Chạy API + website, ĐỢI tới khi cả hai trả HTTP 200
#    8. Mở thử các TRANG CHÍNH (/, /products, /login, /admin) cho chắc
#    9. Nếu có server không lên: IN RA 25 DÒNG LOG CUỐI của server đó
# ==============================================================================

set -u

# Chế độ: dev (mặc định) hoặc prod
MODE="dev"
MODE_EP_BUOC=0
case "${1:-}" in
  prod|production|--prod|-p) MODE="prod" ;;
  dev|development)           MODE="dev"; MODE_EP_BUOC=1 ;;   # ép chạy dev, kể cả máy yếu RAM
  "")                        MODE="dev" ;;
  *) echo "Tham số không hiểu: $1   (dùng: bash start-all.sh  |  bash start-all.sh prod  |  bash start-all.sh dev)"; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || exit 1

BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
LOGS="$ROOT/logs"
RUN="$ROOT/.run"
API_URL="http://127.0.0.1:4000/api/v1/health"
WEB_URL="http://127.0.0.1:3000/"
API_PORT=4000
WEB_PORT=3000

mkdir -p "$LOGS" "$RUN"

if [ -t 1 ]; then
  G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; B=$'\033[1m'; D=$'\033[2m'; C=$'\033[36m'; N=$'\033[0m'
else
  G=''; Y=''; R=''; B=''; D=''; C=''; N=''
fi

step()  { printf '\n%s▸ %s%s\n' "$B" "$1" "$N"; }
ok()    { printf '  %s[OK]%s %s\n' "$G" "$N" "$1"; }
warn()  { printf '  %s[ !]%s %s\n' "$Y" "$N" "$1"; }
bad()   { printf '  %s[ X]%s %s\n' "$R" "$N" "$1"; }
suggest(){ printf '      %s→ %s%s\n' "$C" "$1" "$N"; }

die() {
  printf '\n%s%s  ■ KHÔNG CHẠY ĐƯỢC%s\n\n' "$R" "$B" "$N"
  printf '  %b\n\n' "$1"          # %b: hiểu \n thành xuống dòng
  printf '  %sCần giúp? Chạy:  bash chan-doan.sh   rồi gửi file chan-doan-ket-qua.txt%s\n\n' "$D" "$N"
  exit 1
}

printf '\n%s  ShopVN — bật hệ thống%s\n' "$B" "$N"
printf '%s  Thư mục: %s%s\n' "$D" "$ROOT" "$N"

[ -d "$BACKEND" ] || die "Không thấy thư mục backend/ trong:\n  $ROOT\n  → Hãy chạy script này từ THƯ MỤC GỐC dự án (nơi có BAT-DAU-O-DAY.md)."

# ─────────────────────────────── công cụ ───────────────────────────────
port_pids() { # in ra các PID đang LISTEN ở cổng $1
  local port="$1" pids=""
  if command -v ss >/dev/null 2>&1; then
    pids="$(ss -ltnp 2>/dev/null | grep -E "[:.]$port[[:space:]]" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)"
  fi
  if [ -z "$pids" ] && command -v netstat >/dev/null 2>&1; then
    pids="$(netstat -ano 2>/dev/null | grep -E "LISTENING" | grep -E "[:.]$port[[:space:]]" | awk '{print $NF}' | grep -E '^[0-9]+$' | sort -u)"
  fi
  printf '%s\n' "$pids"
}

proc_cmd() { # cmdline của PID (nếu đọc được)
  ps -p "$1" -o args= 2>/dev/null | head -1
}

kill_pid() {   # giết CẢ CÂY tiến trình (npm -> sh -> node), không chỉ tiến trình cha
  local pid="$1"
  if command -v taskkill >/dev/null 2>&1; then
    taskkill //F //T //PID "$pid" >/dev/null 2>&1 || true
  fi
  pkill -9 -P "$pid" 2>/dev/null || true
  kill -9 -- "-$pid" 2>/dev/null || true
  kill -9 "$pid" 2>/dev/null || true
}

http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$1" 2>/dev/null || echo 000; }

tcp_check() { # $1=host $2=port  → 0 nếu kết nối được
  node -e "
    const net=require('net');const s=net.connect({host:'$1',port:$2});
    const done=v=>{s.destroy();process.exit(v?0:1)};
    s.setTimeout(2000);s.once('connect',()=>done(true));s.once('timeout',()=>done(false));s.once('error',()=>done(false));
  " >/dev/null 2>&1
}

wait_http() { # $1=url $2=số lần $3=nhãn
  local i=0
  while [ "$i" -lt "$2" ]; do
    [ "$(http_code "$1")" = "200" ] && return 0
    i=$((i + 1))
    printf '.'
    sleep 1.5
  done
  return 1
}

# ── Prisma Client: kiểm tra THẬT (không tin vào việc "file có tồn tại") ──
PRISMA_STUB_FILE="$BACKEND/node_modules/.prisma/client/index.js"
prisma_stub() {   # 0 = đang là bản GIẢ (chưa generate thật)
  local f
  for f in "$BACKEND/node_modules/.prisma/client/index.js" "$BACKEND/node_modules/.prisma/client/default.js"; do
    [ -f "$f" ] && grep -q "did not initialize yet" "$f" 2>/dev/null && return 0
  done
  return 1
}

prisma_works() {  # 0 = tạo được PrismaClient (dùng được thật)
  (cd "$BACKEND" && node -e "
    try { const { PrismaClient } = require('@prisma/client'); new PrismaClient(); process.exit(0); }
    catch (e) { process.exit(1); }
  " >/dev/null 2>&1)
}

ensure_prisma_client() {  # 0 = OK, 1 = không sửa được
  local f="$PRISMA_STUB_FILE" why=""
  if [ ! -f "$f" ]; then why="chưa generate lần nào"
  elif prisma_stub; then    why="file đang là BẢN GIẢ do npm tạo, chưa generate thật"
  elif ! prisma_works; then why="PrismaClient không khởi tạo được"
  elif [ "$BACKEND/prisma/schema.prisma" -nt "$f" ]; then why="schema.prisma mới hơn client đã generate"
  fi
  [ -z "$why" ] && return 0

  printf '  %sPrisma Client cần generate lại (%s)...%s\n' "$D" "$why" "$N"
  if ! (cd "$BACKEND" && npx prisma generate > "$LOGS/prisma-generate.log" 2>&1); then
    show_log_tail "$LOGS/prisma-generate.log" 25
    return 1
  fi
  prisma_stub && return 1
  prisma_works || return 1
  ok 'Đã generate Prisma Client'
  return 0
}

show_log_tail() { # $1=file $2=số dòng
  if [ -f "$1" ]; then
    printf '\n%s  ─── %s dòng cuối của %s ───%s\n' "$D" "$2" "$(basename "$1")" "$N"
    tail -n "$2" "$1" | sed 's/^/      /'
    printf '%s  ───────────────────────────────────────────%s\n' "$D" "$N"
  else
    warn "Chưa có file log: $1"
  fi
}

# ─────────────────────────── 1. Node.js ───────────────────────────
step '1/8  Kiểm tra Node.js'
if ! command -v node >/dev/null 2>&1; then
  die "Chưa cài Node.js.\n  → Tải bản LTS: https://nodejs.org  (rồi MỞ LẠI Git Bash sau khi cài)"
fi
NODE_V="$(node -v | tr -d 'v')"
if [ "${NODE_V%%.*}" -lt 20 ]; then
  die "Node.js v$NODE_V quá cũ — cần ≥ 20 LTS.\n  → Tải bản mới: https://nodejs.org"
fi
ok "Node.js v$NODE_V"

# RAM (dùng để TỰ BẢO VỆ chế độ chạy — xem ngay bên dưới)
MEM_MB=0; MEM_TOTAL=0
if [ -r /proc/meminfo ]; then
  MEM_MB="$(awk '/^MemAvailable:/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)"
  MEM_TOTAL="$(awk '/^MemTotal:/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)"
fi
[ -n "${MEM_MB:-}" ] || MEM_MB=0
[ -n "${MEM_TOTAL:-}" ] || MEM_TOTAL=0

# TỰ BẢO VỆ: máy quá ít RAM mà chạy chế độ dev thì Next.js dễ bị hệ điều hành
# tắt giữa chừng lúc biên dịch nhiều trang ⇒ tự chuyển sang chế độ production.
if [ "$MODE" = "dev" ] && [ "$MODE_EP_BUOC" = "0" ] && [ "$MEM_TOTAL" -gt 0 ] 2>/dev/null; then
  if [ "$MEM_TOTAL" -le 3000 ] || { [ "$MEM_MB" -gt 0 ] && [ "$MEM_MB" -lt 900 ]; }; then
    MODE="prod"
    warn "Máy chỉ có ${MEM_TOTAL} MB RAM (trống ~${MEM_MB} MB) — tự chuyển sang chế độ PRODUCTION"
    suggest 'Chế độ này nhẹ RAM, mở trang ~10 ms, không bị tắt giữa chừng.'
    suggest 'Muốn chạy chế độ dev (hot-reload) thì đóng bớt ứng dụng rồi gõ:  bash start-all.sh dev'
    sleep 2
  else
    ok "RAM: ${MEM_TOTAL} MB (trống ~${MEM_MB} MB)"
  fi
elif [ "$MEM_TOTAL" -gt 0 ] 2>/dev/null; then
  ok "RAM: ${MEM_TOTAL} MB (trống ~${MEM_MB} MB)"
fi

if [ "$MODE" = "prod" ]; then
  printf '  %sChế độ chạy: PRODUCTION — nhẹ RAM, mượt, tự build rồi chạy%s\n' "$D" "$N"
else
  printf '  %sChế độ chạy: DEV — có hot-reload khi sửa code (muốn nhẹ hơn: bash start-all.sh prod)%s\n' "$D" "$N"
fi

# ─────────────────────── 2. Database (Docker) ───────────────────────
step '2/8  Bật database (PostgreSQL)'
DB_HOST=127.0.0.1
DB_PORT=5432
if [ -f "$BACKEND/.env" ]; then
  DURL="$(grep -E '^DATABASE_URL=' "$BACKEND/.env" | head -1 | cut -d= -f2-)"
  case "$DURL" in
    *@*) HOSTPART="${DURL#*@}"; DB_HOST="${HOSTPART%%:*}"; DB_PORT="${HOSTPART#*:}"; DB_PORT="${DB_PORT%%/*}";;
  esac
  [ "$DB_HOST" = "localhost" ] && DB_HOST=127.0.0.1
fi
[ -n "${DB_PORT:-}" ] || DB_PORT=5432

if tcp_check "$DB_HOST" "$DB_PORT"; then
  ok "PostgreSQL đang chạy tại $DB_HOST:$DB_PORT"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  printf '  %sKhởi động Docker container...%s\n' "$D" "$N"
  docker compose up -d >/dev/null 2>&1 || true
  printf '  Đang đợi database sẵn sàng'
  READY=0
  for i in $(seq 1 30); do
    if tcp_check "$DB_HOST" "$DB_PORT"; then READY=1; break; fi
    printf '.'; sleep 2
  done
  printf '\n'
  if [ "$READY" = "1" ]; then
    ok "PostgreSQL sẵn sàng tại $DB_HOST:$DB_PORT"
  else
    die "Docker đã chạy nhưng PostgreSQL chưa mở cổng $DB_PORT sau 60 giây.\n  → Xem log container:  docker compose logs postgres\n  → Hoặc kiểm tra Docker Desktop đã hiện \"Engine running\" chưa."
  fi
elif command -v docker >/dev/null 2>&1; then
  die "Docker đã cài nhưng CHƯA CHẠY.\n  → Mở Docker Desktop, đợi góc dưới trái hiện \"Engine running\", rồi chạy lại:  bash start-all.sh"
else
  die "Không kết nối được PostgreSQL ở $DB_HOST:$DB_PORT và cũng không thấy Docker.\n  → Cài Docker Desktop: https://www.docker.com/products/docker-desktop/\n  → Hoặc bật PostgreSQL cài sẵn trên máy rồi chạy lại."
fi

# ───────────────────── 3. .env + khoá bí mật ─────────────────────
step '3/8  Cấu hình backend/.env'
if [ ! -f "$ROOT/.env.example" ]; then
  die "Không thấy file .env.example trong:\n  $ROOT\n  → Bạn đang dùng gói cũ. Tải lại zip mới nhất rồi giải nén đè."
fi
if node "$BACKEND/scripts/bootstrap-env.mjs"; then
  ok "backend/.env đã sẵn sàng"
else
  die "Không chuẩn hoá được backend/.env.\n  → Chạy tay để xem lỗi:  cd backend && node scripts/bootstrap-env.mjs"
fi

# ──────────────────────── 4. Thư viện ────────────────────────
step '4/8  Thư viện (npm install nếu thiếu)'
install_if_needed() { # $1=tên $2=thư mục
  if [ -d "$2/node_modules" ]; then
    ok "$1: đã có node_modules"
  else
    printf '  %sĐang cài thư viện %s (1–3 phút)...%s\n' "$D" "$1" "$N"
    if (cd "$2" && npm install --no-audit --no-fund > "$LOGS/install-$1.log" 2>&1); then
      ok "$1: cài xong"
    else
      show_log_tail "$LOGS/install-$1.log" 25
      die "npm install ($1) thất bại.\n  → Xem log đầy đủ:  $LOGS/install-$1.log\n  → Thường do mạng: thử lại, hoặc kiểm tra proxy/VPN."
    fi
  fi
}
install_if_needed backend "$BACKEND"
install_if_needed frontend "$FRONTEND"

# ──────────────── 5. Bảng + dữ liệu mẫu ────────────────
step '5/8  Database: bảng + dữ liệu mẫu'
ensure_prisma_client || die "Không dùng được Prisma Client (backend/node_modules/.prisma/client).\n  → Chạy tay để xem lỗi thật:  cd backend && npx prisma generate\n  → Log đầy đủ:  $LOGS/prisma-generate.log\n  → Gợi ý: xoá backend/node_modules rồi chạy lại:  cd backend && npm install"

(cd "$BACKEND" && npx prisma migrate deploy > "$LOGS/prisma-migrate.log" 2>&1) || {
  show_log_tail "$LOGS/prisma-migrate.log" 25
  die "Không tạo được bảng trong database (migrate thất bại).\n  → Kiểm tra DATABASE_URL trong backend/.env có đúng user/pass/cổng không."
}
(cd "$BACKEND" && npm run db:extensions > "$LOGS/db-extensions.log" 2>&1) || warn 'Không bật được extension tiếng Việt (tìm kiếm không dấu sẽ kém chính xác hơn)'
ok 'Đã áp dụng cấu trúc bảng'

db_check_code() { node "$BACKEND/scripts/db-check.mjs" >/dev/null 2>&1; echo $?; }
CODE="$(db_check_code)"
if [ "$CODE" = "2" ]; then
  # Prisma/DB không dùng được dù client đã generate → thử generate lại 1 lần rồi kiểm tra tiếp
  printf '  %sPrisma chưa kết nối được — thử generate lại...%s\n' "$D" "$N"
  (cd "$BACKEND" && npx prisma generate > "$LOGS/prisma-generate.log" 2>&1) || true
  CODE="$(db_check_code)"
fi

if [ "$CODE" = "0" ]; then
  ok 'Database đã có dữ liệu mẫu'
elif [ "$CODE" = "3" ]; then
  printf '  %sDatabase trống → nạp dữ liệu mẫu...%s\n' "$D" "$N"
  SEED_OK=0
  (cd "$BACKEND" && npm run seed > "$LOGS/seed.log" 2>&1) && SEED_OK=1
  if [ "$SEED_OK" = "0" ] && grep -q "did not initialize yet" "$LOGS/seed.log" 2>/dev/null; then
    printf '  %sPrisma Client là bản giả → generate rồi nạp lại...%s\n' "$D" "$N"
    if ensure_prisma_client && (cd "$BACKEND" && npm run seed > "$LOGS/seed.log" 2>&1); then SEED_OK=1; fi
  fi
  if [ "$SEED_OK" = "1" ]; then
    ok 'Đã nạp dữ liệu mẫu (20 sản phẩm, 24 đơn hàng, 2 tài khoản demo)'
  else
    show_log_tail "$LOGS/seed.log" 20
    warn 'Nạp dữ liệu mẫu thất bại — web vẫn chạy nhưng sẽ trống dữ liệu.'
    suggest 'Chạy tay để xem lỗi:  cd backend && npm run seed'
  fi
else
  show_log_tail "$LOGS/prisma-migrate.log" 15
  warn 'Không kiểm tra được database (Prisma báo lỗi) — xem log migrate ở trên.'
  suggest 'Chạy tay:  cd backend && npx prisma generate && npx prisma migrate deploy && npm run seed'
fi

# ─────────── 6. Dọn tiến trình cũ giữ cổng ───────────
step '6/8  Cổng 3000 / 4000'
free_port() { # $1=port $2=tên $3=pidfile
  local port="$1" name="$2" pidfile="$3" pid cmd killed=0
  if [ -f "$pidfile" ]; then
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      kill_pid "$pid"; killed=1; ok "Đã tắt $name cũ (PID $pid)"
    fi
    rm -f "$pidfile"
  fi
  for pid in $(port_pids "$port"); do
    [ -z "$pid" ] && continue
    cmd="$(proc_cmd "$pid")"
    case "$cmd" in
      *"next"*|*"tsx"*|*"node"*)
        kill_pid "$pid"; killed=1; ok "Đã giải phóng cổng $port (PID $pid — $name cũ còn chạy)";;
      *)
        die "Cổng $port đang bị một chương trình KHÁC chiếm (PID $pid).\n  → Đóng chương trình đó, hoặc chạy:  bash chan-doan.sh  để xem chi tiết.\n  → (Script không tự tắt tiến trình lạ để tránh làm hỏng việc khác của bạn.)";;
    esac
  done
  [ "$killed" = "1" ] && sleep 2
  return 0
}
free_port "$API_PORT" 'API' "$RUN/api.pid"
free_port "$WEB_PORT" 'website' "$RUN/web.pid"
ok 'Cả 2 cổng đang trống'

# ─────────────────────── 7. Chạy server ───────────────────────
step '7/8  Chạy API + website'
: > "$LOGS/api.log"
: > "$LOGS/web.log"
rm -f "$RUN/api.pid" "$RUN/web.pid"

# Chế độ PRODUCTION: build website trước (chỉ build lại khi mã nguồn đổi)
WEB_START_CMD='npm run dev'
if [ "$MODE" = "prod" ]; then
  BUILD_ID="$FRONTEND/.next/BUILD_ID"
  NEED_BUILD=1
  if [ -f "$BUILD_ID" ]; then
    if [ -z "$(find "$FRONTEND/src" "$FRONTEND/public" -type f -newer "$BUILD_ID" 2>/dev/null | head -1)" ]; then
      NEED_BUILD=0
    fi
  fi
  if [ "$NEED_BUILD" = "1" ]; then
    printf '  %sĐang build website cho chế độ production (1–3 phút)...%s\n' "$D" "$N"
    if (cd "$FRONTEND" && NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}" npm run build > "$LOGS/build-web.log" 2>&1); then
      ok 'Build website xong'
    else
      show_log_tail "$LOGS/build-web.log" 25
      die "Build website thất bại.\n  → Xem log đầy đủ:  $LOGS/build-web.log\n  → Chạy chế độ dev để xem lỗi nhanh hơn:  bash start-all.sh"
    fi
  else
    ok 'Website đã build sẵn (mã nguồn không đổi) — dùng lại bản cũ'
  fi
  WEB_START_CMD='npm start'
fi

# setsid (nếu có) tách mỗi server thành NHÓM tiến trình riêng ⇒ tắt là tắt sạch cả cây
SETSID=""; command -v setsid >/dev/null 2>&1 && SETSID="setsid"
( cd "$BACKEND" && nohup $SETSID npm run dev < /dev/null > "$LOGS/api.log" 2>&1 & echo $! > "$RUN/api.pid" ) 2>/dev/null
( cd "$FRONTEND" && nohup $SETSID $WEB_START_CMD < /dev/null > "$LOGS/web.log" 2>&1 & echo $! > "$RUN/web.pid" ) 2>/dev/null
disown -a 2>/dev/null || true
ok "Đã khởi động (API PID $(cat "$RUN/api.pid" 2>/dev/null || echo '?') · WEB PID $(cat "$RUN/web.pid" 2>/dev/null || echo '?'))"

printf '  Đang đợi API (:4000)'
API_OK=0; wait_http "$API_URL" 40 && API_OK=1
printf '\n'
if [ "$MODE" = "prod" ]; then
  printf '  Đang đợi website (:3000)'
  WEB_TRIES=30
else
  printf '  Đang đợi website (:3000 — lần đầu Next.js phải biên dịch)'
  WEB_TRIES=60
fi
WEB_OK=0; wait_http "$WEB_URL" "$WEB_TRIES" && WEB_OK=1
printf '\n'

if [ "$API_OK" = "1" ]; then ok "API       → $API_URL trả 200"; else bad "API       → không phản hồi sau ~80 giây"; fi
if [ "$WEB_OK" = "1" ]; then
  ok "Website   → http://localhost:3000 trả 200"
elif [ "$MODE" = "prod" ]; then
  bad "Website   → không phản hồi sau ~60 giây"
else
  bad "Website   → không phản hồi sau ~120 giây"
fi

# ─────────── 8. Mở thử các trang chính (lần đầu Next.js phải biên dịch) ───────────
PAGES_OK=1
if [ "$WEB_OK" = "1" ]; then
  if [ "$MODE" = "prod" ]; then
    step '8/8  Mở thử các trang chính'
  else
    step '8/8  Mở thử các trang chính (lần đầu hơi lâu — Next.js đang biên dịch)'
    printf '  %sMỗi trang có thể mất 5–30 giây ở lần đầu.%s\n' "$D" "$N"
  fi
  for PAGE in / /products /login /admin; do
    [ -t 1 ] && printf '  Đang mở %-12s' "$PAGE"
    CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 120 "http://localhost:3000$PAGE" 2>/dev/null || echo 000)"
    [ -t 1 ] && printf '\r'
    if [ "$CODE" = "200" ]; then
      printf '  %s[OK]%s Trang %-12s → 200%s\n' "$G" "$N" "$PAGE" "$N"
    else
      PAGES_OK=0
      printf '  %s[ X]%s Trang %-12s → %s%s\n' "$R" "$N" "$PAGE" "$CODE" "$N"
      # web có thể đã bị tắt do hết RAM khi biên dịch trang nặng
      if [ ! -s "$RUN/web.pid" ] || ! kill -0 "$(cat "$RUN/web.pid" 2>/dev/null || echo 0)" 2>/dev/null; then
        warn 'Tiến trình website KHÔNG còn chạy (thường do hết RAM khi biên dịch).'
        warn 'Cách xử lý: đóng bớt Chrome/Docker, rồi chạy lại:  bash start-all.sh'
        break
      fi
    fi
  done
fi

# ─────────────────────── Kết quả ───────────────────────
if [ "$API_OK" = "1" ] && [ "$WEB_OK" = "1" ]; then
  cat <<EOF

$G$B════════════════════════════════════════════════════════════$N
$G$B  ✅ CHẠY ĐƯỢC — mở trình duyệt:  http://localhost:3000$N
$G$B════════════════════════════════════════════════════════════$N

  Chế độ:     ${C}$MODE$N$([ "$MODE" = "prod" ] && [ "$MODE_EP_BUOC" = "0" ] && [ "$MEM_TOTAL" -le 3000 ] 2>/dev/null && printf '  (tự chọn vì máy ít RAM — muốn dev: bash start-all.sh dev)' || true)

  API / Swagger   http://localhost:4000/api/v1     ·  http://localhost:4000/api/docs
  pgAdmin         http://localhost:5050            ${D}(admin@shop.vn / admin)$N

  Đăng nhập:  ${C}customer@shop.vn / Customer@123456$N   (khách hàng)
              ${C}admin@shop.vn    / Admin@123456$N      (quản trị → /admin)

  Xem log:    ${C}bash xem-log.sh$N        (Ctrl+C để thoát)
  Tắt hết:    ${C}bash stop-all.sh$N

EOF
  if [ "$PAGES_OK" != "1" ]; then
    printf '  %s[ !]%s Có trang chưa mở được ngay ở lần đầu (xem dòng [ X] phía trên).\n' "$Y" "$N"
    printf '      Thường chỉ là Next.js còn đang biên dịch — chờ ~15 giây rồi F5 lại trên trình duyệt.\n'
    printf '      Nếu vẫn trắng:  bash xem-log.sh web\n\n'
  fi
  exit 0
fi

# ─────────────────────── Có lỗi: chỉ rõ ───────────────────────
printf '\n%s%s  ■ CÓ SERVER KHÔNG LÊN ĐƯỢC%s\n' "$R" "$B" "$N"

if [ "$API_OK" != "1" ]; then
  show_log_tail "$LOGS/api.log" 25
  printf '\n  %sCách đọc: tìm dòng có chữ "Error" hoặc "✖" — thường gặp:%s\n' "$D" "$N"
  printf '    · "Can'"'"'t reach database server"  → database chưa lên: nháy đúp db-start.cmd\n'
  printf '    · "EADDRINUSE"                       → cổng 4000 bị chiếm: bash stop-all.sh rồi chạy lại\n'
  printf '    · "Biến môi trường không hợp lệ"     → .env sai: cd backend && node scripts/bootstrap-env.mjs\n'
fi

if [ "$WEB_OK" != "1" ]; then
  show_log_tail "$LOGS/web.log" 25
  printf '\n  %sCách đọc: tìm dòng "Error" — thường gặp:%s\n' "$D" "$N"
  printf '    · "Port 3000 is in use"              → bash stop-all.sh rồi chạy lại\n'
  printf '    · "Cannot find module"               → thiếu thư viện: cd frontend && npm install\n'
fi

printf '\n  %sCần tớ xem giúp? Chạy:  bash chan-doan.sh  → gửi file chan-doan-ket-qua.txt%s\n' "$D" "$N"
printf '  %sHoặc gửi 2 file log:  logs/api.log  và  logs/web.log%s\n\n' "$D" "$N"
exit 1
