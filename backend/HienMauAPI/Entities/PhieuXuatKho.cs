using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class PhieuXuatKho
    {
        public int Id { get; set; }

        public int NhanVienId { get; set; }
        public NhanVien? NhanVien { get; set; }

        public DateTime NgayXuat { get; set; } = DateTime.Now;

        public int? CoSoYTeId { get; set; }
        public CoSoYTe? CoSoYTe { get; set; }

        [Required, MaxLength(150)]
        public string NoiNhan { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? LyDo { get; set; }

        [MaxLength(100)]
        public string? NguoiNhan { get; set; }    // người đến nhận máu (ký biên bản giao nhận)

        [MaxLength(20)]
        public string? MucDoKhanCap { get; set; } // Thuong | Khan | CapCuu

        public ICollection<ChiTietXuatKho> ChiTietXuatKhos { get; set; } = new List<ChiTietXuatKho>();
    }
}
