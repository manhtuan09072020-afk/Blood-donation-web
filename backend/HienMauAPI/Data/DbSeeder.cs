using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Data
{
    // Chạy mỗi lần khởi động API. Mục đích: file SQL không thể tự băm mật khẩu PBKDF2,
    // nên seeder này thay HASH_PLACEHOLDER bằng mật khẩu mặc định thật và đảm bảo
    // mọi tài khoản quản trị/nhân viên đều có hồ sơ NhanVien (cần cho tiếp nhận, sàng lọc, xuất kho).
    public static class DbSeeder
    {
        public const string DefaultPassword = "Hienmau@123";
        private const string Placeholder = "HASH_PLACEHOLDER";

        public static async Task SeedAsync(AppDbContext db, ILogger logger)
        {
            if (!await db.Database.CanConnectAsync())
            {
                logger.LogWarning("Không kết nối được CSDL - bỏ qua bước seed. " +
                                  "Hãy chạy database/HienMauNhanDao_CreateDB.sql và kiểm tra ConnectionStrings:DefaultConnection.");
                return;
            }

            // 1. Thay mật khẩu giả bằng mật khẩu mặc định đã băm
            var placeholders = await db.TaiKhoans.Where(a => a.PasswordHash == Placeholder).ToListAsync();
            foreach (var account in placeholders)
                account.PasswordHash = PasswordHasher.Hash(DefaultPassword);

            // 2. Bảo đảm luôn có ít nhất một tài khoản quản trị
            if (!await db.TaiKhoans.AnyAsync(a => a.Role == RoleNames.QuanTri))
            {
                db.TaiKhoans.Add(new TaiKhoan
                {
                    Username = "admin",
                    PasswordHash = PasswordHasher.Hash(DefaultPassword),
                    Email = "admin@hienmau.vn",
                    Role = RoleNames.QuanTri
                });
                logger.LogWarning("Chưa có tài khoản quản trị - đã tạo tài khoản 'admin'.");
            }
            await db.SaveChangesAsync();

            // 3. Mọi tài khoản không phải người hiến máu phải có hồ sơ NhanVien
            var missingProfile = await db.TaiKhoans
                .Where(a => a.Role != RoleNames.NguoiHienMau && !db.NhanViens.Any(n => n.AccountId == a.Id))
                .ToListAsync();
            foreach (var account in missingProfile)
            {
                db.NhanViens.Add(new NhanVien
                {
                    AccountId = account.Id,
                    HoTen = account.Role == RoleNames.QuanTri ? "Quản trị hệ thống" : account.Username,
                    ChucVu = account.Role switch
                    {
                        RoleNames.QuanTri => "Quản trị viên",
                        RoleNames.NhanVienTiepNhan => "Nhân viên tiếp nhận",
                        RoleNames.NhanVienKho => "Nhân viên quản lý kho",
                        _ => "Nhân viên sàng lọc"
                    },
                    Email = account.Email
                });
            }
            await db.SaveChangesAsync();

            if (placeholders.Count > 0)
                logger.LogWarning("Đã đặt mật khẩu mặc định '{Password}' cho {Count} tài khoản mẫu. " +
                                  "Hãy đổi mật khẩu sau khi đăng nhập lần đầu.", DefaultPassword, placeholders.Count);
        }
    }
}
