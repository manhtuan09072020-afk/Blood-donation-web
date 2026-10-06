using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class DotHienMau
    {
        public int Id { get; set; }

        public int DiemId { get; set; }
        public DiemHienMau? DiemHienMau { get; set; }

        [Required, MaxLength(150)]
        public string TenDot { get; set; } = string.Empty;

        [Required]
        public DateTime NgayBatDau { get; set; }

        [Required]
        public DateTime NgayKetThuc { get; set; }

        public int? SoLuongDuKien { get; set; }

        [MaxLength(500)]
        public string? MoTa { get; set; }

        [MaxLength(30)]
        public string TrangThai { get; set; } = TrangThaiDot.SapDienRa;

        public ICollection<DangKyHienMau> DangKyHienMaus { get; set; } = new List<DangKyHienMau>();
    }
}
