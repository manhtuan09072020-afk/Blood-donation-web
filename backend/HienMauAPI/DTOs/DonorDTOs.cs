using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.DTOs
{
    public class DonorDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string HoTen { get; set; } = string.Empty;
        public DateTime NgaySinh { get; set; }
        public string GioiTinh { get; set; } = string.Empty;
        public string CCCD { get; set; } = string.Empty;
        public string? NhomMau { get; set; }
        public string? HeRh { get; set; }
        public string? DiaChi { get; set; }
        public string SoDienThoai { get; set; } = string.Empty;
        public string? Email { get; set; }
        public decimal? CanNang { get; set; }
        public DateTime NgayDangKy { get; set; }
        public bool TrangThai { get; set; }

        // Thống kê hiến máu
        public int SoLanHien { get; set; }
        public decimal TongTheTich { get; set; }
        public DateTime? LanHienGanNhat { get; set; }
        public DateTime? NgayCoTheHienTiepTheo { get; set; }
    }

    public class UpdateDonorRequest
    {
        [Required, MaxLength(100)]
        public string HoTen { get; set; } = string.Empty;

        [Required]
        public DateTime NgaySinh { get; set; }

        [Required]
        public string GioiTinh { get; set; } = string.Empty;

        public string? NhomMau { get; set; }
        public string? HeRh { get; set; }
        public string? DiaChi { get; set; }

        [Required, Phone(ErrorMessage = "Số điện thoại không hợp lệ.")]
        public string SoDienThoai { get; set; } = string.Empty;

        [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
        public string? Email { get; set; }

        public decimal? CanNang { get; set; }
    }

    // Nhân viên tạo hồ sơ cho người đến hiến trực tiếp chưa có tài khoản.
    // Tài khoản đăng nhập = số CCCD, mật khẩu ban đầu = số điện thoại (người hiến tự đổi sau).
    public class CreateDonorByStaffRequest : UpdateDonorRequest
    {
        [Required, MaxLength(20)]
        public string CCCD { get; set; } = string.Empty;
    }

    public class CreateDonorResultDto
    {
        public DonorDto Donor { get; set; } = new();
        public string Username { get; set; } = string.Empty;
        public string MatKhauBanDau { get; set; } = string.Empty;
    }

    // Một dòng trong lịch sử hiến máu: đi từ đăng ký -> sàng lọc -> lấy máu
    public class DonationHistoryDto
    {
        public int DangKyId { get; set; }
        public int DotId { get; set; }
        public string TenDot { get; set; } = string.Empty;
        public string TenDiem { get; set; } = string.Empty;
        public string DiaChi { get; set; } = string.Empty;
        public DateTime NgayBatDau { get; set; }
        public DateTime NgayDangKy { get; set; }
        public string TrangThai { get; set; } = string.Empty;
        public string? GhiChu { get; set; }

        public DateTime? NgayKham { get; set; }
        public string? KetQuaSangLoc { get; set; }
        public string? LyDoKhongDat { get; set; }
        public decimal? CanNang { get; set; }
        public string? HuyetAp { get; set; }
        public decimal? Hemoglobin { get; set; }

        public DateTime? NgayLayMau { get; set; }
        public decimal? TheTich { get; set; }
        public List<string> MaLoMau { get; set; } = new();
    }
}
