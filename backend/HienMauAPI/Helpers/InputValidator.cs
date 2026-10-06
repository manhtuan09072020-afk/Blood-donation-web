namespace HienMauAPI.Helpers
{
    // Kiểm tra các giá trị liệt kê khớp với ràng buộc CHECK trong CSDL,
    // để trả lỗi 400 rõ ràng thay vì để SQL Server ném lỗi 500.
    public static class InputValidator
    {
        public static readonly string[] GioiTinhs = { "Nam", "Nữ", "Khác" };
        public static readonly string[] NhomMaus = { "A", "B", "AB", "O" };
        public static readonly string[] HeRhs = { "Rh+", "Rh-" };
        public static readonly string[] ThanhPhanMaus = { "ToanPhan", "HongCau", "HuyetTuong", "TieuCau" };

        // Chuỗi rỗng / toàn khoảng trắng -> null; còn lại cắt khoảng trắng hai đầu.
        public static string? NormalizeOptional(string? value)
            => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        public static bool IsValidCccd(string cccd)
            => cccd.Length == 12 && cccd.All(char.IsDigit);

        public static string? ValidateDonorFields(string gioiTinh, string? nhomMau, string? heRh)
        {
            if (!GioiTinhs.Contains(gioiTinh))
                return "Giới tính không hợp lệ (chỉ nhận: Nam, Nữ, Khác).";
            if (nhomMau != null && !NhomMaus.Contains(nhomMau))
                return "Nhóm máu không hợp lệ (chỉ nhận: A, B, AB, O).";
            if (heRh != null && !HeRhs.Contains(heRh))
                return "Hệ Rh không hợp lệ (chỉ nhận: Rh+, Rh-).";
            return null;
        }
    }
}
