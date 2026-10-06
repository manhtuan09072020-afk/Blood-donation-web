/* ============================================================
   HỆ THỐNG QUẢN LÝ HIẾN MÁU NHÂN ĐẠO
   Script tạo cơ sở dữ liệu SQL Server (15 bảng)
   Đề tài: CNTT-KLCN265 - Trường ĐH Công Thương TP.HCM
   ------------------------------------------------------------
   Chạy toàn bộ script trong SSMS (hoặc sqlcmd). Script sẽ XÓA và
   TẠO LẠI database HienMauNhanDao.
   Mật khẩu các tài khoản mẫu được API tự đặt = Hienmau@123 khi khởi động.
   ============================================================ */

USE master;
GO

IF DB_ID('HienMauNhanDao') IS NOT NULL
BEGIN
    ALTER DATABASE HienMauNhanDao SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE HienMauNhanDao;
END
GO

CREATE DATABASE HienMauNhanDao;
GO

USE HienMauNhanDao;
GO

/* ============================================================
   1. TÀI KHOẢN & PHÂN QUYỀN
   ============================================================ */
CREATE TABLE TaiKhoan (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    Username        NVARCHAR(50)    NOT NULL CONSTRAINT UQ_TaiKhoan_Username UNIQUE,
    PasswordHash    NVARCHAR(256)   NOT NULL,
    Email           NVARCHAR(100)   NULL,
    Role            NVARCHAR(30)    NOT NULL
                        CONSTRAINT CK_TaiKhoan_Role
                        CHECK (Role IN (N'QuanTri', N'NhanVienTiepNhan', N'NhanVienSangLoc', N'NhanVienKho', N'NguoiHienMau')),
    TrangThai       BIT             NOT NULL DEFAULT (1), -- 1: Hoạt động, 0: Khóa
    NgayTao         DATETIME2       NOT NULL DEFAULT (SYSDATETIME())
);
GO

/* ============================================================
   2. NGƯỜI HIẾN MÁU
   ============================================================ */
CREATE TABLE NguoiHienMau (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    AccountId       INT             NOT NULL CONSTRAINT UQ_NguoiHienMau_Account UNIQUE
                        CONSTRAINT FK_NguoiHienMau_TaiKhoan REFERENCES TaiKhoan(Id) ON DELETE CASCADE,
    HoTen           NVARCHAR(100)   NOT NULL,
    NgaySinh        DATE            NOT NULL,
    GioiTinh        NVARCHAR(10)    NOT NULL CONSTRAINT CK_NguoiHienMau_GioiTinh CHECK (GioiTinh IN (N'Nam', N'Nữ', N'Khác')),
    CCCD            NVARCHAR(20)    NOT NULL CONSTRAINT UQ_NguoiHienMau_CCCD UNIQUE,
    NhomMau         CHAR(2)         NULL CONSTRAINT CK_NguoiHienMau_NhomMau CHECK (NhomMau IN ('A','B','AB','O')),
    HeRh            NVARCHAR(10)    NULL CONSTRAINT CK_NguoiHienMau_HeRh CHECK (HeRh IN (N'Rh+', N'Rh-')),
    DiaChi          NVARCHAR(255)   NULL,
    SoDienThoai     VARCHAR(15)     NOT NULL,
    Email           NVARCHAR(100)   NULL,
    CanNang         DECIMAL(5,2)    NULL,
    NgayDangKy      DATETIME2       NOT NULL DEFAULT (SYSDATETIME()),
    TrangThai       BIT             NOT NULL DEFAULT (1)
);
GO
CREATE INDEX IX_NguoiHienMau_NhomMau ON NguoiHienMau(NhomMau, HeRh);
GO

/* ============================================================
   3. NHÂN VIÊN (Quản trị / Tiếp nhận / Sàng lọc / Quản lý kho)
   ============================================================ */
CREATE TABLE NhanVien (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    AccountId       INT             NOT NULL CONSTRAINT UQ_NhanVien_Account UNIQUE
                        CONSTRAINT FK_NhanVien_TaiKhoan REFERENCES TaiKhoan(Id) ON DELETE CASCADE,
    HoTen           NVARCHAR(100)   NOT NULL,
    ChucVu          NVARCHAR(50)    NOT NULL,
    SoDienThoai     VARCHAR(15)     NULL,
    Email           NVARCHAR(100)   NULL,
    TrangThai       BIT             NOT NULL DEFAULT (1)
);
GO

/* ============================================================
   4. ĐIỂM HIẾN MÁU
   ============================================================ */
CREATE TABLE DiemHienMau (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    TenDiem         NVARCHAR(150)   NOT NULL,
    DiaChi          NVARCHAR(255)   NOT NULL,
    SoDienThoai     VARCHAR(15)     NULL,
    TrangThai       BIT             NOT NULL DEFAULT (1)
);
GO

/* ============================================================
   5. ĐỢT HIẾN MÁU (lịch tổ chức)
   ============================================================ */
CREATE TABLE DotHienMau (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    DiemId              INT             NOT NULL
                            CONSTRAINT FK_DotHienMau_Diem REFERENCES DiemHienMau(Id),
    TenDot              NVARCHAR(150)   NOT NULL,
    NgayBatDau          DATETIME2       NOT NULL,
    NgayKetThuc         DATETIME2       NOT NULL,
    SoLuongDuKien       INT             NULL,
    MoTa                NVARCHAR(500)   NULL,
    TrangThai           NVARCHAR(30)    NOT NULL DEFAULT (N'SapDienRa')
                            CONSTRAINT CK_DotHienMau_TrangThai
                            CHECK (TrangThai IN (N'SapDienRa', N'DangDienRa', N'DaKetThuc', N'DaHuy')),
    CONSTRAINT CK_DotHienMau_Ngay CHECK (NgayKetThuc >= NgayBatDau)
);
GO
CREATE INDEX IX_DotHienMau_NgayBatDau ON DotHienMau(NgayBatDau);
GO

/* ============================================================
   6. ĐĂNG KÝ HIẾN MÁU
   ============================================================ */
CREATE TABLE DangKyHienMau (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    NguoiHienId     INT             NOT NULL
                        CONSTRAINT FK_DangKy_NguoiHien REFERENCES NguoiHienMau(Id),
    DotId           INT             NOT NULL
                        CONSTRAINT FK_DangKy_Dot REFERENCES DotHienMau(Id),
    NgayDangKy      DATETIME2       NOT NULL DEFAULT (SYSDATETIME()),
    TrangThai       NVARCHAR(30)    NOT NULL DEFAULT (N'ChoDuyet')
                        CONSTRAINT CK_DangKy_TrangThai
                        CHECK (TrangThai IN (N'ChoDuyet', N'DaDuyet', N'DaSangLoc', N'DaHienMau', N'TuChoi', N'Huy')),
    GhiChu          NVARCHAR(255)   NULL,
    CONSTRAINT UQ_NguoiHien_Dot UNIQUE (NguoiHienId, DotId)
);
GO

/* ============================================================
   7. KHÁM SÀNG LỌC
   ============================================================ */
CREATE TABLE KhamSangLoc (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    DangKyId            INT             NOT NULL CONSTRAINT UQ_KhamSangLoc_DangKy UNIQUE
                            CONSTRAINT FK_KhamSangLoc_DangKy REFERENCES DangKyHienMau(Id),
    NhanVienId          INT             NOT NULL
                            CONSTRAINT FK_KhamSangLoc_NhanVien REFERENCES NhanVien(Id),
    NgayKham            DATETIME2       NOT NULL DEFAULT (SYSDATETIME()),
    CanNang             DECIMAL(5,2)    NULL,   -- kg
    HuyetAp             NVARCHAR(20)    NULL,   -- ví dụ 120/80
    Mach                INT             NULL,   -- lần/phút
    NhietDo             DECIMAL(4,1)    NULL,   -- độ C
    Hemoglobin          DECIMAL(4,1)    NULL,   -- g/dL
    KetQua              NVARCHAR(20)    NOT NULL CONSTRAINT CK_KhamSangLoc_KetQua CHECK (KetQua IN (N'Dat', N'KhongDat')),
    LyDoKhongDat        NVARCHAR(255)   NULL,
    GhiChu              NVARCHAR(255)   NULL
);
GO

/* ============================================================
   8. TIẾP NHẬN MÁU (lấy máu)
   ============================================================ */
CREATE TABLE TiepNhanMau (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    KhamSangLocId       INT             NOT NULL CONSTRAINT UQ_TiepNhan_KhamSangLoc UNIQUE
                            CONSTRAINT FK_TiepNhan_KhamSangLoc REFERENCES KhamSangLoc(Id),
    NhanVienId          INT             NOT NULL
                            CONSTRAINT FK_TiepNhan_NhanVien REFERENCES NhanVien(Id),
    NgayLayMau          DATETIME2       NOT NULL DEFAULT (SYSDATETIME()),
    TheTich             DECIMAL(6,2)    NOT NULL CONSTRAINT CK_TiepNhan_TheTich CHECK (TheTich > 0), -- ml
    GhiChu              NVARCHAR(255)   NULL
);
GO
CREATE INDEX IX_TiepNhanMau_NgayLayMau ON TiepNhanMau(NgayLayMau);
GO

/* ============================================================
   9. KHO MÁU (theo từng lô / túi chế phẩm máu)
      Một lần tiếp nhận có thể điều chế thành nhiều chế phẩm
   ============================================================ */
CREATE TABLE KhoMau (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    TiepNhanId          INT             NOT NULL
                            CONSTRAINT FK_KhoMau_TiepNhan REFERENCES TiepNhanMau(Id),
    MaLoMau             VARCHAR(30)     NOT NULL CONSTRAINT UQ_KhoMau_MaLo UNIQUE,
    NhomMau             CHAR(2)         NOT NULL CONSTRAINT CK_KhoMau_NhomMau CHECK (NhomMau IN ('A','B','AB','O')),
    HeRh                NVARCHAR(10)    NOT NULL CONSTRAINT CK_KhoMau_HeRh CHECK (HeRh IN (N'Rh+', N'Rh-')),
    ThanhPhanMau        NVARCHAR(30)    NOT NULL
                            CONSTRAINT CK_KhoMau_ThanhPhan
                            CHECK (ThanhPhanMau IN (N'ToanPhan', N'HongCau', N'HuyetTuong', N'TieuCau')),
    SoLuong             DECIMAL(6,2)    NOT NULL CONSTRAINT CK_KhoMau_SoLuong CHECK (SoLuong >= 0), -- ml còn lại
    HanSuDung           DATE            NOT NULL,
    ViTriLuuTru         NVARCHAR(50)    NULL,
    TrangThai           NVARCHAR(20)    NOT NULL DEFAULT (N'ConKho')
                            CONSTRAINT CK_KhoMau_TrangThai
                            CHECK (TrangThai IN (N'ConKho', N'DaXuat', N'HetHan', N'HuyBo'))
);
GO
CREATE INDEX IX_KhoMau_NhomMau_Rh ON KhoMau(NhomMau, HeRh, TrangThai);
CREATE INDEX IX_KhoMau_HanSuDung ON KhoMau(HanSuDung);
CREATE INDEX IX_KhoMau_TiepNhan ON KhoMau(TiepNhanId);
GO

/* ============================================================
   10. CƠ SỞ Y TẾ (nơi nhận máu khi xuất kho)
   ============================================================ */
CREATE TABLE CoSoYTe (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    TenCoSo             NVARCHAR(150)   NOT NULL,
    DiaChi              NVARCHAR(255)   NULL,
    SoDienThoai         VARCHAR(15)     NULL,
    TrangThai           BIT             NOT NULL DEFAULT (1)
);
GO

/* ============================================================
   11. PHIẾU XUẤT KHO
   ============================================================ */
CREATE TABLE PhieuXuatKho (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    NhanVienId          INT             NOT NULL
                            CONSTRAINT FK_PhieuXuat_NhanVien REFERENCES NhanVien(Id),
    CoSoYTeId           INT             NULL
                            CONSTRAINT FK_PhieuXuat_CoSoYTe REFERENCES CoSoYTe(Id),
    NgayXuat            DATETIME2       NOT NULL DEFAULT (SYSDATETIME()),
    NoiNhan             NVARCHAR(150)   NOT NULL, -- Tên cơ sở y tế nhận máu (lưu lại tại thời điểm xuất)
    LyDo                NVARCHAR(255)   NULL
);
GO

/* ============================================================
   12. CHI TIẾT XUẤT KHO
   ============================================================ */
CREATE TABLE ChiTietXuatKho (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    PhieuXuatId         INT             NOT NULL
                            CONSTRAINT FK_ChiTiet_Phieu REFERENCES PhieuXuatKho(Id) ON DELETE CASCADE,
    KhoMauId            INT             NOT NULL
                            CONSTRAINT FK_ChiTiet_KhoMau REFERENCES KhoMau(Id),
    SoLuong             DECIMAL(6,2)    NOT NULL CONSTRAINT CK_ChiTiet_SoLuong CHECK (SoLuong > 0)
);
GO

/* ============================================================
   13. CẤU HÌNH NHÓM MÁU (danh mục ABO x Rh + ngưỡng cảnh báo)
   ============================================================ */
CREATE TABLE CauHinhNhomMau (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    NhomMau             CHAR(2)         NOT NULL CONSTRAINT CK_CauHinh_NhomMau CHECK (NhomMau IN ('A','B','AB','O')),
    HeRh                NVARCHAR(10)    NOT NULL CONSTRAINT CK_CauHinh_HeRh CHECK (HeRh IN (N'Rh+', N'Rh-')),
    MoTa                NVARCHAR(255)   NULL,
    NguongCanhBao       DECIMAL(10,2)   NOT NULL DEFAULT (2000), -- ml: tồn kho dưới ngưỡng -> cảnh báo thiếu máu
    CONSTRAINT UQ_CauHinh_NhomMau UNIQUE (NhomMau, HeRh)
);
GO

/* ============================================================
   14. CHIẾN DỊCH VẬN ĐỘNG (mỗi lần gửi thông báo hàng loạt)
   ============================================================ */
CREATE TABLE ChienDichVanDong (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    TieuDe              NVARCHAR(150)   NOT NULL,
    NoiDung             NVARCHAR(500)   NOT NULL,
    Loai                NVARCHAR(30)    NOT NULL
                            CONSTRAINT CK_ChienDich_Loai CHECK (Loai IN (N'NhacLich', N'KeuGoiHienMau', N'ThongBaoChung')),
    NhomMauMucTieu      CHAR(2)         NULL,
    HeRhMucTieu         NVARCHAR(10)    NULL,
    DotId               INT             NULL
                            CONSTRAINT FK_ChienDich_Dot REFERENCES DotHienMau(Id),
    NguoiTaoId          INT             NULL
                            CONSTRAINT FK_ChienDich_NhanVien REFERENCES NhanVien(Id),
    NgayGui             DATETIME2       NOT NULL DEFAULT (SYSDATETIME()),
    SoNguoiNhan         INT             NOT NULL DEFAULT (0),
    TuDong              BIT             NOT NULL DEFAULT (0) -- 1: do hệ thống tự gửi
);
GO

/* ============================================================
   15. THÔNG BÁO (hộp thư của từng người hiến)
   ============================================================ */
CREATE TABLE ThongBao (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    NguoiNhanId         INT             NOT NULL
                            CONSTRAINT FK_ThongBao_NguoiNhan REFERENCES NguoiHienMau(Id) ON DELETE CASCADE,
    ChienDichId         INT             NULL
                            CONSTRAINT FK_ThongBao_ChienDich REFERENCES ChienDichVanDong(Id),
    TieuDe              NVARCHAR(150)   NOT NULL,
    NoiDung             NVARCHAR(500)   NOT NULL,
    Loai                NVARCHAR(30)    NOT NULL
                            CONSTRAINT CK_ThongBao_Loai CHECK (Loai IN (N'NhacLich', N'KeuGoiHienMau', N'ThongBaoChung')),
    NgayGui             DATETIME2       NOT NULL DEFAULT (SYSDATETIME()),
    DaDoc               BIT             NOT NULL DEFAULT (0)
);
GO
CREATE INDEX IX_ThongBao_NguoiNhan ON ThongBao(NguoiNhanId, DaDoc);
GO

/* ============================================================
   DỮ LIỆU DANH MỤC & TÀI KHOẢN MẪU
   (Dữ liệu nghiệp vụ minh họa do API sinh tự động - DemoDataSeeder)
   ============================================================ */
INSERT INTO TaiKhoan (Username, PasswordHash, Email, Role) VALUES
(N'admin',          N'HASH_PLACEHOLDER', N'admin@hienmau.vn',      N'QuanTri'),
(N'nv.tiepnhan01',  N'HASH_PLACEHOLDER', N'tiepnhan01@hienmau.vn', N'NhanVienTiepNhan'),
(N'nv.sangloc01',   N'HASH_PLACEHOLDER', N'sangloc01@hienmau.vn',  N'NhanVienSangLoc'),
(N'nv.kho01',       N'HASH_PLACEHOLDER', N'kho01@hienmau.vn',      N'NhanVienKho'),
(N'nguyenvana',     N'HASH_PLACEHOLDER', N'nguyenvana@gmail.com',  N'NguoiHienMau');
GO

-- Tài khoản quản trị cũng cần hồ sơ NhanVien: hệ thống dùng Id này khi ghi nhận tiếp nhận máu, xuất kho, sàng lọc.
INSERT INTO NhanVien (AccountId, HoTen, ChucVu, SoDienThoai, Email) VALUES
(1, N'Quản trị hệ thống',  N'Quản trị viên',          '0909000111', N'admin@hienmau.vn'),
(2, N'Trần Văn Bình',      N'Nhân viên tiếp nhận',    '0903111222', N'tiepnhan01@hienmau.vn'),
(3, N'Bác sĩ Lê Thị Hoa',  N'Nhân viên sàng lọc',     '0903222333', N'sangloc01@hienmau.vn'),
(4, N'Phạm Minh Khoa',     N'Nhân viên quản lý kho',  '0903333444', N'kho01@hienmau.vn');
GO

INSERT INTO NguoiHienMau (AccountId, HoTen, NgaySinh, GioiTinh, CCCD, NhomMau, HeRh, DiaChi, SoDienThoai, Email, CanNang) VALUES
(5, N'Nguyễn Văn A', '1998-05-12', N'Nam', '079198000123', 'O', N'Rh+', N'Phường Bến Nghé, Quận 1, TP.HCM', '0901234567', N'nguyenvana@gmail.com', 65);
GO

INSERT INTO DiemHienMau (TenDiem, DiaChi, SoDienThoai) VALUES
(N'Trung tâm Hiến máu Nhân đạo TP.HCM',   N'106 Thiên Phước, Phường 9, Quận Tân Bình, TP.HCM',          '02838683496'),
(N'Nhà Văn hóa Thanh niên TP.HCM',        N'4 Phạm Ngọc Thạch, Phường Bến Nghé, Quận 1, TP.HCM',        '02838294345'),
(N'Trường Đại học Công Thương TP.HCM',    N'140 Lê Trọng Tấn, Phường Tây Thạnh, Quận Tân Phú, TP.HCM',  '02838163318'),
(N'Nhà Văn hóa Sinh viên ĐHQG TP.HCM',    N'Khu đô thị ĐHQG, Phường Đông Hòa, TP. Dĩ An, Bình Dương',   '02837242160'),
(N'Bệnh viện Truyền máu Huyết học',       N'118 Hồng Bàng, Phường 12, Quận 5, TP.HCM',                  '02839571342'),
(N'Cung Văn hóa Lao động TP.HCM',         N'55B Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP.HCM', '02839302405');
GO

INSERT INTO CoSoYTe (TenCoSo, DiaChi, SoDienThoai) VALUES
(N'Bệnh viện Chợ Rẫy',                 N'201B Nguyễn Chí Thanh, Quận 5, TP.HCM',  '02838554137'),
(N'Bệnh viện Nhân dân 115',            N'527 Sư Vạn Hạnh, Quận 10, TP.HCM',       '02838652368'),
(N'Bệnh viện Nhi Đồng 1',              N'341 Sư Vạn Hạnh, Quận 10, TP.HCM',       '02839271119'),
(N'Bệnh viện Từ Dũ',                   N'284 Cống Quỳnh, Quận 1, TP.HCM',         '02854042829'),
(N'Bệnh viện Đại học Y Dược TP.HCM',   N'215 Hồng Bàng, Quận 5, TP.HCM',          '02838554269'),
(N'Bệnh viện Thống Nhất',              N'1 Lý Thường Kiệt, Quận Tân Bình, TP.HCM', '02838642142');
GO

INSERT INTO CauHinhNhomMau (NhomMau, HeRh, NguongCanhBao, MoTa) VALUES
('O',  N'Rh+', 1500, N'Phổ biến nhất (~42%). Cho được mọi nhóm Rh+'),
('A',  N'Rh+', 1500, N'Cho A+, AB+; nhận A, O'),
('B',  N'Rh+', 1500, N'Cho B+, AB+; nhận B, O'),
('AB', N'Rh+', 600, N'Nhận được mọi nhóm máu Rh+'),
('O',  N'Rh-', 300, N'Nhóm cho phổ thông, rất hiếm'),
('A',  N'Rh-', 200, N'Hiếm - nhận A-, O-'),
('B',  N'Rh-', 200, N'Hiếm - nhận B-, O-'),
('AB', N'Rh-', 150, N'Hiếm nhất - nhận mọi nhóm Rh-');
GO

/* ============================================================
   VIEW BÁO CÁO: tồn kho theo nhóm máu và thành phần
   ============================================================ */
CREATE VIEW vw_TonKhoTheoNhomMau AS
SELECT  k.NhomMau, k.HeRh, k.ThanhPhanMau,
        SUM(k.SoLuong)      AS TongSoLuong,
        COUNT(*)            AS SoLo,
        MIN(k.HanSuDung)    AS HanSuDungGanNhat
FROM    KhoMau k
WHERE   k.TrangThai = N'ConKho'
GROUP BY k.NhomMau, k.HeRh, k.ThanhPhanMau;
GO

PRINT N'Đã tạo xong cơ sở dữ liệu HienMauNhanDao (15 bảng) và dữ liệu danh mục.';
PRINT N'Khởi động API lần đầu: mật khẩu mẫu = Hienmau@123 và dữ liệu minh họa sẽ được tạo tự động.';
GO
