using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    public interface ICollectionService
    {
        Task<List<CollectionDto>> GetAllAsync(int? dotId);
        Task<List<ScreeningDto>> GetPendingAsync();
        Task<(bool success, string? error, CollectionDto? data)> CreateAsync(int nhanVienId, CreateCollectionRequest request);
    }

    public class CollectionService : ICollectionService
    {
        private readonly AppDbContext _db;
        public CollectionService(AppDbContext db) => _db = db;

        private static readonly Dictionary<string, string> MaThanhPhan = new()
        {
            [ThanhPhanMauNames.ToanPhan] = "TP",
            [ThanhPhanMauNames.HongCau] = "HC",
            [ThanhPhanMauNames.HuyetTuong] = "HT",
            [ThanhPhanMauNames.TieuCau] = "TC"
        };

        private IQueryable<CollectionDto> Project(IQueryable<TiepNhanMau> query) =>
            query.Select(t => new CollectionDto
            {
                Id = t.Id,
                KhamSangLocId = t.KhamSangLocId,
                NguoiHienId = t.KhamSangLoc!.DangKyHienMau!.NguoiHienId,
                HoTenNguoiHien = t.KhamSangLoc!.DangKyHienMau!.NguoiHienMau!.HoTen,
                NhomMau = t.KhamSangLoc!.DangKyHienMau!.NguoiHienMau!.NhomMau,
                HeRh = t.KhamSangLoc!.DangKyHienMau!.NguoiHienMau!.HeRh,
                TenDot = t.KhamSangLoc!.DangKyHienMau!.DotHienMau!.TenDot,
                NgayLayMau = t.NgayLayMau,
                TheTich = t.TheTich,
                GhiChu = t.GhiChu,
                NhanVienThucHien = t.NhanVien!.HoTen,
                LoaiTui = t.LoaiTui,
                TheTichChiDinh = t.KhamSangLoc!.TheTichChiDinh,
                CacLoMau = t.KhoMaus.Where(k => k.KhoMauGocId == null).Select(k => new CollectionUnitDto
                {
                    Id = k.Id,
                    MaLoMau = k.MaLoMau,
                    ThanhPhanMau = k.ThanhPhanMau,
                    SoLuong = k.SoLuong,
                    HanSuDung = k.HanSuDung,
                    ViTriLuuTru = k.ViTriLuuTru
                }).ToList()
            });

        public async Task<List<CollectionDto>> GetAllAsync(int? dotId)
        {
            var query = _db.TiepNhanMaus.AsQueryable();
            if (dotId.HasValue) query = query.Where(t => t.KhamSangLoc!.DangKyHienMau!.DotId == dotId.Value);

            var list = await Project(query.OrderByDescending(t => t.NgayLayMau)).ToListAsync();
            foreach (var c in list) Complete(c);
            return list;
        }

        // Mã túi gốc của một lần hiến: LM + ngày lấy máu + số phiếu tiếp nhận. Mỗi chế phẩm = mã túi + hậu tố (TP/HC/HT/TC)
        public static string MaTuiMau(DateTime ngayLayMau, int tiepNhanId) => $"LM{ngayLayMau:yyMMdd}{tiepNhanId:D5}";

        private static void Complete(CollectionDto c)
        {
            c.MaTuiMau = MaTuiMau(c.NgayLayMau, c.Id);
            c.MaLoMauTaoRa = c.CacLoMau.FirstOrDefault()?.MaLoMau;
        }

        private static readonly Dictionary<string, string[]> ThanhPhanTheoLoaiTui = new()
        {
            [LoaiTuiMau.Don] = new[] { ThanhPhanMauNames.ToanPhan },
            [LoaiTuiMau.Doi] = new[] { ThanhPhanMauNames.HongCau, ThanhPhanMauNames.HuyetTuong },
            [LoaiTuiMau.Ba] = new[] { ThanhPhanMauNames.HongCau, ThanhPhanMauNames.HuyetTuong, ThanhPhanMauNames.TieuCau }
        };

        // Người đã đạt sàng lọc nhưng chưa được lấy máu. Đặt ở đây (thay vì dùng API sàng lọc)
        // để nhân viên tiếp nhận xem được danh sách mà không cần quyền của nhân viên sàng lọc.
        public async Task<List<ScreeningDto>> GetPendingAsync()
        {
            return await ScreeningService.Project(_db.KhamSangLocs
                .Where(k => k.KetQua == "Dat" && k.TiepNhanMau == null)
                .OrderBy(k => k.NgayKham)).ToListAsync();
        }

        public async Task<(bool success, string? error, CollectionDto? data)> CreateAsync(int nhanVienId, CreateCollectionRequest request)
        {
            var now = DateTime.Now;
            var ngayLayMau = request.NgayLayMau ?? now;
            if (ngayLayMau > now.AddMinutes(5))
                return (false, "Thời điểm lấy máu không được ở tương lai.", null);

            // Chuẩn hóa danh sách chế phẩm cần nhập kho
            var components = (request.ThanhPhans != null && request.ThanhPhans.Count > 0)
                ? request.ThanhPhans
                : new List<CollectionComponentRequest>
                {
                    new()
                    {
                        ThanhPhanMau = request.ThanhPhanMau,
                        TheTich = request.TheTich,
                        HanSuDung = request.HanSuDung,
                        ViTriLuuTru = request.ViTriLuuTru
                    }
                };

            foreach (var c in components)
            {
                if (!InputValidator.ThanhPhanMaus.Contains(c.ThanhPhanMau))
                    return (false, "Thành phần máu không hợp lệ.", null);
                if (c.TheTich <= 0)
                    return (false, "Thể tích từng thành phần phải lớn hơn 0.", null);
                // Hạn sử dụng tính từ ngày lấy máu theo từng chế phẩm; không được vượt thời hạn bảo quản tối đa
                var hanToiDa = ngayLayMau.Date.AddDays(ThanhPhanMauNames.HanSuDungMacDinh(c.ThanhPhanMau));
                c.HanSuDung ??= hanToiDa;
                if (c.HanSuDung.Value.Date <= ngayLayMau.Date)
                    return (false, "Hạn sử dụng phải sau ngày lấy máu.", null);
                if (c.HanSuDung.Value.Date > hanToiDa)
                    return (false, $"Hạn sử dụng của {c.ThanhPhanMau} không được quá {ThanhPhanMauNames.HanSuDungMacDinh(c.ThanhPhanMau)} ngày kể từ ngày lấy máu.", null);
            }

            if (components.Select(c => c.ThanhPhanMau).Distinct().Count() != components.Count)
                return (false, "Mỗi thành phần máu chỉ được khai báo một lần.", null);
            if (components.Count > 1 && components.Any(c => c.ThanhPhanMau == ThanhPhanMauNames.ToanPhan))
                return (false, "Khi điều chế tách thành phần, không khai báo kèm 'Máu toàn phần'.", null);
            if (components.Sum(c => c.TheTich) > request.TheTich)
                return (false, "Tổng thể tích các thành phần không được vượt quá thể tích máu đã lấy.", null);

            // Loại túi phải khớp với các chế phẩm điều chế ra (túi đơn / đôi / ba)
            var loaiTui = InputValidator.NormalizeOptional(request.LoaiTui)
                ?? (components.Count == 1 && components[0].ThanhPhanMau == ThanhPhanMauNames.ToanPhan ? LoaiTuiMau.Don
                    : components.Count == 3 ? LoaiTuiMau.Ba : LoaiTuiMau.Doi);
            if (!ThanhPhanTheoLoaiTui.TryGetValue(loaiTui, out var thanhPhanCuaTui))
                return (false, "Loại túi không hợp lệ (túi đơn, túi đôi hoặc túi ba).", null);
            if (!components.Select(c => c.ThanhPhanMau).OrderBy(x => x).SequenceEqual(thanhPhanCuaTui.OrderBy(x => x)))
                return (false, loaiTui switch
                {
                    LoaiTuiMau.Don => "Túi đơn chỉ lưu máu toàn phần.",
                    LoaiTuiMau.Doi => "Túi đôi tách được khối hồng cầu và huyết tương.",
                    _ => "Túi ba tách được khối hồng cầu, huyết tương và khối tiểu cầu."
                }, null);
            if (loaiTui == LoaiTuiMau.Ba && request.TheTich < 350)
                return (false, "Chỉ tách khối tiểu cầu (túi ba) từ đơn vị máu 350 ml trở lên.", null);

            var screening = await _db.KhamSangLocs
                .Include(k => k.DangKyHienMau).ThenInclude(d => d!.NguoiHienMau)
                .FirstOrDefaultAsync(k => k.Id == request.KhamSangLocId);

            if (screening == null) return (false, "Không tìm thấy kết quả khám sàng lọc.", null);
            if (screening.KetQua != "Dat") return (false, "Chỉ tiếp nhận máu từ người đã đạt sàng lọc.", null);

            var existed = await _db.TiepNhanMaus.AnyAsync(t => t.KhamSangLocId == request.KhamSangLocId);
            if (existed) return (false, "Đã tồn tại phiếu tiếp nhận máu cho lượt khám này.", null);

            if (ngayLayMau < screening.NgayKham.AddMinutes(-5))
                return (false, $"Thời điểm lấy máu phải sau khi khám sàng lọc ({screening.NgayKham:HH:mm dd/MM/yyyy}).", null);

            // Lượng máu thực lấy không vượt thể tích bác sĩ chỉ định (cho phép sai số túi ±10%)
            if (screening.TheTichChiDinh.HasValue
                && request.TheTich > screening.TheTichChiDinh.Value * (1 + DonationRules.SaiSoTheTichLayMau))
                return (false, $"Bác sĩ chỉ định lấy {screening.TheTichChiDinh} ml; thể tích thực lấy không được vượt quá " +
                               $"{screening.TheTichChiDinh.Value * (1 + DonationRules.SaiSoTheTichLayMau):0} ml.", null);

            var donor = screening.DangKyHienMau!.NguoiHienMau!;

            // Người hiến chưa biết nhóm máu: cho phép nhân viên nhập kết quả xét nhóm máu tại chỗ và lưu vào hồ sơ
            if (string.IsNullOrEmpty(donor.NhomMau) || string.IsNullOrEmpty(donor.HeRh))
            {
                var nhomMau = InputValidator.NormalizeOptional(request.NhomMau);
                var heRh = InputValidator.NormalizeOptional(request.HeRh);
                if (nhomMau == null || heRh == null)
                    return (false, "Người hiến chưa có nhóm máu/hệ Rh. Vui lòng nhập kết quả xét nghiệm nhóm máu.", null);
                if (!InputValidator.NhomMaus.Contains(nhomMau) || !InputValidator.HeRhs.Contains(heRh))
                    return (false, "Nhóm máu hoặc hệ Rh không hợp lệ.", null);

                donor.NhomMau = nhomMau;
                donor.HeRh = heRh;
            }

            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var collection = new TiepNhanMau
                {
                    KhamSangLocId = request.KhamSangLocId,
                    NhanVienId = nhanVienId,
                    NgayLayMau = ngayLayMau,
                    TheTich = request.TheTich,
                    GhiChu = InputValidator.NormalizeOptional(request.GhiChu),
                    LoaiTui = loaiTui
                };
                _db.TiepNhanMaus.Add(collection);
                await _db.SaveChangesAsync();

                foreach (var c in components)
                {
                    _db.KhoMaus.Add(new KhoMau
                    {
                        TiepNhanId = collection.Id,
                        // Mỗi lần hiến là một túi riêng (không trộn máu nhiều người); chế phẩm tách ra là túi con mang mã túi gốc
                        MaLoMau = MaTuiMau(ngayLayMau, collection.Id) + MaThanhPhan[c.ThanhPhanMau],
                        NhomMau = donor.NhomMau!,
                        HeRh = donor.HeRh!,
                        ThanhPhanMau = c.ThanhPhanMau,
                        SoLuong = c.TheTich,
                        HanSuDung = c.HanSuDung!.Value.Date,
                        ViTriLuuTru = InputValidator.NormalizeOptional(c.ViTriLuuTru),
                        TrangThai = TrangThaiKhoMau.ConKho
                    });
                }

                screening.DangKyHienMau!.TrangThai = TrangThaiDangKy.DaHienMau;

                _db.ThongBaos.Add(new ThongBao
                {
                    NguoiNhanId = donor.Id,
                    TieuDe = "Cảm ơn bạn đã hiến máu!",
                    NoiDung = $"Bạn đã hiến {request.TheTich:0} ml máu ngày {ngayLayMau:dd/MM/yyyy}. Giọt máu của bạn sẽ giúp cứu sống người bệnh. " +
                              $"Bạn có thể hiến lại từ ngày {ngayLayMau.AddDays(DonationRules.SoNgayToiThieuGiua2LanHien):dd/MM/yyyy}.",
                    Loai = LoaiThongBao.ThongBaoChung
                });

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                var dto = await Project(_db.TiepNhanMaus.Where(t => t.Id == collection.Id)).FirstAsync();
                Complete(dto);
                return (true, null, dto);
            }
            catch
            {
                await tx.RollbackAsync();
                return (false, "Có lỗi xảy ra khi ghi nhận tiếp nhận máu.", null);
            }
        }
    }
}
