using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    public interface IDonorService
    {
        Task<List<DonorDto>> GetAllAsync(string? keyword, string? nhomMau, string? heRh, bool? trangThai);
        Task<DonorDto?> GetByIdAsync(int id);
        Task<DonorDto?> GetByAccountIdAsync(int accountId);
        Task<(bool success, string? error)> UpdateAsync(int id, UpdateDonorRequest request);
        Task<(bool success, string? error)> SetActiveAsync(int id, bool active);
        Task<List<DonationHistoryDto>> GetHistoryAsync(int donorId);
        Task<List<DonorDto>> GetByBloodTypeAsync(string nhomMau, string? heRh);
    }

    public class DonorService : IDonorService
    {
        private readonly AppDbContext _db;
        public DonorService(AppDbContext db) => _db = db;

        private record DonationStat(int NguoiHienId, int SoLan, decimal TongTheTich, DateTime LanGanNhat);

        // Thống kê số lần hiến / tổng thể tích / lần gần nhất cho một tập người hiến (1 truy vấn GROUP BY)
        private async Task<Dictionary<int, DonationStat>> GetStatsAsync(IEnumerable<int>? donorIds = null)
        {
            var query = _db.TiepNhanMaus.AsQueryable();
            if (donorIds != null)
            {
                var ids = donorIds.ToList();
                query = query.Where(t => ids.Contains(t.KhamSangLoc!.DangKyHienMau!.NguoiHienId));
            }

            var raw = await query
                .GroupBy(t => t.KhamSangLoc!.DangKyHienMau!.NguoiHienId)
                .Select(g => new { Id = g.Key, SoLan = g.Count(), Tong = g.Sum(t => t.TheTich), Max = g.Max(t => t.NgayLayMau) })
                .ToListAsync();

            return raw.ToDictionary(x => x.Id, x => new DonationStat(x.Id, x.SoLan, x.Tong, x.Max));
        }

        private static DonorDto ToDto(NguoiHienMau d, DonationStat? stat) => new()
        {
            Id = d.Id,
            Username = d.TaiKhoan?.Username ?? string.Empty,
            HoTen = d.HoTen,
            NgaySinh = d.NgaySinh,
            GioiTinh = d.GioiTinh,
            CCCD = d.CCCD,
            NhomMau = d.NhomMau,
            HeRh = d.HeRh,
            DiaChi = d.DiaChi,
            SoDienThoai = d.SoDienThoai,
            Email = d.Email,
            CanNang = d.CanNang,
            NgayDangKy = d.NgayDangKy,
            TrangThai = d.TrangThai,
            SoLanHien = stat?.SoLan ?? 0,
            TongTheTich = stat?.TongTheTich ?? 0,
            LanHienGanNhat = stat?.LanGanNhat,
            NgayCoTheHienTiepTheo = DonationRules.NgayCoTheHienTiepTheo(stat?.LanGanNhat)
        };

        public async Task<List<DonorDto>> GetAllAsync(string? keyword, string? nhomMau, string? heRh, bool? trangThai)
        {
            var query = _db.NguoiHienMaus.Include(d => d.TaiKhoan).AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim();
                query = query.Where(d => d.HoTen.Contains(kw) || d.CCCD.Contains(kw) || d.SoDienThoai.Contains(kw) || (d.Email != null && d.Email.Contains(kw)));
            }
            if (!string.IsNullOrWhiteSpace(nhomMau)) query = query.Where(d => d.NhomMau == nhomMau);
            if (!string.IsNullOrWhiteSpace(heRh)) query = query.Where(d => d.HeRh == heRh);
            if (trangThai.HasValue) query = query.Where(d => d.TrangThai == trangThai.Value);

            var donors = await query.OrderByDescending(d => d.NgayDangKy).ToListAsync();
            var stats = await GetStatsAsync();
            return donors.Select(d => ToDto(d, stats.GetValueOrDefault(d.Id))).ToList();
        }

        public async Task<DonorDto?> GetByIdAsync(int id)
        {
            var d = await _db.NguoiHienMaus.Include(x => x.TaiKhoan).FirstOrDefaultAsync(x => x.Id == id);
            if (d == null) return null;
            var stats = await GetStatsAsync(new[] { id });
            return ToDto(d, stats.GetValueOrDefault(id));
        }

        public async Task<DonorDto?> GetByAccountIdAsync(int accountId)
        {
            var d = await _db.NguoiHienMaus.Include(x => x.TaiKhoan).FirstOrDefaultAsync(x => x.AccountId == accountId);
            if (d == null) return null;
            var stats = await GetStatsAsync(new[] { d.Id });
            return ToDto(d, stats.GetValueOrDefault(d.Id));
        }

        public async Task<(bool success, string? error)> UpdateAsync(int id, UpdateDonorRequest request)
        {
            var donor = await _db.NguoiHienMaus.FindAsync(id);
            if (donor == null) return (false, "Không tìm thấy người hiến máu.");

            request.NhomMau = InputValidator.NormalizeOptional(request.NhomMau);
            request.HeRh = InputValidator.NormalizeOptional(request.HeRh);
            var fieldError = InputValidator.ValidateDonorFields(request.GioiTinh, request.NhomMau, request.HeRh);
            if (fieldError != null) return (false, fieldError);

            if (request.CanNang.HasValue && (request.CanNang <= 0 || request.CanNang > 300))
                return (false, "Cân nặng không hợp lệ.");

            var age = DonationRules.TinhTuoi(request.NgaySinh);
            if (age < 16 || age > 100) return (false, "Ngày sinh không hợp lệ.");

            donor.HoTen = request.HoTen.Trim();
            donor.NgaySinh = request.NgaySinh.Date;
            donor.GioiTinh = request.GioiTinh;
            donor.NhomMau = request.NhomMau;
            donor.HeRh = request.HeRh;
            donor.DiaChi = InputValidator.NormalizeOptional(request.DiaChi);
            donor.SoDienThoai = request.SoDienThoai.Trim();
            donor.Email = InputValidator.NormalizeOptional(request.Email);
            donor.CanNang = request.CanNang;

            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(bool success, string? error)> SetActiveAsync(int id, bool active)
        {
            var donor = await _db.NguoiHienMaus.Include(d => d.TaiKhoan).FirstOrDefaultAsync(d => d.Id == id);
            if (donor == null) return (false, "Không tìm thấy người hiến máu.");

            donor.TrangThai = active;
            if (donor.TaiKhoan != null) donor.TaiKhoan.TrangThai = active;
            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<List<DonationHistoryDto>> GetHistoryAsync(int donorId)
        {
            var regs = await _db.DangKyHienMaus
                .Where(r => r.NguoiHienId == donorId)
                .Include(r => r.DotHienMau).ThenInclude(d => d!.DiemHienMau)
                .Include(r => r.KhamSangLoc).ThenInclude(k => k!.TiepNhanMau).ThenInclude(t => t!.KhoMaus)
                .AsSplitQuery()
                .OrderByDescending(r => r.DotHienMau!.NgayBatDau)
                .ToListAsync();

            return regs.Select(r => new DonationHistoryDto
            {
                DangKyId = r.Id,
                DotId = r.DotId,
                TenDot = r.DotHienMau?.TenDot ?? string.Empty,
                TenDiem = r.DotHienMau?.DiemHienMau?.TenDiem ?? string.Empty,
                DiaChi = r.DotHienMau?.DiemHienMau?.DiaChi ?? string.Empty,
                NgayBatDau = r.DotHienMau?.NgayBatDau ?? r.NgayDangKy,
                NgayDangKy = r.NgayDangKy,
                TrangThai = r.TrangThai,
                GhiChu = r.GhiChu,
                NgayKham = r.KhamSangLoc?.NgayKham,
                KetQuaSangLoc = r.KhamSangLoc?.KetQua,
                LyDoKhongDat = r.KhamSangLoc?.LyDoKhongDat,
                CanNang = r.KhamSangLoc?.CanNang,
                HuyetAp = r.KhamSangLoc?.HuyetAp,
                Hemoglobin = r.KhamSangLoc?.Hemoglobin,
                NgayLayMau = r.KhamSangLoc?.TiepNhanMau?.NgayLayMau,
                TheTich = r.KhamSangLoc?.TiepNhanMau?.TheTich,
                MaLoMau = r.KhamSangLoc?.TiepNhanMau?.KhoMaus.Select(k => k.MaLoMau).ToList() ?? new List<string>()
            }).ToList();
        }

        public async Task<List<DonorDto>> GetByBloodTypeAsync(string nhomMau, string? heRh)
        {
            var query = _db.NguoiHienMaus.Include(d => d.TaiKhoan).Where(d => d.TrangThai && d.NhomMau == nhomMau);
            if (!string.IsNullOrWhiteSpace(heRh))
                query = query.Where(d => d.HeRh == heRh);

            var donors = await query.ToListAsync();
            var stats = await GetStatsAsync(donors.Select(d => d.Id));
            return donors.Select(d => ToDto(d, stats.GetValueOrDefault(d.Id))).ToList();
        }
    }
}
