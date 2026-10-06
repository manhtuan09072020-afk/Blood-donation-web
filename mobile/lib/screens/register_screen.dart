import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/common.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _c = {for (final k in ['username', 'password', 'hoTen', 'cccd', 'soDienThoai', 'email', 'diaChi', 'canNang']) k: TextEditingController()};
  DateTime? _ngaySinh;
  String _gioiTinh = 'Nam';
  String? _nhomMau;
  String _heRh = 'Rh+';
  bool _loading = false;

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _ngaySinh ?? DateTime(now.year - 25),
      firstDate: DateTime(now.year - 60),
      lastDate: DateTime(now.year - 18, now.month, now.day),
      helpText: 'Chọn ngày sinh',
    );
    if (d != null) setState(() => _ngaySinh = d);
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    if (_ngaySinh == null) {
      showMessage(context, 'Vui lòng chọn ngày sinh', error: true);
      return;
    }
    setState(() => _loading = true);
    try {
      await Api.registerDonor({
        'username': _c['username']!.text.trim(),
        'password': _c['password']!.text,
        'hoTen': _c['hoTen']!.text.trim(),
        'ngaySinh': _ngaySinh!.toIso8601String().substring(0, 10),
        'gioiTinh': _gioiTinh,
        'cccd': _c['cccd']!.text.trim(),
        'soDienThoai': _c['soDienThoai']!.text.trim(),
        'email': _c['email']!.text.trim().isEmpty ? null : _c['email']!.text.trim(),
        'diaChi': _c['diaChi']!.text.trim().isEmpty ? null : _c['diaChi']!.text.trim(),
        'canNang': double.tryParse(_c['canNang']!.text),
        'nhomMau': _nhomMau,
        'heRh': _nhomMau == null ? null : _heRh,
      });
      if (!mounted) return;
      await context.read<AppState>().login(_c['username']!.text.trim(), _c['password']!.text);
      if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (e) {
      if (mounted) showMessage(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  InputDecoration _dec(String label, IconData icon) => InputDecoration(labelText: label, prefixIcon: Icon(icon));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đăng ký người hiến máu')),
      body: Form(
        key: _form,
        child: ListView(padding: const EdgeInsets.all(20), children: [
          const Text('Tài khoản', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 12),
          TextFormField(controller: _c['username'], decoration: _dec('Tên đăng nhập', Icons.alternate_email),
              validator: (v) => v == null || v.trim().length < 4 ? 'Tối thiểu 4 ký tự' : null),
          const SizedBox(height: 12),
          TextFormField(controller: _c['password'], obscureText: true, decoration: _dec('Mật khẩu', Icons.lock_outline),
              validator: (v) => v == null || v.length < 6 ? 'Tối thiểu 6 ký tự' : null),
          const SizedBox(height: 24),
          const Text('Thông tin cá nhân', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 12),
          TextFormField(controller: _c['hoTen'], decoration: _dec('Họ và tên', Icons.badge_outlined),
              textCapitalization: TextCapitalization.words, validator: (v) => v == null || v.trim().isEmpty ? 'Nhập họ tên' : null),
          const SizedBox(height: 12),
          InkWell(
            onTap: _pickDate,
            child: InputDecorator(
              decoration: _dec('Ngày sinh', Icons.cake_outlined),
              child: Text(_ngaySinh == null ? 'Chọn ngày sinh (18 – 60 tuổi)' : fmtDate.format(_ngaySinh!),
                  style: TextStyle(color: _ngaySinh == null ? AppColors.muted : AppColors.ink)),
            ),
          ),
          const SizedBox(height: 12),
          SegmentedButton<String>(
            segments: const [ButtonSegment(value: 'Nam', label: Text('Nam')), ButtonSegment(value: 'Nữ', label: Text('Nữ')), ButtonSegment(value: 'Khác', label: Text('Khác'))],
            selected: {_gioiTinh},
            onSelectionChanged: (s) => setState(() => _gioiTinh = s.first),
          ),
          const SizedBox(height: 12),
          TextFormField(controller: _c['cccd'], keyboardType: TextInputType.number, maxLength: 12, decoration: _dec('Số CCCD', Icons.credit_card),
              validator: (v) => v == null || !RegExp(r'^\d{12}$').hasMatch(v) ? 'CCCD gồm đúng 12 chữ số' : null),
          TextFormField(controller: _c['soDienThoai'], keyboardType: TextInputType.phone, decoration: _dec('Số điện thoại', Icons.phone_outlined),
              validator: (v) => v == null || !RegExp(r'^0\d{9}$').hasMatch(v) ? 'Số điện thoại gồm 10 số' : null),
          const SizedBox(height: 12),
          TextFormField(controller: _c['email'], keyboardType: TextInputType.emailAddress, decoration: _dec('Email (không bắt buộc)', Icons.mail_outline)),
          const SizedBox(height: 12),
          TextFormField(controller: _c['diaChi'], decoration: _dec('Địa chỉ (không bắt buộc)', Icons.home_outlined)),
          const SizedBox(height: 24),
          const Text('Sức khỏe', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: DropdownButtonFormField<String?>(
                initialValue: _nhomMau,
                decoration: _dec('Nhóm máu', Icons.bloodtype_outlined),
                items: const [
                  DropdownMenuItem(value: null, child: Text('Chưa biết')),
                  DropdownMenuItem(value: 'A', child: Text('A')),
                  DropdownMenuItem(value: 'B', child: Text('B')),
                  DropdownMenuItem(value: 'AB', child: Text('AB')),
                  DropdownMenuItem(value: 'O', child: Text('O')),
                ],
                onChanged: (v) => setState(() => _nhomMau = v),
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: 110,
              child: DropdownButtonFormField<String>(
                initialValue: _heRh,
                decoration: const InputDecoration(labelText: 'Rh'),
                items: const [DropdownMenuItem(value: 'Rh+', child: Text('Rh+')), DropdownMenuItem(value: 'Rh-', child: Text('Rh−'))],
                onChanged: _nhomMau == null ? null : (v) => setState(() => _heRh = v!),
              ),
            ),
          ]),
          const SizedBox(height: 12),
          TextFormField(controller: _c['canNang'], keyboardType: TextInputType.number, decoration: _dec('Cân nặng (kg, không bắt buộc)', Icons.monitor_weight_outlined)),
          const SizedBox(height: 28),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : const Text('Hoàn tất đăng ký'),
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }
}
