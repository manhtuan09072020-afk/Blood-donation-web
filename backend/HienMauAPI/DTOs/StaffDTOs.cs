using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.DTOs
{
    public class StaffDto
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public string HoTen { get; set; } = string.Empty;
        public string ChucVu { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? SoDienThoai { get; set; }
        public string? Email { get; set; }
        public string Username { get; set; } = string.Empty;
        public bool TrangThai { get; set; }
        public DateTime NgayTao { get; set; }
    }

    public class CreateStaffRequest
    {
        [Required, MinLength(4, ErrorMessage = "Tên đăng nhập tối thiểu 4 ký tự."), MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required, MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string Password { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string HoTen { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = string.Empty;

        [MaxLength(15)] public string? SoDienThoai { get; set; }
        [EmailAddress, MaxLength(100)] public string? Email { get; set; }
    }

    public class UpdateStaffRequest
    {
        [Required, MaxLength(100)] public string HoTen { get; set; } = string.Empty;
        [Required] public string Role { get; set; } = string.Empty;
        [MaxLength(15)] public string? SoDienThoai { get; set; }
        [EmailAddress, MaxLength(100)] public string? Email { get; set; }
    }

    public class ResetPasswordRequest
    {
        [Required, MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string NewPassword { get; set; } = string.Empty;
    }
}
