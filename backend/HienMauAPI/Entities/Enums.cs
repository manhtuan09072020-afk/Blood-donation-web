namespace HienMauAPI.Entities
{
    public static class RoleNames
    {
        public const string QuanTri = "QuanTri";
        public const string NhanVienTiepNhan = "NhanVienTiepNhan";
        public const string NhanVienSangLoc = "NhanVienSangLoc";
        public const string NhanVienKho = "NhanVienKho";

        public const string AllStaff = QuanTri + "," + NhanVienTiepNhan + "," + NhanVienSangLoc + "," + NhanVienKho;
        public const string NguoiHienMau = "NguoiHienMau";
    }

    public static class TrangThaiDangKy
    {
        public const string ChoDuyet = "ChoDuyet";
        public const string DaDuyet = "DaDuyet";
        public const string DaSangLoc = "DaSangLoc";
        public const string DaHienMau = "DaHienMau";
        public const string TuChoi = "TuChoi";
        public const string Huy = "Huy";
    }

    public static class TrangThaiKhoMau
    {
        public const string ConKho = "ConKho";
        public const string DaXuat = "DaXuat";
        public const string HetHan = "HetHan";
        public const string HuyBo = "HuyBo";
        public const string DaChia = "DaChia"; // túi gốc đã được chia thành các túi nhỏ (chia túi vô trùng)
    }

    // Loại túi lấy máu quyết định cách điều chế:
    //  - Túi đơn: chỉ lưu máu toàn phần
    //  - Túi đôi: ly tâm tách khối hồng cầu + huyết tương
    //  - Túi ba : tách khối hồng cầu + huyết tương + khối tiểu cầu
    public static class LoaiTuiMau
    {
        public const string Don = "Don";
        public const string Doi = "Doi";
        public const string Ba = "Ba";
    }

    public static class MucDoKhanCap
    {
        public const string Thuong = "Thuong";
        public const string Khan = "Khan";
        public const string CapCuu = "CapCuu";
    }

    public static class TrangThaiDot
    {
        public const string SapDienRa = "SapDienRa";
        public const string DangDienRa = "DangDienRa";
        public const string DaKetThuc = "DaKetThuc";
        public const string DaHuy = "DaHuy";
    }

    public static class ThanhPhanMauNames
    {
        public const string ToanPhan = "ToanPhan";
        public const string HongCau = "HongCau";
        public const string HuyetTuong = "HuyetTuong";
        public const string TieuCau = "TieuCau";

        // Hạn sử dụng theo thành phần (ngày, tính từ ngày lấy máu):
        //  máu toàn phần túi CPDA-1: 35 ngày (2-6°C) · khối hồng cầu dung dịch SAGM: 42 ngày (2-6°C)
        //  huyết tương tươi đông lạnh: 365 ngày (≤ -25°C) · khối tiểu cầu: 5 ngày (20-24°C, lắc liên tục)
        public static int HanSuDungMacDinh(string thanhPhan) => thanhPhan switch
        {
            HongCau => 42,
            HuyetTuong => 365,
            TieuCau => 5,
            _ => 35
        };

        public static string DieuKienBaoQuan(string thanhPhan) => thanhPhan switch
        {
            HuyetTuong => "≤ -25°C (tủ đông)",
            TieuCau => "20-24°C, lắc liên tục",
            _ => "2-6°C (tủ lạnh trữ máu)"
        };
    }

    public static class LoaiThongBao
    {
        public const string NhacLich = "NhacLich";
        public const string KeuGoiHienMau = "KeuGoiHienMau";
        public const string ThongBaoChung = "ThongBaoChung";
    }
}
