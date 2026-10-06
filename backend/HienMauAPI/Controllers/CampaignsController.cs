using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HienMauAPI.Controllers
{
    // Quản lý điểm hiến máu và đợt hiến máu (lịch tổ chức)
    [ApiController]
    [Route("api/[controller]")]
    public class CampaignsController : ControllerBase
    {
        private readonly ICampaignService _campaignService;
        public CampaignsController(ICampaignService campaignService) => _campaignService = campaignService;

        // Công khai để người hiến máu xem lịch và địa điểm mà không cần đăng nhập
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] string? trangThai, [FromQuery] string? keyword, [FromQuery] int? diemId)
            => Ok(await _campaignService.GetCampaignsAsync(trangThai, keyword, diemId));

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var campaign = await _campaignService.GetCampaignByIdAsync(id);
            if (campaign == null) return NotFound(new { message = "Không tìm thấy đợt hiến máu." });
            return Ok(campaign);
        }

        [HttpPost]
        [Authorize(Roles = RoleNames.QuanTri)]
        public async Task<IActionResult> Create([FromBody] SaveCampaignRequest request)
        {
            var (success, error, data) = await _campaignService.CreateCampaignAsync(request);
            if (!success) return BadRequest(new { message = error });
            return CreatedAtAction(nameof(GetById), new { id = data!.Id }, data);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = RoleNames.QuanTri)]
        public async Task<IActionResult> Update(int id, [FromBody] SaveCampaignRequest request)
        {
            var (success, error) = await _campaignService.UpdateCampaignAsync(id, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Cập nhật đợt hiến máu thành công." });
        }

        [HttpPut("{id:int}/status")]
        [Authorize(Roles = RoleNames.QuanTri)]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateCampaignStatusRequest request)
        {
            var (success, error) = await _campaignService.UpdateStatusAsync(id, request.TrangThai);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Cập nhật trạng thái thành công." });
        }

        // ===== Điểm hiến máu =====

        [HttpGet("sites")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSites() => Ok(await _campaignService.GetSitesAsync(false));

        [HttpGet("sites/all")]
        [Authorize(Roles = RoleNames.AllStaff)]
        public async Task<IActionResult> GetAllSites() => Ok(await _campaignService.GetSitesAsync(true));

        [HttpPost("sites")]
        [Authorize(Roles = RoleNames.QuanTri)]
        public async Task<IActionResult> CreateSite([FromBody] SaveDonationSiteRequest request)
        {
            var (success, error, data) = await _campaignService.CreateSiteAsync(request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }

        [HttpPut("sites/{id:int}")]
        [Authorize(Roles = RoleNames.QuanTri)]
        public async Task<IActionResult> UpdateSite(int id, [FromBody] SaveDonationSiteRequest request)
        {
            var (success, error) = await _campaignService.UpdateSiteAsync(id, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Cập nhật điểm hiến máu thành công." });
        }

        [HttpPut("sites/{id:int}/active")]
        [Authorize(Roles = RoleNames.QuanTri)]
        public async Task<IActionResult> SetSiteActive(int id, [FromQuery] bool active)
        {
            var (success, error) = await _campaignService.SetSiteActiveAsync(id, active);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = active ? "Đã kích hoạt điểm hiến máu." : "Đã ngừng hoạt động điểm hiến máu." });
        }
    }
}
