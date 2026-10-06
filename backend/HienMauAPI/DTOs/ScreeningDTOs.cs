using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.DTOs
{
    public class ScreeningDto
    {
        public int Id { get; set; }
        public int DangKyId { get; set; }
        public int NguoiHienId { get; set; }
        public string HoTenNguoiHien { get; set; } = string.Empty;
        public string? GioiTinh { get; set; }
        public string? NhomMau { get; set; }
        public string? HeRh { get; set; }
        public string TenDot { get; set; } = string.Empty;
        public DateTime NgayKham { get; set; }
        public decimal? CanNang { get; set; }
        public string? HuyetAp { get; set; }
        public int? Mach { get; set; }
        public decimal? NhietDo { get; set; }
        public decimal? Hemoglobin { get; set; }
        public string KetQua { get; set; } = string.Empty;
        public string? LyDoKhongDat { get; set; }
        public string? GhiChu { get; set; }
        public string NhanVienKham { get; set; } = string.Empty;
        public bool DaTiepNhan { get; set; }
    }

    public class CreateScreeningRequest
    {
        [Required] public int DangKyId { get; set; }
        [Range(0, 300)] public decimal? CanNang { get; set; }
        [MaxLength(20)] public string? HuyetAp { get; set; }
        [Range(0, 250)] public int? Mach { get; set; }
        [Range(30, 45)] public decimal? NhietDo { get; set; }
        [Range(0, 30)] public decimal? Hemoglobin { get; set; }

        [Required]
        public string KetQua { get; set; } = string.Empty; // "Dat" | "KhongDat"

        [MaxLength(255)] public string? LyDoKhongDat { get; set; }
        [MaxLength(255)] public string? GhiChu { get; set; }
    }
}
