#!/usr/bin/env bash
# ==============================================================================
#  ShopVN — CHẨN ĐOÁN: "mở web không lên"
#  Dùng cho Git Bash / WSL / macOS / Linux.  Trên Windows cứ nháy đúp chan-doan.cmd
#
#      bash chan-doan.sh
#
#  Kết quả in ra màn hình VÀ lưu vào: chan-doan-ket-qua.txt
#  → mở file đó, copy toàn bộ nội dung gửi vào khung chat để được giúp.
# ==============================================================================
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || exit 1
OUT="$ROOT/chan-doan-ket-qua.txt"
LOG=()

say()  { LOG+=("$1"); }
run()  { # $1 = mô tả, $2.. = lệnh
  local desc="$1"; shift
  say ""
  say "  \$ $*"
  local out
  if out="$("$@" 2>&1)"; then
    while IFS= read -r line; do say "    $line"; done <<< "$out"
  else
    local code=$?
    while IFS= read -r line; do say "    $line"; done <<< "$out"
    say "    (mã thoát $code)"
  fi
}
probe() { # $1 = tên, $2 = url
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$2" 2>/dev/null)"
  [ -z "$code" ] && code="000"
  if [ "$code" = "200" ]; then say "  [OK] $1 → HTTP $code"
  elif [ "$code" = "000" ]; then say "  [ X] $1 → không kết nối được (server chưa chạy)"
  else say "  [ !] $1 → HTTP $code"; fi
}
ports() {
  local out=""
  if command -v ss >/dev/null 2>&1 && ss -ltn >/dev/null 2>&1; then
    out="$(ss -ltnp 2>/dev/null | grep -E ':3000|:4000' || true)"
  elif command -v netstat >/dev/null 2>&1; then
    out="$(netstat -ano 2>/dev/null | grep -E ':3000|:4000' | head -10 || true)"
  fi
  if [ -z "$out" ]; then
    say "    (không cổng nào 3000/4000 đang mở)"
  else
    say "    (cổng nào đang LISTENING thì server/tiến trình đó đang chạy)"
    while IFS= read -r l; do say "    $l"; done <<< "$out"
  fi
}

say "========================================================"
say "  ShopVN — KẾT QUẢ CHẨN ĐOÁN"
say "  Thời gian: $(date '+%d/%m/%Y %H:%M:%S')"
say "  Thư mục:   $ROOT"
say "  Hệ điều hành: $(uname -s -r 2>/dev/null || echo '?')"
say "========================================================"
say ""
say "--- 1. Phiên bản Node / npm / Docker -----------------------"
run "node" node -v
run "npm"  npm -v
run "docker" docker --version
run "docker compose" docker compose version
say ""
say "--- 2. Container Docker (phải thấy postgres \"healthy\") -----"
run "docker compose ps" docker compose ps
say ""
say "--- 3. Trạng thái dự án (.env, thư viện, DB, server) --------"
if [ -f "$ROOT/backend/scripts/doctor.mjs" ]; then
  say ""
  say "  \$ node backend/scripts/doctor.mjs"
  DOCTOR_OUT="$(node "$ROOT/backend/scripts/doctor.mjs" 2>&1)"
  while IFS= read -r line; do say "    $line"; done <<< "$DOCTOR_OUT"
  say "    (doctor kết thúc — nếu có dòng [ X] thì đó là việc cần sửa)"
else
  say "  [ X] Không thấy backend/scripts/doctor.mjs — bạn đang dùng gói cũ?"
fi
say ""
say "--- 4. Cổng 3000 / 4000 đang mở? --------------------------"
ports
say ""
say "--- 5. Thử kết nối trực tiếp -------------------------------"
probe "API  /api/v1/health" http://127.0.0.1:4000/api/v1/health
probe "WEB  /"              http://127.0.0.1:3000/
say ""
say "========================================================"
say "  Gợi ý đọc nhanh:"
say "   • Mục 1: docker lỗi 'command not found'   → mở Docker Desktop"
say "   • Mục 2: postgres KHÔNG 'healthy'         → docker compose logs postgres"
say "   • Mục 3: dòng [ X] nào thì làm theo dòng đó"
say "   • Mục 4: nếu cổng đang mở → tiến trình khác đang chiếm cổng"
say "   • Mục 5: 000 = server chưa chạy (bình thường nếu bạn chưa bật)"
say "========================================================"

printf '%s\n' "${LOG[@]}" | tee "$OUT"
echo
echo "  ============================================================"
echo "    Đã lưu kết quả vào: chan-doan-ket-qua.txt"
echo "    Mở file này, copy TOÀN BỘ nội dung rồi dán vào khung chat."
echo "    (hoặc gửi thẳng file chan-doan-ket-qua.txt)"
echo "  ============================================================"
echo
