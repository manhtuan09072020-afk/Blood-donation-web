import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Divider, Form, Input, Space, Typography, Tag } from 'antd';
import { LockOutlined, UserOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useAuth, homePathFor, STAFF_ROLES } from '../../context/AuthContext';

const DEMO = [
  { u: 'admin', r: 'Quản trị viên' },
  { u: 'nv.tiepnhan01', r: 'NV tiếp nhận' },
  { u: 'nv.sangloc01', r: 'NV sàng lọc' },
  { u: 'nv.kho01', r: 'NV quản lý kho' },
  { u: 'nguyenvana', r: 'Người hiến máu' }
];

export default function Login() {
  const [form] = Form.useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onFinish = async ({ username, password }) => {
    setLoading(true);
    setError(null);
    try {
      const u = await login(username.trim(), password);
      message.success(`Xin chào, ${u.hoTen}!`);
      const from = location.state?.from;
      const allowedFrom = from && (STAFF_ROLES.includes(u.role) ? from.startsWith('/admin') : !from.startsWith('/admin'));
      navigate(allowedFrom ? from : homePathFor(u.role), { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <Tag color="#ffffff22" style={{ alignSelf: 'flex-start', border: 0, color: '#fff', padding: '4px 12px' }}>Hệ thống quản lý hiến máu nhân đạo</Tag>
        <h2>Chào mừng trở lại 👋<br />Cùng nhau lan tỏa những giọt máu hồng.</h2>
        <Space direction="vertical" size={14} style={{ marginTop: 24, fontSize: 15 }}>
          {['Đăng ký hiến máu trực tuyến nhanh chóng', 'Theo dõi lịch sử & ngày có thể hiến tiếp theo', 'Nhận thông báo khi bệnh viện cần nhóm máu của bạn'].map((t) => (
            <Space key={t}><CheckCircleFilled /> {t}</Space>
          ))}
        </Space>
      </div>
      <div className="auth-form">
        <div className="box">
          <Typography.Title level={2} style={{ marginBottom: 4 }}>Đăng nhập</Typography.Title>
          <Typography.Paragraph type="secondary">Dành cho người hiến máu và nhân viên hệ thống.</Typography.Paragraph>
          {params.get('expired') && <Alert type="warning" showIcon message="Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." style={{ marginBottom: 16 }} />}
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
          <Form form={form} layout="vertical" size="large" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}>
              <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 48 }}>Đăng nhập</Button>
          </Form>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            Chưa có tài khoản? <Link to="/register">Đăng ký người hiến máu</Link>
          </div>

          <Divider plain style={{ fontSize: 12, color: '#94a3b8' }}>Tài khoản demo (mật khẩu: Hienmau@123)</Divider>
          <Space wrap>
            {DEMO.map((d) => (
              <Button key={d.u} size="small" onClick={() => form.setFieldsValue({ username: d.u, password: 'Hienmau@123' })}>{d.r}</Button>
            ))}
          </Space>
        </div>
      </div>
    </div>
  );
}
