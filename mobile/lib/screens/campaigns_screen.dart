import 'package:flutter/material.dart';
import '../models.dart';
import '../services/api.dart';
import '../widgets/common.dart';
import 'campaign_detail_screen.dart';

/// Xem lịch và địa điểm tổ chức hiến máu
class CampaignsScreen extends StatefulWidget {
  const CampaignsScreen({super.key});
  @override
  State<CampaignsScreen> createState() => _CampaignsScreenState();
}

class _CampaignsScreenState extends State<CampaignsScreen> {
  bool _upcoming = true;
  String _keyword = '';
  List<Campaign>? _data;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final list = await Api.campaigns(trangThai: _upcoming ? 'DangDienRa,SapDienRa' : 'DaKetThuc');
      list.sort((a, b) => _upcoming ? a.ngayBatDau.compareTo(b.ngayBatDau) : b.ngayBatDau.compareTo(a.ngayBatDau));
      setState(() => _data = list);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final kw = _keyword.toLowerCase();
    final shown = _data?.where((c) => kw.isEmpty || '${c.tenDot} ${c.tenDiem} ${c.diaChi}'.toLowerCase().contains(kw)).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Lịch & địa điểm hiến máu')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: TextField(
            decoration: const InputDecoration(hintText: 'Tìm theo tên đợt, địa điểm…', prefixIcon: Icon(Icons.search)),
            onChanged: (v) => setState(() => _keyword = v),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: SizedBox(
            width: double.infinity,
            child: SegmentedButton<bool>(
              segments: const [ButtonSegment(value: true, label: Text('Sắp & đang diễn ra')), ButtonSegment(value: false, label: Text('Đã kết thúc'))],
              selected: {_upcoming},
              onSelectionChanged: (s) { setState(() { _upcoming = s.first; _data = null; }); _load(); },
            ),
          ),
        ),
        Expanded(
          child: _error != null
              ? ErrorView(_error!, onRetry: _load)
              : shown == null
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: shown.isEmpty
                          ? ListView(children: const [EmptyView(icon: Icons.event_busy, text: 'Không có đợt hiến máu phù hợp')])
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                              itemCount: shown.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 10),
                              itemBuilder: (_, i) => CampaignTile(shown[i], onTap: () async {
                                await Navigator.push(context, MaterialPageRoute(builder: (_) => CampaignDetailScreen(campaignId: shown[i].id)));
                                _load();
                              }),
                            ),
                    ),
        ),
      ]),
    );
  }
}
