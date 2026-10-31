# Build app mobile (Flutter) thành bản web và nhúng vào API => iPhone mở bằng Safari, không cần máy Mac.
# Sau khi chạy xong, khởi động lại API (CHAY_DEMO.bat) rồi trên iPhone (cùng Wi-Fi) mở:
#   http://<IP-máy-tính>:5000/app/
# Cách dùng:  powershell -ExecutionPolicy Bypass -File scripts\build-iphone-web.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$mobile = Join-Path $root "mobile"
$target = Join-Path $root "backend\HienMauAPI\wwwroot\app"

Write-Host "[1/2] Build app mobile thành bản web..." -ForegroundColor Cyan
Push-Location $mobile
flutter pub get
flutter build web --release --base-href /app/
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "flutter build web thất bại" }
Pop-Location

Write-Host "[2/2] Nhúng vào API (wwwroot\app)..." -ForegroundColor Cyan
# robocopy /MIR: đồng bộ thư mục (xóa file cũ thừa), chịu được file đang bị khóa tạm thời; mã thoát < 8 là thành công
robocopy (Join-Path $mobile "build\web") $target /MIR /R:3 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Không chép được bản web vào $target (robocopy mã $LASTEXITCODE)" }
$global:LASTEXITCODE = 0

$ips = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notmatch '^(127|169)\.' -and $_.InterfaceAlias -notmatch 'VMware|VirtualBox|vEthernet|Loopback' } |
    Select-Object -ExpandProperty IPAddress

Write-Host ""
Write-Host "Xong! Khởi động lại API (CHAY_DEMO.bat), rồi trên iPhone cùng Wi-Fi mở Safari:" -ForegroundColor Green
foreach ($ip in $ips) { Write-Host "    http://${ip}:5000/app/" -ForegroundColor White }
Write-Host "Lần đầu: chạy KET_NOI_WIFI.bat để mở cổng 5000 trên tường lửa." -ForegroundColor Yellow
