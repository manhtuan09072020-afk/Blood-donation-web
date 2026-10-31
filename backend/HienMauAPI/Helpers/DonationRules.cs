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

        // ===== Thể tích hiến máu toàn phần (Thông tư 26/2013/TT-BYT) =====
        // Mỗi lần hiến 250, 350 hoặc 450 ml; không quá 9 ml/kg cân nặng và không quá 500 ml.
        public static readonly int[] TheTichChuan = { 250, 350, 450 };
        public const decimal SoMlToiDaMoiKg = 9m;
        public const decimal HemoglobinHienTren250 = 12.5m; // g/dL - hiến từ 350 ml trở lên
        public const decimal SaiSoTheTichLayMau = 0.1m;     // túi thực tế được phép lệch ±10% so với chỉ định

        public static bool LaTheTichChuan(int theTich) => TheTichChuan.Contains(theTich);

        // Thể tích tối đa được hiến theo cân nặng và Hemoglobin - bác sĩ chỉ định không vượt quá mức này
        //  < 45 kg -> 250 ml · 45-49 kg -> 350 ml · ≥ 50 kg -> 450 ml (đều ≤ 9 ml/kg); Hb < 12,5 g/dL -> tối đa 250 ml
        public static int TheTichToiDaChoPhep(decimal canNang, decimal? hemoglobin)
        {
            if (canNang < CanNangToiThieu) return 0;
            var theoCanNang = TheTichChuan.Where(v => v <= canNang * SoMlToiDaMoiKg).DefaultIfEmpty(0).Max();
            if (canNang < 45m) theoCanNang = Math.Min(theoCanNang, 250);
            if (hemoglobin.HasValue && hemoglobin.Value < HemoglobinHienTren250) theoCanNang = Math.Min(theoCanNang, 250);
            return theoCanNang;
        }

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
