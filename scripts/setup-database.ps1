# Tạo (lại) cơ sở dữ liệu HienMauNhanDao từ script SQL.
# Cách dùng:  powershell -ExecutionPolicy Bypass -File scripts\setup-database.ps1 [-Server ".\SQLEXPRESS"]
param(
    [string]$Server = "(localdb)\MSSQLLocalDB"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sql = Join-Path $root "database\HienMauNhanDao_CreateDB.sql"

if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) {
    Write-Host "Không tìm thấy sqlcmd. Hãy mở file $sql bằng SQL Server Management Studio và chạy (F5)." -ForegroundColor Yellow
    exit 1
}

if ($Server -like "(localdb)*") { sqllocaldb start MSSQLLocalDB | Out-Null }

Write-Host "CẢNH BÁO: database HienMauNhanDao trên $Server sẽ bị XÓA và tạo lại." -ForegroundColor Yellow
$answer = Read-Host "Tiếp tục? (y/n)"
if ($answer -ne "y") { exit 0 }

sqlcmd -S $Server -f 65001 -b -i $sql
if ($LASTEXITCODE -ne 0) { Write-Host "Tạo database thất bại." -ForegroundColor Red; exit 1 }

Write-Host "Đã tạo database. Nếu không dùng LocalDB, hãy sửa ConnectionStrings trong backend\HienMauAPI\appsettings.json" -ForegroundColor Green
