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

        // Hạn sử dụng mặc định theo thành phần (ngày) - dùng gợi ý khi tiếp nhận / điều chế
        public static int HanSuDungMacDinh(string thanhPhan) => thanhPhan switch
        {
            HongCau => 42,
            HuyetTuong => 365,
            TieuCau => 5,
            _ => 35
        };
    }

    public static class LoaiThongBao
    {
        public const string NhacLich = "NhacLich";
        public const string KeuGoiHienMau = "KeuGoiHienMau";
        public const string ThongBaoChung = "ThongBaoChung";
    }
}
