import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../services/api.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'campaign_detail_screen.dart';

/// Nhận thông báo nhắc lịch hiến máu và kêu gọi hiến máu khi nhóm máu phù hợp đang thiếu
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification>? _data;
  String? _error;
  String _filter = 'all';

  static const _types = {
    'KeuGoiHienMau': (Icons.campaign_rounded, Color(0xFFDC2626), 'Kêu gọi'),
    'NhacLich': (Icons.event_rounded, AppColors.info, 'Nhắc lịch'),
    'ThongBaoChung': (Icons.notifications_rounded, AppColors.muted, 'Chung'),
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final list = await Api.notifications();
      setState(() => _data = list);
      if (mounted) context.read<AppState>().setUnread(list.where((n) => !n.daDoc).length);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  Future<void> _open(AppNotification n) async {
    if (!n.daDoc) {
      try {
        await Api.markRead(n.id);
        setState(() => n.daDoc = true);
        if (mounted) context.read<AppState>().setUnread(_data!.where((x) => !x.daDoc).length);
      } catch (_) {}
    }
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(n.tieuDe, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(fmtDateTime.format(n.ngayGui), style: const TextStyle(color: AppColors.muted, fontSize: 13)),
          const SizedBox(height: 14),
          Text(n.noiDung, style: const TextStyle(fontSize: 15, height: 1.5)),
          if (n.dotId != null) ...[
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.push(context, MaterialPageRoute(builder: (_) => CampaignDetailScreen(campaignId: n.dotId!)));
              },
              icon: const Icon(Icons.volunteer_activism),
              label: const Text('Xem đợt hiến máu & đăng ký'),
            ),
          ],
        ]),
      ),
    );
  }

  Future<void> _markAll() async {
    try {
      await Api.markAllRead();
      await _load();
      if (mounted) showMessage(context, 'Đã đánh dấu tất cả là đã đọc');
    } catch (e) {
      if (mounted) showMessage(context, e.toString(), error: true);
    }
  }

  String _ago(DateTime d) {
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 1) return 'Vừa xong';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    if (diff.inDays < 7) return '${diff.inDays} ngày trước';
    return DateFormat('dd/MM/yyyy').format(d);
  }

  @override
  Widget build(BuildContext context) {
    final list = _data?.where((n) => _filter == 'all' || (_filter == 'unread' ? !n.daDoc : n.loai == _filter)).toList();
    final unread = _data?.where((n) => !n.daDoc).length ?? 0;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo'),
        actions: [if (unread > 0) TextButton(onPressed: _markAll, child: const Text('Đọc tất cả'))],
      ),
      body: Column(children: [
        SizedBox(
          height: 52,
          child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), children: [
            for (final f in [('all', 'Tất cả'), ('unread', 'Chưa đọc ($unread)'), ('KeuGoiHienMau', 'Kêu gọi'), ('NhacLich', 'Nhắc lịch'), ('ThongBaoChung', 'Chung')])
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(label: Text(f.$2), selected: _filter == f.$1, onSelected: (_) => setState(() => _filter = f.$1)),
              ),
          ]),
        ),
        Expanded(
          child: _error != null
              ? ErrorView(_error!, onRetry: _load)
              : list == null
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: list.isEmpty
                          ? ListView(children: const [EmptyView(icon: Icons.notifications_off_outlined, text: 'Không có thông báo')])
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                              itemCount: list.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 8),
                              itemBuilder: (_, i) {
                                final n = list[i];
                                final t = _types[n.loai] ?? _types['ThongBaoChung']!;
                                return Card(
                                  color: n.daDoc ? Colors.white : const Color(0xFFFFF7F8),
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(16),
                                    onTap: () => _open(n),
                                    child: Padding(
                                      padding: const EdgeInsets.all(14),
                                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                        Container(
                                          width: 42, height: 42,
                                          decoration: BoxDecoration(color: t.$2.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                                          child: Icon(t.$1, color: t.$2),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                            Row(children: [
                                              Expanded(child: Text(n.tieuDe, maxLines: 1, overflow: TextOverflow.ellipsis,
                                                  style: TextStyle(fontWeight: n.daDoc ? FontWeight.w600 : FontWeight.w800))),
                                              if (!n.daDoc) Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
                                            ]),
                                            const SizedBox(height: 4),
                                            Text(n.noiDung, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF475569), fontSize: 13)),
                                            const SizedBox(height: 6),
                                            Row(children: [
                                              StatusChip(t.$3, t.$2),
                                              const SizedBox(width: 8),
                                              Text(_ago(n.ngayGui), style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                                            ]),
                                          ]),
                                        ),
                                      ]),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
        ),
      ]),
    );
  }
}
