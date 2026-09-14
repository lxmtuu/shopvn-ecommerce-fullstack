@echo off
REM ===========================================================================
REM  ShopVN - BAT TAT CA: database (Docker) + API + website
REM  Chi can NHAP DUP file nay.
REM
REM  Khac ban cu: kiem tra truoc (thu vien / Docker / cong dang dung),
REM  doi server THAT SU len roi moi mo trinh duyet.
REM ===========================================================================
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title ShopVN - Bat he thong

echo.
echo   ============================================================
echo     ShopVN - dang bat he thong...
echo   ============================================================
echo.

REM ---------------------------------------------------------------- 0. Thu vien
if not exist "%~dp0backend\node_modules" goto :need_setup
if not exist "%~dp0frontend\node_modules" goto :need_setup
if not exist "%~dp0backend\.env" goto :need_setup

REM ---------------------------------------------------------------- 1. Docker
echo   [1/4] Kiem tra Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo   [ X] Docker Desktop CHUA CHAY.
  echo.
  echo        Cach sua: mo Docker Desktop, doi goc duoi trai hien "Engine running",
  echo                  roi nhay dup lai file nay.
  echo.
  pause
  exit /b 1
)

REM ------------------------------------------------- 2. Cong dang bi chiem?
netstat -ano | findstr ":3000 " | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
  echo   [ !] Cong 3000 dang co tien trinh chiem - neu web khong len, xem: chan-doan.cmd
)
netstat -ano | findstr ":4000 " | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
  echo   [ !] Cong 4000 dang co tien trinh chiem - neu API khong len, xem: chan-doan.cmd
)

REM ---------------------------------------------------------------- 3. Database
echo   [2/4] Bat PostgreSQL + Redis + pgAdmin...
docker compose up -d >nul 2>&1
if errorlevel 1 (
  echo.
  echo   [ X] docker compose up that bai.
  echo        Thu chay tay de xem loi:   docker compose up -d
  echo.
  pause
  exit /b 1
)
docker compose ps --format "table {{.Name}}\t{{.State}}\t{{.Health}}" 2>nul
echo.

REM ---------------------------------------------------------------- 4. Servers
echo   [3/4] Mo 2 cua so server:
echo         - ShopVN API  ^(http://localhost:4000^)
echo         - ShopVN WEB  ^(http://localhost:3000^)
start "ShopVN API (4000)" "%~dp0backend\run-dev.cmd"
ping -n 4 127.0.0.1 >nul 2>&1
start "ShopVN WEB (3000)" "%~dp0frontend\run-dev.cmd"

REM --------------------------------------------------- Doi server that su len
set "HAVE_CURL="
where curl >nul 2>&1 && set "HAVE_CURL=1"

if not defined HAVE_CURL goto :no_curl

echo.
echo   [4/4] Dang doi server san sang (toi da ~60 giay)...

set "API_OK="
for /L %%i in (1,1,30) do (
  if not defined API_OK (
    curl -sf -o NUL --max-time 3 http://127.0.0.1:4000/api/v1/health >nul 2>&1 && set "API_OK=1"
    if not defined API_OK ping -n 3 127.0.0.1 >nul 2>&1
  )
)

set "WEB_OK="
for /L %%i in (1,1,30) do (
  if not defined WEB_OK (
    curl -sf -o NUL --max-time 3 http://127.0.0.1:3000/ >nul 2>&1 && set "WEB_OK=1"
    if not defined WEB_OK ping -n 3 127.0.0.1 >nul 2>&1
  )
)

echo.
if defined API_OK (echo   [OK] API   dang chay: http://localhost:4000/api/v1) else (echo   [ !] API   chua phan hoi - xem cua so "ShopVN API (4000)")
if defined WEB_OK (echo   [OK] WEB   dang chay: http://localhost:3000)       else (echo   [ !] WEB   chua phan hoi - xem cua so "ShopVN WEB (3000)")

if not defined WEB_OK goto :trouble
if not defined API_OK goto :trouble
goto :open

:no_curl
ping -n 20 127.0.0.1 >nul 2>&1
echo   [ !] Khong co curl de kiem tra tu dong - da doi 15 giay, thu mo trinh duyet.

:open
start "" "http://localhost:3000"
echo.
echo   ============================================================
echo     XONG
echo   ============================================================
echo.
echo   Website:  http://localhost:3000
echo   API:      http://localhost:4000/api/v1      Swagger: http://localhost:4000/api/docs
echo   pgAdmin:  http://localhost:5050             ^(admin@shop.vn / admin^)
echo.
echo   Dang nhap: customer@shop.vn / Customer@123456    ^(khach hang^)
echo              admin@shop.vn    / Admin@123456       ^(quan tri -^> /admin^)
echo.
echo   Tat server: dong 2 cua so "ShopVN API" va "ShopVN WEB".
echo               Tat database:  docker compose stop     ^(du lieu van con^)
echo.
pause
exit /b 0

:trouble
echo.
echo   ------------------------------------------------------------
echo     Server chua len duoc. Hai cua so vua mo dang chua thong bao loi.
echo.
echo     1. Doc dong cuoi trong cua so "ShopVN API" / "ShopVN WEB"
echo     2. Hoac nhay dup file  chan-doan.cmd  roi gui file ket qua
echo   ------------------------------------------------------------
echo.
pause
exit /b 1

:need_setup
echo.
echo   [ X] Chua cai dat xong (thieu node_modules hoac backend\.env).
echo.
echo        Hay chay truoc (chon 1):
echo          - Nhay dup file:  setup-windows.cmd
echo          - Hoac Git Bash:  bash setup-gitbash.sh
echo.
pause
exit /b 1
