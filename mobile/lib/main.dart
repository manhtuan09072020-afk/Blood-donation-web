import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'config.dart';
import 'services/api.dart';
import 'services/local_notifier.dart';
import 'state/app_state.dart';
import 'theme.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('vi');
  await AppConfig.load();
  await LocalNotifier.init();

  final state = AppState();
  Api.onUnauthorized = state.logout;
  await state.restore();

  runApp(ChangeNotifierProvider.value(value: state, child: const GiotHongApp()));
}

class GiotHongApp extends StatelessWidget {
  const GiotHongApp({super.key});

  @override
  Widget build(BuildContext context) {
    final loggedIn = context.select<AppState, bool>((s) => s.loggedIn);
    return MaterialApp(
      title: 'Giọt Hồng',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      locale: const Locale('vi'),
      supportedLocales: const [Locale('vi'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      // Tự chuyển màn hình theo trạng thái đăng nhập
      home: loggedIn ? const MainShell(key: ValueKey('main')) : const LoginScreen(key: ValueKey('login')),
    );
  }
}
