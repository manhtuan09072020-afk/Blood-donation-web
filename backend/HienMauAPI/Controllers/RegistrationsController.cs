using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using HienMauAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HienMauAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RegistrationsController : ControllerBase
    {
        private readonly IRegistrationService _registrationService;
        public RegistrationsController(IRegistrationService registrationService) => _registrationService = registrationService;

        [HttpGet]
        [Authorize(Roles = RoleNames.AllStaff)]
        public async Task<IActionResult> GetAll([FromQuery] int? dotId, [FromQuery] string? trangThai, [FromQuery] string? keyword)
            => Ok(await _registrationService.GetAllAsync(dotId, trangThai, keyword));

        [HttpGet("me")]
        [Authorize(Roles = RoleNames.NguoiHienMau)]
        public async Task<IActionResult> GetMyRegistrations()
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();
            return Ok(await _registrationService.GetByDonorAsync(profileId.Value));
        }

        [HttpPost]
        [Authorize(Roles = RoleNames.NguoiHienMau)]
        public async Task<IActionResult> Create([FromBody] CreateRegistrationRequest request)
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();

            var (success, error, data) = await _registrationService.CreateAsync(profileId.Value, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }

        [HttpPost("walk-in")]
        [Authorize(Roles = RoleNames.QuanTri + "," + RoleNames.NhanVienTiepNhan)]
        public async Task<IActionResult> CreateWalkIn([FromBody] WalkInRegistrationRequest request)
        {
            var (success, error, data) = await _registrationService.CreateWalkInAsync(request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }

        [HttpPut("{id:int}/status")]
        [Authorize(Roles = RoleNames.QuanTri + "," + RoleNames.NhanVienTiepNhan)]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateRegistrationStatusRequest request)
        {
            var (success, error) = await _registrationService.UpdateStatusAsync(id, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Cập nhật trạng thái đăng ký thành công." });
        }

        [HttpPut("{id:int}/cancel")]
        [Authorize(Roles = RoleNames.NguoiHienMau)]
        public async Task<IActionResult> Cancel(int id)
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();

            var (success, error) = await _registrationService.CancelAsync(id, profileId.Value);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Đã hủy đăng ký hiến máu." });
        }
    }
}
