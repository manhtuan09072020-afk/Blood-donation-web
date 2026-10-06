import { Card, Tag, Space, Typography, Empty, Spin, Result, Button } from 'antd';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DANG_KY_STATUS, DOT_STATUS, KHO_STATUS, LOAI_THONG_BAO, bloodLabel } from '../utils/format';

export function BloodBadge({ nhomMau, heRh, size }) {
  const cls = ['blood-badge', !nhomMau ? 'unknown' : heRh === 'Rh-' ? 'neg' : '', size === 'lg' ? 'lg' : ''].join(' ');
  return <span className={cls}>{bloodLabel(nhomMau, heRh)}</span>;
}

export function LogoMark({ size = 36 }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 64 64">
        <path d="M32 4C32 4 12 27 12 40a20 20 0 0 0 40 0C52 27 32 4 32 4z" fill="#fff" />
        <path d="M25 40h14M32 33v14" stroke="#c8102e" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function makeTag(map) {
  return function StatusTag({ value }) {
    const s = map[value] || { label: value, color: 'default' };
    return <Tag color={s.color} bordered={false} style={{ fontWeight: 600 }}>{s.label}</Tag>;
  };
}
export const RegistrationStatusTag = makeTag(DANG_KY_STATUS);
export const CampaignStatusTag = makeTag(DOT_STATUS);
export const UnitStatusTag = makeTag(KHO_STATUS);
export const NotificationTypeTag = makeTag(LOAI_THONG_BAO);

export function PageHeader({ title, subtitle, extra }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {extra && <Space wrap>{extra}</Space>}
    </div>
  );
}

export function StatCard({ icon, label, value, color = '#c8102e', bg, foot, onClick }) {
  return (
    <Card className="stat-card" variant="borderless" hoverable={!!onClick} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
        </div>
        <div className="stat-icon" style={{ color, background: bg || `${color}14` }}>{icon}</div>
      </div>
      {foot && <div className="stat-foot">{foot}</div>}
    </Card>
  );
}

export function Loading({ tip = 'Đang tải dữ liệu...' }) {
  return (
    <div style={{ padding: 80, textAlign: 'center' }}>
      <Spin size="large" />
      <div style={{ marginTop: 12, color: '#64748b' }}>{tip}</div>
    </div>
  );
}

export function EmptyBox({ text = 'Chưa có dữ liệu' }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />;
}

export function InfoRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px dashed #eef0f4' }}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{children}</span>
    </div>
  );
}

// Chặn truy cập theo đăng nhập / vai trò
export function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <Result
        status="403"
        title="Không có quyền truy cập"
        subTitle="Tài khoản của bạn không được phân quyền cho chức năng này."
        extra={<Link to="/"><Button type="primary">Về trang chủ</Button></Link>}
      />
    );
  }
  return children;
}
