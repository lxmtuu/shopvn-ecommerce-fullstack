#!/usr/bin/env bash
# ==============================================================================
#  ShopVN — XEM LOG ĐANG CHẠY
#      bash xem-log.sh          # xem cả API và website (Ctrl+C để thoát)
#      bash xem-log.sh api      # chỉ API
#      bash xem-log.sh web      # chỉ website
#      bash xem-log.sh loi      # chỉ in các dòng có lỗi
# ==============================================================================
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS="$ROOT/logs"
API="$LOGS/api.log"
WEB="$LOGS/web.log"
MODE="${1:-all}"

if [ -t 1 ]; then B=$'\033[1m'; D=$'\033[2m'; R=$'\033[31m'; G=$'\033[32m'; C=$'\033[36m'; N=$'\033[0m'; else B=''; D=''; R=''; G=''; C=''; N=''; fi

[ -f "$API" ] || { printf '  %s[ !]%s Chưa có %s — bạn đã chạy  bash start-all.sh  chưa?\n' "$R" "$N" "$API"; exit 1; }

case "$MODE" in
  loi|error)
    printf '%s  Các dòng có lỗi trong 2 log:%s\n\n' "$B" "$N"
    grep -inE 'error|✖|failed|exception|EADDRINUSE|cannot find|không hợp lệ' "$API" "$WEB" 2>/dev/null | tail -40 \
      | sed 's/^/  /' || printf '  %s(không thấy dòng lỗi nào — tốt!)%s\n' "$G" "$N"
    ;;
  api)
    printf '%s  Log API (%s) — Ctrl+C để thoát%s\n\n' "$B" "$API" "$N"
    tail -n 40 -f "$API"
    ;;
  web)
    printf '%s  Log website (%s) — Ctrl+C để thoát%s\n\n' "$B" "$WEB" "$N"
    tail -n 40 -f "$WEB"
    ;;
  *)
    printf '%s  Log API%s      %s%s%s\n' "$B" "$N" "$D" "$API" "$N"
    printf '%s  Log website%s  %s%s%s\n' "$B" "$N" "$D" "$WEB" "$N"
    printf '  %sCtrl+C để thoát. (Chỉ xem log API: bash xem-log.sh api)%s\n\n' "$D" "$N"
    printf '%s── API ────────────────────────────────────────%s\n' "$C" "$N"
    tail -n 15 "$API" 2>/dev/null | sed 's/^/  /'
    printf '\n%s── WEBSITE ────────────────────────────────────%s\n' "$C" "$N"
    tail -n 15 "$WEB" 2>/dev/null | sed 's/^/  /'
    printf '\n'
    tail -n 5 -f "$API" "$WEB"
    ;;
esac
