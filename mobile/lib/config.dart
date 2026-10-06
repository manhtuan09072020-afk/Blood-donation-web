import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Cấu hình địa chỉ máy chủ API.
/// - Web / Windows: http://localhost:5000/api
/// - Máy ảo Android: http://10.0.2.2:5000/api (10.0.2.2 trỏ về localhost của máy tính)
/// - Điện thoại thật: nhập IP LAN của máy chạy API trong màn hình "Cấu hình máy chủ"
///   (chạy API bằng: dotnet run --urls http://0.0.0.0:5000)
class AppConfig {
  static const _key = 'api_base_url';
  static String _baseUrl = defaultBaseUrl;

  static String get defaultBaseUrl {
    if (kIsWeb) return 'http://localhost:5000/api';
    if (defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:5000/api';
    return 'http://localhost:5000/api';
  }

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
