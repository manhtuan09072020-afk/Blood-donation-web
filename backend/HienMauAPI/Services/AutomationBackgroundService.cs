namespace HienMauAPI.Services
{
    // Tác vụ nền chạy định kỳ:
    //  - Cập nhật trạng thái đợt hiến máu theo ngày, đánh dấu lô máu hết hạn
    //  - Nhắc lịch trước ngày hiến, nhắc hiến máu định kỳ (đủ 12 tuần)
    //  - Tự động kêu gọi người hiến cùng nhóm máu khi tồn kho dưới ngưỡng
    public class AutomationBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AutomationBackgroundService> _logger;
        private readonly IConfiguration _config;

        public AutomationBackgroundService(IServiceScopeFactory scopeFactory, ILogger<AutomationBackgroundService> logger, IConfiguration config)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _config = config;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_config.GetValue("Automation:Enabled", true))
            {
                _logger.LogInformation("Tác vụ tự động đã bị tắt (Automation:Enabled = false).");
                return;
            }

            var interval = TimeSpan.FromMinutes(Math.Max(1, _config.GetValue("Automation:IntervalMinutes", 60)));
            AutomationStatus.Enabled = true;
            AutomationStatus.IntervalMinutes = (int)interval.TotalMinutes;

            // Chờ API khởi động xong (seed dữ liệu) rồi mới chạy lần đầu
            var firstRun = TimeSpan.FromSeconds(15);
            AutomationStatus.NextRun = DateTime.Now.Add(firstRun);
            try { await Task.Delay(firstRun, stoppingToken); } catch (TaskCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                AutomationStatus.LastRun = DateTime.Now;
                AutomationStatus.NextRun = DateTime.Now.Add(interval);
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<ICampaignService>().SyncStatusesAsync();
                    await scope.ServiceProvider.GetRequiredService<IInventoryService>().MarkExpiredUnitsAsync();
                    var sent = await scope.ServiceProvider.GetRequiredService<INotificationService>().RunAutomationAsync();
                    if (sent > 0) _logger.LogInformation("Tác vụ tự động đã gửi {Count} thông báo.", sent);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi khi chạy tác vụ tự động.");
                }

                try { await Task.Delay(interval, stoppingToken); } catch (TaskCanceledException) { return; }
            }
        }
    }
}
