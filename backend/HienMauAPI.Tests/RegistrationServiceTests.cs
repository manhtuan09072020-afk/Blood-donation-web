using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Services;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Tests
{
    public class RegistrationServiceTests
    {
        [Fact]
        public async Task Create_NewRegistration_StartsAsPending()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            var service = new RegistrationService(db);

            var (success, error, data) = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });

            Assert.True(success, error);
            Assert.Equal(TrangThaiDangKy.ChoDuyet, data!.TrangThai);
        }

        [Fact]
        public async Task Create_DuplicateWhileActive_IsRejected()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            var service = new RegistrationService(db);

            await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });
            var (success, error, _) = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });

            Assert.False(success);
            Assert.Contains("đã đăng ký", error);
            Assert.Equal(1, await db.DangKyHienMaus.CountAsync());
        }

        [Fact]
        public async Task Create_AfterCancel_ReopensSameRecord_InsteadOfViolatingUniqueIndex()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            var service = new RegistrationService(db);

            var (_, _, first) = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });
            await service.CancelAsync(first!.Id, donorId);
            var (success, error, second) = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });

            Assert.True(success, error);
            Assert.Equal(first.Id, second!.Id);
            Assert.Equal(TrangThaiDangKy.ChoDuyet, second.TrangThai);
            Assert.Equal(1, await db.DangKyHienMaus.CountAsync());
        }

        [Fact]
        public async Task Create_Within12WeeksOfLastDonation_IsRejected()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            TestDb.AddBloodUnit(db, staffId, donorId, dotId);           // vừa hiến xong hôm nay
            var site = await db.DiemHienMaus.FirstAsync();
            var otherDot = new DotHienMau
            {
                DiemId = site.Id, TenDot = "Đợt khác",
                NgayBatDau = DateTime.Now.Date, NgayKetThuc = DateTime.Now.Date.AddDays(5),
                TrangThai = TrangThaiDot.SapDienRa
            };
            db.DotHienMaus.Add(otherDot);
            db.SaveChanges();
            var service = new RegistrationService(db);

            var (success, error, _) = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = otherDot.Id });

            Assert.False(success);
            Assert.Contains("chờ thêm", error);
        }

        [Fact]
        public async Task Create_ForEndedCampaign_IsRejected()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            var dot = await db.DotHienMaus.FindAsync(dotId);
            dot!.TrangThai = TrangThaiDot.DaKetThuc;
            db.SaveChanges();
            var service = new RegistrationService(db);

            var (success, _, _) = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });

            Assert.False(success);
        }

        [Fact]
        public async Task UpdateStatus_Approve_SetsStatusAndNotifiesDonor()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            var service = new RegistrationService(db);
            var (_, _, reg) = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });

            var (success, error) = await service.UpdateStatusAsync(reg!.Id, new UpdateRegistrationStatusRequest { TrangThai = TrangThaiDangKy.DaDuyet });

            Assert.True(success, error);
            Assert.Equal(TrangThaiDangKy.DaDuyet, (await db.DangKyHienMaus.SingleAsync()).TrangThai);
            var noti = await db.ThongBaos.SingleAsync(t => t.TieuDe == "Đăng ký hiến máu đã được duyệt");
            Assert.Equal(donorId, noti.NguoiNhanId);
        }

        [Theory]
        [InlineData(TrangThaiDangKy.DaHienMau)]   // nhân viên không được tự đánh dấu "đã hiến máu"
        [InlineData(TrangThaiDangKy.DaSangLoc)]
        [InlineData(TrangThaiDangKy.Huy)]         // chỉ người hiến mới được hủy
        public async Task UpdateStatus_ToStatusesReservedForOtherWorkflows_IsRejected(string target)
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            var service = new RegistrationService(db);
            var (_, _, reg) = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });

            var (success, _) = await service.UpdateStatusAsync(reg!.Id, new UpdateRegistrationStatusRequest { TrangThai = target });

            Assert.False(success);
            Assert.Equal(TrangThaiDangKy.ChoDuyet, (await db.DangKyHienMaus.SingleAsync()).TrangThai);
        }

        [Fact]
        public async Task Cancel_RegistrationOfAnotherDonor_IsRejected()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            var service = new RegistrationService(db);
            var (_, _, reg) = await service.CreateAsync(donorId, new CreateRegistrationRequest { DotId = dotId });

            var (success, _) = await service.CancelAsync(reg!.Id, nguoiHienId: donorId + 999);

            Assert.False(success);
            Assert.Equal(TrangThaiDangKy.ChoDuyet, (await db.DangKyHienMaus.SingleAsync()).TrangThai);
        }

        [Fact]
        public async Task Cancel_AfterScreening_IsRejected()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            TestDb.AddBloodUnit(db, staffId, donorId, dotId);    // đăng ký đã ở trạng thái DaHienMau
            var reg = await db.DangKyHienMaus.SingleAsync();
            var service = new RegistrationService(db);

            var (success, _) = await service.CancelAsync(reg.Id, donorId);

            Assert.False(success);
        }
    }
}
