import 'package:flutter_test/flutter_test.dart';
import 'package:giot_hong/models.dart';

void main() {
  test('bloodLabel hiển thị đúng nhóm máu và hệ Rh', () {
    expect(bloodLabel('O', 'Rh+'), 'O+');
    expect(bloodLabel('AB', 'Rh-'), 'AB−');
    expect(bloodLabel(null, null), '?');
  });

  test('Donor tính đúng điều kiện hiến máu lại sau 12 tuần', () {
    final json = {
      'id': 1, 'username': 'a', 'hoTen': 'Nguyễn Văn A', 'gioiTinh': 'Nam', 'cccd': '079198000123',
      'soDienThoai': '0901234567', 'ngaySinh': '1998-05-12T00:00:00', 'soLanHien': 2, 'tongTheTich': 700,
      'ngayCoTheHienTiepTheo': DateTime.now().add(const Duration(days: 10)).toIso8601String(),
    };
    final d = Donor.fromJson(json);
    expect(d.duDieuKien, isFalse);
    expect(d.soNgayCho, inInclusiveRange(10, 11));
  });
}
