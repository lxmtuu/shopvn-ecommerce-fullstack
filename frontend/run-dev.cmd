@echo off
REM ===========================================================================
REM  ShopVN - chay server cho rieng thu muc nay (backend HOAC frontend)
REM  Double-click file nay cung chay duoc - cua so se giu lai de ban doc log.
REM ===========================================================================
chcp 65001 >nul
cd /d "%~dp0"
title ShopVN - %CD%
call npm run dev
echo.
echo   Server da dung. Nhan phim bat ky de dong cua so nay.
pause >nul
