using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    public interface IAuthService
    {
        Task<LoginResponse?> LoginAsync(LoginRequest request);
        Task<MeDto?> GetMeAsync(int accountId);
        Task<(bool success, string? error)> RegisterDonorAsync(RegisterDonorRequest request);
        Task<(bool success, string? error)> ChangePasswordAsync(int accountId, ChangePasswordRequest request);
    }

    public class AuthService : IAuthService
    {
        private readonly AppDbContext _db;
        private readonly IJwtTokenGenerator _jwt;

        public AuthService(AppDbContext db, IJwtTokenGenerator jwt)
        {
            _db = db;
            _jwt = jwt;
        }

        public async Task<LoginResponse?> LoginAsync(LoginRequest request)
        {
            var username = request.Username.Trim();
            var account = await _db.TaiKhoans.FirstOrDefaultAsync(a => a.Username == username);

            if (account == null || !account.TrangThai) return null;
            if (!PasswordHasher.Verify(request.Password, account.PasswordHash)) return null;

            var me = await GetMeAsync(account.Id);
            var (token, expiresAt) = _jwt.GenerateToken(account, me?.ProfileId);

            return new LoginResponse
            {
                Token = token,
                Username = account.Username,
                Role = account.Role,
                HoTen = me?.HoTen ?? account.Username,
                ProfileId = me?.ProfileId,
                ExpiresAt = expiresAt
            };
        }

        public async Task<MeDto?> GetMeAsync(int accountId)
        {
            var account = await _db.TaiKhoans.FindAsync(accountId);
            if (account == null) return null;

            var me = new MeDto
            {
                AccountId = account.Id,
                Username = account.Username,
                Role = account.Role,
                Email = account.Email,
                HoTen = account.Username,
                NgayTao = account.NgayTao
            };

            if (account.Role == RoleNames.NguoiHienMau)
            {
                var donor = await _db.NguoiHienMaus.FirstOrDefaultAsync(d => d.AccountId == account.Id);
                if (donor != null)
                {
                    me.ProfileId = donor.Id;
                    me.HoTen = donor.HoTen;
                    me.SoDienThoai = donor.SoDienThoai;
                    me.Email = donor.Email ?? account.Email;
                    me.ChucVu = "Người hiến máu";
                }
            }
            else
            {
                // Quản trị viên cũng có hồ sơ NhanVien: cần profileId để lập phiếu tiếp nhận/xuất kho/sàng lọc
                var staff = await _db.NhanViens.FirstOrDefaultAsync(s => s.AccountId == account.Id);
                if (staff != null)
                {
                    me.ProfileId = staff.Id;
                    me.HoTen = staff.HoTen;
                    me.SoDienThoai = staff.SoDienThoai;
                    me.Email = staff.Email ?? account.Email;
                    me.ChucVu = staff.ChucVu;
                }
            }
            return me;
        }

        public async Task<(bool success, string? error)> RegisterDonorAsync(RegisterDonorRequest request)
        {
            request.Username = request.Username.Trim();
            request.CCCD = request.CCCD.Trim();
            request.HoTen = request.HoTen.Trim();
            request.NhomMau = InputValidator.NormalizeOptional(request.NhomMau);
            request.HeRh = InputValidator.NormalizeOptional(request.HeRh);

            var fieldError = InputValidator.ValidateDonorFields(request.GioiTinh, request.NhomMau, request.HeRh);
            if (fieldError != null) return (false, fieldError);

            if (!InputValidator.IsValidCccd(request.CCCD))
                return (false, "Số CCCD phải gồm đúng 12 chữ số.");

            if (await _db.TaiKhoans.AnyAsync(a => a.Username == request.Username))
                return (false, "Tên đăng nhập đã tồn tại.");

            if (await _db.NguoiHienMaus.AnyAsync(d => d.CCCD == request.CCCD))
                return (false, "Số CCCD đã được đăng ký.");

            var age = DonationRules.TinhTuoi(request.NgaySinh);
            if (age < DonationRules.TuoiToiThieu || age > DonationRules.TuoiToiDa)
                return (false, $"Người hiến máu phải từ {DonationRules.TuoiToiThieu} đến {DonationRules.TuoiToiDa} tuổi.");

            if (request.CanNang.HasValue && (request.CanNang <= 0 || request.CanNang > 300))
                return (false, "Cân nặng không hợp lệ.");

            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var account = new TaiKhoan
                {
                    Username = request.Username,
                    PasswordHash = PasswordHasher.Hash(request.Password),
                    Email = InputValidator.NormalizeOptional(request.Email),
                    Role = RoleNames.NguoiHienMau
                };
                _db.TaiKhoans.Add(account);
                await _db.SaveChangesAsync();

                var donor = new NguoiHienMau
                {
                    AccountId = account.Id,
                    HoTen = request.HoTen,
                    NgaySinh = request.NgaySinh.Date,
                    GioiTinh = request.GioiTinh,
                    CCCD = request.CCCD,
                    NhomMau = request.NhomMau,
                    HeRh = request.HeRh,
                    DiaChi = InputValidator.NormalizeOptional(request.DiaChi),
                    SoDienThoai = request.SoDienThoai.Trim(),
                    Email = InputValidator.NormalizeOptional(request.Email),
                    CanNang = request.CanNang
                };
                _db.NguoiHienMaus.Add(donor);
                await _db.SaveChangesAsync();

                await tx.CommitAsync();
                return (true, null);
            }
            catch
            {
                await tx.RollbackAsync();
                return (false, "Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.");
            }
        }

        public async Task<(bool success, string? error)> ChangePasswordAsync(int accountId, ChangePasswordRequest request)
        {
            var account = await _db.TaiKhoans.FindAsync(accountId);
            if (account == null || !account.TrangThai) return (false, "Tài khoản không tồn tại hoặc đã bị khóa.");

            if (!PasswordHasher.Verify(request.CurrentPassword, account.PasswordHash))
                return (false, "Mật khẩu hiện tại không đúng.");

            if (request.CurrentPassword == request.NewPassword)
                return (false, "Mật khẩu mới phải khác mật khẩu hiện tại.");

            account.PasswordHash = PasswordHasher.Hash(request.NewPassword);
            await _db.SaveChangesAsync();
            return (true, null);
        }
    }
}
