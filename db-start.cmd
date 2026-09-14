@echo off
REM ===========================================================================
REM  ShopVN - chi bat database (PostgreSQL + Redis + pgAdmin) bang Docker
REM ===========================================================================
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   Dang bat PostgreSQL + Redis + pgAdmin...
docker compose up -d
echo.
docker compose ps
echo.
echo   PostgreSQL: 127.0.0.1:5432   (postgres/postgres - DB ecommerce)
echo   pgAdmin:    http://localhost:5050   (admin@shop.vn / admin)
echo.
pause
