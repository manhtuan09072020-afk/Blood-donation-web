import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../services/api.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'campaign_detail_screen.dart';
import 'main_shell.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Campaign> _campaigns = [];
  List<BloodGroup> _groups = [];
  Registration? _active;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final state = context.read<AppState>();
      final results = await Future.wait([
        Api.campaigns(trangThai: 'DangDienRa,SapDienRa'),
        Api.bloodGroups(),
        Api.myRegistrations(),
        state.refreshProfile(),
      ]);
      final camps = (results[0] as List<Campaign>)..sort((a, b) => a.ngayBatDau.compareTo(b.ngayBatDau));
      final regs = results[2] as List<Registration>;
      setState(() {
        _campaigns = camps;
        _groups = results[1] as List<BloodGroup>;
        _active = regs.where((r) => r.conHieuLuc).firstOrNull;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openCampaign(Campaign c) async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => CampaignDetailScreen(campaignId: c.id)));
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final donor = context.watch<AppState>().donor;
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(padding: EdgeInsets.zero, children: [
          _Header(donor: donor),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            child: _loading && donor == null
                ? const Padding(padding: EdgeInsets.all(48), child: Center(child: CircularProgressIndicator()))
                : _error != null
                    ? ErrorView(_error!, onRetry: _load)
                    : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        const SizedBox(height: 16),
                        _StatusCard(donor: donor, active: _active, onFind: () => MainShell.goTo(context, 1)),
                        if (_groups.any((g) => g.canhBaoThieu)) ...[
                          const SectionTitle('Nhóm máu đang cần'),
                          _ShortageCard(groups: _groups, myGroup: donor == null ? null : bloodLabel(donor.nhomMau, donor.heRh)),
                        ],
                        SectionTitle('Đợt hiến máu sắp tới', action: 'Xem tất cả', onAction: () => MainShell.goTo(context, 1)),
                        if (_campaigns.isEmpty) const EmptyView(icon: Icons.event_busy, text: 'Chưa có đợt hiến máu sắp tới'),
                        for (final c in _campaigns.take(4))
                          Padding(padding: const EdgeInsets.only(bottom: 10), child: CampaignTile(c, onTap: () => _openCampaign(c))),
                      ]),
          ),
        ]),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final Donor? donor;
  const _Header({required this.donor});

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return Container(
      padding: EdgeInsets.fromLTRB(20, top + 16, 20, 24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF9F0D24)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.water_drop_rounded, color: Color(0xFFFB7185)),
          const SizedBox(width: 6),
          const Text('Giọt Hồng', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
          const Spacer(),
          Text(fmtDate.format(DateTime.now()), style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13)),
        ]),
        const SizedBox(height: 20),
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Xin chào,', style: TextStyle(color: Color(0xFFCBD5E1))),
              Text(donor?.hoTen ?? '...', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
            ]),
          ),
          BloodBadge(nhomMau: donor?.nhomMau, heRh: donor?.heRh, size: 1.5),
        ]),
        const SizedBox(height: 18),
        Row(children: [
          _stat('${donor?.soLanHien ?? 0}', 'lần hiến'),
          _stat(fmtMl(donor?.tongTheTich ?? 0), 'đã hiến'),
          _stat(donor?.lanHienGanNhat == null ? '—' : fmtDate.format(donor!.lanHienGanNhat!), 'gần nhất'),
        ]),
      ]),
    );
  }

  Widget _stat(String value, String label) => Expanded(
        child: Container(
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            FittedBox(child: Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16))),
            Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
          ]),
        ),
      );
}

class _StatusCard extends StatelessWidget {
  final Donor? donor;
  final Registration? active;
  final VoidCallback onFind;
  const _StatusCard({required this.donor, required this.active, required this.onFind});

  @override
  Widget build(BuildContext context) {
    if (donor == null) return const SizedBox.shrink();
    late final Color color;
    late final IconData icon;
    late final String title, sub;
    Widget? action;

    if (active != null) {
      color = AppColors.info;
      icon = Icons.event_available_rounded;
      title = 'Lịch hẹn: ${active!.tenDot}';
      sub = '${fmtDateTime.format(active!.ngayBatDau)} · ${active!.tenDiem}';
      action = StatusChip.registration(active!.trangThai);
    } else if (donor!.duDieuKien) {
      color = AppColors.success;
      icon = Icons.verified_rounded;
      title = 'Bạn đã sẵn sàng hiến máu!';
      sub = 'Đã đủ 12 tuần kể từ lần hiến gần nhất. Chọn một đợt hiến máu phù hợp.';
      action = FilledButton(onPressed: onFind, style: FilledButton.styleFrom(minimumSize: const Size(0, 40)), child: const Text('Đăng ký'));
    } else {
      color = AppColors.warning;
      icon = Icons.hourglass_bottom_rounded;
      title = 'Hiến lại từ ${fmtDate.format(donor!.ngayCoTheHienTiepTheo!)}';
      sub = 'Còn ${donor!.soNgayCho} ngày. Cơ thể cần 12 tuần để phục hồi hoàn toàn.';
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Container(
            width: 46, height: 46,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              const SizedBox(height: 4),
              Text(sub, style: const TextStyle(color: AppColors.muted, fontSize: 13)),
            ]),
          ),
          if (action != null) ...[const SizedBox(width: 8), action],
        ]),
      ),
    );
  }
}

class _ShortageCard extends StatelessWidget {
  final List<BloodGroup> groups;
  final String? myGroup;
  const _ShortageCard({required this.groups, this.myGroup});

  @override
  Widget build(BuildContext context) {
    final low = groups.where((g) => g.canhBaoThieu).toList();
    final mine = low.any((g) => bloodLabel(g.nhomMau, g.heRh) == myGroup);
    return Card(
      color: const Color(0xFFFFF5F6),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (mine)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
              child: const Row(children: [
                Icon(Icons.campaign_rounded, color: Colors.white),
                SizedBox(width: 8),
                Expanded(child: Text('Nhóm máu của bạn đang thiếu — bệnh viện rất cần bạn!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
              ]),
            ),
          Wrap(spacing: 10, runSpacing: 10, children: [
            for (final g in low)
              SizedBox(
                width: 72,
                child: Column(children: [
                  BloodBadge(nhomMau: g.nhomMau, heRh: g.heRh, size: 1.2),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(value: g.mucDuTru, minHeight: 5, color: const Color(0xFFDC2626), backgroundColor: const Color(0xFFFECACA)),
                  ),
                  const SizedBox(height: 2),
                  Text('${(g.mucDuTru * 100).round()}%', style: const TextStyle(fontSize: 11, color: AppColors.muted)),
                ]),
              ),
          ]),
        ]),
      ),
    );
  }
}
