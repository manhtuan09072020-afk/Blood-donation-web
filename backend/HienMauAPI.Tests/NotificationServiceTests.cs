using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Services;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Tests
{
    public class NotificationServiceTests
    {
        private static SendReminderRequest Reminder(int dotId) => new() { DotId = dotId, TieuDe = "Nhắc lịch", NoiDung = "Nhớ đến đúng giờ" };

        [Fact]
        public async Task ReminderPreview_ExplainsWhyScreenedDonorIsNotReminded()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            db.DangKyHienMaus.Add(new DangKyHienMau { NguoiHienId = donorId, DotId = dotId, TrangThai = TrangThaiDangKy.DaSangLoc });
            db.SaveChanges();
            var service = new NotificationService(db);

            var preview = await service.GetReminderPreviewAsync(dotId);
            var (sent, error, _) = await service.SendReminderAsync(null, Reminder(dotId));

            Assert.Equal(1, preview!.SoDangKy);
            Assert.Equal(0, preview.SoCanNhac);
            Assert.False(preview.DangKy.Single().SeNhan);
            Assert.NotNull(preview.DangKy.Single().LyDoKhongNhan);
            Assert.False(sent);
            Assert.Contains("đã khám sàng lọc", error);
        }

        [Fact]
        public async Task Reminder_SentToApprovedRegistrations()
        {
            using var db = TestDb.Create();
            var (_, donorId, dotId) = TestDb.SeedBasics(db);
            db.DangKyHienMaus.Add(new DangKyHienMau { NguoiHienId = donorId, DotId = dotId, TrangThai = TrangThaiDangKy.DaDuyet });
            db.SaveChanges();
            var service = new NotificationService(db);

            var preview = await service.GetReminderPreviewAsync(dotId);
            var (sent, error, data) = await service.SendReminderAsync(null, Reminder(dotId));

            Assert.Equal(1, preview!.SoCanNhac);
            Assert.True(sent, error);
            Assert.Equal(1, data!.SoNguoiNhan);
            Assert.NotNull((await service.GetReminderPreviewAsync(dotId))!.LanNhacGanNhat);
        }

        [Fact]
        public async Task PeriodicStatus_DueDonorIsPendingThenReminded()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            TestDb.AddBloodUnit(db, staffId, donorId, dotId);
            (await db.TiepNhanMaus.SingleAsync()).NgayLayMau = DateTime.Now.AddDays(-90); // hiến cách đây 90 ngày
            db.SaveChanges();
            var service = new NotificationService(db);

            var before = await service.GetPeriodicStatusAsync();
            var (sent, error, _) = await service.SendPeriodicReminderAsync(null, tuDong: true);
            var after = await service.GetPeriodicStatusAsync();
            var (again, _, _) = await service.SendPeriodicReminderAsync(null, tuDong: true);

            Assert.Equal(NotificationService.DinhKyChoGui, before.NguoiDenHan.Single().TrangThai);
            Assert.True(sent, error);
            Assert.Equal(NotificationService.DinhKyDaNhac, after.NguoiDenHan.Single().TrangThai);
            Assert.Single(after.LichSu);
            Assert.False(again); // không nhắc lại lần hai
        }

        [Fact]
        public async Task PeriodicStatus_DonorWhoDonatedRecentlyIsNotDue()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            TestDb.AddBloodUnit(db, staffId, donorId, dotId); // vừa hiến hôm nay
            var service = new NotificationService(db);

            var status = await service.GetPeriodicStatusAsync();

            Assert.Equal(0, status.SoDenHan);
        }
    }
}
