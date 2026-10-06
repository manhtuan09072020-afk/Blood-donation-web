import { useEffect, useMemo, useState } from 'react';
import {
  App, Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Timeline, Tooltip, Typography, Popconfirm
} from 'antd';
import { UserAddOutlined, SearchOutlined, EyeOutlined, EditOutlined, LockOutlined, UnlockOutlined, DownloadOutlined, CheckCircleFilled, CloseCircleFilled, ClockCircleFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import { donorApi } from '../../api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { BloodBadge, PageHeader, RegistrationStatusTag, StatCard } from '../../components/common';
import { fmtDate, fmtDateTime, fmtMl, ageOf, GIOI_TINH_OPTIONS, NHOM_MAU_OPTIONS, RH_OPTIONS, bloodLabel } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import CreateDonorModal from '../../components/CreateDonorModal';

export default function Donors() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ keyword: '', nhomMau: undefined, heRh: undefined, trangThai: undefined, eligible: undefined });
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const canEdit = hasRole(ROLES.QUAN_TRI, ROLES.NHAN_VIEN_TIEP_NHAN);
  const canLock = hasRole(ROLES.QUAN_TRI);

  const load = () => {
    setLoading(true);
    donorApi.getAll({ nhomMau: filters.nhomMau, heRh: filters.heRh, trangThai: filters.trangThai })
      .then(setData).finally(() => setLoading(false));
  };
  useEffect(load, [filters.nhomMau, filters.heRh, filters.trangThai]);

  const shown = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();
    return data.filter((d) => {
      if (kw && !`${d.hoTen} ${d.cccd} ${d.soDienThoai} ${d.email || ''}`.toLowerCase().includes(kw)) return false;
      if (filters.eligible === 'yes') return !d.ngayCoTheHienTiepTheo || !dayjs(d.ngayCoTheHienTiepTheo).isAfter(dayjs(), 'day');
      if (filters.eligible === 'no') return d.ngayCoTheHienTiepTheo && dayjs(d.ngayCoTheHienTiepTheo).isAfter(dayjs(), 'day');
      return true;
    });
  }, [data, filters.keyword, filters.eligible]);

  const openDetail = async (d) => {
    setDetail(d);
    setHistory([]);
    setHistory(await donorApi.getHistory(d.id));
  };

  const openEdit = (d) => {
    setEditing(d);
    form.setFieldsValue({ ...d, ngaySinh: dayjs(d.ngaySinh) });
  };

  const saveEdit = async () => {
    const v = await form.validateFields();
    try {
      const res = await donorApi.update(editing.id, { ...v, ngaySinh: v.ngaySinh.format('YYYY-MM-DD') });
      message.success(res.message);
      setEditing(null);
      load();
    } catch (e) { message.error(e.message); }
  };

  const toggleLock = async (d) => {
    try {
      const res = await donorApi.setActive(d.id, !d.trangThai);
      message.success(res.message);
      load();
    } catch (e) { message.error(e.message); }
  };

  const doExport = () => exportCsv(`nguoi-hien-mau-${dayjs().format('YYYYMMDD')}`, [
    { title: 'Họ tên', value: 'hoTen' }, { title: 'CCCD', value: 'cccd' }, { title: 'Ngày sinh', value: (r) => fmtDate(r.ngaySinh) },
    { title: 'Giới tính', value: 'gioiTinh' }, { title: 'Nhóm máu', value: (r) => bloodLabel(r.nhomMau, r.heRh) },
    { title: 'Điện thoại', value: 'soDienThoai' }, { title: 'Email', value: 'email' }, { title: 'Địa chỉ', value: 'diaChi' },
    { title: 'Số lần hiến', value: 'soLanHien' }, { title: 'Tổng ml', value: 'tongTheTich' }, { title: 'Lần hiến gần nhất', value: (r) => fmtDate(r.lanHienGanNhat) }
  ], shown);

  const total = data.length;
  const donated = data.filter((d) => d.soLanHien > 0).length;
  const eligibleNow = data.filter((d) => d.trangThai && (!d.ngayCoTheHienTiepTheo || !dayjs(d.ngayCoTheHienTiepTheo).isAfter(dayjs(), 'day'))).length;

  return (
    <>
      <PageHeader title="Người hiến máu" subtitle="Quản lý hồ sơ, nhóm máu và lịch sử hiến máu của người hiến"
        extra={<>
          <Button icon={<DownloadOutlined />} onClick={doExport}>Xuất Excel (CSV)</Button>
          {canEdit && <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreating(true)}>Thêm người hiến</Button>}
        </>} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}><StatCard label="Tổng người hiến" value={total} icon={<CheckCircleFilled />} /></Col>
        <Col xs={24} md={8}><StatCard label="Đã từng hiến máu" value={donated} icon={<CheckCircleFilled />} color="#16a34a" foot={total ? `${Math.round((donated / total) * 100)}% người đăng ký` : ''} /></Col>
        <Col xs={24} md={8}><StatCard label="Đủ điều kiện hiến ngay" value={eligibleNow} icon={<ClockCircleFilled />} color="#2563eb" foot="Đã qua 12 tuần kể từ lần hiến gần nhất" /></Col>
      </Row>

      <Card variant="borderless">
        <div className="toolbar">
          <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm tên, CCCD, SĐT, email…" style={{ width: 280 }}
            value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
          <Select allowClear placeholder="Nhóm máu" style={{ width: 130 }} options={NHOM_MAU_OPTIONS} value={filters.nhomMau} onChange={(v) => setFilters({ ...filters, nhomMau: v })} />
          <Select allowClear placeholder="Hệ Rh" style={{ width: 130 }} options={RH_OPTIONS} value={filters.heRh} onChange={(v) => setFilters({ ...filters, heRh: v })} />
          <Select allowClear placeholder="Điều kiện hiến" style={{ width: 170 }} value={filters.eligible} onChange={(v) => setFilters({ ...filters, eligible: v })}
            options={[{ value: 'yes', label: 'Có thể hiến ngay' }, { value: 'no', label: 'Chưa đủ 12 tuần' }]} />
          <Select allowClear placeholder="Trạng thái" style={{ width: 150 }} value={filters.trangThai} onChange={(v) => setFilters({ ...filters, trangThai: v })}
            options={[{ value: true, label: 'Đang hoạt động' }, { value: false, label: 'Đã khóa' }]} />
          <Typography.Text type="secondary">{shown.length} người</Typography.Text>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={shown}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} người hiến` }}
          columns={[
            {
              title: 'Người hiến', dataIndex: 'hoTen', fixed: 'left', width: 230, sorter: (a, b) => a.hoTen.localeCompare(b.hoTen, 'vi'),
              render: (v, r) => <a onClick={() => openDetail(r)}><b style={{ color: '#0f172a' }}>{v}</b><div style={{ color: '#64748b', fontSize: 12 }}>CCCD {r.cccd}</div></a>
            },
            { title: 'Nhóm máu', width: 100, render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
            { title: 'Giới tính / Tuổi', width: 120, render: (_, r) => `${r.gioiTinh}, ${ageOf(r.ngaySinh)} tuổi` },
            { title: 'Điện thoại', dataIndex: 'soDienThoai', width: 120 },
            { title: 'Số lần hiến', dataIndex: 'soLanHien', width: 110, align: 'center', sorter: (a, b) => a.soLanHien - b.soLanHien, render: (v) => <Tag color={v ? 'red' : 'default'} bordered={false} style={{ fontWeight: 700 }}>{v}</Tag> },
            { title: 'Lần gần nhất', dataIndex: 'lanHienGanNhat', width: 120, render: fmtDate, sorter: (a, b) => dayjs(a.lanHienGanNhat || 0) - dayjs(b.lanHienGanNhat || 0) },
            {
              title: 'Có thể hiến từ', dataIndex: 'ngayCoTheHienTiepTheo', width: 140,
              render: (v) => (!v || !dayjs(v).isAfter(dayjs(), 'day') ? <Tag color="green">Ngay bây giờ</Tag> : <Tag color="orange">{fmtDate(v)}</Tag>)
            },
            { title: 'Trạng thái', dataIndex: 'trangThai', width: 110, render: (v) => (v ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Đã khóa</Tag>) },
            {
              title: '', fixed: 'right', width: 130, render: (_, r) => (
                <Space>
                  <Tooltip title="Xem hồ sơ"><Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} /></Tooltip>
                  {canEdit && <Tooltip title="Chỉnh sửa"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>}
                  {canLock && (
                    <Popconfirm title={r.trangThai ? 'Khóa người hiến này?' : 'Mở khóa người hiến này?'} onConfirm={() => toggleLock(r)}>
                      <Button size="small" danger={r.trangThai} icon={r.trangThai ? <LockOutlined /> : <UnlockOutlined />} />
                    </Popconfirm>
                  )}
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Drawer width={640} open={!!detail} onClose={() => setDetail(null)} title="Hồ sơ người hiến máu">
        {detail && (
          <>
            <Space size={16} align="center" style={{ marginBottom: 16 }}>
              <BloodBadge nhomMau={detail.nhomMau} heRh={detail.heRh} size="lg" />
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>{detail.hoTen}</Typography.Title>
                <Typography.Text type="secondary">@{detail.username} · tham gia {fmtDate(detail.ngayDangKy)}</Typography.Text>
              </div>
            </Space>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Ngày sinh">{fmtDate(detail.ngaySinh)} ({ageOf(detail.ngaySinh)} tuổi)</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{detail.gioiTinh}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{detail.cccd}</Descriptions.Item>
              <Descriptions.Item label="Cân nặng">{detail.canNang ? `${detail.canNang} kg` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{detail.soDienThoai}</Descriptions.Item>
              <Descriptions.Item label="Email">{detail.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>{detail.diaChi || '—'}</Descriptions.Item>
              <Descriptions.Item label="Số lần hiến">{detail.soLanHien}</Descriptions.Item>
              <Descriptions.Item label="Tổng thể tích">{fmtMl(detail.tongTheTich)}</Descriptions.Item>
              <Descriptions.Item label="Lần gần nhất">{fmtDate(detail.lanHienGanNhat)}</Descriptions.Item>
              <Descriptions.Item label="Có thể hiến từ">{detail.ngayCoTheHienTiepTheo ? fmtDate(detail.ngayCoTheHienTiepTheo) : 'Ngay bây giờ'}</Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5} style={{ marginTop: 24 }}>Lịch sử hiến máu</Typography.Title>
            <Timeline items={history.map((h) => ({
              dot: h.ngayLayMau ? <CheckCircleFilled style={{ color: '#16a34a' }} /> : h.trangThai === 'TuChoi' ? <CloseCircleFilled style={{ color: '#dc2626' }} /> : <ClockCircleFilled style={{ color: '#94a3b8' }} />,
              children: (
                <div>
                  <b>{h.tenDot}</b> <RegistrationStatusTag value={h.trangThai} />
                  <div style={{ color: '#64748b', fontSize: 13 }}>{h.tenDiem} · {fmtDate(h.ngayBatDau)}</div>
                  {h.ngayKham && <div style={{ fontSize: 13 }}>Sàng lọc {fmtDateTime(h.ngayKham)}: {h.ketQuaSangLoc === 'Dat' ? 'Đạt' : `Không đạt — ${h.lyDoKhongDat}`} {h.hemoglobin && `· Hb ${h.hemoglobin} g/dL`} {h.huyetAp && `· HA ${h.huyetAp}`}</div>}
                  {h.ngayLayMau && <div style={{ fontSize: 13 }}>Lấy máu {fmtMl(h.theTich)} — mã {h.maLoMau.join(', ')}</div>}
                </div>
              )
            }))} />
            {history.length === 0 && <Typography.Text type="secondary">Chưa có đăng ký hiến máu nào.</Typography.Text>}
          </>
        )}
      </Drawer>

      <CreateDonorModal open={creating} onClose={() => setCreating(false)} onCreated={load} />

      <Modal title="Cập nhật thông tin người hiến" open={!!editing} onCancel={() => setEditing(null)} onOk={saveEdit} okText="Lưu" cancelText="Hủy" width={640} destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="hoTen" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="ngaySinh" label="Ngày sinh" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="gioiTinh" label="Giới tính" rules={[{ required: true }]}><Select options={GIOI_TINH_OPTIONS} /></Form.Item></Col>
            <Col span={8}><Form.Item name="nhomMau" label="Nhóm máu"><Select allowClear options={NHOM_MAU_OPTIONS} /></Form.Item></Col>
            <Col span={8}><Form.Item name="heRh" label="Hệ Rh"><Select allowClear options={RH_OPTIONS} /></Form.Item></Col>
            <Col span={8}><Form.Item name="canNang" label="Cân nặng (kg)"><InputNumber min={30} max={200} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="soDienThoai" label="Điện thoại" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="diaChi" label="Địa chỉ"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
