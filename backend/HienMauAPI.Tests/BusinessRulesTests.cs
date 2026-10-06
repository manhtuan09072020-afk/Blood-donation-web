using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Services;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Tests
{
    // Kiểm thử các nghiệp vụ bổ sung: điều chế thành phần máu, gợi ý xuất kho FEFO,
    // giới hạn đăng ký, sàng lọc theo tiêu chuẩn, vận động hiến máu, tự động hóa trạng thái đợt.
    public class BusinessRulesTests
    {
        private static int SeedPassedScreening(HienMauAPI.Data.AppDbContext db, int staffId, int donorId, int dotId)
        {
            var reg = new DangKyHienMau { NguoiHienId = donorId, DotId = dotId, TrangThai = TrangThaiDangKy.DaSangLoc };
            db.DangKyHienMaus.Add(reg);
            db.SaveChanges();
            var screening = new KhamSangLoc { DangKyId = reg.Id, NhanVienId = staffId, KetQua = "Dat" };
            db.KhamSangLocs.Add(screening);
            db.SaveChanges();
            return screening.Id;
        }

        [Fact]
        public async Task Collection_WithComponentSeparation_CreatesOneUnitPerComponent()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var screeningId = SeedPassedScreening(db, staffId, donorId, dotId);
            var service = new CollectionService(db);

            var (success, error, data) = await service.CreateAsync(staffId, new CreateCollectionRequest
            {
                KhamSangLocId = screeningId,
                TheTich = 450,
                ThanhPhans = new()
                {
                    new() { ThanhPhanMau = "HongCau", TheTich = 250 },
                    new() { ThanhPhanMau = "HuyetTuong", TheTich = 150 },
                    new() { ThanhPhanMau = "TieuCau", TheTich = 50 }
                }
            });

            Assert.True(success, error);
            Assert.Equal(3, data!.CacLoMau.Count);
            var units = await db.KhoMaus.ToListAsync();
            Assert.Equal(3, units.Count);
            // Hạn dùng mặc định theo thành phần: tiểu cầu 5 ngày, huyết tương 1 năm
            Assert.Equal(DateTime.Now.Date.AddDays(5), units.Single(u => u.ThanhPhanMau == "TieuCau").HanSuDung);
            Assert.Equal(DateTime.Now.Date.AddDays(365), units.Single(u => u.ThanhPhanMau == "HuyetTuong").HanSuDung);
        }

        [Fact]
        public async Task Collection_ComponentsExceedingVolume_IsRejected()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var screeningId = SeedPassedScreening(db, staffId, donorId, dotId);
            var service = new CollectionService(db);

            var (success, _, _) = await service.CreateAsync(staffId, new CreateCollectionRequest
            {
                KhamSangLocId = screeningId,
                TheTich = 350,
                ThanhPhans = new()
                {
                    new() { ThanhPhanMau = "HongCau", TheTich = 250 },
                    new() { ThanhPhanMau = "HuyetTuong", TheTich = 200 }
                }
            });

            Assert.False(success);
            Assert.Equal(0, await db.TiepNhanMaus.CountAsync());
        }

        [Fact]
        public async Task Suggest_UsesFirstExpiredFirstOut()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var late = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 350m, hanSuDungSauNgay: 30);
            var soon = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 250m, hanSuDungSauNgay: 3);
            var service = new InventoryService(db);

            var result = await service.SuggestAsync("O", "Rh+", "ToanPhan", 400m);

            Assert.True(result.DuSoLuong);
            Assert.Equal(soon.Id, result.ChiTiet[0].Lo.Id);
            Assert.Equal(250m, result.ChiTiet[0].SoLuongXuat);
            Assert.Equal(late.Id, result.ChiTiet[1].Lo.Id);
            Assert.Equal(150m, result.ChiTiet[1].SoLuongXuat);
        }

        [Fact]
        public async Task Suggest_NotEnoughStock_ReportsShortage()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 250m);
            var service = new InventoryService(db);

            var result = await service.SuggestAsync("O", "Rh+", "ToanPhan", 1000m);

            Assert.False(result.DuSoLuong);
            Assert.Equal(250m, result.SoLuongDapUng);
        }

        [Fact]
        public async Task Registration_WhenCampaignFull_IsRejected()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            var dot = await db.DotHienMaus.FindAsync(dotId);
            dot!.SoLuongDuKien = 1;
            var other = new NguoiHienMau
            {
                AccountId = 99, HoTen = "Người khác", NgaySinh = new DateTime(1990, 1, 1), GioiTinh = "Nữ",
                CCCD = "079000000099", SoDienThoai = "0911111111"
            };
            db.NguoiHienMaus.Add(other);
            db.DangKyHienMaus.Add(new DangKyHienMau { NguoiHienMau = other, DotId = dotId, TrangThai = TrangThaiDangKy.DaDuyet });
            db.SaveChanges();
            var service = new RegistrationService(db);

            var (success, error, _) = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });

            Assert.False(success);
            Assert.Contains("đủ số lượng", error);
        }

        [Fact]
        public async Task Registration_WhileAnotherIsActive_IsRejected()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            var site = await db.DiemHienMaus.FirstAsync();
            var dot2 = new DotHienMau
            {
                DiemId = site.Id, TenDot = "Đợt 2", NgayBatDau = DateTime.Now.Date.AddDays(3),
                NgayKetThuc = DateTime.Now.Date.AddDays(4), TrangThai = TrangThaiDot.SapDienRa
            };
            db.DotHienMaus.Add(dot2);
            db.SaveChanges();
            var service = new RegistrationService(db);

            var first = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });
            var second = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dot2.Id });

            Assert.True(first.success, first.error);
            Assert.False(second.success);
            Assert.Contains("còn hiệu lực", second.error);
        }

        [Fact]
        public async Task WalkIn_IsApprovedImmediately()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            var service = new RegistrationService(db);

            var (success, error, data) = await service.CreateWalkInAsync(new WalkInRegistrationRequest { NguoiHienId = donorId, DotId = dotId });

            Assert.True(success, error);
            Assert.Equal(TrangThaiDangKy.DaDuyet, data!.TrangThai);
        }

        [Theory]
        [InlineData(40, 13.5, "120/80")]   // thiếu cân
        [InlineData(60, 11.0, "120/80")]   // Hemoglobin thấp
        [InlineData(60, 13.5, "170/105")]  // huyết áp cao
        public async Task Screening_PassWithOutOfRangeVitals_IsRejected(double canNang, double hb, string huyetAp)
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var reg = new DangKyHienMau { NguoiHienId = donorId, DotId = dotId, TrangThai = TrangThaiDangKy.DaDuyet };
            db.DangKyHienMaus.Add(reg);
            db.SaveChanges();
            var service = new ScreeningService(db);

            var (success, _, _) = await service.CreateAsync(staffId, new CreateScreeningRequest
            {
                DangKyId = reg.Id, CanNang = (decimal)canNang, Hemoglobin = (decimal)hb, HuyetAp = huyetAp, KetQua = "Dat"
            });

            Assert.False(success);
            Assert.Equal(0, await db.KhamSangLocs.CountAsync());
        }

        [Fact]
        public async Task CallForDonation_SkipsDonorsWhoDonatedRecently()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            TestDb.AddBloodUnit(db, staffId, donorId, dotId); // vừa hiến hôm nay
            var service = new NotificationService(db);

            var (success, _, _) = await service.SendCallForDonationAsync(staffId, new SendCallForDonationRequest
            {
                TieuDe = "Cần máu O", NoiDung = "Kho máu thiếu nhóm O", NhomMau = "O", ChiNguoiDuDieuKien = true
            });

            Assert.False(success); // người hiến duy nhất chưa đủ 12 tuần
            Assert.Equal(0, await db.ChienDichVanDongs.CountAsync());
        }

        [Fact]
        public async Task CallForDonation_CreatesCampaignWithHistory()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, _) = TestDb.SeedBasics(db);
            var service = new NotificationService(db);

            var (success, error, data) = await service.SendCallForDonationAsync(staffId, new SendCallForDonationRequest
            {
                TieuDe = "Cần máu O", NoiDung = "Kho máu thiếu nhóm O", NhomMau = "O", HeRh = "Rh+"
            });

            Assert.True(success, error);
            Assert.Equal(1, data!.SoNguoiNhan);
            var campaigns = await service.GetCampaignsAsync(null);
            Assert.Single(campaigns);
            Assert.Equal("O", campaigns[0].NhomMauMucTieu);
            Assert.Equal(donorId, (await db.ThongBaos.SingleAsync()).NguoiNhanId);
        }

        [Fact]
        public async Task SyncStatuses_MovesCampaignsForwardByDate()
        {
            using var db = TestDb.Create();
            TestDb.SeedBasics(db);
            var site = await db.DiemHienMaus.FirstAsync();
            var past = new DotHienMau
            {
                DiemId = site.Id, TenDot = "Đã qua", NgayBatDau = DateTime.Now.AddDays(-10),
                NgayKetThuc = DateTime.Now.AddDays(-9), TrangThai = TrangThaiDot.SapDienRa
            };
            var cancelled = new DotHienMau
            {
                DiemId = site.Id, TenDot = "Đã hủy", NgayBatDau = DateTime.Now.AddDays(-1),
                NgayKetThuc = DateTime.Now.AddDays(1), TrangThai = TrangThaiDot.DaHuy
            };
            db.DotHienMaus.AddRange(past, cancelled);
            db.SaveChanges();
            var service = new CampaignService(db);

            await service.SyncStatusesAsync();

            Assert.Equal(TrangThaiDot.DaKetThuc, (await db.DotHienMaus.FindAsync(past.Id))!.TrangThai);
            Assert.Equal(TrangThaiDot.DaHuy, (await db.DotHienMaus.FindAsync(cancelled.Id))!.TrangThai);
        }

        [Fact]
        public async Task Issue_ToFacility_UsesFacilityNameAsReceiver()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 350m);
            var facility = new CoSoYTe { TenCoSo = "Bệnh viện Chợ Rẫy" };
            db.CoSoYTes.Add(facility);
            db.SaveChanges();
            var service = new InventoryService(db);

            var (success, error, data) = await service.IssueAsync(staffId, new IssueRequestDto
            {
                CoSoYTeId = facility.Id,
                ChiTiet = new() { new IssueItemDto { KhoMauId = unit.Id, SoLuong = 350m } }
            });

            Assert.True(success, error);
            Assert.Equal("Bệnh viện Chợ Rẫy", data!.NoiNhan);
            Assert.Equal(facility.Id, (await db.PhieuXuatKhos.SingleAsync()).CoSoYTeId);
        }
    }
}
