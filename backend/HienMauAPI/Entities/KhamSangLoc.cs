using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class KhamSangLoc
    {
        public int Id { get; set; }

        public int DangKyId { get; set; }
        public DangKyHienMau? DangKyHienMau { get; set; }

        public int NhanVienId { get; set; }
        public NhanVien? NhanVien { get; set; }

        public DateTime NgayKham { get; set; } = DateTime.Now;

        public decimal? CanNang { get; set; }

        [MaxLength(20)]
        public string? HuyetAp { get; set; }

        public int? Mach { get; set; }

        public decimal? NhietDo { get; set; }

        public decimal? Hemoglobin { get; set; } // g/dL

        [MaxLength(255)]
        public string? GhiChu { get; set; }

        [Required, MaxLength(20)]
        public string KetQua { get; set; } = string.Empty; // "Dat" | "KhongDat"

        [MaxLength(255)]
        public string? LyDoKhongDat { get; set; }

        public TiepNhanMau? TiepNhanMau { get; set; }
    }
}
