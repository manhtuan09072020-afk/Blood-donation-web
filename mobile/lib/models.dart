// Các lớp dữ liệu ánh xạ từ JSON của API .NET

DateTime? _date(dynamic v) => v == null ? null : DateTime.tryParse(v.toString())?.toLocal();
double _num(dynamic v) => v == null ? 0 : (v as num).toDouble();

String bloodLabel(String? nhomMau, String? heRh) {
  if (nhomMau == null || nhomMau.isEmpty) return '?';
  return '$nhomMau${heRh == 'Rh-' ? '−' : '+'}';
}

class LoginResult {
  final String token, username, role, hoTen;
  final int? profileId;
  LoginResult.fromJson(Map<String, dynamic> j)
      : token = j['token'],
        username = j['username'],
        role = j['role'],
        hoTen = j['hoTen'] ?? j['username'],
        profileId = j['profileId'];
}

class Donor {
  final int id;
  final String username, hoTen, gioiTinh, cccd, soDienThoai;
  final DateTime ngaySinh;
  final DateTime? ngayDangKy, lanHienGanNhat, ngayCoTheHienTiepTheo;
  final String? nhomMau, heRh, diaChi, email;
  final double? canNang;
  final int soLanHien;
  final double tongTheTich;

  Donor.fromJson(Map<String, dynamic> j)
      : id = j['id'],
        username = j['username'] ?? '',
        hoTen = j['hoTen'],
        gioiTinh = j['gioiTinh'],
        cccd = j['cccd'],
        soDienThoai = j['soDienThoai'],
        ngaySinh = _date(j['ngaySinh'])!,
        ngayDangKy = _date(j['ngayDangKy']),
        nhomMau = j['nhomMau'],
        heRh = j['heRh'],
        diaChi = j['diaChi'],
        email = j['email'],
        canNang = j['canNang'] == null ? null : _num(j['canNang']),
        soLanHien = j['soLanHien'] ?? 0,
        tongTheTich = _num(j['tongTheTich']),
        lanHienGanNhat = _date(j['lanHienGanNhat']),
        ngayCoTheHienTiepTheo = _date(j['ngayCoTheHienTiepTheo']);

  bool get duDieuKien => ngayCoTheHienTiepTheo == null || !ngayCoTheHienTiepTheo!.isAfter(DateTime.now());
  int get soNgayCho => ngayCoTheHienTiepTheo == null ? 0 : ngayCoTheHienTiepTheo!.difference(DateTime.now()).inDays + 1;
}

class Campaign {
  final int id, soLuongDaDangKy, soLuongDaHien;
  final int? soLuongDuKien;
  final String tenDot, tenDiem, diaChi, trangThai;
  final String? moTa, soDienThoaiDiem;
  final DateTime ngayBatDau, ngayKetThuc;

  Campaign.fromJson(Map<String, dynamic> j)
      : id = j['id'],
        tenDot = j['tenDot'],
        tenDiem = j['tenDiem'],
        diaChi = j['diaChi'] ?? '',
        soDienThoaiDiem = j['soDienThoaiDiem'],
        ngayBatDau = _date(j['ngayBatDau'])!,
        ngayKetThuc = _date(j['ngayKetThuc'])!,
        soLuongDuKien = j['soLuongDuKien'],
        moTa = j['moTa'],
        trangThai = j['trangThai'],
        soLuongDaDangKy = j['soLuongDaDangKy'] ?? 0,
        soLuongDaHien = j['soLuongDaHien'] ?? 0;

  bool get conMo => trangThai == 'SapDienRa' || trangThai == 'DangDienRa';
}

class Registration {
  final int id, dotId;
  final String tenDot, tenDiem, diaChi, trangThai;
  final String? ghiChu;
  final DateTime ngayBatDau, ngayKetThuc, ngayDangKy;

  Registration.fromJson(Map<String, dynamic> j)
      : id = j['id'],
        dotId = j['dotId'],
        tenDot = j['tenDot'],
        tenDiem = j['tenDiem'] ?? '',
        diaChi = j['diaChi'] ?? '',
        trangThai = j['trangThai'],
        ghiChu = j['ghiChu'],
        ngayBatDau = _date(j['ngayBatDau'])!,
        ngayKetThuc = _date(j['ngayKetThuc'])!,
        ngayDangKy = _date(j['ngayDangKy'])!;

  bool get conHieuLuc => ['ChoDuyet', 'DaDuyet', 'DaSangLoc'].contains(trangThai) && ngayKetThuc.isAfter(DateTime.now().subtract(const Duration(days: 1)));
  bool get coTheHuy => trangThai == 'ChoDuyet' || trangThai == 'DaDuyet';
}

class DonationHistory {
  final int dangKyId;
  final String tenDot, tenDiem, trangThai;
  final DateTime ngayBatDau;
  final DateTime? ngayKham, ngayLayMau;
  final String? ketQuaSangLoc, lyDoKhongDat, huyetAp;
  final double? theTich, canNang, hemoglobin;
  final List<String> maLoMau;

  DonationHistory.fromJson(Map<String, dynamic> j)
      : dangKyId = j['dangKyId'],
        tenDot = j['tenDot'],
        tenDiem = j['tenDiem'] ?? '',
        trangThai = j['trangThai'],
        ngayBatDau = _date(j['ngayBatDau'])!,
        ngayKham = _date(j['ngayKham']),
        ngayLayMau = _date(j['ngayLayMau']),
        ketQuaSangLoc = j['ketQuaSangLoc'],
        lyDoKhongDat = j['lyDoKhongDat'],
        huyetAp = j['huyetAp'],
        theTich = j['theTich'] == null ? null : _num(j['theTich']),
        canNang = j['canNang'] == null ? null : _num(j['canNang']),
        hemoglobin = j['hemoglobin'] == null ? null : _num(j['hemoglobin']),
        maLoMau = (j['maLoMau'] as List? ?? []).map((e) => e.toString()).toList();
}

class AppNotification {
  final int id;
  final String tieuDe, noiDung, loai;
  final DateTime ngayGui;
  bool daDoc;
  final int? dotId;

  AppNotification.fromJson(Map<String, dynamic> j)
      : id = j['id'],
        tieuDe = j['tieuDe'],
        noiDung = j['noiDung'],
        loai = j['loai'],
        ngayGui = _date(j['ngayGui'])!,
        daDoc = j['daDoc'] ?? false,
        dotId = j['dotId'];
}

class BloodGroup {
  final String nhomMau, heRh;
  final double tonKho, nguongCanhBao;
  final bool canhBaoThieu;

  BloodGroup.fromJson(Map<String, dynamic> j)
      : nhomMau = j['nhomMau'],
        heRh = j['heRh'],
        tonKho = _num(j['tonKho']),
        nguongCanhBao = _num(j['nguongCanhBao']),
        canhBaoThieu = j['canhBaoThieu'] ?? false;

  double get mucDuTru => nguongCanhBao == 0 ? 1 : (tonKho / nguongCanhBao).clamp(0, 1).toDouble();
}
