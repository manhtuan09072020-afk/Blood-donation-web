using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    public interface IReportService
    {
        Task<DashboardStatsDto> GetDashboardStatsAsync();
        Task<List<BloodTypeStatDto>> GetBloodTypeStatsAsync();
        Task<List<MonthlyDonationStatDto>> GetMonthlyStatsAsync(int nam);
        Task<DonorReportDto> GetDonorReportAsync();
        Task<List<CampaignReportDto>> GetCampaignReportAsync(DateTime? tuNgay, DateTime? denNgay);
        Task<IssueReportDto> GetIssueReportAsync(DateTime? tuNgay, DateTime? denNgay);
        Task<InventoryReportDto> GetInventoryReportAsync(DateTime? tuNgay, DateTime? denNgay);
    }

    public class ReportService : IReportService
    {
        private readonly AppDbContext _db;
        private readonly IInventoryService _inventory;

        public ReportService(AppDbContext db, IInventoryService inventory)
        {
            _db = db;
            _inventory = inventory;
        }

        public static string TenThanhPhan(string tp) => tp switch
        {
            "ToanPhan" => "Máu toàn phần",
            "HongCau" => "Hồng cầu lắng",
            "HuyetTuong" => "Huyết tương",
            "TieuCau" => "Tiểu cầu",
            _ => tp
        };

        public async Task<DashboardStatsDto> GetDashboardStatsAsync()
        {
            await _inventory.MarkExpiredUnitsAsync();

            var now = DateTime.Now;
            var firstDayOfMonth = new DateTime(now.Year, now.Month, 1);
            var today = now.Date;
            var limit = today.AddDays(DonationRules.SoNgayCanhBaoSapHetHan);

            var groups = await CatalogService.BuildBloodGroupsAsync(_db);

            return new DashboardStatsDto
            {
                TongNguoiHien = await _db.NguoiHienMaus.CountAsync(d => d.TrangThai),
                NguoiHienMoiThangNay = await _db.NguoiHienMaus.CountAsync(d => d.NgayDangKy >= firstDayOfMonth),
                TongDotHienMauDangDienRa = await _db.DotHienMaus.CountAsync(c => c.TrangThai == TrangThaiDot.DangDienRa),
                SoDotSapDienRa = await _db.DotHienMaus.CountAsync(c => c.TrangThai == TrangThaiDot.SapDienRa),
                TongDangKyThangNay = await _db.DangKyHienMaus.CountAsync(r => r.NgayDangKy >= firstDayOfMonth),
                SoDangKyChoDuyet = await _db.DangKyHienMaus.CountAsync(r => r.TrangThai == TrangThaiDangKy.ChoDuyet),
                SoChoSangLoc = await _db.DangKyHienMaus.CountAsync(r => r.TrangThai == TrangThaiDangKy.DaDuyet),
                SoChoTiepNhan = await _db.KhamSangLocs.CountAsync(k => k.KetQua == "Dat" && k.TiepNhanMau == null),
                SoLuotHienThangNay = await _db.TiepNhanMaus.CountAsync(t => t.NgayLayMau >= firstDayOfMonth),
                TongMauTiepNhanThangNay = await _db.TiepNhanMaus.Where(t => t.NgayLayMau >= firstDayOfMonth).SumAsync(t => (decimal?)t.TheTich) ?? 0,
                TongXuatThangNay = await _db.ChiTietXuatKhos.Where(c => c.PhieuXuatKho!.NgayXuat >= firstDayOfMonth).SumAsync(c => (decimal?)c.SoLuong) ?? 0,
                TongTonKho = groups.Sum(g => g.TonKho),
                SoLoTonKho = groups.Sum(g => g.SoLo),
                SoLoSapHetHan = await _db.KhoMaus.CountAsync(k => k.TrangThai == TrangThaiKhoMau.ConKho && k.HanSuDung >= today && k.HanSuDung <= limit),
                SoNhomMauThieu = groups.Count(g => g.CanhBaoThieu)
            };
        }

        public async Task<List<BloodTypeStatDto>> GetBloodTypeStatsAsync()
        {
            await _inventory.MarkExpiredUnitsAsync();
            var groups = await CatalogService.BuildBloodGroupsAsync(_db);
            return groups.Select(g => new BloodTypeStatDto
            {
                NhomMau = g.NhomMau, HeRh = g.HeRh, TongSoLuong = g.TonKho, NguongCanhBao = g.NguongCanhBao
            }).ToList();
        }

        public async Task<List<MonthlyDonationStatDto>> GetMonthlyStatsAsync(int nam)
        {
            var received = await _db.TiepNhanMaus
                .Where(t => t.NgayLayMau.Year == nam)
                .GroupBy(t => t.NgayLayMau.Month)
                .Select(g => new { Thang = g.Key, SoLuot = g.Count(), Tong = g.Sum(t => t.TheTich) })
                .ToListAsync();

            var issued = await _db.ChiTietXuatKhos
                .Where(c => c.PhieuXuatKho!.NgayXuat.Year == nam)
                .GroupBy(c => c.PhieuXuatKho!.NgayXuat.Month)
                .Select(g => new { Thang = g.Key, SoPhieu = g.Select(c => c.PhieuXuatId).Distinct().Count(), Tong = g.Sum(c => c.SoLuong) })
                .ToListAsync();

            // Đảm bảo đủ 12 tháng để vẽ biểu đồ, kể cả tháng không có dữ liệu
            var result = new List<MonthlyDonationStatDto>();
            for (int m = 1; m <= 12; m++)
            {
                var r = received.FirstOrDefault(x => x.Thang == m);
                var i = issued.FirstOrDefault(x => x.Thang == m);
                result.Add(new MonthlyDonationStatDto
                {
                    Nam = nam,
                    Thang = m,
                    SoLuotHienMau = r?.SoLuot ?? 0,
                    TongTheTich = r?.Tong ?? 0,
                    SoPhieuXuat = i?.SoPhieu ?? 0,
                    TongXuat = i?.Tong ?? 0
                });
            }
            return result;
        }

        public async Task<DonorReportDto> GetDonorReportAsync()
        {
            var donors = await _db.NguoiHienMaus.Where(d => d.TrangThai)
                .Select(d => new { d.Id, d.HoTen, d.NhomMau, d.HeRh, d.GioiTinh, d.NgaySinh, d.NgayDangKy, d.SoDienThoai, d.CCCD })
                .ToListAsync();

            var stats = await _db.TiepNhanMaus
                .GroupBy(t => t.KhamSangLoc!.DangKyHienMau!.NguoiHienId)
                .Select(g => new { Id = g.Key, SoLan = g.Count(), Tong = g.Sum(t => t.TheTich), Max = g.Max(t => t.NgayLayMau) })
                .ToListAsync();

            var report = new DonorReportDto
            {
                TongNguoiHien = donors.Count,
                DaTungHien = stats.Count
            };

            report.TheoNhomMau = donors
                .GroupBy(d => d.NhomMau == null ? "Chưa xác định" : d.NhomMau + d.HeRh)
                .Select(g => new LabelValueDto { Label = g.Key, Value = g.Count() })
                .OrderByDescending(x => x.Value).ToList();

            report.TheoGioiTinh = donors
                .GroupBy(d => d.GioiTinh)
                .Select(g => new LabelValueDto { Label = g.Key, Value = g.Count() }).ToList();

            var ageBands = new (string label, int min, int max)[] { ("18-25", 18, 25), ("26-35", 26, 35), ("36-45", 36, 45), ("46-60", 46, 60), ("Trên 60", 61, 200) };
            report.TheoDoTuoi = ageBands.Select(b => new LabelValueDto
            {
                Label = b.label,
                Value = donors.Count(d => { var a = DonationRules.TinhTuoi(d.NgaySinh); return a >= b.min && a <= b.max; })
            }).ToList();

            var now = DateTime.Now;
            for (int i = 11; i >= 0; i--)
            {
                var month = new DateTime(now.Year, now.Month, 1).AddMonths(-i);
                report.MoiTheoThang.Add(new LabelValueDto
                {
                    Label = $"{month:MM/yyyy}",
                    Value = donors.Count(d => d.NgayDangKy >= month && d.NgayDangKy < month.AddMonths(1))
                });
            }

            report.TopNguoiHien = stats
                .OrderByDescending(s => s.SoLan).ThenByDescending(s => s.Tong).Take(10)
                .Join(donors, s => s.Id, d => d.Id, (s, d) => new DonorDto
                {
                    Id = d.Id, HoTen = d.HoTen, NhomMau = d.NhomMau, HeRh = d.HeRh, GioiTinh = d.GioiTinh,
                    NgaySinh = d.NgaySinh, SoDienThoai = d.SoDienThoai, CCCD = d.CCCD,
                    SoLanHien = s.SoLan, TongTheTich = s.Tong, LanHienGanNhat = s.Max,
                    NgayCoTheHienTiepTheo = DonationRules.NgayCoTheHienTiepTheo(s.Max), TrangThai = true
                }).ToList();

            return report;
        }

        public async Task<List<CampaignReportDto>> GetCampaignReportAsync(DateTime? tuNgay, DateTime? denNgay)
        {
            var query = _db.DotHienMaus.AsQueryable();
            if (tuNgay.HasValue) query = query.Where(d => d.NgayBatDau >= tuNgay.Value.Date);
            if (denNgay.HasValue) query = query.Where(d => d.NgayBatDau < denNgay.Value.Date.AddDays(1));

            return await query
                .OrderByDescending(d => d.NgayBatDau)
                .Select(d => new CampaignReportDto
                {
                    DotId = d.Id,
                    TenDot = d.TenDot,
                    TenDiem = d.DiemHienMau!.TenDiem,
                    NgayBatDau = d.NgayBatDau,
                    TrangThai = d.TrangThai,
                    SoLuongDuKien = d.SoLuongDuKien,
                    SoDangKy = d.DangKyHienMaus.Count(r => r.TrangThai != TrangThaiDangKy.Huy),
                    SoDaSangLoc = d.DangKyHienMaus.Count(r => r.KhamSangLoc != null),
                    SoDat = d.DangKyHienMaus.Count(r => r.KhamSangLoc != null && r.KhamSangLoc.KetQua == "Dat"),
                    SoKhongDat = d.DangKyHienMaus.Count(r => r.KhamSangLoc != null && r.KhamSangLoc.KetQua == "KhongDat"),
                    SoDaHien = d.DangKyHienMaus.Count(r => r.KhamSangLoc != null && r.KhamSangLoc.TiepNhanMau != null),
                    TongTheTich = d.DangKyHienMaus
                        .Where(r => r.KhamSangLoc != null && r.KhamSangLoc.TiepNhanMau != null)
                        .Sum(r => (decimal?)r.KhamSangLoc!.TiepNhanMau!.TheTich) ?? 0
                }).ToListAsync();
        }

        public async Task<IssueReportDto> GetIssueReportAsync(DateTime? tuNgay, DateTime? denNgay)
        {
            var query = _db.ChiTietXuatKhos.AsQueryable();
            if (tuNgay.HasValue) query = query.Where(c => c.PhieuXuatKho!.NgayXuat >= tuNgay.Value.Date);
            if (denNgay.HasValue) query = query.Where(c => c.PhieuXuatKho!.NgayXuat < denNgay.Value.Date.AddDays(1));

            var rows = await query.Select(c => new
            {
                c.PhieuXuatId,
                NoiNhan = c.PhieuXuatKho!.NoiNhan,
                c.KhoMau!.NhomMau,
                c.KhoMau!.HeRh,
                c.KhoMau!.ThanhPhanMau,
                c.SoLuong
            }).ToListAsync();

            return new IssueReportDto
            {
                SoPhieu = rows.Select(r => r.PhieuXuatId).Distinct().Count(),
                TongXuat = rows.Sum(r => r.SoLuong),
                TheoCoSo = rows.GroupBy(r => r.NoiNhan)
                    .Select(g => new LabelValueDto { Label = g.Key, Value = g.Sum(x => x.SoLuong) })
                    .OrderByDescending(x => x.Value).ToList(),
                TheoNhomMau = rows.GroupBy(r => r.NhomMau.Trim() + r.HeRh)
                    .Select(g => new LabelValueDto { Label = g.Key, Value = g.Sum(x => x.SoLuong) })
                    .OrderByDescending(x => x.Value).ToList(),
                TheoThanhPhan = rows.GroupBy(r => r.ThanhPhanMau)
                    .Select(g => new LabelValueDto { Label = TenThanhPhan(g.Key), Value = g.Sum(x => x.SoLuong) })
                    .OrderByDescending(x => x.Value).ToList()
            };
        }

        public async Task<InventoryReportDto> GetInventoryReportAsync(DateTime? tuNgay, DateTime? denNgay)
        {
            await _inventory.MarkExpiredUnitsAsync();
            var today = DateTime.Now.Date;
            var limit = today.AddDays(DonationRules.SoNgayCanhBaoSapHetHan);

            var summary = await _inventory.GetSummaryAsync();

            var nhapQuery = _db.TiepNhanMaus.AsQueryable();
            var xuatQuery = _db.ChiTietXuatKhos.AsQueryable();
            if (tuNgay.HasValue)
            {
                nhapQuery = nhapQuery.Where(t => t.NgayLayMau >= tuNgay.Value.Date);
                xuatQuery = xuatQuery.Where(c => c.PhieuXuatKho!.NgayXuat >= tuNgay.Value.Date);
            }
            if (denNgay.HasValue)
            {
                nhapQuery = nhapQuery.Where(t => t.NgayLayMau < denNgay.Value.Date.AddDays(1));
                xuatQuery = xuatQuery.Where(c => c.PhieuXuatKho!.NgayXuat < denNgay.Value.Date.AddDays(1));
            }

            return new InventoryReportDto
            {
                TongTonKho = summary.Sum(s => s.TongSoLuong),
                SoLoConKho = summary.Sum(s => s.SoLo),
                SoLoSapHetHan = await _db.KhoMaus.CountAsync(k => k.TrangThai == TrangThaiKhoMau.ConKho && k.HanSuDung <= limit),
                SoLoHetHan = await _db.KhoMaus.CountAsync(k => k.TrangThai == TrangThaiKhoMau.HetHan),
                SoLoHuyBo = await _db.KhoMaus.CountAsync(k => k.TrangThai == TrangThaiKhoMau.HuyBo),
                TongNhapTrongKy = await nhapQuery.SumAsync(t => (decimal?)t.TheTich) ?? 0,
                TongXuatTrongKy = await xuatQuery.SumAsync(c => (decimal?)c.SoLuong) ?? 0,
                TheoThanhPhan = summary.GroupBy(s => s.ThanhPhanMau)
                    .Select(g => new LabelValueDto { Label = TenThanhPhan(g.Key), Value = g.Sum(x => x.TongSoLuong) }).ToList(),
                ChiTiet = summary
            };
        }
    }
}
