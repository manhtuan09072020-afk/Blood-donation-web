# Cho phép điện thoại kết nối API qua Wi-Fi (không cần cáp USB).
# - Mở cổng 5000 trên tường lửa Windows (chỉ cần làm 1 lần, cần quyền Administrator)
# - In ra địa chỉ cần nhập vào app (bấm ⚙ ở màn hình đăng nhập)
# Cách dùng: nhấp đúp KET_NOI_WIFI.bat (Windows sẽ hỏi quyền Administrator -> chọn Yes)

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`""
    exit
}

$ruleName = "HienMau API (cong 5000)"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow -Profile Private, Domain | Out-Null
    Write-Host "Đã mở cổng 5000 trên tường lửa." -ForegroundColor Green
} else {
    Write-Host "Cổng 5000 đã được mở từ trước." -ForegroundColor Green
}

# Mạng Wi-Fi đang để "Public" thì tường lửa vẫn chặn => chuyển sang "Private"
Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq "Public" } | ForEach-Object {
    Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private
    Write-Host "Đã chuyển mạng '$($_.Name)' sang Private." -ForegroundColor Yellow
}

$ips = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notmatch '^(127|169)\.' -and $_.InterfaceAlias -notmatch 'VMware|VirtualBox|vEthernet|Loopback' } |
    Select-Object -ExpandProperty IPAddress

Write-Host ""
Write-Host "Trên điện thoại (cùng Wi-Fi với máy tính): mở app -> bấm ⚙ -> nhập:" -ForegroundColor Cyan
foreach ($ip in $ips) { Write-Host "    http://${ip}:5000/api" -ForegroundColor White }
Write-Host ""
Write-Host "Nhớ chạy CHAY_DEMO.bat (API) trước khi dùng app." -ForegroundColor Cyan
Read-Host "Nhấn Enter để đóng"
