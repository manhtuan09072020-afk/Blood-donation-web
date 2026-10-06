import { useState } from 'react';
import { App, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { donorApi } from '../api';
import { GIOI_TINH_OPTIONS, NHOM_MAU_OPTIONS, RH_OPTIONS } from '../utils/format';

// Nhân viên tạo hồ sơ cho người hiến đến trực tiếp (chưa có tài khoản).
// Tài khoản = số CCCD, mật khẩu ban đầu = số điện thoại.
export default function CreateDonorModal({ open, onClose, onCreated }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { modal, message } = App.useApp();

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const res = await donorApi.create({ ...v, ngaySinh: v.ngaySinh.format('YYYY-MM-DD') });
      form.resetFields();
      onCreated?.(res.donor);
      onClose();
      modal.success({
        title: 'Đã tạo hồ sơ người hiến máu',
        content: (
          <div>
            <p><b>{res.donor.hoTen}</b> có thể đăng nhập web / ứng dụng di động bằng:</p>
            <p>Tài khoản: <Typography.Text code copyable>{res.username}</Typography.Text><br />
              Mật khẩu ban đầu: <Typography.Text code copyable>{res.matKhauBanDau}</Typography.Text></p>
            <p style={{ color: '#64748b' }}>Hãy nhắc người hiến đổi mật khẩu sau lần đăng nhập đầu tiên.</p>
          </div>
        )
      });
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Thêm người hiến máu mới" open={open} onCancel={onClose} onOk={submit} okText="Tạo hồ sơ" cancelText="Hủy" confirmLoading={saving} width={640} destroyOnHidden>
      <Typography.Paragraph type="secondary">Dành cho người hiến đến trực tiếp lần đầu. Hệ thống tạo tài khoản với tên đăng nhập là số CCCD và mật khẩu ban đầu là số điện thoại.</Typography.Paragraph>
      <Form form={form} layout="vertical" initialValues={{ gioiTinh: 'Nam' }}>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="hoTen" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="cccd" label="Số CCCD" rules={[{ required: true, pattern: /^\d{12}$/, message: 'CCCD gồm 12 chữ số' }]}><Input maxLength={12} /></Form.Item></Col>
          <Col span={8}>
            <Form.Item name="ngaySinh" label="Ngày sinh" rules={[{ required: true, message: 'Chọn ngày sinh' },
              { validator: (_, d) => (!d || (dayjs().diff(d, 'year') >= 18 && dayjs().diff(d, 'year') <= 60) ? Promise.resolve() : Promise.reject(new Error('Từ 18 đến 60 tuổi'))) }]}>
              <DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày sinh" style={{ width: '100%' }} defaultPickerValue={dayjs().subtract(25, 'year')} />
            </Form.Item>
          </Col>
          <Col span={8}><Form.Item name="gioiTinh" label="Giới tính" rules={[{ required: true }]}><Select options={GIOI_TINH_OPTIONS} /></Form.Item></Col>
          <Col span={8}><Form.Item name="soDienThoai" label="Điện thoại" rules={[{ required: true, pattern: /^0\d{9}$/, message: '10 số, bắt đầu bằng 0' }]}><Input maxLength={10} /></Form.Item></Col>
          <Col span={8}><Form.Item name="nhomMau" label="Nhóm máu"><Select allowClear placeholder="Chưa biết" options={NHOM_MAU_OPTIONS} /></Form.Item></Col>
          <Col span={8}><Form.Item name="heRh" label="Hệ Rh"><Select allowClear placeholder="Chưa biết" options={RH_OPTIONS} /></Form.Item></Col>
          <Col span={8}><Form.Item name="canNang" label="Cân nặng (kg)"><InputNumber min={30} max={200} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={12}><Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="diaChi" label="Địa chỉ"><Input /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  );
}
