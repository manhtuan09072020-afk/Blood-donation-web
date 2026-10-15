@echo off
chcp 65001 >nul
rem Nối lại kết nối app Android <-> API qua cáp USB (chạy lại mỗi khi rút/cắm cáp)
set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
if not exist "%ADB%" set ADB=adb
"%ADB%" reverse tcp:5000 tcp:5000 >nul 2>&1
if errorlevel 1 (
  echo [LOI] Khong thay dien thoai. Kiem tra cap USB, Go loi USB va bam "Cho phep" tren dien thoai.
) else (
  echo [OK] Da ket noi. Trong app: bam banh rang - Mac dinh - Luu ^(http://localhost:5000/api^).
)
pause
