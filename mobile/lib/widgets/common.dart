import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models.dart';
import '../theme.dart';

final fmtDate = DateFormat('dd/MM/yyyy');
final fmtDateTime = DateFormat('HH:mm dd/MM/yyyy');
final fmtTime = DateFormat('HH:mm');
final fmtWeekday = DateFormat('EEEE, dd/MM/yyyy', 'vi');
String fmtMl(num v) => '${NumberFormat.decimalPattern('vi').format(v.round())} ml';

class BloodBadge extends StatelessWidget {
  final String? nhomMau, heRh;
  final double size;
  const BloodBadge({super.key, this.nhomMau, this.heRh, this.size = 1});

  @override
  Widget build(BuildContext context) {
    final neg = heRh == 'Rh-';
    final unknown = nhomMau == null;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10 * size, vertical: 5 * size),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8 * size),
        color: unknown ? const Color(0xFFE2E8F0) : null,
        gradient: unknown
            ? null
            : LinearGradient(colors: neg ? [const Color(0xFF7C3AED), const Color(0xFF4C1D95)] : [const Color(0xFFE11D48), const Color(0xFF9F1239)]),
      ),
      child: Text(bloodLabel(nhomMau, heRh),
          style: TextStyle(color: unknown ? AppColors.muted : Colors.white, fontWeight: FontWeight.w800, fontSize: 13 * size)),
    );
  }
}

class StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  const StatusChip(this.label, this.color, {super.key});

  static const _reg = {
    'ChoDuyet': ('Chờ duyệt', AppColors.warning),
    'DaDuyet': ('Đã duyệt', AppColors.info),
    'DaSangLoc': ('Đạt sàng lọc', Color(0xFF0891B2)),
    'DaHienMau': ('Đã hiến máu', AppColors.success),
    'TuChoi': ('Từ chối / Không đạt', Color(0xFFDC2626)),
    'Huy': ('Đã hủy', AppColors.muted),
  };
  static const _dot = {
    'SapDienRa': ('Sắp diễn ra', AppColors.info),
    'DangDienRa': ('Đang diễn ra', AppColors.success),
    'DaKetThuc': ('Đã kết thúc', AppColors.muted),
    'DaHuy': ('Đã hủy', Color(0xFFDC2626)),
  };

  factory StatusChip.registration(String s) {
    final v = _reg[s] ?? (s, AppColors.muted);
    return StatusChip(v.$1, v.$2);
  }
  factory StatusChip.campaign(String s) {
    final v = _dot[s] ?? (s, AppColors.muted);
    return StatusChip(v.$1, v.$2);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }
}

class DateBox extends StatelessWidget {
  final DateTime date;
  const DateBox(this.date, {super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 58,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(color: AppColors.primarySoft, borderRadius: BorderRadius.circular(12)),
      child: Column(children: [
        Text(DateFormat('dd').format(date), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary, height: 1)),
        const SizedBox(height: 2),
        Text('Th ${DateFormat('MM').format(date)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)),
      ]),
    );
  }
}

class CampaignTile extends StatelessWidget {
  final Campaign c;
  final VoidCallback onTap;
  const CampaignTile(this.c, {super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final pct = c.soLuongDuKien == null || c.soLuongDuKien == 0 ? null : (c.soLuongDaDangKy / c.soLuongDuKien!).clamp(0, 1).toDouble();
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            DateBox(c.ngayBatDau),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                StatusChip.campaign(c.trangThai),
                const SizedBox(height: 6),
                Text(c.tenDot, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 6),
                _iconText(Icons.schedule, '${fmtTime.format(c.ngayBatDau)} – ${fmtTime.format(c.ngayKetThuc)}'),
                _iconText(Icons.place_outlined, c.tenDiem),
                if (pct != null) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(value: pct, minHeight: 5, color: AppColors.primary, backgroundColor: const Color(0xFFF1F5F9)),
                  ),
                  const SizedBox(height: 4),
                  Text('Đã đăng ký ${c.soLuongDaDangKy}/${c.soLuongDuKien}', style: const TextStyle(fontSize: 12, color: AppColors.muted)),
                ],
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

Widget _iconText(IconData icon, String text) => Padding(
      padding: const EdgeInsets.only(top: 2),
      child: Row(children: [
        Icon(icon, size: 15, color: AppColors.muted),
        const SizedBox(width: 6),
        Expanded(child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.muted, fontSize: 13))),
      ]),
    );

class SectionTitle extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;
  const SectionTitle(this.title, {super.key, this.action, this.onAction});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 20, 4, 10),
      child: Row(children: [
        Expanded(child: Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
        if (action != null) TextButton(onPressed: onAction, child: Text(action!)),
      ]),
    );
  }
}

class EmptyView extends StatelessWidget {
  final IconData icon;
  final String text;
  const EmptyView({super.key, required this.icon, required this.text});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      child: Column(children: [
        Icon(icon, size: 56, color: const Color(0xFFCBD5E1)),
        const SizedBox(height: 12),
        Text(text, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted)),
      ]),
    );
  }
}

class ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const ErrorView(this.message, {super.key, required this.onRetry});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.cloud_off_rounded, size: 56, color: Color(0xFFCBD5E1)),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted)),
        const SizedBox(height: 16),
        OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Thử lại')),
      ]),
    );
  }
}

void showMessage(BuildContext context, String text, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text), backgroundColor: error ? const Color(0xFFDC2626) : AppColors.ink));
}
