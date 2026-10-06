using HienMauAPI.Data;
using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Services
{
    // Danh mục: nhóm máu (kèm ngưỡng cảnh báo) và cơ sở y tế nhận máu
    public interface ICatalogService
    {
        Task<List<BloodGroupDto>> GetBloodGroupsAsync();
        Task<(bool success, string? error)> UpdateBloodGroupAsync(int id, UpdateBloodGroupRequest request);

        Task<List<MedicalFacilityDto>> GetFacilitiesAsync(bool includeInactive);
        Task<(bool success, string? error, MedicalFacilityDto? data)> CreateFacilityAsync(SaveMedicalFacilityRequest request);
        Task<(bool success, string? error)> UpdateFacilityAsync(int id, SaveMedicalFacilityRequest request);
        Task<(bool success, string? error)> SetFacilityActiveAsync(int id, bool active);
    }

    public class CatalogService : ICatalogService
    {
        private readonly AppDbContext _db;
        public CatalogService(AppDbContext db) => _db = db;

        private static readonly string[] NhomMaus = { "A", "B", "AB", "O" };
        private static readonly string[] HeRhs = { "Rh+", "Rh-" };

        // Luôn trả đủ 8 tổ hợp ABO x Rh kèm tồn kho hiện tại và số người hiến của từng nhóm
        public static async Task<List<BloodGroupDto>> BuildBloodGroupsAsync(AppDbContext db)
        {
            var configs = await db.CauHinhNhomMaus.ToListAsync();

            var stock = await db.KhoMaus
                .Where(k => k.TrangThai == TrangThaiKhoMau.ConKho)
                .GroupBy(k => new { k.NhomMau, k.HeRh })
                .Select(g => new { g.Key.NhomMau, g.Key.HeRh, Tong = g.Sum(k => k.SoLuong), SoLo = g.Count() })
                .ToListAsync();

            var donors = await db.NguoiHienMaus
                .Where(d => d.TrangThai && d.NhomMau != null && d.HeRh != null)
                .GroupBy(d => new { d.NhomMau, d.HeRh })
                .Select(g => new { g.Key.NhomMau, g.Key.HeRh, SoLuong = g.Count() })
                .ToListAsync();

            var result = new List<BloodGroupDto>();
            foreach (var nhom in NhomMaus)
            {
                foreach (var rh in HeRhs)
                {
                    var cfg = configs.FirstOrDefault(c => c.NhomMau.Trim() == nhom && c.HeRh == rh);
                    var s = stock.FirstOrDefault(x => x.NhomMau.Trim() == nhom && x.HeRh == rh);
                    var d = donors.FirstOrDefault(x => x.NhomMau!.Trim() == nhom && x.HeRh == rh);
                    var nguong = cfg?.NguongCanhBao ?? InventoryService.NguongCanhBaoThieu;
                    var tonKho = s?.Tong ?? 0;

                    result.Add(new BloodGroupDto
                    {
                        Id = cfg?.Id ?? 0,
                        NhomMau = nhom,
                        HeRh = rh,
                        MoTa = cfg?.MoTa,
                        NguongCanhBao = nguong,
                        TonKho = tonKho,
                        SoLo = s?.SoLo ?? 0,
                        SoNguoiHien = d?.SoLuong ?? 0,
                        CanhBaoThieu = tonKho < nguong
                    });
                }
            }
            return result;
        }

        public Task<List<BloodGroupDto>> GetBloodGroupsAsync() => BuildBloodGroupsAsync(_db);

        public async Task<(bool success, string? error)> UpdateBloodGroupAsync(int id, UpdateBloodGroupRequest request)
        {
            var cfg = await _db.CauHinhNhomMaus.FindAsync(id);
            if (cfg == null) return (false, "Không tìm thấy nhóm máu.");
            if (request.NguongCanhBao < 0) return (false, "Ngưỡng cảnh báo không hợp lệ.");

            cfg.MoTa = InputValidator.NormalizeOptional(request.MoTa);
            cfg.NguongCanhBao = request.NguongCanhBao;
            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<List<MedicalFacilityDto>> GetFacilitiesAsync(bool includeInactive)
        {
            var query = _db.CoSoYTes.AsQueryable();
            if (!includeInactive) query = query.Where(c => c.TrangThai);

            return await query
                .OrderByDescending(c => c.TrangThai).ThenBy(c => c.TenCoSo)
                .Select(c => new MedicalFacilityDto
                {
                    Id = c.Id,
                    TenCoSo = c.TenCoSo,
                    DiaChi = c.DiaChi,
                    SoDienThoai = c.SoDienThoai,
                    TrangThai = c.TrangThai,
                    SoPhieuXuat = c.PhieuXuatKhos.Count,
                    TongDaNhan = c.PhieuXuatKhos.SelectMany(p => p.ChiTietXuatKhos).Sum(x => (decimal?)x.SoLuong) ?? 0
                }).ToListAsync();
        }

        public async Task<(bool success, string? error, MedicalFacilityDto? data)> CreateFacilityAsync(SaveMedicalFacilityRequest request)
        {
            var ten = request.TenCoSo.Trim();
            if (await _db.CoSoYTes.AnyAsync(c => c.TenCoSo == ten))
                return (false, "Cơ sở y tế đã tồn tại.", null);

            var entity = new CoSoYTe
            {
                TenCoSo = ten,
                DiaChi = InputValidator.NormalizeOptional(request.DiaChi),
                SoDienThoai = InputValidator.NormalizeOptional(request.SoDienThoai)
            };
            _db.CoSoYTes.Add(entity);
            await _db.SaveChangesAsync();

            return (true, null, new MedicalFacilityDto
            {
                Id = entity.Id, TenCoSo = entity.TenCoSo, DiaChi = entity.DiaChi,
                SoDienThoai = entity.SoDienThoai, TrangThai = entity.TrangThai
            });
        }

        public async Task<(bool success, string? error)> UpdateFacilityAsync(int id, SaveMedicalFacilityRequest request)
        {
            var entity = await _db.CoSoYTes.FindAsync(id);
            if (entity == null) return (false, "Không tìm thấy cơ sở y tế.");

            var ten = request.TenCoSo.Trim();
            if (await _db.CoSoYTes.AnyAsync(c => c.Id != id && c.TenCoSo == ten))
                return (false, "Tên cơ sở y tế đã tồn tại.");

            entity.TenCoSo = ten;
            entity.DiaChi = InputValidator.NormalizeOptional(request.DiaChi);
            entity.SoDienThoai = InputValidator.NormalizeOptional(request.SoDienThoai);
            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(bool success, string? error)> SetFacilityActiveAsync(int id, bool active)
        {
            var entity = await _db.CoSoYTes.FindAsync(id);
            if (entity == null) return (false, "Không tìm thấy cơ sở y tế.");
            entity.TrangThai = active;
            await _db.SaveChangesAsync();
            return (true, null);
        }
    }
}
