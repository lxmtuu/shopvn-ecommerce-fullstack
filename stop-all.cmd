@echo off
REM ===========================================================================
REM  ShopVN - TAT API + WEBSITE (database van chay, du lieu van con)
REM  Nhay dup file nay, hoac chay: stop-all.cmd
REM ===========================================================================
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo   ShopVN - tat API + website
echo.

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do (
  echo   [OK] Tat tien trinh giu cong 3000 ^(PID %%p^)
  taskkill /F /T /PID %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4000 " ^| findstr LISTENING') do (
  echo   [OK] Tat tien trinh giu cong 4000 ^(PID %%p^)
  taskkill /F /T /PID %%p >nul 2>&1
)

REM Dong luon 2 cua so server neu con mo
taskkill /F /FI "WINDOWTITLE eq ShopVN API*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ShopVN WEB*" >nul 2>&1

echo.
echo   Xong. Database van dang chay. Muon tat luon:  docker compose stop
echo   Bat lai:  start-all.cmd
echo.
pause
