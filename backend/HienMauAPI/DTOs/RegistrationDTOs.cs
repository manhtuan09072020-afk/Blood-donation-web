using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.DTOs
{
    public class RegistrationDto
    {
        public int Id { get; set; }
        public int NguoiHienId { get; set; }
        public string HoTenNguoiHien { get; set; } = string.Empty;
        public string? CCCD { get; set; }
        public string? SoDienThoai { get; set; }
        public string? GioiTinh { get; set; }
        public DateTime? NgaySinh { get; set; }
        public string? NhomMau { get; set; }
        public string? HeRh { get; set; }
        public int DotId { get; set; }
        public string TenDot { get; set; } = string.Empty;
        public string TenDiem { get; set; } = string.Empty;
        public string DiaChi { get; set; } = string.Empty;
        public DateTime NgayBatDau { get; set; }
        public DateTime NgayKetThuc { get; set; }
        public DateTime NgayDangKy { get; set; }
        public string TrangThai { get; set; } = string.Empty;
        public string? GhiChu { get; set; }
        public int? KhamSangLocId { get; set; }
    }

    public class CreateRegistrationRequest
    {
        [Required] public int DotId { get; set; }
        [MaxLength(255)] public string? GhiChu { get; set; }
    }

    // Nhân viên đăng ký hộ người hiến đến trực tiếp tại điểm hiến máu
    public class WalkInRegistrationRequest
    {
        [Required] public int NguoiHienId { get; set; }
        [Required] public int DotId { get; set; }
        [MaxLength(255)] public string? GhiChu { get; set; }
    }

    public class UpdateRegistrationStatusRequest
    {
        [Required] public string TrangThai { get; set; } = string.Empty;
        [MaxLength(255)] public string? GhiChu { get; set; }
    }
}
