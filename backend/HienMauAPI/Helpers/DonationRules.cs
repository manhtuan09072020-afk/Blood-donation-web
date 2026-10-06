namespace HienMauAPI.Helpers
{
    // Các quy tắc nghiệp vụ dùng chung (theo hướng dẫn của Viện Huyết học - Truyền máu TW)
    public static class DonationRules
    {
        public const int TuoiToiThieu = 18;
        public const int TuoiToiDa = 60;
        public const decimal CanNangToiThieu = 42m;      // kg
        public const decimal HemoglobinToiThieu = 12m;   // g/dL
        public const decimal NhietDoToiDa = 37.5m;       // độ C
        public const int SoNgayToiThieuGiua2LanHien = 84; // 12 tuần
        public const int SoNgayCanhBaoSapHetHan = 7;

        public static int TinhTuoi(DateTime ngaySinh, DateTime? homNay = null)
        {
            var today = (homNay ?? DateTime.Now).Date;
            var age = today.Year - ngaySinh.Year;
            if (ngaySinh.Date > today.AddYears(-age)) age--;
            return age;
        }

        public static DateTime? NgayCoTheHienTiepTheo(DateTime? lanHienGanNhat)
            => lanHienGanNhat?.Date.AddDays(SoNgayToiThieuGiua2LanHien);
    }
}
