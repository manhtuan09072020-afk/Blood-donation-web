import { useEffect, useState } from 'react';
import { Card, Descriptions, Empty, Tag, Timeline, Typography, Segmented, Space } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, ClockCircleFilled, MinusCircleFilled } from '@ant-design/icons';
import DonorShell from './DonorShell';
import { donorApi } from '../../api';
import { Loading, RegistrationStatusTag } from '../../components/common';
import { fmtDate, fmtDateTime, fmtMl } from '../../utils/format';

export default function DonorHistory() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('donated');

  useEffect(() => { donorApi.getMyHistory().then(setData); }, []);

  if (!data) return <DonorShell><Loading /></DonorShell>;

  const items = filter === 'donated' ? data.filter((h) => h.ngayLayMau) : data;

  const iconOf = (h) => {
    if (h.ngayLayMau) return <CheckCircleFilled style={{ color: '#16a34a', fontSize: 18 }} />;
    if (h.trangThai === 'TuChoi') return <CloseCircleFilled style={{ color: '#dc2626', fontSize: 18 }} />;
    if (h.trangThai === 'Huy') return <MinusCircleFilled style={{ color: '#94a3b8', fontSize: 18 }} />;
    return <ClockCircleFilled style={{ color: '#2563eb', fontSize: 18 }} />;
  };

  return (
    <DonorShell>
      <Card style={{ borderRadius: 16 }}
        title={<Typography.Title level={4} style={{ margin: 0 }}>Lịch sử hiến máu</Typography.Title>}
        extra={<Segmented value={filter} onChange={setFilter} options={[{ label: 'Đã hiến', value: 'donated' }, { label: 'Tất cả', value: 'all' }]} />}>
        {items.length === 0 ? <Empty description="Bạn chưa có lần hiến máu nào. Hãy đăng ký đợt hiến máu đầu tiên!" /> : (
          <Timeline
            style={{ marginTop: 12 }}
            items={items.map((h) => ({
              dot: iconOf(h),
              children: (
                <Card size="small" style={{ borderRadius: 12, marginBottom: 8 }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                    <div>
                      <b>{h.tenDot}</b>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{h.tenDiem} · {fmtDate(h.ngayBatDau)}</div>
                    </div>
                    {h.ngayLayMau ? <Tag color="green" bordered={false} style={{ fontWeight: 700 }}>{fmtMl(h.theTich)}</Tag> : <RegistrationStatusTag value={h.trangThai} />}
                  </Space>
                  {(h.ngayKham || h.ngayLayMau) && (
                    <Descriptions size="small" column={{ xs: 1, sm: 2 }} style={{ marginTop: 10 }}>
                      {h.ngayKham && <Descriptions.Item label="Khám sàng lọc">{fmtDateTime(h.ngayKham)} — {h.ketQuaSangLoc === 'Dat' ? <Tag color="green">Đạt</Tag> : <Tag color="red">Không đạt</Tag>}</Descriptions.Item>}
                      {h.canNang && <Descriptions.Item label="Cân nặng">{h.canNang} kg</Descriptions.Item>}
                      {h.huyetAp && <Descriptions.Item label="Huyết áp">{h.huyetAp} mmHg</Descriptions.Item>}
                      {h.hemoglobin && <Descriptions.Item label="Hemoglobin">{h.hemoglobin} g/dL</Descriptions.Item>}
                      {h.lyDoKhongDat && <Descriptions.Item label="Lý do không đạt">{h.lyDoKhongDat}</Descriptions.Item>}
                      {h.ngayLayMau && <Descriptions.Item label="Thời điểm lấy máu">{fmtDateTime(h.ngayLayMau)}</Descriptions.Item>}
                      {h.maLoMau?.length > 0 && <Descriptions.Item label="Mã đơn vị máu">{h.maLoMau.join(', ')}</Descriptions.Item>}
                    </Descriptions>
                  )}
                </Card>
              )
            }))}
          />
        )}
      </Card>
    </DonorShell>
  );
}
