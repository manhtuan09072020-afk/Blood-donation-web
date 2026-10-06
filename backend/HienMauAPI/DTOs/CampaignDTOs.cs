using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.DTOs
{
    public class DonationSiteDto
    {
        public int Id { get; set; }
        public string TenDiem { get; set; } = string.Empty;
        public string DiaChi { get; set; } = string.Empty;
        public string? SoDienThoai { get; set; }
        public bool TrangThai { get; set; }
        public int SoDotHienMau { get; set; }
    }

    public class SaveDonationSiteRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập tên điểm hiến máu."), MaxLength(150)] public string TenDiem { get; set; } = string.Empty;
        [Required(ErrorMessage = "Vui lòng nhập địa chỉ."), MaxLength(255)] public string DiaChi { get; set; } = string.Empty;
        [MaxLength(15)] public string? SoDienThoai { get; set; }
    }

    public class CampaignDto
    {
        public int Id { get; set; }
        public int DiemId { get; set; }
        public string TenDiem { get; set; } = string.Empty;
        public string DiaChi { get; set; } = string.Empty;
        public string? SoDienThoaiDiem { get; set; }
        public string TenDot { get; set; } = string.Empty;
        public DateTime NgayBatDau { get; set; }
        public DateTime NgayKetThuc { get; set; }
        public int? SoLuongDuKien { get; set; }
        public string? MoTa { get; set; }
        public string TrangThai { get; set; } = string.Empty;
        public int SoLuongDaDangKy { get; set; }
        public int SoLuongDaHien { get; set; }
    }

    public class SaveCampaignRequest
    {
        [Required(ErrorMessage = "Vui lòng chọn điểm hiến máu.")] public int DiemId { get; set; }
        [Required(ErrorMessage = "Vui lòng nhập tên đợt."), MaxLength(150)] public string TenDot { get; set; } = string.Empty;
        [Required] public DateTime NgayBatDau { get; set; }
        [Required] public DateTime NgayKetThuc { get; set; }
        [Range(1, 100000)] public int? SoLuongDuKien { get; set; }
        [MaxLength(500)] public string? MoTa { get; set; }
    }

    public class UpdateCampaignStatusRequest
    {
        [Required] public string TrangThai { get; set; } = string.Empty;
    }
}
