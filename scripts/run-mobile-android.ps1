# Chạy ứng dụng Flutter trên điện thoại Android thật cắm cáp USB.
# - Tự chuyển cổng 5000 của điện thoại về máy tính (adb reverse) => app dùng http://localhost:5000/api
# - Nếu máy có Avast quét HTTPS, tự tạo kho chứng chỉ tạm để Gradle tải được thư viện
# Yêu cầu: API đang chạy (dotnet run hoặc CHAY_DEMO.bat), điện thoại đã bật Gỡ lỗi USB.
# Cách dùng:  powershell -ExecutionPolicy Bypass -File scripts\run-mobile-android.ps1 [-Release]
param([switch]$Release)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) { $adb = "adb" }

# 1. Kiểm tra điện thoại
$devices = & $adb devices | Select-String "\tdevice$"
if (-not $devices) {
    Write-Host "Không thấy điện thoại. Kiểm tra: cáp USB, đã bật 'Gỡ lỗi USB', đã bấm 'Cho phép' trên điện thoại." -ForegroundColor Red
    & $adb devices
    exit 1
}
$serial = ($devices[0].Line -split "\t")[0]
Write-Host "Điện thoại: $serial" -ForegroundColor Green

# 2. Chuyển cổng 5000 của điện thoại về máy tính
& $adb -s $serial reverse tcp:5000 tcp:5000 | Out-Null
Write-Host "Đã chuyển cổng: điện thoại localhost:5000 -> máy tính localhost:5000" -ForegroundColor Green

# 3. Avast: cho Gradle tin chứng chỉ quét HTTPS của Avast (chỉ trong phiên này)
$avast = Get-ChildItem Cert:\LocalMachine\Root, Cert:\CurrentUser\Root -ErrorAction SilentlyContinue |
    Where-Object { $_.Subject -like "*Avast*" } | Select-Object -First 1
$jbr = "C:\Program Files\Android\Android Studio\jbr"
if ($avast -and (Test-Path $jbr)) {
    $store = Join-Path $env:TEMP "giothong-truststore.jks"
    if (-not (Test-Path $store)) {
        $cer = Join-Path $env:TEMP "avast-root.cer"
        Export-Certificate -Cert $avast -FilePath $cer | Out-Null
        Copy-Item "$jbr\lib\security\cacerts" $store -Force
        & "$jbr\bin\keytool.exe" -importcert -noprompt -alias avast-root -file $cer -keystore $store -storepass changeit 2>$null | Out-Null
    }
    $env:JAVA_TOOL_OPTIONS = "-Djavax.net.ssl.trustStore=$store -Djavax.net.ssl.trustStorePassword=changeit"
    Write-Host "Phát hiện Avast: đã cấu hình chứng chỉ cho Gradle." -ForegroundColor Yellow
}

# 4. Chạy app
Set-Location (Join-Path $root "mobile")
flutter pub get
if ($Release) { flutter run -d $serial --release } else { flutter run -d $serial }
