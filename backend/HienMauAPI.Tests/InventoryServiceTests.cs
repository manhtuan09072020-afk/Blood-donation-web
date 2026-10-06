using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Services;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Tests
{
    public class InventoryServiceTests
    {
        private static IssueRequestDto Request(params (int id, decimal ml)[] items) => new()
        {
            NoiNhan = "Bệnh viện Chợ Rẫy",
            LyDo = "Cấp cứu",
            ChiTiet = items.Select(i => new IssueItemDto { KhoMauId = i.id, SoLuong = i.ml }).ToList()
        };

        [Fact]
        public async Task Issue_PartialQuantity_ReducesStockAndKeepsUnitAvailable()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 450m);
            var service = new InventoryService(db);

            var (success, error, data) = await service.IssueAsync(staffId, Request((unit.Id, 200m)));

            Assert.True(success, error);
            Assert.NotNull(data);
            var updated = await db.KhoMaus.SingleAsync(k => k.Id == unit.Id);
            Assert.Equal(250m, updated.SoLuong);
            Assert.Equal(TrangThaiKhoMau.ConKho, updated.TrangThai);
            Assert.Equal(1, await db.PhieuXuatKhos.CountAsync());
            Assert.Equal(1, await db.ChiTietXuatKhos.CountAsync());
        }

        [Fact]
        public async Task Issue_FullQuantity_MarksUnitAsIssued()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 350m);
            var service = new InventoryService(db);

            var (success, _, _) = await service.IssueAsync(staffId, Request((unit.Id, 350m)));

            Assert.True(success);
            var updated = await db.KhoMaus.SingleAsync(k => k.Id == unit.Id);
            Assert.Equal(0m, updated.SoLuong);
            Assert.Equal(TrangThaiKhoMau.DaXuat, updated.TrangThai);
        }

        [Fact]
        public async Task Issue_MoreThanStock_FailsWithoutCreatingAnyRecord()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 450m);
            var service = new InventoryService(db);

            var (success, error, _) = await service.IssueAsync(staffId, Request((unit.Id, 500m)));

            Assert.False(success);
            Assert.Contains("vượt quá", error);
            Assert.Equal(0, await db.PhieuXuatKhos.CountAsync());   // không có phiếu mồ côi
            Assert.Equal(450m, (await db.KhoMaus.SingleAsync()).SoLuong);
        }

        [Fact]
        public async Task Issue_DuplicateLinesForSameUnit_AreSummedAndChecked()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 450m);
            var service = new InventoryService(db);

            // 300 + 300 = 600 > 450: từng dòng hợp lệ nhưng tổng thì không
            var (success, _, _) = await service.IssueAsync(staffId, Request((unit.Id, 300m), (unit.Id, 300m)));

            Assert.False(success);
            Assert.Equal(450m, (await db.KhoMaus.SingleAsync()).SoLuong);
        }

        [Fact]
        public async Task Issue_ExpiredUnit_IsRejected()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId, hanSuDungSauNgay: -1);
            var service = new InventoryService(db);

            var (success, error, _) = await service.IssueAsync(staffId, Request((unit.Id, 100m)));

            Assert.False(success);
            Assert.Contains("hết hạn", error);
        }

        [Fact]
        public async Task Issue_UnitNotInStock_IsRejected()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId, trangThai: TrangThaiKhoMau.HuyBo);
            var service = new InventoryService(db);

            var (success, error, _) = await service.IssueAsync(staffId, Request((unit.Id, 100m)));

            Assert.False(success);
            Assert.Contains("không còn khả dụng", error);
        }

        [Fact]
        public async Task Issue_OneInvalidLine_RejectsWholeVoucher()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var good = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 450m);
            var service = new InventoryService(db);

            var (success, _, _) = await service.IssueAsync(staffId, Request((good.Id, 100m), (99999, 100m)));

            Assert.False(success);
            Assert.Equal(450m, (await db.KhoMaus.SingleAsync()).SoLuong);  // lô hợp lệ cũng không bị trừ
            Assert.Equal(0, await db.PhieuXuatKhos.CountAsync());
        }

        [Fact]
        public async Task Issue_EmptyVoucher_IsRejected()
        {
            using var db = TestDb.Create();
            var (staffId, _, _) = TestDb.SeedBasics(db);
            var service = new InventoryService(db);

            var (success, _, _) = await service.IssueAsync(staffId, Request());

            Assert.False(success);
        }

        [Fact]
        public async Task Discard_UnitInStock_MarksAsDiscarded_ButCannotIssueAfterwards()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId);
            var service = new InventoryService(db);

            var (ok, _) = await service.DiscardAsync(unit.Id);
            var (issued, _, _) = await service.IssueAsync(staffId, Request((unit.Id, 100m)));

            Assert.True(ok);
            Assert.False(issued);
            Assert.Equal(TrangThaiKhoMau.HuyBo, (await db.KhoMaus.SingleAsync()).TrangThai);
        }

        [Fact]
        public async Task MarkExpiredUnits_ChangesStatusOfOutdatedUnitsOnly()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var expired = TestDb.AddBloodUnit(db, staffId, donorId, dotId, hanSuDungSauNgay: -3);
            var fresh = TestDb.AddBloodUnit(db, staffId, donorId, dotId, hanSuDungSauNgay: 10);
            var service = new InventoryService(db);

            await service.MarkExpiredUnitsAsync();

            Assert.Equal(TrangThaiKhoMau.HetHan, (await db.KhoMaus.SingleAsync(k => k.Id == expired.Id)).TrangThai);
            Assert.Equal(TrangThaiKhoMau.ConKho, (await db.KhoMaus.SingleAsync(k => k.Id == fresh.Id)).TrangThai);
        }
    }
}
