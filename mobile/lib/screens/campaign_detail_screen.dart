import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models.dart';
import '../services/api.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/common.dart';

class CampaignDetailScreen extends StatefulWidget {
  final int campaignId;
  const CampaignDetailScreen({super.key, required this.campaignId});
  @override
  State<CampaignDetailScreen> createState() => _CampaignDetailScreenState();
}

class _CampaignDetailScreenState extends State<CampaignDetailScreen> {
  Campaign? _c;
  Registration? _mine;
  String? _error;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([Api.campaign(widget.campaignId), Api.myRegistrations()]);
      final regs = results[1] as List<Registration>;
      setState(() {
        _c = results[0] as Campaign;
        _mine = regs.where((r) => r.dotId == widget.campaignId && r.trangThai != 'Huy' && r.trangThai != 'TuChoi').firstOrNull;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  Future<void> _openMap() async {
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(_c!.diaChi)}');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _register() async {
    final note = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Xác nhận đăng ký hiến máu', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('${_c!.tenDot}\n${fmtWeekday.format(_c!.ngayBatDau)} · ${_c!.tenDiem}', style: const TextStyle(color: AppColors.muted)),
          const SizedBox(height: 16),
          TextField(controller: note, maxLength: 255, decoration: const InputDecoration(labelText: 'Ghi chú cho ban tổ chức (không bắt buộc)')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Xác nhận đăng ký')),
        ]),
      ),
    );
    if (ok != true) return;
    setState(() => _submitting = true);
    try {
      final reg = await Api.register(widget.campaignId, note.text.trim().isEmpty ? null : note.text.trim());
      setState(() => _mine = reg);
      if (mounted) {
        context.read<AppState>().checkNotifications(showSystem: false);
        showMessage(context, 'Đăng ký thành công! Vui lòng chờ ban tổ chức duyệt.');
      }
      _load();
    } catch (e) {
      if (mounted) showMessage(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _row(IconData icon, String text, {Widget? trailing}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: AppColors.primary, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 15))),
          ?trailing,
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final c = _c;
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết đợt hiến máu')),
      body: _error != null
          ? ErrorView(_error!, onRetry: _load)
          : c == null
              ? const Center(child: CircularProgressIndicator())
              : ListView(padding: const EdgeInsets.all(16), children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        StatusChip.campaign(c.trangThai),
                        const SizedBox(height: 10),
                        Text(c.tenDot, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 10),
                        _row(Icons.calendar_month_outlined, fmtWeekday.format(c.ngayBatDau)),
                        _row(Icons.schedule, '${fmtTime.format(c.ngayBatDau)} – ${fmtTime.format(c.ngayKetThuc)}'),
                        _row(Icons.place_outlined, '${c.tenDiem}\n${c.diaChi}',
                            trailing: TextButton.icon(onPressed: _openMap, icon: const Icon(Icons.map_outlined, size: 18), label: const Text('Bản đồ'))),
                        if (c.soDienThoaiDiem != null) _row(Icons.phone_outlined, c.soDienThoaiDiem!),
                        _row(Icons.groups_outlined, 'Đã đăng ký: ${c.soLuongDaDangKy}${c.soLuongDuKien != null ? ' / ${c.soLuongDuKien}' : ''} người'),
                      ]),
                    ),
                  ),
                  if (c.moTa != null) ...[
                    const SizedBox(height: 12),
                    Card(child: Padding(padding: const EdgeInsets.all(18), child: Text(c.moTa!, style: const TextStyle(height: 1.5)))),
                  ],
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
                        Text('Chuẩn bị trước khi hiến máu', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        SizedBox(height: 8),
                        _Tip('Ngủ đủ giấc, ăn nhẹ, không ăn nhiều dầu mỡ'),
                        _Tip('Không uống rượu bia trước ngày hiến máu'),
                        _Tip('Uống đủ nước (300 – 500 ml) trước khi hiến'),
                        _Tip('Mang theo CCCD/CMND'),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 100),
                ]),
      bottomNavigationBar: c == null
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: _mine != null
                    ? Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(12)),
                        child: Row(children: [
                          const Icon(Icons.check_circle, color: AppColors.success),
                          const SizedBox(width: 10),
                          const Expanded(child: Text('Bạn đã đăng ký đợt này', style: TextStyle(fontWeight: FontWeight.w700))),
                          StatusChip.registration(_mine!.trangThai),
                        ]),
                      )
                    : FilledButton.icon(
                        onPressed: !c.conMo || _submitting ? null : _register,
                        icon: const Icon(Icons.volunteer_activism),
                        label: Text(c.conMo ? 'Đăng ký hiến máu' : 'Đợt hiến máu đã kết thúc'),
                      ),
              ),
            ),
    );
  }
}

class _Tip extends StatelessWidget {
  final String text;
  const _Tip(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Icon(Icons.check_circle, size: 18, color: AppColors.success),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ]),
      );
}
