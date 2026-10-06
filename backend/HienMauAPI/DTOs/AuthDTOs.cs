using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.DTOs
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập tên đăng nhập.")] public string Username { get; set; } = string.Empty;
        [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")] public string Password { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string HoTen { get; set; } = string.Empty;
        public int? ProfileId { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    public class MeDto
    {
        public int AccountId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string HoTen { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? SoDienThoai { get; set; }
        public string? ChucVu { get; set; }
        public int? ProfileId { get; set; }
        public DateTime NgayTao { get; set; }
    }

    public class RegisterDonorRequest
    {
        [Required, MinLength(4, ErrorMessage = "Tên đăng nhập tối thiểu 4 ký tự."), MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required, MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string Password { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string HoTen { get; set; } = string.Empty;

        [Required]
        public DateTime NgaySinh { get; set; }

        [Required]
        public string GioiTinh { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string CCCD { get; set; } = string.Empty;

        public string? NhomMau { get; set; }
        public string? HeRh { get; set; }
        public string? DiaChi { get; set; }

        [Required, Phone(ErrorMessage = "Số điện thoại không hợp lệ.")]
        public string SoDienThoai { get; set; } = string.Empty;

        [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
        public string? Email { get; set; }

        public decimal? CanNang { get; set; }
    }

    public class ChangePasswordRequest
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required, MinLength(6, ErrorMessage = "Mật khẩu mới tối thiểu 6 ký tự."), MaxLength(100)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
