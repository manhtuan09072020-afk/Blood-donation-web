using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    public interface IScreeningService
    {
        Task<List<ScreeningDto>> GetAllAsync(int? dotId, string? ketQua);
        Task<(bool success, string? error, ScreeningDto? data)> CreateAsync(int nhanVienId, CreateScreeningRequest request);
    }

    public class ScreeningService : IScreeningService
    {
        private readonly AppDbContext _db;
        public ScreeningService(AppDbContext db) => _db = db;

        public static IQueryable<ScreeningDto> Project(IQueryable<KhamSangLoc> query) =>
            query.Select(k => new ScreeningDto
            {
                Id = k.Id,
                DangKyId = k.DangKyId,
                NguoiHienId = k.DangKyHienMau!.NguoiHienId,
                HoTenNguoiHien = k.DangKyHienMau!.NguoiHienMau!.HoTen,
                GioiTinh = k.DangKyHienMau!.NguoiHienMau!.GioiTinh,
                NhomMau = k.DangKyHienMau!.NguoiHienMau!.NhomMau,
                HeRh = k.DangKyHienMau!.NguoiHienMau!.HeRh,
                TenDot = k.DangKyHienMau!.DotHienMau!.TenDot,
                NgayKham = k.NgayKham,
                CanNang = k.CanNang,
                HuyetAp = k.HuyetAp,
                Mach = k.Mach,
                NhietDo = k.NhietDo,
                Hemoglobin = k.Hemoglobin,
                KetQua = k.KetQua,
                LyDoKhongDat = k.LyDoKhongDat,
                GhiChu = k.GhiChu,
                NhanVienKham = k.NhanVien!.HoTen,
                DaTiepNhan = k.TiepNhanMau != null
            });

        public async Task<List<ScreeningDto>> GetAllAsync(int? dotId, string? ketQua)
        {
            var query = _db.KhamSangLocs.AsQueryable();
            if (dotId.HasValue) query = query.Where(k => k.DangKyHienMau!.DotId == dotId.Value);
            if (!string.IsNullOrWhiteSpace(ketQua)) query = query.Where(k => k.KetQua == ketQua);
            return await Project(query.OrderByDescending(k => k.NgayKham)).ToListAsync();
        }

        // Huyết áp nhập dạng "120/80": tâm thu 90-160, tâm trương 60-100 mmHg
        private static string? ValidateBloodPressure(string? huyetAp)
        {
            if (string.IsNullOrWhiteSpace(huyetAp)) return null;
            var parts = huyetAp.Split('/');
            if (parts.Length != 2 || !int.TryParse(parts[0].Trim(), out var tamThu) || !int.TryParse(parts[1].Trim(), out var tamTruong))
                return "Huyết áp phải có dạng tâm thu/tâm trương, ví dụ 120/80.";
            if (tamThu < 90 || tamThu > 160 || tamTruong < 60 || tamTruong > 100)
                return $"Huyết áp {huyetAp} nằm ngoài khoảng cho phép (90-160 / 60-100 mmHg).";
            return null;
        }

        public async Task<(bool success, string? error, ScreeningDto? data)> CreateAsync(int nhanVienId, CreateScreeningRequest request)
        {
            if (request.KetQua != "Dat" && request.KetQua != "KhongDat")
                return (false, "Kết quả khám phải là 'Dat' hoặc 'KhongDat'.", null);

            if (request.KetQua == "KhongDat" && string.IsNullOrWhiteSpace(request.LyDoKhongDat))
                return (false, "Vui lòng nhập lý do không đạt để người hiến máu được thông báo.", null);

            var registration = await _db.DangKyHienMaus
                .Include(r => r.NguoiHienMau).Include(r => r.DotHienMau)
                .FirstOrDefaultAsync(r => r.Id == request.DangKyId);
            if (registration == null) return (false, "Không tìm thấy đăng ký hiến máu.", null);

            if (registration.TrangThai != TrangThaiDangKy.DaDuyet)
                return (false, "Chỉ có thể khám sàng lọc cho đăng ký đã được duyệt.", null);

            var existed = await _db.KhamSangLocs.AnyAsync(k => k.DangKyId == request.DangKyId);
            if (existed) return (false, "Đăng ký này đã có kết quả khám sàng lọc.", null);

            if (request.CanNang.HasValue && request.CanNang <= 0)
                return (false, "Cân nặng không hợp lệ.", null);

            var ketQua = request.KetQua;
            var lyDo = InputValidator.NormalizeOptional(request.LyDoKhongDat);

            // Kết quả "Đạt" phải thỏa toàn bộ tiêu chuẩn; nếu không, nhân viên chọn "Không đạt" và ghi lý do
            // để vẫn lưu được hồ sơ khám và người hiến nhận được thông báo.
            if (ketQua == "Dat")
            {
                if (!request.CanNang.HasValue || !request.Hemoglobin.HasValue || string.IsNullOrWhiteSpace(request.HuyetAp))
                    return (false, "Kết quả 'Đạt' cần nhập đủ cân nặng, huyết áp và chỉ số Hemoglobin.", null);
                if (request.CanNang < DonationRules.CanNangToiThieu)
                    return (false, $"Cân nặng dưới {DonationRules.CanNangToiThieu}kg không đủ điều kiện hiến máu. Hãy chọn kết quả 'Không đạt'.", null);
                if (request.Hemoglobin < DonationRules.HemoglobinToiThieu)
                    return (false, $"Hemoglobin dưới {DonationRules.HemoglobinToiThieu} g/dL không đủ điều kiện. Hãy chọn kết quả 'Không đạt'.", null);
                if (request.NhietDo.HasValue && request.NhietDo > DonationRules.NhietDoToiDa)
                    return (false, $"Nhiệt độ trên {DonationRules.NhietDoToiDa}°C không đủ điều kiện. Hãy chọn kết quả 'Không đạt'.", null);
                if (request.Mach.HasValue && (request.Mach < 50 || request.Mach > 100))
                    return (false, "Mạch ngoài khoảng 50-100 lần/phút không đủ điều kiện. Hãy chọn kết quả 'Không đạt'.", null);
                var bpError = ValidateBloodPressure(request.HuyetAp);
                if (bpError != null) return (false, bpError + " Hãy chọn kết quả 'Không đạt'.", null);
            }

            var screening = new KhamSangLoc
            {
                DangKyId = request.DangKyId,
                NhanVienId = nhanVienId,
                CanNang = request.CanNang,
                HuyetAp = InputValidator.NormalizeOptional(request.HuyetAp),
                Mach = request.Mach,
                NhietDo = request.NhietDo,
                Hemoglobin = request.Hemoglobin,
                KetQua = ketQua,
                LyDoKhongDat = ketQua == "KhongDat" ? lyDo : null,
                GhiChu = InputValidator.NormalizeOptional(request.GhiChu)
            };
            _db.KhamSangLocs.Add(screening);

            registration.TrangThai = ketQua == "Dat" ? TrangThaiDangKy.DaSangLoc : TrangThaiDangKy.TuChoi;

            // Cập nhật cân nặng mới nhất vào hồ sơ người hiến
            if (request.CanNang.HasValue) registration.NguoiHienMau!.CanNang = request.CanNang;

            var tenDot = registration.DotHienMau?.TenDot ?? "đợt hiến máu";
            var noiDung = ketQua == "Dat"
                ? $"Bạn đã đạt khám sàng lọc trong \"{tenDot}\". Nhân viên sẽ tiến hành lấy máu. Cảm ơn bạn!"
                : $"Rất tiếc, bạn chưa đủ điều kiện hiến máu trong \"{tenDot}\". Lý do: {lyDo}";
            _db.ThongBaos.Add(new ThongBao
            {
                NguoiNhanId = registration.NguoiHienId,
                TieuDe = ketQua == "Dat" ? "Kết quả sàng lọc: Đạt" : "Kết quả sàng lọc: Không đạt",
                NoiDung = noiDung.Length > 500 ? noiDung[..500] : noiDung,
                Loai = LoaiThongBao.ThongBaoChung
            });

            await _db.SaveChangesAsync();

            var dto = await Project(_db.KhamSangLocs.Where(k => k.Id == screening.Id)).FirstAsync();
            return (true, null, dto);
        }
    }
}
