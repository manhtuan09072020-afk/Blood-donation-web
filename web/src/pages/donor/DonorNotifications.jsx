import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Avatar, Badge, Button, Card, List, Segmented, Typography } from 'antd';
import { BellOutlined, HeartFilled, CalendarOutlined, NotificationOutlined, CheckOutlined } from '@ant-design/icons';
import DonorShell from './DonorShell';
import { notificationApi } from '../../api';
import { NotificationTypeTag } from '../../components/common';
import { fmtDateTime, fromNow } from '../../utils/format';

const ICONS = {
  KeuGoiHienMau: { icon: <HeartFilled />, bg: '#fee2e2', color: '#dc2626' },
  NhacLich: { icon: <CalendarOutlined />, bg: '#dbeafe', color: '#2563eb' },
  ThongBaoChung: { icon: <NotificationOutlined />, bg: '#f1f5f9', color: '#475569' }
};

export default function DonorNotifications() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => notificationApi.getMine().then(setData).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const markRead = async (n) => {
    if (n.daDoc) return;
    await notificationApi.markRead(n.id);
    setData((d) => d.map((x) => (x.id === n.id ? { ...x, daDoc: true } : x)));
  };

  const markAll = async () => {
    const res = await notificationApi.markAllRead();
    message.success(res.message);
    load();
  };

  const shown = filter === 'all' ? data : filter === 'unread' ? data.filter((n) => !n.daDoc) : data.filter((n) => n.loai === filter);
  const unread = data.filter((n) => !n.daDoc).length;

  return (
    <DonorShell>
      <Card style={{ borderRadius: 16 }}
        title={<Typography.Title level={4} style={{ margin: 0 }}><BellOutlined /> Thông báo {unread > 0 && <Badge count={unread} style={{ marginLeft: 6 }} />}</Typography.Title>}
        extra={<Button icon={<CheckOutlined />} onClick={markAll} disabled={!unread}>Đánh dấu tất cả đã đọc</Button>}>
        <Segmented value={filter} onChange={setFilter} style={{ marginBottom: 12 }} options={[
          { label: 'Tất cả', value: 'all' }, { label: `Chưa đọc (${unread})`, value: 'unread' },
          { label: 'Kêu gọi', value: 'KeuGoiHienMau' }, { label: 'Nhắc lịch', value: 'NhacLich' }, { label: 'Chung', value: 'ThongBaoChung' }
        ]} />
        <List
          loading={loading}
          dataSource={shown}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: 'Không có thông báo' }}
          renderItem={(n) => {
            const ic = ICONS[n.loai] || ICONS.ThongBaoChung;
            return (
              <List.Item
                onClick={() => markRead(n)}
                style={{ cursor: 'pointer', background: n.daDoc ? 'transparent' : '#fff7f8', borderRadius: 12, padding: '14px 16px', marginBottom: 6 }}
                actions={n.dotId ? [<Button key="d" type="link" onClick={(e) => { e.stopPropagation(); markRead(n); navigate(`/campaigns/${n.dotId}`); }}>Xem đợt hiến</Button>] : []}
              >
                <List.Item.Meta
                  avatar={<Badge dot={!n.daDoc}><Avatar style={{ background: ic.bg, color: ic.color }} icon={ic.icon} /></Badge>}
                  title={<span style={{ fontWeight: n.daDoc ? 500 : 700 }}>{n.tieuDe} <NotificationTypeTag value={n.loai} /></span>}
                  description={<>
                    <div style={{ color: '#334155' }}>{n.noiDung}</div>
                    <div style={{ fontSize: 12, marginTop: 4 }} title={fmtDateTime(n.ngayGui)}>{fromNow(n.ngayGui)}</div>
                  </>}
                />
              </List.Item>
            );
          }}
        />
      </Card>
    </DonorShell>
  );
}
