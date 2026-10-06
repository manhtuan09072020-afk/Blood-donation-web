import { useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag } from 'antd';
import { PlusOutlined, EditOutlined, BankOutlined } from '@ant-design/icons';
import { catalogApi } from '../../api';
import { PageHeader } from '../../components/common';
import { fmtMl } from '../../utils/format';

export default function Facilities() {
  const { message } = App.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = () => { setLoading(true); catalogApi.getFacilities(true).then(setData).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openForm = (f) => { setEditing(f || {}); form.resetFields(); if (f) form.setFieldsValue(f); };
  const save = async () => {
    const v = await form.validateFields();
    try {
      if (editing?.id) await catalogApi.updateFacility(editing.id, v); else await catalogApi.createFacility(v);
      message.success('Đã lưu cơ sở y tế');
      setEditing(null);
      load();
    } catch (e) { message.error(e.message); }
  };
  const toggle = async (f) => {
    try { const res = await catalogApi.setFacilityActive(f.id, !f.trangThai); message.success(res.message); load(); }
    catch (e) { message.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Cơ sở y tế" subtitle="Danh mục bệnh viện / cơ sở y tế tiếp nhận máu khi xuất kho"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null)}>Thêm cơ sở y tế</Button>} />
      <Card variant="borderless">
        <Table rowKey="id" loading={loading} dataSource={data} pagination={false}
          columns={[
            { title: 'Cơ sở y tế', dataIndex: 'tenCoSo', render: (v) => <Space><BankOutlined style={{ color: '#c8102e' }} /><b>{v}</b></Space> },
            { title: 'Địa chỉ', dataIndex: 'diaChi' },
            { title: 'Điện thoại', dataIndex: 'soDienThoai', width: 140 },
            { title: 'Số phiếu đã nhận', dataIndex: 'soPhieuXuat', width: 150, align: 'center' },
            { title: 'Tổng máu đã nhận', dataIndex: 'tongDaNhan', width: 160, align: 'right', render: (v) => <b>{fmtMl(v)}</b>, sorter: (a, b) => a.tongDaNhan - b.tongDaNhan },
            { title: 'Trạng thái', dataIndex: 'trangThai', width: 130, render: (v) => (v ? <Tag color="green">Đang hợp tác</Tag> : <Tag>Ngừng</Tag>) },
            {
              title: '', width: 170, render: (_, r) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)}>Sửa</Button>
                  <Popconfirm title={r.trangThai ? 'Ngừng hợp tác?' : 'Kích hoạt lại?'} onConfirm={() => toggle(r)}>
                    <Button size="small" danger={r.trangThai}>{r.trangThai ? 'Ngừng' : 'Kích hoạt'}</Button>
                  </Popconfirm>
                </Space>
              )
            }
          ]} />
      </Card>
      <Modal title={editing?.id ? 'Sửa cơ sở y tế' : 'Thêm cơ sở y tế'} open={!!editing} onCancel={() => setEditing(null)} onOk={save} okText="Lưu" cancelText="Hủy" destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="tenCoSo" label="Tên cơ sở y tế" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item>
          <Form.Item name="diaChi" label="Địa chỉ"><Input /></Form.Item>
          <Form.Item name="soDienThoai" label="Điện thoại"><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
