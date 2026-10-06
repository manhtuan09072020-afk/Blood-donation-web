using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    // Mỗi lần gửi thông báo hàng loạt (kêu gọi hiến máu, nhắc lịch, thông báo chung) là một chiến dịch,
    // giúp quản lý lịch sử thông báo và đo lượt đọc.
    public class ChienDichVanDong
    {
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string TieuDe { get; set; } = string.Empty;

        [Required, MaxLength(500)]
        public string NoiDung { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string Loai { get; set; } = string.Empty;

        [MaxLength(2)]
        public string? NhomMauMucTieu { get; set; }

        [MaxLength(10)]
        public string? HeRhMucTieu { get; set; }

        public int? DotId { get; set; }
        public DotHienMau? DotHienMau { get; set; }

        public int? NguoiTaoId { get; set; }
        public NhanVien? NguoiTao { get; set; }

        public DateTime NgayGui { get; set; } = DateTime.Now;

        public int SoNguoiNhan { get; set; }

        public bool TuDong { get; set; }

        public ICollection<ThongBao> ThongBaos { get; set; } = new List<ThongBao>();
    }
}
