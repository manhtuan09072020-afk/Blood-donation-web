import { Card, Col, Menu, Row } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardOutlined, FormOutlined, HistoryOutlined, BellOutlined, UserOutlined } from '@ant-design/icons';

const ITEMS = [
  { key: '/me', icon: <DashboardOutlined />, label: 'Tổng quan' },
  { key: '/me/registrations', icon: <FormOutlined />, label: 'Lịch hẹn hiến máu' },
  { key: '/me/history', icon: <HistoryOutlined />, label: 'Lịch sử hiến máu' },
  { key: '/me/notifications', icon: <BellOutlined />, label: 'Thông báo' },
  { key: '/me/profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân' }
];

// Khung chung cho khu vực tài khoản người hiến máu
export default function DonorShell({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div className="container" style={{ padding: '32px 20px 60px' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={6}>
          <Card styles={{ body: { padding: 8 } }} style={{ borderRadius: 16, position: 'sticky', top: 90 }}>
            <Menu mode="inline" selectedKeys={[pathname]} items={ITEMS} onClick={({ key }) => navigate(key)} style={{ borderInlineEnd: 0 }} />
          </Card>
        </Col>
        <Col xs={24} md={18}>{children}</Col>
      </Row>
    </div>
  );
}
