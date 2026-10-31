import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('vi');
dayjs.extend(relativeTime);

export const fmtDate = (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '—');
export const fmtDateTime = (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—');
export const fmtTime = (v) => (v ? dayjs(v).format('HH:mm') : '—');
export const fromNow = (v) => (v ? dayjs(v).fromNow() : '');
export const fmtNumber = (v) => (v == null ? '0' : Number(v).toLocaleString('vi-VN'));
export const fmtMl = (v) => `${fmtNumber(Math.round(Number(v || 0)))} ml`;
export const fmtLiters = (v) => `${(Number(v || 0) / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} L`;
export const ageOf = (d) => (d ? dayjs().diff(dayjs(d), 'year') : null);

export const bloodLabel = (nhomMau, heRh) => (nhomMau ? `${nhomMau}${heRh === 'Rh-' ? '−' : heRh === 'Rh+' ? '+' : ''}` : 'Chưa rõ');

export const THANH_PHAN = {
  ToanPhan: { label: 'Máu toàn phần', short: 'Toàn phần', color: '#c8102e', days: 35 },
  HongCau: { label: 'Hồng cầu lắng', short: 'Hồng cầu', color: '#e11d48', days: 42 },
  HuyetTuong: { label: 'Huyết tương', short: 'Huyết tương', color: '#f59e0b', days: 365 },
  TieuCau: { label: 'Tiểu cầu', short: 'Tiểu cầu', color: '#8b5cf6', days: 5 }
};
export const thanhPhanLabel = (v) => THANH_PHAN[v]?.label || v;

export const DANG_KY_STATUS = {
  ChoDuyet: { label: 'Chờ duyệt', color: 'gold' },
  DaDuyet: { label: 'Đã duyệt', color: 'blue' },
  DaSangLoc: { label: 'Đạt sàng lọc', color: 'cyan' },
  DaHienMau: { label: 'Đã hiến máu', color: 'green' },
  TuChoi: { label: 'Từ chối / Không đạt', color: 'red' },
  Huy: { label: 'Đã hủy', color: 'default' }
};

export const DOT_STATUS = {
  SapDienRa: { label: 'Sắp diễn ra', color: 'blue' },
  DangDienRa: { label: 'Đang diễn ra', color: 'green' },
  DaKetThuc: { label: 'Đã kết thúc', color: 'default' },
  DaHuy: { label: 'Đã hủy', color: 'red' }
};

export const KHO_STATUS = {
  ConKho: { label: 'Còn trong kho', color: 'green' },
  DaXuat: { label: 'Đã xuất', color: 'blue' },
  HetHan: { label: 'Hết hạn', color: 'red' },
  HuyBo: { label: 'Đã hủy bỏ', color: 'default' },
  DaChia: { label: 'Đã chia túi', color: 'purple' }
};

// ===== Thể tích hiến máu (Thông tư 26/2013/TT-BYT) — đồng bộ với DonationRules phía backend =====
export const THE_TICH_CHUAN = [250, 350, 450];
export const THE_TICH_OPTIONS = THE_TICH_CHUAN.map((v) => ({ value: v, label: `${v} ml` }));
// Thể tích tối đa theo cân nặng (≤ 9 ml/kg; < 45 kg: 250 ml) và Hb (< 12,5 g/dL: 250 ml)
export function maxDonationVolume(canNang, hemoglobin) {
  if (!canNang || canNang < 42) return 0;
  let max = Math.max(0, ...THE_TICH_CHUAN.filter((v) => v <= canNang * 9));
  if (canNang < 45) max = Math.min(max, 250);
  if (hemoglobin != null && hemoglobin < 12.5) max = Math.min(max, 250);
  return max;
}

// Loại túi lấy máu quyết định các chế phẩm điều chế được
export const LOAI_TUI = {
  Don: { label: 'Túi đơn', desc: 'Lưu nguyên máu toàn phần', parts: ['ToanPhan'] },
  Doi: { label: 'Túi đôi', desc: 'Ly tâm tách khối hồng cầu + huyết tương', parts: ['HongCau', 'HuyetTuong'] },
  Ba: { label: 'Túi ba', desc: 'Tách khối hồng cầu + huyết tương + khối tiểu cầu (từ 350 ml)', parts: ['HongCau', 'HuyetTuong', 'TieuCau'] }
};

export const BAO_QUAN = {
  ToanPhan: '2–6 °C · tủ lạnh trữ máu',
  HongCau: '2–6 °C · tủ lạnh trữ máu',
  HuyetTuong: '≤ −25 °C · tủ đông',
  TieuCau: '20–24 °C · máy lắc liên tục'
};

export const MUC_DO_KHAN = {
  Thuong: { label: 'Thường quy', color: 'default' },
  Khan: { label: 'Khẩn', color: 'orange' },
  CapCuu: { label: 'Cấp cứu', color: 'red' }
};

// Mức độ thiếu máu của một nhóm so với ngưỡng an toàn
export function shortageLevel(tonKho, nguong) {
  const pct = nguong ? (Number(tonKho) / Number(nguong)) * 100 : 100;
  if (pct < 25) return { key: 'CanKiet', label: 'Cạn kiệt', color: 'red', pct };
  if (pct < 100) return { key: 'Thieu', label: 'Thiếu', color: 'orange', pct };
  return { key: 'An toan', label: 'An toàn', color: 'green', pct };
}

export const LOAI_THONG_BAO = {
  KeuGoiHienMau: { label: 'Kêu gọi hiến máu', color: 'red' },
  NhacLich: { label: 'Nhắc lịch', color: 'blue' },
  ThongBaoChung: { label: 'Thông báo chung', color: 'default' }
};

export const NHOM_MAU_OPTIONS = ['A', 'B', 'AB', 'O'].map((v) => ({ value: v, label: `Nhóm ${v}` }));
export const RH_OPTIONS = [{ value: 'Rh+', label: 'Rh+ (dương)' }, { value: 'Rh-', label: 'Rh− (âm)' }];
export const GIOI_TINH_OPTIONS = ['Nam', 'Nữ', 'Khác'].map((v) => ({ value: v, label: v }));
export const BLOOD_GROUPS = ['A', 'B', 'AB', 'O'].flatMap((n) => ['Rh+', 'Rh-'].map((r) => ({ nhomMau: n, heRh: r })));

// Bảng tương thích truyền hồng cầu: người nhận -> danh sách nhóm có thể cho
export const COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};
