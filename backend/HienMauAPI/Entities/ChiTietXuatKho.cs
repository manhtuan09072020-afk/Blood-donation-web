namespace HienMauAPI.Entities
{
    public class ChiTietXuatKho
    {
        public int Id { get; set; }

        public int PhieuXuatId { get; set; }
        public PhieuXuatKho? PhieuXuatKho { get; set; }

        public int KhoMauId { get; set; }
        public KhoMau? KhoMau { get; set; }

        public decimal SoLuong { get; set; }
    }
}
