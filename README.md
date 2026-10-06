# Giọt Hồng — Hệ thống Quản lý Hiến máu Nhân đạo

Khóa luận cử nhân CNTT — Mã đề tài **CNTT-KLCN265**, Trường ĐH Công Thương TP.HCM
GVHD: Trần Thanh Trâm · Nhóm: Vũ Cao Mạnh Tuấn · Nguyễn Tuấn Anh · Lâm Văn Tiến

Hệ thống gồm **3 thành phần dùng chung một REST API**:

| Thành phần | Công nghệ | Đối tượng sử dụng |
|---|---|---|
| `backend/` | ASP.NET Core Web API (.NET 10), Entity Framework Core, JWT | — |
| `database/` | SQL Server (15 bảng, ràng buộc CHECK/UNIQUE/FK, index, view) | — |
| `web/` | ReactJS 18 + Vite + Ant Design 5 + Recharts | Quản trị viên, nhân viên tiếp nhận, nhân viên sàng lọc, nhân viên kho, người hiến máu |
| `mobile/` | Flutter 3 (Android / iOS / Web) | Người hiến máu |

```
 ┌──────────────┐     ┌──────────────┐
 │  Web ReactJS │     │ Mobile Flutter│
 └──────┬───────┘     └──────┬───────┘
        │   HTTPS/JSON + JWT  │
        └─────────┬──────────┘
          ┌───────▼────────┐      ┌──────────────────────┐
          │ ASP.NET Core API│─────►│ Tác vụ nền (60 phút): │
          │ Controllers →   │      │ nhắc lịch, nhắc định  │
          │ Services → EF   │      │ kỳ, kêu gọi khi thiếu │
          └───────┬────────┘      └──────────────────────┘
          ┌───────▼────────┐
          │   SQL Server    │
          └────────────────┘
```

---

📘 **Tài liệu phân tích – thiết kế** (use-case, đặc tả, sơ đồ trạng thái, tuần tự, lớp, ERD, kiểm thử): [`docs/THIET_KE_HE_THONG.md`](docs/THIET_KE_HE_THONG.md)
🖼️ **Ảnh màn hình** web & mobile cho báo cáo: [`docs/screenshots/`](docs/screenshots/)

---

## 1. Cài đặt & chạy

### Chạy nhanh (Windows)
```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-database.ps1   # tạo CSDL (lần đầu)
CHAY_DEMO.bat                                                         # mở API + Web, tự bật trình duyệt
```

### Yêu cầu
- .NET SDK 10, SQL Server (Express / Developer / LocalDB), Node.js ≥ 18, Flutter ≥ 3.35

### Bước 1 — Tạo cơ sở dữ liệu
Mở `database/HienMauNhanDao_CreateDB.sql` bằng SSMS và chạy (F5), hoặc:
```bash
sqlcmd -S "(localdb)\MSSQLLocalDB" -f 65001 -i database/HienMauNhanDao_CreateDB.sql
```
> Script **xóa và tạo lại** database `HienMauNhanDao`.

### Bước 2 — Chạy API
Sửa chuỗi kết nối trong `backend/HienMauAPI/appsettings.json` nếu không dùng LocalDB
(ví dụ `Server=.\SQLEXPRESS;Database=HienMauNhanDao;Trusted_Connection=True;TrustServerCertificate=True`).
```bash
cd backend/HienMauAPI
dotnet run
```
- API: http://localhost:5000 — tài liệu Swagger: http://localhost:5000/swagger
- Lần chạy đầu, API tự đặt mật khẩu mẫu và **sinh dữ liệu minh họa** (60 người hiến, 10 đợt hiến máu, ~160 đơn vị máu,
  phiếu xuất, thông báo…) để demo dashboard/báo cáo. Tắt bằng `"SeedDemoData": false`.
- Điện thoại thật cần truy cập qua mạng LAN: `dotnet run --urls http://0.0.0.0:5000`

### Bước 3 — Chạy Web
```bash
cd web
npm install
npm run dev        # http://localhost:5173 (đã proxy /api -> localhost:5000)
```

### Bước 4 — Chạy Mobile
```bash
cd mobile
flutter pub get
flutter run                 # máy ảo Android: API mặc định http://10.0.2.2:5000/api
flutter run -d chrome       # chạy thử trên trình duyệt
```
Điện thoại thật: ở màn hình đăng nhập bấm ⚙ và nhập `http://<IP-máy-tính>:5000/api`.

### Đóng gói triển khai (một tiến trình phục vụ cả website và API)
```powershell
powershell -ExecutionPolicy Bypass -File scripts\publish.ps1
cd release\HienMauAPI
.\HienMauAPI.exe --urls http://0.0.0.0:5000      # website: http://<IP>:5000 · API: /api · Swagger: /swagger
```
Ứng dụng Android: `mobile\build\app\outputs\flutter-apk\app-release.apk` (bản build sẵn được chép ra `release\GiotHong.apk`).
Trên điện thoại thật, ở màn hình đăng nhập bấm ⚙ và nhập `http://<IP-máy-chủ>:5000/api`.

### Xử lý sự cố khi build Android
- **`PKIX path building failed` / `Cannot invoke "java.util.List.get(int)" because "path" is null`**: phần mềm diệt virus
  (Avast/AVG) đang quét HTTPS và thay chứng chỉ, Java/Gradle không tin chứng chỉ này nên không tải được thư viện.
  Cách xử lý: Avast → *Menu → Settings → Protection → Core Shields → Web Shield* → bỏ chọn *Enable HTTPS scanning*
  (hoặc thêm `java.exe` của Android Studio vào ngoại lệ), sau đó chạy lại `flutter build apk`.
  Cách khác không cần tắt Avast — cho riêng lần build tin chứng chỉ của Avast (PowerShell):
  ```powershell
  $jbr = "C:\Program Files\Android\Android Studio\jbr"
  $c = Get-ChildItem Cert:\LocalMachine\Root | Where-Object Subject -like "*Avast*" | Select-Object -First 1
  Export-Certificate -Cert $c -FilePath "$env:TEMP\avast.cer"
  Copy-Item "$jbr\lib\security\cacerts" "$env:TEMP\truststore.jks"
  & "$jbr\bin\keytool.exe" -importcert -noprompt -alias avast -file "$env:TEMP\avast.cer" -keystore "$env:TEMP\truststore.jks" -storepass changeit
  $env:JAVA_TOOL_OPTIONS = "-Djavax.net.ssl.trustStore=$env:TEMP\truststore.jks -Djavax.net.ssl.trustStorePassword=changeit"
  cd mobile; flutter build apk --release      # -> build\app\outputs\flutter-apk\app-release.apk
  ```
- **Gradle bị crash do thiếu RAM**: `mobile/android/gradle.properties` đã giới hạn heap 2 GB cho máy 8 GB RAM.

### Kiểm thử tự động
```bash
cd backend && dotnet test     # 48 unit test nghiệp vụ (xUnit + EF InMemory)
cd mobile && flutter test
```

---

## 2. Tài khoản demo (mật khẩu `Hienmau@123`)

| Tài khoản | Vai trò | Trang sau đăng nhập |
|---|---|---|
| `admin` | Quản trị viên | Web `/admin` — toàn quyền |
| `nv.tiepnhan01` | Nhân viên tiếp nhận | Duyệt đăng ký, tiếp nhận máu & nhập kho |
| `nv.sangloc01` | Nhân viên sàng lọc | Khám sàng lọc |
| `nv.kho01` | Nhân viên quản lý kho | Tồn kho, xuất kho, cảnh báo, vận động |
| `nguyenvana` | Người hiến máu | Web `/me` hoặc ứng dụng di động |
| `nguoihien01` … `nguoihien60` | Người hiến máu (dữ liệu demo) | |

---

## 3. Đối chiếu chức năng với đề cương

### Chức năng cơ bản
| Yêu cầu | Thực hiện |
|---|---|
| Đăng nhập, đăng xuất, đổi mật khẩu | Web + Mobile, JWT 8 giờ, mật khẩu băm PBKDF2-SHA256 |
| Phân quyền người dùng | 5 vai trò: Quản trị, NV tiếp nhận, NV sàng lọc, NV quản lý kho, Người hiến máu — kiểm tra ở cả API (`[Authorize(Roles)]`) và giao diện (menu, route). Trang *Nhân viên & phân quyền* có ma trận quyền |
| Báo cáo, thống kê | 5 báo cáo: theo tháng, người hiến, đợt hiến máu, tồn kho, xuất kho — biểu đồ, lọc theo kỳ, xuất CSV (Excel), in |

### Nền tảng Web
| Yêu cầu đề cương | Màn hình |
|---|---|
| Quản lý người hiến máu, điểm hiến máu, đợt hiến máu, đăng ký hiến máu | *Người hiến máu* (thêm hồ sơ cho người đến trực tiếp, sửa, khóa, xem lịch sử), *Đợt & điểm hiến máu*, *Đăng ký hiến máu* (duyệt hàng loạt, từ chối kèm lý do, đăng ký tại điểm) |
| Khám sàng lọc & đánh giá điều kiện, lịch sử hiến máu, nhóm máu A/B/AB/O & Rh | *Khám sàng lọc* (bảng kiểm tiêu chuẩn tự động), hồ sơ người hiến có dòng thời gian lịch sử, *Nhóm máu* (ngưỡng an toàn, ma trận tương thích) |
| Tiếp nhận máu & nhập kho; kho máu theo nhóm máu, thành phần, số lượng, hạn sử dụng, vị trí | *Tiếp nhận máu* (nhập nguyên túi hoặc điều chế tách hồng cầu/huyết tương/tiểu cầu), *Tồn kho máu* (lọc, vị trí lưu trữ, hủy bỏ, bảng tổng hợp) |
| Xuất kho cho cơ sở y tế, cảnh báo số lượng / hạn sử dụng | *Xuất kho* (chọn đơn vị theo FEFO, in phiếu xuất), *Cơ sở y tế*, chuông cảnh báo + tab *Cảnh báo* |
| Thông báo nhắc lịch định kỳ, kêu gọi theo nhóm máu khi khan hiếm | *Thông báo & vận động* + **tác vụ nền tự động** (nhắc trước 2 ngày, nhắc khi đủ 12 tuần, kêu gọi khi tồn kho < ngưỡng) |
| Lịch sử thông báo & chiến dịch vận động | Tab *Lịch sử chiến dịch*: người nhận, tỷ lệ đã đọc |

### Nền tảng Mobile (Flutter)
| Yêu cầu đề cương | Màn hình |
|---|---|
| Đăng ký hiến máu, tra cứu lịch sử, cập nhật thông tin cá nhân & liên hệ | *Chi tiết đợt* → Đăng ký; *Lịch sử* (lịch hẹn + dòng thời gian hiến máu); *Tài khoản* → Cập nhật / Đổi mật khẩu |
| Xem lịch và địa điểm tổ chức hiến máu | *Lịch hiến* (tìm kiếm, lọc), mở Google Maps |
| Nhận thông báo nhắc lịch | *Thông báo* + thông báo hệ thống (flutter_local_notifications, kiểm tra mỗi 60 giây) |
| Nhận thông báo kêu gọi khi nhóm máu phù hợp đang thiếu | Thông báo hệ thống mức ưu tiên cao; *Trang chủ* hiển thị nhóm máu đang thiếu và cảnh báo khi trùng nhóm máu của người dùng |

### Hai nghiệp vụ phức tạp
1. **Quy trình hiến máu khép kín có ràng buộc**: Đăng ký → Duyệt → Khám sàng lọc → Lấy máu → Điều chế → Nhập kho.
   Kiểm tra tuổi 18–60, khoảng cách 12 tuần tính theo ngày lấy máu thực tế, mỗi người chỉ một đăng ký còn hiệu lực,
   giới hạn số lượng theo kế hoạch đợt, sàng lọc theo cân nặng/huyết áp/mạch/nhiệt độ/Hemoglobin, chuyển trạng thái chặt chẽ,
   tách một lần lấy máu thành nhiều chế phẩm với hạn dùng riêng (tiểu cầu 5 ngày, hồng cầu 42 ngày, huyết tương 1 năm),
   ghi nhận trong giao dịch (transaction) và gửi thông báo ở mỗi bước.
2. **Quản lý kho máu thông minh**: tồn kho theo nhóm máu × thành phần, ngưỡng an toàn cấu hình theo từng nhóm,
   tự động đánh dấu hết hạn, cảnh báo đơn vị sắp hết hạn (≤ 7 ngày), **xuất kho theo nguyên tắc FEFO**
   (hết hạn trước – xuất trước), gợi ý nhóm máu tương thích khi thiếu, và **tự động kêu gọi** người hiến cùng nhóm máu
   đã đủ điều kiện khi tồn kho xuống dưới ngưỡng.

---

## 4. Cấu trúc mã nguồn

```
backend/HienMauAPI/
  Controllers/   Điều phối HTTP, phân quyền theo vai trò
  Services/      Toàn bộ nghiệp vụ (validate, transaction, thông báo), AutomationBackgroundService
  Entities/      15 lớp ánh xạ bảng CSDL
  DTOs/          Hợp đồng dữ liệu vào/ra API
  Data/          AppDbContext (Fluent API), DbSeeder, DemoDataSeeder
  Helpers/       JWT, PBKDF2, quy tắc nghiệp vụ (DonationRules)
backend/HienMauAPI.Tests/   48 unit test
database/HienMauNhanDao_CreateDB.sql
docs/                       Tài liệu thiết kế + ảnh màn hình
scripts/                    setup-database.ps1, start-dev.ps1, publish.ps1
legacy/                     Giao diện HTML tĩnh ban đầu (bản phác thảo đầu tiên, không còn sử dụng)
web/src/
  api/           Lời gọi API theo nghiệp vụ
  layouts/       AdminLayout (sidebar theo vai trò), PublicLayout
  pages/public   Trang chủ, lịch hiến máu, đăng nhập, đăng ký
  pages/donor    Khu vực người hiến máu
  pages/admin    13 trang quản trị
mobile/lib/
  services/      api.dart, local_notifier.dart
  state/         AppState (Provider): phiên đăng nhập, thông báo
  screens/       Đăng nhập, đăng ký, trang chủ, lịch hiến, chi tiết, lịch sử, thông báo, tài khoản
```

## 5. Danh sách API chính

| Nhóm | Endpoint |
|---|---|
| Xác thực | `POST /api/auth/login`, `POST /api/auth/register-donor`, `GET /api/auth/me`, `POST /api/auth/change-password` |
| Đợt & điểm hiến máu | `GET/POST /api/campaigns`, `PUT /api/campaigns/{id}`, `PUT /api/campaigns/{id}/status`, `GET/POST /api/campaigns/sites`, `PUT /api/campaigns/sites/{id}` |
| Người hiến máu | `GET/POST /api/donors`, `GET /api/donors/{id}/history`, `PUT /api/donors/{id}`, `PUT /api/donors/{id}/active`, `GET/PUT /api/donors/me`, `GET /api/donors/me/history` |
| Đăng ký | `GET /api/registrations`, `GET /api/registrations/me`, `POST /api/registrations`, `POST /api/registrations/walk-in`, `PUT .../{id}/status`, `PUT .../{id}/cancel` |
| Sàng lọc / tiếp nhận | `GET/POST /api/screening`, `GET /api/collection`, `GET /api/collection/pending`, `POST /api/collection` |
| Kho máu | `GET /api/inventory/units`, `/summary`, `/alerts`, `/suggest`, `POST /api/inventory/issue`, `GET /api/inventory/issues`, `PUT .../units/{id}/discard`, `PUT .../units/{id}/location` |
| Danh mục | `GET/PUT /api/blood-groups`, `GET/POST/PUT /api/facilities` |
| Thông báo | `GET /api/notifications/me`, `/me/unread-count`, `PUT /{id}/read`, `PUT /me/read-all`, `POST /call-for-donation`, `/reminder`, `/periodic-reminder`, `/general`, `GET /campaigns` |
| Báo cáo | `GET /api/reports/dashboard`, `/blood-type-stats`, `/monthly-stats`, `/donors`, `/campaigns`, `/issues`, `/inventory`, `/public` |
| Nhân viên | `GET/POST /api/staff`, `PUT /api/staff/{id}`, `PUT /{id}/active`, `PUT /{id}/reset-password` |

Chi tiết tham số xem tại Swagger.
