using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    public interface IInventoryService
    {
        Task<List<BloodUnitDto>> GetUnitsAsync(string? nhomMau, string? trangThai, bool? sapHetHan,
            string? heRh = null, string? thanhPhan = null, string? keyword = null);
        Task<List<InventorySummaryDto>> GetSummaryAsync();
        Task<InventoryAlertsDto> GetAlertsAsync();
        Task<IssueSuggestionDto> SuggestAsync(string nhomMau, string heRh, string thanhPhan, decimal soLuong);
        Task<(bool success, string? error, PhieuXuatKhoDto? data)> IssueAsync(int nhanVienId, IssueRequestDto request);
        Task<List<PhieuXuatKhoDto>> GetIssuesAsync(DateTime? tuNgay, DateTime? denNgay, int? coSoYTeId);
        Task<PhieuXuatKhoDto?> GetIssueByIdAsync(int id);
        Task<(bool success, string? error)> DiscardAsync(int khoMauId);
        Task<(bool success, string? error)> UpdateLocationAsync(int khoMauId, string viTri);
        Task MarkExpiredUnitsAsync(); // chạy mỗi lần load để cập nhật trạng thái hết hạn
    }

    public class InventoryService : IInventoryService
    {
        private readonly AppDbContext _db;

        // Ngưỡng mặc định khi chưa cấu hình cho nhóm máu (ml)
        public const decimal NguongCanhBaoThieu = 2000m;
        public const int SoNgayCanhBaoSapHetHan = DonationRules.SoNgayCanhBaoSapHetHan;

        public InventoryService(AppDbContext db) => _db = db;

        public async Task MarkExpiredUnitsAsync()
        {
            var today = DateTime.Now.Date;
            var expired = await _db.KhoMaus
                .Where(k => k.TrangThai == TrangThaiKhoMau.ConKho && k.HanSuDung < today)
                .ToListAsync();

            if (expired.Count == 0) return;
            foreach (var unit in expired) unit.TrangThai = TrangThaiKhoMau.HetHan;
            await _db.SaveChangesAsync();
        }

        // Ngưỡng cảnh báo theo từng tổ hợp nhóm máu + Rh (bảng CauHinhNhomMau)
        private async Task<Dictionary<string, decimal>> GetThresholdsAsync()
        {
            var list = await _db.CauHinhNhomMaus.ToListAsync();
            return list.ToDictionary(x => x.NhomMau + x.HeRh, x => x.NguongCanhBao);
        }

        private static IQueryable<BloodUnitDto> Project(IQueryable<KhoMau> query, DateTime today) =>
            query.Select(k => new BloodUnitDto
            {
                Id = k.Id,
                MaLoMau = k.MaLoMau,
                NhomMau = k.NhomMau,
                HeRh = k.HeRh,
                ThanhPhanMau = k.ThanhPhanMau,
                SoLuong = k.SoLuong,
                NgayNhap = k.TiepNhanMau!.NgayLayMau,
                HanSuDung = k.HanSuDung,
                ViTriLuuTru = k.ViTriLuuTru,
                TrangThai = k.TrangThai,
                HoTenNguoiHien = k.TiepNhanMau!.KhamSangLoc!.DangKyHienMau!.NguoiHienMau!.HoTen
            });

        public async Task<List<BloodUnitDto>> GetUnitsAsync(string? nhomMau, string? trangThai, bool? sapHetHan,
            string? heRh = null, string? thanhPhan = null, string? keyword = null)
        {
            await MarkExpiredUnitsAsync();

            var query = _db.KhoMaus.AsQueryable();
            if (!string.IsNullOrWhiteSpace(nhomMau)) query = query.Where(k => k.NhomMau == nhomMau);
            if (!string.IsNullOrWhiteSpace(heRh)) query = query.Where(k => k.HeRh == heRh);
            if (!string.IsNullOrWhiteSpace(thanhPhan)) query = query.Where(k => k.ThanhPhanMau == thanhPhan);
            if (!string.IsNullOrWhiteSpace(trangThai)) query = query.Where(k => k.TrangThai == trangThai);
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim();
                query = query.Where(k => k.MaLoMau.Contains(kw) || (k.ViTriLuuTru != null && k.ViTriLuuTru.Contains(kw)));
            }

            var today = DateTime.Now.Date;
            if (sapHetHan == true)
            {
                var limit = today.AddDays(SoNgayCanhBaoSapHetHan);
                query = query.Where(k => k.TrangThai == TrangThaiKhoMau.ConKho && k.HanSuDung <= limit);
            }

            var units = await Project(query.OrderBy(k => k.HanSuDung), today).ToListAsync();
            // Tính số ngày còn lại phía C# (đơn giản, không phụ thuộc hàm SQL)
            foreach (var u in units) u.SoNgayConLai = (int)(u.HanSuDung.Date - today).TotalDays;
            return units;
        }

        public async Task<List<InventorySummaryDto>> GetSummaryAsync()
        {
            await MarkExpiredUnitsAsync();
            var limit = DateTime.Now.Date.AddDays(SoNgayCanhBaoSapHetHan);
            var thresholds = await GetThresholdsAsync();

            // Chỉ dùng Sum/Count/Min trong GroupBy (chắc chắn dịch được sang SQL);
            // phần so sánh ngưỡng làm phía C#.
            var raw = await _db.KhoMaus
                .Where(k => k.TrangThai == TrangThaiKhoMau.ConKho)
                .GroupBy(k => new { k.NhomMau, k.HeRh, k.ThanhPhanMau })
                .Select(g => new
                {
                    g.Key.NhomMau,
                    g.Key.HeRh,
                    g.Key.ThanhPhanMau,
                    Tong = g.Sum(k => k.SoLuong),
                    SoLo = g.Count(),
                    HanGanNhat = g.Min(k => k.HanSuDung)
                }).ToListAsync();

            // Tổng tồn kho của cả nhóm máu (mọi thành phần) dùng để so với ngưỡng
            var tongTheoNhom = raw.GroupBy(x => x.NhomMau.Trim() + x.HeRh).ToDictionary(g => g.Key, g => g.Sum(x => x.Tong));

            return raw
                .OrderBy(x => x.NhomMau).ThenBy(x => x.HeRh).ThenBy(x => x.ThanhPhanMau)
                .Select(x =>
                {
                    var key = x.NhomMau.Trim() + x.HeRh;
                    var nguong = thresholds.GetValueOrDefault(key, NguongCanhBaoThieu);
                    return new InventorySummaryDto
                    {
                        NhomMau = x.NhomMau.Trim(),
                        HeRh = x.HeRh,
                        ThanhPhanMau = x.ThanhPhanMau,
                        TongSoLuong = x.Tong,
                        SoLo = x.SoLo,
                        CanhBaoThieu = tongTheoNhom[key] < nguong,
                        CoLoSapHetHan = x.HanGanNhat <= limit
                    };
                }).ToList();
        }

        public async Task<InventoryAlertsDto> GetAlertsAsync()
        {
            await MarkExpiredUnitsAsync();
            var groups = await CatalogService.BuildBloodGroupsAsync(_db);

            return new InventoryAlertsDto
            {
                NhomMauThieu = groups.Where(g => g.CanhBaoThieu).OrderBy(g => g.TonKho / (g.NguongCanhBao == 0 ? 1 : g.NguongCanhBao)).ToList(),
                LoSapHetHan = await GetUnitsAsync(null, null, true),
                SoNgayCanhBao = SoNgayCanhBaoSapHetHan
            };
        }

        // FEFO: chọn các lô cùng nhóm máu/Rh/thành phần, hạn dùng gần nhất trước, cho đến khi đủ số lượng
        public async Task<IssueSuggestionDto> SuggestAsync(string nhomMau, string heRh, string thanhPhan, decimal soLuong)
        {
            var units = await GetUnitsAsync(nhomMau, TrangThaiKhoMau.ConKho, null, heRh, thanhPhan);
            var result = new IssueSuggestionDto { SoLuongYeuCau = soLuong };

            var conLai = soLuong;
            foreach (var u in units.OrderBy(u => u.HanSuDung).ThenBy(u => u.SoLuong))
            {
                if (conLai <= 0) break;
                var lay = Math.Min(conLai, u.SoLuong);
                result.ChiTiet.Add(new IssueSuggestionItemDto { Lo = u, SoLuongXuat = lay });
                conLai -= lay;
            }

            result.SoLuongDapUng = soLuong - Math.Max(conLai, 0);
            result.DuSoLuong = conLai <= 0;
            return result;
        }

        // Kiểm tra TOÀN BỘ phiếu trước, chỉ ghi dữ liệu khi mọi lô đều hợp lệ -> không để lại phiếu "mồ côi".
        public async Task<(bool success, string? error, PhieuXuatKhoDto? data)> IssueAsync(int nhanVienId, IssueRequestDto request)
        {
            if (request.ChiTiet == null || request.ChiTiet.Count == 0)
                return (false, "Phiếu xuất kho phải có ít nhất 1 lô máu.", null);

            var nhanVien = await _db.NhanViens.FindAsync(nhanVienId);
            if (nhanVien == null)
                return (false, "Không xác định được nhân viên lập phiếu.", null);

            // Nơi nhận: ưu tiên cơ sở y tế trong danh mục, nếu không có thì dùng tên nhập tay
            string noiNhan;
            CoSoYTe? coSo = null;
            if (request.CoSoYTeId.HasValue)
            {
                coSo = await _db.CoSoYTes.FindAsync(request.CoSoYTeId.Value);
                if (coSo == null || !coSo.TrangThai) return (false, "Cơ sở y tế không tồn tại hoặc đã ngừng hợp tác.", null);
                noiNhan = coSo.TenCoSo;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(request.NoiNhan))
                    return (false, "Vui lòng chọn cơ sở y tế nhận máu.", null);
                noiNhan = request.NoiNhan.Trim();
            }

            // Gộp các dòng trùng lô (nếu có) để kiểm tra tổng số lượng yêu cầu của từng lô
            var requested = request.ChiTiet
                .GroupBy(i => i.KhoMauId)
                .Select(g => new { KhoMauId = g.Key, SoLuong = g.Sum(x => x.SoLuong) })
                .ToList();

            var ids = requested.Select(r => r.KhoMauId).ToList();
            var units = await _db.KhoMaus.Where(k => ids.Contains(k.Id)).ToDictionaryAsync(k => k.Id);
            var today = DateTime.Now.Date;

            foreach (var item in requested)
            {
                if (item.SoLuong <= 0)
                    return (false, "Số lượng xuất phải lớn hơn 0.", null);

                if (!units.TryGetValue(item.KhoMauId, out var unit))
                    return (false, $"Không tìm thấy lô máu #{item.KhoMauId}.", null);

                if (unit.TrangThai != TrangThaiKhoMau.ConKho)
                    return (false, $"Lô máu {unit.MaLoMau} không còn khả dụng để xuất.", null);

                if (unit.HanSuDung.Date < today)
                    return (false, $"Lô máu {unit.MaLoMau} đã hết hạn sử dụng, không thể xuất.", null);

                if (item.SoLuong > unit.SoLuong)
                    return (false, $"Số lượng xuất ({item.SoLuong}ml) vượt quá tồn kho của lô {unit.MaLoMau} ({unit.SoLuong}ml).", null);
            }

            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var phieu = new PhieuXuatKho
                {
                    NhanVienId = nhanVienId,
                    CoSoYTeId = coSo?.Id,
                    NoiNhan = noiNhan,
                    LyDo = InputValidator.NormalizeOptional(request.LyDo)
                };

                var chiTietList = new List<ChiTietXuatDto>();
                foreach (var item in requested)
                {
                    var unit = units[item.KhoMauId];

                    phieu.ChiTietXuatKhos.Add(new ChiTietXuatKho
                    {
                        KhoMauId = unit.Id,
                        SoLuong = item.SoLuong
                    });

                    unit.SoLuong -= item.SoLuong;
                    if (unit.SoLuong <= 0) unit.TrangThai = TrangThaiKhoMau.DaXuat;

                    chiTietList.Add(new ChiTietXuatDto
                    {
                        KhoMauId = unit.Id,
                        MaLoMau = unit.MaLoMau,
                        NhomMau = unit.NhomMau,
                        HeRh = unit.HeRh,
                        ThanhPhanMau = unit.ThanhPhanMau,
                        SoLuong = item.SoLuong
                    });
                }

                _db.PhieuXuatKhos.Add(phieu);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                return (true, null, new PhieuXuatKhoDto
                {
                    Id = phieu.Id,
                    CoSoYTeId = phieu.CoSoYTeId,
                    NoiNhan = phieu.NoiNhan,
                    NgayXuat = phieu.NgayXuat,
                    LyDo = phieu.LyDo,
                    NhanVienThucHien = nhanVien.HoTen,
                    TongSoLuong = chiTietList.Sum(c => c.SoLuong),
                    ChiTiet = chiTietList
                });
            }
            catch
            {
                await tx.RollbackAsync();
                return (false, "Có lỗi xảy ra khi xuất kho. Giao dịch đã được hoàn tác.", null);
            }
        }

        private static IQueryable<PhieuXuatKhoDto> ProjectIssues(IQueryable<PhieuXuatKho> query) =>
            query.Select(p => new PhieuXuatKhoDto
            {
                Id = p.Id,
                CoSoYTeId = p.CoSoYTeId,
                NoiNhan = p.NoiNhan,
                NgayXuat = p.NgayXuat,
                LyDo = p.LyDo,
                NhanVienThucHien = p.NhanVien!.HoTen,
                TongSoLuong = p.ChiTietXuatKhos.Sum(c => c.SoLuong),
                ChiTiet = p.ChiTietXuatKhos.Select(c => new ChiTietXuatDto
                {
                    KhoMauId = c.KhoMauId,
                    MaLoMau = c.KhoMau!.MaLoMau,
                    NhomMau = c.KhoMau!.NhomMau,
                    HeRh = c.KhoMau!.HeRh,
                    ThanhPhanMau = c.KhoMau!.ThanhPhanMau,
                    SoLuong = c.SoLuong
                }).ToList()
            });

        public async Task<List<PhieuXuatKhoDto>> GetIssuesAsync(DateTime? tuNgay, DateTime? denNgay, int? coSoYTeId)
        {
            var query = _db.PhieuXuatKhos.AsQueryable();
            if (tuNgay.HasValue) query = query.Where(p => p.NgayXuat >= tuNgay.Value.Date);
            if (denNgay.HasValue) query = query.Where(p => p.NgayXuat < denNgay.Value.Date.AddDays(1));
            if (coSoYTeId.HasValue) query = query.Where(p => p.CoSoYTeId == coSoYTeId.Value);

            var list = await ProjectIssues(query.OrderByDescending(p => p.NgayXuat)).ToListAsync();
            foreach (var p in list) foreach (var c in p.ChiTiet) c.NhomMau = c.NhomMau.Trim();
            return list;
        }

        public async Task<PhieuXuatKhoDto?> GetIssueByIdAsync(int id)
        {
            var p = await ProjectIssues(_db.PhieuXuatKhos.Where(x => x.Id == id)).FirstOrDefaultAsync();
            if (p != null) foreach (var c in p.ChiTiet) c.NhomMau = c.NhomMau.Trim();
            return p;
        }

        // Hủy bỏ lô máu không dùng được (vỡ túi, nhiễm khuẩn, không đạt xét nghiệm...). Chỉ áp dụng cho lô còn trong kho.
        public async Task<(bool success, string? error)> DiscardAsync(int khoMauId)
        {
            var unit = await _db.KhoMaus.FindAsync(khoMauId);
            if (unit == null) return (false, "Không tìm thấy lô máu.");
            if (unit.TrangThai != TrangThaiKhoMau.ConKho)
                return (false, $"Lô máu {unit.MaLoMau} không ở trạng thái còn trong kho nên không thể hủy bỏ.");

            unit.TrangThai = TrangThaiKhoMau.HuyBo;
            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(bool success, string? error)> UpdateLocationAsync(int khoMauId, string viTri)
        {
            var unit = await _db.KhoMaus.FindAsync(khoMauId);
            if (unit == null) return (false, "Không tìm thấy lô máu.");
            if (unit.TrangThai != TrangThaiKhoMau.ConKho)
                return (false, "Chỉ cập nhật vị trí cho lô máu còn trong kho.");

            unit.ViTriLuuTru = viTri.Trim();
            await _db.SaveChangesAsync();
            return (true, null);
        }
    }
}
