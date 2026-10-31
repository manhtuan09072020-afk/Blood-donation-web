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
        public async Task Issue_PartOfBag_IsRejected_BecauseBloodIsIssuedWholeBag()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 450m);
            var service = new InventoryService(db);

            var (success, error, _) = await service.IssueAsync(staffId, Request((unit.Id, 200m)));

            Assert.False(success);
            Assert.Contains("nguyên túi", error);
            Assert.Equal(0, await db.PhieuXuatKhos.CountAsync());   // không có phiếu mồ côi
            var updated = await db.KhoMaus.SingleAsync(k => k.Id == unit.Id);
            Assert.Equal(450m, updated.SoLuong);
            Assert.Equal(TrangThaiKhoMau.ConKho, updated.TrangThai);
        }

        [Fact]
        public async Task Issue_WholeBag_MarksIssued_AndKeepsLabelVolume()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 350m);
            var service = new InventoryService(db);

            // Không cần gửi số lượng: hệ thống xuất nguyên túi
            var (success, error, data) = await service.IssueAsync(staffId, new IssueRequestDto
            {
                NoiNhan = "Bệnh viện Chợ Rẫy", NguoiNhan = "Điều dưỡng Lan", MucDoKhanCap = MucDoKhanCap.CapCuu,
                ChiTiet = new() { new IssueItemDto { KhoMauId = unit.Id } }
            });

            Assert.True(success, error);
            Assert.Equal(350m, data!.TongSoLuong);
            Assert.Equal(MucDoKhanCap.CapCuu, data.MucDoKhanCap);
            var updated = await db.KhoMaus.SingleAsync(k => k.Id == unit.Id);
            Assert.Equal(350m, updated.SoLuong);
            Assert.Equal(TrangThaiKhoMau.DaXuat, updated.TrangThai);
            Assert.Equal("Điều dưỡng Lan", (await db.PhieuXuatKhos.SingleAsync()).NguoiNhan);
        }

        [Fact]
        public async Task Split_Bag_CreatesTraceableChildBags()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 250m);
            unit.ThanhPhanMau = ThanhPhanMauNames.HongCau;
            db.SaveChanges();
            var service = new InventoryService(db);

            var (ok, error, children) = await service.SplitAsync(unit.Id, new List<decimal> { 100m, 100m });

            Assert.True(ok, error);
            Assert.Equal(2, children!.Count);
            Assert.Equal(unit.MaLoMau + "-A", children[0].MaLoMau);
            Assert.All(children, c => Assert.Equal(unit.MaLoMau, c.MaLoMauGoc));
            Assert.All(children, c => Assert.Equal(unit.HanSuDung, c.HanSuDung));
            Assert.Equal(TrangThaiKhoMau.DaChia, (await db.KhoMaus.SingleAsync(k => k.Id == unit.Id)).TrangThai);

            // Túi nhỏ xuất được bình thường
            var (issued, issueError, _) = await service.IssueAsync(staffId, Request((children[0].Id, 100m)));
            Assert.True(issued, issueError);
        }

        [Fact]
        public async Task Split_InvalidRequests_AreRejected()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var whole = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 350m); // máu toàn phần
            var rbc = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 200m);
            rbc.ThanhPhanMau = ThanhPhanMauNames.HongCau;
            db.SaveChanges();
            var service = new InventoryService(db);

            var (wholeOk, _, _) = await service.SplitAsync(whole.Id, new List<decimal> { 100m, 100m });
            var (tooMuch, _, _) = await service.SplitAsync(rbc.Id, new List<decimal> { 150m, 100m });
            var (oneBag, _, _) = await service.SplitAsync(rbc.Id, new List<decimal> { 100m });

            Assert.False(wholeOk);
            Assert.False(tooMuch);
            Assert.False(oneBag);
            Assert.Equal(2, await db.KhoMaus.CountAsync());
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

            var (ok, _) = await service.DiscardAsync(unit.Id, staffId, "Túi máu bị vỡ");
            var (issued, _, _) = await service.IssueAsync(staffId, Request((unit.Id, 100m)));

            Assert.True(ok);
            Assert.False(issued);
            var saved = await db.KhoMaus.SingleAsync();
            Assert.Equal(TrangThaiKhoMau.HuyBo, saved.TrangThai);
            Assert.Equal("Túi máu bị vỡ", saved.LyDoHuy);
            Assert.Equal(staffId, saved.NhanVienHuyId);
            Assert.NotNull(saved.NgayHuy);
        }

        [Fact]
        public async Task Discard_RequiresReason_AndRejectsIssuedUnits()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var unit = TestDb.AddBloodUnit(db, staffId, donorId, dotId);
            var issued = TestDb.AddBloodUnit(db, staffId, donorId, dotId, trangThai: TrangThaiKhoMau.DaXuat);
            var service = new InventoryService(db);

            var (noReason, _) = await service.DiscardAsync(unit.Id, staffId, "  ");
            var (issuedUnit, _) = await service.DiscardAsync(issued.Id, staffId, "Hỏng");

            Assert.False(noReason);
            Assert.False(issuedUnit);
            Assert.Equal(TrangThaiKhoMau.ConKho, (await db.KhoMaus.SingleAsync(k => k.Id == unit.Id)).TrangThai);
        }

        [Fact]
        public async Task DiscardExpired_RemovesOnlyExpiredUnits_WithReason()
        {
            using var db = TestDb.Create();
            var (staffId, donorId, dotId) = TestDb.SeedBasics(db);
            var expired1 = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 250m, hanSuDungSauNgay: -1);
            var expired2 = TestDb.AddBloodUnit(db, staffId, donorId, dotId, soLuong: 200m, hanSuDungSauNgay: -5);
            var fresh = TestDb.AddBloodUnit(db, staffId, donorId, dotId, hanSuDungSauNgay: 3);
            var service = new InventoryService(db);

            var result = await service.DiscardExpiredAsync(staffId);

            Assert.Equal(2, result.SoLo);
            Assert.Equal(450m, result.TongSoLuong);
            foreach (var id in new[] { expired1.Id, expired2.Id })
            {
                var u = await db.KhoMaus.SingleAsync(k => k.Id == id);
                Assert.Equal(TrangThaiKhoMau.HuyBo, u.TrangThai);
                Assert.Equal(InventoryService.LyDoHetHan, u.LyDoHuy);
            }
            Assert.Equal(TrangThaiKhoMau.ConKho, (await db.KhoMaus.SingleAsync(k => k.Id == fresh.Id)).TrangThai);
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
