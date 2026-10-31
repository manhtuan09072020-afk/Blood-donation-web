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

            // 0. Nâng cấp CSDL đã tạo từ phiên bản cũ của script (thêm cột mới, không mất dữ liệu)
            if (db.Database.IsSqlServer())
            {
                await db.Database.ExecuteSqlRawAsync(@"
IF COL_LENGTH('KhoMau', 'LyDoHuy') IS NULL
    ALTER TABLE KhoMau ADD
        LyDoHuy NVARCHAR(255) NULL,
        NgayHuy DATETIME NULL,
        NhanVienHuyId INT NULL CONSTRAINT FK_KhoMau_NhanVienHuy REFERENCES NhanVien(Id);");

                // Thể tích đăng ký / chỉ định, loại túi, chia túi, thông tin giao nhận phiếu xuất
                await db.Database.ExecuteSqlRawAsync(@"
IF COL_LENGTH('DangKyHienMau', 'TheTichDangKy') IS NULL
    ALTER TABLE DangKyHienMau ADD TheTichDangKy INT NULL CONSTRAINT CK_DangKy_TheTich CHECK (TheTichDangKy IN (250, 350, 450));
IF COL_LENGTH('KhamSangLoc', 'TheTichChiDinh') IS NULL
    ALTER TABLE KhamSangLoc ADD TheTichChiDinh INT NULL CONSTRAINT CK_KhamSangLoc_TheTich CHECK (TheTichChiDinh IN (250, 350, 450));
IF COL_LENGTH('TiepNhanMau', 'LoaiTui') IS NULL
    ALTER TABLE TiepNhanMau ADD LoaiTui NVARCHAR(10) NULL CONSTRAINT CK_TiepNhan_LoaiTui CHECK (LoaiTui IN (N'Don', N'Doi', N'Ba'));
IF COL_LENGTH('PhieuXuatKho', 'NguoiNhan') IS NULL
    ALTER TABLE PhieuXuatKho ADD NguoiNhan NVARCHAR(100) NULL,
        MucDoKhanCap NVARCHAR(20) NULL CONSTRAINT CK_PhieuXuat_MucDo CHECK (MucDoKhanCap IN (N'Thuong', N'Khan', N'CapCuu'));
IF COL_LENGTH('KhoMau', 'KhoMauGocId') IS NULL
    ALTER TABLE KhoMau ADD KhoMauGocId INT NULL CONSTRAINT FK_KhoMau_Goc REFERENCES KhoMau(Id);");

                // Trạng thái mới 'DaChia' cho túi gốc đã chia: thay ràng buộc CHECK cũ
                await db.Database.ExecuteSqlRawAsync(@"
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_KhoMau_TrangThai'
           AND definition NOT LIKE '%DaChia%')
BEGIN
    ALTER TABLE KhoMau DROP CONSTRAINT CK_KhoMau_TrangThai;
    ALTER TABLE KhoMau ADD CONSTRAINT CK_KhoMau_TrangThai
        CHECK (TrangThai IN (N'ConKho', N'DaXuat', N'HetHan', N'HuyBo', N'DaChia'));
END");
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
