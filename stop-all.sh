#!/usr/bin/env bash
# ==============================================================================
#  ShopVN — TẮT API + WEBSITE (database vẫn chạy, dữ liệu vẫn còn)
#      bash stop-all.sh
# ==============================================================================
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN="$ROOT/.run"
LOGS="$ROOT/logs"

if [ -t 1 ]; then G=$'\033[32m'; Y=$'\033[33m'; D=$'\033[2m'; B=$'\033[1m'; N=$'\033[0m'; else G=''; Y=''; D=''; B=''; N=''; fi
ok()   { printf '  %s[OK]%s %s\n' "$G" "$N" "$1"; }
warn() { printf '  %s[ !]%s %s\n' "$Y" "$N" "$1"; }

kill_pid() {   # giết CẢ CÂY tiến trình (npm -> sh -> node), không chỉ tiến trình cha
  local pid="$1"
  if command -v taskkill >/dev/null 2>&1; then
    taskkill //F //T //PID "$pid" >/dev/null 2>&1 || true      # Windows: cả cây
  fi
  pkill -9 -P "$pid" 2>/dev/null || true                        # con trực tiếp
  kill -9 -- "-$pid" 2>/dev/null || true                        # cả nhóm tiến trình (nhờ setsid)
  kill -9 "$pid" 2>/dev/null || true
}

kill_project_stragglers() {   # dọn tiến trình MỒ CÔI còn sót của CHÍNH dự án này
  local pid cmd me=$$
  for pid in $(ps -eo pid=,args= 2>/dev/null | grep -F "$ROOT" |
               grep -E "node|npm|tsx|next" | grep -v grep | awk '{print $1}'); do
    [ "$pid" = "$me" ] && continue
    cmd="$(ps -p "$pid" -o args= 2>/dev/null)"
    case "$cmd" in
      *stop-all*|*start-all*|*xem-log*|*kiem-tra*|*chan-doan*|*doctor*) continue;;
    esac
    kill -9 "$pid" 2>/dev/null && STRAGGLERS=$((STRAGGLERS + 1))
  done
}

port_pids() {
  local port="$1" pids=""
  if command -v ss >/dev/null 2>&1; then
    pids="$(ss -ltnp 2>/dev/null | grep -E "[:.]$port[[:space:]]" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)"
  fi
  if [ -z "$pids" ] && command -v netstat >/dev/null 2>&1; then
    pids="$(netstat -ano 2>/dev/null | grep LISTENING | grep -E "[:.]$port[[:space:]]" | awk '{print $NF}' | grep -E '^[0-9]+$' | sort -u)"
  fi
  printf '%s\n' "$pids"
}

printf '\n%s  ShopVN — tắt hệ thống%s\n' "$B" "$N"

for name in api web; do
  f="$RUN/$name.pid"
  if [ -f "$f" ]; then
    pid="$(cat "$f" 2>/dev/null || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      kill_pid "$pid"
      ok "Đã tắt $name (PID $pid)"
    else
      warn "$name không còn chạy (PID cũ: ${pid:-?})"
    fi
    rm -f "$f"
  fi
done

STRAGGLERS=0
kill_project_stragglers
[ "$STRAGGLERS" -gt 0 ] && ok "Đã dọn $STRAGGLERS tiến trình mồ côi của dự án"
sleep 1

# Giải phóng cổng — thử tối đa 3 lần (có tiến trình mồ côi giữ cổng thì lần sau bắt được)
for pair in "3000:website" "4000:API"; do
  port="${pair%%:*}"; label="${pair##*:}"
  for attempt in 1 2 3; do
    pids="$(port_pids "$port")"
    [ -z "$pids" ] && break
    for pid in $pids; do
      kill_pid "$pid"
      ok "Đã giải phóng cổng $port (PID $pid — $label)"
    done
    sleep 1
  done
done

# Báo rõ nếu cổng vẫn còn bị giữ (để người dùng không bị "lỗi im lặng")
for pair in "3000:website" "4000:API"; do
  port="${pair%%:*}"; label="${pair##*:}"
  if [ -n "$(port_pids "$port")" ]; then
    warn "Cổng $port vẫn còn bị giữ (không phải dự án này) — $label"
    warn "Chạy:  bash chan-doan.sh  để xem chi tiết, hoặc khởi động lại máy."
  fi
done

printf '\n  %sDatabase vẫn đang chạy. Muốn tắt luôn:  docker compose stop%s\n' "$D" "$N"
printf '  %sBật lại:  bash start-all.sh%s\n\n' "$D" "$N"
