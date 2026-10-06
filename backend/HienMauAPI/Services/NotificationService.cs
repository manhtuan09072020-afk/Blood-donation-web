using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    public interface INotificationService
    {
        Task<List<NotificationDto>> GetByDonorAsync(int nguoiHienId);
        Task<int> CountUnreadAsync(int nguoiHienId);
        Task<bool> MarkAsReadAsync(int id, int nguoiHienId);
        Task<int> MarkAllAsReadAsync(int nguoiHienId);

        Task<(bool success, string? error, SendResultDto? data)> SendCallForDonationAsync(int? nhanVienId, SendCallForDonationRequest request, bool tuDong = false);
        Task<(bool success, string? error, SendResultDto? data)> SendReminderAsync(int? nhanVienId, SendReminderRequest request, bool tuDong = false);
        Task<(bool success, string? error, SendResultDto? data)> SendGeneralAsync(int? nhanVienId, SendGeneralRequest request);
        Task<(bool success, string? error, SendResultDto? data)> SendPeriodicReminderAsync(int? nhanVienId, bool tuDong = false);

        Task<List<OutreachCampaignDto>> GetCampaignsAsync(string? loai);
        Task<OutreachDetailDto?> GetCampaignDetailAsync(int id);

        Task<int> RunAutomationAsync(); // Nhắc lịch trước ngày hiến, nhắc định kỳ, kêu gọi khi thiếu máu
    }

    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _db;
        public NotificationService(AppDbContext db) => _db = db;

        public const string TieuDeNhacDinhKy = "Bạn đã có thể hiến máu trở lại";

        // ===================== PHÍA NGƯỜI HIẾN =====================

        public async Task<List<NotificationDto>> GetByDonorAsync(int nguoiHienId)
        {
            return await _db.ThongBaos
                .Where(t => t.NguoiNhanId == nguoiHienId)
                .OrderByDescending(t => t.NgayGui).ThenByDescending(t => t.Id)
                .Select(t => new NotificationDto
                {
                    Id = t.Id, TieuDe = t.TieuDe, NoiDung = t.NoiDung,
                    Loai = t.Loai, NgayGui = t.NgayGui, DaDoc = t.DaDoc,
                    DotId = t.ChienDich != null ? t.ChienDich.DotId : null
                }).ToListAsync();
        }

        public Task<int> CountUnreadAsync(int nguoiHienId)
            => _db.ThongBaos.CountAsync(t => t.NguoiNhanId == nguoiHienId && !t.DaDoc);

        public async Task<bool> MarkAsReadAsync(int id, int nguoiHienId)
        {
            var noti = await _db.ThongBaos.FirstOrDefaultAsync(t => t.Id == id && t.NguoiNhanId == nguoiHienId);
            if (noti == null) return false;
            noti.DaDoc = true;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<int> MarkAllAsReadAsync(int nguoiHienId)
        {
            var list = await _db.ThongBaos.Where(t => t.NguoiNhanId == nguoiHienId && !t.DaDoc).ToListAsync();
            foreach (var t in list) t.DaDoc = true;
            await _db.SaveChangesAsync();
            return list.Count;
        }

        // ===================== GỬI THÔNG BÁO HÀNG LOẠT =====================

        private async Task<SendResultDto> CreateCampaignAsync(ChienDichVanDong campaign, List<int> recipientIds, string message)
        {
            campaign.SoNguoiNhan = recipientIds.Count;
            foreach (var id in recipientIds)
            {
                campaign.ThongBaos.Add(new ThongBao
                {
                    NguoiNhanId = id,
                    TieuDe = campaign.TieuDe,
                    NoiDung = campaign.NoiDung,
                    Loai = campaign.Loai,
                    NgayGui = campaign.NgayGui
                });
            }
            _db.ChienDichVanDongs.Add(campaign);
            await _db.SaveChangesAsync();
            return new SendResultDto { Message = message, SoNguoiNhan = recipientIds.Count, ChienDichId = campaign.Id };
        }

        // Danh sách Id người hiến đã đủ 12 tuần kể từ lần lấy máu gần nhất (hoặc chưa từng hiến)
        private async Task<HashSet<int>> GetIneligibleDonorIdsAsync()
        {
            var cutoff = DateTime.Now.Date.AddDays(-DonationRules.SoNgayToiThieuGiua2LanHien);
            var ids = await _db.TiepNhanMaus
                .Where(t => t.NgayLayMau > cutoff)
                .Select(t => t.KhamSangLoc!.DangKyHienMau!.NguoiHienId)
                .Distinct().ToListAsync();
            return ids.ToHashSet();
        }

        public async Task<(bool success, string? error, SendResultDto? data)> SendCallForDonationAsync(int? nhanVienId, SendCallForDonationRequest request, bool tuDong = false)
        {
            var nhomMau = request.NhomMau?.Trim() ?? "TatCa";
            var heRh = InputValidator.NormalizeOptional(request.HeRh);
            if (nhomMau != "TatCa" && !InputValidator.NhomMaus.Contains(nhomMau))
                return (false, "Nhóm máu không hợp lệ.", null);
            if (heRh != null && !InputValidator.HeRhs.Contains(heRh))
                return (false, "Hệ Rh không hợp lệ.", null);

            var query = _db.NguoiHienMaus.Where(d => d.TrangThai);
            if (nhomMau != "TatCa") query = query.Where(d => d.NhomMau == nhomMau);
            if (heRh != null) query = query.Where(d => d.HeRh == heRh);

            var donors = await query.Select(d => d.Id).ToListAsync();
            if (request.ChiNguoiDuDieuKien)
            {
                var ineligible = await GetIneligibleDonorIdsAsync();
                donors = donors.Where(id => !ineligible.Contains(id)).ToList();
            }
            if (donors.Count == 0) return (false, "Không tìm thấy người hiến máu phù hợp để gửi.", null);

            var result = await CreateCampaignAsync(new ChienDichVanDong
            {
                TieuDe = request.TieuDe.Trim(),
                NoiDung = request.NoiDung.Trim(),
                Loai = LoaiThongBao.KeuGoiHienMau,
                NhomMauMucTieu = nhomMau == "TatCa" ? null : nhomMau,
                HeRhMucTieu = heRh,
                DotId = request.DotId,
                NguoiTaoId = nhanVienId,
                TuDong = tuDong
            }, donors, $"Đã gửi thông báo kêu gọi hiến máu đến {donors.Count} người.");
            return (true, null, result);
        }

        public async Task<(bool success, string? error, SendResultDto? data)> SendReminderAsync(int? nhanVienId, SendReminderRequest request, bool tuDong = false)
        {
            var dot = await _db.DotHienMaus.FindAsync(request.DotId);
            if (dot == null) return (false, "Không tìm thấy đợt hiến máu.", null);

            var recipients = await _db.DangKyHienMaus
                .Where(r => r.DotId == request.DotId && (r.TrangThai == TrangThaiDangKy.ChoDuyet || r.TrangThai == TrangThaiDangKy.DaDuyet))
                .Select(r => r.NguoiHienId)
                .Distinct()
                .ToListAsync();

            if (recipients.Count == 0) return (false, "Không có người đăng ký nào cần nhắc lịch trong đợt này.", null);

            var result = await CreateCampaignAsync(new ChienDichVanDong
            {
                TieuDe = request.TieuDe.Trim(),
                NoiDung = request.NoiDung.Trim(),
                Loai = LoaiThongBao.NhacLich,
                DotId = dot.Id,
                NguoiTaoId = nhanVienId,
                TuDong = tuDong
            }, recipients, $"Đã gửi nhắc lịch đến {recipients.Count} người.");
            return (true, null, result);
        }

        public async Task<(bool success, string? error, SendResultDto? data)> SendGeneralAsync(int? nhanVienId, SendGeneralRequest request)
        {
            var donors = await _db.NguoiHienMaus.Where(d => d.TrangThai).Select(d => d.Id).ToListAsync();
            if (donors.Count == 0) return (false, "Chưa có người hiến máu nào.", null);

            var result = await CreateCampaignAsync(new ChienDichVanDong
            {
                TieuDe = request.TieuDe.Trim(),
                NoiDung = request.NoiDung.Trim(),
                Loai = LoaiThongBao.ThongBaoChung,
                NguoiTaoId = nhanVienId
            }, donors, $"Đã gửi thông báo đến {donors.Count} người.");
            return (true, null, result);
        }

        // Nhắc lịch hiến máu định kỳ: người đã hiến đủ 12 tuần trước và chưa được nhắc kể từ lần hiến đó
        public async Task<(bool success, string? error, SendResultDto? data)> SendPeriodicReminderAsync(int? nhanVienId, bool tuDong = false)
        {
            var cutoff = DateTime.Now.Date.AddDays(-DonationRules.SoNgayToiThieuGiua2LanHien);

            var lastDonations = await _db.TiepNhanMaus
                .GroupBy(t => t.KhamSangLoc!.DangKyHienMau!.NguoiHienId)
                .Select(g => new { NguoiHienId = g.Key, LanCuoi = g.Max(t => t.NgayLayMau) })
                .ToListAsync();

            var candidates = lastDonations.Where(x => x.LanCuoi <= cutoff).ToList();
            if (candidates.Count == 0) return (false, "Hiện chưa có người hiến nào đến hạn hiến máu lại.", null);

            var ids = candidates.Select(c => c.NguoiHienId).ToList();
            var activeIds = (await _db.NguoiHienMaus.Where(d => d.TrangThai && ids.Contains(d.Id)).Select(d => d.Id).ToListAsync()).ToHashSet();

            // Đã nhắc sau lần hiến gần nhất thì không nhắc lại; người đang có đăng ký còn hiệu lực cũng bỏ qua
            var reminded = await _db.ThongBaos
                .Where(t => ids.Contains(t.NguoiNhanId) && t.Loai == LoaiThongBao.NhacLich && t.TieuDe == TieuDeNhacDinhKy)
                .GroupBy(t => t.NguoiNhanId)
                .Select(g => new { Id = g.Key, Lan = g.Max(t => t.NgayGui) })
                .ToDictionaryAsync(x => x.Id, x => x.Lan);
            var today = DateTime.Now.Date;
            var dangDangKy = (await _db.DangKyHienMaus
                .Where(r => ids.Contains(r.NguoiHienId) && (r.TrangThai == TrangThaiDangKy.ChoDuyet || r.TrangThai == TrangThaiDangKy.DaDuyet)
                    && r.DotHienMau!.NgayKetThuc >= today)
                .Select(r => r.NguoiHienId).ToListAsync()).ToHashSet();

            var recipients = candidates
                .Where(c => activeIds.Contains(c.NguoiHienId) && !dangDangKy.Contains(c.NguoiHienId)
                    && (!reminded.TryGetValue(c.NguoiHienId, out var lan) || lan < c.LanCuoi))
                .Select(c => c.NguoiHienId).ToList();

            if (recipients.Count == 0) return (false, "Tất cả người đến hạn đều đã được nhắc.", null);

            var dotSapToi = await _db.DotHienMaus
                .Where(d => d.TrangThai == TrangThaiDot.SapDienRa || d.TrangThai == TrangThaiDot.DangDienRa)
                .OrderBy(d => d.NgayBatDau)
                .Include(d => d.DiemHienMau)
                .FirstOrDefaultAsync();

            var noiDung = "Đã đủ 12 tuần kể từ lần hiến máu gần nhất của bạn. Sức khỏe của bạn đã sẵn sàng cho lần hiến tiếp theo!";
            if (dotSapToi != null)
                noiDung += $" Mời bạn tham gia \"{dotSapToi.TenDot}\" ngày {dotSapToi.NgayBatDau:dd/MM/yyyy} tại {dotSapToi.DiemHienMau?.TenDiem}.";

            var result = await CreateCampaignAsync(new ChienDichVanDong
            {
                TieuDe = TieuDeNhacDinhKy,
                NoiDung = noiDung.Length > 500 ? noiDung[..500] : noiDung,
                Loai = LoaiThongBao.NhacLich,
                DotId = dotSapToi?.Id,
                NguoiTaoId = nhanVienId,
                TuDong = tuDong
            }, recipients, $"Đã gửi nhắc lịch định kỳ đến {recipients.Count} người.");
            return (true, null, result);
        }

        // ===================== LỊCH SỬ CHIẾN DỊCH =====================

        public async Task<List<OutreachCampaignDto>> GetCampaignsAsync(string? loai)
        {
            var query = _db.ChienDichVanDongs.AsQueryable();
            if (!string.IsNullOrWhiteSpace(loai)) query = query.Where(c => c.Loai == loai);

            return await query
                .OrderByDescending(c => c.NgayGui)
                .Select(c => new OutreachCampaignDto
                {
                    Id = c.Id,
                    TieuDe = c.TieuDe,
                    NoiDung = c.NoiDung,
                    Loai = c.Loai,
                    NhomMauMucTieu = c.NhomMauMucTieu,
                    HeRhMucTieu = c.HeRhMucTieu,
                    DotId = c.DotId,
                    TenDot = c.DotHienMau != null ? c.DotHienMau.TenDot : null,
                    NguoiTao = c.TuDong ? "Hệ thống (tự động)" : (c.NguoiTao != null ? c.NguoiTao.HoTen : "Hệ thống"),
                    NgayGui = c.NgayGui,
                    SoNguoiNhan = c.SoNguoiNhan,
                    SoDaDoc = c.ThongBaos.Count(t => t.DaDoc),
                    TuDong = c.TuDong
                }).ToListAsync();
        }

        public async Task<OutreachDetailDto?> GetCampaignDetailAsync(int id)
        {
            var c = await _db.ChienDichVanDongs
                .Include(x => x.DotHienMau).Include(x => x.NguoiTao)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (c == null) return null;

            var recipients = await _db.ThongBaos
                .Where(t => t.ChienDichId == id)
                .Select(t => new OutreachRecipientDto
                {
                    NguoiHienId = t.NguoiNhanId,
                    HoTen = t.NguoiHienMau!.HoTen,
                    NhomMau = t.NguoiHienMau!.NhomMau,
                    HeRh = t.NguoiHienMau!.HeRh,
                    SoDienThoai = t.NguoiHienMau!.SoDienThoai,
                    DaDoc = t.DaDoc
                }).ToListAsync();

            return new OutreachDetailDto
            {
                Id = c.Id,
                TieuDe = c.TieuDe,
                NoiDung = c.NoiDung,
                Loai = c.Loai,
                NhomMauMucTieu = c.NhomMauMucTieu,
                HeRhMucTieu = c.HeRhMucTieu,
                DotId = c.DotId,
                TenDot = c.DotHienMau?.TenDot,
                NguoiTao = c.TuDong ? "Hệ thống (tự động)" : (c.NguoiTao?.HoTen ?? "Hệ thống"),
                NgayGui = c.NgayGui,
                SoNguoiNhan = c.SoNguoiNhan,
                SoDaDoc = recipients.Count(r => r.DaDoc),
                TuDong = c.TuDong,
                NguoiNhan = recipients
            };
        }

        // ===================== TỰ ĐỘNG HÓA (chạy nền định kỳ) =====================

        public async Task<int> RunAutomationAsync()
        {
            var total = 0;
            var now = DateTime.Now;

            // 1. Nhắc lịch cho người đã đăng ký các đợt diễn ra trong 2 ngày tới (mỗi đợt chỉ nhắc tự động 1 lần)
            var upcoming = await _db.DotHienMaus
                .Include(d => d.DiemHienMau)
                .Where(d => d.TrangThai == TrangThaiDot.SapDienRa && d.NgayBatDau >= now && d.NgayBatDau <= now.AddDays(2))
                .ToListAsync();
            foreach (var dot in upcoming)
            {
                var daNhac = await _db.ChienDichVanDongs.AnyAsync(c => c.DotId == dot.Id && c.Loai == LoaiThongBao.NhacLich && c.TuDong);
                if (daNhac) continue;

                var (ok, _, data) = await SendReminderAsync(null, new SendReminderRequest
                {
                    DotId = dot.Id,
                    TieuDe = $"Nhắc lịch: {dot.TenDot}",
                    NoiDung = $"Bạn có lịch hiến máu lúc {dot.NgayBatDau:HH:mm} ngày {dot.NgayBatDau:dd/MM/yyyy} tại {dot.DiemHienMau?.TenDiem} ({dot.DiemHienMau?.DiaChi}). " +
                              "Hãy ăn nhẹ, ngủ đủ giấc, không uống rượu bia và mang theo CCCD."
                }, tuDong: true);
                if (ok) total += data!.SoNguoiNhan;
            }

            // 2. Nhắc hiến máu định kỳ cho người đã đủ 12 tuần
            var (okPeriodic, _, periodic) = await SendPeriodicReminderAsync(null, tuDong: true);
            if (okPeriodic) total += periodic!.SoNguoiNhan;

            // 3. Nhóm máu dưới ngưỡng -> kêu gọi người hiến cùng nhóm (tối đa 1 lần / 3 ngày / nhóm máu)
            var groups = await CatalogService.BuildBloodGroupsAsync(_db);
            foreach (var g in groups.Where(g => g.CanhBaoThieu && g.SoNguoiHien > 0))
            {
                var since = now.AddDays(-3);
                var daGoi = await _db.ChienDichVanDongs.AnyAsync(c => c.Loai == LoaiThongBao.KeuGoiHienMau
                    && c.NhomMauMucTieu == g.NhomMau && c.HeRhMucTieu == g.HeRh && c.NgayGui >= since);
                if (daGoi) continue;

                var dot = await _db.DotHienMaus
                    .Where(d => d.TrangThai == TrangThaiDot.SapDienRa || d.TrangThai == TrangThaiDot.DangDienRa)
                    .OrderBy(d => d.NgayBatDau).FirstOrDefaultAsync();

                var noiDung = $"Kho máu đang thiếu nhóm {g.NhomMau} {g.HeRh} (còn {g.TonKho:0} ml, ngưỡng an toàn {g.NguongCanhBao:0} ml). " +
                              "Bạn có cùng nhóm máu - sự giúp đỡ của bạn lúc này vô cùng quý giá!";
                if (dot != null) noiDung += $" Mời bạn đăng ký \"{dot.TenDot}\" ngày {dot.NgayBatDau:dd/MM/yyyy}.";

                var (ok, _, data) = await SendCallForDonationAsync(null, new SendCallForDonationRequest
                {
                    TieuDe = $"Khẩn cấp: cần máu nhóm {g.NhomMau} {g.HeRh}",
                    NoiDung = noiDung.Length > 500 ? noiDung[..500] : noiDung,
                    NhomMau = g.NhomMau,
                    HeRh = g.HeRh,
                    ChiNguoiDuDieuKien = true,
                    DotId = dot?.Id
                }, tuDong: true);
                if (ok) total += data!.SoNguoiNhan;
            }

            return total;
        }
    }
}
