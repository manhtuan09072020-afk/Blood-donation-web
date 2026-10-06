using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.Entities
{
    // Danh mục 8 nhóm máu (ABO x Rh) kèm ngưỡng tồn kho tối thiểu dùng để cảnh báo thiếu máu
    public class CauHinhNhomMau
    {
        public int Id { get; set; }

        [Required, MaxLength(2)]
        public string NhomMau { get; set; } = string.Empty;

        [Required, MaxLength(10)]
        public string HeRh { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? MoTa { get; set; }

        public decimal NguongCanhBao { get; set; } = 2000m; // ml
    }
}
