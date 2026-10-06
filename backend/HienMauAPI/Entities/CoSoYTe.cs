using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    // Bệnh viện / cơ sở y tế nhận máu khi xuất kho
    public class CoSoYTe
    {
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string TenCoSo { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? DiaChi { get; set; }

        [MaxLength(15)]
        public string? SoDienThoai { get; set; }

        public bool TrangThai { get; set; } = true;

        public ICollection<PhieuXuatKho> PhieuXuatKhos { get; set; } = new List<PhieuXuatKho>();
    }
}
