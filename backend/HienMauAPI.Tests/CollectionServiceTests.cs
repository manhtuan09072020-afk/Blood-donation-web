using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Services;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Tests
{
    public class CollectionServiceTests
    {
        // Tạo chuỗi: đăng ký (DaDuyet) -> sàng lọc (ketQua) và trả về Id lượt khám
        private static int SeedScreening(HienMauAPI.Data.AppDbContext db, int staffId, int donorId, int dotId, string ketQua)
        {
            var reg = new DangKyHienMau { NguoiHienId = donorId, DotId = dotId, TrangThai = TrangThaiDangKy.DaSangLoc };
            db.DangKyHienMaus.Add(reg);
            db.SaveChanges();
            var screening = new KhamSangLoc { DangKyId = reg.Id, NhanVienId = staffId, KetQua = ketQua };
            db.KhamSangLocs.Add(screening);
            db.SaveChanges();
            return screening.Id;
        }

        private static CreateCollectionRequest Req(int screeningId) => new()
        {
            KhamSangLocId = screeningId,
            TheTich = 350m,
            ThanhPhanMau = "ToanPhan",
            HanSuDung = DateTime.Now.Date.AddDays(35)
        };

        [Fact]
        public async Task Create_PassedScreening_CreatesBloodUnitAndMarksRegistrationDonated()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var screeningId = SeedScreening(db, staffId, donorId, dotId, "Dat");
            var service = new CollectionService(db);

            var (success, error, data) = await service.CreateAsync(staffId, Req(screeningId));

            Assert.True(success, error);
            Assert.NotNull(data!.MaLoMauTaoRa);

            var unit = await db.KhoMaus.SingleAsync();
            Assert.Equal("O", unit.NhomMau);
            Assert.Equal("Rh+", unit.HeRh);
            Assert.Equal(350m, unit.SoLuong);
            Assert.Equal(TrangThaiKhoMau.ConKho, unit.TrangThai);
            Assert.Equal(TrangThaiDangKy.DaHienMau, (await db.DangKyHienMaus.SingleAsync()).TrangThai);
        }

        [Fact]
        public async Task Create_FailedScreening_IsRejected()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var screeningId = SeedScreening(db, staffId, donorId, dotId, "KhongDat");
            var service = new CollectionService(db);

            var (success, _, _) = await service.CreateAsync(staffId, Req(screeningId));

            Assert.False(success);
            Assert.Equal(0, await db.KhoMaus.CountAsync());
        }

        [Fact]
        public async Task Create_Twice_ForSameScreening_IsRejected()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var screeningId = SeedScreening(db, staffId, donorId, dotId, "Dat");
            var service = new CollectionService(db);

            await service.CreateAsync(staffId, Req(screeningId));
            var (success, error, _) = await service.CreateAsync(staffId, Req(screeningId));

            Assert.False(success);
            Assert.Contains("Đã tồn tại", error);
            Assert.Equal(1, await db.KhoMaus.CountAsync());
        }

        [Fact]
        public async Task Create_ExpiryInThePast_IsRejected()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var screeningId = SeedScreening(db, staffId, donorId, dotId, "Dat");
            var service = new CollectionService(db);
            var req = Req(screeningId);
            req.HanSuDung = DateTime.Now.Date.AddDays(-1);

            var (success, _, _) = await service.CreateAsync(staffId, req);

            Assert.False(success);
        }

        [Fact]
        public async Task Create_DonorWithoutBloodType_RequiresTypingResult_AndSavesItToProfile()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var donor = await db.NguoiHienMaus.FindAsync(donorId);
            donor!.NhomMau = null;
            donor.HeRh = null;
            db.SaveChanges();
            var screeningId = SeedScreening(db, staffId, donorId, dotId, "Dat");
            var service = new CollectionService(db);

            var (withoutType, _, _) = await service.CreateAsync(staffId, Req(screeningId));
            Assert.False(withoutType);

            var req = Req(screeningId);
            req.NhomMau = "AB";
            req.HeRh = "Rh-";
            var (withType, error, _) = await service.CreateAsync(staffId, req);

            Assert.True(withType, error);
            var saved = await db.NguoiHienMaus.FindAsync(donorId);
            Assert.Equal("AB", saved!.NhomMau);
            Assert.Equal("Rh-", saved.HeRh);
            Assert.Equal("AB", (await db.KhoMaus.SingleAsync()).NhomMau);
        }

        [Fact]
        public async Task GetPending_ListsOnlyPassedScreeningsWithoutCollection()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var passedId = SeedScreening(db, staffId, donorId, dotId, "Dat");
            var service = new CollectionService(db);

            var before = await service.GetPendingAsync();
            await service.CreateAsync(staffId, Req(passedId));
            var after = await service.GetPendingAsync();

            Assert.Single(before);
            Assert.Equal(passedId, before[0].Id);
            Assert.Empty(after);
        }
    }
}
