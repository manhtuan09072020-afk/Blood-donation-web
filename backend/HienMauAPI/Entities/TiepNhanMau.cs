using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class TiepNhanMau
    {
        public int Id { get; set; }

        public int KhamSangLocId { get; set; }
        public KhamSangLoc? KhamSangLoc { get; set; }

        public int NhanVienId { get; set; }
        public NhanVien? NhanVien { get; set; }

        public DateTime NgayLayMau { get; set; } = DateTime.Now;

        [Required]
        public decimal TheTich { get; set; } // ml

        [MaxLength(255)]
        public string? GhiChu { get; set; }

        // Một lần lấy máu có thể được điều chế tách thành nhiều thành phần (hồng cầu, huyết tương, tiểu cầu)
        public ICollection<KhoMau> KhoMaus { get; set; } = new List<KhoMau>();
    }
}
