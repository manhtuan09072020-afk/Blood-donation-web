import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config.dart';
import '../models.dart';
import '../services/api.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Tài khoản: thông tin cá nhân, cập nhật liên hệ, đổi mật khẩu, đăng xuất
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final d = state.donor;
    return Scaffold(
      appBar: AppBar(title: const Text('Tài khoản')),
      body: d == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(padding: const EdgeInsets.all(16), children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Row(children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: AppColors.primary,
                      child: Text(d.hoTen.split(' ').last.substring(0, 1).toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(d.hoTen, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                        Text('@${d.username}', style: const TextStyle(color: AppColors.muted)),
                      ]),
                    ),
                    BloodBadge(nhomMau: d.nhomMau, heRh: d.heRh, size: 1.3),
                  ]),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: Column(children: [
                  _info(Icons.cake_outlined, 'Ngày sinh', '${fmtDate.format(d.ngaySinh)} · ${d.gioiTinh}'),
                  _info(Icons.credit_card, 'CCCD', d.cccd),
                  _info(Icons.phone_outlined, 'Điện thoại', d.soDienThoai),
                  _info(Icons.mail_outline, 'Email', d.email ?? '—'),
                  _info(Icons.home_outlined, 'Địa chỉ', d.diaChi ?? '—'),
                  _info(Icons.monitor_weight_outlined, 'Cân nặng', d.canNang == null ? '—' : '${d.canNang!.toStringAsFixed(0)} kg'),
                ]),
              ),
              const SizedBox(height: 12),
              Card(
                child: Column(children: [
                  ListTile(
                    leading: const Icon(Icons.edit_outlined),
                    title: const Text('Cập nhật thông tin cá nhân'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => EditProfileScreen(donor: d))),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.lock_outline),
                    title: const Text('Đổi mật khẩu'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChangePasswordScreen())),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.dns_outlined),
                    title: const Text('Máy chủ'),
                    subtitle: Text(AppConfig.baseUrl, style: const TextStyle(fontSize: 12)),
                  ),
                ]),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFDC2626), side: const BorderSide(color: Color(0xFFFECACA))),
                onPressed: () => context.read<AppState>().logout(),
                icon: const Icon(Icons.logout),
                label: const Text('Đăng xuất'),
              ),
              const SizedBox(height: 16),
              const Center(child: Text('Giọt Hồng v1.0 · Khóa luận CNTT-KLCN265', style: TextStyle(color: AppColors.muted, fontSize: 12))),
            ]),
    );
  }

  Widget _info(IconData icon, String label, String value) => ListTile(
        dense: true,
        leading: Icon(icon, color: AppColors.muted),
        title: Text(label, style: const TextStyle(color: AppColors.muted, fontSize: 13)),
        subtitle: Text(value, style: const TextStyle(color: AppColors.ink, fontSize: 15, fontWeight: FontWeight.w600)),
      );
}

class EditProfileScreen extends StatefulWidget {
  final Donor donor;
  const EditProfileScreen({super.key, required this.donor});
  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _form = GlobalKey<FormState>();
  late final _hoTen = TextEditingController(text: widget.donor.hoTen);
  late final _phone = TextEditingController(text: widget.donor.soDienThoai);
  late final _email = TextEditingController(text: widget.donor.email ?? '');
  late final _diaChi = TextEditingController(text: widget.donor.diaChi ?? '');
  late final _canNang = TextEditingController(text: widget.donor.canNang?.toStringAsFixed(0) ?? '');
  bool _saving = false;

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    final d = widget.donor;
    try {
      final msg = await Api.updateMe({
        'hoTen': _hoTen.text.trim(),
        'ngaySinh': d.ngaySinh.toIso8601String().substring(0, 10),
        'gioiTinh': d.gioiTinh,
        'nhomMau': d.nhomMau,
        'heRh': d.heRh,
        'soDienThoai': _phone.text.trim(),
        'email': _email.text.trim().isEmpty ? null : _email.text.trim(),
        'diaChi': _diaChi.text.trim().isEmpty ? null : _diaChi.text.trim(),
        'canNang': double.tryParse(_canNang.text),
      });
      if (!mounted) return;
      await context.read<AppState>().refreshProfile();
      if (mounted) {
        showMessage(context, msg);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) showMessage(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cập nhật thông tin')),
      body: Form(
        key: _form,
        child: ListView(padding: const EdgeInsets.all(20), children: [
          TextFormField(controller: _hoTen, decoration: const InputDecoration(labelText: 'Họ và tên', prefixIcon: Icon(Icons.badge_outlined)),
              validator: (v) => v == null || v.trim().isEmpty ? 'Nhập họ tên' : null),
          const SizedBox(height: 14),
          TextFormField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Số điện thoại', prefixIcon: Icon(Icons.phone_outlined)),
              validator: (v) => v == null || !RegExp(r'^0\d{9}$').hasMatch(v.trim()) ? 'Số điện thoại gồm 10 số' : null),
          const SizedBox(height: 14),
          TextFormField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline))),
          const SizedBox(height: 14),
          TextFormField(controller: _diaChi, decoration: const InputDecoration(labelText: 'Địa chỉ liên hệ', prefixIcon: Icon(Icons.home_outlined))),
          const SizedBox(height: 14),
          TextFormField(controller: _canNang, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Cân nặng (kg)', prefixIcon: Icon(Icons.monitor_weight_outlined))),
          const SizedBox(height: 8),
          const Text('Nhóm máu, ngày sinh và CCCD do cơ sở hiến máu xác nhận — liên hệ nhân viên nếu cần điều chỉnh.', style: TextStyle(color: AppColors.muted, fontSize: 12)),
          const SizedBox(height: 24),
          FilledButton(onPressed: _saving ? null : _save, child: Text(_saving ? 'Đang lưu…' : 'Lưu thay đổi')),
        ]),
      ),
    );
  }
}

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});
  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _saving = false;

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final msg = await Api.changePassword(_current.text, _next.text);
      if (mounted) {
        showMessage(context, msg);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) showMessage(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đổi mật khẩu')),
      body: Form(
        key: _form,
        child: ListView(padding: const EdgeInsets.all(20), children: [
          TextFormField(controller: _current, obscureText: true, decoration: const InputDecoration(labelText: 'Mật khẩu hiện tại', prefixIcon: Icon(Icons.lock_outline)),
              validator: (v) => v == null || v.isEmpty ? 'Nhập mật khẩu hiện tại' : null),
          const SizedBox(height: 14),
          TextFormField(controller: _next, obscureText: true, decoration: const InputDecoration(labelText: 'Mật khẩu mới', prefixIcon: Icon(Icons.lock_reset)),
              validator: (v) => v == null || v.length < 6 ? 'Tối thiểu 6 ký tự' : null),
          const SizedBox(height: 14),
          TextFormField(controller: _confirm, obscureText: true, decoration: const InputDecoration(labelText: 'Nhập lại mật khẩu mới', prefixIcon: Icon(Icons.lock_reset)),
              validator: (v) => v != _next.text ? 'Mật khẩu nhập lại không khớp' : null),
          const SizedBox(height: 24),
          FilledButton(onPressed: _saving ? null : _save, child: Text(_saving ? 'Đang cập nhật…' : 'Cập nhật mật khẩu')),
        ]),
      ),
    );
  }
}
