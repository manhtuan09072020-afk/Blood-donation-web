using HienMauAPI.Data;
using HienMauAPI.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace HienMauAPI.Tests
{
    // Tạo AppDbContext chạy trên bộ nhớ (mỗi test một CSDL riêng) + dữ liệu mẫu dùng chung.
    // Lưu ý: InMemory không hỗ trợ transaction thật nên bỏ qua cảnh báo; việc rollback
    // vì vậy KHÔNG được kiểm chứng ở đây - các test chỉ kiểm tra logic nghiệp vụ.
    public static class TestDb
    {
        public static AppDbContext Create()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new AppDbContext(options);
        }

        public static (int staffId, int donorId, int dotId) SeedBasics(AppDbContext db)
        {
            var staffAcc = new TaiKhoan { Username = "nv1", PasswordHash = "x", Role = RoleNames.NhanVienTiepNhan };
            var donorAcc = new TaiKhoan { Username = "donor1", PasswordHash = "x", Role = RoleNames.NguoiHienMau };
            db.TaiKhoans.AddRange(staffAcc, donorAcc);
            db.SaveChanges();

            var staff = new NhanVien { AccountId = staffAcc.Id, HoTen = "Nhân viên A", ChucVu = "Tiếp nhận" };
            var donor = new NguoiHienMau
            {
                AccountId = donorAcc.Id, HoTen = "Người hiến A", NgaySinh = new DateTime(1995, 1, 1),
                GioiTinh = "Nam", CCCD = "079000000001", NhomMau = "O", HeRh = "Rh+", SoDienThoai = "0900000000"
            };
            var site = new DiemHienMau { TenDiem = "Điểm 1", DiaChi = "Địa chỉ 1" };
            db.NhanViens.Add(staff);
            db.NguoiHienMaus.Add(donor);
            db.DiemHienMaus.Add(site);
            db.SaveChanges();

            var dot = new DotHienMau
            {
                DiemId = site.Id, TenDot = "Đợt thử nghiệm",
                NgayBatDau = DateTime.Now.Date, NgayKetThuc = DateTime.Now.Date.AddDays(10),
                TrangThai = TrangThaiDot.DangDienRa
            };
            db.DotHienMaus.Add(dot);
            db.SaveChanges();

            return (staff.Id, donor.Id, dot.Id);
        }

        // Tạo sẵn một lô máu trong kho để test xuất kho
        public static KhoMau AddBloodUnit(AppDbContext db, int staffId, int donorId, int dotId,
            decimal soLuong = 450m, int hanSuDungSauNgay = 30, string trangThai = TrangThaiKhoMau.ConKho)
        {
            var reg = new DangKyHienMau { NguoiHienId = donorId, DotId = dotId, TrangThai = TrangThaiDangKy.DaHienMau };
            db.DangKyHienMaus.Add(reg);
            db.SaveChanges();

            var screening = new KhamSangLoc { DangKyId = reg.Id, NhanVienId = staffId, KetQua = "Dat" };
            db.KhamSangLocs.Add(screening);
            db.SaveChanges();

            var collection = new TiepNhanMau { KhamSangLocId = screening.Id, NhanVienId = staffId, TheTich = soLuong };
            db.TiepNhanMaus.Add(collection);
            db.SaveChanges();

            var unit = new KhoMau
            {
                TiepNhanId = collection.Id, MaLoMau = "LM" + Guid.NewGuid().ToString("N")[..10],
                NhomMau = "O", HeRh = "Rh+", ThanhPhanMau = "ToanPhan", SoLuong = soLuong,
                HanSuDung = DateTime.Now.Date.AddDays(hanSuDungSauNgay), TrangThai = trangThai
            };
            db.KhoMaus.Add(unit);
            db.SaveChanges();
            return unit;
        }
    }
}
