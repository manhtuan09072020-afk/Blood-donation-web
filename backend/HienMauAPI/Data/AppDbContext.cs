using HienMauAPI.Entities;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<TaiKhoan> TaiKhoans => Set<TaiKhoan>();
        public DbSet<NguoiHienMau> NguoiHienMaus => Set<NguoiHienMau>();
        public DbSet<NhanVien> NhanViens => Set<NhanVien>();
        public DbSet<DiemHienMau> DiemHienMaus => Set<DiemHienMau>();
        public DbSet<DotHienMau> DotHienMaus => Set<DotHienMau>();
        public DbSet<DangKyHienMau> DangKyHienMaus => Set<DangKyHienMau>();
        public DbSet<KhamSangLoc> KhamSangLocs => Set<KhamSangLoc>();
        public DbSet<TiepNhanMau> TiepNhanMaus => Set<TiepNhanMau>();
        public DbSet<KhoMau> KhoMaus => Set<KhoMau>();
        public DbSet<CoSoYTe> CoSoYTes => Set<CoSoYTe>();
        public DbSet<PhieuXuatKho> PhieuXuatKhos => Set<PhieuXuatKho>();
        public DbSet<ChiTietXuatKho> ChiTietXuatKhos => Set<ChiTietXuatKho>();
        public DbSet<CauHinhNhomMau> CauHinhNhomMaus => Set<CauHinhNhomMau>();
        public DbSet<ChienDichVanDong> ChienDichVanDongs => Set<ChienDichVanDong>();
        public DbSet<ThongBao> ThongBaos => Set<ThongBao>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Tên bảng trong SQL Server là số ít (xem database/HienMauNhanDao_CreateDB.sql),
            // trong khi tên DbSet là số nhiều -> phải ánh xạ tường minh, nếu không EF sẽ tìm bảng "TaiKhoans"...
            modelBuilder.Entity<TaiKhoan>().ToTable("TaiKhoan");
            modelBuilder.Entity<NguoiHienMau>().ToTable("NguoiHienMau");
            modelBuilder.Entity<NhanVien>().ToTable("NhanVien");
            modelBuilder.Entity<DiemHienMau>().ToTable("DiemHienMau");
            modelBuilder.Entity<DotHienMau>().ToTable("DotHienMau");
            modelBuilder.Entity<DangKyHienMau>().ToTable("DangKyHienMau");
            modelBuilder.Entity<KhamSangLoc>().ToTable("KhamSangLoc");
            modelBuilder.Entity<TiepNhanMau>().ToTable("TiepNhanMau");
            modelBuilder.Entity<KhoMau>().ToTable("KhoMau");
            modelBuilder.Entity<CoSoYTe>().ToTable("CoSoYTe");
            modelBuilder.Entity<PhieuXuatKho>().ToTable("PhieuXuatKho");
            modelBuilder.Entity<ChiTietXuatKho>().ToTable("ChiTietXuatKho");
            modelBuilder.Entity<CauHinhNhomMau>().ToTable("CauHinhNhomMau");
            modelBuilder.Entity<ChienDichVanDong>().ToTable("ChienDichVanDong");
            modelBuilder.Entity<ThongBao>().ToTable("ThongBao");

            // Cột NhomMau trong SQL là CHAR(2) nên SQL Server trả về chuỗi đệm khoảng trắng ("O ").
            // Cắt khoảng trắng khi đọc để API/giao diện luôn nhận "O", "A", "AB", "B".
            modelBuilder.Entity<NguoiHienMau>().Property(x => x.NhomMau).HasConversion(v => v, v => v == null ? null : v.Trim());
            modelBuilder.Entity<KhoMau>().Property(x => x.NhomMau).HasConversion(v => v, v => v.Trim());
            modelBuilder.Entity<CauHinhNhomMau>().Property(x => x.NhomMau).HasConversion(v => v, v => v.Trim());
            modelBuilder.Entity<ChienDichVanDong>().Property(x => x.NhomMauMucTieu).HasConversion(v => v, v => v == null ? null : v.Trim());

            // Độ chính xác số thập phân khớp với SQL (tránh cảnh báo và cắt cụt dữ liệu)
            modelBuilder.Entity<NguoiHienMau>().Property(x => x.CanNang).HasPrecision(5, 2);
            modelBuilder.Entity<KhamSangLoc>().Property(x => x.CanNang).HasPrecision(5, 2);
            modelBuilder.Entity<KhamSangLoc>().Property(x => x.NhietDo).HasPrecision(4, 1);
            modelBuilder.Entity<KhamSangLoc>().Property(x => x.Hemoglobin).HasPrecision(4, 1);
            modelBuilder.Entity<TiepNhanMau>().Property(x => x.TheTich).HasPrecision(6, 2);
            modelBuilder.Entity<CauHinhNhomMau>().Property(x => x.NguongCanhBao).HasPrecision(10, 2);

            modelBuilder.Entity<TaiKhoan>(e =>
            {
                e.HasIndex(x => x.Username).IsUnique();
            });

            // NguoiHienMau 1-1 TaiKhoan
            modelBuilder.Entity<NguoiHienMau>(e =>
            {
                e.HasIndex(x => x.CCCD).IsUnique();
                e.HasOne(x => x.TaiKhoan)
                 .WithOne(t => t.NguoiHienMau)
                 .HasForeignKey<NguoiHienMau>(x => x.AccountId)
                 .OnDelete(DeleteBehavior.Cascade);
                e.Property(x => x.NhomMau).HasMaxLength(2);
            });

            // NhanVien 1-1 TaiKhoan
            modelBuilder.Entity<NhanVien>(e =>
            {
                e.HasOne(x => x.TaiKhoan)
                 .WithOne(t => t.NhanVien)
                 .HasForeignKey<NhanVien>(x => x.AccountId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // DotHienMau -> DiemHienMau
            modelBuilder.Entity<DotHienMau>(e =>
            {
                e.HasOne(x => x.DiemHienMau)
                 .WithMany(d => d.DotHienMaus)
                 .HasForeignKey(x => x.DiemId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // DangKyHienMau: unique (NguoiHienId, DotId) - 1 người chỉ đăng ký 1 lần / đợt
            modelBuilder.Entity<DangKyHienMau>(e =>
            {
                e.HasIndex(x => new { x.NguoiHienId, x.DotId }).IsUnique();
                e.HasOne(x => x.NguoiHienMau)
                 .WithMany(n => n.DangKyHienMaus)
                 .HasForeignKey(x => x.NguoiHienId)
                 .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.DotHienMau)
                 .WithMany(d => d.DangKyHienMaus)
                 .HasForeignKey(x => x.DotId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // KhamSangLoc 1-1 DangKyHienMau
            modelBuilder.Entity<KhamSangLoc>(e =>
            {
                e.HasIndex(x => x.DangKyId).IsUnique();
                e.HasOne(x => x.DangKyHienMau)
                 .WithOne(d => d.KhamSangLoc)
                 .HasForeignKey<KhamSangLoc>(x => x.DangKyId)
                 .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.NhanVien)
                 .WithMany()
                 .HasForeignKey(x => x.NhanVienId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // TiepNhanMau 1-1 KhamSangLoc
            modelBuilder.Entity<TiepNhanMau>(e =>
            {
                e.HasIndex(x => x.KhamSangLocId).IsUnique();
                e.HasOne(x => x.KhamSangLoc)
                 .WithOne(k => k.TiepNhanMau)
                 .HasForeignKey<TiepNhanMau>(x => x.KhamSangLocId)
                 .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.NhanVien)
                 .WithMany()
                 .HasForeignKey(x => x.NhanVienId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // KhoMau n-1 TiepNhanMau (một lần lấy máu -> một hoặc nhiều chế phẩm)
            modelBuilder.Entity<KhoMau>(e =>
            {
                e.HasIndex(x => x.MaLoMau).IsUnique();
                e.HasIndex(x => new { x.NhomMau, x.HeRh, x.TrangThai });
                e.HasIndex(x => x.HanSuDung);
                e.HasOne(x => x.TiepNhanMau)
                 .WithMany(t => t.KhoMaus)
                 .HasForeignKey(x => x.TiepNhanId)
                 .OnDelete(DeleteBehavior.Restrict);
                e.Property(x => x.SoLuong).HasColumnType("decimal(6,2)");
            });

            // PhieuXuatKho -> NhanVien, CoSoYTe
            modelBuilder.Entity<PhieuXuatKho>(e =>
            {
                e.HasOne(x => x.NhanVien)
                 .WithMany()
                 .HasForeignKey(x => x.NhanVienId)
                 .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.CoSoYTe)
                 .WithMany(c => c.PhieuXuatKhos)
                 .HasForeignKey(x => x.CoSoYTeId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ChiTietXuatKho>(e =>
            {
                e.HasOne(x => x.PhieuXuatKho)
                 .WithMany(p => p.ChiTietXuatKhos)
                 .HasForeignKey(x => x.PhieuXuatId)
                 .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.KhoMau)
                 .WithMany(k => k.ChiTietXuatKhos)
                 .HasForeignKey(x => x.KhoMauId)
                 .OnDelete(DeleteBehavior.Restrict);
                e.Property(x => x.SoLuong).HasColumnType("decimal(6,2)");
            });

            modelBuilder.Entity<CauHinhNhomMau>(e =>
            {
                e.HasIndex(x => new { x.NhomMau, x.HeRh }).IsUnique();
            });

            modelBuilder.Entity<ChienDichVanDong>(e =>
            {
                e.HasOne(x => x.DotHienMau)
                 .WithMany()
                 .HasForeignKey(x => x.DotId)
                 .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.NguoiTao)
                 .WithMany()
                 .HasForeignKey(x => x.NguoiTaoId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ThongBao>(e =>
            {
                e.HasOne(x => x.NguoiHienMau)
                 .WithMany(n => n.ThongBaos)
                 .HasForeignKey(x => x.NguoiNhanId)
                 .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.ChienDich)
                 .WithMany(c => c.ThongBaos)
                 .HasForeignKey(x => x.ChienDichId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
