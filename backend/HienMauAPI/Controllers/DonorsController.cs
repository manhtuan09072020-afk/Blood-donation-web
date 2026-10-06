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
    public class DonorsController : ControllerBase
    {
        private readonly IDonorService _donorService;
        private readonly IAuthService _authService;

        public DonorsController(IDonorService donorService, IAuthService authService)
        {
            _donorService = donorService;
            _authService = authService;
        }

        [HttpGet]
        [Authorize(Roles = RoleNames.AllStaff)]
        public async Task<IActionResult> GetAll([FromQuery] string? keyword, [FromQuery] string? nhomMau,
            [FromQuery] string? heRh, [FromQuery] bool? trangThai)
            => Ok(await _donorService.GetAllAsync(keyword, nhomMau, heRh, trangThai));

        [HttpGet("{id:int}")]
        [Authorize(Roles = RoleNames.AllStaff)]
        public async Task<IActionResult> GetById(int id)
        {
            var donor = await _donorService.GetByIdAsync(id);
            if (donor == null) return NotFound(new { message = "Không tìm thấy người hiến máu." });
            return Ok(donor);
        }

        // Tiếp đón người hiến lần đầu đến trực tiếp tại điểm hiến máu
        [HttpPost]
        [Authorize(Roles = RoleNames.QuanTri + "," + RoleNames.NhanVienTiepNhan)]
        public async Task<IActionResult> Create([FromBody] CreateDonorByStaffRequest request)
        {
            var cccd = request.CCCD.Trim();
            var phone = request.SoDienThoai.Trim();
            var (success, error) = await _authService.RegisterDonorAsync(new RegisterDonorRequest
            {
                Username = cccd,
                Password = phone,
                HoTen = request.HoTen,
                NgaySinh = request.NgaySinh,
                GioiTinh = request.GioiTinh,
                CCCD = cccd,
                NhomMau = request.NhomMau,
                HeRh = request.HeRh,
                DiaChi = request.DiaChi,
                SoDienThoai = phone,
                Email = request.Email,
                CanNang = request.CanNang
            });
            if (!success) return BadRequest(new { message = error });

            var donor = (await _donorService.GetAllAsync(cccd, null, null, null)).First(d => d.CCCD == cccd);
            return Ok(new CreateDonorResultDto { Donor = donor, Username = cccd, MatKhauBanDau = phone });
        }

        [HttpGet("{id:int}/history")]
        [Authorize(Roles = RoleNames.AllStaff)]
        public async Task<IActionResult> GetHistory(int id) => Ok(await _donorService.GetHistoryAsync(id));

        [HttpPut("{id:int}")]
        [Authorize(Roles = RoleNames.QuanTri + "," + RoleNames.NhanVienTiepNhan)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateDonorRequest request)
        {
            var (success, error) = await _donorService.UpdateAsync(id, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Cập nhật thông tin người hiến thành công." });
        }

        [HttpPut("{id:int}/active")]
        [Authorize(Roles = RoleNames.QuanTri)]
        public async Task<IActionResult> SetActive(int id, [FromQuery] bool active)
        {
            var (success, error) = await _donorService.SetActiveAsync(id, active);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = active ? "Đã mở khóa người hiến máu." : "Đã khóa người hiến máu." });
        }

        [HttpGet("by-blood-type")]
        [Authorize(Roles = RoleNames.QuanTri + "," + RoleNames.NhanVienTiepNhan + "," + RoleNames.NhanVienKho)]
        public async Task<IActionResult> GetByBloodType([FromQuery] string nhomMau, [FromQuery] string? heRh)
        {
            if (string.IsNullOrWhiteSpace(nhomMau)) return BadRequest(new { message = "Vui lòng chọn nhóm máu." });
            return Ok(await _donorService.GetByBloodTypeAsync(nhomMau, heRh));
        }

        // ===== Dành cho người hiến máu (web + mobile) =====

        [HttpGet("me")]
        [Authorize(Roles = RoleNames.NguoiHienMau)]
        public async Task<IActionResult> GetMyProfile()
        {
            var accountId = User.GetAccountId();
            if (accountId == null) return Unauthorized();

            var donor = await _donorService.GetByAccountIdAsync(accountId.Value);
            return donor == null ? NotFound() : Ok(donor);
        }

        [HttpPut("me")]
        [Authorize(Roles = RoleNames.NguoiHienMau)]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateDonorRequest request)
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();

            var (success, error) = await _donorService.UpdateAsync(profileId.Value, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Cập nhật thông tin thành công." });
        }

        [HttpGet("me/history")]
        [Authorize(Roles = RoleNames.NguoiHienMau)]
        public async Task<IActionResult> GetMyHistory()
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();
            return Ok(await _donorService.GetHistoryAsync(profileId.Value));
        }
    }
}
