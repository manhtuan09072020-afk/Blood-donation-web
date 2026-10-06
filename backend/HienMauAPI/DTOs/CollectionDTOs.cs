using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.DTOs
{
    public class CollectionDto
    {
        public int Id { get; set; }
        public int KhamSangLocId { get; set; }
        public int NguoiHienId { get; set; }
        public string HoTenNguoiHien { get; set; } = string.Empty;
        public string? NhomMau { get; set; }
        public string? HeRh { get; set; }
        public string TenDot { get; set; } = string.Empty;
        public DateTime NgayLayMau { get; set; }
        public decimal TheTich { get; set; }
        public string? GhiChu { get; set; }
        public string NhanVienThucHien { get; set; } = string.Empty;
        public string? MaLoMauTaoRa { get; set; }
        public List<CollectionUnitDto> CacLoMau { get; set; } = new();
    }

    public class CollectionUnitDto
    {
        public int Id { get; set; }
        public string MaLoMau { get; set; } = string.Empty;
        public string ThanhPhanMau { get; set; } = string.Empty;
        public decimal SoLuong { get; set; }
        public DateTime HanSuDung { get; set; }
        public string? ViTriLuuTru { get; set; }
    }

    public class CreateCollectionRequest
    {
        [Required] public int KhamSangLocId { get; set; }

        [Required, Range(1, 1000, ErrorMessage = "Thể tích phải từ 1 đến 1000 ml.")]
        public decimal TheTich { get; set; }

        [MaxLength(255)]
        public string? GhiChu { get; set; }

        // Trường hợp nhập kho nguyên túi (không điều chế): dùng các trường bên dưới.
        [MaxLength(30)]
        public string ThanhPhanMau { get; set; } = "ToanPhan";
        public DateTime? HanSuDung { get; set; }
        [MaxLength(50)]
        public string? ViTriLuuTru { get; set; }

        // Trường hợp điều chế tách thành phần: mỗi phần tử tạo một lô máu riêng trong kho.
        public List<CollectionComponentRequest>? ThanhPhans { get; set; }

        // Chỉ dùng khi hồ sơ người hiến chưa có nhóm máu: nhân viên nhập kết quả xét nghiệm tại chỗ.
        public string? NhomMau { get; set; }
        public string? HeRh { get; set; }
    }

    public class CollectionComponentRequest
    {
        [Required] public string ThanhPhanMau { get; set; } = string.Empty;
        [Range(1, 1000)] public decimal TheTich { get; set; }
        public DateTime? HanSuDung { get; set; }
        [MaxLength(50)] public string? ViTriLuuTru { get; set; }
    }
}
