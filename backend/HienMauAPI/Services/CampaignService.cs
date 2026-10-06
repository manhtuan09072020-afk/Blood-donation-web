using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    public interface ICampaignService
    {
        Task<List<DonationSiteDto>> GetSitesAsync(bool includeInactive);
        Task<(bool success, string? error, DonationSiteDto? data)> CreateSiteAsync(SaveDonationSiteRequest request);
        Task<(bool success, string? error)> UpdateSiteAsync(int id, SaveDonationSiteRequest request);
        Task<(bool success, string? error)> SetSiteActiveAsync(int id, bool active);

        Task<List<CampaignDto>> GetCampaignsAsync(string? trangThai, string? keyword, int? diemId);
        Task<CampaignDto?> GetCampaignByIdAsync(int id);
        Task<(bool success, string? error, CampaignDto? data)> CreateCampaignAsync(SaveCampaignRequest request);
        Task<(bool success, string? error)> UpdateCampaignAsync(int id, SaveCampaignRequest request);
        Task<(bool success, string? error)> UpdateStatusAsync(int id, string trangThai);
        Task SyncStatusesAsync();
    }

    public class CampaignService : ICampaignService
    {
        private readonly AppDbContext _db;
        public CampaignService(AppDbContext db) => _db = db;

        // ===================== ĐIỂM HIẾN MÁU =====================

        public async Task<List<DonationSiteDto>> GetSitesAsync(bool includeInactive)
        {
            var query = _db.DiemHienMaus.AsQueryable();
            if (!includeInactive) query = query.Where(s => s.TrangThai);

            return await query
                .OrderByDescending(s => s.TrangThai).ThenBy(s => s.TenDiem)
                .Select(s => new DonationSiteDto
                {
                    Id = s.Id, TenDiem = s.TenDiem, DiaChi = s.DiaChi,
                    SoDienThoai = s.SoDienThoai, TrangThai = s.TrangThai,
                    SoDotHienMau = s.DotHienMaus.Count
                }).ToListAsync();
        }

        public async Task<(bool success, string? error, DonationSiteDto? data)> CreateSiteAsync(SaveDonationSiteRequest request)
        {
            var ten = request.TenDiem.Trim();
            if (await _db.DiemHienMaus.AnyAsync(s => s.TenDiem == ten))
                return (false, "Tên điểm hiến máu đã tồn tại.", null);

            var site = new DiemHienMau
            {
                TenDiem = ten,
                DiaChi = request.DiaChi.Trim(),
                SoDienThoai = InputValidator.NormalizeOptional(request.SoDienThoai)
            };
            _db.DiemHienMaus.Add(site);
            await _db.SaveChangesAsync();

            return (true, null, new DonationSiteDto
            {
                Id = site.Id, TenDiem = site.TenDiem, DiaChi = site.DiaChi,
                SoDienThoai = site.SoDienThoai, TrangThai = site.TrangThai
            });
        }

        public async Task<(bool success, string? error)> UpdateSiteAsync(int id, SaveDonationSiteRequest request)
        {
            var site = await _db.DiemHienMaus.FindAsync(id);
            if (site == null) return (false, "Không tìm thấy điểm hiến máu.");

            var ten = request.TenDiem.Trim();
            if (await _db.DiemHienMaus.AnyAsync(s => s.Id != id && s.TenDiem == ten))
                return (false, "Tên điểm hiến máu đã tồn tại.");

            site.TenDiem = ten;
            site.DiaChi = request.DiaChi.Trim();
            site.SoDienThoai = InputValidator.NormalizeOptional(request.SoDienThoai);
            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(bool success, string? error)> SetSiteActiveAsync(int id, bool active)
        {
            var site = await _db.DiemHienMaus.FindAsync(id);
            if (site == null) return (false, "Không tìm thấy điểm hiến máu.");

            if (!active && await _db.DotHienMaus.AnyAsync(d => d.DiemId == id &&
                    (d.TrangThai == TrangThaiDot.SapDienRa || d.TrangThai == TrangThaiDot.DangDienRa)))
                return (false, "Điểm hiến máu đang có đợt sắp/đang diễn ra, không thể ngừng hoạt động.");

            site.TrangThai = active;
            await _db.SaveChangesAsync();
            return (true, null);
        }

        // ===================== ĐỢT HIẾN MÁU =====================

        // Trạng thái chỉ đi tiến theo thời gian: Sắp diễn ra -> Đang diễn ra -> Đã kết thúc.
        // Đợt đã hủy hoặc được quản trị kết thúc sớm sẽ không bị thay đổi lại.
        public async Task SyncStatusesAsync()
        {
            var today = DateTime.Now.Date;
            var campaigns = await _db.DotHienMaus
                .Where(c => c.TrangThai == TrangThaiDot.SapDienRa || c.TrangThai == TrangThaiDot.DangDienRa)
                .ToListAsync();

            var changed = false;
            foreach (var c in campaigns)
            {
                var next = c.TrangThai;
                if (c.NgayKetThuc.Date < today) next = TrangThaiDot.DaKetThuc;
                else if (c.NgayBatDau.Date <= today) next = TrangThaiDot.DangDienRa;

                if (next != c.TrangThai)
                {
                    c.TrangThai = next;
                    changed = true;
                }
            }
            if (changed) await _db.SaveChangesAsync();
        }

        private IQueryable<CampaignDto> ProjectCampaigns(IQueryable<DotHienMau> query) =>
            query.Select(c => new CampaignDto
            {
                Id = c.Id,
                DiemId = c.DiemId,
                TenDiem = c.DiemHienMau!.TenDiem,
                DiaChi = c.DiemHienMau!.DiaChi,
                SoDienThoaiDiem = c.DiemHienMau!.SoDienThoai,
                TenDot = c.TenDot,
                NgayBatDau = c.NgayBatDau,
                NgayKetThuc = c.NgayKetThuc,
                SoLuongDuKien = c.SoLuongDuKien,
                MoTa = c.MoTa,
                TrangThai = c.TrangThai,
                SoLuongDaDangKy = c.DangKyHienMaus.Count(d => d.TrangThai != TrangThaiDangKy.Huy && d.TrangThai != TrangThaiDangKy.TuChoi),
                SoLuongDaHien = c.DangKyHienMaus.Count(d => d.TrangThai == TrangThaiDangKy.DaHienMau)
            });

        public async Task<List<CampaignDto>> GetCampaignsAsync(string? trangThai, string? keyword, int? diemId)
        {
            await SyncStatusesAsync();

            var query = _db.DotHienMaus.AsQueryable();
            if (!string.IsNullOrWhiteSpace(trangThai))
            {
                var statuses = trangThai.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                query = query.Where(c => statuses.Contains(c.TrangThai));
            }
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim();
                query = query.Where(c => c.TenDot.Contains(kw) || c.DiemHienMau!.TenDiem.Contains(kw) || c.DiemHienMau!.DiaChi.Contains(kw));
            }
            if (diemId.HasValue) query = query.Where(c => c.DiemId == diemId.Value);

            return await ProjectCampaigns(query.OrderByDescending(c => c.NgayBatDau)).ToListAsync();
        }

        public async Task<CampaignDto?> GetCampaignByIdAsync(int id)
        {
            return await ProjectCampaigns(_db.DotHienMaus.Where(c => c.Id == id)).FirstOrDefaultAsync();
        }

        private async Task<string?> ValidateCampaignAsync(SaveCampaignRequest request)
        {
            if (request.NgayKetThuc < request.NgayBatDau)
                return "Ngày kết thúc phải sau ngày bắt đầu.";

            var site = await _db.DiemHienMaus.FindAsync(request.DiemId);
            if (site == null) return "Điểm hiến máu không tồn tại.";
            if (!site.TrangThai) return "Điểm hiến máu đã ngừng hoạt động.";
            return null;
        }

        public async Task<(bool success, string? error, CampaignDto? data)> CreateCampaignAsync(SaveCampaignRequest request)
        {
            var error = await ValidateCampaignAsync(request);
            if (error != null) return (false, error, null);

            if (request.NgayKetThuc.Date < DateTime.Now.Date)
                return (false, "Không thể tạo đợt hiến máu đã kết thúc trong quá khứ.", null);

            var campaign = new DotHienMau
            {
                DiemId = request.DiemId,
                TenDot = request.TenDot.Trim(),
                NgayBatDau = request.NgayBatDau,
                NgayKetThuc = request.NgayKetThuc,
                SoLuongDuKien = request.SoLuongDuKien,
                MoTa = InputValidator.NormalizeOptional(request.MoTa),
                TrangThai = TrangThaiDot.SapDienRa
            };
            _db.DotHienMaus.Add(campaign);
            await _db.SaveChangesAsync();
            await SyncStatusesAsync();

            return (true, null, await GetCampaignByIdAsync(campaign.Id));
        }

        public async Task<(bool success, string? error)> UpdateCampaignAsync(int id, SaveCampaignRequest request)
        {
            var campaign = await _db.DotHienMaus.FindAsync(id);
            if (campaign == null) return (false, "Không tìm thấy đợt hiến máu.");
            if (campaign.TrangThai is TrangThaiDot.DaKetThuc or TrangThaiDot.DaHuy)
                return (false, "Không thể chỉnh sửa đợt hiến máu đã kết thúc hoặc đã hủy.");

            var error = await ValidateCampaignAsync(request);
            if (error != null) return (false, error);

            campaign.DiemId = request.DiemId;
            campaign.TenDot = request.TenDot.Trim();
            campaign.NgayBatDau = request.NgayBatDau;
            campaign.NgayKetThuc = request.NgayKetThuc;
            campaign.SoLuongDuKien = request.SoLuongDuKien;
            campaign.MoTa = InputValidator.NormalizeOptional(request.MoTa);
            await _db.SaveChangesAsync();
            await SyncStatusesAsync();
            return (true, null);
        }

        public async Task<(bool success, string? error)> UpdateStatusAsync(int id, string trangThai)
        {
            var valid = new[] { TrangThaiDot.SapDienRa, TrangThaiDot.DangDienRa, TrangThaiDot.DaKetThuc, TrangThaiDot.DaHuy };
            if (!valid.Contains(trangThai)) return (false, "Trạng thái không hợp lệ.");

            var campaign = await _db.DotHienMaus.FindAsync(id);
            if (campaign == null) return (false, "Không tìm thấy đợt hiến máu.");
            if (campaign.TrangThai is TrangThaiDot.DaKetThuc or TrangThaiDot.DaHuy)
                return (false, "Đợt hiến máu đã kết thúc hoặc đã hủy, không thể đổi trạng thái.");

            campaign.TrangThai = trangThai;

            // Hủy đợt: báo cho những người đã đăng ký và hủy các đăng ký còn hiệu lực
            if (trangThai == TrangThaiDot.DaHuy)
            {
                var regs = await _db.DangKyHienMaus
                    .Where(r => r.DotId == id && (r.TrangThai == TrangThaiDangKy.ChoDuyet || r.TrangThai == TrangThaiDangKy.DaDuyet))
                    .ToListAsync();
                foreach (var r in regs)
                {
                    r.TrangThai = TrangThaiDangKy.Huy;
                    r.GhiChu = "Đợt hiến máu đã bị hủy bởi ban tổ chức.";
                    _db.ThongBaos.Add(new ThongBao
                    {
                        NguoiNhanId = r.NguoiHienId,
                        TieuDe = "Đợt hiến máu đã bị hủy",
                        NoiDung = $"Rất tiếc, \"{campaign.TenDot}\" đã bị hủy. Đăng ký của bạn đã được hủy tự động. Mong bạn tham gia các đợt tiếp theo.",
                        Loai = LoaiThongBao.ThongBaoChung
                    });
                }
            }

            await _db.SaveChangesAsync();
            return (true, null);
        }
    }
}
