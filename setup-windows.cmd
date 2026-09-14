@echo off
REM ===========================================================================
REM  ShopVN - chay script cai dat tu dong (Windows + Docker)
REM  Nhay dup file nay, hoac go lenh: setup-windows.cmd
REM ===========================================================================
setlocal
cd /d "%~dp0"

echo.
echo   Dang chay ShopVN setup...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-windows.ps1"

echo.
echo   (Cua so nay se khong tu dong dong lai de ban doc ket qua)
echo.
pause
