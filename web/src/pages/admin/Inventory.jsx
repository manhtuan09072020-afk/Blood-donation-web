import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, Button, Card, Col, Input, Modal, Popconfirm, Progress, Row, Select, Space, Table, Tabs, Tag, Tooltip, Typography, Alert, List } from 'antd';
import { SearchOutlined, EnvironmentOutlined, DeleteOutlined, ExportOutlined, DownloadOutlined, WarningOutlined, NotificationOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { inventoryApi, catalogApi } from '../../api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { BloodBadge, PageHeader, UnitStatusTag } from '../../components/common';
import { fmtDate, fmtMl, THANH_PHAN, NHOM_MAU_OPTIONS, RH_OPTIONS, KHO_STATUS, bloodLabel, thanhPhanLabel } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';

function ExpiryTag({ u }) {
  if (u.trangThai !== 'ConKho') return <span style={{ color: '#94a3b8' }}>{fmtDate(u.hanSuDung)}</span>;
  const color = u.soNgayConLai <= 2 ? 'red' : u.soNgayConLai <= 7 ? 'orange' : 'green';
  return <Space direction="vertical" size={0}><span>{fmtDate(u.hanSuDung)}</span><Tag color={color} bordered={false}>còn {u.soNgayConLai} ngày</Tag></Space>;
}

export default function Inventory() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole(ROLES.QUAN_TRI, ROLES.NHAN_VIEN_KHO);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'units';

  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [summary, setSummary] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ nhomMau: undefined, heRh: undefined, thanhPhan: undefined, trangThai: 'ConKho', keyword: '' });
  const [locUnit, setLocUnit] = useState(null);
  const [locValue, setLocValue] = useState('');

  const loadUnits = () => {
    setLoading(true);
    inventoryApi.getUnits({ nhomMau: f.nhomMau, heRh: f.heRh, thanhPhan: f.thanhPhan, trangThai: f.trangThai })
      .then(setUnits).finally(() => setLoading(false));
  };
  const loadMeta = () => {
    catalogApi.getBloodGroups().then(setGroups);
    inventoryApi.getSummary().then(setSummary);
    inventoryApi.getAlerts().then(setAlerts);
  };
  useEffect(loadUnits, [f.nhomMau, f.heRh, f.thanhPhan, f.trangThai]);
  useEffect(loadMeta, []);

  const shown = useMemo(() => {
    const kw = f.keyword.trim().toLowerCase();
    return kw ? units.filter((u) => `${u.maLoMau} ${u.viTriLuuTru || ''} ${u.hoTenNguoiHien || ''}`.toLowerCase().includes(kw)) : units;
  }, [units, f.keyword]);
  const totalMl = shown.filter((u) => u.trangThai === 'ConKho').reduce((a, u) => a + Number(u.soLuong), 0);

  const discard = async (u) => {
    try { const res = await inventoryApi.discard(u.id); message.success(res.message); loadUnits(); loadMeta(); }
    catch (e) { message.error(e.message); }
  };
  const saveLocation = async () => {
    try { const res = await inventoryApi.updateLocation(locUnit.id, locValue); message.success(res.message); setLocUnit(null); loadUnits(); }
    catch (e) { message.error(e.message); }
  };

  // Bảng tổng hợp: hàng = nhóm máu, cột = thành phần
  const pivot = useMemo(() => {
    const rows = {};
    summary.forEach((s) => {
      const key = s.nhomMau + s.heRh;
      rows[key] = rows[key] || { key, nhomMau: s.nhomMau, heRh: s.heRh, tong: 0, canhBao: s.canhBaoThieu };
      rows[key][s.thanhPhanMau] = { ml: Number(s.tongSoLuong), lo: s.soLo, exp: s.coLoSapHetHan };
      rows[key].tong += Number(s.tongSoLuong);
    });
    return groups.map((g) => rows[g.nhomMau + g.heRh] || { key: g.nhomMau + g.heRh, nhomMau: g.nhomMau, heRh: g.heRh, tong: 0, canhBao: true });
  }, [summary, groups]);

  const unitColumns = [
    { title: 'Mã đơn vị', dataIndex: 'maLoMau', fixed: 'left', width: 190, render: (v) => <Typography.Text strong copyable style={{ whiteSpace: 'nowrap' }}>{v}</Typography.Text> },
    { title: 'Nhóm máu', width: 95, render: (_, u) => <BloodBadge nhomMau={u.nhomMau} heRh={u.heRh} /> },
    { title: 'Thành phần', dataIndex: 'thanhPhanMau', width: 140, render: (v) => <Tag color={THANH_PHAN[v]?.color}>{thanhPhanLabel(v)}</Tag> },
    { title: 'Số lượng', dataIndex: 'soLuong', width: 110, align: 'right', render: (v) => <b>{fmtMl(v)}</b>, sorter: (a, b) => a.soLuong - b.soLuong },
    { title: 'Ngày nhập', dataIndex: 'ngayNhap', width: 120, render: fmtDate, sorter: (a, b) => dayjs(a.ngayNhap) - dayjs(b.ngayNhap) },
    { title: 'Hạn sử dụng', dataIndex: 'hanSuDung', width: 140, render: (_, u) => <ExpiryTag u={u} />, sorter: (a, b) => dayjs(a.hanSuDung) - dayjs(b.hanSuDung), defaultSortOrder: 'ascend' },
    { title: 'Vị trí lưu trữ', dataIndex: 'viTriLuuTru', width: 230, render: (v) => v ? <span><EnvironmentOutlined /> {v}</span> : <Typography.Text type="secondary">Chưa xếp</Typography.Text> },
    { title: 'Trạng thái', dataIndex: 'trangThai', width: 130, render: (v) => <UnitStatusTag value={v} /> },
    {
      title: '', width: 100, fixed: 'right', render: (_, u) => canManage && u.trangThai === 'ConKho' && (
        <Space>
          <Tooltip title="Đổi vị trí lưu trữ"><Button size="small" icon={<EnvironmentOutlined />} onClick={() => { setLocUnit(u); setLocValue(u.viTriLuuTru || ''); }} /></Tooltip>
          <Popconfirm title="Hủy bỏ đơn vị máu này?" description="Dùng khi túi máu hỏng, nhiễm khuẩn, không đạt xét nghiệm." okText="Hủy bỏ" okButtonProps={{ danger: true }} onConfirm={() => discard(u)}>
            <Tooltip title="Hủy bỏ"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <>
      <PageHeader title="Kho máu" subtitle="Quản lý tồn kho theo nhóm máu, thành phần, số lượng, hạn sử dụng và vị trí lưu trữ"
        extra={<>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv(`ton-kho-${dayjs().format('YYYYMMDD')}`, [
            { title: 'Mã đơn vị', value: 'maLoMau' }, { title: 'Nhóm máu', value: (u) => bloodLabel(u.nhomMau, u.heRh) },
            { title: 'Thành phần', value: (u) => thanhPhanLabel(u.thanhPhanMau) }, { title: 'Số lượng (ml)', value: 'soLuong' },
            { title: 'Ngày nhập', value: (u) => fmtDate(u.ngayNhap) }, { title: 'Hạn sử dụng', value: (u) => fmtDate(u.hanSuDung) },
            { title: 'Vị trí', value: 'viTriLuuTru' }, { title: 'Trạng thái', value: (u) => KHO_STATUS[u.trangThai]?.label }
          ], shown)}>Xuất CSV</Button>
          {canManage && <Button type="primary" icon={<ExportOutlined />} onClick={() => navigate('/admin/issues')}>Lập phiếu xuất kho</Button>}
        </>} />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {groups.map((g) => {
          const pct = g.nguongCanhBao ? Math.min(100, Math.round((g.tonKho / g.nguongCanhBao) * 100)) : 100;
          const active = f.nhomMau === g.nhomMau && f.heRh === g.heRh;
          return (
            <Col xs={12} sm={8} md={6} xl={3} key={g.nhomMau + g.heRh}>
              <div className={`blood-tile ${g.canhBaoThieu ? 'low' : ''}`} style={{ cursor: 'pointer', borderColor: active ? '#c8102e' : undefined, padding: 12 }}
                onClick={() => setF({ ...f, nhomMau: active ? undefined : g.nhomMau, heRh: active ? undefined : g.heRh })}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <BloodBadge nhomMau={g.nhomMau} heRh={g.heRh} />
                  {g.canhBaoThieu && <WarningOutlined style={{ color: '#dc2626' }} />}
                </Space>
                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 8 }}>{(g.tonKho / 1000).toFixed(2)} L</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{g.soLo} đơn vị · ngưỡng {g.nguongCanhBao / 1000} L</div>
                <Progress percent={pct} showInfo={false} size="small" strokeColor={g.canhBaoThieu ? '#dc2626' : '#16a34a'} />
              </div>
            </Col>
          );
        })}
      </Row>

      <Card variant="borderless">
        <Tabs activeKey={tab} onChange={(k) => setParams({ tab: k }, { replace: true })} items={[
          {
            key: 'units', label: 'Đơn vị máu',
            children: (
              <>
                <div className="toolbar">
                  <Input allowClear prefix={<SearchOutlined />} placeholder="Mã đơn vị, vị trí, người hiến" style={{ width: 240 }} value={f.keyword} onChange={(e) => setF({ ...f, keyword: e.target.value })} />
                  <Select allowClear placeholder="Nhóm máu" style={{ width: 120 }} options={NHOM_MAU_OPTIONS} value={f.nhomMau} onChange={(v) => setF({ ...f, nhomMau: v })} />
                  <Select allowClear placeholder="Rh" style={{ width: 120 }} options={RH_OPTIONS} value={f.heRh} onChange={(v) => setF({ ...f, heRh: v })} />
                  <Select allowClear placeholder="Thành phần" style={{ width: 160 }} value={f.thanhPhan} onChange={(v) => setF({ ...f, thanhPhan: v })}
                    options={Object.entries(THANH_PHAN).map(([k, t]) => ({ value: k, label: t.label }))} />
                  <Select allowClear placeholder="Trạng thái" style={{ width: 150 }} value={f.trangThai} onChange={(v) => setF({ ...f, trangThai: v })}
                    options={Object.entries(KHO_STATUS).map(([k, s]) => ({ value: k, label: s.label }))} />
                  <Typography.Text type="secondary">{shown.length} đơn vị · tồn {fmtMl(totalMl)}</Typography.Text>
                </div>
                <Table rowKey="id" loading={loading} dataSource={shown} columns={unitColumns} scroll={{ x: 1320 }} pagination={{ pageSize: 12, showSizeChanger: true }} />
              </>
            )
          },
          {
            key: 'alerts', label: <span>Cảnh báo {alerts && <Tag color="red" style={{ marginLeft: 4 }}>{alerts.nhomMauThieu.length + alerts.loSapHetHan.length}</Tag>}</span>,
            children: alerts && (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={9}>
                  <Card size="small" title={<><WarningOutlined style={{ color: '#dc2626' }} /> Nhóm máu dưới ngưỡng an toàn</>}>
                    {alerts.nhomMauThieu.length === 0 ? <Alert type="success" message="Tất cả nhóm máu đều đủ ngưỡng" /> : (
                      <List dataSource={alerts.nhomMauThieu} renderItem={(g) => (
                        <List.Item actions={[<Button key="c" size="small" danger icon={<NotificationOutlined />} onClick={() => navigate(`/admin/outreach?nhomMau=${g.nhomMau}&heRh=${encodeURIComponent(g.heRh)}`)}>Kêu gọi</Button>]}>
                          <List.Item.Meta avatar={<BloodBadge nhomMau={g.nhomMau} heRh={g.heRh} />}
                            title={`${fmtMl(g.tonKho)} / ${fmtMl(g.nguongCanhBao)}`}
                            description={`Thiếu ${fmtMl(g.nguongCanhBao - g.tonKho)} · ${g.soNguoiHien} người hiến cùng nhóm`} />
                        </List.Item>
                      )} />
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={15}>
                  <Card size="small" title={`Đơn vị máu sắp hết hạn (≤ ${alerts.soNgayCanhBao} ngày) — ưu tiên xuất trước`}>
                    <Table rowKey="id" size="small" dataSource={alerts.loSapHetHan} pagination={{ pageSize: 8 }}
                      columns={unitColumns.filter((c) => ['maLoMau', 'thanhPhanMau', 'soLuong', 'hanSuDung', 'viTriLuuTru'].includes(c.dataIndex) || c.title === 'Nhóm máu')} />
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'summary', label: 'Tổng hợp theo thành phần',
            children: (
              <Table rowKey="key" dataSource={pivot} pagination={false}
                summary={(rows) => (
                  <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <Table.Summary.Cell index={0}>Tổng cộng</Table.Summary.Cell>
                    {Object.keys(THANH_PHAN).map((k, i) => <Table.Summary.Cell key={k} index={i + 1} align="right">{fmtMl(rows.reduce((a, r) => a + (r[k]?.ml || 0), 0))}</Table.Summary.Cell>)}
                    <Table.Summary.Cell index={5} align="right">{fmtMl(rows.reduce((a, r) => a + r.tong, 0))}</Table.Summary.Cell>
                    <Table.Summary.Cell index={6} />
                  </Table.Summary.Row>
                )}
                columns={[
                  { title: 'Nhóm máu', render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                  ...Object.entries(THANH_PHAN).map(([k, t]) => ({
                    title: t.label, align: 'right', render: (_, r) => r[k] ? <span>{fmtMl(r[k].ml)} <Typography.Text type="secondary" style={{ fontSize: 12 }}>({r[k].lo})</Typography.Text>{r[k].exp && <Tooltip title="Có đơn vị sắp hết hạn"> <WarningOutlined style={{ color: '#f59e0b' }} /></Tooltip>}</span> : <Typography.Text type="secondary">—</Typography.Text>
                  })),
                  { title: 'Tổng', align: 'right', render: (_, r) => <b>{fmtMl(r.tong)}</b> },
                  { title: 'Tình trạng', render: (_, r) => (r.canhBao ? <Tag color="red">Dưới ngưỡng</Tag> : <Tag color="green">Ổn định</Tag>) }
                ]} />
            )
          }
        ]} />
      </Card>

      <Modal title={`Vị trí lưu trữ — ${locUnit?.maLoMau}`} open={!!locUnit} onCancel={() => setLocUnit(null)} onOk={saveLocation} okText="Lưu" cancelText="Hủy">
        <Input value={locValue} onChange={(e) => setLocValue(e.target.value)} placeholder="vd: Tủ lạnh O+ / Ngăn 3" maxLength={50} />
      </Modal>
    </>
  );
}
