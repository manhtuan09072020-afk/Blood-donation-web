using HienMauAPI.Data;
using HienMauAPI.Entities;
using HienMauAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HienMauAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        // Lưu ý: [Authorize(Roles)] ở cấp class và cấp action được cộng dồn (AND),
        // nên quyền được khai báo riêng cho từng action.
        private const string ReportRoles = RoleNames.QuanTri + "," + RoleNames.NhanVienTiepNhan + "," + RoleNames.NhanVienKho;

        private readonly IReportService _reportService;
        public ReportsController(IReportService reportService) => _reportService = reportService;

        [HttpGet("dashboard")]
        [Authorize(Roles = RoleNames.AllStaff)]
        public async Task<IActionResult> GetDashboard() => Ok(await _reportService.GetDashboardStatsAsync());

        [HttpGet("blood-type-stats")]
        [Authorize(Roles = RoleNames.AllStaff)]
        public async Task<IActionResult> GetBloodTypeStats() => Ok(await _reportService.GetBloodTypeStatsAsync());

        [Authorize(Roles = ReportRoles)]
        [HttpGet("monthly-stats")]
        public async Task<IActionResult> GetMonthlyStats([FromQuery] int? nam)
            => Ok(await _reportService.GetMonthlyStatsAsync(nam ?? DateTime.Now.Year));

        [Authorize(Roles = ReportRoles)]
        [HttpGet("donors")]
        public async Task<IActionResult> GetDonorReport() => Ok(await _reportService.GetDonorReportAsync());

        [Authorize(Roles = ReportRoles)]
        [HttpGet("campaigns")]
        public async Task<IActionResult> GetCampaignReport([FromQuery] DateTime? tuNgay, [FromQuery] DateTime? denNgay)
            => Ok(await _reportService.GetCampaignReportAsync(tuNgay, denNgay));

        [Authorize(Roles = ReportRoles)]
        [HttpGet("issues")]
        public async Task<IActionResult> GetIssueReport([FromQuery] DateTime? tuNgay, [FromQuery] DateTime? denNgay)
            => Ok(await _reportService.GetIssueReportAsync(tuNgay, denNgay));

        [Authorize(Roles = ReportRoles)]
        [HttpGet("inventory")]
        public async Task<IActionResult> GetInventoryReport([FromQuery] DateTime? tuNgay, [FromQuery] DateTime? denNgay)
            => Ok(await _reportService.GetInventoryReportAsync(tuNgay, denNgay));

        // Số liệu công khai cho trang chủ / ứng dụng di động
        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicStats([FromServices] AppDbContext db)
        {
            return Ok(new
            {
                tongNguoiHien = await db.NguoiHienMaus.CountAsync(d => d.TrangThai),
                tongLuotHien = await db.TiepNhanMaus.CountAsync(),
                tongTheTich = await db.TiepNhanMaus.SumAsync(t => (decimal?)t.TheTich) ?? 0,
                tongDotHienMau = await db.DotHienMaus.CountAsync(d => d.TrangThai != TrangThaiDot.DaHuy),
                soDiemHienMau = await db.DiemHienMaus.CountAsync(d => d.TrangThai)
            });
        }
    }
}
