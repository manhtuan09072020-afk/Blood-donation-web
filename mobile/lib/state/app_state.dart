import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models.dart';
import '../services/api.dart';
import '../services/local_notifier.dart';

/// Trạng thái toàn cục: phiên đăng nhập, hồ sơ, số thông báo chưa đọc.
/// Định kỳ 60 giây kiểm tra thông báo mới để hiển thị lên thanh thông báo hệ thống.
class AppState extends ChangeNotifier {
  LoginResult? session;
  Donor? donor;
  int unread = 0;
  Timer? _poller;
  int _lastNotifiedId = 0;

  bool get loggedIn => session != null;

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('session');
    _lastNotifiedId = prefs.getInt('last_notified_id') ?? 0;
    if (raw == null) return;
    try {
      session = LoginResult.fromJson(jsonDecode(raw));
      Api.token = session!.token;
      await refreshProfile();
      _startPolling();
    } catch (_) {
      await logout();
    }
  }

  Future<void> login(String username, String password) async {
    final res = await Api.login(username, password);
    if (res.role != 'NguoiHienMau') {
      throw ApiException('Ứng dụng di động dành cho người hiến máu. Nhân viên vui lòng dùng trang web quản trị.');
    }
    session = res;
    Api.token = res.token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('session', jsonEncode({
      'token': res.token, 'username': res.username, 'role': res.role, 'hoTen': res.hoTen, 'profileId': res.profileId,
    }));
    await refreshProfile();
    // Không bắn lại các thông báo cũ đã có trước khi đăng nhập
    final list = await Api.notifications();
    if (list.isNotEmpty) await _saveLastNotified(list.map((n) => n.id).reduce((a, b) => a > b ? a : b));
    _startPolling();
    notifyListeners();
  }

  Future<void> logout() async {
    _poller?.cancel();
    session = null;
    donor = null;
    unread = 0;
    Api.token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('session');
    notifyListeners();
  }

  Future<void> refreshProfile() async {
    donor = await Api.me();
    await checkNotifications(showSystem: false);
    notifyListeners();
  }

  Future<void> checkNotifications({bool showSystem = true}) async {
    try {
      final list = await Api.notifications();
      unread = list.where((n) => !n.daDoc).length;
      final fresh = list.where((n) => n.id > _lastNotifiedId && !n.daDoc).toList();
      if (fresh.isNotEmpty) {
        if (showSystem) {
          for (final n in fresh.take(3)) {
            await LocalNotifier.show(n.id, n.tieuDe, n.noiDung, urgent: n.loai == 'KeuGoiHienMau');
          }
        }
        await _saveLastNotified(fresh.map((n) => n.id).reduce((a, b) => a > b ? a : b));
      }
      notifyListeners();
    } catch (_) {/* bỏ qua lỗi mạng khi kiểm tra nền */}
  }

  void setUnread(int value) {
    unread = value;
    notifyListeners();
  }

  Future<void> _saveLastNotified(int id) async {
    _lastNotifiedId = id;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('last_notified_id', id);
  }

  void _startPolling() {
    _poller?.cancel();
    _poller = Timer.periodic(const Duration(seconds: 60), (_) => checkNotifications());
  }

  @override
  void dispose() {
    _poller?.cancel();
    super.dispose();
  }
}
