using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class ThongBao
    {
        public int Id { get; set; }

        public int NguoiNhanId { get; set; }
        public NguoiHienMau? NguoiHienMau { get; set; }

        [Required, MaxLength(150)]
        public string TieuDe { get; set; } = string.Empty;

        [Required, MaxLength(500)]
        public string NoiDung { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string Loai { get; set; } = string.Empty;

        public DateTime NgayGui { get; set; } = DateTime.Now;

        public bool DaDoc { get; set; } = false;

        public int? ChienDichId { get; set; }
        public ChienDichVanDong? ChienDich { get; set; }
    }
}
