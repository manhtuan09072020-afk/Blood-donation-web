using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HienMauAPI.Controllers
{
    // Danh mục nhóm máu (A, B, AB, O x Rh) và cơ sở y tế
    [ApiController]
    [Route("api")]
    public class CatalogController : ControllerBase
    {
        private const string KhoRoles = RoleNames.QuanTri + "," + RoleNames.NhanVienKho;

        private readonly ICatalogService _catalog;
        public CatalogController(ICatalogService catalog) => _catalog = catalog;

        // Công khai: trang chủ / app hiển thị nhóm máu đang thiếu để vận động
        [HttpGet("blood-groups")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBloodGroups() => Ok(await _catalog.GetBloodGroupsAsync());

        [HttpPut("blood-groups/{id:int}")]
        [Authorize(Roles = KhoRoles)]
        public async Task<IActionResult> UpdateBloodGroup(int id, [FromBody] UpdateBloodGroupRequest request)
        {
            var (success, error) = await _catalog.UpdateBloodGroupAsync(id, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Đã cập nhật cấu hình nhóm máu." });
        }

        [HttpGet("facilities")]
        [Authorize(Roles = RoleNames.AllStaff)]
        public async Task<IActionResult> GetFacilities([FromQuery] bool all = false) => Ok(await _catalog.GetFacilitiesAsync(all));

        [HttpPost("facilities")]
        [Authorize(Roles = KhoRoles)]
        public async Task<IActionResult> CreateFacility([FromBody] SaveMedicalFacilityRequest request)
        {
            var (success, error, data) = await _catalog.CreateFacilityAsync(request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }

        [HttpPut("facilities/{id:int}")]
        [Authorize(Roles = KhoRoles)]
        public async Task<IActionResult> UpdateFacility(int id, [FromBody] SaveMedicalFacilityRequest request)
        {
            var (success, error) = await _catalog.UpdateFacilityAsync(id, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Đã cập nhật cơ sở y tế." });
        }

        [HttpPut("facilities/{id:int}/active")]
        [Authorize(Roles = KhoRoles)]
        public async Task<IActionResult> SetFacilityActive(int id, [FromQuery] bool active)
        {
            var (success, error) = await _catalog.SetFacilityActiveAsync(id, active);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = active ? "Đã kích hoạt cơ sở y tế." : "Đã ngừng hợp tác với cơ sở y tế." });
        }
    }
}
