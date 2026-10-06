import { useEffect, useState } from 'react';
import { App, Avatar, Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { PlusOutlined, EditOutlined, KeyOutlined, LockOutlined, UnlockOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { staffApi } from '../../api';
import { ROLE_LABELS, ROLE_COLORS, useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/common';
import { fmtDate } from '../../utils/format';

const STAFF_ROLE_OPTIONS = ['QuanTri', 'NhanVienTiepNhan', 'NhanVienSangLoc', 'NhanVienKho'].map((r) => ({ value: r, label: ROLE_LABELS[r] }));

// Ma trận phân quyền hiển thị cho quản trị viên (đồng bộ với [Authorize] ở backend)
const PERMISSIONS = [
  ['Quản lý người hiến máu (xem)', 1, 1, 1, 1],
  ['Quản lý đợt & điểm hiến máu', 1, 0, 0, 0],
  ['Duyệt đăng ký / đăng ký tại điểm', 1, 1, 0, 0],
  ['Khám sàng lọc', 1, 0, 1, 0],
  ['Tiếp nhận máu & nhập kho', 1, 1, 0, 0],
  ['Xem tồn kho', 1, 1, 0, 1],
  ['Xuất kho, hủy bỏ, vị trí lưu trữ', 1, 0, 0, 1],
  ['Nhóm máu & cơ sở y tế', 1, 0, 0, 1],
  ['Thông báo & vận động', 1, 1, 0, 1],
  ['Báo cáo thống kê', 1, 1, 0, 1],
  ['Quản lý nhân viên & phân quyền', 1, 0, 0, 0]
];

export default function Staff() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [newPwd, setNewPwd] = useState('');
  const [form] = Form.useForm();

  const load = () => { setLoading(true); staffApi.getAll().then(setData).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openForm = (s) => { setEditing(s || {}); form.resetFields(); if (s) form.setFieldsValue(s); else form.setFieldsValue({ role: 'NhanVienTiepNhan' }); };
  const save = async () => {
    const v = await form.validateFields();
    try {
      if (editing?.id) await staffApi.update(editing.id, v); else await staffApi.create(v);
      message.success(editing?.id ? 'Đã cập nhật nhân viên' : 'Đã tạo tài khoản nhân viên');
      setEditing(null);
      load();
    } catch (e) { message.error(e.message); }
  };
  const toggle = async (s) => {
    try { const res = await staffApi.setActive(s.id, !s.trangThai); message.success(res.message); load(); }
    catch (e) { message.error(e.message); }
  };
  const doReset = async () => {
    if (newPwd.length < 6) { message.warning('Mật khẩu tối thiểu 6 ký tự'); return; }
    try { const res = await staffApi.resetPassword(resetting.id, newPwd); message.success(res.message); setResetting(null); setNewPwd(''); }
    catch (e) { message.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Nhân viên & phân quyền" subtitle="Quản trị tài khoản nhân viên và vai trò trong hệ thống"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null)}>Thêm nhân viên</Button>} />
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card variant="borderless">
            <Table rowKey="id" loading={loading} dataSource={data} pagination={false} scroll={{ x: 760 }}
              columns={[
                { title: 'Nhân viên', dataIndex: 'hoTen', render: (v, r) => <Space><Avatar style={{ background: '#0f172a' }}>{v.split(' ').pop()[0].toUpperCase()}</Avatar><div><b>{v}</b><div style={{ fontSize: 12, color: '#64748b' }}>@{r.username}</div></div></Space> },
                { title: 'Vai trò', dataIndex: 'role', width: 180, render: (v) => <Tag color={ROLE_COLORS[v]}>{ROLE_LABELS[v]}</Tag> },
                { title: 'Liên hệ', render: (_, r) => <><div>{r.soDienThoai || '—'}</div><div style={{ fontSize: 12, color: '#64748b' }}>{r.email}</div></> },
                { title: 'Ngày tạo', dataIndex: 'ngayTao', width: 110, render: fmtDate },
                { title: 'Trạng thái', dataIndex: 'trangThai', width: 110, render: (v) => (v ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Đã khóa</Tag>) },
                {
                  title: '', width: 130, fixed: 'right', render: (_, r) => (
                    <Space>
                      <Tooltip title="Chỉnh sửa / đổi vai trò"><Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)} /></Tooltip>
                      <Tooltip title="Đặt lại mật khẩu"><Button size="small" icon={<KeyOutlined />} onClick={() => setResetting(r)} /></Tooltip>
                      {r.username !== user?.username && (
                        <Popconfirm title={r.trangThai ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản?'} onConfirm={() => toggle(r)}>
                          <Button size="small" danger={r.trangThai} icon={r.trangThai ? <LockOutlined /> : <UnlockOutlined />} />
                        </Popconfirm>
                      )}
                    </Space>
                  )
                }
              ]} />
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card title="Ma trận phân quyền" variant="borderless">
            <Table size="small" pagination={false} rowKey={(r) => r[0]} dataSource={PERMISSIONS}
              columns={[
                { title: 'Chức năng', render: (_, r) => <span style={{ fontSize: 12 }}>{r[0]}</span> },
                ...['QT', 'TN', 'SL', 'Kho'].map((t, i) => ({
                  title: <Tooltip title={STAFF_ROLE_OPTIONS[i].label}>{t}</Tooltip>, align: 'center', width: 46,
                  render: (_, r) => (r[i + 1] ? <CheckOutlined style={{ color: '#16a34a' }} /> : <CloseOutlined style={{ color: '#e2e8f0' }} />)
                }))
              ]} />
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>QT: Quản trị · TN: Tiếp nhận · SL: Sàng lọc · Kho: Quản lý kho</Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      <Modal title={editing?.id ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'} open={!!editing} onCancel={() => setEditing(null)} onOk={save} okText="Lưu" cancelText="Hủy" destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          {!editing?.id && (
            <Row gutter={12}>
              <Col span={12}><Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, min: 4, message: 'Tối thiểu 4 ký tự' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}><Input.Password /></Form.Item></Col>
            </Row>
          )}
          <Form.Item name="hoTen" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}><Select options={STAFF_ROLE_OPTIONS} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="soDienThoai" label="Điện thoại"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title={`Đặt lại mật khẩu — ${resetting?.hoTen}`} open={!!resetting} onCancel={() => setResetting(null)} onOk={doReset} okText="Đặt lại" cancelText="Hủy">
        <Input.Password value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" />
      </Modal>
    </>
  );
}
