import 'package:shared_preferences/shared_preferences.dart';

/// Cấu hình địa chỉ máy chủ API.
/// Mặc định http://localhost:5000/api cho mọi nền tảng.
/// - Android (điện thoại cắm USB hoặc máy ảo): chạy `adb reverse tcp:5000 tcp:5000`
///   để cổng 5000 của điện thoại trỏ về máy tính đang chạy API.
/// - Điện thoại dùng Wi-Fi không cắm cáp: nhập `http://IP-máy-tính:5000/api` trong màn hình
///   "Cấu hình máy chủ" (chạy API bằng: dotnet run --urls http://0.0.0.0:5000).
class AppConfig {
  static const _key = 'api_base_url';
  static String _baseUrl = defaultBaseUrl;

  static String get defaultBaseUrl => 'http://localhost:5000/api';

  static String get baseUrl => _baseUrl;

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString(_key) ?? defaultBaseUrl;
  }

  static Future<void> save(String url) async {
    var u = url.trim();
    if (u.endsWith('/')) u = u.substring(0, u.length - 1);
    if (!u.endsWith('/api')) u = '$u/api';
    _baseUrl = u;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, u);
  }
}
