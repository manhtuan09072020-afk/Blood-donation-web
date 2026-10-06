import { useEffect, useMemo, useState } from 'react';
import { Col, Input, Row, Segmented, Select, Skeleton, Space, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { campaignApi } from '../../api';
import { CampaignCard } from './Home';
import { EmptyBox } from '../../components/common';

export default function Campaigns() {
  const [list, setList] = useState(null);
  const [sites, setSites] = useState([]);
  const [status, setStatus] = useState('upcoming');
  const [keyword, setKeyword] = useState('');
  const [siteId, setSiteId] = useState();

  useEffect(() => {
    campaignApi.getSites().then(setSites).catch(() => {});
  }, []);

  useEffect(() => {
    setList(null);
    const trangThai = status === 'upcoming' ? 'DangDienRa,SapDienRa' : 'DaKetThuc';
    campaignApi.getAll({ trangThai, diemId: siteId }).then(setList).catch(() => setList([]));
  }, [status, siteId]);

  const filtered = useMemo(() => {
    if (!list) return null;
    const kw = keyword.trim().toLowerCase();
    const items = kw ? list.filter((c) => `${c.tenDot} ${c.tenDiem} ${c.diaChi}`.toLowerCase().includes(kw)) : list;
    return [...items].sort((a, b) => (status === 'upcoming' ? dayjs(a.ngayBatDau) - dayjs(b.ngayBatDau) : dayjs(b.ngayBatDau) - dayjs(a.ngayBatDau)));
  }, [list, keyword, status]);

  return (
    <div className="container" style={{ padding: '40px 20px 60px' }}>
      <Typography.Title level={2} style={{ marginBottom: 4 }}>Lịch & địa điểm hiến máu</Typography.Title>
      <Typography.Paragraph type="secondary">Tìm đợt hiến máu phù hợp với thời gian và nơi ở của bạn.</Typography.Paragraph>

      <Space wrap size={12} style={{ margin: '12px 0 24px' }}>
        <Segmented value={status} onChange={setStatus} options={[{ label: 'Sắp & đang diễn ra', value: 'upcoming' }, { label: 'Đã kết thúc', value: 'past' }]} />
        <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm theo tên đợt, địa điểm…" style={{ width: 300 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <Select allowClear placeholder="Tất cả điểm hiến máu" style={{ width: 280 }} value={siteId} onChange={setSiteId}
          options={sites.map((s) => ({ value: s.id, label: s.tenDiem }))} />
      </Space>

      {!filtered ? <Skeleton active /> : filtered.length === 0 ? <EmptyBox text="Không có đợt hiến máu phù hợp" /> : (
        <Row gutter={[20, 20]}>
          {filtered.map((c) => <Col xs={24} sm={12} lg={8} key={c.id}><CampaignCard c={c} /></Col>)}
        </Row>
      )}
    </div>
  );
}
