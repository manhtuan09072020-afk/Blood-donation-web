import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  App, Button, Card, Col, DatePicker, Dropdown, Form, Input, InputNumber, Modal, Progress, Row, Segmented, Select, Space, Table, Tabs, Tag, Tooltip, Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, MoreOutlined, SearchOutlined, TeamOutlined, EnvironmentOutlined, StopOutlined, CheckOutlined, PlayCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { campaignApi } from '../../api';
import { CampaignStatusTag, PageHeader } from '../../components/common';
import { fmtDateTime, fmtTime } from '../../utils/format';

function CampaignTab() {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState(null); // null | {} | campaign
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    campaignApi.getAll().then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { load(); campaignApi.getSites().then(setSites); }, []);

  const shown = useMemo(() => data.filter((c) => (status === 'all' || c.trangThai === status)
    && (!keyword || `${c.tenDot} ${c.tenDiem}`.toLowerCase().includes(keyword.toLowerCase()))), [data, status, keyword]);

  const counts = useMemo(() => data.reduce((a, c) => ({ ...a, [c.trangThai]: (a[c.trangThai] || 0) + 1 }), {}), [data]);

  const openForm = (c) => {
    setEditing(c || {});
    form.resetFields();
    if (c) form.setFieldsValue({ ...c, thoiGian: [dayjs(c.ngayBatDau), dayjs(c.ngayKetThuc)] });
    else form.setFieldsValue({ thoiGian: [dayjs().add(7, 'day').hour(7).minute(30), dayjs().add(7, 'day').hour(16).minute(30)], soLuongDuKien: 150 });
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      diemId: v.diemId, tenDot: v.tenDot, moTa: v.moTa, soLuongDuKien: v.soLuongDuKien,
      ngayBatDau: v.thoiGian[0].format('YYYY-MM-DDTHH:mm:00'), ngayKetThuc: v.thoiGian[1].format('YYYY-MM-DDTHH:mm:00')
    };
    try {
      if (editing?.id) await campaignApi.update(editing.id, payload);
      else await campaignApi.create(payload);
      message.success(editing?.id ? 'Đã cập nhật đợt hiến máu' : 'Đã tạo đợt hiến máu mới');
      setEditing(null);
      load();
    } catch (e) { message.error(e.message); }
  };

  const changeStatus = (c, trangThai) => {
    const labels = { DangDienRa: 'bắt đầu', DaKetThuc: 'kết thúc', DaHuy: 'HỦY' };
    modal.confirm({
      title: `Xác nhận ${labels[trangThai]} đợt "${c.tenDot}"?`,
      content: trangThai === 'DaHuy' ? 'Toàn bộ đăng ký chưa khám sẽ bị hủy và người hiến được thông báo tự động.' : null,
      okText: 'Xác nhận', cancelText: 'Không', okButtonProps: { danger: trangThai === 'DaHuy' },
      onOk: async () => {
        try {
          const res = await campaignApi.updateStatus(c.id, trangThai);
          message.success(res.message);
          load();
        } catch (e) { message.error(e.message); }
      }
    });
  };

  return (
    <>
      <div className="toolbar">
        <Segmented value={status} onChange={setStatus} options={[
          { label: `Tất cả (${data.length})`, value: 'all' },
          { label: `Đang diễn ra (${counts.DangDienRa || 0})`, value: 'DangDienRa' },
          { label: `Sắp diễn ra (${counts.SapDienRa || 0})`, value: 'SapDienRa' },
          { label: `Đã kết thúc (${counts.DaKetThuc || 0})`, value: 'DaKetThuc' },
          { label: `Đã hủy (${counts.DaHuy || 0})`, value: 'DaHuy' }
        ]} />
        <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm đợt / điểm hiến" style={{ width: 240 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null)}>Tạo đợt hiến máu</Button>
      </div>
      <Table
        rowKey="id" loading={loading} dataSource={shown} scroll={{ x: 1000 }}
        pagination={{ pageSize: 10, showTotal: (t) => `${t} đợt` }}
        columns={[
          { title: 'Đợt hiến máu', dataIndex: 'tenDot', render: (v, r) => <><b>{v}</b><div style={{ color: '#64748b', fontSize: 12 }}><EnvironmentOutlined /> {r.tenDiem}</div></> },
          { title: 'Thời gian', dataIndex: 'ngayBatDau', width: 190, sorter: (a, b) => dayjs(a.ngayBatDau) - dayjs(b.ngayBatDau), render: (v, r) => <>{dayjs(v).format('DD/MM/YYYY')}<div style={{ color: '#64748b', fontSize: 12 }}>{fmtTime(v)} – {fmtTime(r.ngayKetThuc)}</div></> },
          {
            title: 'Đăng ký / Kế hoạch', width: 200, render: (_, r) => (
              <div>
                <span><TeamOutlined /> {r.soLuongDaDangKy}{r.soLuongDuKien ? ` / ${r.soLuongDuKien}` : ''}</span>
                {r.soLuongDuKien && <Progress percent={Math.round((r.soLuongDaDangKy / r.soLuongDuKien) * 100)} size="small" strokeColor="#c8102e" />}
              </div>
            )
          },
          { title: 'Đã hiến', dataIndex: 'soLuongDaHien', width: 90, align: 'center', render: (v) => <Tag color="green" bordered={false} style={{ fontWeight: 700 }}>{v}</Tag> },
          { title: 'Trạng thái', dataIndex: 'trangThai', width: 130, render: (v) => <CampaignStatusTag value={v} /> },
          {
            title: '', width: 110, fixed: 'right', render: (_, r) => {
              const active = ['SapDienRa', 'DangDienRa'].includes(r.trangThai);
              return (
                <Space>
                  <Tooltip title="Danh sách đăng ký"><Button size="small" icon={<TeamOutlined />} onClick={() => navigate(`/admin/registrations?dotId=${r.id}`)} /></Tooltip>
                  {active && (
                    <Dropdown trigger={['click']} menu={{
                      items: [
                        { key: 'edit', icon: <EditOutlined />, label: 'Chỉnh sửa' },
                        r.trangThai === 'SapDienRa' && { key: 'DangDienRa', icon: <PlayCircleOutlined />, label: 'Bắt đầu ngay' },
                        { key: 'DaKetThuc', icon: <CheckOutlined />, label: 'Kết thúc đợt' },
                        { type: 'divider' },
                        { key: 'DaHuy', icon: <StopOutlined />, label: 'Hủy đợt', danger: true }
                      ].filter(Boolean),
                      onClick: ({ key }) => (key === 'edit' ? openForm(r) : changeStatus(r, key))
                    }}>
                      <Button size="small" icon={<MoreOutlined />} />
                    </Dropdown>
                  )}
                </Space>
              );
            }
          }
        ]}
      />

      <Modal title={editing?.id ? 'Chỉnh sửa đợt hiến máu' : 'Tạo đợt hiến máu mới'} open={!!editing} onCancel={() => setEditing(null)} onOk={save} okText="Lưu" cancelText="Hủy" width={620} destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="tenDot" label="Tên đợt hiến máu" rules={[{ required: true, message: 'Nhập tên đợt' }]}><Input placeholder="vd: Ngày hội hiến máu Chủ nhật Đỏ" /></Form.Item>
          <Form.Item name="diemId" label="Điểm hiến máu" rules={[{ required: true, message: 'Chọn điểm hiến máu' }]}>
            <Select showSearch optionFilterProp="label" options={sites.map((s) => ({ value: s.id, label: `${s.tenDiem} — ${s.diaChi}` }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="thoiGian" label="Thời gian diễn ra" rules={[{ required: true, message: 'Chọn thời gian' }]}>
                <DatePicker.RangePicker showTime={{ format: 'HH:mm', minuteStep: 15 }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="soLuongDuKien" label="Số lượng dự kiến"><InputNumber min={1} style={{ width: '100%' }} suffix="người" /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="moTa" label="Mô tả / thông tin cho người hiến"><Input.TextArea rows={3} maxLength={500} showCount /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function SiteTab() {
  const { message } = App.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = () => { setLoading(true); campaignApi.getAllSites().then(setData).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openForm = (s) => { setEditing(s || {}); form.resetFields(); if (s) form.setFieldsValue(s); };
  const save = async () => {
    const v = await form.validateFields();
    try {
      if (editing?.id) await campaignApi.updateSite(editing.id, v); else await campaignApi.createSite(v);
      message.success('Đã lưu điểm hiến máu');
      setEditing(null);
      load();
    } catch (e) { message.error(e.message); }
  };
  const toggle = async (s) => {
    try { const res = await campaignApi.setSiteActive(s.id, !s.trangThai); message.success(res.message); load(); }
    catch (e) { message.error(e.message); }
  };

  return (
    <>
      <div className="toolbar"><div style={{ flex: 1 }} /><Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null)}>Thêm điểm hiến máu</Button></div>
      <Table rowKey="id" loading={loading} dataSource={data} pagination={false}
        columns={[
          { title: 'Tên điểm', dataIndex: 'tenDiem', render: (v) => <b>{v}</b> },
          { title: 'Địa chỉ', dataIndex: 'diaChi' },
          { title: 'Điện thoại', dataIndex: 'soDienThoai', width: 140 },
          { title: 'Số đợt đã tổ chức', dataIndex: 'soDotHienMau', width: 150, align: 'center' },
          { title: 'Trạng thái', dataIndex: 'trangThai', width: 130, render: (v) => (v ? <Tag color="green">Hoạt động</Tag> : <Tag>Ngừng hoạt động</Tag>) },
          {
            title: '', width: 160, render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)}>Sửa</Button>
                <Popconfirm title={r.trangThai ? 'Ngừng hoạt động điểm này?' : 'Kích hoạt lại điểm này?'} onConfirm={() => toggle(r)}>
                  <Button size="small" danger={r.trangThai}>{r.trangThai ? 'Ngừng' : 'Kích hoạt'}</Button>
                </Popconfirm>
              </Space>
            )
          }
        ]} />
      <Modal title={editing?.id ? 'Sửa điểm hiến máu' : 'Thêm điểm hiến máu'} open={!!editing} onCancel={() => setEditing(null)} onOk={save} okText="Lưu" cancelText="Hủy" destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="tenDiem" label="Tên điểm hiến máu" rules={[{ required: true, message: 'Nhập tên điểm' }]}><Input /></Form.Item>
          <Form.Item name="diaChi" label="Địa chỉ" rules={[{ required: true, message: 'Nhập địa chỉ' }]}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="soDienThoai" label="Số điện thoại liên hệ"><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default function Campaigns() {
  return (
    <>
      <PageHeader title="Đợt & điểm hiến máu" subtitle="Lập lịch tổ chức hiến máu và quản lý các điểm hiến máu" />
      <Card variant="borderless">
        <Tabs items={[
          { key: 'campaigns', label: 'Đợt hiến máu', children: <CampaignTab /> },
          { key: 'sites', label: 'Điểm hiến máu', children: <SiteTab /> }
        ]} />
      </Card>
    </>
  );
}
