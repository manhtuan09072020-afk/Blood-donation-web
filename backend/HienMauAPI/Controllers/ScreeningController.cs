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
    [Authorize(Roles = RoleNames.QuanTri + "," + RoleNames.NhanVienSangLoc + "," + RoleNames.NhanVienTiepNhan)]
    public class ScreeningController : ControllerBase
    {
        private readonly IScreeningService _screeningService;
        public ScreeningController(IScreeningService screeningService) => _screeningService = screeningService;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? dotId, [FromQuery] string? ketQua)
            => Ok(await _screeningService.GetAllAsync(dotId, ketQua));

        [HttpPost]
        [Authorize(Roles = RoleNames.QuanTri + "," + RoleNames.NhanVienSangLoc)]
        public async Task<IActionResult> Create([FromBody] CreateScreeningRequest request)
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();

            var (success, error, data) = await _screeningService.CreateAsync(profileId.Value, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }
    }
}
