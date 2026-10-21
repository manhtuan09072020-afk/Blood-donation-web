import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, App, Button, Card, Col, Drawer, Empty, Form, Input, Progress, Row, Segmented, Select, Space, Spin, Statistic, Switch, Table, Tabs, Tag, Typography, Descriptions
} from 'antd';
import {
  SendOutlined, HeartFilled, CalendarOutlined, NotificationOutlined, ReloadOutlined, RobotOutlined, UserOutlined,
  EnvironmentOutlined, ClockCircleOutlined, TeamOutlined, CheckCircleOutlined, HistoryOutlined, SyncOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { notificationApi, campaignApi, donorApi, catalogApi } from '../../api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { BloodBadge, NotificationTypeTag, PageHeader, RegistrationStatusTag } from '../../components/common';
import { fmtDate, fmtDateTime, fmtMl, fromNow, LOAI_THONG_BAO } from '../../utils/format';

function CallForDonation({ onSent }) {
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const [form] = Form.useForm();
  const [donors, setDonors] = useState([]);
  const [groups, setGroups] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [sending, setSending] = useState(false);
  const v = Form.useWatch([], form) || {};

  useEffect(() => {
    donorApi.getAll({ trangThai: true }).then(setDonors);
    catalogApi.getBloodGroups().then(setGroups);
    campaignApi.getAll({ trangThai: 'SapDienRa,DangDienRa' }).then(setCampaigns);
  }, []);

  useEffect(() => {
    const nhomMau = params.get('nhomMau') || 'O';
    const heRh = params.get('heRh') || undefined;
    form.setFieldsValue({
      nhomMau, heRh, chiNguoiDuDieuKien: true,
      tieuDe: `Khẩn cấp: cần máu nhóm ${nhomMau}${heRh ? ' ' + heRh : ''}`,
      noiDung: `Kho máu đang thiếu nhóm ${nhomMau}${heRh ? ' ' + heRh : ''}. Bạn có cùng nhóm máu — sự giúp đỡ của bạn lúc này vô cùng quý giá. Hãy đăng ký hiến máu tại đợt gần nhất!`
    });
  }, [params, form]);

  const estimate = useMemo(() => donors.filter((d) => {
    if (v.nhomMau && v.nhomMau !== 'TatCa' && d.nhomMau !== v.nhomMau) return false;
    if (v.heRh && d.heRh !== v.heRh) return false;
    if (v.chiNguoiDuDieuKien && d.ngayCoTheHienTiepTheo && dayjs(d.ngayCoTheHienTiepTheo).isAfter(dayjs(), 'day')) return false;
    return true;
  }).length, [donors, v.nhomMau, v.heRh, v.chiNguoiDuDieuKien]);

  const send = async () => {
    const values = await form.validateFields();
    setSending(true);
    try {
      const res = await notificationApi.callForDonation(values);
      message.success(res.message);
      onSent();
    } catch (e) { message.error(e.message); }
    finally { setSending(false); }
  };

  const low = groups.filter((g) => g.canhBaoThieu);

  return (
    <Row gutter={24}>
      <Col xs={24} lg={15}>
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={8}><Form.Item name="nhomMau" label="Nhóm máu mục tiêu" rules={[{ required: true }]}>
              <Select options={[{ value: 'TatCa', label: 'Tất cả nhóm máu' }, ...['A', 'B', 'AB', 'O'].map((n) => ({ value: n, label: `Nhóm ${n}` }))]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="heRh" label="Hệ Rh"><Select allowClear placeholder="Cả Rh+ và Rh−" options={[{ value: 'Rh+', label: 'Rh+' }, { value: 'Rh-', label: 'Rh−' }]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="dotId" label="Mời tham gia đợt"><Select allowClear placeholder="(Không bắt buộc)" options={campaigns.map((c) => ({ value: c.id, label: `${dayjs(c.ngayBatDau).format('DD/MM')} · ${c.tenDot}` }))} /></Form.Item></Col>
          </Row>
          <Form.Item name="tieuDe" label="Tiêu đề" rules={[{ required: true }]}><Input maxLength={150} showCount /></Form.Item>
          <Form.Item name="noiDung" label="Nội dung" rules={[{ required: true }]}><Input.TextArea rows={4} maxLength={500} showCount /></Form.Item>
          <Form.Item name="chiNguoiDuDieuKien" label="Chỉ gửi người đã đủ 12 tuần kể từ lần hiến gần nhất" valuePropName="checked"><Switch /></Form.Item>
          <Space>
            <Button type="primary" size="large" icon={<SendOutlined />} loading={sending} onClick={send} disabled={!estimate}>Gửi đến {estimate} người hiến</Button>
          </Space>
        </Form>
      </Col>
      <Col xs={24} lg={9}>
        <Card size="small" title="Nhóm máu đang thiếu" style={{ background: '#fff7f8' }}>
          {low.length === 0 ? <Alert type="success" message="Kho máu đủ ngưỡng an toàn" /> : low.map((g) => (
            <div key={g.nhomMau + g.heRh} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #fecdd3' }}>
              <Space><BloodBadge nhomMau={g.nhomMau} heRh={g.heRh} /><span style={{ fontSize: 13 }}>{fmtMl(g.tonKho)} / {fmtMl(g.nguongCanhBao)}</span></Space>
              <Button size="small" onClick={() => form.setFieldsValue({
                nhomMau: g.nhomMau, heRh: g.heRh, tieuDe: `Khẩn cấp: cần máu nhóm ${g.nhomMau} ${g.heRh}`,
                noiDung: `Kho máu đang thiếu nhóm ${g.nhomMau} ${g.heRh} (còn ${g.tonKho} ml). Bạn có cùng nhóm máu — hãy đăng ký hiến máu sớm nhất có thể!`
              })}>Chọn</Button>
            </div>
          ))}
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
            <RobotOutlined /> Hệ thống cũng tự động gửi kêu gọi (tối đa 1 lần / 3 ngày / nhóm máu) khi tồn kho xuống dưới ngưỡng.
          </Typography.Paragraph>
        </Card>
      </Col>
    </Row>
  );
}

function Reminders({ onSent }) {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(ROLES.QUAN_TRI);
  const [campaigns, setCampaigns] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [form] = Form.useForm();
  const [gForm] = Form.useForm();
  const [busy, setBusy] = useState('');

  useEffect(() => { campaignApi.getAll({ trangThai: 'SapDienRa,DangDienRa' }).then(setCampaigns); }, []);

  const loadPreview = (id) => {
    setLoadingPreview(true);
    return notificationApi.reminderPreview(id).then(setPreview).catch((e) => message.error(e.message)).finally(() => setLoadingPreview(false));
  };

  const onPick = (id) => {
    const c = campaigns.find((x) => x.id === id);
    if (c) form.setFieldsValue({
      tieuDe: `Nhắc lịch: ${c.tenDot}`,
      noiDung: `Bạn có lịch hiến máu lúc ${dayjs(c.ngayBatDau).format('HH:mm DD/MM/YYYY')} tại ${c.tenDiem} (${c.diaChi}). Hãy ăn nhẹ, ngủ đủ giấc và mang theo CCCD.`
    });
    loadPreview(id);
  };

  const run = async (key, fn) => {
    setBusy(key);
    try { const res = await fn(); message.success(res.message); onSent(); return true; }
    catch (e) { message.error(e.message); return false; }
    finally { setBusy(''); }
  };

  const sendReminder = async () => {
    const v = await form.validateFields();
    if (await run('r', () => notificationApi.reminder(v))) loadPreview(v.dotId);
  };

  const soCanNhac = preview?.soCanNhac ?? 0;
  const autoAt = preview && dayjs(preview.ngayTuDongNhac);

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={isAdmin ? 15 : 24}>
        <Card size="small" title={<><CalendarOutlined /> Nhắc lịch theo đợt hiến máu</>}>
          <Form form={form} layout="vertical">
            <Form.Item name="dotId" label="Đợt hiến máu" rules={[{ required: true, message: 'Chọn đợt' }]}>
              <Select onChange={onPick} placeholder="Chọn đợt sắp diễn ra / đang diễn ra" showSearch optionFilterProp="label"
                options={campaigns.map((c) => ({
                  value: c.id,
                  label: `${dayjs(c.ngayBatDau).format('DD/MM HH:mm')} · ${c.tenDot} — ${c.tenDiem} (${c.soLuongDaDangKy} đăng ký)`
                }))} />
            </Form.Item>

            {loadingPreview && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}
            {!loadingPreview && preview && (
              <>
                <Descriptions size="small" bordered column={1} style={{ marginBottom: 16 }} styles={{ label: { whiteSpace: 'nowrap', width: 150 } }}>
                  <Descriptions.Item label={<><ClockCircleOutlined /> Thời gian</>}>
                    {dayjs(preview.ngayBatDau).format('HH:mm')} – {dayjs(preview.ngayKetThuc).format('HH:mm')}, ngày {dayjs(preview.ngayBatDau).format('DD/MM/YYYY')}
                  </Descriptions.Item>
                  <Descriptions.Item label={<><EnvironmentOutlined /> Địa điểm</>}>
                    <b>{preview.tenDiem}</b>{preview.diaChi && <> — {preview.diaChi}</>}
                  </Descriptions.Item>
                  <Descriptions.Item label={<><TeamOutlined /> Đăng ký</>}>
                    <b>{preview.soDangKy}</b>{preview.soLuongToiDa ? ` / ${preview.soLuongToiDa} chỗ` : ''} người đăng ký · <b style={{ color: soCanNhac ? '#16a34a' : '#dc2626' }}>{soCanNhac}</b> người cần nhắc lịch
                  </Descriptions.Item>
                  <Descriptions.Item label={<><RobotOutlined /> Nhắc tự động</>}>
                    {preview.daTuDongNhac
                      ? <Tag color="green" icon={<CheckCircleOutlined />}>Hệ thống đã tự động nhắc</Tag>
                      : autoAt.isAfter(dayjs())
                        ? <span>Sẽ tự động nhắc lúc <b>{autoAt.format('HH:mm DD/MM/YYYY')}</b> (trước 2 ngày)</span>
                        : <span>Đang trong 2 ngày trước đợt — hệ thống tự nhắc ở lần chạy kế tiếp nếu có người cần nhắc</span>}
                    {preview.lanNhacGanNhat && <Typography.Text type="secondary"> · Lần nhắc gần nhất: {fmtDateTime(preview.lanNhacGanNhat)}</Typography.Text>}
                  </Descriptions.Item>
                </Descriptions>

                <Table size="small" rowKey={(r) => `${r.nguoiHienId}-${r.trangThai}`} dataSource={preview.dangKy} pagination={{ pageSize: 5, hideOnSinglePage: true }}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Đợt này chưa có ai đăng ký" /> }} style={{ marginBottom: 16 }}
                  columns={[
                    { title: 'Người đăng ký', dataIndex: 'hoTen', render: (v, r) => <><b>{v}</b><div style={{ fontSize: 12, color: '#64748b' }}>{r.soDienThoai}</div></> },
                    { title: 'Nhóm', width: 80, render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                    { title: 'Trạng thái đăng ký', dataIndex: 'trangThai', width: 160, render: (v) => <RegistrationStatusTag value={v} /> },
                    { title: 'Nhắc lịch', width: 220, render: (_, r) => (r.seNhan ? <Tag color="green">Sẽ nhận nhắc lịch</Tag> : <Typography.Text type="secondary" style={{ fontSize: 12 }}>Không nhắc: {r.lyDoKhongNhan}</Typography.Text>) }
                  ]} />

                {soCanNhac === 0 && (
                  <Alert type="info" showIcon style={{ marginBottom: 16 }}
                    message="Chưa có ai cần nhắc lịch trong đợt này"
                    description="Nhắc lịch chỉ gửi cho đăng ký đang chờ duyệt hoặc đã duyệt. Người đã khám sàng lọc, đã hiến máu, bị từ chối hoặc đã hủy đăng ký không cần nhắc." />
                )}
              </>
            )}

            <Form.Item name="tieuDe" label="Tiêu đề" rules={[{ required: true }]}><Input maxLength={150} /></Form.Item>
            <Form.Item name="noiDung" label="Nội dung" rules={[{ required: true }]}><Input.TextArea rows={3} maxLength={500} showCount /></Form.Item>
            <Button type="primary" icon={<SendOutlined />} loading={busy === 'r'} disabled={!preview || soCanNhac === 0} onClick={sendReminder}>
              {preview ? `Gửi nhắc lịch đến ${soCanNhac} người` : 'Gửi nhắc lịch'}
            </Button>
          </Form>
        </Card>
      </Col>
      {isAdmin && (
        <Col xs={24} xl={9}>
          <Card size="small" title={<><NotificationOutlined /> Thông báo chung đến tất cả người hiến</>}>
            <Form form={gForm} layout="vertical">
              <Form.Item name="tieuDe" label="Tiêu đề" rules={[{ required: true }]}><Input maxLength={150} placeholder="vd: Lịch nghỉ lễ của điểm hiến máu" /></Form.Item>
              <Form.Item name="noiDung" label="Nội dung" rules={[{ required: true }]}><Input.TextArea rows={4} maxLength={500} showCount /></Form.Item>
              <Button icon={<SendOutlined />} loading={busy === 'g'} onClick={async () => { const v = await gForm.validateFields(); if (await run('g', () => notificationApi.general(v))) gForm.resetFields(); }}>Gửi thông báo</Button>
            </Form>
          </Card>
        </Col>
      )}
    </Row>
  );
}

const DINH_KY_STATUS = {
  ChoGui: { label: 'Chờ gửi ở lần chạy tới', color: 'orange' },
  DaNhac: { label: 'Đã nhắc', color: 'green' },
  DangCoDangKy: { label: 'Đã đăng ký đợt mới', color: 'blue' }
};

// Nhắc hiến máu định kỳ: chạy hoàn toàn tự động, trang này chỉ để theo dõi
function PeriodicReminders() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('TatCa');

  const load = () => { setLoading(true); notificationApi.periodicStatus().then(setData).finally(() => setLoading(false)); };
  useEffect(load, []);

  if (!data) return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
  const rows = filter === 'TatCa' ? data.nguoiDenHan : data.nguoiDenHan.filter((d) => d.trangThai === filter);
  const tuan = Math.round(data.soNgayGiua2LanHien / 7);

  return (
    <>
      <Alert type={data.tuDongBat ? 'info' : 'warning'} showIcon icon={<RobotOutlined />} style={{ marginBottom: 16 }}
        message={data.tuDongBat ? 'Nhắc hiến máu định kỳ đang chạy tự động' : 'Tác vụ tự động đang tắt (Automation:Enabled = false)'}
        description={<>
          Cứ mỗi <b>{data.chuKyPhut} phút</b>, hệ thống tìm người đã hiến máu đủ <b>{tuan} tuần ({data.soNgayGiua2LanHien} ngày)</b> và gửi lời mời hiến lại,
          kèm thông tin đợt hiến máu gần nhất. Mỗi người chỉ được nhắc <b>1 lần</b> sau mỗi lần hiến; người đã đăng ký đợt sắp tới sẽ không bị làm phiền.
        </>}
        action={<Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Đến hạn hiến lại" value={data.soDenHan} prefix={<TeamOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Đã được nhắc" value={data.soDaNhac} valueStyle={{ color: '#16a34a' }} prefix={<CheckCircleOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Chờ gửi lần chạy tới" value={data.soChoGui} valueStyle={{ color: '#d97706' }} prefix={<ClockCircleOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Đã đăng ký đợt mới" value={data.soDangCoDangKy} valueStyle={{ color: '#2563eb' }} prefix={<CalendarOutlined />} /></Card></Col>
      </Row>

      <Descriptions size="small" bordered column={{ xs: 1, md: 3 }} style={{ marginBottom: 16 }} styles={{ label: { whiteSpace: 'nowrap' } }}>
        <Descriptions.Item label={<><HistoryOutlined /> Lần chạy gần nhất</>}>{data.lanChayGanNhat ? `${fmtDateTime(data.lanChayGanNhat)} (${fromNow(data.lanChayGanNhat)})` : 'Chưa chạy'}</Descriptions.Item>
        <Descriptions.Item label={<><SyncOutlined /> Lần chạy tiếp theo</>}>{data.lanChayTiepTheo ? fmtDateTime(data.lanChayTiepTheo) : '—'}</Descriptions.Item>
        <Descriptions.Item label={<><CalendarOutlined /> Đợt được giới thiệu</>}>{data.dotGioiThieu || <Typography.Text type="secondary">Chưa có đợt sắp tới</Typography.Text>}</Descriptions.Item>
      </Descriptions>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card size="small" title="Người hiến đã đến hạn hiến lại"
            extra={<Segmented size="small" value={filter} onChange={setFilter} options={[{ value: 'TatCa', label: 'Tất cả' }, ...Object.entries(DINH_KY_STATUS).map(([k, s]) => ({ value: k, label: s.label }))]} />}>
            <Table size="small" rowKey="nguoiHienId" loading={loading} dataSource={rows} pagination={{ pageSize: 8 }} scroll={{ x: 720 }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có người hiến nào đến hạn" /> }}
              columns={[
                { title: 'Người hiến', dataIndex: 'hoTen', render: (v, r) => <><b>{v}</b><div style={{ fontSize: 12, color: '#64748b' }}>{r.soDienThoai}</div></> },
                { title: 'Nhóm', width: 80, render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                { title: 'Hiến gần nhất', dataIndex: 'lanHienCuoi', width: 120, render: fmtDate },
                { title: 'Đủ điều kiện từ', dataIndex: 'ngayDuDieuKien', width: 130, render: fmtDate },
                { title: 'Tình trạng nhắc', width: 210, render: (_, r) => <><Tag color={DINH_KY_STATUS[r.trangThai]?.color}>{DINH_KY_STATUS[r.trangThai]?.label}</Tag>{r.ngayNhac && <div style={{ fontSize: 12, color: '#64748b' }}>{fmtDateTime(r.ngayNhac)}</div>}</> }
              ]} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card size="small" title="Các lần gửi tự động gần đây">
            {data.lichSu.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lần gửi nào" /> : data.lichSu.map((c) => (
              <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <span><RobotOutlined style={{ color: '#7c3aed' }} /> {fmtDateTime(c.ngayGui)}</span>
                  <b>{c.soNguoiNhan} người</b>
                </Space>
                <Progress percent={c.soNguoiNhan ? Math.round((c.soDaDoc / c.soNguoiNhan) * 100) : 0} size="small" format={(p) => `${p}% đã đọc`} />
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </>
  );
}

function History({ reloadKey }) {
  const [data, setData] = useState([]);
  const [loai, setLoai] = useState();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  useEffect(() => { setLoading(true); notificationApi.getCampaigns({ loai }).then(setData).finally(() => setLoading(false)); }, [loai, reloadKey]);

  const totalSent = data.reduce((a, c) => a + c.soNguoiNhan, 0);
  const totalRead = data.reduce((a, c) => a + c.soDaDoc, 0);

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card size="small"><Statistic title="Số chiến dịch" value={data.length} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Lượt thông báo đã gửi" value={totalSent} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Tỷ lệ đã đọc" value={totalSent ? Math.round((totalRead / totalSent) * 100) : 0} suffix="%" /></Card></Col>
      </Row>
      <div className="toolbar">
        <Select allowClear placeholder="Tất cả loại" style={{ width: 200 }} value={loai} onChange={setLoai} options={Object.entries(LOAI_THONG_BAO).map(([k, l]) => ({ value: k, label: l.label }))} />
      </div>
      <Table rowKey="id" loading={loading} dataSource={data} pagination={{ pageSize: 10 }} scroll={{ x: 1000 }}
        onRow={(r) => ({ onClick: () => notificationApi.getCampaign(r.id).then(setDetail), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Chiến dịch', dataIndex: 'tieuDe', render: (v, r) => <><b>{v}</b><div style={{ fontSize: 12, color: '#64748b' }}>{r.tenDot || r.noiDung.slice(0, 80) + '…'}</div></> },
          { title: 'Loại', dataIndex: 'loai', width: 160, render: (v) => <NotificationTypeTag value={v} /> },
          { title: 'Mục tiêu', width: 110, render: (_, r) => (r.nhomMauMucTieu ? <BloodBadge nhomMau={r.nhomMauMucTieu} heRh={r.heRhMucTieu} /> : <Tag>Tất cả</Tag>) },
          { title: 'Thời gian gửi', dataIndex: 'ngayGui', width: 150, render: fmtDateTime },
          { title: 'Người gửi', dataIndex: 'nguoiTao', width: 170, render: (v, r) => (r.tuDong ? <Tag icon={<RobotOutlined />} color="purple">Tự động</Tag> : <span><UserOutlined /> {v}</span>) },
          { title: 'Đã đọc', width: 170, render: (_, r) => <><Progress percent={r.soNguoiNhan ? Math.round((r.soDaDoc / r.soNguoiNhan) * 100) : 0} size="small" /><span style={{ fontSize: 12, color: '#64748b' }}>{r.soDaDoc}/{r.soNguoiNhan} người</span></> }
        ]} />
      <Drawer width={560} open={!!detail} onClose={() => setDetail(null)} title="Chi tiết chiến dịch">
        {detail && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Tiêu đề">{detail.tieuDe}</Descriptions.Item>
              <Descriptions.Item label="Loại"><NotificationTypeTag value={detail.loai} /></Descriptions.Item>
              <Descriptions.Item label="Nội dung">{detail.noiDung}</Descriptions.Item>
              <Descriptions.Item label="Gửi lúc">{fmtDateTime(detail.ngayGui)} bởi {detail.nguoiTao}</Descriptions.Item>
              {detail.tenDot && <Descriptions.Item label="Đợt hiến máu">{detail.tenDot}</Descriptions.Item>}
            </Descriptions>
            <Typography.Title level={5} style={{ marginTop: 20 }}>Người nhận ({detail.nguoiNhan.length})</Typography.Title>
            <Table size="small" rowKey="nguoiHienId" dataSource={detail.nguoiNhan} pagination={{ pageSize: 10 }}
              columns={[
                { title: 'Họ tên', dataIndex: 'hoTen' },
                { title: 'Nhóm', render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                { title: 'SĐT', dataIndex: 'soDienThoai' },
                { title: 'Trạng thái', dataIndex: 'daDoc', render: (v) => (v ? <Tag color="green">Đã đọc</Tag> : <Tag>Chưa đọc</Tag>) }
              ]} />
          </>
        )}
      </Drawer>
    </>
  );
}

export default function Outreach() {
  const [tab, setTab] = useState('call');
  const [reloadKey, setReloadKey] = useState(0);
  const sent = () => { setReloadKey((k) => k + 1); setTab('history'); };

  return (
    <>
      <PageHeader title="Thông báo & vận động hiến máu" subtitle="Kêu gọi người hiến có nhóm máu phù hợp khi khan hiếm, nhắc lịch và quản lý lịch sử chiến dịch" />
      <Card variant="borderless">
        <Tabs activeKey={tab} onChange={setTab} items={[
          { key: 'call', label: <span><HeartFilled style={{ color: '#c8102e' }} /> Kêu gọi hiến máu</span>, children: <CallForDonation onSent={sent} /> },
          { key: 'remind', label: <span><CalendarOutlined /> Nhắc lịch & thông báo</span>, children: <Reminders onSent={sent} /> },
          { key: 'periodic', label: <span><SyncOutlined /> Nhắc hiến định kỳ</span>, children: <PeriodicReminders /> },
          { key: 'history', label: 'Lịch sử chiến dịch', children: <History reloadKey={reloadKey} /> }
        ]} />
      </Card>
    </>
  );
}
