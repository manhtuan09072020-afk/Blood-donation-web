using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using HienMauAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HienMauAPI.Controllers
{
    // Quản trị tài khoản nhân viên và phân quyền
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = RoleNames.QuanTri)]
    public class StaffController : ControllerBase
    {
        private readonly IStaffService _staffService;
        public StaffController(IStaffService staffService) => _staffService = staffService;

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _staffService.GetAllAsync());

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateStaffRequest request)
        {
            var (success, error, data) = await _staffService.CreateAsync(request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateStaffRequest request)
        {
            var (success, error) = await _staffService.UpdateAsync(id, request, User.GetAccountId() ?? 0);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Cập nhật nhân viên thành công." });
        }

        [HttpPut("{id:int}/active")]
        public async Task<IActionResult> SetActive(int id, [FromQuery] bool active)
        {
            var (success, error) = await _staffService.SetActiveAsync(id, active, User.GetAccountId() ?? 0);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = active ? "Đã kích hoạt tài khoản." : "Đã khóa tài khoản." });
        }

        [HttpPut("{id:int}/reset-password")]
        public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequest request)
        {
            var (success, error) = await _staffService.ResetPasswordAsync(id, request.NewPassword);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Đã đặt lại mật khẩu." });
        }
    }
}
