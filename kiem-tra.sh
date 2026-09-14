#!/usr/bin/env bash
# ============================================================================
#  ShopVN — TỰ KIỂM TRA TOÀN HỆ THỐNG (API + database + phân quyền + 14 trang web)
#  Cách dùng:   bash kiem-tra.sh          (chạy sau khi đã: bash start-all.sh)
# ============================================================================
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Chưa cài Node.js — tải tại https://nodejs.org"
  exit 1
fi
node backend/scripts/kiem-tra.mjs
