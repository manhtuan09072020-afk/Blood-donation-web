# Đóng gói bản triển khai: build web React -> nhúng vào API -> dotnet publish ra thư mục release\
# Sau khi đóng gói, chỉ cần chạy một tiến trình duy nhất phục vụ cả website và API:
#   release\HienMauAPI\HienMauAPI.exe --urls http://0.0.0.0:5000
# Cách dùng:  powershell -ExecutionPolicy Bypass -File scripts\publish.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$web = Join-Path $root "web"
$api = Join-Path $root "backend\HienMauAPI"
$wwwroot = Join-Path $api "wwwroot"
$out = Join-Path $root "release\HienMauAPI"

Write-Host "[1/3] Build giao diện web..." -ForegroundColor Cyan
Push-Location $web
if (-not (Test-Path "node_modules")) { npm install }
npm run build
Pop-Location

Write-Host "[2/3] Nhúng web vào API (wwwroot)..." -ForegroundColor Cyan
if (Test-Path $wwwroot) { Remove-Item $wwwroot -Recurse -Force }
Copy-Item (Join-Path $web "dist") $wwwroot -Recurse

Write-Host "[3/3] dotnet publish (Release)..." -ForegroundColor Cyan
dotnet publish $api -c Release -o $out
if ($LASTEXITCODE -ne 0) { throw "dotnet publish thất bại" }

Write-Host ""
Write-Host "Hoàn tất! Chạy hệ thống:" -ForegroundColor Green
Write-Host "  cd release\HienMauAPI" -ForegroundColor Green
Write-Host "  .\HienMauAPI.exe --urls http://0.0.0.0:5000" -ForegroundColor Green
Write-Host "Mở http://localhost:5000 (website) và http://localhost:5000/swagger (API)" -ForegroundColor Green
