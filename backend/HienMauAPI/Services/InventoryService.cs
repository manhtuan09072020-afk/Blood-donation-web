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
        Task<IssueSuggestionDto> SuggestAsync(string nhomMau, string heRh, string thanhPhan, decimal soLuong, bool choPhepThayThe = false);
        Task<(bool success, string? error, List<BloodUnitDto>? data)> SplitAsync(int khoMauId, List<decimal> theTichs);
        Task<(bool success, string? error, PhieuXuatKhoDto? data)> IssueAsync(int nhanVienId, IssueRequestDto request);
        Task<List<PhieuXuatKhoDto>> GetIssuesAsync(DateTime? tuNgay, DateTime? denNgay, int? coSoYTeId);
        Task<PhieuXuatKhoDto?> GetIssueByIdAsync(int id);
        Task<(bool success, string? error)> DiscardAsync(int khoMauId, int? nhanVienId, string lyDo);
        Task<DiscardResultDto> DiscardExpiredAsync(int? nhanVienId);
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
                HoTenNguoiHien = k.TiepNhanMau!.KhamSangLoc!.DangKyHienMau!.NguoiHienMau!.HoTen,
                LyDoHuy = k.LyDoHuy,
                NgayHuy = k.NgayHuy,
                NguoiHuy = k.NhanVienHuy != null ? k.NhanVienHuy.HoTen : null,
                KhoMauGocId = k.KhoMauGocId,
                MaLoMauGoc = k.KhoMauGoc != null ? k.KhoMauGoc.MaLoMau : null
            });

        // Các trường tính phía C#: số ngày còn lại, mã túi gốc (13 ký tự đầu: LM + yyMMdd + số phiếu), điều kiện bảo quản
        private static List<BloodUnitDto> Complete(List<BloodUnitDto> units, DateTime today)
        {
            foreach (var u in units)
            {
                u.SoNgayConLai = (int)(u.HanSuDung.Date - today).TotalDays;
                u.MaTuiMau = u.MaLoMau.Length >= 13 ? u.MaLoMau[..13] : u.MaLoMau;
                u.DieuKienBaoQuan = ThanhPhanMauNames.DieuKienBaoQuan(u.ThanhPhanMau);
            }
            return units;
        }

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

            return Complete(await Project(query.OrderBy(k => k.HanSuDung), today).ToListAsync(), today);
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

        // Nhóm người cho có thể thay thế khi thiếu đúng nhóm (theo chỉ định bác sĩ), xếp theo thứ tự ưu tiên.
        //  - Khối hồng cầu: tương thích hồng cầu ABO/Rh; O- dùng sau cùng vì là nhóm "cho phổ thông" khan hiếm.
        //  - Huyết tương / tiểu cầu: tương thích huyết tương theo ABO (AB cho được mọi nhóm), không xét Rh.
        //  - Máu toàn phần: bắt buộc cùng nhóm ABO và Rh -> không thay thế.
        public static List<(string NhomMau, string HeRh)> NhomTuongThich(string nhomMau, string heRh, string thanhPhan)
        {
            var abo = new[] { "O", "A", "B", "AB" };
            var rhs = new[] { "Rh+", "Rh-" };
            var all = abo.SelectMany(a => rhs.Select(r => (a, r))).ToList();

            List<(string, string)> list = thanhPhan switch
            {
                ThanhPhanMauNames.HongCau => all.Where(d =>
                        (d.a == "O" || d.a == nhomMau || (nhomMau == "AB" && (d.a == "A" || d.a == "B")))
                        && (heRh == "Rh+" || d.r == "Rh-"))
                    .OrderBy(d => d.a == "O" && d.r == "Rh-" ? 1 : 0).ToList(),
                ThanhPhanMauNames.HuyetTuong or ThanhPhanMauNames.TieuCau => all.Where(d =>
                        d.a == nhomMau || d.a == "AB" || (nhomMau == "O")).ToList(),
                _ => new List<(string, string)>()
            };
            return list.Where(d => !(d.Item1 == nhomMau && d.Item2 == heRh)).ToList();
        }

        // FEFO theo NGUYÊN TÚI: chọn các túi cùng nhóm/Rh/thành phần, hạn dùng gần nhất trước, đến khi tổng thể tích
        // đáp ứng yêu cầu. Không rút một phần túi (đảm bảo hệ kín, vô trùng). Thiếu thì (nếu được phép) bổ sung nhóm tương thích.
        public async Task<IssueSuggestionDto> SuggestAsync(string nhomMau, string heRh, string thanhPhan, decimal soLuong, bool choPhepThayThe = false)
        {
            var result = new IssueSuggestionDto { SoLuongYeuCau = soLuong };
            var thayThe = NhomTuongThich(nhomMau, heRh, thanhPhan);
            if (choPhepThayThe) result.NhomTuongThich = thayThe.Select(t => t.NhomMau + (t.HeRh == "Rh+" ? "+" : "-")).ToList();

            var conLai = soLuong;
            var nguon = new List<(string NhomMau, string HeRh, bool LaThayThe)> { (nhomMau, heRh, false) };
            if (choPhepThayThe) nguon.AddRange(thayThe.Select(t => (t.NhomMau, t.HeRh, true)));

            foreach (var (nm, rh, laThayThe) in nguon)
            {
                if (conLai <= 0) break;
                var units = await GetUnitsAsync(nm, TrangThaiKhoMau.ConKho, null, rh, thanhPhan);
                foreach (var u in units.Where(u => u.SoNgayConLai >= 0).OrderBy(u => u.HanSuDung).ThenBy(u => u.SoLuong))
                {
                    if (conLai <= 0) break;
                    u.LaThayThe = laThayThe;
                    result.ChiTiet.Add(new IssueSuggestionItemDto { Lo = u, SoLuongXuat = u.SoLuong });
                    conLai -= u.SoLuong;
                }
            }

            result.SoLuongDapUng = result.ChiTiet.Sum(c => c.SoLuongXuat);
            result.DuSoLuong = conLai <= 0;
            result.SoTui = result.ChiTiet.Count;
            result.SoTuiThayThe = result.ChiTiet.Count(c => c.Lo.LaThayThe);
            return result;
        }

        // Chia túi vô trùng: dùng thiết bị hàn nối vô trùng (hệ kín) chia 1 túi thành 2-4 túi nhỏ, thường cho bệnh nhi
        // cần lượng ít. Túi nhỏ giữ nguyên nhóm máu, chế phẩm, hạn dùng; mã = mã túi gốc + -A, -B...; túi gốc chuyển "Đã chia".
        public async Task<(bool success, string? error, List<BloodUnitDto>? data)> SplitAsync(int khoMauId, List<decimal> theTichs)
        {
            if (theTichs == null || theTichs.Count < 2 || theTichs.Count > 4)
                return (false, "Mỗi túi chỉ chia thành 2 đến 4 túi nhỏ.", null);
            if (theTichs.Any(v => v < 20))
                return (false, "Thể tích mỗi túi nhỏ tối thiểu 20 ml.", null);

            var unit = await _db.KhoMaus.FindAsync(khoMauId);
            if (unit == null) return (false, "Không tìm thấy đơn vị máu.", null);
            if (unit.TrangThai != TrangThaiKhoMau.ConKho) return (false, $"Đơn vị {unit.MaLoMau} không còn trong kho.", null);
            if (unit.HanSuDung.Date < DateTime.Now.Date) return (false, $"Đơn vị {unit.MaLoMau} đã hết hạn.", null);
            if (unit.KhoMauGocId != null) return (false, "Túi nhỏ đã chia không được chia tiếp.", null);
            if (unit.ThanhPhanMau == ThanhPhanMauNames.ToanPhan)
                return (false, "Chỉ chia túi các chế phẩm (hồng cầu, huyết tương, tiểu cầu); máu toàn phần nên điều chế trước.", null);
            if (theTichs.Sum() > unit.SoLuong)
                return (false, $"Tổng thể tích các túi nhỏ ({theTichs.Sum():0} ml) vượt quá thể tích túi gốc ({unit.SoLuong:0} ml).", null);

            await using var tx = await _db.Database.BeginTransactionAsync();
            var children = theTichs.Select((v, i) => new KhoMau
            {
                TiepNhanId = unit.TiepNhanId,
                MaLoMau = $"{unit.MaLoMau}-{(char)('A' + i)}",
                NhomMau = unit.NhomMau,
                HeRh = unit.HeRh,
                ThanhPhanMau = unit.ThanhPhanMau,
                SoLuong = v,
                HanSuDung = unit.HanSuDung,
                ViTriLuuTru = unit.ViTriLuuTru,
                TrangThai = TrangThaiKhoMau.ConKho,
                KhoMauGocId = unit.Id
            }).ToList();
            _db.KhoMaus.AddRange(children);
            unit.TrangThai = TrangThaiKhoMau.DaChia;
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            var ids = children.Select(c => c.Id).ToList();
            var today = DateTime.Now.Date;
            return (true, null, Complete(await Project(_db.KhoMaus.Where(k => ids.Contains(k.Id)).OrderBy(k => k.MaLoMau), today).ToListAsync(), today));
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

            var mucDo = InputValidator.NormalizeOptional(request.MucDoKhanCap) ?? MucDoKhanCap.Thuong;
            if (mucDo is not (MucDoKhanCap.Thuong or MucDoKhanCap.Khan or MucDoKhanCap.CapCuu))
                return (false, "Mức độ khẩn cấp không hợp lệ.", null);

            if (request.ChiTiet.GroupBy(i => i.KhoMauId).Any(g => g.Count() > 1))
                return (false, "Một đơn vị máu chỉ được xuất một lần trong phiếu.", null);
            var requested = request.ChiTiet.Select(i => new { i.KhoMauId, i.SoLuong }).ToList();

            var ids = requested.Select(r => r.KhoMauId).ToList();
            var units = await _db.KhoMaus.Where(k => ids.Contains(k.Id)).ToDictionaryAsync(k => k.Id);
            var today = DateTime.Now.Date;

            foreach (var item in requested)
            {
                if (!units.TryGetValue(item.KhoMauId, out var unit))
                    return (false, $"Không tìm thấy đơn vị máu #{item.KhoMauId}.", null);

                if (unit.TrangThai != TrangThaiKhoMau.ConKho)
                    return (false, $"Đơn vị máu {unit.MaLoMau} không còn khả dụng để xuất.", null);

                if (unit.HanSuDung.Date < today)
                    return (false, $"Đơn vị máu {unit.MaLoMau} đã hết hạn sử dụng, không thể xuất.", null);

                // Xuất nguyên túi: không rút một phần túi máu (đảm bảo hệ kín, vô trùng)
                if (item.SoLuong.HasValue && item.SoLuong.Value != unit.SoLuong)
                    return (false, $"Máu được xuất nguyên túi: {unit.MaLoMau} có {unit.SoLuong:0} ml. " +
                                   "Nếu cần lượng nhỏ hơn, hãy dùng chức năng chia túi vô trùng trước khi xuất.", null);
            }

            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var phieu = new PhieuXuatKho
                {
                    NhanVienId = nhanVienId,
                    CoSoYTeId = coSo?.Id,
                    NoiNhan = noiNhan,
                    LyDo = InputValidator.NormalizeOptional(request.LyDo),
                    NguoiNhan = InputValidator.NormalizeOptional(request.NguoiNhan),
                    MucDoKhanCap = mucDo
                };

                var chiTietList = new List<ChiTietXuatDto>();
                foreach (var item in requested)
                {
                    var unit = units[item.KhoMauId];

                    phieu.ChiTietXuatKhos.Add(new ChiTietXuatKho
                    {
                        KhoMauId = unit.Id,
                        SoLuong = unit.SoLuong
                    });

                    // Túi giữ nguyên thể tích ghi trên nhãn để truy vết; chỉ đổi trạng thái sang Đã xuất
                    unit.TrangThai = TrangThaiKhoMau.DaXuat;

                    chiTietList.Add(new ChiTietXuatDto
                    {
                        KhoMauId = unit.Id,
                        MaLoMau = unit.MaLoMau,
                        NhomMau = unit.NhomMau,
                        HeRh = unit.HeRh,
                        ThanhPhanMau = unit.ThanhPhanMau,
                        SoLuong = unit.SoLuong,
                        HanSuDung = unit.HanSuDung
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
                    NguoiNhan = phieu.NguoiNhan,
                    MucDoKhanCap = phieu.MucDoKhanCap,
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
                NguoiNhan = p.NguoiNhan,
                MucDoKhanCap = p.MucDoKhanCap,
                NhanVienThucHien = p.NhanVien!.HoTen,
                TongSoLuong = p.ChiTietXuatKhos.Sum(c => c.SoLuong),
                ChiTiet = p.ChiTietXuatKhos.Select(c => new ChiTietXuatDto
                {
                    KhoMauId = c.KhoMauId,
                    MaLoMau = c.KhoMau!.MaLoMau,
                    NhomMau = c.KhoMau!.NhomMau,
                    HeRh = c.KhoMau!.HeRh,
                    ThanhPhanMau = c.KhoMau!.ThanhPhanMau,
                    SoLuong = c.SoLuong,
                    HanSuDung = c.KhoMau!.HanSuDung
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

        public const string LyDoHetHan = "Hết hạn sử dụng";

        // Hủy bỏ lô máu không dùng được: đã hết hạn, sắp hết hạn không kịp sử dụng, vỡ túi, nhiễm khuẩn...
        // Áp dụng cho lô còn trong kho hoặc đã hết hạn; lưu lại lý do, thời điểm và nhân viên thực hiện.
        public async Task<(bool success, string? error)> DiscardAsync(int khoMauId, int? nhanVienId, string lyDo)
        {
            if (string.IsNullOrWhiteSpace(lyDo)) return (false, "Vui lòng nhập lý do hủy.");

            var unit = await _db.KhoMaus.FindAsync(khoMauId);
            if (unit == null) return (false, "Không tìm thấy lô máu.");
            if (unit.TrangThai != TrangThaiKhoMau.ConKho && unit.TrangThai != TrangThaiKhoMau.HetHan)
                return (false, $"Lô máu {unit.MaLoMau} đã xuất kho hoặc đã hủy trước đó nên không thể hủy bỏ.");

            MarkDiscarded(unit, nhanVienId, lyDo.Trim());
            await _db.SaveChangesAsync();
            return (true, null);
        }

        // Loại bỏ đồng loạt mọi lô đã hết hạn còn nằm trong kho
        public async Task<DiscardResultDto> DiscardExpiredAsync(int? nhanVienId)
        {
            await MarkExpiredUnitsAsync();
            var expired = await _db.KhoMaus.Where(k => k.TrangThai == TrangThaiKhoMau.HetHan).ToListAsync();
            foreach (var unit in expired) MarkDiscarded(unit, nhanVienId, LyDoHetHan);
            await _db.SaveChangesAsync();

            return new DiscardResultDto
            {
                SoLo = expired.Count,
                TongSoLuong = expired.Sum(u => u.SoLuong),
                Message = expired.Count == 0
                    ? "Không có đơn vị máu hết hạn nào cần loại bỏ."
                    : $"Đã loại bỏ {expired.Count} đơn vị máu hết hạn ({expired.Sum(u => u.SoLuong):0} ml)."
            };
        }

        private static void MarkDiscarded(KhoMau unit, int? nhanVienId, string lyDo)
        {
            unit.TrangThai = TrangThaiKhoMau.HuyBo;
            unit.LyDoHuy = lyDo.Length > 255 ? lyDo[..255] : lyDo;
            unit.NgayHuy = DateTime.Now;
            unit.NhanVienHuyId = nhanVienId;
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
