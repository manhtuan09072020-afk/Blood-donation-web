import { useEffect, useState } from 'react';
import { Button, Card, Col, DatePicker, Progress, Row, Space, Statistic, Table, Tabs, Typography } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';
import dayjs from 'dayjs';
import { reportApi } from '../../api';
import { BloodBadge, CampaignStatusTag, Loading, PageHeader } from '../../components/common';
import { fmtDate, fmtMl, fmtNumber, thanhPhanLabel, bloodLabel } from '../../utils/format';
import { exportExcel } from '../../utils/exportExcel';
import { useAuth } from '../../context/AuthContext';

const rangeText = (r) => (r?.[0] && r?.[1] ? `Kỳ báo cáo: ${r[0].format('DD/MM/YYYY')} – ${r[1].format('DD/MM/YYYY')}` : 'Toàn bộ thời gian');
const labelValue = (title, unitTitle, type = 'number') => [
  { title, value: 'label' }, { title: unitTitle, value: (x) => Number(x.value), type, total: 'sum' }
];

const PALETTE = ['#c8102e', '#2563eb', '#f59e0b', '#16a34a', '#7c3aed', '#0891b2', '#e11d48', '#64748b', '#fb7185', '#84cc16'];

function PieBox({ data, title, unit = '' }) {
  const rows = data.map((d) => ({ name: d.label, value: Number(d.value) }));
  return (
    <Card size="small" title={title} variant="borderless" style={{ height: '100%' }}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
            {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => `${fmtNumber(v)}${unit}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

function RangeBar({ value, onChange, extra }) {
  return (
    <div className="toolbar no-print">
      <DatePicker.RangePicker format="DD/MM/YYYY" value={value} onChange={onChange} allowClear
        presets={[
          { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] },
          { label: '3 tháng', value: [dayjs().subtract(3, 'month'), dayjs()] },
          { label: '6 tháng', value: [dayjs().subtract(6, 'month'), dayjs()] },
          { label: 'Năm nay', value: [dayjs().startOf('year'), dayjs()] }
        ]} />
      <div style={{ flex: 1 }} />
      {extra}
      <Button icon={<PrinterOutlined />} onClick={() => window.print()}>In báo cáo</Button>
    </div>
  );
}
const rangeParams = (r) => ({ tuNgay: r?.[0]?.format('YYYY-MM-DD'), denNgay: r?.[1]?.format('YYYY-MM-DD') });

function MonthlyReport() {
  const { user } = useAuth();
  const [year, setYear] = useState(dayjs());
  const [data, setData] = useState(null);
  useEffect(() => { reportApi.monthly(year.year()).then(setData); }, [year]);
  if (!data) return <Loading />;
  const sum = (k) => data.reduce((a, m) => a + Number(m[k]), 0);
  return (
    <>
      <div className="toolbar no-print">
        <DatePicker picker="year" value={year} onChange={(v) => v && setYear(v)} allowClear={false} />
        <div style={{ flex: 1 }} />
        <Button icon={<DownloadOutlined />} onClick={() => exportExcel({
          fileName: `bao-cao-tong-hop-${year.year()}`, title: `Báo cáo tổng hợp hoạt động hiến máu năm ${year.year()}`, sheetName: `Năm ${year.year()}`,
          subtitle: `Kỳ báo cáo: 01/01/${year.year()} – 31/12/${year.year()}`, signer: user?.hoTen,
          summary: [
            { label: 'Tổng lượt hiến máu', value: sum('soLuotHienMau') }, { label: 'Tổng lượng máu tiếp nhận', value: sum('tongTheTich'), type: 'ml' },
            { label: 'Số phiếu xuất kho', value: sum('soPhieuXuat') }, { label: 'Tổng lượng máu xuất kho', value: sum('tongXuat'), type: 'ml' }
          ],
          sections: [{
            title: 'SỐ LIỆU THEO THÁNG', rows: data, columns: [
              { title: 'Tháng', value: (m) => `Tháng ${m.thang}/${m.nam}` }, { title: 'Lượt hiến máu', value: 'soLuotHienMau', type: 'number', total: 'sum' },
              { title: 'Lượng máu tiếp nhận', value: 'tongTheTich', type: 'ml', total: 'sum' }, { title: 'Số phiếu xuất', value: 'soPhieuXuat', type: 'number', total: 'sum' },
              { title: 'Lượng máu xuất kho', value: 'tongXuat', type: 'ml', total: 'sum' },
              { title: 'Chênh lệch nhập − xuất', value: (m) => Number(m.tongTheTich) - Number(m.tongXuat), type: 'ml', total: 'sum' }
            ]
          }]
        })}>Xuất Excel</Button>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>In báo cáo</Button>
      </div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Tổng lượt hiến" value={sum('soLuotHienMau')} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Tổng tiếp nhận" value={fmtMl(sum('tongTheTich'))} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Số phiếu xuất" value={sum('soPhieuXuat')} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Tổng xuất kho" value={fmtMl(sum('tongXuat'))} /></Card></Col>
      </Row>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data.map((m) => ({ name: `T${m.thang}`, nhap: Number(m.tongTheTich), xuat: Number(m.tongXuat), luot: m.soLuotHienMau }))}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis yAxisId="ml" tickLine={false} axisLine={false} />
          <YAxis yAxisId="l" orientation="right" tickLine={false} axisLine={false} />
          <Tooltip formatter={(v, n) => (n === 'Lượt hiến' ? v : fmtMl(v))} />
          <Legend />
          <Bar yAxisId="ml" dataKey="nhap" name="Tiếp nhận (ml)" fill="#c8102e" radius={[6, 6, 0, 0]} />
          <Bar yAxisId="ml" dataKey="xuat" name="Xuất kho (ml)" fill="#fda4af" radius={[6, 6, 0, 0]} />
          <Line yAxisId="l" dataKey="luot" name="Lượt hiến" stroke="#2563eb" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
      <Table style={{ marginTop: 16 }} size="small" rowKey="thang" dataSource={data} pagination={false}
        columns={[
          { title: 'Tháng', render: (_, m) => `Tháng ${m.thang}/${m.nam}` },
          { title: 'Lượt hiến máu', dataIndex: 'soLuotHienMau', align: 'right' },
          { title: 'Lượng máu tiếp nhận', dataIndex: 'tongTheTich', align: 'right', render: fmtMl },
          { title: 'Số phiếu xuất', dataIndex: 'soPhieuXuat', align: 'right' },
          { title: 'Lượng máu xuất kho', dataIndex: 'tongXuat', align: 'right', render: fmtMl },
          { title: 'Chênh lệch nhập − xuất', align: 'right', render: (_, m) => { const d = m.tongTheTich - m.tongXuat; return <span style={{ color: d >= 0 ? '#16a34a' : '#dc2626' }}>{d >= 0 ? '+' : ''}{fmtMl(d)}</span>; } }
        ]} />
    </>
  );
}

function DonorReport() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  useEffect(() => { reportApi.donors().then(setD); }, []);
  if (!d) return <Loading />;
  const doExport = () => exportExcel({
    fileName: 'bao-cao-nguoi-hien-mau', title: 'Báo cáo thống kê người hiến máu', sheetName: 'Người hiến', signer: user?.hoTen,
    subtitle: `Số liệu đến ngày ${dayjs().format('DD/MM/YYYY')}`,
    summary: [
      { label: 'Người hiến đang hoạt động', value: d.tongNguoiHien }, { label: 'Đã từng hiến máu', value: d.daTungHien },
      { label: 'Tỷ lệ chuyển đổi (%)', value: d.tongNguoiHien ? Math.round((d.daTungHien / d.tongNguoiHien) * 100) : 0, type: 'percent' }
    ],
    sections: [
      { title: 'THEO NHÓM MÁU', rows: d.theoNhomMau, columns: labelValue('Nhóm máu', 'Số người') },
      { title: 'THEO GIỚI TÍNH', rows: d.theoGioiTinh, columns: labelValue('Giới tính', 'Số người') },
      { title: 'THEO ĐỘ TUỔI', rows: d.theoDoTuoi, columns: labelValue('Độ tuổi', 'Số người') },
      {
        title: 'TOP 10 NGƯỜI HIẾN MÁU TÍCH CỰC', rows: d.topNguoiHien, columns: [
          { title: 'Họ tên', value: 'hoTen' }, { title: 'Nhóm máu', value: (r) => bloodLabel(r.nhomMau, r.heRh), align: 'center' },
          { title: 'Số lần hiến', value: 'soLanHien', type: 'number', total: 'sum' }, { title: 'Tổng lượng máu', value: 'tongTheTich', type: 'ml', total: 'sum' },
          { title: 'Lần hiến gần nhất', value: 'lanHienGanNhat', type: 'date' }
        ]
      }
    ]
  });
  return (
    <>
      <div className="toolbar no-print"><div style={{ flex: 1 }} /><Button icon={<DownloadOutlined />} onClick={doExport}>Xuất Excel</Button><Button icon={<PrinterOutlined />} onClick={() => window.print()}>In báo cáo</Button></div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={8}><Card size="small"><Statistic title="Người hiến đang hoạt động" value={d.tongNguoiHien} /></Card></Col>
        <Col xs={12} md={8}><Card size="small"><Statistic title="Đã từng hiến máu" value={d.daTungHien} /></Card></Col>
        <Col xs={24} md={8}><Card size="small"><Statistic title="Tỷ lệ chuyển đổi" value={d.tongNguoiHien ? Math.round((d.daTungHien / d.tongNguoiHien) * 100) : 0} suffix="%" /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><PieBox title="Theo nhóm máu" data={d.theoNhomMau} unit=" người" /></Col>
        <Col xs={24} md={8}><PieBox title="Theo giới tính" data={d.theoGioiTinh} unit=" người" /></Col>
        <Col xs={24} md={8}>
          <Card size="small" title="Theo độ tuổi" variant="borderless">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.theoDoTuoi.map((x) => ({ name: x.label, v: Number(x.value) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="v" name="Người hiến" fill="#c8102e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" title="Người hiến đăng ký mới (12 tháng)" variant="borderless">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={d.moiTheoThang.map((x) => ({ name: x.label.slice(0, 5), v: Number(x.value) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                <Line dataKey="v" name="Người mới" stroke="#c8102e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card size="small" title="Top 10 người hiến máu tích cực" variant="borderless">
            <Table size="small" rowKey="id" pagination={false} dataSource={d.topNguoiHien}
              columns={[
                { title: '#', width: 40, render: (_, __, i) => <b>{i + 1}</b> },
                { title: 'Họ tên', dataIndex: 'hoTen' },
                { title: 'Nhóm', render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                { title: 'Số lần', dataIndex: 'soLanHien', align: 'center' },
                { title: 'Tổng', dataIndex: 'tongTheTich', render: fmtMl, align: 'right' },
                { title: 'Gần nhất', dataIndex: 'lanHienGanNhat', render: fmtDate }
              ]} />
          </Card>
        </Col>
      </Row>
    </>
  );
}

function CampaignReport() {
  const { user } = useAuth();
  const [range, setRange] = useState([dayjs().subtract(1, 'year'), dayjs().add(1, 'month')]);
  const [data, setData] = useState(null);
  useEffect(() => { reportApi.campaigns(rangeParams(range)).then(setData); }, [range]);
  if (!data) return <Loading />;
  const tot = (k) => data.reduce((a, c) => a + Number(c[k]), 0);
  const doExport = () => exportExcel({
    fileName: 'bao-cao-dot-hien-mau', title: 'Báo cáo kết quả các đợt hiến máu', sheetName: 'Đợt hiến máu', subtitle: rangeText(range), signer: user?.hoTen,
    summary: [
      { label: 'Số đợt hiến máu', value: data.length }, { label: 'Lượt đăng ký', value: tot('soDangKy') },
      { label: 'Tỷ lệ đạt sàng lọc (%)', value: tot('soDaSangLoc') ? Math.round((tot('soDat') / tot('soDaSangLoc')) * 100) : 0, type: 'percent' },
      { label: 'Lượng máu thu được', value: tot('tongTheTich'), type: 'ml' }
    ],
    sections: [{
      title: 'CHI TIẾT TỪNG ĐỢT', rows: data, columns: [
        { title: 'Đợt hiến máu', value: 'tenDot' }, { title: 'Điểm hiến máu', value: 'tenDiem' }, { title: 'Ngày', value: 'ngayBatDau', type: 'date' },
        { title: 'Kế hoạch', value: 'soLuongDuKien', type: 'number', total: 'sum' }, { title: 'Đăng ký', value: 'soDangKy', type: 'number', total: 'sum' },
        { title: 'Đã sàng lọc', value: 'soDaSangLoc', type: 'number', total: 'sum' }, { title: 'Đạt', value: 'soDat', type: 'number', total: 'sum' },
        { title: 'Không đạt', value: 'soKhongDat', type: 'number', total: 'sum' }, { title: 'Đã hiến', value: 'soDaHien', type: 'number', total: 'sum' },
        { title: 'Hoàn thành KH (%)', value: (r) => (r.soLuongDuKien ? Math.round((r.soDaHien / r.soLuongDuKien) * 100) : null), type: 'percent' },
        { title: 'Lượng máu', value: 'tongTheTich', type: 'ml', total: 'sum' }
      ]
    }]
  });
  return (
    <>
      <RangeBar value={range} onChange={setRange} extra={<Button icon={<DownloadOutlined />} onClick={doExport}>Xuất Excel</Button>} />
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Số đợt" value={data.length} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Lượt đăng ký" value={tot('soDangKy')} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Tỷ lệ đạt sàng lọc" value={tot('soDaSangLoc') ? Math.round((tot('soDat') / tot('soDaSangLoc')) * 100) : 0} suffix="%" /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Lượng máu thu được" value={fmtMl(tot('tongTheTich'))} /></Card></Col>
      </Row>
      <Table size="small" rowKey="dotId" dataSource={data} pagination={{ pageSize: 15 }} scroll={{ x: 1100 }}
        columns={[
          { title: 'Đợt hiến máu', dataIndex: 'tenDot', render: (v, r) => <><b>{v}</b><div style={{ fontSize: 12, color: '#64748b' }}>{r.tenDiem}</div></> },
          { title: 'Ngày', dataIndex: 'ngayBatDau', render: fmtDate, width: 100 },
          { title: 'Trạng thái', dataIndex: 'trangThai', render: (v) => <CampaignStatusTag value={v} />, width: 120 },
          { title: 'Đăng ký / KH', width: 110, align: 'center', render: (_, r) => `${r.soDangKy}${r.soLuongDuKien ? `/${r.soLuongDuKien}` : ''}` },
          { title: 'Sàng lọc', dataIndex: 'soDaSangLoc', align: 'center', width: 90 },
          { title: 'Đạt / Không đạt', width: 130, align: 'center', render: (_, r) => <><span style={{ color: '#16a34a' }}>{r.soDat}</span> / <span style={{ color: '#dc2626' }}>{r.soKhongDat}</span></> },
          { title: 'Đã hiến', dataIndex: 'soDaHien', align: 'center', width: 90 },
          { title: 'Hoàn thành KH', width: 160, render: (_, r) => r.soLuongDuKien ? <Progress size="small" percent={Math.round((r.soDaHien / r.soLuongDuKien) * 100)} strokeColor="#c8102e" /> : '—' },
          { title: 'Lượng máu', dataIndex: 'tongTheTich', render: fmtMl, align: 'right', width: 110 }
        ]} />
    </>
  );
}

function InventoryReport() {
  const { user } = useAuth();
  const [range, setRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [d, setD] = useState(null);
  useEffect(() => { reportApi.inventory(rangeParams(range)).then(setD); }, [range]);
  if (!d) return <Loading />;
  const doExport = () => exportExcel({
    fileName: 'bao-cao-ton-kho', title: 'Báo cáo nhập – xuất – tồn kho máu', sheetName: 'Tồn kho', subtitle: rangeText(range), signer: user?.hoTen,
    summary: [
      { label: 'Tồn kho hiện tại', value: Number(d.tongTonKho), type: 'ml' }, { label: 'Số đơn vị còn trong kho', value: d.soLoConKho },
      { label: 'Nhập trong kỳ', value: Number(d.tongNhapTrongKy), type: 'ml', color: 'FF16A34A' }, { label: 'Xuất trong kỳ', value: Number(d.tongXuatTrongKy), type: 'ml', color: 'FF2563EB' },
      { label: 'Đơn vị đã hết hạn', value: d.soLoHetHan, color: 'FFDC2626' }, { label: 'Đơn vị đã hủy bỏ', value: d.soLoHuyBo, color: 'FF64748B' }
    ],
    sections: [
      {
        title: 'TỒN KHO THEO NHÓM MÁU VÀ CHẾ PHẨM', rows: d.chiTiet, columns: [
          { title: 'Nhóm máu', value: (r) => bloodLabel(r.nhomMau, r.heRh), align: 'center' }, { title: 'Chế phẩm', value: (r) => thanhPhanLabel(r.thanhPhanMau) },
          { title: 'Số đơn vị', value: 'soLo', type: 'number', total: 'sum' }, { title: 'Tổng thể tích', value: 'tongSoLuong', type: 'ml', total: 'sum' },
          { title: 'Ghi chú', value: (r) => [r.canhBaoThieu && 'Nhóm dưới ngưỡng an toàn', r.coLoSapHetHan && 'Có đơn vị sắp hết hạn'].filter(Boolean).join('; ') }
        ]
      },
      { title: 'TỒN KHO THEO CHẾ PHẨM', rows: d.theoThanhPhan, columns: labelValue('Chế phẩm', 'Tổng thể tích', 'ml') }
    ]
  });
  return (
    <>
      <RangeBar value={range} onChange={setRange} extra={<Button icon={<DownloadOutlined />} onClick={doExport}>Xuất Excel</Button>} />
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Tồn kho hiện tại" value={fmtMl(d.tongTonKho)} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Đơn vị còn kho" value={d.soLoConKho} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Nhập trong kỳ" value={fmtMl(d.tongNhapTrongKy)} valueStyle={{ color: '#16a34a' }} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Xuất trong kỳ" value={fmtMl(d.tongXuatTrongKy)} valueStyle={{ color: '#2563eb' }} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Đơn vị hết hạn" value={d.soLoHetHan} valueStyle={{ color: '#dc2626' }} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Đơn vị hủy bỏ" value={d.soLoHuyBo} /></Card></Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={9}><PieBox title="Tồn kho theo thành phần" data={d.theoThanhPhan} unit=" ml" /></Col>
        <Col xs={24} md={15}>
          <Card size="small" title="Chi tiết tồn kho" variant="borderless">
            <Table size="small" rowKey={(r) => r.nhomMau + r.heRh + r.thanhPhanMau} dataSource={d.chiTiet} pagination={{ pageSize: 8 }}
              columns={[
                { title: 'Nhóm máu', render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                { title: 'Thành phần', dataIndex: 'thanhPhanMau', render: thanhPhanLabel },
                { title: 'Số đơn vị', dataIndex: 'soLo', align: 'center' },
                { title: 'Tổng', dataIndex: 'tongSoLuong', align: 'right', render: fmtMl },
                { title: 'Ghi chú', render: (_, r) => <Space>{r.canhBaoThieu && <Typography.Text type="danger">Nhóm dưới ngưỡng</Typography.Text>}{r.coLoSapHetHan && <Typography.Text type="warning">Có đơn vị sắp hết hạn</Typography.Text>}</Space> }
              ]} />
          </Card>
        </Col>
      </Row>
    </>
  );
}

function IssueReport() {
  const { user } = useAuth();
  const [range, setRange] = useState([dayjs().subtract(6, 'month'), dayjs()]);
  const [d, setD] = useState(null);
  useEffect(() => { reportApi.issues(rangeParams(range)).then(setD); }, [range]);
  if (!d) return <Loading />;
  const doExport = () => exportExcel({
    fileName: 'bao-cao-xuat-kho', title: 'Báo cáo cấp phát máu cho cơ sở y tế', sheetName: 'Xuất kho', subtitle: rangeText(range), signer: user?.hoTen,
    summary: [
      { label: 'Số phiếu xuất', value: d.soPhieu }, { label: 'Tổng lượng máu xuất', value: Number(d.tongXuat), type: 'ml' },
      { label: 'Số cơ sở y tế nhận', value: d.theoCoSo.length }
    ],
    sections: [
      { title: 'THEO CƠ SỞ Y TẾ', rows: d.theoCoSo, columns: labelValue('Cơ sở y tế', 'Lượng máu đã nhận', 'ml') },
      { title: 'THEO NHÓM MÁU', rows: d.theoNhomMau, columns: labelValue('Nhóm máu', 'Lượng máu', 'ml') },
      { title: 'THEO CHẾ PHẨM', rows: d.theoThanhPhan, columns: labelValue('Chế phẩm', 'Lượng máu', 'ml') }
    ]
  });
  return (
    <>
      <RangeBar value={range} onChange={setRange} extra={<Button icon={<DownloadOutlined />} onClick={doExport}>Xuất Excel</Button>} />
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={8}><Card size="small"><Statistic title="Số phiếu xuất" value={d.soPhieu} /></Card></Col>
        <Col xs={12} md={8}><Card size="small"><Statistic title="Tổng lượng xuất" value={fmtMl(d.tongXuat)} /></Card></Col>
        <Col xs={24} md={8}><Card size="small"><Statistic title="Số cơ sở y tế nhận" value={d.theoCoSo.length} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Lượng máu xuất theo cơ sở y tế" variant="borderless">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={d.theoCoSo.map((x) => ({ name: x.label.replace('Bệnh viện ', 'BV '), v: Number(x.value) }))} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef0f4" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={150} /><Tooltip formatter={(v) => fmtMl(v)} />
                <Bar dataKey="v" name="Đã nhận" fill="#c8102e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}><PieBox title="Theo nhóm máu" data={d.theoNhomMau} unit=" ml" /></Col>
        <Col xs={24} md={12} lg={6}><PieBox title="Theo thành phần" data={d.theoThanhPhan} unit=" ml" /></Col>
      </Row>
    </>
  );
}

export default function Reports() {
  return (
    <>
      <PageHeader title="Báo cáo thống kê" subtitle={`Số liệu người hiến máu, đợt hiến máu, tiếp nhận, tồn kho và xuất kho — lập ngày ${dayjs().format('DD/MM/YYYY')}`} />
      <Card variant="borderless">
        <Tabs destroyOnHidden items={[
          { key: 'monthly', label: 'Tổng hợp theo tháng', children: <MonthlyReport /> },
          { key: 'donors', label: 'Người hiến máu', children: <DonorReport /> },
          { key: 'campaigns', label: 'Đợt hiến máu', children: <CampaignReport /> },
          { key: 'inventory', label: 'Tồn kho', children: <InventoryReport /> },
          { key: 'issues', label: 'Xuất kho', children: <IssueReport /> }
        ]} />
      </Card>
    </>
  );
}
