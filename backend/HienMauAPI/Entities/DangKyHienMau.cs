using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class DangKyHienMau
    {
        public int Id { get; set; }

        public int NguoiHienId { get; set; }
        public NguoiHienMau? NguoiHienMau { get; set; }

        public int DotId { get; set; }
        public DotHienMau? DotHienMau { get; set; }

        public DateTime NgayDangKy { get; set; } = DateTime.Now;

        [MaxLength(30)]
        public string TrangThai { get; set; } = TrangThaiDangKy.ChoDuyet;

        [MaxLength(255)]
        public string? GhiChu { get; set; }

        public KhamSangLoc? KhamSangLoc { get; set; }
    }
}
