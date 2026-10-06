import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Col, Row, Space, Typography, List, Tag, Progress } from 'antd';
import { HeartFilled, CalendarOutlined, ExperimentOutlined, TrophyOutlined, ArrowRightOutlined, EnvironmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DonorShell from './DonorShell';
import { donorApi, registrationApi, campaignApi } from '../../api';
import { BloodBadge, Loading, StatCard, RegistrationStatusTag } from '../../components/common';
import { fmtDate, fmtMl, fmtDateTime } from '../../utils/format';

// Danh hiệu theo số lần hiến máu (tham khảo cách vinh danh của Hội Chữ thập đỏ)
function honorOf(n) {
  if (n >= 10) return { label: 'Đại sứ Giọt Hồng', color: '#9f1239', next: null };
  if (n >= 5) return { label: 'Người hiến máu tiêu biểu', color: '#c8102e', next: 10 };
  if (n >= 3) return { label: 'Người hiến máu tích cực', color: '#e11d48', next: 5 };
  if (n >= 1) return { label: 'Người hiến máu tình nguyện', color: '#f43f5e', next: 3 };
  return { label: 'Thành viên mới', color: '#64748b', next: 1 };
}

export default function DonorOverview() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [regs, setRegs] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    donorApi.getMe().then(setMe);
    registrationApi.getMine().then(setRegs).catch(() => {});
    campaignApi.getAll({ trangThai: 'SapDienRa,DangDienRa' })
      .then((l) => setUpcoming([...l].sort((a, b) => dayjs(a.ngayBatDau) - dayjs(b.ngayBatDau)).slice(0, 3))).catch(() => {});
  }, []);

  if (!me) return <DonorShell><Loading /></DonorShell>;

  const honor = honorOf(me.soLanHien);
  const nextDate = me.ngayCoTheHienTiepTheo ? dayjs(me.ngayCoTheHienTiepTheo) : null;
  const eligible = !nextDate || !nextDate.isAfter(dayjs(), 'day');
  const daysLeft = nextDate ? Math.max(0, nextDate.diff(dayjs().startOf('day'), 'day')) : 0;
  const active = regs.find((r) => ['ChoDuyet', 'DaDuyet', 'DaSangLoc'].includes(r.trangThai) && dayjs(r.ngayKetThuc).isAfter(dayjs().startOf('day')));

  return (
    <DonorShell>
      <div className="donor-card">
        <Row gutter={[24, 24]} align="middle" style={{ position: 'relative', zIndex: 1 }}>
          <Col xs={24} md={15}>
            <Typography.Text style={{ color: '#fda4af', letterSpacing: 1, fontSize: 12, fontWeight: 700 }}>THẺ NGƯỜI HIẾN MÁU</Typography.Text>
            <Typography.Title level={2} style={{ color: '#fff', margin: '6px 0' }}>{me.hoTen}</Typography.Title>
            <Space wrap size={[16, 8]} style={{ color: '#cbd5e1' }}>
              <span>CCCD: {me.cccd}</span>
              <span>Tham gia: {fmtDate(me.ngayDangKy)}</span>
            </Space>
            <div style={{ marginTop: 16 }}>
              <Tag color={honor.color} style={{ fontWeight: 700, padding: '4px 12px', fontSize: 13 }}><TrophyOutlined /> {honor.label}</Tag>
            </div>
            {honor.next && (
              <div style={{ marginTop: 12, maxWidth: 360 }}>
                <Typography.Text style={{ color: '#cbd5e1', fontSize: 12 }}>Còn {honor.next - me.soLanHien} lần hiến nữa để đạt danh hiệu tiếp theo</Typography.Text>
                <Progress percent={Math.round((me.soLanHien / honor.next) * 100)} showInfo={false} strokeColor="#fb7185" trailColor="rgba(255,255,255,0.15)" />
              </div>
            )}
          </Col>
          <Col xs={24} md={9} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>Nhóm máu</div>
            <BloodBadge nhomMau={me.nhomMau} heRh={me.heRh} size="lg" />
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={8}><StatCard icon={<HeartFilled />} label="Số lần đã hiến" value={me.soLanHien} /></Col>
        <Col xs={24} sm={8}><StatCard icon={<ExperimentOutlined />} label="Tổng lượng máu đã hiến" value={fmtMl(me.tongTheTich)} color="#7c3aed" /></Col>
        <Col xs={24} sm={8}><StatCard icon={<CalendarOutlined />} label="Lần hiến gần nhất" value={me.lanHienGanNhat ? fmtDate(me.lanHienGanNhat) : '—'} color="#2563eb" /></Col>
      </Row>

      <Card style={{ marginTop: 16, borderRadius: 16 }}>
        {active ? (
          <Alert type="info" showIcon message={<b>Bạn có lịch hẹn hiến máu: {active.tenDot}</b>}
            description={<Space direction="vertical" size={4}>
              <span><CalendarOutlined /> {fmtDateTime(active.ngayBatDau)} — <EnvironmentOutlined /> {active.tenDiem}</span>
              <span>Trạng thái: <RegistrationStatusTag value={active.trangThai} /></span>
            </Space>}
            action={<Button onClick={() => navigate('/me/registrations')}>Chi tiết</Button>} />
        ) : eligible ? (
          <Alert type="success" showIcon message={<b>Bạn đã đủ điều kiện hiến máu!</b>}
            description="Đã đủ 12 tuần kể từ lần hiến gần nhất (hoặc bạn chưa từng hiến). Hãy chọn một đợt hiến máu bên dưới."
            action={<Button type="primary" onClick={() => navigate('/campaigns')}>Đăng ký ngay</Button>} />
        ) : (
          <Alert type="warning" showIcon message={<b>Bạn có thể hiến máu lại từ ngày {nextDate.format('DD/MM/YYYY')}</b>}
            description={`Còn ${daysLeft} ngày nữa. Cơ thể cần 12 tuần để phục hồi hoàn toàn lượng máu đã hiến.`} />
        )}
      </Card>

      <Card title="Đợt hiến máu sắp tới" style={{ marginTop: 16, borderRadius: 16 }} extra={<Button type="link" onClick={() => navigate('/campaigns')}>Xem tất cả <ArrowRightOutlined /></Button>}>
        <List
          dataSource={upcoming}
          locale={{ emptyText: 'Chưa có đợt hiến máu sắp tới' }}
          renderItem={(c) => (
            <List.Item actions={[<Button key="x" type="link" onClick={() => navigate(`/campaigns/${c.id}`)}>Xem & đăng ký</Button>]}>
              <List.Item.Meta
                avatar={<div className="campaign-card"><div className="date-box"><b>{dayjs(c.ngayBatDau).format('DD')}</b><span>Th {dayjs(c.ngayBatDau).format('MM')}</span></div></div>}
                title={c.tenDot}
                description={<span><EnvironmentOutlined /> {c.tenDiem} · {dayjs(c.ngayBatDau).format('HH:mm')}</span>}
              />
            </List.Item>
          )}
        />
      </Card>
    </DonorShell>
  );
}
