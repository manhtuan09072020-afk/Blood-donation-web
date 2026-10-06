using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Data
{
    // Sinh dữ liệu minh họa (người hiến, đợt hiến, sàng lọc, tiếp nhận, kho máu, xuất kho, thông báo)
    // theo dòng thời gian thực tế để demo dashboard và báo cáo. Chỉ chạy một lần trên CSDL mới
    // (chưa có bản ghi tiếp nhận máu). Tắt bằng cấu hình "SeedDemoData": false.
    public static class DemoDataSeeder
    {
        private static readonly string[] Ho = { "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý" };
        private static readonly string[] DemNam = { "Văn", "Hữu", "Minh", "Đức", "Quốc", "Thành", "Hoàng", "Gia", "Tuấn", "Anh" };
        private static readonly string[] DemNu = { "Thị", "Ngọc", "Thu", "Thanh", "Mỹ", "Khánh", "Bảo", "Phương" };
        private static readonly string[] TenNam = { "Hùng", "Dũng", "Khoa", "Long", "Nam", "Phúc", "Quân", "Sơn", "Tài", "Thắng", "Trung", "Vinh", "Hiếu", "Kiên", "Lâm", "Huy" };
        private static readonly string[] TenNu = { "Anh", "Châu", "Diệp", "Giang", "Hà", "Hằng", "Hương", "Lan", "Linh", "Mai", "Ngân", "Nhung", "Oanh", "Trang", "Vy", "Yến" };
        private static readonly string[] DiaChis =
        {
            "Phường Bến Nghé, Quận 1", "Phường 7, Quận 3", "Phường 12, Quận 10", "Phường Tân Sơn Nhì, Quận Tân Phú",
            "Phường Sơn Kỳ, Quận Tân Phú", "Phường 15, Quận Tân Bình", "Phường 25, Quận Bình Thạnh", "Phường Linh Trung, TP. Thủ Đức",
            "Phường Hiệp Phú, TP. Thủ Đức", "Phường 5, Quận Gò Vấp", "Phường Tân Phong, Quận 7", "Phường Bình Trị Đông, Quận Bình Tân"
        };
        private static readonly string[] LyDoKhongDat =
        {
            "Huyết áp cao (165/100 mmHg)", "Hemoglobin thấp (11.4 g/dL)", "Đang điều trị kháng sinh",
            "Cân nặng dưới 42kg", "Thức khuya, mạch nhanh (110 lần/phút)", "Sốt nhẹ (37.9°C)"
        };
        private static readonly string[] LyDoXuat =
        {
            "Cấp cứu phẫu thuật", "Bổ sung cơ số máu dự trữ", "Điều trị bệnh nhân Thalassemia",
            "Phẫu thuật tim", "Bệnh nhân sốt xuất huyết", "Sản phụ băng huyết"
        };

        public static async Task SeedAsync(AppDbContext db, ILogger logger)
        {
            if (!await db.Database.CanConnectAsync()) return;
            if (await db.TiepNhanMaus.AnyAsync() || await db.NguoiHienMaus.CountAsync() > 1) return;

            logger.LogInformation("Đang tạo dữ liệu minh họa...");
            var rnd = new Random(2026);
            var now = DateTime.Now;
            var today = now.Date;
            var hash = PasswordHasher.Hash(DbSeeder.DefaultPassword);

            // ===== Danh mục =====
            await EnsureCatalogAsync(db);

            // ===== Nhân viên =====
            async Task<NhanVien> EnsureStaff(string username, string role, string hoTen, string chucVu, string phone)
            {
                var acc = await db.TaiKhoans.FirstOrDefaultAsync(a => a.Username == username);
                if (acc == null)
                {
                    acc = new TaiKhoan { Username = username, PasswordHash = hash, Role = role, Email = $"{username.Replace(".", "")}@hienmau.vn" };
                    db.TaiKhoans.Add(acc);
                    await db.SaveChangesAsync();
                }
                var staff = await db.NhanViens.FirstOrDefaultAsync(s => s.AccountId == acc.Id);
                if (staff == null)
                {
                    staff = new NhanVien { AccountId = acc.Id, HoTen = hoTen, ChucVu = chucVu, SoDienThoai = phone, Email = acc.Email };
                    db.NhanViens.Add(staff);
                    await db.SaveChangesAsync();
                }
                return staff;
            }

            var admin = await db.NhanViens.FirstAsync(s => s.TaiKhoan!.Role == RoleNames.QuanTri);
            var tiepNhan = await EnsureStaff("nv.tiepnhan01", RoleNames.NhanVienTiepNhan, "Trần Văn Bình", "Nhân viên tiếp nhận", "0903111222");
            var sangLoc = await EnsureStaff("nv.sangloc01", RoleNames.NhanVienSangLoc, "Bác sĩ Lê Thị Hoa", "Nhân viên sàng lọc", "0903222333");
            var kho = await EnsureStaff("nv.kho01", RoleNames.NhanVienKho, "Phạm Minh Khoa", "Nhân viên quản lý kho", "0903333444");
            await EnsureStaff("nv.tiepnhan02", RoleNames.NhanVienTiepNhan, "Ngô Thanh Tâm", "Nhân viên tiếp nhận", "0903444555");
            await EnsureStaff("nv.sangloc02", RoleNames.NhanVienSangLoc, "Bác sĩ Đỗ Quang Huy", "Nhân viên sàng lọc", "0903555666");

            // ===== Người hiến máu =====
            var donors = await db.NguoiHienMaus.ToListAsync();
            var bloodTypes = new (string nhom, string rh, double w)[]
            {
                ("O", "Rh+", 40), ("B", "Rh+", 30), ("A", "Rh+", 21), ("AB", "Rh+", 6),
                ("O", "Rh-", 1.5), ("A", "Rh-", 0.6), ("B", "Rh-", 0.6), ("AB", "Rh-", 0.3)
            };
            (string, string) PickBloodType()
            {
                var total = bloodTypes.Sum(b => b.w);
                var x = rnd.NextDouble() * total;
                foreach (var b in bloodTypes) { if ((x -= b.w) <= 0) return (b.nhom, b.rh); }
                return ("O", "Rh+");
            }

            for (int i = 1; i <= 60; i++)
            {
                var nam = rnd.Next(100) < 55;
                var hoTen = $"{Ho[rnd.Next(Ho.Length)]} {(nam ? DemNam[rnd.Next(DemNam.Length)] : DemNu[rnd.Next(DemNu.Length)])} {(nam ? TenNam[rnd.Next(TenNam.Length)] : TenNu[rnd.Next(TenNu.Length)])}";
                var (nhom, rh) = PickBloodType();
                if (i == 5) (nhom, rh) = ("O", "Rh-");
                if (i == 17) (nhom, rh) = ("A", "Rh-");
                if (i == 33) (nhom, rh) = ("B", "Rh-");
                if (i == 41) (nhom, rh) = ("AB", "Rh+");
                var chuaBiet = i is 12 or 27 or 49; // chưa xét nghiệm nhóm máu

                var ngaySinh = today.AddYears(-rnd.Next(19, 56)).AddDays(-rnd.Next(0, 365));
                var username = $"nguoihien{i:D2}";
                var acc = new TaiKhoan { Username = username, PasswordHash = hash, Role = RoleNames.NguoiHienMau, Email = $"{username}@gmail.com", NgayTao = i % 15 == 0 ? today.AddDays(-rnd.Next(0, 5)).AddHours(9) : today.AddDays(-rnd.Next(20, 420)) };
                db.TaiKhoans.Add(acc);
                await db.SaveChangesAsync();

                var donor = new NguoiHienMau
                {
                    AccountId = acc.Id,
                    HoTen = hoTen,
                    NgaySinh = ngaySinh,
                    GioiTinh = nam ? "Nam" : "Nữ",
                    CCCD = $"0792{ngaySinh:yy}{i:D6}",
                    NhomMau = chuaBiet ? null : nhom,
                    HeRh = chuaBiet ? null : rh,
                    DiaChi = DiaChis[rnd.Next(DiaChis.Length)] + ", TP.HCM",
                    SoDienThoai = $"09{rnd.Next(10, 99)}{i:D2}{rnd.Next(1000, 9999)}",
                    Email = acc.Email,
                    CanNang = nam ? rnd.Next(55, 85) : rnd.Next(45, 65),
                    NgayDangKy = acc.NgayTao,
                    TrangThai = i != 58
                };
                if (i == 58) acc.TrangThai = false;
                db.NguoiHienMaus.Add(donor);
                donors.Add(donor);
            }
            await db.SaveChangesAsync();

            var vanA = donors.FirstOrDefault(d => d.CCCD == "079198000123") ?? donors[0];
            vanA.NgayDangKy = today.AddDays(-260);

            // ===== Điểm & đợt hiến máu =====
            var sites = await db.DiemHienMaus.OrderBy(s => s.Id).ToListAsync();
            var dotSpecs = new (int offset, int site, string ten, int quota)[]
            {
                (-205, 1, "Hiến máu nhân đạo - Chủ nhật Đỏ", 120),
                (-175, 2, "Ngày hội Giọt hồng tri ân", 150),
                (-145, 3, "Hiến máu tình nguyện sinh viên HUIT", 200),
                (-115, 0, "Hiến máu nhân đạo Hè yêu thương", 150),
                (-85, 4, "Hành trình Đỏ - Kết nối dòng máu Việt", 180),
                (-58, 5, "Hiến máu cứu người - Trung thu ấm áp", 120),
                (-31, 1, "Hiến máu nhân đạo tại Nhà Văn hóa Thanh niên", 150),
                (0, 0, "Ngày hội hiến máu tình nguyện tháng 10", 100),
                (5, 2, "Hiến máu tình nguyện sinh viên HUIT - đợt 2", 200),
                (20, 3, "Lễ hội Xuân Hồng - hiến máu đầu năm học", 150)
            };

            var campaigns = new List<DotHienMau>();
            foreach (var s in dotSpecs)
            {
                var start = today.AddDays(s.offset).AddHours(7).AddMinutes(30);
                var dot = new DotHienMau
                {
                    DiemId = sites[Math.Min(s.site, sites.Count - 1)].Id,
                    TenDot = s.ten,
                    NgayBatDau = start,
                    NgayKetThuc = start.Date.AddHours(16).AddMinutes(30).AddDays(s.offset == 0 ? 1 : 0),
                    SoLuongDuKien = s.quota,
                    MoTa = "Mỗi giọt máu cho đi - Một cuộc đời ở lại. Người hiến máu được khám sàng lọc miễn phí, nhận giấy chứng nhận và quà tặng.",
                    TrangThai = s.offset < 0 ? TrangThaiDot.DaKetThuc : s.offset == 0 ? TrangThaiDot.DangDienRa : TrangThaiDot.SapDienRa
                };
                db.DotHienMaus.Add(dot);
                campaigns.Add(dot);
            }
            await db.SaveChangesAsync();

            // ===== Đăng ký -> sàng lọc -> tiếp nhận -> kho =====
            var lastDonation = new Dictionary<int, DateTime>();
            var units = new List<KhoMau>();

            async Task<DangKyHienMau> Register(NguoiHienMau d, DotHienMau dot, string trangThai, string? ghiChu = null)
            {
                var ngayDk = dot.NgayBatDau.AddDays(-rnd.Next(2, 18)).AddHours(rnd.Next(0, 10));
                if (ngayDk < d.NgayDangKy) ngayDk = d.NgayDangKy.AddHours(2);
                var reg = new DangKyHienMau { NguoiHienId = d.Id, DotId = dot.Id, NgayDangKy = ngayDk, TrangThai = trangThai, GhiChu = ghiChu };
                db.DangKyHienMaus.Add(reg);
                await db.SaveChangesAsync();
                return reg;
            }

            async Task<KhamSangLoc> Screen(DangKyHienMau reg, NguoiHienMau d, DateTime at, bool dat)
            {
                var k = new KhamSangLoc
                {
                    DangKyId = reg.Id,
                    NhanVienId = sangLoc.Id,
                    NgayKham = at,
                    CanNang = d.CanNang,
                    HuyetAp = dat ? $"{rnd.Next(105, 135)}/{rnd.Next(65, 85)}" : "165/100",
                    Mach = dat ? rnd.Next(64, 90) : rnd.Next(95, 112),
                    NhietDo = dat ? 36.5m + rnd.Next(0, 6) / 10m : 37.2m + rnd.Next(0, 8) / 10m,
                    Hemoglobin = dat ? 12.6m + rnd.Next(0, 30) / 10m : 11.0m + rnd.Next(0, 10) / 10m,
                    KetQua = dat ? "Dat" : "KhongDat",
                    LyDoKhongDat = dat ? null : LyDoKhongDat[rnd.Next(LyDoKhongDat.Length)]
                };
                db.KhamSangLocs.Add(k);
                await db.SaveChangesAsync();
                return k;
            }

            async Task Collect(KhamSangLoc k, NguoiHienMau d, DateTime at)
            {
                if (d.NhomMau == null) { var (n, r) = PickBloodType(); d.NhomMau = n; d.HeRh = r; }

                var roll = rnd.Next(100);
                decimal theTich = roll < 20 ? 250 : roll < 70 ? 350 : 450;
                var t = new TiepNhanMau { KhamSangLocId = k.Id, NhanVienId = tiepNhan.Id, NgayLayMau = at, TheTich = theTich };
                db.TiepNhanMaus.Add(t);
                await db.SaveChangesAsync();

                var parts = new List<(string tp, decimal ml)>();
                if (rnd.Next(100) < 45) parts.Add((ThanhPhanMauNames.ToanPhan, theTich));
                else
                {
                    parts.Add((ThanhPhanMauNames.HongCau, Math.Round(theTich * 0.55m / 10) * 10));
                    parts.Add((ThanhPhanMauNames.HuyetTuong, Math.Round(theTich * 0.35m / 10) * 10));
                    if (theTich >= 350) parts.Add((ThanhPhanMauNames.TieuCau, 50));
                }

                foreach (var (tp, ml) in parts)
                {
                    var code = tp switch { "HongCau" => "HC", "HuyetTuong" => "HT", "TieuCau" => "TC", _ => "TP" };
                    var viTri = tp switch
                    {
                        "HuyetTuong" => $"Tủ đông HT-0{rnd.Next(1, 4)} / Ngăn {rnd.Next(1, 6)}",
                        "TieuCau" => $"Máy lắc tiểu cầu TC-0{rnd.Next(1, 3)}",
                        _ => $"Tủ lạnh {d.NhomMau}{(d.HeRh == "Rh+" ? "+" : "-")} / Ngăn {rnd.Next(1, 6)}"
                    };
                    var unit = new KhoMau
                    {
                        TiepNhanId = t.Id,
                        MaLoMau = $"LM{at:yyMMdd}{t.Id:D5}{code}",
                        NhomMau = d.NhomMau!,
                        HeRh = d.HeRh!,
                        ThanhPhanMau = tp,
                        SoLuong = ml,
                        HanSuDung = at.Date.AddDays(ThanhPhanMauNames.HanSuDungMacDinh(tp)),
                        ViTriLuuTru = viTri,
                        TrangThai = TrangThaiKhoMau.ConKho
                    };
                    db.KhoMaus.Add(unit);
                    units.Add(unit);
                }

                db.ThongBaos.Add(new ThongBao
                {
                    NguoiNhanId = d.Id,
                    TieuDe = "Cảm ơn bạn đã hiến máu!",
                    NoiDung = $"Bạn đã hiến {theTich:0} ml máu ngày {at:dd/MM/yyyy}. Giọt máu của bạn sẽ giúp cứu sống người bệnh. Bạn có thể hiến lại từ ngày {at.AddDays(DonationRules.SoNgayToiThieuGiua2LanHien):dd/MM/yyyy}.",
                    Loai = LoaiThongBao.ThongBaoChung,
                    NgayGui = at.AddHours(1),
                    DaDoc = at < today.AddDays(-3)
                });
                lastDonation[d.Id] = at;
                await db.SaveChangesAsync();
            }

            bool Eligible(NguoiHienMau d, DateTime at) =>
                d.TrangThai && d.NgayDangKy < at.AddDays(-1)
                && (!lastDonation.TryGetValue(d.Id, out var last) || (at.Date - last.Date).TotalDays >= DonationRules.SoNgayToiThieuGiua2LanHien);

            var others = donors.Where(d => d.Id != vanA.Id).ToList();

            // Các đợt đã kết thúc
            for (int c = 0; c < 7; c++)
            {
                var dot = campaigns[c];
                var pool = others.Where(d => Eligible(d, dot.NgayBatDau)).OrderBy(_ => rnd.Next()).Take(rnd.Next(11, 17)).ToList();
                if ((c == 0 || c == 3) && Eligible(vanA, dot.NgayBatDau)) pool.Insert(0, vanA);

                foreach (var d in pool)
                {
                    var roll = rnd.Next(100);
                    if (roll < 7 && d != vanA)
                    {
                        await Register(d, dot, TrangThaiDangKy.Huy, "Bận công tác đột xuất");
                        continue;
                    }
                    var at = dot.NgayBatDau.AddMinutes(rnd.Next(0, 480));
                    var dat = d == vanA || roll >= 19;
                    var reg = await Register(d, dot, dat ? TrangThaiDangKy.DaHienMau : TrangThaiDangKy.TuChoi);
                    var k = await Screen(reg, d, at, dat);
                    if (dat) await Collect(k, d, at.AddMinutes(25));
                }
            }

            // Đợt đang diễn ra hôm nay: đủ các trạng thái trong quy trình
            var ongoing = campaigns[7];
            var ongoingPool = others.Where(d => Eligible(d, today)).OrderBy(_ => rnd.Next()).Take(14).ToList();
            for (int i = 0; i < ongoingPool.Count; i++)
            {
                var d = ongoingPool[i];
                var at = today.AddHours(7.5).AddMinutes(i * 12);
                if (i < 3) await Register(d, ongoing, TrangThaiDangKy.ChoDuyet);
                else if (i < 7) await Register(d, ongoing, TrangThaiDangKy.DaDuyet);
                else if (i < 10)
                {
                    var reg = await Register(d, ongoing, TrangThaiDangKy.DaSangLoc);
                    await Screen(reg, d, at, true);
                }
                else
                {
                    var reg = await Register(d, ongoing, TrangThaiDangKy.DaHienMau);
                    var k = await Screen(reg, d, at, true);
                    await Collect(k, d, at.AddMinutes(20));
                }
            }

            // Các đợt sắp diễn ra
            var used = ongoingPool.Select(d => d.Id).ToHashSet();
            var up1 = campaigns[8];
            var up1Pool = others.Where(d => !used.Contains(d.Id) && Eligible(d, up1.NgayBatDau)).OrderBy(_ => rnd.Next()).Take(7).ToList();
            for (int i = 0; i < up1Pool.Count; i++)
                await Register(up1Pool[i], up1, i < 4 ? TrangThaiDangKy.ChoDuyet : TrangThaiDangKy.DaDuyet);
            foreach (var d in up1Pool) used.Add(d.Id);
            if (Eligible(vanA, up1.NgayBatDau)) await Register(vanA, up1, TrangThaiDangKy.ChoDuyet, "Đăng ký qua ứng dụng di động");

            var up2 = campaigns[9];
            foreach (var d in others.Where(d => !used.Contains(d.Id) && Eligible(d, up2.NgayBatDau)).OrderBy(_ => rnd.Next()).Take(3))
                await Register(d, up2, TrangThaiDangKy.ChoDuyet);

            // ===== Xuất kho cho cơ sở y tế (lịch xuất thứ Hai & thứ Năm) =====
            var facilities = await db.CoSoYTes.OrderBy(f => f.Id).ToListAsync();
            var issueGroups = new Dictionary<DateTime, List<KhoMau>>();
            foreach (var u in units)
            {
                var ngayNhap = u.HanSuDung.AddDays(-ThanhPhanMauNames.HanSuDungMacDinh(u.ThanhPhanMau));
                var issueDate = ngayNhap.AddDays(rnd.Next(1, u.ThanhPhanMau == ThanhPhanMauNames.TieuCau ? 3 : 20));
                while (issueDate.DayOfWeek != DayOfWeek.Monday && issueDate.DayOfWeek != DayOfWeek.Thursday) issueDate = issueDate.AddDays(1);

                var expiredNow = u.HanSuDung < today;
                var canIssue = issueDate < u.HanSuDung && issueDate < today;
                var wantIssue = rnd.Next(100) < (expiredNow ? 88 : 18);

                if (canIssue && wantIssue)
                {
                    if (!issueGroups.TryGetValue(issueDate, out var list)) issueGroups[issueDate] = list = new List<KhoMau>();
                    list.Add(u);
                }
                else if (expiredNow)
                {
                    u.TrangThai = rnd.Next(100) < 85 ? TrangThaiKhoMau.HetHan : TrangThaiKhoMau.HuyBo;
                }
            }

            foreach (var (date, list) in issueGroups.OrderBy(g => g.Key))
            {
                // Một ngày có thể có nhiều phiếu cho các bệnh viện khác nhau
                foreach (var chunk in list.Chunk(4))
                {
                    var f = facilities[rnd.Next(facilities.Count)];
                    var phieu = new PhieuXuatKho
                    {
                        NhanVienId = kho.Id,
                        CoSoYTeId = f.Id,
                        NoiNhan = f.TenCoSo,
                        NgayXuat = date.AddHours(rnd.Next(8, 16)).AddMinutes(rnd.Next(0, 60)),
                        LyDo = LyDoXuat[rnd.Next(LyDoXuat.Length)]
                    };
                    foreach (var u in chunk)
                    {
                        phieu.ChiTietXuatKhos.Add(new ChiTietXuatKho { KhoMau = u, SoLuong = u.SoLuong });
                        u.SoLuong = 0;
                        u.TrangThai = TrangThaiKhoMau.DaXuat;
                    }
                    db.PhieuXuatKhos.Add(phieu);
                }
            }
            await db.SaveChangesAsync();

            // ===== Chiến dịch vận động / lịch sử thông báo =====
            var activeDonors = donors.Where(d => d.TrangThai).ToList();
            void AddCampaign(string tieuDe, string noiDung, string loai, DateTime ngay, IEnumerable<NguoiHienMau> nguoiNhan,
                NhanVien nguoiTao, string? nhom = null, string? rh = null, int? dotId = null, int tyLeDoc = 70)
            {
                var c = new ChienDichVanDong
                {
                    TieuDe = tieuDe, NoiDung = noiDung, Loai = loai, NgayGui = ngay, NguoiTaoId = nguoiTao.Id,
                    NhomMauMucTieu = nhom, HeRhMucTieu = rh, DotId = dotId
                };
                foreach (var d in nguoiNhan)
                {
                    c.ThongBaos.Add(new ThongBao
                    {
                        NguoiNhanId = d.Id, TieuDe = tieuDe, NoiDung = noiDung, Loai = loai, NgayGui = ngay,
                        DaDoc = rnd.Next(100) < tyLeDoc
                    });
                }
                c.SoNguoiNhan = c.ThongBaos.Count;
                db.ChienDichVanDongs.Add(c);
            }

            AddCampaign("Chào mừng Ngày Quốc gia hiến máu tình nguyện 7/4",
                "Cảm ơn bạn đã đồng hành cùng phong trào hiến máu nhân đạo. Mỗi giọt máu cho đi - một cuộc đời ở lại!",
                LoaiThongBao.ThongBaoChung, today.AddDays(-182).AddHours(9), activeDonors.Where(d => d.NgayDangKy < today.AddDays(-182)), admin, tyLeDoc: 85);

            AddCampaign("Khẩn cấp: cần máu nhóm O Rh-",
                "Bệnh viện đang cần gấp máu nhóm O Rh- cho ca phẫu thuật cấp cứu. Rất mong bạn sắp xếp thời gian đến hiến máu.",
                LoaiThongBao.KeuGoiHienMau, today.AddDays(-64).AddHours(10), activeDonors.Where(d => d.NhomMau == "O" && d.HeRh == "Rh-"), kho, "O", "Rh-", tyLeDoc: 100);

            AddCampaign("Kêu gọi hiến máu nhóm B - mùa sốt xuất huyết",
                "Mùa sốt xuất huyết nhu cầu máu và tiểu cầu tăng cao. Người hiến nhóm máu B hãy đăng ký tham gia đợt hiến máu gần nhất nhé!",
                LoaiThongBao.KeuGoiHienMau, today.AddDays(-40).AddHours(8), activeDonors.Where(d => d.NhomMau == "B"), admin, "B", tyLeDoc: 60);

            AddCampaign($"Nhắc lịch: {ongoing.TenDot}",
                $"Bạn có lịch hiến máu lúc 07:30 ngày {ongoing.NgayBatDau:dd/MM/yyyy}. Hãy ăn nhẹ, ngủ đủ giấc và mang theo CCCD.",
                LoaiThongBao.NhacLich, today.AddDays(-1).AddHours(18), ongoingPool, tiepNhan, dotId: ongoing.Id, tyLeDoc: 55);

            AddCampaign($"Mời tham gia: {up1.TenDot}",
                $"Đợt hiến máu \"{up1.TenDot}\" sẽ diễn ra ngày {up1.NgayBatDau:dd/MM/yyyy}. Đăng ký ngay trên website hoặc ứng dụng di động!",
                LoaiThongBao.ThongBaoChung, today.AddDays(-3).AddHours(9), activeDonors, admin, dotId: up1.Id, tyLeDoc: 30);

            await db.SaveChangesAsync();
            logger.LogInformation("Đã tạo dữ liệu minh họa: {Donors} người hiến, {Dots} đợt hiến, {Units} lô máu.",
                donors.Count, campaigns.Count, units.Count);
        }

        // Bảo đảm có đủ danh mục khi CSDL được tạo từ script cũ
        private static async Task EnsureCatalogAsync(AppDbContext db)
        {
            if (!await db.CauHinhNhomMaus.AnyAsync())
            {
                db.CauHinhNhomMaus.AddRange(
                    new CauHinhNhomMau { NhomMau = "O", HeRh = "Rh+", NguongCanhBao = 1500, MoTa = "Phổ biến nhất (~42%). Cho được mọi nhóm Rh+" },
                    new CauHinhNhomMau { NhomMau = "A", HeRh = "Rh+", NguongCanhBao = 1500, MoTa = "Cho A+, AB+; nhận A, O" },
                    new CauHinhNhomMau { NhomMau = "B", HeRh = "Rh+", NguongCanhBao = 1500, MoTa = "Cho B+, AB+; nhận B, O" },
                    new CauHinhNhomMau { NhomMau = "AB", HeRh = "Rh+", NguongCanhBao = 600, MoTa = "Nhận được mọi nhóm máu Rh+" },
                    new CauHinhNhomMau { NhomMau = "O", HeRh = "Rh-", NguongCanhBao = 300, MoTa = "Nhóm cho phổ thông, rất hiếm" },
                    new CauHinhNhomMau { NhomMau = "A", HeRh = "Rh-", NguongCanhBao = 200, MoTa = "Hiếm - nhận A-, O-" },
                    new CauHinhNhomMau { NhomMau = "B", HeRh = "Rh-", NguongCanhBao = 200, MoTa = "Hiếm - nhận B-, O-" },
                    new CauHinhNhomMau { NhomMau = "AB", HeRh = "Rh-", NguongCanhBao = 150, MoTa = "Hiếm nhất - nhận mọi nhóm Rh-" });
            }

            if (await db.DiemHienMaus.CountAsync() < 6)
            {
                var existing = await db.DiemHienMaus.Select(s => s.TenDiem).ToListAsync();
                var sites = new[]
                {
                    new DiemHienMau { TenDiem = "Trung tâm Hiến máu Nhân đạo TP.HCM", DiaChi = "106 Thiên Phước, Phường 9, Quận Tân Bình, TP.HCM", SoDienThoai = "02838683496" },
                    new DiemHienMau { TenDiem = "Nhà Văn hóa Thanh niên TP.HCM", DiaChi = "4 Phạm Ngọc Thạch, Phường Bến Nghé, Quận 1, TP.HCM", SoDienThoai = "02838294345" },
                    new DiemHienMau { TenDiem = "Trường Đại học Công Thương TP.HCM", DiaChi = "140 Lê Trọng Tấn, Phường Tây Thạnh, Quận Tân Phú, TP.HCM", SoDienThoai = "02838163318" },
                    new DiemHienMau { TenDiem = "Nhà Văn hóa Sinh viên ĐHQG TP.HCM", DiaChi = "Khu đô thị ĐHQG, Phường Đông Hòa, TP. Dĩ An, Bình Dương", SoDienThoai = "02837242160" },
                    new DiemHienMau { TenDiem = "Bệnh viện Truyền máu Huyết học", DiaChi = "118 Hồng Bàng, Phường 12, Quận 5, TP.HCM", SoDienThoai = "02839571342" },
                    new DiemHienMau { TenDiem = "Cung Văn hóa Lao động TP.HCM", DiaChi = "55B Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP.HCM", SoDienThoai = "02839302405" }
                };
                db.DiemHienMaus.AddRange(sites.Where(s => !existing.Contains(s.TenDiem)));
            }

            if (!await db.CoSoYTes.AnyAsync())
            {
                db.CoSoYTes.AddRange(
                    new CoSoYTe { TenCoSo = "Bệnh viện Chợ Rẫy", DiaChi = "201B Nguyễn Chí Thanh, Quận 5, TP.HCM", SoDienThoai = "02838554137" },
                    new CoSoYTe { TenCoSo = "Bệnh viện Nhân dân 115", DiaChi = "527 Sư Vạn Hạnh, Quận 10, TP.HCM", SoDienThoai = "02838652368" },
                    new CoSoYTe { TenCoSo = "Bệnh viện Nhi Đồng 1", DiaChi = "341 Sư Vạn Hạnh, Quận 10, TP.HCM", SoDienThoai = "02839271119" },
                    new CoSoYTe { TenCoSo = "Bệnh viện Từ Dũ", DiaChi = "284 Cống Quỳnh, Quận 1, TP.HCM", SoDienThoai = "02854042829" },
                    new CoSoYTe { TenCoSo = "Bệnh viện Đại học Y Dược TP.HCM", DiaChi = "215 Hồng Bàng, Quận 5, TP.HCM", SoDienThoai = "02838554269" },
                    new CoSoYTe { TenCoSo = "Bệnh viện Thống Nhất", DiaChi = "1 Lý Thường Kiệt, Quận Tân Bình, TP.HCM", SoDienThoai = "02838642142" });
            }
            await db.SaveChangesAsync();
        }
    }
}
