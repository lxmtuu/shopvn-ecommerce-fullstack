@echo off
REM ShopVN - tu kiem tra toan he thong (API + 14 trang web)
chcp 65001 >nul
cd /d "%~dp0"
node backend\scripts\kiem-tra.mjs
echo.
pause
