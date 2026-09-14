<#
  ============================================================================
  ShopVN  -  Cai dat tu dong cho WINDOWS (dung Docker Desktop)
  ============================================================================
  CACH CHAY
    Cach A (khong can go lenh):  nhay dup file  setup-windows.cmd
    Cach B (Git Bash / MINGW64):  bash setup-gitbash.sh
    Cach C (PowerShell):
        powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-windows.ps1

  SCRIPT LAM 7 BUOC, TU DUNG NGAY KHI GAP LOI:
    1. Kiem tra Node.js >= 20
    2. Kiem tra Docker Desktop dang chay
    3. docker compose up -d  ->  PostgreSQL + Redis + pgAdmin, doi DB "healthy"
    4. Chuan hoa backend\.env (tao file + sinh khoa bi mat that)
    5. npm install cho backend va frontend
    6. npm run setup  (Prisma Client -> migrate -> extension -> seed)
    7. npm run doctor (quet lai toan bo moi truong)

  Chay lai nhieu lan cung an toan: KHONG ghi de khoa bi mat ban da tu dat.
  Chi tiet: xem file BAT-DAU-O-DAY.md
  ============================================================================
#>

# Console UTF-8 de hien tieng Viet trong log cua npm/next
try { & chcp.com 65001 > $null } catch { }
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$ErrorActionPreference = 'Continue'

$root     = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$backend  = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$envFile  = Join-Path $backend '.env'

function Step($t) { Write-Host ''; Write-Host "=== $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "  [OK] $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  [ !] $t" -ForegroundColor Yellow }
function Fail($t) { Write-Host "  [ X] $t" -ForegroundColor Red }
function Stop-Here($t) {
  Write-Host ''
  Fail $t
  Write-Host ''
  Write-Host '  Sua loi tren roi chay lai:  setup-windows.cmd' -ForegroundColor Yellow
  exit 1
}
function Test-Command($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

# Tren Windows co ca npm.cmd va npm.ps1 -> dung npm.cmd de khong bi Execution Policy chan
$npmCmd = 'npm.cmd'
if (-not (Test-Command 'npm.cmd')) { $npmCmd = 'npm' }

Write-Host ''
Write-Host '  ShopVN - cai dat tu dong (Windows + Docker)' -ForegroundColor White
Write-Host "  Thu muc: $root" -ForegroundColor DarkGray

if (-not (Test-Path $backend)) {
  Stop-Here "Khong thay thu muc backend\ trong: $root  ->  ban co dang chay script o thu muc goc du an khong?"
}

# ------------------------------ 1. Node.js ------------------------------
Step '1/7  Kiem tra Node.js'
if (-not (Test-Command 'node')) {
  Stop-Here 'Chua cai Node.js. Tai ban LTS tai https://nodejs.org roi chay lai (nho dong/mo lai cua so terminal).'
}
$nodeV = "$(& node -v 2>$null)".Trim()
$major = 0
try { $major = [int]($nodeV.TrimStart('v').Split('.')[0]) } catch { }
if ($major -lt 20) {
  Stop-Here "Node.js $nodeV qua cu - can >= 20 LTS. Tai ban moi tai https://nodejs.org"
}
Ok "Node.js $nodeV"

# ------------------------------ 2. Docker ------------------------------
Step '2/7  Kiem tra Docker Desktop'
if (-not (Test-Command 'docker')) {
  Stop-Here 'Chua cai Docker Desktop. Tai tai https://www.docker.com/products/docker-desktop/'
}
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Stop-Here 'Docker da cai nhung CHUA CHAY. Mo Docker Desktop, doi den khi goc duoi hien "Engine running" roi chay lai script.'
}

$composeV2 = $true
& docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
  if (Test-Command 'docker-compose') { $composeV2 = $false }
  else { Stop-Here 'Khong tim thay "docker compose". Hay cap nhat Docker Desktop len ban moi.' }
}
Ok 'Docker Desktop dang chay'

# --------------------------- 3. Bat database ---------------------------
Step '3/7  Khoi dong PostgreSQL + Redis + pgAdmin'
$portBusy = $false
try {
  if (Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue) { $portBusy = $true }
} catch { }
if ($portBusy) {
  Warn 'Cong 5432 dang bi chiem (co the ban da cai PostgreSQL truc tiep tren may).'
  Warn 'Neu docker bao "port is already allocated": dung PostgreSQL cu (Services -> PostgreSQL -> Stop) hoac doi port trong docker-compose.yml.'
}

Set-Location $root
if ($composeV2) { $composeArgs = @('compose', 'up', '-d') } else { $composeArgs = @('up', '-d') }
$composeOut = & docker @composeArgs 2>&1
$composeOut | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) {
  $text = "$composeOut"
  if ($text -match 'port is already allocated|address already in use|bind') {
    Stop-Here 'Cong 5432 bi chiem. Xem huong dan o dong [!] phia tren roi chay lai.'
  }
  Stop-Here 'docker compose up that bai. Xem log bang:  docker compose logs postgres'
}

Write-Host '  Dang doi PostgreSQL san sang' -NoNewline -ForegroundColor DarkGray
$healthy = $false
for ($i = 0; $i -lt 40; $i++) {
  $status = & docker inspect --format '{{.State.Health.Status}}' shopvn_postgres 2>$null
  if ("$status".Trim() -eq 'healthy') { $healthy = $true; break }
  Start-Sleep -Seconds 3
  Write-Host '.' -NoNewline -ForegroundColor DarkGray
}
Write-Host ''
if (-not $healthy) {
  Stop-Here 'PostgreSQL chua "healthy" sau 2 phut. Xem log:  docker compose logs postgres'
}
Ok 'PostgreSQL san sang tai 127.0.0.1:5432   (user/pass: postgres/postgres  -  DB: ecommerce)'
Ok 'pgAdmin: http://localhost:5050   (admin@shop.vn / admin)'

# ---------------------- 4. Tao .env + khoa bi mat ----------------------
Step '4/7  Chuan hoa backend\.env va sinh khoa bi mat'
Set-Location $backend
& node (Join-Path 'scripts' 'bootstrap-env.mjs')
if ($LASTEXITCODE -ne 0) {
  Stop-Here 'Khong chuan hoa duoc backend\.env. Thu chay tay:  cd backend  ->  node scripts/bootstrap-env.mjs'
}

# ---------------------------- 5. npm install ----------------------------
Step '5/7  Cai thu vien (npm install) - mat khoang 1-3 phut'
$installArgs = @('install', '--no-audit', '--no-fund')

Write-Host '  > backend ...' -ForegroundColor DarkGray
Set-Location $backend
& $npmCmd @installArgs
if ($LASTEXITCODE -ne 0) {
  Stop-Here 'npm install (backend) that bai. Thu xoa thu muc backend\node_modules roi chay lai, hoac kiem tra ket noi mang.'
}
Ok 'backend: xong'

Write-Host '  > frontend ...' -ForegroundColor DarkGray
Set-Location $frontend
& $npmCmd @installArgs
if ($LASTEXITCODE -ne 0) { Stop-Here 'npm install (frontend) that bai.' }
Ok 'frontend: xong'

# ------------------------ 6. Tao bang + du lieu ------------------------
Step '6/7  Tao bang trong database + nap du lieu mau'
Set-Location $backend
& $npmCmd run setup
if ($LASTEXITCODE -ne 0) {
  Stop-Here 'npm run setup that bai. Thu chay tay:  npm run prisma:generate   roi   npx prisma migrate deploy'
}
Ok 'Database da co bang + du lieu mau (20 san pham, 24 don hang, 2 tai khoan demo)'

# ------------------------------ 7. Doctor ------------------------------
Step '7/7  Kiem tra lai toan bo moi truong'
& $npmCmd run doctor
if ($LASTEXITCODE -ne 0) {
  Warn 'Doctor bao con muc chua dat - xem chi tiet o tren (thuong chi la canh bao ve SMTP/email, khong chan chay).'
  Warn 'Luu y: dong chu do "npm error code 1" ngay duoi chi la dau hieu "con viec can sua", KHONG phai script bi hong.'
}

# ------------------------------ Ket thuc ------------------------------
Set-Location $root
Write-Host ''
Write-Host '======================================================================' -ForegroundColor Green
Write-Host '  XONG! Cach bat website:' -ForegroundColor Green
Write-Host '======================================================================' -ForegroundColor Green
Write-Host ''
Write-Host '  NHANH NHAT: nhay dup file  start-all.cmd  (tu mo 2 cua so + trinh duyet)' -ForegroundColor White
Write-Host ''
Write-Host '  Hoac mo 2 terminal va chay:' -ForegroundColor White
Write-Host '      cd backend    ->  npm run dev      (API  : http://localhost:4000)' -ForegroundColor Gray
Write-Host '      cd frontend   ->  npm run dev      (Web  : http://localhost:3000)' -ForegroundColor Gray
Write-Host ''
Write-Host '  Dang nhap:  customer@shop.vn / Customer@123456    (khach hang)' -ForegroundColor Gray
Write-Host '              admin@shop.vn    / Admin@123456       (quan tri -> /admin)' -ForegroundColor Gray
Write-Host '  Swagger:    http://localhost:4000/api/docs' -ForegroundColor Gray
Write-Host '  pgAdmin:    http://localhost:5050    (admin@shop.vn / admin)' -ForegroundColor Gray
Write-Host ''

$startNow = $false
if (-not [Console]::IsInputRedirected) {
  $ans = Read-Host '  Bat server ngay bay gio? (y/N)'
  if ("$ans" -match '^\s*(y|yes|co|c)\s*$') { $startNow = $true }
}

if ($startNow) {
  $starter = Join-Path $root 'start-all.cmd'
  if (Test-Path $starter) {
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "`"$starter`""
    Ok 'Da mo 2 cua so server. Doi khoang 15 giay roi mo http://localhost:3000'
  } else {
    Warn 'Khong thay start-all.cmd - hay mo 2 terminal thu cong theo huong dan tren.'
  }
}
