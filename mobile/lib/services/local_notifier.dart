import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Hiển thị thông báo hệ thống (thanh thông báo của điện thoại) khi có
/// thông báo nhắc lịch / kêu gọi hiến máu mới từ máy chủ.
class LocalNotifier {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _ready = false;

  static Future<void> init() async {
    if (defaultTargetPlatform == TargetPlatform.windows && !kIsWeb) return; // Windows: chỉ dùng thông báo trong ứng dụng
    try {
      await _plugin.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
        ),
      );
      if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
        await _plugin
            .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
            ?.requestNotificationsPermission();
      }
      _ready = true;
    } catch (e) {
      debugPrint('Không khởi tạo được thông báo hệ thống: $e');
    }
  }

  static Future<void> show(int id, String title, String body, {bool urgent = false}) async {
    if (!_ready) return;
    try {
      await _plugin.show(
        id: id,
        title: title,
        body: body,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            urgent ? 'keu_goi_hien_mau' : 'nhac_lich',
            urgent ? 'Kêu gọi hiến máu' : 'Nhắc lịch & thông báo',
            channelDescription: 'Thông báo từ hệ thống hiến máu Giọt Hồng',
            importance: urgent ? Importance.max : Importance.high,
            priority: Priority.high,
            styleInformation: BigTextStyleInformation(body),
          ),
          iOS: const DarwinNotificationDetails(),
        ),
      );
    } catch (e) {
      debugPrint('Không hiển thị được thông báo: $e');
    }
  }
}
