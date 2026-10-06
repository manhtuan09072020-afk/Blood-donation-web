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
                CacLoMau = t.KhoMaus.Select(k => new CollectionUnitDto
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
            foreach (var c in list) c.MaLoMauTaoRa = c.CacLoMau.FirstOrDefault()?.MaLoMau;
            return list;
        }

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
            var ngayLayMau = DateTime.Now;

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
                c.HanSuDung ??= ngayLayMau.Date.AddDays(ThanhPhanMauNames.HanSuDungMacDinh(c.ThanhPhanMau));
                if (c.HanSuDung.Value.Date <= ngayLayMau.Date)
                    return (false, "Hạn sử dụng phải sau ngày hôm nay.", null);
            }

            if (components.Select(c => c.ThanhPhanMau).Distinct().Count() != components.Count)
                return (false, "Mỗi thành phần máu chỉ được khai báo một lần.", null);
            if (components.Count > 1 && components.Any(c => c.ThanhPhanMau == ThanhPhanMauNames.ToanPhan))
                return (false, "Khi điều chế tách thành phần, không khai báo kèm 'Máu toàn phần'.", null);
            if (components.Sum(c => c.TheTich) > request.TheTich)
                return (false, "Tổng thể tích các thành phần không được vượt quá thể tích máu đã lấy.", null);

            var screening = await _db.KhamSangLocs
                .Include(k => k.DangKyHienMau).ThenInclude(d => d!.NguoiHienMau)
                .FirstOrDefaultAsync(k => k.Id == request.KhamSangLocId);

            if (screening == null) return (false, "Không tìm thấy kết quả khám sàng lọc.", null);
            if (screening.KetQua != "Dat") return (false, "Chỉ tiếp nhận máu từ người đã đạt sàng lọc.", null);

            var existed = await _db.TiepNhanMaus.AnyAsync(t => t.KhamSangLocId == request.KhamSangLocId);
            if (existed) return (false, "Đã tồn tại phiếu tiếp nhận máu cho lượt khám này.", null);

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
                    GhiChu = InputValidator.NormalizeOptional(request.GhiChu)
                };
                _db.TiepNhanMaus.Add(collection);
                await _db.SaveChangesAsync();

                foreach (var c in components)
                {
                    _db.KhoMaus.Add(new KhoMau
                    {
                        TiepNhanId = collection.Id,
                        MaLoMau = $"LM{ngayLayMau:yyMMdd}{collection.Id:D5}{MaThanhPhan[c.ThanhPhanMau]}",
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
                dto.MaLoMauTaoRa = dto.CacLoMau.FirstOrDefault()?.MaLoMau;
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
