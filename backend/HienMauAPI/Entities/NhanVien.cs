using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class NhanVien
    {
        public int Id { get; set; }

        public int AccountId { get; set; }
        public TaiKhoan? TaiKhoan { get; set; }

        [Required, MaxLength(100)]
        public string HoTen { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string ChucVu { get; set; } = string.Empty;

        [MaxLength(15)]
        public string? SoDienThoai { get; set; }

        [MaxLength(100)]
        public string? Email { get; set; }

        public bool TrangThai { get; set; } = true;
    }
}
