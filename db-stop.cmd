@echo off
REM ===========================================================================
REM  ShopVN - tat database (du lieu VAN CON, khong bi xoa)
REM  Muon xoa sach du lieu:  docker compose down -v   (canh bao: mat het du lieu)
REM ===========================================================================
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   Dang tat PostgreSQL + Redis + pgAdmin...
docker compose stop
echo.
echo   Da tat. Du lieu van duoc giu trong Docker volume.
echo   Bat lai bang: db-start.cmd
echo.
pause
