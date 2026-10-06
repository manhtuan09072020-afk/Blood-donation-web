import { useEffect, useMemo, useState } from 'react';
import {
  Alert, App, Button, Card, Col, Descriptions, Form, Input, InputNumber, List, Modal, Radio, Row, Select, Space, Table, Tabs, Tag, Typography
} from 'antd';
import { MedicineBoxOutlined, CheckCircleFilled, CloseCircleFilled, MinusCircleOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { registrationApi, screeningApi, campaignApi } from '../../api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { BloodBadge, PageHeader } from '../../components/common';
import { fmtDateTime, ageOf } from '../../utils/format';

// Tiêu chuẩn sàng lọc (đồng bộ với DonationRules phía backend)
function evaluate(v) {
  const bp = (v.huyetAp || '').split('/').map((x) => parseInt(x, 10));
  const bpOk = bp.length === 2 && bp.every((n) => !Number.isNaN(n)) ? bp[0] >= 90 && bp[0] <= 160 && bp[1] >= 60 && bp[1] <= 100 : null;
  return [
    { label: 'Cân nặng ≥ 42 kg', ok: v.canNang == null ? null : v.canNang >= 42 },
    { label: 'Huyết áp 90–160 / 60–100 mmHg', ok: v.huyetAp ? bpOk : null },
    { label: 'Mạch 50–100 lần/phút', ok: v.mach == null ? null : v.mach >= 50 && v.mach <= 100 },
    { label: 'Nhiệt độ ≤ 37.5 °C', ok: v.nhietDo == null ? null : v.nhietDo <= 37.5 },
    { label: 'Hemoglobin ≥ 12 g/dL', ok: v.hemoglobin == null ? null : v.hemoglobin >= 12 }
  ];
}

const REASONS = ['Huyết áp cao', 'Hemoglobin thấp (thiếu máu)', 'Cân nặng không đạt', 'Đang dùng thuốc kháng sinh', 'Sốt / nhiễm trùng cấp', 'Mất ngủ, mệt mỏi', 'Mới xăm hình / phẫu thuật < 6 tháng'];

export default function Screening() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const canScreen = hasRole(ROLES.QUAN_TRI, ROLES.NHAN_VIEN_SANG_LOC);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [dotId, setDotId] = useState();
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [ketQuaFilter, setKetQuaFilter] = useState();
  const [current, setCurrent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const values = Form.useWatch([], form) || {};

  const load = () => {
    setLoading(true);
    Promise.all([
      registrationApi.getAll({ trangThai: 'DaDuyet', dotId }).then(setPending),
      screeningApi.getAll({ dotId }).then(setHistory)
    ]).finally(() => setLoading(false));
  };
  useEffect(load, [dotId]);
  useEffect(() => {
    campaignApi.getAll().then((l) => {
      setCampaigns(l);
      const ongoing = l.find((c) => c.trangThai === 'DangDienRa');
      if (ongoing) setDotId(ongoing.id);
    });
  }, []);

  const checks = useMemo(() => evaluate(values), [values]);
  const allPass = checks.every((c) => c.ok === true);
  const anyFail = checks.some((c) => c.ok === false);

  const open = (r) => {
    setCurrent(r);
    form.resetFields();
    form.setFieldsValue({ ketQua: undefined });
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const lyDo = Array.isArray(v.lyDoKhongDat) ? v.lyDoKhongDat.join('; ') : v.lyDoKhongDat;
      await screeningApi.create({ dangKyId: current.id, ...v, lyDoKhongDat: lyDo });
      message.success(v.ketQua === 'Dat' ? `${current.hoTenNguoiHien} ĐẠT — chuyển sang lấy máu` : 'Đã lưu kết quả không đạt và thông báo cho người hiến');
      setCurrent(null);
      load();
    } catch (e) { message.error(e.message); }
    finally { setSaving(false); }
  };

  const kw = keyword.toLowerCase();
  const pendingShown = pending.filter((r) => !kw || `${r.hoTenNguoiHien} ${r.cccd}`.toLowerCase().includes(kw));
  const historyShown = history.filter((h) => (!ketQuaFilter || h.ketQua === ketQuaFilter) && (!kw || h.hoTenNguoiHien.toLowerCase().includes(kw)));

  return (
    <>
      <PageHeader title="Khám sàng lọc" subtitle="Đánh giá điều kiện sức khỏe trước khi hiến máu" />
      <Card variant="borderless">
        <div className="toolbar">
          <Select allowClear showSearch optionFilterProp="label" placeholder="Tất cả đợt" style={{ width: 340 }} value={dotId} onChange={setDotId}
            options={campaigns.map((c) => ({ value: c.id, label: `${dayjs(c.ngayBatDau).format('DD/MM/YYYY')} · ${c.tenDot}` }))} />
          <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm người hiến" style={{ width: 220 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <Tabs items={[
          {
            key: 'pending', label: `Chờ khám (${pending.length})`,
            children: (
              <Table rowKey="id" loading={loading} dataSource={pendingShown} pagination={{ pageSize: 10 }}
                columns={[
                  { title: 'Người hiến', dataIndex: 'hoTenNguoiHien', render: (v, r) => <><b>{v}</b><div style={{ fontSize: 12, color: '#64748b' }}>{r.gioiTinh}, {ageOf(r.ngaySinh)} tuổi · CCCD {r.cccd}</div></> },
                  { title: 'Nhóm máu', width: 100, render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                  { title: 'Đợt hiến máu', dataIndex: 'tenDot' },
                  { title: 'Ghi chú', dataIndex: 'ghiChu', render: (v) => v || '—' },
                  { title: '', width: 150, render: (_, r) => canScreen && <Button type="primary" icon={<MedicineBoxOutlined />} onClick={() => open(r)}>Khám</Button> }
                ]} />
            )
          },
          {
            key: 'history', label: `Kết quả đã khám (${history.length})`,
            children: (
              <>
                <Radio.Group value={ketQuaFilter} onChange={(e) => setKetQuaFilter(e.target.value)} style={{ marginBottom: 12 }} optionType="button"
                  options={[{ label: 'Tất cả', value: undefined }, { label: 'Đạt', value: 'Dat' }, { label: 'Không đạt', value: 'KhongDat' }]} />
                <Table rowKey="id" loading={loading} dataSource={historyShown} pagination={{ pageSize: 10 }} scroll={{ x: 1000 }}
                  columns={[
                    { title: 'Người hiến', dataIndex: 'hoTenNguoiHien', render: (v, r) => <><b>{v}</b><div style={{ fontSize: 12, color: '#64748b' }}>{r.tenDot}</div></> },
                    { title: 'Nhóm máu', width: 90, render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                    { title: 'Thời gian', dataIndex: 'ngayKham', width: 140, render: fmtDateTime },
                    { title: 'Cân nặng', dataIndex: 'canNang', width: 90, render: (v) => (v ? `${v} kg` : '—') },
                    { title: 'Huyết áp', dataIndex: 'huyetAp', width: 90 },
                    { title: 'Mạch', dataIndex: 'mach', width: 70 },
                    { title: 'Hb', dataIndex: 'hemoglobin', width: 70 },
                    { title: 'Kết quả', dataIndex: 'ketQua', width: 220, render: (v, r) => (v === 'Dat' ? <Tag color="green">Đạt {r.daTiepNhan && '· đã lấy máu'}</Tag> : <><Tag color="red">Không đạt</Tag><div style={{ fontSize: 12 }}>{r.lyDoKhongDat}</div></>) },
                    { title: 'Bác sĩ khám', dataIndex: 'nhanVienKham', width: 160 }
                  ]} />
              </>
            )
          }
        ]} />
      </Card>

      <Modal open={!!current} onCancel={() => setCurrent(null)} title="Phiếu khám sàng lọc" width={820} onOk={submit} okText="Lưu kết quả" cancelText="Hủy" confirmLoading={saving} destroyOnHidden>
        {current && (
          <Row gutter={24}>
            <Col xs={24} md={14}>
              <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
                <Descriptions.Item label="Người hiến"><b>{current.hoTenNguoiHien}</b></Descriptions.Item>
                <Descriptions.Item label="Nhóm máu"><BloodBadge nhomMau={current.nhomMau} heRh={current.heRh} /></Descriptions.Item>
                <Descriptions.Item label="Giới tính">{current.gioiTinh}</Descriptions.Item>
                <Descriptions.Item label="Tuổi">{ageOf(current.ngaySinh)}</Descriptions.Item>
              </Descriptions>
              <Form form={form} layout="vertical">
                <Row gutter={12}>
                  <Col span={8}><Form.Item name="canNang" label="Cân nặng (kg)" rules={[{ required: true, message: 'Nhập' }]}><InputNumber min={20} max={200} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={8}><Form.Item name="huyetAp" label="Huyết áp (mmHg)" rules={[{ required: true, message: 'Nhập' }, { pattern: /^\d{2,3}\/\d{2,3}$/, message: 'Dạng 120/80' }]}><Input placeholder="120/80" /></Form.Item></Col>
                  <Col span={8}><Form.Item name="mach" label="Mạch (lần/phút)"><InputNumber min={30} max={200} style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={8}><Form.Item name="nhietDo" label="Nhiệt độ (°C)"><InputNumber min={34} max={42} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={8}><Form.Item name="hemoglobin" label="Hemoglobin (g/dL)" rules={[{ required: true, message: 'Nhập' }]}><InputNumber min={5} max={25} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
                </Row>
                <Form.Item name="ketQua" label="Kết luận" rules={[{ required: true, message: 'Chọn kết luận' }]}>
                  <Radio.Group optionType="button" buttonStyle="solid">
                    <Radio.Button value="Dat" disabled={anyFail}>Đủ điều kiện hiến máu</Radio.Button>
                    <Radio.Button value="KhongDat">Không đạt</Radio.Button>
                  </Radio.Group>
                </Form.Item>
                {values.ketQua === 'KhongDat' && (
                  <Form.Item name="lyDoKhongDat" label="Lý do không đạt" rules={[{ required: true, message: 'Nhập lý do' }]}>
                    <Select mode="tags" maxCount={3} options={REASONS.map((r) => ({ value: r, label: r }))} placeholder="Chọn hoặc nhập lý do" />
                  </Form.Item>
                )}
                <Form.Item name="ghiChu" label="Ghi chú của bác sĩ"><Input.TextArea rows={2} /></Form.Item>
              </Form>
            </Col>
            <Col xs={24} md={10}>
              <Card size="small" title="Bảng kiểm tiêu chuẩn" style={{ background: '#f8fafc' }}>
                <List size="small" dataSource={checks} renderItem={(c) => (
                  <List.Item>
                    <Space>
                      {c.ok === true ? <CheckCircleFilled style={{ color: '#16a34a' }} /> : c.ok === false ? <CloseCircleFilled style={{ color: '#dc2626' }} /> : <MinusCircleOutlined style={{ color: '#94a3b8' }} />}
                      <span style={{ color: c.ok === false ? '#dc2626' : undefined }}>{c.label}</span>
                    </Space>
                  </List.Item>
                )} />
                {allPass && <Alert type="success" showIcon message="Tất cả chỉ số đạt chuẩn" style={{ marginTop: 8 }} />}
                {anyFail && <Alert type="error" showIcon message="Có chỉ số không đạt — chỉ được kết luận 'Không đạt'" style={{ marginTop: 8 }} />}
              </Card>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12 }}>
                Kết quả được gửi thông báo tự động đến người hiến. Người đạt sẽ xuất hiện trong danh sách chờ lấy máu của nhân viên tiếp nhận.
              </Typography.Paragraph>
            </Col>
          </Row>
        )}
      </Modal>
    </>
  );
}
