using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    public interface IRegistrationService
    {
        Task<List<RegistrationDto>> GetAllAsync(int? dotId, string? trangThai, string? keyword);
        Task<List<RegistrationDto>> GetByDonorAsync(int nguoiHienId);
        Task<RegistrationDto?> GetByIdAsync(int id);
        Task<(bool success, string? error, RegistrationDto? data)> CreateAsync(int nguoiHienId, CreateRegistrationRequest request);
        Task<(bool success, string? error, RegistrationDto? data)> CreateWalkInAsync(WalkInRegistrationRequest request);
        Task<(bool success, string? error)> UpdateStatusAsync(int id, UpdateRegistrationStatusRequest request);
        Task<(bool success, string? error)> CancelAsync(int id, int nguoiHienId);
    }

    public class RegistrationService : IRegistrationService
    {
        // Khoảng cách tối thiểu giữa 2 lần hiến máu toàn phần: 12 tuần (84 ngày)
        public const int SoNgayToiThieuGiua2LanHien = DonationRules.SoNgayToiThieuGiua2LanHien;

        // Nhân viên chỉ được duyệt / từ chối. Các trạng thái DaSangLoc, DaHienMau do nghiệp vụ
        // sàng lọc và tiếp nhận tự cập nhật, Huy chỉ do chính người hiến thực hiện.
        private static readonly Dictionary<string, string[]> StaffTransitions = new()
        {
            [TrangThaiDangKy.ChoDuyet] = new[] { TrangThaiDangKy.DaDuyet, TrangThaiDangKy.TuChoi },
            [TrangThaiDangKy.DaDuyet] = new[] { TrangThaiDangKy.TuChoi }
        };

        private readonly AppDbContext _db;
        public RegistrationService(AppDbContext db) => _db = db;

        private IQueryable<RegistrationDto> Project(IQueryable<DangKyHienMau> query) =>
            query.Select(r => new RegistrationDto
            {
                Id = r.Id,
                NguoiHienId = r.NguoiHienId,
                HoTenNguoiHien = r.NguoiHienMau!.HoTen,
                CCCD = r.NguoiHienMau!.CCCD,
                SoDienThoai = r.NguoiHienMau!.SoDienThoai,
                GioiTinh = r.NguoiHienMau!.GioiTinh,
                NgaySinh = r.NguoiHienMau!.NgaySinh,
                NhomMau = r.NguoiHienMau!.NhomMau,
                HeRh = r.NguoiHienMau!.HeRh,
                DotId = r.DotId,
                TenDot = r.DotHienMau!.TenDot,
                TenDiem = r.DotHienMau!.DiemHienMau!.TenDiem,
                DiaChi = r.DotHienMau!.DiemHienMau!.DiaChi,
                NgayBatDau = r.DotHienMau!.NgayBatDau,
                NgayKetThuc = r.DotHienMau!.NgayKetThuc,
                NgayDangKy = r.NgayDangKy,
                TrangThai = r.TrangThai,
                GhiChu = r.GhiChu,
                KhamSangLocId = r.KhamSangLoc != null ? r.KhamSangLoc.Id : null
            });

        public async Task<List<RegistrationDto>> GetAllAsync(int? dotId, string? trangThai, string? keyword)
        {
            var query = _db.DangKyHienMaus.AsQueryable();

            if (dotId.HasValue) query = query.Where(r => r.DotId == dotId.Value);
            if (!string.IsNullOrWhiteSpace(trangThai))
            {
                var statuses = trangThai.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                query = query.Where(r => statuses.Contains(r.TrangThai));
            }
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim();
                query = query.Where(r => r.NguoiHienMau!.HoTen.Contains(kw) || r.NguoiHienMau!.CCCD.Contains(kw) || r.NguoiHienMau!.SoDienThoai.Contains(kw));
            }

            return await Project(query.OrderByDescending(r => r.NgayDangKy)).ToListAsync();
        }

        public async Task<List<RegistrationDto>> GetByDonorAsync(int nguoiHienId)
        {
            return await Project(_db.DangKyHienMaus
                .Where(r => r.NguoiHienId == nguoiHienId)
                .OrderByDescending(r => r.NgayDangKy)).ToListAsync();
        }

        public async Task<RegistrationDto?> GetByIdAsync(int id)
        {
            return await Project(_db.DangKyHienMaus.Where(r => r.Id == id)).FirstOrDefaultAsync();
        }

        public Task<(bool success, string? error, RegistrationDto? data)> CreateAsync(int nguoiHienId, CreateRegistrationRequest request)
            => CreateInternalAsync(nguoiHienId, request.DotId, request.GhiChu, TrangThaiDangKy.ChoDuyet, laNhanVien: false);

        // Người hiến đến trực tiếp: nhân viên đăng ký hộ và duyệt luôn để chuyển sang khám sàng lọc
        public Task<(bool success, string? error, RegistrationDto? data)> CreateWalkInAsync(WalkInRegistrationRequest request)
            => CreateInternalAsync(request.NguoiHienId, request.DotId, request.GhiChu, TrangThaiDangKy.DaDuyet, laNhanVien: true);

        private async Task<(bool success, string? error, RegistrationDto? data)> CreateInternalAsync(
            int nguoiHienId, int dotId, string? ghiChu, string trangThaiBanDau, bool laNhanVien)
        {
            var donor = await _db.NguoiHienMaus.FindAsync(nguoiHienId);
            if (donor == null || !donor.TrangThai)
                return (false, "Hồ sơ người hiến máu không tồn tại hoặc đã bị khóa.", null);

            var age = DonationRules.TinhTuoi(donor.NgaySinh);
            if (age < DonationRules.TuoiToiThieu || age > DonationRules.TuoiToiDa)
                return (false, $"Người hiến máu phải trong độ tuổi {DonationRules.TuoiToiThieu}-{DonationRules.TuoiToiDa}.", null);

            var campaign = await _db.DotHienMaus.FindAsync(dotId);
            if (campaign == null) return (false, "Đợt hiến máu không tồn tại.", null);

            if (campaign.TrangThai is TrangThaiDot.DaKetThuc or TrangThaiDot.DaHuy)
                return (false, "Đợt hiến máu này đã kết thúc hoặc đã bị hủy.", null);

            // Không cho đăng ký khi đã quá ngày kết thúc dù trạng thái chưa được cập nhật
            if (campaign.NgayKetThuc.Date < DateTime.Now.Date)
                return (false, "Đợt hiến máu này đã qua thời gian diễn ra.", null);

            var existing = await _db.DangKyHienMaus.FirstOrDefaultAsync(r => r.NguoiHienId == nguoiHienId && r.DotId == dotId);

            if (existing != null && existing.TrangThai != TrangThaiDangKy.Huy && existing.TrangThai != TrangThaiDangKy.TuChoi)
                return (false, laNhanVien ? "Người hiến đã có đăng ký trong đợt này." : "Bạn đã đăng ký đợt hiến máu này rồi.", null);

            // Đã có kết quả sàng lọc trong đợt này (ví dụ không đạt) thì không mở lại đăng ký cũ
            if (existing != null && await _db.KhamSangLocs.AnyAsync(k => k.DangKyId == existing.Id))
                return (false, "Đã có kết quả khám sàng lọc trong đợt này nên không thể đăng ký lại. Vui lòng chọn đợt khác.", null);

            // Mỗi người chỉ giữ một đăng ký còn hiệu lực tại một thời điểm
            var today = DateTime.Now.Date;
            var dangCo = await _db.DangKyHienMaus
                .Where(r => r.NguoiHienId == nguoiHienId && r.DotId != dotId
                    && (r.TrangThai == TrangThaiDangKy.ChoDuyet || r.TrangThai == TrangThaiDangKy.DaDuyet || r.TrangThai == TrangThaiDangKy.DaSangLoc)
                    && r.DotHienMau!.NgayKetThuc >= today
                    && r.DotHienMau!.TrangThai != TrangThaiDot.DaHuy)
                .Select(r => r.DotHienMau!.TenDot)
                .FirstOrDefaultAsync();
            if (dangCo != null)
                return (false, $"Đang có đăng ký còn hiệu lực ở \"{dangCo}\". Vui lòng hủy đăng ký đó trước khi đăng ký đợt khác.", null);

            // Giới hạn số lượng theo kế hoạch của đợt
            if (campaign.SoLuongDuKien.HasValue)
            {
                var soDaDangKy = await _db.DangKyHienMaus.CountAsync(r => r.DotId == dotId
                    && r.TrangThai != TrangThaiDangKy.Huy && r.TrangThai != TrangThaiDangKy.TuChoi);
                if (soDaDangKy >= campaign.SoLuongDuKien.Value)
                    return (false, "Đợt hiến máu đã đủ số lượng đăng ký dự kiến.", null);
            }

            // Khoảng cách giữa 2 lần hiến tính theo ngày lấy máu thực tế (bản ghi tiếp nhận), không theo ngày đăng ký
            var lastDonation = await _db.TiepNhanMaus
                .Where(t => t.KhamSangLoc!.DangKyHienMau!.NguoiHienId == nguoiHienId)
                .OrderByDescending(t => t.NgayLayMau)
                .Select(t => (DateTime?)t.NgayLayMau)
                .FirstOrDefaultAsync();

            if (lastDonation.HasValue)
            {
                var ngayHien = campaign.NgayBatDau.Date < today ? today : campaign.NgayBatDau.Date;
                var daysSince = (ngayHien - lastDonation.Value.Date).TotalDays;
                if (daysSince < SoNgayToiThieuGiua2LanHien)
                {
                    var daysLeft = (int)Math.Ceiling(SoNgayToiThieuGiua2LanHien - daysSince);
                    return (false, $"Cần chờ thêm {daysLeft} ngày kể từ lần hiến máu gần nhất ({lastDonation.Value:dd/MM/yyyy}) để đảm bảo sức khỏe.", null);
                }
            }

            int registrationId;
            if (existing != null)
            {
                // Ràng buộc UNIQUE (NguoiHienId, DotId): người từng hủy/bị từ chối đăng ký lại bằng cách mở lại bản ghi cũ
                existing.TrangThai = trangThaiBanDau;
                existing.GhiChu = InputValidator.NormalizeOptional(ghiChu);
                existing.NgayDangKy = DateTime.Now;
                registrationId = existing.Id;
            }
            else
            {
                var registration = new DangKyHienMau
                {
                    NguoiHienId = nguoiHienId,
                    DotId = dotId,
                    GhiChu = InputValidator.NormalizeOptional(ghiChu),
                    TrangThai = trangThaiBanDau
                };
                _db.DangKyHienMaus.Add(registration);
                await _db.SaveChangesAsync();
                registrationId = registration.Id;
            }

            _db.ThongBaos.Add(new ThongBao
            {
                NguoiNhanId = nguoiHienId,
                TieuDe = laNhanVien ? "Đã đăng ký hiến máu tại điểm" : "Đăng ký hiến máu thành công",
                NoiDung = laNhanVien
                    ? $"Bạn đã được đăng ký tham gia \"{campaign.TenDot}\". Vui lòng chờ khám sàng lọc."
                    : $"Bạn đã đăng ký tham gia \"{campaign.TenDot}\" ngày {campaign.NgayBatDau:dd/MM/yyyy}. Đăng ký đang chờ ban tổ chức duyệt.",
                Loai = LoaiThongBao.ThongBaoChung
            });
            await _db.SaveChangesAsync();

            var dto = await GetByIdAsync(registrationId);
            return (true, null, dto);
        }

        public async Task<(bool success, string? error)> UpdateStatusAsync(int id, UpdateRegistrationStatusRequest request)
        {
            var reg = await _db.DangKyHienMaus.Include(r => r.DotHienMau).FirstOrDefaultAsync(r => r.Id == id);
            if (reg == null) return (false, "Không tìm thấy đăng ký.");

            if (!StaffTransitions.TryGetValue(reg.TrangThai, out var allowed) || !allowed.Contains(request.TrangThai))
                return (false, $"Không thể chuyển đăng ký từ trạng thái '{reg.TrangThai}' sang '{request.TrangThai}'.");

            if (request.TrangThai == TrangThaiDangKy.TuChoi && string.IsNullOrWhiteSpace(request.GhiChu))
                return (false, "Vui lòng nhập lý do từ chối để thông báo cho người hiến.");

            reg.TrangThai = request.TrangThai;
            if (!string.IsNullOrWhiteSpace(request.GhiChu)) reg.GhiChu = request.GhiChu.Trim();

            var tenDot = reg.DotHienMau?.TenDot ?? "đợt hiến máu";
            var approved = request.TrangThai == TrangThaiDangKy.DaDuyet;
            var noiDung = approved
                ? $"Đăng ký tham gia \"{tenDot}\" của bạn đã được duyệt. Vui lòng đến đúng thời gian ({reg.DotHienMau?.NgayBatDau:dd/MM/yyyy HH:mm}) để khám sàng lọc. Nhớ ăn nhẹ, ngủ đủ giấc và mang theo CCCD."
                : $"Đăng ký tham gia \"{tenDot}\" của bạn đã bị từ chối." + (string.IsNullOrWhiteSpace(reg.GhiChu) ? "" : $" Lý do: {reg.GhiChu}");

            _db.ThongBaos.Add(new ThongBao
            {
                NguoiNhanId = reg.NguoiHienId,
                TieuDe = approved ? "Đăng ký hiến máu đã được duyệt" : "Đăng ký hiến máu bị từ chối",
                NoiDung = noiDung.Length > 500 ? noiDung[..500] : noiDung,
                Loai = LoaiThongBao.ThongBaoChung
            });

            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(bool success, string? error)> CancelAsync(int id, int nguoiHienId)
        {
            var reg = await _db.DangKyHienMaus.FirstOrDefaultAsync(r => r.Id == id && r.NguoiHienId == nguoiHienId);
            if (reg == null) return (false, "Không tìm thấy đăng ký của bạn.");

            if (reg.TrangThai != TrangThaiDangKy.ChoDuyet && reg.TrangThai != TrangThaiDangKy.DaDuyet)
                return (false, "Chỉ có thể hủy đăng ký đang chờ duyệt hoặc đã được duyệt (chưa khám sàng lọc).");

            reg.TrangThai = TrangThaiDangKy.Huy;
            await _db.SaveChangesAsync();
            return (true, null);
        }
    }
}
