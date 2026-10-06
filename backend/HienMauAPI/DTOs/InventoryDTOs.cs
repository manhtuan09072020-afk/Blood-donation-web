using System.ComponentModel.DataAnnotations;

namespace HienMauAPI.DTOs
{
    public class BloodUnitDto
    {
        public int Id { get; set; }
        public string MaLoMau { get; set; } = string.Empty;
        public string NhomMau { get; set; } = string.Empty;
        public string HeRh { get; set; } = string.Empty;
        public string ThanhPhanMau { get; set; } = string.Empty;
        public decimal SoLuong { get; set; }
        public DateTime NgayNhap { get; set; }
        public DateTime HanSuDung { get; set; }
        public string? ViTriLuuTru { get; set; }
        public string TrangThai { get; set; } = string.Empty;
        public int SoNgayConLai { get; set; }
        public string? HoTenNguoiHien { get; set; }
    }

    public class InventorySummaryDto
    {
        public string NhomMau { get; set; } = string.Empty;
        public string HeRh { get; set; } = string.Empty;
        public string ThanhPhanMau { get; set; } = string.Empty;
        public decimal TongSoLuong { get; set; }
        public int SoLo { get; set; }
        public bool CanhBaoThieu { get; set; }
        public bool CoLoSapHetHan { get; set; }
    }

    public class InventoryAlertsDto
    {
        public List<BloodGroupDto> NhomMauThieu { get; set; } = new();
        public List<BloodUnitDto> LoSapHetHan { get; set; } = new();
        public int SoNgayCanhBao { get; set; }
    }

    public class UpdateLocationRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập vị trí lưu trữ."), MaxLength(50)]
        public string ViTriLuuTru { get; set; } = string.Empty;
    }

    public class IssueRequestDto
    {
        public int? CoSoYTeId { get; set; }

        [MaxLength(150)]
        public string? NoiNhan { get; set; }

        [MaxLength(255)]
        public string? LyDo { get; set; }

        [Required, MinLength(1, ErrorMessage = "Phiếu xuất phải có ít nhất 1 lô máu.")]
        public List<IssueItemDto> ChiTiet { get; set; } = new();
    }

    public class IssueItemDto
    {
        [Required] public int KhoMauId { get; set; }
        [Required, Range(0.01, 10000)] public decimal SoLuong { get; set; }
    }

    // Gợi ý chọn lô theo nguyên tắc FEFO (First Expired - First Out: hết hạn trước, xuất trước)
    public class IssueSuggestionDto
    {
        public decimal SoLuongYeuCau { get; set; }
        public decimal SoLuongDapUng { get; set; }
        public bool DuSoLuong { get; set; }
        public List<IssueSuggestionItemDto> ChiTiet { get; set; } = new();
    }

    public class IssueSuggestionItemDto
    {
        public BloodUnitDto Lo { get; set; } = new();
        public decimal SoLuongXuat { get; set; }
    }

    public class PhieuXuatKhoDto
    {
        public int Id { get; set; }
        public string MaPhieu => $"PX{Id:D5}";
        public int? CoSoYTeId { get; set; }
        public string NoiNhan { get; set; } = string.Empty;
        public DateTime NgayXuat { get; set; }
        public string? LyDo { get; set; }
        public string NhanVienThucHien { get; set; } = string.Empty;
        public decimal TongSoLuong { get; set; }
        public List<ChiTietXuatDto> ChiTiet { get; set; } = new();
    }

    public class ChiTietXuatDto
    {
        public int KhoMauId { get; set; }
        public string MaLoMau { get; set; } = string.Empty;
        public string NhomMau { get; set; } = string.Empty;
        public string HeRh { get; set; } = string.Empty;
        public string ThanhPhanMau { get; set; } = string.Empty;
        public decimal SoLuong { get; set; }
    }

    public class MedicalFacilityDto
    {
        public int Id { get; set; }
        public string TenCoSo { get; set; } = string.Empty;
        public string? DiaChi { get; set; }
        public string? SoDienThoai { get; set; }
        public bool TrangThai { get; set; }
        public int SoPhieuXuat { get; set; }
        public decimal TongDaNhan { get; set; }
    }

    public class SaveMedicalFacilityRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập tên cơ sở y tế."), MaxLength(150)] public string TenCoSo { get; set; } = string.Empty;
        [MaxLength(255)] public string? DiaChi { get; set; }
        [MaxLength(15)] public string? SoDienThoai { get; set; }
    }

    public class BloodGroupDto
    {
        public int Id { get; set; }
        public string NhomMau { get; set; } = string.Empty;
        public string HeRh { get; set; } = string.Empty;
        public string? MoTa { get; set; }
        public decimal NguongCanhBao { get; set; }
        public decimal TonKho { get; set; }
        public int SoLo { get; set; }
        public int SoNguoiHien { get; set; }
        public bool CanhBaoThieu { get; set; }
    }

    public class UpdateBloodGroupRequest
    {
        [MaxLength(255)] public string? MoTa { get; set; }
        [Range(0, 1000000)] public decimal NguongCanhBao { get; set; }
    }
}
