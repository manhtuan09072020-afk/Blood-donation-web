using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    public class DiemHienMau
    {
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string TenDiem { get; set; } = string.Empty;

        [Required, MaxLength(255)]
        public string DiaChi { get; set; } = string.Empty;

        [MaxLength(15)]
        public string? SoDienThoai { get; set; }

        public bool TrangThai { get; set; } = true;

        public ICollection<DotHienMau> DotHienMaus { get; set; } = new List<DotHienMau>();
    }
}
