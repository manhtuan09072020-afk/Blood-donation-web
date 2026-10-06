import 'package:flutter/material.dart';
import '../models.dart';
import '../services/api.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Lịch hẹn hiến máu (đăng ký) và lịch sử hiến máu
class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Registration>? _regs;
  List<DonationHistory>? _history;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final r = await Future.wait([Api.myRegistrations(), Api.myHistory()]);
      setState(() {
        _regs = r[0] as List<Registration>;
        _history = r[1] as List<DonationHistory>;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  Future<void> _cancel(Registration r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hủy đăng ký?'),
        content: Text('Bạn muốn hủy đăng ký tham gia "${r.tenDot}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Không')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Hủy đăng ký', style: TextStyle(color: Color(0xFFDC2626)))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final msg = await Api.cancelRegistration(r.id);
      if (mounted) showMessage(context, msg);
      _load();
    } catch (e) {
      if (mounted) showMessage(context, e.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Hoạt động hiến máu'),
          bottom: const TabBar(tabs: [Tab(text: 'Lịch hẹn'), Tab(text: 'Lịch sử hiến máu')]),
        ),
        body: _error != null
            ? ErrorView(_error!, onRetry: _load)
            : _regs == null
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(children: [_buildRegistrations(), _buildHistory()]),
      ),
    );
  }

  Widget _buildRegistrations() {
    final list = _regs!;
    return RefreshIndicator(
      onRefresh: _load,
      child: list.isEmpty
          ? ListView(children: const [EmptyView(icon: Icons.event_note, text: 'Bạn chưa đăng ký đợt hiến máu nào')])
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final r = list[i];
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        DateBox(r.ngayBatDau),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(r.tenDot, style: const TextStyle(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            Text('${fmtTime.format(r.ngayBatDau)} · ${r.tenDiem}', style: const TextStyle(color: AppColors.muted, fontSize: 13)),
                            const SizedBox(height: 6),
                            StatusChip.registration(r.trangThai),
                          ]),
                        ),
                      ]),
                      if (r.ghiChu != null) ...[
                        const SizedBox(height: 10),
                        Text('Ghi chú: ${r.ghiChu}', style: const TextStyle(color: AppColors.muted, fontSize: 13)),
                      ],
                      if (r.coTheHuy) ...[
                        const SizedBox(height: 6),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton.icon(
                            onPressed: () => _cancel(r),
                            icon: const Icon(Icons.close, size: 18, color: Color(0xFFDC2626)),
                            label: const Text('Hủy đăng ký', style: TextStyle(color: Color(0xFFDC2626))),
                          ),
                        ),
                      ],
                    ]),
                  ),
                );
              },
            ),
    );
  }

  Widget _buildHistory() {
    final donated = _history!.where((h) => h.ngayLayMau != null || h.ketQuaSangLoc != null).toList();
    final total = donated.where((h) => h.theTich != null).fold<double>(0, (a, h) => a + h.theTich!);
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(gradient: AppColors.heroGradient, borderRadius: BorderRadius.circular(16)),
          child: Row(children: [
            const Icon(Icons.favorite, color: Colors.white, size: 36),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${donated.where((h) => h.ngayLayMau != null).length} lần hiến máu', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                Text('Tổng cộng ${fmtMl(total)} — có thể đã giúp tới ${donated.where((h) => h.ngayLayMau != null).length * 3} người bệnh',
                    style: const TextStyle(color: Color(0xFFFFE4E6), fontSize: 13)),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 16),
        if (donated.isEmpty) const EmptyView(icon: Icons.bloodtype_outlined, text: 'Chưa có lịch sử hiến máu'),
        for (var i = 0; i < donated.length; i++) _timelineItem(donated[i], last: i == donated.length - 1),
      ]),
    );
  }

  Widget _timelineItem(DonationHistory h, {required bool last}) {
    final ok = h.ngayLayMau != null;
    final color = ok ? AppColors.success : const Color(0xFFDC2626);
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SizedBox(
          width: 28,
          child: Column(children: [
            Container(
              width: 22, height: 22,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              child: Icon(ok ? Icons.check : Icons.close, size: 14, color: Colors.white),
            ),
            if (!last) Expanded(child: Container(width: 2, color: const Color(0xFFE2E8F0))),
          ]),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(h.tenDot, style: const TextStyle(fontWeight: FontWeight.w700))),
                    if (h.theTich != null) StatusChip(fmtMl(h.theTich!), AppColors.success) else const StatusChip('Không đạt', Color(0xFFDC2626)),
                  ]),
                  const SizedBox(height: 4),
                  Text('${h.tenDiem} · ${fmtDate.format(h.ngayLayMau ?? h.ngayKham ?? h.ngayBatDau)}', style: const TextStyle(color: AppColors.muted, fontSize: 13)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 6, runSpacing: 6, children: [
                    if (h.canNang != null) _pill('${h.canNang!.toStringAsFixed(0)} kg'),
                    if (h.huyetAp != null) _pill('HA ${h.huyetAp}'),
                    if (h.hemoglobin != null) _pill('Hb ${h.hemoglobin}'),
                    for (final m in h.maLoMau) _pill(m),
                  ]),
                  if (h.lyDoKhongDat != null) ...[
                    const SizedBox(height: 6),
                    Text('Lý do: ${h.lyDoKhongDat}', style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13)),
                  ],
                ]),
              ),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _pill(String t) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
        child: Text(t, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
      );
}
