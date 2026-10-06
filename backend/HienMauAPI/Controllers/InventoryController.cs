using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using HienMauAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HienMauAPI.Controllers
{
    // Kho máu: tồn kho theo lô, cảnh báo, xuất kho cho cơ sở y tế
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = RoleNames.QuanTri + "," + RoleNames.NhanVienKho + "," + RoleNames.NhanVienTiepNhan)]
    public class InventoryController : ControllerBase
    {
        private const string KhoRoles = RoleNames.QuanTri + "," + RoleNames.NhanVienKho;

        private readonly IInventoryService _inventoryService;
        public InventoryController(IInventoryService inventoryService) => _inventoryService = inventoryService;

        [HttpGet("units")]
        public async Task<IActionResult> GetUnits([FromQuery] string? nhomMau, [FromQuery] string? heRh, [FromQuery] string? thanhPhan,
            [FromQuery] string? trangThai, [FromQuery] bool? sapHetHan, [FromQuery] string? keyword)
            => Ok(await _inventoryService.GetUnitsAsync(nhomMau, trangThai, sapHetHan, heRh, thanhPhan, keyword));

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary() => Ok(await _inventoryService.GetSummaryAsync());

        [HttpGet("alerts")]
        public async Task<IActionResult> GetAlerts() => Ok(await _inventoryService.GetAlertsAsync());

        [HttpGet("suggest")]
        [Authorize(Roles = KhoRoles)]
        public async Task<IActionResult> Suggest([FromQuery] string nhomMau, [FromQuery] string heRh, [FromQuery] string thanhPhan, [FromQuery] decimal soLuong)
        {
            if (soLuong <= 0) return BadRequest(new { message = "Số lượng yêu cầu phải lớn hơn 0." });
            return Ok(await _inventoryService.SuggestAsync(nhomMau, heRh, thanhPhan, soLuong));
        }

        [HttpPost("issue")]
        [Authorize(Roles = KhoRoles)]
        public async Task<IActionResult> Issue([FromBody] IssueRequestDto request)
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();

            var (success, error, data) = await _inventoryService.IssueAsync(profileId.Value, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }

        [HttpGet("issues")]
        public async Task<IActionResult> GetIssues([FromQuery] DateTime? tuNgay, [FromQuery] DateTime? denNgay, [FromQuery] int? coSoYTeId)
            => Ok(await _inventoryService.GetIssuesAsync(tuNgay, denNgay, coSoYTeId));

        [HttpGet("issues/{id:int}")]
        public async Task<IActionResult> GetIssue(int id)
        {
            var issue = await _inventoryService.GetIssueByIdAsync(id);
            return issue == null ? NotFound(new { message = "Không tìm thấy phiếu xuất." }) : Ok(issue);
        }

        [HttpPut("units/{id:int}/discard")]
        [Authorize(Roles = KhoRoles)]
        public async Task<IActionResult> Discard(int id)
        {
            var (success, error) = await _inventoryService.DiscardAsync(id);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Đã hủy bỏ lô máu." });
        }

        [HttpPut("units/{id:int}/location")]
        [Authorize(Roles = KhoRoles)]
        public async Task<IActionResult> UpdateLocation(int id, [FromBody] UpdateLocationRequest request)
        {
            var (success, error) = await _inventoryService.UpdateLocationAsync(id, request.ViTriLuuTru);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Đã cập nhật vị trí lưu trữ." });
        }
    }
}
