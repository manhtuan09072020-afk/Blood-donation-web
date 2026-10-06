using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    public interface IStaffService
    {
        Task<List<StaffDto>> GetAllAsync();
        Task<(bool success, string? error, StaffDto? data)> CreateAsync(CreateStaffRequest request);
        Task<(bool success, string? error)> UpdateAsync(int id, UpdateStaffRequest request, int currentAccountId);
        Task<(bool success, string? error)> SetActiveAsync(int id, bool active, int currentAccountId);
        Task<(bool success, string? error)> ResetPasswordAsync(int id, string newPassword);
    }

    public class StaffService : IStaffService
    {
        private readonly AppDbContext _db;
        public StaffService(AppDbContext db) => _db = db;

        public static readonly Dictionary<string, string> ChucVuTheoVaiTro = new()
        {
            [RoleNames.QuanTri] = "Quản trị viên",
            [RoleNames.NhanVienTiepNhan] = "Nhân viên tiếp nhận",
            [RoleNames.NhanVienSangLoc] = "Nhân viên sàng lọc",
            [RoleNames.NhanVienKho] = "Nhân viên quản lý kho"
        };

        public async Task<List<StaffDto>> GetAllAsync()
        {
            return await _db.NhanViens
                .OrderBy(s => s.TaiKhoan!.Role).ThenBy(s => s.HoTen)
                .Select(s => new StaffDto
                {
                    Id = s.Id, AccountId = s.AccountId, HoTen = s.HoTen, ChucVu = s.ChucVu,
                    Role = s.TaiKhoan!.Role, SoDienThoai = s.SoDienThoai, Email = s.Email,
                    Username = s.TaiKhoan!.Username, TrangThai = s.TrangThai, NgayTao = s.TaiKhoan!.NgayTao
                }).ToListAsync();
        }

        public async Task<(bool success, string? error, StaffDto? data)> CreateAsync(CreateStaffRequest request)
        {
            if (!ChucVuTheoVaiTro.ContainsKey(request.Role))
                return (false, "Vai trò không hợp lệ.", null);

            var username = request.Username.Trim();
            if (await _db.TaiKhoans.AnyAsync(a => a.Username == username))
                return (false, "Tên đăng nhập đã tồn tại.", null);

            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var account = new TaiKhoan
                {
                    Username = username,
                    PasswordHash = PasswordHasher.Hash(request.Password),
                    Email = InputValidator.NormalizeOptional(request.Email),
                    Role = request.Role
                };
                _db.TaiKhoans.Add(account);
                await _db.SaveChangesAsync();

                var staff = new NhanVien
                {
                    AccountId = account.Id,
                    HoTen = request.HoTen.Trim(),
                    ChucVu = ChucVuTheoVaiTro[request.Role],
                    SoDienThoai = InputValidator.NormalizeOptional(request.SoDienThoai),
                    Email = InputValidator.NormalizeOptional(request.Email)
                };
                _db.NhanViens.Add(staff);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                return (true, null, new StaffDto
                {
                    Id = staff.Id, AccountId = account.Id, HoTen = staff.HoTen, ChucVu = staff.ChucVu, Role = account.Role,
                    SoDienThoai = staff.SoDienThoai, Email = staff.Email,
                    Username = account.Username, TrangThai = staff.TrangThai, NgayTao = account.NgayTao
                });
            }
            catch
            {
                await tx.RollbackAsync();
                return (false, "Có lỗi xảy ra khi tạo tài khoản nhân viên.", null);
            }
        }

        public async Task<(bool success, string? error)> UpdateAsync(int id, UpdateStaffRequest request, int currentAccountId)
        {
            if (!ChucVuTheoVaiTro.ContainsKey(request.Role))
                return (false, "Vai trò không hợp lệ.");

            var staff = await _db.NhanViens.Include(s => s.TaiKhoan).FirstOrDefaultAsync(s => s.Id == id);
            if (staff == null || staff.TaiKhoan == null) return (false, "Không tìm thấy nhân viên.");

            if (staff.AccountId == currentAccountId && request.Role != staff.TaiKhoan.Role)
                return (false, "Không thể tự thay đổi vai trò của chính mình.");

            if (staff.TaiKhoan.Role == RoleNames.QuanTri && request.Role != RoleNames.QuanTri
                && await _db.TaiKhoans.CountAsync(a => a.Role == RoleNames.QuanTri && a.TrangThai) <= 1)
                return (false, "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.");

            staff.HoTen = request.HoTen.Trim();
            staff.SoDienThoai = InputValidator.NormalizeOptional(request.SoDienThoai);
            staff.Email = InputValidator.NormalizeOptional(request.Email);
            staff.TaiKhoan.Email = staff.Email;
            staff.TaiKhoan.Role = request.Role;
            staff.ChucVu = ChucVuTheoVaiTro[request.Role];

            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(bool success, string? error)> SetActiveAsync(int id, bool active, int currentAccountId)
        {
            var staff = await _db.NhanViens.Include(s => s.TaiKhoan).FirstOrDefaultAsync(s => s.Id == id);
            if (staff == null) return (false, "Không tìm thấy nhân viên.");

            if (!active && staff.AccountId == currentAccountId)
                return (false, "Không thể tự khóa tài khoản đang đăng nhập.");

            staff.TrangThai = active;
            if (staff.TaiKhoan != null) staff.TaiKhoan.TrangThai = active;

            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(bool success, string? error)> ResetPasswordAsync(int id, string newPassword)
        {
            var staff = await _db.NhanViens.Include(s => s.TaiKhoan).FirstOrDefaultAsync(s => s.Id == id);
            if (staff?.TaiKhoan == null) return (false, "Không tìm thấy nhân viên.");

            staff.TaiKhoan.PasswordHash = PasswordHasher.Hash(newPassword);
            await _db.SaveChangesAsync();
            return (true, null);
        }
    }
}
