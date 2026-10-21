using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.DTOs
{
    public class NotificationDto
    {
        public int Id { get; set; }
        public string TieuDe { get; set; } = string.Empty;
        public string NoiDung { get; set; } = string.Empty;
        public string Loai { get; set; } = string.Empty;
        public DateTime NgayGui { get; set; }
        public bool DaDoc { get; set; }
        public int? DotId { get; set; }
    }

    public class SendCallForDonationRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập tiêu đề."), MaxLength(150)]
        public string TieuDe { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập nội dung."), MaxLength(500)]
        public string NoiDung { get; set; } = string.Empty;

        [Required]
        public string NhomMau { get; set; } = string.Empty; // A, B, AB, O hoặc "TatCa"

        public string? HeRh { get; set; } // Rh+, Rh-, null = tất cả

        // Chỉ gửi cho người đã đủ 12 tuần kể từ lần hiến gần nhất (tránh làm phiền người chưa thể hiến)
        public bool ChiNguoiDuDieuKien { get; set; } = true;

        public int? DotId { get; set; }
    }

    public class SendReminderRequest
    {
        [Required] public int DotId { get; set; }
        [Required, MaxLength(150)] public string TieuDe { get; set; } = string.Empty;
        [Required, MaxLength(500)] public string NoiDung { get; set; } = string.Empty;
    }

    public class SendGeneralRequest
    {
        [Required, MaxLength(150)] public string TieuDe { get; set; } = string.Empty;
        [Required, MaxLength(500)] public string NoiDung { get; set; } = string.Empty;
    }

    public class SendResultDto
    {
        public string Message { get; set; } = string.Empty;
        public int SoNguoiNhan { get; set; }
        public int? ChienDichId { get; set; }
    }

    public class OutreachCampaignDto
    {
        public int Id { get; set; }
        public string TieuDe { get; set; } = string.Empty;
        public string NoiDung { get; set; } = string.Empty;
        public string Loai { get; set; } = string.Empty;
        public string? NhomMauMucTieu { get; set; }
        public string? HeRhMucTieu { get; set; }
        public int? DotId { get; set; }
        public string? TenDot { get; set; }
        public string NguoiTao { get; set; } = string.Empty;
        public DateTime NgayGui { get; set; }
        public int SoNguoiNhan { get; set; }
        public int SoDaDoc { get; set; }
        public bool TuDong { get; set; }
    }

    public class OutreachRecipientDto
    {
        public int NguoiHienId { get; set; }
        public string HoTen { get; set; } = string.Empty;
        public string? NhomMau { get; set; }
        public string? HeRh { get; set; }
        public string SoDienThoai { get; set; } = string.Empty;
        public bool DaDoc { get; set; }
    }

    public class OutreachDetailDto : OutreachCampaignDto
    {
        public List<OutreachRecipientDto> NguoiNhan { get; set; } = new();
    }

    // Xem trước trước khi gửi nhắc lịch: thông tin đợt + ai sẽ nhận, ai không (và vì sao)
    public class ReminderPreviewDto
    {
        public int DotId { get; set; }
        public string TenDot { get; set; } = string.Empty;
        public DateTime NgayBatDau { get; set; }
        public DateTime NgayKetThuc { get; set; }
        public string? TenDiem { get; set; }
        public string? DiaChi { get; set; }
        public int SoLuongToiDa { get; set; }
        public int SoDangKy { get; set; }
        public int SoCanNhac { get; set; }
        public DateTime NgayTuDongNhac { get; set; }
        public bool DaTuDongNhac { get; set; }
        public DateTime? LanNhacGanNhat { get; set; }
        public List<ReminderRecipientDto> DangKy { get; set; } = new();
    }

    public class ReminderRecipientDto
    {
        public int NguoiHienId { get; set; }
        public string HoTen { get; set; } = string.Empty;
        public string SoDienThoai { get; set; } = string.Empty;
        public string? NhomMau { get; set; }
        public string? HeRh { get; set; }
        public string TrangThai { get; set; } = string.Empty;
        public bool SeNhan { get; set; }
        public string? LyDoKhongNhan { get; set; }
    }

    // Nhắc hiến máu định kỳ (chạy tự động): ai đã đến hạn, ai đã được nhắc, lần chạy gần nhất/tiếp theo
    public class PeriodicStatusDto
    {
        public bool TuDongBat { get; set; }
        public int ChuKyPhut { get; set; }
        public DateTime? LanChayGanNhat { get; set; }
        public DateTime? LanChayTiepTheo { get; set; }
        public int SoNgayGiua2LanHien { get; set; }
        public string? DotGioiThieu { get; set; }
        public int SoDenHan { get; set; }
        public int SoDaNhac { get; set; }
        public int SoChoGui { get; set; }
        public int SoDangCoDangKy { get; set; }
        public List<PeriodicDonorDto> NguoiDenHan { get; set; } = new();
        public List<OutreachCampaignDto> LichSu { get; set; } = new();
    }

    public class PeriodicDonorDto
    {
        public int NguoiHienId { get; set; }
        public string HoTen { get; set; } = string.Empty;
        public string SoDienThoai { get; set; } = string.Empty;
        public string? NhomMau { get; set; }
        public string? HeRh { get; set; }
        public DateTime LanHienCuoi { get; set; }
        public DateTime NgayDuDieuKien { get; set; }
        public string TrangThai { get; set; } = string.Empty; // DaNhac | DangCoDangKy | ChoGui
        public DateTime? NgayNhac { get; set; }
    }
}
