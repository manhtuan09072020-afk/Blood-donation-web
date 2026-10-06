using HienMauAPI.DTOs;
using HienMauAPI.Entities;
using HienMauAPI.Helpers;
using HienMauAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HienMauAPI.Controllers
{
    // Tiếp nhận máu sau khi lấy máu + nhập kho (tự tạo lô máu)
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = RoleNames.QuanTri + "," + RoleNames.NhanVienTiepNhan)]
    public class CollectionController : ControllerBase
    {
        private readonly ICollectionService _collectionService;
        public CollectionController(ICollectionService collectionService) => _collectionService = collectionService;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? dotId) => Ok(await _collectionService.GetAllAsync(dotId));

        [HttpGet("pending")]
        public async Task<IActionResult> GetPending() => Ok(await _collectionService.GetPendingAsync());

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCollectionRequest request)
        {
            var profileId = User.GetProfileId();
            if (profileId == null) return Unauthorized();

            var (success, error, data) = await _collectionService.CreateAsync(profileId.Value, request);
            if (!success) return BadRequest(new { message = error });
            return Ok(data);
        }
    }
}
