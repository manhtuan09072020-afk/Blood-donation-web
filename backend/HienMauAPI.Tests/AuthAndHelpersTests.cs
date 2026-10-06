using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using HienMauAPI.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HienMauAPI.Tests
{
    public class AuthAndHelpersTests
    {
        private static AuthService CreateAuth(HienMauAPI.Data.AppDbContext db)
        {
            var settings = Options.Create(new JwtSettings
            {
                SecretKey = new string('k', 48), Issuer = "test", Audience = "test", ExpiryMinutes = 5
            });
            return new AuthService(db, new JwtTokenGenerator(settings));
        }

        [Fact]
        public void PasswordHasher_VerifiesCorrectPassword_AndRejectsWrongOrMalformed()
        {
            var hash = PasswordHasher.Hash("matkhau123");

            Assert.True(PasswordHasher.Verify("matkhau123", hash));
            Assert.False(PasswordHasher.Verify("sai-mat-khau", hash));
            Assert.False(PasswordHasher.Verify("matkhau123", "HASH_PLACEHOLDER"));
        }

        [Fact]
        public void PasswordHasher_SamePasswordGivesDifferentHashes()
        {
            Assert.NotEqual(PasswordHasher.Hash("abc123"), PasswordHasher.Hash("abc123"));
        }

        [Fact]
        public void InputValidator_RejectsValuesThatWouldViolateDatabaseCheckConstraints()
        {
            Assert.Null(InputValidator.ValidateDonorFields("Nam", "AB", "Rh-"));
            Assert.Null(InputValidator.ValidateDonorFields("Nữ", null, null));
            Assert.NotNull(InputValidator.ValidateDonorFields("Male", null, null));
            Assert.NotNull(InputValidator.ValidateDonorFields("Nam", "C", null));
            Assert.NotNull(InputValidator.ValidateDonorFields("Nam", "A", "Rh*"));
        }

        [Fact]
        public async Task Seeder_ReplacesPlaceholderPassword_AndCreatesAdminStaffProfile()
        {
            using var db = TestDb.Create();
            db.TaiKhoans.Add(new TaiKhoan { Username = "admin", PasswordHash = "HASH_PLACEHOLDER", Role = RoleNames.QuanTri });
            db.SaveChanges();

            await HienMauAPI.Data.DbSeeder.SeedAsync(db, Microsoft.Extensions.Logging.Abstractions.NullLogger.Instance);

            var admin = await db.TaiKhoans.SingleAsync();
            Assert.True(PasswordHasher.Verify(HienMauAPI.Data.DbSeeder.DefaultPassword, admin.PasswordHash));
            Assert.Equal(1, await db.NhanViens.CountAsync(n => n.AccountId == admin.Id));
        }

        [Fact]
        public async Task Login_AdminAfterSeeding_GetsToken_AndWrongPasswordFails()
        {
            using var db = TestDb.Create();
            db.TaiKhoans.Add(new TaiKhoan { Username = "admin", PasswordHash = "HASH_PLACEHOLDER", Role = RoleNames.QuanTri });
            db.SaveChanges();
            await HienMauAPI.Data.DbSeeder.SeedAsync(db, Microsoft.Extensions.Logging.Abstractions.NullLogger.Instance);
            var auth = CreateAuth(db);

            var ok = await auth.LoginAsync(new LoginRequest { Username = "admin", Password = HienMauAPI.Data.DbSeeder.DefaultPassword });
            var bad = await auth.LoginAsync(new LoginRequest { Username = "admin", Password = "sai" });

            Assert.NotNull(ok);
            Assert.False(string.IsNullOrEmpty(ok!.Token));
            Assert.Null(bad);
        }

        [Fact]
        public async Task ChangePassword_RequiresCurrentPassword_AndTakesEffect()
        {
            using var db = TestDb.Create();
            db.TaiKhoans.Add(new TaiKhoan { Username = "u1", PasswordHash = PasswordHasher.Hash("cu12345"), Role = RoleNames.NguoiHienMau });
            db.SaveChanges();
            var id = (await db.TaiKhoans.SingleAsync()).Id;
            var auth = CreateAuth(db);

            var wrong = await auth.ChangePasswordAsync(id, new ChangePasswordRequest { CurrentPassword = "khong-dung", NewPassword = "moi12345" });
            var same = await auth.ChangePasswordAsync(id, new ChangePasswordRequest { CurrentPassword = "cu12345", NewPassword = "cu12345" });
            var ok = await auth.ChangePasswordAsync(id, new ChangePasswordRequest { CurrentPassword = "cu12345", NewPassword = "moi12345" });

            Assert.False(wrong.success);
            Assert.False(same.success);
            Assert.True(ok.success);
            Assert.True(PasswordHasher.Verify("moi12345", (await db.TaiKhoans.SingleAsync()).PasswordHash));
        }

        [Fact]
        public async Task RegisterDonor_RejectsUnderageAndInvalidBloodType()
        {
            using var db = TestDb.Create();
            var auth = CreateAuth(db);

            RegisterDonorRequest Make() => new()
            {
                Username = "newdonor", Password = "123456", HoTen = "Nguyễn Văn B",
                NgaySinh = new DateTime(1995, 5, 5), GioiTinh = "Nam", CCCD = "079111111111",
                SoDienThoai = "0911111111"
            };

            var underage = Make(); underage.NgaySinh = DateTime.Now.AddYears(-16);
            var badBlood = Make(); badBlood.NhomMau = "Z";
            var good = Make(); good.NhomMau = "A"; good.HeRh = "Rh+";

            Assert.False((await auth.RegisterDonorAsync(underage)).success);
            Assert.False((await auth.RegisterDonorAsync(badBlood)).success);
            Assert.True((await auth.RegisterDonorAsync(good)).success);
            Assert.Equal(1, await db.NguoiHienMaus.CountAsync());
        }
    }
}
