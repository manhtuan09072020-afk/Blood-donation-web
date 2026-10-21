namespace HienMauAPI.Services
{
    // Trạng thái của tác vụ nền tự động (để giao diện hiển thị lần chạy gần nhất / tiếp theo)
    public static class AutomationStatus
    {
        public static bool Enabled { get; set; }
        public static int IntervalMinutes { get; set; } = 60;
        public static DateTime? LastRun { get; set; }
        public static DateTime? NextRun { get; set; }
    }
}
