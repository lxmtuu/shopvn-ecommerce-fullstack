@echo off
REM ===========================================================================
REM  ShopVN - CHAN DOAN: "web khong mo len"
REM  Chi can NHAP DUP file nay. Ket qua hien ra man hinh VA luu vao:
REM      chan-doan-ket-qua.txt
REM  -> mo file do, copy toan bo noi dung gui vao khung chat de duoc giup.
REM ===========================================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "OUT=%~dp0chan-doan-ket-qua.txt"

> "%OUT%" echo ========================================================
>>"%OUT%" echo   ShopVN - KET QUA CHAN DOAN
>>"%OUT%" echo   Thoi gian: %DATE% %TIME%
>>"%OUT%" echo   Thu muc: %CD%
>>"%OUT%" echo ========================================================
>>"%OUT%" echo.

>>"%OUT%" echo --- 1. Phien ban Node / npm / Docker -------------------------
node -v                       >>"%OUT%" 2>&1
npm -v                        >>"%OUT%" 2>&1
docker --version              >>"%OUT%" 2>&1
docker compose version        >>"%OUT%" 2>&1
>>"%OUT%" echo.

>>"%OUT%" echo --- 2. Container Docker (phai thay postgres "healthy") --------
docker compose ps             >>"%OUT%" 2>&1
>>"%OUT%" echo.

>>"%OUT%" echo --- 3. Trang thai du an (env, thu vien, DB, server) -----------
node "backend\scripts\doctor.mjs" >>"%OUT%" 2>&1
>>"%OUT%" echo.

>>"%OUT%" echo --- 4. Cong 3000 / 4000 dang duoc dung boi ai? --------------
netstat -ano | findstr ":3000" >>"%OUT%" 2>&1
netstat -ano | findstr ":4000" >>"%OUT%" 2>&1
>>"%OUT%" echo.

>>"%OUT%" echo --- 5. Thu ket noi truc tiep --------------------------------
curl -s -o NUL -w "API  /api/v1/health  -^> HTTP %%{http_code}\n" http://127.0.0.1:4000/api/v1/health >>"%OUT%" 2>&1
curl -s -o NUL -w "WEB  /                -^> HTTP %%{http_code}\n" http://127.0.0.1:3000/        >>"%OUT%" 2>&1
>>"%OUT%" echo.

>>"%OUT%" echo ========================================================
>>"%OUT%" echo   Goi y doc nhanh:
>>"%OUT%" echo     - Muc 1: docker bao loi "command not found"  -^> mo Docker Desktop
>>"%OUT%" echo     - Muc 2: postgres KHONG phai "healthy"       -^> docker compose logs postgres
>>"%OUT%" echo     - Muc 3: dong [ X] nao thi lam theo dong do
>>"%OUT%" echo     - Muc 4: co dong LISTENING  -^> cong dang bi chiem boi PID ghi ben phai
>>"%OUT%" echo     - Muc 5: 000 = khong ket noi duoc (server chua chay)
>>"%OUT%" echo ========================================================

type "%OUT%"

echo.
echo   ============================================================
echo     Da luu ket qua vao file:  chan-doan-ket-qua.txt
echo     Mo file nay, copy TOAN BO noi dung roi dan vao khung chat.
echo   ============================================================
echo.
pause
