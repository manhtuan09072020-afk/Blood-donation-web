import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { App, Alert, Button, Card, Col, Input, Modal, Progress, Result, Row, Space, Typography, Breadcrumb, List } from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, PhoneOutlined, TeamOutlined, CheckCircleFilled, InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { campaignApi, registrationApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { CampaignStatusTag, Loading, InfoRow } from '../../components/common';
import { fmtTime } from '../../utils/format';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isDonor } = useAuth();
  const { message, modal } = App.useApp();
  const [c, setC] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myReg, setMyReg] = useState(null);

  const load = () => campaignApi.getById(id).then(setC).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    if (isDonor) registrationApi.getMine().then((list) => setMyReg(list.find((r) => r.dotId === Number(id) && !['Huy', 'TuChoi'].includes(r.trangThai)) || null)).catch(() => {});
  }, [id, isDonor]);

  if (error) return <Result status="404" title="Không tìm thấy đợt hiến máu" extra={<Link to="/campaigns"><Button>Quay lại</Button></Link>} />;
  if (!c) return <Loading />;

  const canRegister = ['SapDienRa', 'DangDienRa'].includes(c.trangThai);
  const pct = c.soLuongDuKien ? Math.min(100, Math.round((c.soLuongDaDangKy / c.soLuongDuKien) * 100)) : null;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.diaChi)}`;

  const handleRegister = () => {
    if (!user) { navigate('/login', { state: { from: `/campaigns/${id}` } }); return; }
    if (!isDonor) { message.warning('Chỉ tài khoản người hiến máu mới đăng ký được.'); return; }
    setOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const reg = await registrationApi.create({ dotId: Number(id), ghiChu: note || null });
      setMyReg(reg);
      setOpen(false);
      modal.success({
        title: 'Đăng ký thành công!',
        content: 'Đăng ký của bạn đang chờ ban tổ chức duyệt. Bạn sẽ nhận được thông báo khi có kết quả.',
        okText: 'Xem lịch hẹn của tôi',
        onOk: () => navigate('/me/registrations')
      });
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '28px 20px 60px' }}>
      <Breadcrumb items={[{ title: <Link to="/">Trang chủ</Link> }, { title: <Link to="/campaigns">Lịch hiến máu</Link> }, { title: c.tenDot }]} />
      <Row gutter={[24, 24]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={15}>
          <Card style={{ borderRadius: 18 }} variant="borderless">
            <CampaignStatusTag value={c.trangThai} />
            <Typography.Title level={2} style={{ marginTop: 10 }}>{c.tenDot}</Typography.Title>
            <Space direction="vertical" size={10} style={{ fontSize: 15, color: '#334155' }}>
              <span><CalendarOutlined style={{ color: '#c8102e' }} /> {dayjs(c.ngayBatDau).format('dddd, DD/MM/YYYY')}
                {!dayjs(c.ngayKetThuc).isSame(c.ngayBatDau, 'day') && ` – ${dayjs(c.ngayKetThuc).format('DD/MM/YYYY')}`}</span>
              <span><ClockCircleOutlined style={{ color: '#c8102e' }} /> {fmtTime(c.ngayBatDau)} – {fmtTime(c.ngayKetThuc)}</span>
              <span><EnvironmentOutlined style={{ color: '#c8102e' }} /> <b>{c.tenDiem}</b> — {c.diaChi} <a href={mapUrl} target="_blank" rel="noreferrer">(Xem bản đồ)</a></span>
              {c.soDienThoaiDiem && <span><PhoneOutlined style={{ color: '#c8102e' }} /> {c.soDienThoaiDiem}</span>}
            </Space>
            {c.moTa && <Typography.Paragraph style={{ marginTop: 20, fontSize: 15 }}>{c.moTa}</Typography.Paragraph>}

            <Typography.Title level={5} style={{ marginTop: 24 }}>Chuẩn bị trước khi hiến máu</Typography.Title>
            <List
              size="small"
              dataSource={[
                'Ngủ đủ giấc (ít nhất 6 tiếng) vào đêm trước ngày hiến máu',
                'Ăn nhẹ, không ăn đồ nhiều dầu mỡ; không uống rượu bia',
                'Uống đủ nước (khoảng 300 – 500 ml) trước khi hiến',
                'Mang theo CCCD/CMND để làm thủ tục'
              ]}
              renderItem={(t) => <List.Item><Space><CheckCircleFilled style={{ color: '#16a34a' }} />{t}</Space></List.Item>}
            />
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card style={{ borderRadius: 18, position: 'sticky', top: 90 }} variant="borderless">
            <Typography.Title level={4} style={{ marginTop: 0 }}>Đăng ký tham gia</Typography.Title>
            <InfoRow label="Điểm hiến máu">{c.tenDiem}</InfoRow>
            <InfoRow label="Ngày">{dayjs(c.ngayBatDau).format('DD/MM/YYYY')}</InfoRow>
            <InfoRow label={<><TeamOutlined /> Đã đăng ký</>}>{c.soLuongDaDangKy}{c.soLuongDuKien ? ` / ${c.soLuongDuKien}` : ''} người</InfoRow>
            {pct != null && <Progress percent={pct} strokeColor="#c8102e" style={{ marginTop: 12 }} />}

            {myReg ? (
              <Alert style={{ marginTop: 16 }} type="success" showIcon message="Bạn đã đăng ký đợt này"
                description={<Link to="/me/registrations">Xem trạng thái lịch hẹn</Link>} />
            ) : canRegister ? (
              <Button type="primary" size="large" block style={{ marginTop: 20, height: 50 }} onClick={handleRegister}>
                {user ? 'Đăng ký hiến máu' : 'Đăng nhập để đăng ký'}
              </Button>
            ) : (
              <Alert style={{ marginTop: 16 }} type="info" showIcon message="Đợt hiến máu đã kết thúc hoặc đã hủy." />
            )}
            <Typography.Paragraph type="secondary" style={{ marginTop: 14, fontSize: 13 }}>
              <InfoCircleOutlined /> Hệ thống tự kiểm tra độ tuổi và khoảng cách 12 tuần giữa 2 lần hiến máu khi bạn đăng ký.
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      <Modal open={open} title="Xác nhận đăng ký hiến máu" onCancel={() => setOpen(false)} onOk={submit} okText="Xác nhận đăng ký" cancelText="Hủy" confirmLoading={submitting}>
        <p>Bạn đăng ký tham gia <b>{c.tenDot}</b> ngày <b>{dayjs(c.ngayBatDau).format('DD/MM/YYYY')}</b> tại <b>{c.tenDiem}</b>.</p>
        <Input.TextArea rows={3} placeholder="Ghi chú cho ban tổ chức (không bắt buộc), ví dụ: dự kiến đến lúc 9h" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} showCount />
      </Modal>
    </div>
  );
}
