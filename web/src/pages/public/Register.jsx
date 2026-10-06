import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Col, DatePicker, Form, Input, InputNumber, Radio, Row, Select, Space, Steps, Typography } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

const STEPS = [
  { title: 'Tài khoản', fields: ['username', 'password', 'confirm'] },
  { title: 'Thông tin cá nhân', fields: ['hoTen', 'ngaySinh', 'gioiTinh', 'cccd', 'soDienThoai', 'email'] },
  { title: 'Sức khỏe', fields: ['nhomMau', 'heRh', 'canNang', 'diaChi'] }
];

export default function Register() {
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { message } = App.useApp();

  const next = async () => {
    await form.validateFields(STEPS[step].fields);
    setStep(step + 1);
  };

  const submit = async () => {
    await form.validateFields(STEPS[2].fields);
    const v = form.getFieldsValue(true);
    setLoading(true);
    setError(null);
    try {
      await authApi.registerDonor({
        username: v.username.trim(),
        password: v.password,
        hoTen: v.hoTen.trim(),
        ngaySinh: v.ngaySinh.format('YYYY-MM-DD'),
        gioiTinh: v.gioiTinh,
        cccd: v.cccd.trim(),
        soDienThoai: v.soDienThoai.trim(),
        email: v.email || null,
        nhomMau: v.nhomMau === 'unknown' ? null : v.nhomMau,
        heRh: v.nhomMau === 'unknown' ? null : v.heRh,
        canNang: v.canNang || null,
        diaChi: v.diaChi || null
      });
      await login(v.username.trim(), v.password);
      message.success('Tạo tài khoản thành công. Chào mừng bạn đến với Giọt Hồng!');
      navigate('/me', { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const nhomMau = Form.useWatch('nhomMau', form);

  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <h2>Trở thành người hiến máu tình nguyện</h2>
        <Typography.Paragraph style={{ color: '#ffe4e6', fontSize: 16 }}>
          Một lần hiến máu có thể cứu sống đến 3 người. Tạo tài khoản để đăng ký hiến máu, theo dõi lịch sử và nhận thông báo khi cộng đồng cần bạn.
        </Typography.Paragraph>
        <Space direction="vertical" size={12} style={{ marginTop: 16 }}>
          {['Miễn phí khám sàng lọc & xét nghiệm', 'Giấy chứng nhận hiến máu tình nguyện', 'Được ưu tiên khi bản thân/gia đình cần truyền máu'].map((t) => (
            <Space key={t}><CheckCircleFilled /> {t}</Space>
          ))}
        </Space>
      </div>
      <div className="auth-form">
        <div className="box" style={{ maxWidth: 520 }}>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>Đăng ký tài khoản</Typography.Title>
          <Typography.Paragraph type="secondary">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></Typography.Paragraph>
          <Steps size="small" current={step} items={STEPS.map((s) => ({ title: s.title }))} style={{ margin: '20px 0 28px' }} />
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

          <Form form={form} layout="vertical" requiredMark="optional" initialValues={{ gioiTinh: 'Nam', heRh: 'Rh+', nhomMau: 'unknown' }}>
            <div style={{ display: step === 0 ? 'block' : 'none' }}>
              <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Nhập tên đăng nhập' }, { min: 4, message: 'Tối thiểu 4 ký tự' }, { pattern: /^[a-zA-Z0-9._]+$/, message: 'Chỉ dùng chữ không dấu, số, dấu chấm hoặc gạch dưới' }]}>
                <Input placeholder="vd: nguyenvanb" />
              </Form.Item>
              <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }]}>
                <Input.Password />
              </Form.Item>
              <Form.Item name="confirm" label="Nhập lại mật khẩu" dependencies={['password']} rules={[{ required: true, message: 'Nhập lại mật khẩu' },
                ({ getFieldValue }) => ({ validator: (_, v) => (!v || v === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu không khớp'))) })]}>
                <Input.Password />
              </Form.Item>
            </div>

            <div style={{ display: step === 1 ? 'block' : 'none' }}>
              <Form.Item name="hoTen" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                <Input placeholder="Như trên CCCD" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="ngaySinh" label="Ngày sinh" rules={[{ required: true, message: 'Chọn ngày sinh' },
                    { validator: (_, v) => { if (!v) return Promise.resolve(); const age = dayjs().diff(v, 'year'); return age >= 18 && age <= 60 ? Promise.resolve() : Promise.reject(new Error('Người hiến máu phải từ 18 đến 60 tuổi')); } }]}>
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs())} defaultPickerValue={dayjs().subtract(25, 'year')} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="gioiTinh" label="Giới tính" rules={[{ required: true }]}>
                    <Radio.Group optionType="button" buttonStyle="solid" options={['Nam', 'Nữ', 'Khác']} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="cccd" label="Số CCCD" rules={[{ required: true, message: 'Nhập số CCCD' }, { pattern: /^\d{12}$/, message: 'CCCD gồm đúng 12 chữ số' }]}>
                <Input maxLength={12} placeholder="12 chữ số" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="soDienThoai" label="Số điện thoại" rules={[{ required: true, message: 'Nhập số điện thoại' }, { pattern: /^0\d{9}$/, message: 'Số điện thoại gồm 10 số, bắt đầu bằng 0' }]}>
                    <Input maxLength={10} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div style={{ display: step === 2 ? 'block' : 'none' }}>
              <Row gutter={12}>
                <Col span={14}>
                  <Form.Item name="nhomMau" label="Nhóm máu">
                    <Select options={[{ value: 'unknown', label: 'Chưa biết (xét nghiệm khi hiến)' }, ...['A', 'B', 'AB', 'O'].map((v) => ({ value: v, label: `Nhóm ${v}` }))]} />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="heRh" label="Hệ Rh">
                    <Select disabled={nhomMau === 'unknown'} options={[{ value: 'Rh+', label: 'Rh+' }, { value: 'Rh-', label: 'Rh−' }]} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="canNang" label="Cân nặng (kg)">
                <InputNumber min={30} max={200} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="diaChi" label="Địa chỉ liên hệ">
                <Input.TextArea rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
              </Form.Item>
            </div>
          </Form>

          <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
            <Button disabled={step === 0} onClick={() => setStep(step - 1)}>Quay lại</Button>
            {step < 2 ? <Button type="primary" onClick={next}>Tiếp tục</Button> : <Button type="primary" loading={loading} onClick={submit}>Hoàn tất đăng ký</Button>}
          </Space>
        </div>
      </div>
    </div>
  );
}
