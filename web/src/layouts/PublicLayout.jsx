import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Button, Dropdown, Avatar, Badge, Space, Row, Col, Typography } from 'antd';
import {
  UserOutlined, LogoutOutlined, DashboardOutlined, BellOutlined, HistoryOutlined, FormOutlined, KeyOutlined,
  PhoneOutlined, MailOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { LogoMark } from '../components/common';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { notificationApi } from '../api';

export default function PublicLayout() {
  const { user, logout, isStaff, isDonor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [pwdOpen, setPwdOpen] = useState(false);

  useEffect(() => {
    if (!isDonor) return;
    const load = () => notificationApi.unreadCount().then((r) => setUnread(r.count)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [isDonor, location.pathname]);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const donorMenu = {
    items: [
      { key: '/me', icon: <DashboardOutlined />, label: 'Tổng quan của tôi' },
      { key: '/me/registrations', icon: <FormOutlined />, label: 'Lịch hẹn hiến máu' },
      { key: '/me/history', icon: <HistoryOutlined />, label: 'Lịch sử hiến máu' },
      { key: '/me/notifications', icon: <BellOutlined />, label: 'Thông báo' },
      { key: '/me/profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân' },
      { key: 'pwd', icon: <KeyOutlined />, label: 'Đổi mật khẩu' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true }
    ],
    onClick: ({ key }) => {
      if (key === 'logout') { logout(); navigate('/'); }
      else if (key === 'pwd') setPwdOpen(true);
      else navigate(key);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <header className="public-header">
        <div className="inner">
          <Link to="/" className="public-brand">
            <LogoMark size={38} />
            <div><b>Giọt Hồng</b><small>Hiến máu nhân đạo</small></div>
          </Link>
          <nav className="public-nav">
            <NavLink to="/" end>Trang chủ</NavLink>
            <NavLink to="/campaigns">Lịch hiến máu</NavLink>
            <a href="/#nhom-mau">Nhóm máu cần</a>
            <a href="/#quy-trinh">Quy trình</a>
            <a href="/#dieu-kien">Điều kiện hiến máu</a>
          </nav>
          <Space>
            {!user && (
              <>
                <Button onClick={() => navigate('/login')}>Đăng nhập</Button>
                <Button type="primary" onClick={() => navigate('/register')}>Đăng ký hiến máu</Button>
              </>
            )}
            {isStaff && (
              <>
                <Button type="primary" icon={<DashboardOutlined />} onClick={() => navigate('/admin')}>Trang quản trị</Button>
                <Button icon={<LogoutOutlined />} onClick={() => { logout(); navigate('/'); }} />
              </>
            )}
            {isDonor && (
              <>
                <Badge count={unread} size="small">
                  <Button shape="circle" icon={<BellOutlined />} onClick={() => navigate('/me/notifications')} />
                </Badge>
                <Dropdown menu={donorMenu} placement="bottomRight" trigger={['click']}>
                  <Button style={{ height: 42, borderRadius: 999, paddingInline: 6 }}>
                    <Space>
                      <Avatar size={30} style={{ background: '#c8102e' }}>{(user.hoTen || user.username).split(' ').pop()[0].toUpperCase()}</Avatar>
                      <span style={{ fontWeight: 600, paddingRight: 6 }}>{user.hoTen}</span>
                    </Space>
                  </Button>
                </Dropdown>
              </>
            )}
          </Space>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="container">
          <Row gutter={[32, 24]}>
            <Col xs={24} md={10}>
              <Space align="center" style={{ marginBottom: 12 }}>
                <LogoMark size={36} />
                <Typography.Title level={4} style={{ margin: 0, color: '#fff' }}>Giọt Hồng</Typography.Title>
              </Space>
              <p style={{ maxWidth: 380 }}>Hệ thống quản lý hiến máu nhân đạo — kết nối người hiến máu tình nguyện với các cơ sở y tế, vì một cộng đồng khỏe mạnh.</p>
            </Col>
            <Col xs={24} sm={12} md={7}>
              <h4>Liên kết</h4>
              <Space direction="vertical">
                <Link to="/campaigns">Lịch hiến máu</Link>
                <Link to="/register">Đăng ký tài khoản</Link>
                <a href="/#dieu-kien">Điều kiện hiến máu</a>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={7}>
              <h4>Liên hệ</h4>
              <Space direction="vertical">
                <span><EnvironmentOutlined /> 106 Thiên Phước, Tân Bình, TP.HCM</span>
                <span><PhoneOutlined /> 1900 1234 (8:00 – 17:00)</span>
                <span><MailOutlined /> lienhe@giothong.vn</span>
              </Space>
            </Col>
          </Row>
          <div style={{ borderTop: '1px solid #1e293b', marginTop: 32, paddingTop: 16, fontSize: 13, color: '#64748b' }}>
            © {new Date().getFullYear()} Giọt Hồng — Khóa luận CNTT-KLCN265, Trường ĐH Công Thương TP.HCM.
          </div>
        </div>
      </footer>
      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}
