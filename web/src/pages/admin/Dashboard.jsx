import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Space, Typography, List, Tag, Button, Segmented, Empty } from 'antd';
import {
  TeamOutlined, CalendarOutlined, HeartOutlined, DatabaseOutlined, ClockCircleOutlined, WarningOutlined,
  FormOutlined, MedicineBoxOutlined, ExperimentOutlined, ArrowRightOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, ComposedChart, Line, ReferenceLine
} from 'recharts';
import dayjs from 'dayjs';
import { reportApi, campaignApi, inventoryApi } from '../../api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { StatCard, PageHeader, Loading, BloodBadge, CampaignStatusTag } from '../../components/common';
import { fmtNumber, fmtMl, fmtLiters, fmtDate, thanhPhanLabel } from '../../utils/format';

const R = ROLES;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState(null);
  const [bloodStats, setBloodStats] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [year, setYear] = useState(dayjs().year());

  const canReport = hasRole(R.QUAN_TRI, R.NHAN_VIEN_KHO, R.NHAN_VIEN_TIEP_NHAN);

  useEffect(() => {
    reportApi.dashboard().then(setStats);
    reportApi.bloodTypeStats().then(setBloodStats);
    campaignApi.getAll({ trangThai: 'DangDienRa,SapDienRa' }).then((l) => setCampaigns([...l].sort((a, b) => dayjs(a.ngayBatDau) - dayjs(b.ngayBatDau))));
    if (canReport) inventoryApi.getAlerts().then(setAlerts).catch(() => {});
  }, [canReport]);

  useEffect(() => {
    if (canReport) reportApi.monthly(year).then(setMonthly);
  }, [year, canReport]);

  if (!stats) return <Loading />;

  const chartBlood = bloodStats.map((b) => ({ name: `${b.nhomMau}${b.heRh === 'Rh+' ? '+' : '−'}`, tonKho: Number(b.tongSoLuong), nguong: Number(b.nguongCanhBao), low: b.tongSoLuong < b.nguongCanhBao }));
  const chartMonthly = monthly.map((m) => ({ name: `T${m.thang}`, nhap: Number(m.tongTheTich), xuat: Number(m.tongXuat), luot: m.soLuotHienMau }));

  const pipeline = [
    { label: 'Đăng ký chờ duyệt', value: stats.soDangKyChoDuyet, icon: <FormOutlined />, color: '#f59e0b', to: '/admin/registrations?trangThai=ChoDuyet', roles: [R.QUAN_TRI, R.NHAN_VIEN_TIEP_NHAN] },
    { label: 'Chờ khám sàng lọc', value: stats.soChoSangLoc, icon: <MedicineBoxOutlined />, color: '#2563eb', to: '/admin/screening', roles: [R.QUAN_TRI, R.NHAN_VIEN_SANG_LOC] },
    { label: 'Chờ lấy máu / nhập kho', value: stats.soChoTiepNhan, icon: <ExperimentOutlined />, color: '#16a34a', to: '/admin/collection', roles: [R.QUAN_TRI, R.NHAN_VIEN_TIEP_NHAN] }
  ];

  return (
    <>
      <PageHeader
        title={`Xin chào, ${user?.hoTen || user?.username} 👋`}
        subtitle={`Tổng quan hoạt động hiến máu — ${dayjs().format('dddd, DD/MM/YYYY')}`}
        extra={hasRole(R.QUAN_TRI) && <Button type="primary" icon={<CalendarOutlined />} onClick={() => navigate('/admin/campaigns')}>Tạo đợt hiến máu</Button>}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8} xxl={4}><StatCard icon={<TeamOutlined />} label="Người hiến máu" value={fmtNumber(stats.tongNguoiHien)} foot={`+${stats.nguoiHienMoiThangNay} người mới tháng này`} onClick={() => navigate('/admin/donors')} /></Col>
        <Col xs={24} sm={12} lg={8} xxl={4}><StatCard icon={<CalendarOutlined />} label="Đợt đang diễn ra" value={stats.tongDotHienMauDangDienRa} color="#2563eb" foot={`${stats.soDotSapDienRa} đợt sắp diễn ra`} /></Col>
        <Col xs={24} sm={12} lg={8} xxl={4}><StatCard icon={<HeartOutlined />} label="Lượt hiến tháng này" value={stats.soLuotHienThangNay} color="#e11d48" foot={`${fmtMl(stats.tongMauTiepNhanThangNay)} đã tiếp nhận`} /></Col>
        <Col xs={24} sm={12} lg={8} xxl={4}><StatCard icon={<DatabaseOutlined />} label="Tồn kho hiện tại" value={fmtLiters(stats.tongTonKho)} color="#7c3aed" foot={`${stats.soLoTonKho} đơn vị máu · xuất ${fmtMl(stats.tongXuatThangNay)}/tháng`} /></Col>
        <Col xs={24} sm={12} lg={8} xxl={4}><StatCard icon={<ClockCircleOutlined />} label="Lô sắp hết hạn (≤7 ngày)" value={stats.soLoSapHetHan} color="#f59e0b" foot="Ưu tiên xuất trước (FEFO)" onClick={canReport ? () => navigate('/admin/inventory?tab=alerts') : undefined} /></Col>
        <Col xs={24} sm={12} lg={8} xxl={4}><StatCard icon={<WarningOutlined />} label="Nhóm máu dưới ngưỡng" value={stats.soNhomMauThieu} color="#dc2626" foot="Cần vận động hiến máu" onClick={canReport ? () => navigate('/admin/outreach') : undefined} /></Col>
      </Row>

      <Card title="Công việc đang chờ xử lý" style={{ marginTop: 16 }} variant="borderless">
        <Row gutter={[16, 16]}>
          {pipeline.map((p, i) => (
            <Col xs={24} md={8} key={p.label}>
              <div className="pipeline-step" onClick={() => hasRole(...p.roles) && navigate(p.to)} style={{ opacity: hasRole(...p.roles) ? 1 : 0.6 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <span style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', background: `${p.color}18`, color: p.color, fontSize: 18 }}>{p.icon}</span>
                    <div><div style={{ color: '#64748b', fontSize: 13 }}>Bước {i + 1}</div><b>{p.label}</b></div>
                  </Space>
                  <span className="num">{p.value}</span>
                </Space>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {canReport && (
          <Col xs={24} xl={14}>
            <Card title="Máu tiếp nhận & xuất kho theo tháng (ml)" variant="borderless"
              extra={<Segmented size="small" value={year} onChange={setYear} options={[dayjs().year() - 1, dayjs().year()].map((y) => ({ label: `${y}`, value: y }))} />}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartMonthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="ml" tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}L`} />
                  <YAxis yAxisId="luot" orientation="right" tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v, n) => (n === 'Lượt hiến' ? v : fmtMl(v))} />
                  <Legend />
                  <Bar yAxisId="ml" dataKey="nhap" name="Tiếp nhận" fill="#c8102e" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="ml" dataKey="xuat" name="Xuất kho" fill="#fda4af" radius={[6, 6, 0, 0]} />
                  <Line yAxisId="luot" type="monotone" dataKey="luot" name="Lượt hiến" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        )}
        <Col xs={24} xl={canReport ? 10 : 24}>
          <Card title="Tồn kho theo nhóm máu (ml)" variant="borderless" extra={<Button type="link" onClick={() => navigate('/admin/blood-groups')}>Chi tiết</Button>}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartBlood}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(v, n) => [fmtMl(v), n]} />
                <Bar dataKey="tonKho" name="Tồn kho" radius={[6, 6, 0, 0]}>
                  {chartBlood.map((b) => <Cell key={b.name} fill={b.low ? '#f87171' : '#16a34a'} />)}
                </Bar>
                <Bar dataKey="nguong" name="Ngưỡng an toàn" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <Space size={16} style={{ fontSize: 12, color: '#64748b' }}>
              <span><Tag color="#16a34a" /> Đủ ngưỡng</span><span><Tag color="#f87171" /> Dưới ngưỡng</span><span><Tag color="#e2e8f0" /> Ngưỡng an toàn</span>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={14}>
          <Card title="Đợt hiến máu đang & sắp diễn ra" variant="borderless" extra={hasRole(R.QUAN_TRI) && <Button type="link" onClick={() => navigate('/admin/campaigns')}>Quản lý <ArrowRightOutlined /></Button>}>
            <List
              dataSource={campaigns.slice(0, 5)}
              locale={{ emptyText: 'Không có đợt hiến máu sắp tới' }}
              renderItem={(c) => (
                <List.Item actions={[<CampaignStatusTag key="s" value={c.trangThai} />]}>
                  <List.Item.Meta
                    avatar={<div className="campaign-card"><div className="date-box"><b>{dayjs(c.ngayBatDau).format('DD')}</b><span>Th {dayjs(c.ngayBatDau).format('MM')}</span></div></div>}
                    title={<a onClick={() => navigate(`/admin/registrations?dotId=${c.id}`)}>{c.tenDot}</a>}
                    description={<Space split="·" wrap><span><EnvironmentOutlined /> {c.tenDiem}</span><span>{c.soLuongDaDangKy}{c.soLuongDuKien ? `/${c.soLuongDuKien}` : ''} đăng ký</span><span>{c.soLuongDaHien} đã hiến</span></Space>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Cảnh báo kho máu" variant="borderless" extra={canReport && <Button type="link" onClick={() => navigate('/admin/inventory?tab=alerts')}>Xem kho</Button>}>
            {!canReport ? <Empty description="Chức năng dành cho nhân viên kho / quản trị" /> : !alerts ? <Loading /> : (
              <List
                size="small"
                dataSource={[
                  ...alerts.nhomMauThieu.map((g) => ({ k: 'g' + g.nhomMau + g.heRh, g })),
                  ...alerts.loSapHetHan.slice(0, 6).map((u) => ({ k: 'u' + u.id, u }))
                ]}
                locale={{ emptyText: 'Không có cảnh báo' }}
                renderItem={(it) => it.g ? (
                  <List.Item extra={<Button size="small" danger onClick={() => navigate(`/admin/outreach?nhomMau=${it.g.nhomMau}&heRh=${encodeURIComponent(it.g.heRh)}`)}>Kêu gọi</Button>}>
                    <Space><BloodBadge nhomMau={it.g.nhomMau} heRh={it.g.heRh} /><span>Tồn <b>{fmtMl(it.g.tonKho)}</b> / ngưỡng {fmtMl(it.g.nguongCanhBao)}</span></Space>
                  </List.Item>
                ) : (
                  <List.Item extra={<Tag color={it.u.soNgayConLai <= 2 ? 'red' : 'orange'}>còn {it.u.soNgayConLai} ngày</Tag>}>
                    <Space><ClockCircleOutlined style={{ color: '#f59e0b' }} /><span><b>{it.u.maLoMau}</b> · {thanhPhanLabel(it.u.thanhPhanMau)} · HSD {fmtDate(it.u.hanSuDung)}</span></Space>
                  </List.Item>
                )}
              />
            )}
            {canReport && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Hệ thống tự động gửi thông báo kêu gọi đến người hiến cùng nhóm máu khi tồn kho dưới ngưỡng.</Typography.Text>}
          </Card>
        </Col>
      </Row>
    </>
  );
}
