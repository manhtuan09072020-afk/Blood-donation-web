using HienMauAPI.DTOs;
using HienMauAPI.Helpers;
using HienMauAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HienMauAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        public AuthController(IAuthService authService) => _authService = authService;

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);
            if (result == null) return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa." });
            return Ok(result);
        }

        [HttpPost("register-donor")]
        public async Task<IActionResult> RegisterDonor([FromBody] RegisterDonorRequest request)
        {
            var (success, error) = await _authService.RegisterDonorAsync(request);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Đăng ký tài khoản thành công. Vui lòng đăng nhập." });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var accountId = User.GetAccountId();
            if (accountId == null) return Unauthorized();
            var me = await _authService.GetMeAsync(accountId.Value);
            return me == null ? NotFound() : Ok(me);
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var accountId = User.GetAccountId();
            if (accountId == null) return Unauthorized();

            var (success, error) = await _authService.ChangePasswordAsync(accountId.Value, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Đổi mật khẩu thành công." });
        }
    }
}
