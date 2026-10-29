#!/usr/bin/env bash
# ==============================================================================
#  ShopVN — cài đặt tự động (Git Bash / WSL / macOS / Linux, dùng Docker)
# ==============================================================================
#  CÁCH CHẠY (từ thư mục gốc dự án, nơi có file này):
#      bash setup-gitbash.sh
#
#  Script làm 7 bước và DỪNG NGAY khi gặp lỗi:
#     1. Kiểm tra Node.js >= 20
#     2. Kiểm tra Docker đang chạy
#     3. docker compose up -d (PostgreSQL + Redis + pgAdmin) và đợi DB "healthy"
#     4. Tạo backend/.env + sinh 3 khoá bí mật ngẫu nhiên
#     5. npm install cho backend và frontend
#     6. prisma generate -> migrate deploy -> extension -> seed
#     7. Chạy npm run doctor nếu có (bản zip mới)
#
#  Chạy lại nhiều lần cũng an toàn: không ghi đè khoá bí mật bạn đã tự đặt.
# ==============================================================================

set -u

# ── Màu (tự tắt khi output bị pipe ra file) ──
if [ -t 1 ]; then
  G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; B=$'\033[1m'; D=$'\033[2m'; C=$'\033[36m'; N=$'\033[0m'
else
  G=''; Y=''; R=''; B=''; D=''; C=''; N=''
fi

step() { printf '\n%s=== %s%s\n' "$C" "$1" "$N"; }
ok()   { printf '  %s[OK]%s %s\n' "$G" "$N" "$1"; }
warn() { printf '  %s[ !]%s %s\n' "$Y" "$N" "$1"; }
die()  { printf '\n  %s[X]%s %s\n\n' "$R" "$N" "$1"; printf '  %sSửa lỗi trên rồi chạy lại:  bash setup-gitbash.sh%s\n\n' "$Y" "$N"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

printf '\n%s  ShopVN — cài đặt tự động%s\n' "$B" "$N"
printf '%s  Thư mục: %s%s\n' "$D" "$ROOT" "$N"

[ -d "$BACKEND" ] || die "Không thấy thư mục backend/ trong $ROOT — bạn có đang chạy script ở thư mục gốc dự án không?"

# ─────────────────────────── 1. Node.js ───────────────────────────
step "1/7  Kiểm tra Node.js"
if ! command -v node >/dev/null 2>&1; then
  die "Chưa cài Node.js. Tải bản LTS tại https://nodejs.org rồi chạy lại script."
fi
NODE_V="$(node -v | tr -d 'v')"
NODE_MAJOR="${NODE_V%%.*}"
if [ "$NODE_MAJOR" -lt 20 ]; then
  die "Node.js v$NODE_V quá cũ — cần >= 20 LTS (https://nodejs.org)."
fi
ok "Node.js v$NODE_V"

# ─────────────────────────── 2. Docker ───────────────────────────
step "2/7  Kiểm tra Docker"
if ! command -v docker >/dev/null 2>&1; then
  die "Chưa cài Docker. Tải Docker Desktop: https://www.docker.com/products/docker-desktop/"
fi
if ! docker info >/dev/null 2>&1; then
  die "Docker đã cài nhưng CHƯA CHẠY. Mở Docker Desktop, đợi chữ 'Engine running' rồi chạy lại script."
fi

COMPOSE=(docker compose)
if ! docker compose version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    die "Không tìm thấy 'docker compose'. Cập nhật Docker Desktop lên bản mới."
  fi
fi
ok "Docker đang chạy ($("${COMPOSE[@]}" version --short 2>/dev/null || echo 'docker-compose') )"

# ─────────────────────── 3. Bật database ───────────────────────
step "3/7  Khởi động PostgreSQL + Redis + pgAdmin"
cd "$ROOT" || die "Không cd được vào $ROOT"

if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ':5432 '; then
  warn "Cổng 5432 đang bị chiếm (có thể bạn đã cài PostgreSQL trực tiếp trên máy)."
  warn "Nếu docker báo 'port is already allocated': dừng PostgreSQL cũ, hoặc đổi mapping trong docker-compose.yml."
fi

COMPOSE_OUT="$("${COMPOSE[@]}" up -d 2>&1)"; COMPOSE_RC=$?
printf '%s\n' "$COMPOSE_OUT" | sed 's/^/  /'
if [ $COMPOSE_RC -ne 0 ]; then
  case "$COMPOSE_OUT" in
    *"port is already allocated"*|*"address already in use"*)
      die "Cổng 5432 bị chiếm. Dừng PostgreSQL cũ (Windows: Services -> PostgreSQL -> Stop) hoặc đổi ports trong docker-compose.yml." ;;
  esac
  die "docker compose up thất bại. Xem log:  docker compose logs postgres"
fi

printf '  %sĐang đợi PostgreSQL sẵn sàng%s' "$D" "$N"
HEALTHY=0
for _ in $(seq 1 40); do
  STATUS="$(docker inspect -f '{{.State.Health.Status}}' shopvn_postgres 2>/dev/null || echo '')"
  if [ "$STATUS" = "healthy" ]; then HEALTHY=1; break; fi
  printf '.'; sleep 3
done
printf '\n'
[ "$HEALTHY" -eq 1 ] || die "PostgreSQL chưa 'healthy' sau 2 phút. Xem log:  docker compose logs postgres"
ok "PostgreSQL sẵn sàng tại localhost:5432  (postgres/postgres — DB ecommerce)"
ok "pgAdmin: http://localhost:5050  (admin@shop.vn / admin)"

# ────────────────── 4. Tạo .env + khoá bí mật ──────────────────
step "4/7  Chuẩn hoá backend/.env và sinh khoá bí mật"
cd "$BACKEND" || die "Không cd được vào backend"
node scripts/bootstrap-env.mjs || die "Không chuẩn hoá được backend/.env. Chạy tay để xem lỗi:  cd backend && node scripts/bootstrap-env.mjs"

# frontend/.env.local — KHÔNG commit (đã gitignore) nên phải tạo tại đây.
# NEXT_PUBLIC_API_URL=/api/v1 ⇒ web gọi API qua proxy same-origin của Next,
# nhờ vậy cookie httpOnly + CSRF hoạt động và web chạy được trên mọi tên miền/cổng.
ENV_LOCAL="$FRONTEND/.env.local"
if [ -f "$ENV_LOCAL" ]; then
  ok "frontend/.env.local đã có — giữ nguyên"
else
  cat > "$ENV_LOCAL" <<'ENVEOF'
# ═══ ShopVN — cấu hình giao diện web ═══
# Gọi API qua proxy same-origin của Next (next.config.ts → API_PROXY_TARGET).
# KHÔNG đổi thành http://localhost:4000/api/v1 trừ khi bạn thật sự muốn gọi
# thẳng backend khác origin (sẽ dính CORS + không gửi được cookie).
NEXT_PUBLIC_API_URL=/api/v1
API_PROXY_TARGET=http://127.0.0.1:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=ShopVN
ENVEOF
  ok "Đã tạo frontend/.env.local (API qua proxy /api/v1)"
fi

# ─────────────────── 5. npm install ───────────────────
step "5/7  Cài thư viện (npm install) — mất khoảng 1–3 phút"
printf '  %s> backend ...%s\n' "$D" "$N"
cd "$BACKEND" && npm install --no-audit --no-fund || die "npm install (backend) thất bại. Thử xoá backend/node_modules rồi chạy lại."
ok "backend: xong"

printf '  %s> frontend ...%s\n' "$D" "$N"
cd "$FRONTEND" && npm install --no-audit --no-fund || die "npm install (frontend) thất bại."
ok "frontend: xong"

# ─────────────── 6. Tạo bảng + dữ liệu mẫu ───────────────
step "6/7  Tạo bảng trong database + nạp dữ liệu mẫu"
cd "$BACKEND" || die "Không cd được vào backend"
npx prisma generate || die "prisma generate thất bại"
npx prisma migrate deploy || die "prisma migrate deploy thất bại — kiểm tra DATABASE_URL và container postgres"
npm run db:extensions || die "Không bật được extension unaccent/pg_trgm"
npm run seed || die "Seed dữ liệu thất bại"
ok "Database đã có bảng + dữ liệu mẫu (20 sản phẩm, 24 đơn hàng, 2 tài khoản demo)"

# ─────────────── 7. Doctor (nếu bản zip có) ───────────────
step "7/7  Kiểm tra lại môi trường"
if node -e "const s=require('./package.json').scripts||{};process.exit(s.doctor?0:1)" 2>/dev/null; then
  npm run doctor || warn "Doctor còn mục chưa đạt — xem chi tiết phía trên (thường chỉ là cảnh báo email, không chặn chạy)."
else
  warn "Bản zip này chưa có 'npm run doctor' (không sao — đây chỉ là bước kiểm tra thêm)."
  printf '  %sKiểm tra nhanh thủ công:%s\n' "$D" "$N"
  docker compose ps --format '  {{.Name}}  {{.State}}  {{.Health}}' 2>/dev/null | sed 's/^/  /' || true
fi

# ─────────────────────── Kết thúc ───────────────────────
cd "$ROOT" || exit 0
cat <<EOF

$G$B======================================================================$N
$G$B  XONG! Mở website bằng 1 trong 2 cách:$N
$G$B======================================================================$N

  ${B}Cách nhanh (Windows):${N}  ${D}cmd //c start-all.cmd${N}   → tự mở 2 cửa sổ server + trình duyệt

  ${B}Hoặc 2 terminal:$N

  $B Terminal 1 — API:$N
$D      cd "$ROOT/backend"$N
$D      npm run dev$N

  $B Terminal 2 — Giao diện web:$N
$D      cd "$ROOT/frontend"$N
$D      npm run dev$N

  Mở:        ${C}http://localhost:3000$N
  Đăng nhập: customer@shop.vn / Customer@123456   (khách hàng)
             admin@shop.vn    / Admin@123456      (quản trị -> /admin)
  Swagger:   http://localhost:4000/api/docs
  pgAdmin:   http://localhost:5050

EOF
