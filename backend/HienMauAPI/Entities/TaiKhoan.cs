using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class TaiKhoan
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Email { get; set; }

        [Required, MaxLength(30)]
        public string Role { get; set; } = string.Empty;

        public bool TrangThai { get; set; } = true;

        public DateTime NgayTao { get; set; } = DateTime.Now;

        public NguoiHienMau? NguoiHienMau { get; set; }
        public NhanVien? NhanVien { get; set; }
    }
}
