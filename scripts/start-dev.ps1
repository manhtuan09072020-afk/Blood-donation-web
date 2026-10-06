# Chạy toàn bộ hệ thống ở chế độ phát triển: API (.NET) + Web (React/Vite) trong 2 cửa sổ riêng.
# Cách dùng:  powershell -ExecutionPolicy Bypass -File scripts\start-dev.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path $root "backend\HienMauAPI"
$web = Join-Path $root "web"

if (Get-Command sqllocaldb -ErrorAction SilentlyContinue) { sqllocaldb start MSSQLLocalDB | Out-Null }

Write-Host "Khởi động API tại http://localhost:5000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$api'; dotnet run --launch-profile http --urls http://0.0.0.0:5000"

if (-not (Test-Path (Join-Path $web "node_modules"))) {
    Write-Host "Cài đặt thư viện web (lần đầu)..." -ForegroundColor Cyan
    Push-Location $web; npm install; Pop-Location
}

Write-Host "Khởi động Web tại http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$web'; npm run dev"

Start-Sleep -Seconds 12
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Tài khoản demo (mật khẩu Hienmau@123): admin, nv.tiepnhan01, nv.sangloc01, nv.kho01, nguyenvana" -ForegroundColor Green
Write-Host "Swagger API: http://localhost:5000/swagger" -ForegroundColor Green
