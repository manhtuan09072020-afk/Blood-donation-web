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
    public class NotificationsController : ControllerBase
    {
        private const string SenderRoles = RoleNames.QuanTri + "," + RoleNames.NhanVienKho + "," + RoleNames.NhanVienTiepNhan;

        private readonly INotificationService _notificationService;
        public NotificationsController(INotificationService notificationService) => _notificationService = notificationService;

        // ===== Người hiến máu =====

        [HttpGet("me")]
        [Authorize(Roles = RoleNames.NguoiHienMau)]
        public async Task<IActionResult> GetMyNotifications()
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();
            return Ok(await _notificationService.GetByDonorAsync(profileId.Value));
        }

        [HttpGet("me/unread-count")]
        [Authorize(Roles = RoleNames.NguoiHienMau)]
        public async Task<IActionResult> GetUnreadCount()
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();
            return Ok(new { count = await _notificationService.CountUnreadAsync(profileId.Value) });
        }

        [HttpPut("{id:int}/read")]
        [Authorize(Roles = RoleNames.NguoiHienMau)]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();

            var success = await _notificationService.MarkAsReadAsync(id, profileId.Value);
            if (!success) return NotFound();
            return Ok(new { message = "Đã đánh dấu đã đọc." });
        }

        [HttpPut("me/read-all")]
        [Authorize(Roles = RoleNames.NguoiHienMau)]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();
            var count = await _notificationService.MarkAllAsReadAsync(profileId.Value);
            return Ok(new { message = $"Đã đánh dấu {count} thông báo là đã đọc." });
        }

        // ===== Nhân viên: gửi thông báo / vận động =====

        [HttpPost("call-for-donation")]
        [Authorize(Roles = SenderRoles)]
        public async Task<IActionResult> SendCallForDonation([FromBody] SendCallForDonationRequest request)
        {
            var (success, error, data) = await _notificationService.SendCallForDonationAsync(User.GetProfileId(), request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }

        [HttpPost("reminder")]
        [Authorize(Roles = SenderRoles)]
        public async Task<IActionResult> SendReminder([FromBody] SendReminderRequest request)
        {
            var (success, error, data) = await _notificationService.SendReminderAsync(User.GetProfileId(), request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }

        [HttpPost("periodic-reminder")]
        [Authorize(Roles = SenderRoles)]
        public async Task<IActionResult> SendPeriodicReminder()
        {
            var (success, error, data) = await _notificationService.SendPeriodicReminderAsync(User.GetProfileId());
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }

        [HttpPost("general")]
        [Authorize(Roles = RoleNames.QuanTri)]
        public async Task<IActionResult> SendGeneral([FromBody] SendGeneralRequest request)
        {
            var (success, error, data) = await _notificationService.SendGeneralAsync(User.GetProfileId(), request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }

        [HttpGet("campaigns")]
        [Authorize(Roles = SenderRoles)]
        public async Task<IActionResult> GetCampaigns([FromQuery] string? loai) => Ok(await _notificationService.GetCampaignsAsync(loai));

        [HttpGet("campaigns/{id:int}")]
        [Authorize(Roles = SenderRoles)]
        public async Task<IActionResult> GetCampaign(int id)
        {
            var detail = await _notificationService.GetCampaignDetailAsync(id);
            return detail == null ? NotFound(new { message = "Không tìm thấy chiến dịch." }) : Ok(detail);
        }
    }
}
