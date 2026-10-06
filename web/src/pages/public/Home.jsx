import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Card, Col, Row, Space, Statistic, Tag, Progress, Typography, Skeleton } from 'antd';
import {
  CalendarOutlined, EnvironmentOutlined, FormOutlined, MedicineBoxOutlined, HeartFilled, SafetyCertificateOutlined,
  CheckCircleFilled, TeamOutlined, ExperimentOutlined, MobileOutlined, ArrowRightOutlined, ClockCircleOutlined, BellOutlined
} from '@ant-design/icons';
import { campaignApi, catalogApi, reportApi } from '../../api';
import { BloodBadge } from '../../components/common';
import { fmtDate, fmtTime, fmtNumber } from '../../utils/format';
import dayjs from 'dayjs';

export function CampaignCard({ c }) {
  const navigate = useNavigate();
  const d = dayjs(c.ngayBatDau);
  const full = c.soLuongDuKien ? Math.min(100, Math.round((c.soLuongDaDangKy / c.soLuongDuKien) * 100)) : 0;
  return (
    <Card className="campaign-card" hoverable onClick={() => navigate(`/campaigns/${c.id}`)}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="date-box"><b>{d.format('DD')}</b><span>Th {d.format('MM')}</span></div>
        <div style={{ minWidth: 0 }}>
          <Tag color={c.trangThai === 'DangDienRa' ? 'green' : 'blue'} bordered={false} style={{ marginBottom: 6 }}>
            {c.trangThai === 'DangDienRa' ? 'Đang diễn ra' : 'Sắp diễn ra'}
          </Tag>
          <Typography.Title level={5} style={{ margin: 0 }} ellipsis={{ rows: 2 }}>{c.tenDot}</Typography.Title>
        </div>
      </div>
      <Space direction="vertical" size={6} style={{ marginTop: 14, color: '#475569', width: '100%' }}>
        <span><ClockCircleOutlined /> {fmtTime(c.ngayBatDau)} – {fmtTime(c.ngayKetThuc)}, {d.format('dddd')}</span>
        <span><EnvironmentOutlined /> <b>{c.tenDiem}</b></span>
        <Typography.Text type="secondary" ellipsis style={{ fontSize: 13 }}>{c.diaChi}</Typography.Text>
      </Space>
      {c.soLuongDuKien && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
            <span>Đã đăng ký {c.soLuongDaDangKy}/{c.soLuongDuKien}</span><span>{full}%</span>
          </div>
          <Progress percent={full} showInfo={false} strokeColor="#c8102e" size="small" />
        </div>
      )}
    </Card>
  );
}

export function BloodNeedTile({ g }) {
  const pct = g.nguongCanhBao ? Math.min(100, Math.round((g.tonKho / g.nguongCanhBao) * 100)) : 100;
  return (
    <div className={`blood-tile ${g.canhBaoThieu ? 'low' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BloodBadge nhomMau={g.nhomMau} heRh={g.heRh} size="lg" />
        <Tag color={g.canhBaoThieu ? 'red' : 'green'} bordered={false} style={{ fontWeight: 600 }}>
          {g.canhBaoThieu ? 'Đang thiếu' : 'Ổn định'}
        </Tag>
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: '#64748b' }}>Mức dự trữ</div>
      <Progress percent={pct} showInfo={false} strokeColor={g.canhBaoThieu ? '#dc2626' : '#16a34a'} />
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [groups, setGroups] = useState(null);
  const [campaigns, setCampaigns] = useState(null);

  useEffect(() => {
    reportApi.publicStats().then(setStats).catch(() => setStats({}));
    catalogApi.getBloodGroups().then(setGroups).catch(() => setGroups([]));
    campaignApi.getAll({ trangThai: 'DangDienRa,SapDienRa' })
      .then((list) => setCampaigns([...list].sort((a, b) => dayjs(a.ngayBatDau) - dayjs(b.ngayBatDau))))
      .catch(() => setCampaigns([]));
  }, []);

  const next = campaigns?.[0];
  const shortage = groups?.filter((g) => g.canhBaoThieu) || [];

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="inner">
          <div>
            <span className="pill"><HeartFilled /> Mỗi giọt máu cho đi — một cuộc đời ở lại</span>
            <h1>Hiến máu cứu người,<br />lan tỏa yêu thương</h1>
            <p className="lead">
              Đăng ký hiến máu trực tuyến chỉ trong 1 phút, theo dõi lịch sử hiến máu và nhận thông báo khi
              bệnh viện cần nhóm máu của bạn.
            </p>
            <Space size={12} wrap style={{ marginTop: 20 }}>
              <Button size="large" style={{ height: 50, paddingInline: 28, fontWeight: 700 }} onClick={() => navigate('/campaigns')}>
                Xem lịch hiến máu
              </Button>
              <Button size="large" ghost style={{ height: 50, paddingInline: 28, fontWeight: 700 }} onClick={() => navigate('/register')}>
                Tạo tài khoản người hiến
              </Button>
            </Space>
            {shortage.length > 0 && (
              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ opacity: 0.85 }}>Đang cần gấp:</span>
                {shortage.map((g) => <BloodBadge key={g.nhomMau + g.heRh} nhomMau={g.nhomMau} heRh={g.heRh} />)}
              </div>
            )}
          </div>
          <div className="hero-card">
            <Space style={{ marginBottom: 12 }}><CalendarOutlined style={{ color: '#c8102e' }} /><b>Đợt hiến máu gần nhất</b></Space>
            {!campaigns ? <Skeleton active /> : next ? (
              <>
                <Typography.Title level={4} style={{ marginTop: 0 }}>{next.tenDot}</Typography.Title>
                <Space direction="vertical" size={8} style={{ color: '#475569' }}>
                  <span><CalendarOutlined /> {dayjs(next.ngayBatDau).format('dddd, DD/MM/YYYY')}</span>
                  <span><ClockCircleOutlined /> {fmtTime(next.ngayBatDau)} – {fmtTime(next.ngayKetThuc)}</span>
                  <span><EnvironmentOutlined /> {next.tenDiem}</span>
                </Space>
                <Button type="primary" block size="large" style={{ marginTop: 20, height: 48 }} onClick={() => navigate(`/campaigns/${next.id}`)}>
                  Đăng ký tham gia <ArrowRightOutlined />
                </Button>
              </>
            ) : <Typography.Text type="secondary">Hiện chưa có đợt hiến máu sắp tới.</Typography.Text>}
          </div>
        </div>
        <svg className="hero-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" height="80">
          <path d="M0,40 C240,90 480,0 720,30 C960,60 1200,10 1440,40 L1440,80 L0,80 Z" fill="#ffffff" />
        </svg>
      </section>

      {/* ===== SỐ LIỆU ===== */}
      <div className="container stats-strip">
        <Card variant="borderless">
          <Row gutter={[24, 24]}>
            {[
              { t: 'Người hiến máu', v: stats?.tongNguoiHien, icon: <TeamOutlined /> },
              { t: 'Lượt hiến máu', v: stats?.tongLuotHien, icon: <HeartFilled /> },
              { t: 'Lít máu đã tiếp nhận', v: stats ? (stats.tongTheTich / 1000).toFixed(1) : null, icon: <ExperimentOutlined /> },
              { t: 'Điểm hiến máu', v: stats?.soDiemHienMau, icon: <EnvironmentOutlined /> }
            ].map((s) => (
              <Col xs={12} md={6} key={s.t}>
                <Statistic title={s.t} value={s.v ?? '—'} prefix={<span style={{ color: '#c8102e' }}>{s.icon}</span>}
                  formatter={(v) => (typeof v === 'number' ? fmtNumber(v) : v)} valueStyle={{ fontWeight: 800 }} />
              </Col>
            ))}
          </Row>
        </Card>
      </div>

      {/* ===== NHÓM MÁU ===== */}
      <section className="section" id="nhom-mau">
        <div className="container">
          <div className="section-title">
            <div className="eyebrow">Tình trạng kho máu</div>
            <h2>Nhóm máu đang cần</h2>
            <p>Mức dự trữ được cập nhật theo thời gian thực từ kho máu. Nếu nhóm máu của bạn đang thiếu, hãy đăng ký hiến máu sớm nhất có thể.</p>
          </div>
          <Row gutter={[16, 16]}>
            {(groups || Array.from({ length: 8 })).map((g, i) => (
              <Col xs={12} sm={8} md={6} key={i}>{g ? <BloodNeedTile g={g} /> : <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>}</Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ===== LỊCH HIẾN MÁU ===== */}
      <section className="section" style={{ background: '#f8fafc' }}>
        <div className="container">
          <div className="section-title">
            <div className="eyebrow">Lịch tổ chức</div>
            <h2>Đợt hiến máu sắp tới</h2>
            <p>Chọn thời gian và địa điểm thuận tiện, đăng ký trước để được ưu tiên khám sàng lọc.</p>
          </div>
          <Row gutter={[20, 20]}>
            {!campaigns ? <Col span={24}><Skeleton active /></Col> : campaigns.slice(0, 3).map((c) => (
              <Col xs={24} md={8} key={c.id}><CampaignCard c={c} /></Col>
            ))}
          </Row>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link to="/campaigns"><Button size="large">Xem tất cả lịch hiến máu <ArrowRightOutlined /></Button></Link>
          </div>
        </div>
      </section>

      {/* ===== QUY TRÌNH ===== */}
      <section className="section" id="quy-trinh">
        <div className="container">
          <div className="section-title">
            <div className="eyebrow">Đơn giản & an toàn</div>
            <h2>Quy trình hiến máu</h2>
            <p>Toàn bộ quy trình được số hóa: từ đăng ký, khám sàng lọc đến khi đơn vị máu được nhập kho và cấp phát cho bệnh viện.</p>
          </div>
          <Row gutter={[20, 20]}>
            {[
              { icon: <FormOutlined />, t: '1. Đăng ký trực tuyến', d: 'Chọn đợt hiến máu trên website hoặc ứng dụng di động. Ban tổ chức xác nhận lịch hẹn.' },
              { icon: <MedicineBoxOutlined />, t: '2. Khám sàng lọc', d: 'Bác sĩ đo cân nặng, huyết áp, mạch, nhiệt độ và xét nghiệm Hemoglobin miễn phí.' },
              { icon: <HeartFilled />, t: '3. Hiến máu', d: 'Lấy 250 – 450 ml máu trong khoảng 10 phút, đảm bảo vô trùng tuyệt đối.' },
              { icon: <SafetyCertificateOutlined />, t: '4. Nhận chứng nhận', d: 'Theo dõi lịch sử, nhận nhắc lịch khi đủ 12 tuần để tiếp tục hành trình hiến máu.' }
            ].map((s) => (
              <Col xs={24} sm={12} md={6} key={s.t}>
                <div className="step-card">
                  <div className="step-icon">{s.icon}</div>
                  <Typography.Title level={5}>{s.t}</Typography.Title>
                  <Typography.Text type="secondary">{s.d}</Typography.Text>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ===== ĐIỀU KIỆN ===== */}
      <section className="section" id="dieu-kien" style={{ background: '#f8fafc' }}>
        <div className="container">
          <Row gutter={[40, 32]} align="middle">
            <Col xs={24} md={12}>
              <div className="section-title" style={{ textAlign: 'left', marginBottom: 20 }}>
                <div className="eyebrow">Tiêu chuẩn</div>
                <h2>Ai có thể hiến máu?</h2>
              </div>
              <Space direction="vertical" size={14}>
                {[
                  'Từ đủ 18 đến 60 tuổi, mang theo CCCD/CMND',
                  'Cân nặng: nam ≥ 45 kg, nữ ≥ 42 kg',
                  'Không mắc bệnh truyền nhiễm qua đường máu (HIV, viêm gan B, C…)',
                  'Hemoglobin ≥ 12 g/dL, huyết áp và mạch trong giới hạn bình thường',
                  'Khoảng cách tối thiểu giữa 2 lần hiến máu toàn phần là 12 tuần',
                  'Không uống rượu bia, ăn nhẹ và ngủ đủ giấc trước khi hiến'
                ].map((t) => (
                  <Space key={t} align="start"><CheckCircleFilled style={{ color: '#16a34a', marginTop: 4 }} /><span>{t}</span></Space>
                ))}
              </Space>
            </Col>
            <Col xs={24} md={12}>
              <Card style={{ borderRadius: 20, background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff' }} variant="borderless">
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Space><MobileOutlined style={{ fontSize: 28, color: '#fb7185' }} /><Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>Ứng dụng di động Giọt Hồng</Typography.Title></Space>
                  <span style={{ color: '#cbd5e1' }}>Đăng ký hiến máu, xem lịch và địa điểm, tra cứu lịch sử và nhận thông báo nhắc lịch, kêu gọi hiến máu ngay trên điện thoại.</span>
                  <Space wrap>
                    <Tag icon={<BellOutlined />} color="red">Nhắc lịch hiến máu</Tag>
                    <Tag icon={<HeartFilled />} color="magenta">Kêu gọi theo nhóm máu</Tag>
                    <Tag icon={<CalendarOutlined />} color="blue">Lịch & địa điểm</Tag>
                  </Space>
                  <Button type="primary" size="large" onClick={() => navigate('/register')}>Bắt đầu ngay — miễn phí</Button>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      </section>
    </>
  );
}
