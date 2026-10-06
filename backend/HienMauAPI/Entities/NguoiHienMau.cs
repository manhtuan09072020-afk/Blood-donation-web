using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class NguoiHienMau
    {
        public int Id { get; set; }

        public int AccountId { get; set; }
        public TaiKhoan? TaiKhoan { get; set; }

        [Required, MaxLength(100)]
        public string HoTen { get; set; } = string.Empty;

        [Required]
        public DateTime NgaySinh { get; set; }

        [Required, MaxLength(10)]
        public string GioiTinh { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string CCCD { get; set; } = string.Empty;

        [MaxLength(2)]
        public string? NhomMau { get; set; }

        [MaxLength(10)]
        public string? HeRh { get; set; }

        [MaxLength(255)]
        public string? DiaChi { get; set; }

        [Required, MaxLength(15)]
        public string SoDienThoai { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Email { get; set; }

        public decimal? CanNang { get; set; }

        public DateTime NgayDangKy { get; set; } = DateTime.Now;

        public bool TrangThai { get; set; } = true;

        public ICollection<DangKyHienMau> DangKyHienMaus { get; set; } = new List<DangKyHienMau>();
        public ICollection<ThongBao> ThongBaos { get; set; } = new List<ThongBao>();
    }
}
