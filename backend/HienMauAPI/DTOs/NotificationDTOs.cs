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
}
