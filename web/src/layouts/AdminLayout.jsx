import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, Popover, List, Typography, Button, Space, Breadcrumb } from 'antd';
import {
  DashboardOutlined, TeamOutlined, CalendarOutlined, FormOutlined, MedicineBoxOutlined, ExperimentOutlined,
  DatabaseOutlined, ExportOutlined, HeartOutlined, BankOutlined, NotificationOutlined, BarChartOutlined,
  SafetyCertificateOutlined, BellOutlined, LogoutOutlined, KeyOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  GlobalOutlined, WarningOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useAuth, ROLES, ROLE_LABELS } from '../context/AuthContext';
import { LogoMark, BloodBadge } from '../components/common';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { inventoryApi } from '../api';
import { fmtMl } from '../utils/format';

const { Sider, Header, Content } = Layout;
const R = ROLES;
const ALL = [R.QUAN_TRI, R.NHAN_VIEN_TIEP_NHAN, R.NHAN_VIEN_SANG_LOC, R.NHAN_VIEN_KHO];

// Menu theo nhóm nghiệp vụ, mỗi mục khai báo các vai trò được phép
const MENU = [
  { key: '/admin', icon: <DashboardOutlined />, label: 'Tổng quan', roles: ALL },
  {
    type: 'group', label: 'HIẾN MÁU', children: [
      { key: '/admin/donors', icon: <TeamOutlined />, label: 'Người hiến máu', roles: ALL },
      { key: '/admin/campaigns', icon: <CalendarOutlined />, label: 'Đợt & điểm hiến máu', roles: [R.QUAN_TRI] },
      { key: '/admin/registrations', icon: <FormOutlined />, label: 'Đăng ký hiến máu', roles: [R.QUAN_TRI, R.NHAN_VIEN_TIEP_NHAN, R.NHAN_VIEN_SANG_LOC] },
      { key: '/admin/screening', icon: <MedicineBoxOutlined />, label: 'Khám sàng lọc', roles: [R.QUAN_TRI, R.NHAN_VIEN_SANG_LOC, R.NHAN_VIEN_TIEP_NHAN] },
      { key: '/admin/collection', icon: <ExperimentOutlined />, label: 'Tiếp nhận máu', roles: [R.QUAN_TRI, R.NHAN_VIEN_TIEP_NHAN] }
    ]
  },
  {
    type: 'group', label: 'KHO MÁU', children: [
      { key: '/admin/inventory', icon: <DatabaseOutlined />, label: 'Tồn kho máu', roles: [R.QUAN_TRI, R.NHAN_VIEN_KHO, R.NHAN_VIEN_TIEP_NHAN] },
      { key: '/admin/issues', icon: <ExportOutlined />, label: 'Xuất kho', roles: [R.QUAN_TRI, R.NHAN_VIEN_KHO] },
      { key: '/admin/blood-groups', icon: <HeartOutlined />, label: 'Nhóm máu', roles: ALL },
      { key: '/admin/facilities', icon: <BankOutlined />, label: 'Cơ sở y tế', roles: [R.QUAN_TRI, R.NHAN_VIEN_KHO] }
    ]
  },
  {
    type: 'group', label: 'VẬN ĐỘNG & BÁO CÁO', children: [
      { key: '/admin/outreach', icon: <NotificationOutlined />, label: 'Thông báo & vận động', roles: [R.QUAN_TRI, R.NHAN_VIEN_KHO, R.NHAN_VIEN_TIEP_NHAN] },
      { key: '/admin/reports', icon: <BarChartOutlined />, label: 'Báo cáo thống kê', roles: [R.QUAN_TRI, R.NHAN_VIEN_KHO, R.NHAN_VIEN_TIEP_NHAN] }
    ]
  },
  {
    type: 'group', label: 'HỆ THỐNG', children: [
      { key: '/admin/staff', icon: <SafetyCertificateOutlined />, label: 'Nhân viên & phân quyền', roles: [R.QUAN_TRI] }
    ]
  }
];

function filterMenu(items, role) {
  return items
    .map((item) => {
      if (item.type === 'group') {
        const children = filterMenu(item.children, role);
        return children.length ? { ...item, children } : null;
      }
      if (!item.roles.includes(role)) return null;
      const { roles, ...rest } = item;
      return rest;
    })
    .filter(Boolean);
}

function flatLabels(items) {
  return items.flatMap((i) => (i.type === 'group' ? flatLabels(i.children) : [i]));
}

export default function AdminLayout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [alerts, setAlerts] = useState(null);

  const items = useMemo(() => filterMenu(MENU, user?.role), [user?.role]);
  const flat = useMemo(() => flatLabels(MENU), []);

  const selectedKey = useMemo(() => {
    const match = flat.map((i) => i.key).filter((k) => location.pathname === k || location.pathname.startsWith(k + '/'));
    return match.sort((a, b) => b.length - a.length)[0] || '/admin';
  }, [location.pathname, flat]);
  const current = flat.find((i) => i.key === selectedKey);

  const canSeeInventory = hasRole(R.QUAN_TRI, R.NHAN_VIEN_KHO, R.NHAN_VIEN_TIEP_NHAN);
  useEffect(() => {
    if (!canSeeInventory) return;
    inventoryApi.getAlerts().then(setAlerts).catch(() => {});
    const t = setInterval(() => inventoryApi.getAlerts().then(setAlerts).catch(() => {}), 120000);
    return () => clearInterval(t);
  }, [canSeeInventory]);

  const alertCount = alerts ? alerts.nhomMauThieu.length + alerts.loSapHetHan.length : 0;

  const alertContent = (
    <div style={{ width: 340 }}>
      {alertCount === 0 ? (
        <Typography.Text type="secondary">Kho máu ổn định, không có cảnh báo.</Typography.Text>
      ) : (
        <List
          size="small"
          dataSource={[
            ...(alerts?.nhomMauThieu || []).map((g) => ({ type: 'low', g })),
            ...(alerts?.loSapHetHan || []).slice(0, 5).map((u) => ({ type: 'exp', u }))
          ]}
          renderItem={(it) => it.type === 'low' ? (
            <List.Item>
              <Space><WarningOutlined style={{ color: '#dc2626' }} /><BloodBadge nhomMau={it.g.nhomMau} heRh={it.g.heRh} />
                <span>Tồn {fmtMl(it.g.tonKho)} / ngưỡng {fmtMl(it.g.nguongCanhBao)}</span></Space>
            </List.Item>
          ) : (
            <List.Item>
              <Space><ClockCircleOutlined style={{ color: '#f59e0b' }} /><span><b>{it.u.maLoMau}</b> còn {it.u.soNgayConLai} ngày</span></Space>
            </List.Item>
          )}
        />
      )}
      <Button type="link" block onClick={() => navigate('/admin/inventory?tab=alerts')}>Xem tất cả cảnh báo kho</Button>
    </div>
  );

  const userMenu = {
    items: [
      { key: 'site', icon: <GlobalOutlined />, label: 'Xem trang công khai' },
      { key: 'pwd', icon: <KeyOutlined />, label: 'Đổi mật khẩu' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true }
    ],
    onClick: ({ key }) => {
      if (key === 'logout') { logout(); navigate('/login'); }
      if (key === 'pwd') setPwdOpen(true);
      if (key === 'site') navigate('/');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={260} collapsedWidth={76} collapsed={collapsed} theme="dark" style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }} className="no-print">
        <Link to="/admin" className="admin-logo">
          <LogoMark />
          {!collapsed && <div className="logo-text"><b>Giọt Hồng</b><small>Quản lý hiến máu nhân đạo</small></div>}
        </Link>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={items} onClick={({ key }) => navigate(key)} style={{ paddingTop: 8, borderInlineEnd: 0 }} />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Space size={16}>
            <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
            <Breadcrumb items={[{ title: <Link to="/admin">Quản trị</Link> }, ...(current && current.key !== '/admin' ? [{ title: current.label }] : [])]} />
          </Space>
          <Space size={18}>
            {canSeeInventory && (
              <Popover content={alertContent} title="Cảnh báo kho máu" trigger="click" placement="bottomRight">
                <Badge count={alertCount} size="small" offset={[-2, 2]}>
                  <Button shape="circle" icon={<BellOutlined />} />
                </Badge>
              </Popover>
            )}
            <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
              <div className="admin-user-chip">
                <Avatar style={{ background: '#c8102e' }}>{(user?.hoTen || user?.username || '?').split(' ').pop()[0].toUpperCase()}</Avatar>
                <div className="meta">
                  <b>{user?.hoTen || user?.username}</b>
                  <span>{ROLE_LABELS[user?.role]}</span>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </Layout>
  );
}
