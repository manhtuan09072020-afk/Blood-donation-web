import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../models.dart';

class ApiException implements Exception {
  final String message;
  final int? status;
  ApiException(this.message, [this.status]);
  @override
  String toString() => message;
}

/// Lớp gọi REST API dùng chung với web (backend .NET)
class Api {
  static String? token;
  static void Function()? onUnauthorized;

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  static Future<dynamic> _send(String method, String path, [Object? body]) async {
    final uri = Uri.parse('${AppConfig.baseUrl}$path');
    http.Response res;
    try {
      final encoded = body == null ? null : jsonEncode(body);
      res = await switch (method) {
        'POST' => http.post(uri, headers: _headers, body: encoded),
        'PUT' => http.put(uri, headers: _headers, body: encoded),
        _ => http.get(uri, headers: _headers),
      }
          .timeout(const Duration(seconds: 15));
    } on TimeoutException {
      throw ApiException('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    } catch (_) {
      throw ApiException('Không kết nối được máy chủ (${AppConfig.baseUrl}). Kiểm tra API đã chạy và địa chỉ máy chủ.');
    }

    final text = utf8.decode(res.bodyBytes);
    final data = text.isEmpty ? null : jsonDecode(text);
    if (res.statusCode >= 200 && res.statusCode < 300) return data;

    if (res.statusCode == 401 && token != null) {
      onUnauthorized?.call();
      throw ApiException('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 401);
    }
    var message = 'Có lỗi xảy ra (${res.statusCode}).';
    if (data is Map && data['message'] != null) {
      message = data['message'];
    } else if (data is Map && data['errors'] is Map) {
      message = (data['errors'] as Map).values.expand((e) => e as List).join(' ');
    } else if (res.statusCode == 401) {
      message = 'Tên đăng nhập hoặc mật khẩu không đúng.';
    } else if (res.statusCode == 403) {
      message = 'Bạn không có quyền thực hiện thao tác này.';
    }
    throw ApiException(message, res.statusCode);
  }

  // ===== Xác thực =====
  static Future<LoginResult> login(String username, String password) async =>
      LoginResult.fromJson(await _send('POST', '/auth/login', {'username': username, 'password': password}));
  static Future<void> registerDonor(Map<String, dynamic> body) => _send('POST', '/auth/register-donor', body);
  static Future<String> changePassword(String current, String next) async =>
      (await _send('POST', '/auth/change-password', {'currentPassword': current, 'newPassword': next}))['message'];

  // ===== Hồ sơ người hiến =====
  static Future<Donor> me() async => Donor.fromJson(await _send('GET', '/donors/me'));
  static Future<String> updateMe(Map<String, dynamic> body) async => (await _send('PUT', '/donors/me', body))['message'];
  static Future<List<DonationHistory>> myHistory() async =>
      (await _send('GET', '/donors/me/history') as List).map((e) => DonationHistory.fromJson(e)).toList();

  // ===== Lịch & địa điểm hiến máu =====
  static Future<List<Campaign>> campaigns({String? trangThai}) async {
    final q = trangThai == null ? '' : '?trangThai=$trangThai';
    return (await _send('GET', '/campaigns$q') as List).map((e) => Campaign.fromJson(e)).toList();
  }

  static Future<Campaign> campaign(int id) async => Campaign.fromJson(await _send('GET', '/campaigns/$id'));
  static Future<List<BloodGroup>> bloodGroups() async =>
      (await _send('GET', '/blood-groups') as List).map((e) => BloodGroup.fromJson(e)).toList();

  // ===== Đăng ký hiến máu =====
  static Future<List<Registration>> myRegistrations() async =>
      (await _send('GET', '/registrations/me') as List).map((e) => Registration.fromJson(e)).toList();
  static Future<Registration> register(int dotId, String? ghiChu) async =>
      Registration.fromJson(await _send('POST', '/registrations', {'dotId': dotId, 'ghiChu': ghiChu}));
  static Future<String> cancelRegistration(int id) async => (await _send('PUT', '/registrations/$id/cancel'))['message'];

  // ===== Thông báo =====
  static Future<List<AppNotification>> notifications() async =>
      (await _send('GET', '/notifications/me') as List).map((e) => AppNotification.fromJson(e)).toList();
  static Future<void> markRead(int id) => _send('PUT', '/notifications/$id/read');
  static Future<void> markAllRead() => _send('PUT', '/notifications/me/read-all');
}
