import { useEffect, useState } from 'react';
import { App, Button, Card, Col, Form, Input, InputNumber, Modal, Progress, Row, Space, Table, Tag, Typography, Tooltip } from 'antd';
import { EditOutlined, CheckOutlined, TeamOutlined, DatabaseOutlined } from '@ant-design/icons';
import { catalogApi } from '../../api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { BloodBadge, PageHeader } from '../../components/common';
import { fmtMl, COMPATIBILITY } from '../../utils/format';

const TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const split = (t) => ({ nhomMau: t.replace(/[+-]/, ''), heRh: t.endsWith('+') ? 'Rh+' : 'Rh-' });

export default function BloodGroups() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const canEdit = hasRole(ROLES.QUAN_TRI, ROLES.NHAN_VIEN_KHO);
  const [data, setData] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = () => catalogApi.getBloodGroups().then(setData);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const v = await form.validateFields();
    try {
      const res = await catalogApi.updateBloodGroup(editing.id, v);
      message.success(res.message);
      setEditing(null);
      load();
    } catch (e) { message.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Nhóm máu" subtitle="Danh mục nhóm máu hệ ABO và Rh, ngưỡng tồn kho an toàn và quy tắc tương thích truyền máu" />
      <Row gutter={[16, 16]}>
        {data.map((g) => {
          const pct = g.nguongCanhBao ? Math.min(100, Math.round((g.tonKho / g.nguongCanhBao) * 100)) : 100;
          return (
            <Col xs={24} sm={12} lg={6} key={g.nhomMau + g.heRh}>
              <Card variant="borderless" style={{ borderRadius: 16, height: '100%', border: g.canhBaoThieu ? '1px solid #fecaca' : undefined }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <BloodBadge nhomMau={g.nhomMau} heRh={g.heRh} size="lg" />
                  <Tag color={g.canhBaoThieu ? 'red' : 'green'} bordered={false}>{g.canhBaoThieu ? 'Dưới ngưỡng' : 'An toàn'}</Tag>
                </Space>
                <Typography.Paragraph type="secondary" style={{ minHeight: 44, marginTop: 12, fontSize: 13 }}>{g.moTa}</Typography.Paragraph>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}><span><DatabaseOutlined /> Tồn kho</span><b>{fmtMl(g.tonKho)}</b></Space>
                  <Progress percent={pct} showInfo={false} strokeColor={g.canhBaoThieu ? '#dc2626' : '#16a34a'} />
                  <Space style={{ justifyContent: 'space-between', width: '100%', fontSize: 13, color: '#64748b' }}><span>Ngưỡng an toàn</span><span>{fmtMl(g.nguongCanhBao)}</span></Space>
                  <Space style={{ justifyContent: 'space-between', width: '100%', fontSize: 13, color: '#64748b' }}><span>Số đơn vị</span><span>{g.soLo}</span></Space>
                  <Space style={{ justifyContent: 'space-between', width: '100%', fontSize: 13, color: '#64748b' }}><span><TeamOutlined /> Người hiến</span><span>{g.soNguoiHien}</span></Space>
                </Space>
                {canEdit && g.id > 0 && <Button block icon={<EditOutlined />} style={{ marginTop: 12 }} onClick={() => { setEditing(g); form.setFieldsValue(g); }}>Cấu hình ngưỡng</Button>}
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card title="Bảng tương thích truyền hồng cầu" variant="borderless" style={{ marginTop: 16 }}
        extra={<Typography.Text type="secondary">Hàng: người nhận · Cột: người cho</Typography.Text>}>
        <Table size="small" pagination={false} rowKey="t" scroll={{ x: 760 }}
          dataSource={TYPES.map((t) => ({ t }))}
          columns={[
            { title: 'Người nhận ↓ / Người cho →', dataIndex: 't', fixed: 'left', width: 200, render: (t) => <BloodBadge {...split(t)} /> },
            ...TYPES.map((donor) => ({
              title: <BloodBadge {...split(donor)} />, align: 'center', render: (_, r) => (COMPATIBILITY[r.t].includes(donor)
                ? <Tooltip title={`${donor} cho được ${r.t}`}><CheckOutlined style={{ color: '#16a34a', fontSize: 16 }} /></Tooltip>
                : <span style={{ color: '#e2e8f0' }}>—</span>)
            }))
          ]} />
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }}>
          O− là nhóm cho phổ thông (truyền được cho mọi nhóm), AB+ là nhóm nhận phổ thông. Truyền huyết tương có quy tắc ngược lại (AB cho được mọi nhóm).
        </Typography.Paragraph>
      </Card>

      <Modal title={editing && <Space>Cấu hình nhóm máu <BloodBadge nhomMau={editing.nhomMau} heRh={editing.heRh} /></Space>} open={!!editing}
        onCancel={() => setEditing(null)} onOk={save} okText="Lưu" cancelText="Hủy" destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="nguongCanhBao" label="Ngưỡng tồn kho an toàn (ml)" rules={[{ required: true }]} extra="Tồn kho dưới ngưỡng này sẽ phát cảnh báo và hệ thống tự động kêu gọi người hiến cùng nhóm máu.">
            <InputNumber min={0} step={100} style={{ width: '100%' }} suffix="ml" />
          </Form.Item>
          <Form.Item name="moTa" label="Mô tả"><Input.TextArea rows={2} maxLength={255} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
