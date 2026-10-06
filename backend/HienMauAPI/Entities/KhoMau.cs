using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class KhoMau
    {
        public int Id { get; set; }

        public int TiepNhanId { get; set; }
        public TiepNhanMau? TiepNhanMau { get; set; }

        [Required, MaxLength(30)]
        public string MaLoMau { get; set; } = string.Empty;

        [Required, MaxLength(2)]
        public string NhomMau { get; set; } = string.Empty;

        [Required, MaxLength(10)]
        public string HeRh { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string ThanhPhanMau { get; set; } = string.Empty;

        [Required]
        public decimal SoLuong { get; set; } // ml còn lại

        [Required]
        public DateTime HanSuDung { get; set; }

        [MaxLength(50)]
        public string? ViTriLuuTru { get; set; }

        [MaxLength(20)]
        public string TrangThai { get; set; } = TrangThaiKhoMau.ConKho;

        public ICollection<ChiTietXuatKho> ChiTietXuatKhos { get; set; } = new List<ChiTietXuatKho>();
    }
}
