import { useEffect, useState } from 'react';
import { App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DonorShell from './DonorShell';
import { donorApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/common';
import { GIOI_TINH_OPTIONS, NHOM_MAU_OPTIONS, RH_OPTIONS } from '../../utils/format';

export default function DonorProfile() {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { updateUser } = useAuth();
  const [me, setMe] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    donorApi.getMe().then((d) => {
      setMe(d);
      form.setFieldsValue({ ...d, ngaySinh: dayjs(d.ngaySinh) });
    });
  }, [form]);

  const save = async (v) => {
    setSaving(true);
    try {
      const res = await donorApi.updateMe({ ...v, ngaySinh: v.ngaySinh.format('YYYY-MM-DD') });
      message.success(res.message);
      updateUser({ hoTen: v.hoTen });
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!me) return <DonorShell><Loading /></DonorShell>;

  return (
    <DonorShell>
      <Card style={{ borderRadius: 16 }} title={<Typography.Title level={4} style={{ margin: 0 }}>Hồ sơ cá nhân & liên hệ</Typography.Title>}>
        <Form form={form} layout="vertical" onFinish={save}>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item name="hoTen" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="ngaySinh" label="Ngày sinh" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="gioiTinh" label="Giới tính" rules={[{ required: true }]}><Select options={GIOI_TINH_OPTIONS} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Số CCCD"><Input value={me.cccd} disabled /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Tên đăng nhập"><Input value={me.username} disabled /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="soDienThoai" label="Số điện thoại" rules={[{ required: true }, { pattern: /^0\d{9}$/, message: 'Số điện thoại gồm 10 số' }]}><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
            <Col xs={24}><Form.Item name="diaChi" label="Địa chỉ"><Input /></Form.Item></Col>
            <Col xs={12} md={8}><Form.Item name="nhomMau" label="Nhóm máu"><Select allowClear options={NHOM_MAU_OPTIONS} placeholder="Chưa biết" /></Form.Item></Col>
            <Col xs={12} md={8}><Form.Item name="heRh" label="Hệ Rh"><Select allowClear options={RH_OPTIONS} placeholder="Chưa biết" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="canNang" label="Cân nặng (kg)"><InputNumber min={30} max={200} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>Lưu thay đổi</Button>
        </Form>
      </Card>
    </DonorShell>
  );
}
