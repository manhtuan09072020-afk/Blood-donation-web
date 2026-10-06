namespace HienMauAPI.DTOs
{
    public class DashboardStatsDto
    {
        public int TongNguoiHien { get; set; }
        public int NguoiHienMoiThangNay { get; set; }
        public int TongDotHienMauDangDienRa { get; set; }
        public int SoDotSapDienRa { get; set; }
        public int TongDangKyThangNay { get; set; }
        public int SoDangKyChoDuyet { get; set; }
        public int SoChoSangLoc { get; set; }
        public int SoChoTiepNhan { get; set; }
        public int SoLuotHienThangNay { get; set; }
        public decimal TongMauTiepNhanThangNay { get; set; } // ml
        public decimal TongXuatThangNay { get; set; } // ml
        public decimal TongTonKho { get; set; } // ml
        public int SoLoTonKho { get; set; }
        public int SoLoSapHetHan { get; set; }
        public int SoNhomMauThieu { get; set; }
    }

    public class BloodTypeStatDto
    {
        public string NhomMau { get; set; } = string.Empty;
        public string HeRh { get; set; } = string.Empty;
        public decimal TongSoLuong { get; set; }
        public decimal NguongCanhBao { get; set; }
    }

    public class MonthlyDonationStatDto
    {
        public int Thang { get; set; }
        public int Nam { get; set; }
        public int SoLuotHienMau { get; set; }
        public decimal TongTheTich { get; set; }
        public int SoPhieuXuat { get; set; }
        public decimal TongXuat { get; set; }
    }

    public class LabelValueDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
    }

    public class DonorReportDto
    {
        public int TongNguoiHien { get; set; }
        public int DaTungHien { get; set; }
        public List<LabelValueDto> TheoNhomMau { get; set; } = new();
        public List<LabelValueDto> TheoGioiTinh { get; set; } = new();
        public List<LabelValueDto> TheoDoTuoi { get; set; } = new();
        public List<LabelValueDto> MoiTheoThang { get; set; } = new();
        public List<DonorDto> TopNguoiHien { get; set; } = new();
    }

    public class CampaignReportDto
    {
        public int DotId { get; set; }
        public string TenDot { get; set; } = string.Empty;
        public string TenDiem { get; set; } = string.Empty;
        public DateTime NgayBatDau { get; set; }
        public string TrangThai { get; set; } = string.Empty;
        public int? SoLuongDuKien { get; set; }
        public int SoDangKy { get; set; }
        public int SoDaSangLoc { get; set; }
        public int SoDat { get; set; }
        public int SoKhongDat { get; set; }
        public int SoDaHien { get; set; }
        public decimal TongTheTich { get; set; }
    }

    public class IssueReportDto
    {
        public int SoPhieu { get; set; }
        public decimal TongXuat { get; set; }
        public List<LabelValueDto> TheoCoSo { get; set; } = new();
        public List<LabelValueDto> TheoNhomMau { get; set; } = new();
        public List<LabelValueDto> TheoThanhPhan { get; set; } = new();
    }

    public class InventoryReportDto
    {
        public decimal TongTonKho { get; set; }
        public int SoLoConKho { get; set; }
        public int SoLoSapHetHan { get; set; }
        public int SoLoHetHan { get; set; }
        public int SoLoHuyBo { get; set; }
        public decimal TongNhapTrongKy { get; set; }
        public decimal TongXuatTrongKy { get; set; }
        public List<LabelValueDto> TheoThanhPhan { get; set; } = new();
        public List<InventorySummaryDto> ChiTiet { get; set; } = new();
    }
}
