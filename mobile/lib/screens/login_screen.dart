import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _user = TextEditingController();
  final _pass = TextEditingController();
  bool _loading = false;
  bool _obscure = true;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await context.read<AppState>().login(_user.text.trim(), _pass.text);
    } catch (e) {
      if (mounted) showMessage(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _serverSettings() async {
    final ctrl = TextEditingController(text: AppConfig.baseUrl);
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cấu hình máy chủ API'),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          TextField(controller: ctrl, decoration: const InputDecoration(labelText: 'Địa chỉ API')),
          const SizedBox(height: 10),
          const Text('Cắm cáp USB (đã chạy adb reverse): http://localhost:5000/api\nQua Wi-Fi: http://<IP máy tính>:5000/api',
              style: TextStyle(fontSize: 12, color: AppColors.muted)),
        ]),
        actions: [
          TextButton(onPressed: () => ctrl.text = AppConfig.defaultBaseUrl, child: const Text('Mặc định')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), style: FilledButton.styleFrom(minimumSize: const Size(80, 40)), child: const Text('Lưu')),
        ],
      ),
    );
    if (saved == true) {
      await AppConfig.save(ctrl.text);
      if (mounted) showMessage(context, 'Đã lưu máy chủ: ${AppConfig.baseUrl}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        child: Column(children: [
          Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(24, MediaQuery.of(context).padding.top + 24, 24, 40),
            decoration: const BoxDecoration(
              gradient: AppColors.heroGradient,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.water_drop_rounded, color: AppColors.primary, size: 30),
                ),
                const Spacer(),
                IconButton(onPressed: _serverSettings, icon: const Icon(Icons.settings_outlined, color: Colors.white), tooltip: 'Cấu hình máy chủ'),
              ]),
              const SizedBox(height: 28),
              const Text('Giọt Hồng', style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              const Text('Mỗi giọt máu cho đi — một cuộc đời ở lại', style: TextStyle(color: Color(0xFFFFE4E6), fontSize: 15)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _form,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text('Đăng nhập', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                const Text('Dành cho người hiến máu tình nguyện', style: TextStyle(color: AppColors.muted)),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _user,
                  decoration: const InputDecoration(labelText: 'Tên đăng nhập', prefixIcon: Icon(Icons.person_outline)),
                  textInputAction: TextInputAction.next,
                  validator: (v) => v == null || v.trim().isEmpty ? 'Vui lòng nhập tên đăng nhập' : null,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _pass,
                  obscureText: _obscure,
                  decoration: InputDecoration(
                    labelText: 'Mật khẩu',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined), onPressed: () => setState(() => _obscure = !_obscure)),
                  ),
                  onFieldSubmitted: (_) => _submit(),
                  validator: (v) => v == null || v.isEmpty ? 'Vui lòng nhập mật khẩu' : null,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : const Text('Đăng nhập'),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                  child: const Text('Tạo tài khoản người hiến máu'),
                ),
                const SizedBox(height: 20),
                Center(
                  child: TextButton(
                    onPressed: () { _user.text = 'nguyenvana'; _pass.text = 'Hienmau@123'; },
                    child: const Text('Dùng tài khoản demo (nguyenvana)', style: TextStyle(color: AppColors.muted)),
                  ),
                ),
              ]),
            ),
          ),
        ]),
      ),
    );
  }
}
