import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Card, Popconfirm, Table, Typography, Steps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import DonorShell from './DonorShell';
import { registrationApi } from '../../api';
import { RegistrationStatusTag } from '../../components/common';
import { fmtDateTime } from '../../utils/format';

const FLOW = ['ChoDuyet', 'DaDuyet', 'DaSangLoc', 'DaHienMau'];

export default function DonorRegistrations() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    registrationApi.getMine().then(setData).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const cancel = async (id) => {
    try {
      const res = await registrationApi.cancel(id);
      message.success(res.message);
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <DonorShell>
      <Card style={{ borderRadius: 16 }} title={<Typography.Title level={4} style={{ margin: 0 }}>Lịch hẹn hiến máu</Typography.Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/campaigns')}>Đăng ký đợt mới</Button>}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{ pageSize: 8 }}
          expandable={{
            expandedRowRender: (r) => {
              const idx = FLOW.indexOf(r.trangThai);
              const failed = ['TuChoi', 'Huy'].includes(r.trangThai);
              return (
                <div style={{ padding: '8px 16px' }}>
                  <Steps size="small" current={failed ? 0 : idx} status={failed ? 'error' : idx === 3 ? 'finish' : 'process'}
                    items={[{ title: 'Chờ duyệt' }, { title: 'Đã duyệt' }, { title: 'Đạt sàng lọc' }, { title: 'Đã hiến máu' }]} />
                  {r.ghiChu && <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>Ghi chú: {r.ghiChu}</Typography.Paragraph>}
                </div>
              );
            }
          }}
          columns={[
            { title: 'Đợt hiến máu', dataIndex: 'tenDot', render: (v, r) => <><b>{v}</b><div style={{ color: '#64748b', fontSize: 12 }}>{r.tenDiem}</div></> },
            { title: 'Thời gian', dataIndex: 'ngayBatDau', render: fmtDateTime, width: 150 },
            { title: 'Ngày đăng ký', dataIndex: 'ngayDangKy', render: fmtDateTime, width: 150, responsive: ['md'] },
            { title: 'Trạng thái', dataIndex: 'trangThai', render: (v) => <RegistrationStatusTag value={v} />, width: 160 },
            {
              title: '', width: 90, render: (_, r) => ['ChoDuyet', 'DaDuyet'].includes(r.trangThai) && (
                <Popconfirm title="Hủy đăng ký này?" okText="Hủy đăng ký" cancelText="Không" onConfirm={() => cancel(r.id)}>
                  <Button danger size="small">Hủy</Button>
                </Popconfirm>
              )
            }
          ]}
        />
      </Card>
    </DonorShell>
  );
}
