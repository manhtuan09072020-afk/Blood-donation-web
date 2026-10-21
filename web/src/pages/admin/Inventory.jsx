import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, Badge, Button, Card, Col, Descriptions, Form, Input, Modal, Popconfirm, Progress, Row, Segmented, Select, Space, Table, Tabs, Tag, Tooltip, Typography, Alert, List } from 'antd';
import { SearchOutlined, EnvironmentOutlined, DeleteOutlined, ExportOutlined, DownloadOutlined, WarningOutlined, NotificationOutlined, StopOutlined, ClearOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { inventoryApi, catalogApi } from '../../api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { BloodBadge, PageHeader, UnitStatusTag } from '../../components/common';
import { fmtDate, fmtDateTime, fmtMl, THANH_PHAN, NHOM_MAU_OPTIONS, RH_OPTIONS, KHO_STATUS, bloodLabel, thanhPhanLabel } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';

const SO_NGAY_CANH_BAO = 7;
const LY_DO_HUY = [
  'Hết hạn sử dụng',
  'Sắp hết hạn, không kịp sử dụng',
  'Túi máu bị vỡ / rò rỉ',
  'Nhiễm khuẩn / màu sắc bất thường',
  'Không đạt xét nghiệm bệnh lây truyền qua đường máu',
  'Bảo quản sai nhiệt độ',
  'Khác'
];

const isExpired = (u) => u.trangThai === 'HetHan';
const isExpiring = (u, days = SO_NGAY_CANH_BAO) => u.trangThai === 'ConKho' && u.soNgayConLai <= days;

function ExpiryTag({ u }) {
  if (isExpired(u)) return <Space direction="vertical" size={0}><span>{fmtDate(u.hanSuDung)}</span><Tag color="red" bordered={false}>quá hạn {Math.abs(u.soNgayConLai)} ngày</Tag></Space>;
  if (u.trangThai !== 'ConKho') return <span style={{ color: '#94a3b8' }}>{fmtDate(u.hanSuDung)}</span>;
  const color = u.soNgayConLai <= 2 ? 'red' : u.soNgayConLai <= SO_NGAY_CANH_BAO ? 'orange' : 'green';
  return <Space direction="vertical" size={0}><span>{fmtDate(u.hanSuDung)}</span><Tag color={color} bordered={false}>{u.soNgayConLai === 0 ? 'hết hạn hôm nay' : `còn ${u.soNgayConLai} ngày`}</Tag></Space>;
}

function StatusCell({ u }) {
  if (u.trangThai !== 'HuyBo' || !u.lyDoHuy) return <UnitStatusTag value={u.trangThai} />;
  return (
    <Tooltip title={<>Lý do: {u.lyDoHuy}<br />Thời gian: {fmtDateTime(u.ngayHuy)}{u.nguoiHuy && <><br />Người hủy: {u.nguoiHuy}</>}</>}>
      <Space direction="vertical" size={0}>
        <UnitStatusTag value={u.trangThai} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>{u.lyDoHuy}</Typography.Text>
      </Space>
    </Tooltip>
  );
}

// Phiếu hủy bỏ đơn vị máu: chọn lý do (bắt buộc), ghi lại người hủy và thời điểm
function DiscardModal({ unit, onClose, onDone }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const lyDo = Form.useWatch('lyDo', form);

  useEffect(() => {
    if (unit) form.setFieldsValue({
      lyDo: isExpired(unit) ? LY_DO_HUY[0] : isExpiring(unit) ? LY_DO_HUY[1] : undefined,
      ghiChu: ''
    });
  }, [unit, form]);

  const submit = async () => {
    const v = await form.validateFields();
    const text = v.lyDo === 'Khác' ? v.ghiChu.trim() : [v.lyDo, v.ghiChu?.trim()].filter(Boolean).join(' – ');
    setSaving(true);
    try { const res = await inventoryApi.discard(unit.id, text); message.success(res.message); onDone(); }
    catch (e) { message.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={!!unit} onCancel={onClose} onOk={submit} confirmLoading={saving} destroyOnHidden
      title={<><StopOutlined style={{ color: '#dc2626' }} /> {unit && isExpired(unit) ? 'Loại bỏ đơn vị máu hết hạn' : 'Hủy bỏ đơn vị máu'}</>}
      okText="Xác nhận hủy" okButtonProps={{ danger: true }} cancelText="Đóng">
      {unit && (
        <>
          <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }} styles={{ label: { whiteSpace: 'nowrap' } }}>
            <Descriptions.Item label="Mã đơn vị" span={2}><b>{unit.maLoMau}</b></Descriptions.Item>
            <Descriptions.Item label="Nhóm máu"><BloodBadge nhomMau={unit.nhomMau} heRh={unit.heRh} /></Descriptions.Item>
            <Descriptions.Item label="Thành phần">{thanhPhanLabel(unit.thanhPhanMau)}</Descriptions.Item>
            <Descriptions.Item label="Số lượng">{fmtMl(unit.soLuong)}</Descriptions.Item>
            <Descriptions.Item label="Hạn sử dụng"><ExpiryTag u={unit} /></Descriptions.Item>
            <Descriptions.Item label="Vị trí" span={2}>{unit.viTriLuuTru || 'Chưa xếp'}</Descriptions.Item>
          </Descriptions>
          <Form form={form} layout="vertical">
            <Form.Item name="lyDo" label="Lý do hủy" rules={[{ required: true, message: 'Chọn lý do hủy' }]}>
              <Select options={LY_DO_HUY.map((x) => ({ value: x, label: x }))} placeholder="Chọn lý do" />
            </Form.Item>
            <Form.Item name="ghiChu" label={lyDo === 'Khác' ? 'Mô tả lý do' : 'Ghi chú thêm (không bắt buộc)'}
              rules={lyDo === 'Khác' ? [{ required: true, whitespace: true, message: 'Nhập lý do cụ thể' }] : []}>
              <Input.TextArea rows={2} maxLength={150} showCount placeholder="vd: phát hiện khi kiểm kho sáng 21/10" />
            </Form.Item>
          </Form>
          <Alert type="warning" showIcon message="Đơn vị máu sau khi hủy sẽ không thể xuất kho. Hệ thống lưu lại lý do, thời điểm và nhân viên thực hiện." />
        </>
      )}
    </Modal>
  );
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
  // view: ConKho | CanXuLy (sắp hết hạn + đã hết hạn) | DaXuat | HuyBo | TatCa
  const [f, setF] = useState({ nhomMau: undefined, heRh: undefined, thanhPhan: undefined, view: params.get('view') || 'ConKho', keyword: '' });
  const [locUnit, setLocUnit] = useState(null);
  const [locValue, setLocValue] = useState('');
  const [discardUnit, setDiscardUnit] = useState(null);
  const [expired, setExpired] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const soNgayCanhBao = alerts?.soNgayCanhBao ?? SO_NGAY_CANH_BAO;

  const loadUnits = () => {
    setLoading(true);
    const trangThai = ['ConKho', 'DaXuat', 'HuyBo'].includes(f.view) ? f.view : undefined;
    inventoryApi.getUnits({ nhomMau: f.nhomMau, heRh: f.heRh, thanhPhan: f.thanhPhan, trangThai })
      .then((list) => setUnits(f.view === 'CanXuLy' ? list.filter((u) => isExpired(u) || isExpiring(u, soNgayCanhBao)) : list))
      .finally(() => setLoading(false));
  };
  const loadMeta = () => {
    catalogApi.getBloodGroups().then(setGroups);
    inventoryApi.getSummary().then(setSummary);
    inventoryApi.getAlerts().then(setAlerts);
    inventoryApi.getUnits({ trangThai: 'HetHan' }).then(setExpired);
  };
  const reloadAll = () => { loadUnits(); loadMeta(); };
  useEffect(loadUnits, [f.nhomMau, f.heRh, f.thanhPhan, f.view, soNgayCanhBao]);
  useEffect(loadMeta, []);

  const shown = useMemo(() => {
    const kw = f.keyword.trim().toLowerCase();
    return kw ? units.filter((u) => `${u.maLoMau} ${u.viTriLuuTru || ''} ${u.hoTenNguoiHien || ''}`.toLowerCase().includes(kw)) : units;
  }, [units, f.keyword]);
  const totalMl = shown.reduce((a, u) => a + Number(u.soLuong), 0);
  const canXuLyCount = expired.length + (alerts?.loSapHetHan.length || 0);

  const discardAllExpired = async () => {
    setBulkBusy(true);
    try { const res = await inventoryApi.discardExpired(); message.success(res.message); reloadAll(); }
    catch (e) { message.error(e.message); }
    finally { setBulkBusy(false); }
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
    { title: 'Trạng thái', dataIndex: 'trangThai', width: 150, render: (_, u) => <StatusCell u={u} /> },
    {
      title: 'Thao tác', key: 'actions', width: 170, fixed: 'right', render: (_, u) => {
        if (!canManage) return null;
        // Đã hết hạn: không thể xuất -> loại bỏ khỏi kho
        if (isExpired(u)) return <Button size="small" type="primary" danger icon={<StopOutlined />} onClick={() => setDiscardUnit(u)}>Loại bỏ</Button>;
        if (u.trangThai !== 'ConKho') return null;
        const expiring = isExpiring(u, soNgayCanhBao);
        return (
          <Space size={6}>
            <Tooltip title="Đổi vị trí lưu trữ"><Button size="small" icon={<EnvironmentOutlined />} onClick={() => { setLocUnit(u); setLocValue(u.viTriLuuTru || ''); }} /></Tooltip>
            {expiring
              ? <Tooltip title="Sắp hết hạn: ưu tiên xuất trước, hoặc hủy nếu không kịp sử dụng"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => setDiscardUnit(u)}>Hủy bỏ</Button></Tooltip>
              : <Tooltip title="Hủy bỏ (túi vỡ, nhiễm khuẩn, không đạt xét nghiệm…)"><Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => setDiscardUnit(u)} /></Tooltip>}
          </Space>
        );
      }
    }
  ];

  const alertColumns = unitColumns
    .filter((c) => ['maLoMau', 'thanhPhanMau', 'soLuong', 'hanSuDung', 'viTriLuuTru'].includes(c.dataIndex) || c.title === 'Nhóm máu' || c.key === 'actions')
    .map(({ fixed, ...c }) => (c.dataIndex === 'viTriLuuTru' ? { ...c, width: 190 } : c));

  const bulkButton = canManage && expired.length > 0 && (
    <Popconfirm title={`Loại bỏ ${expired.length} đơn vị máu đã hết hạn?`} description={`Tổng ${fmtMl(expired.reduce((a, u) => a + Number(u.soLuong), 0))}, lý do: Hết hạn sử dụng.`}
      okText="Loại bỏ tất cả" okButtonProps={{ danger: true }} cancelText="Đóng" onConfirm={discardAllExpired}>
      <Button danger icon={<ClearOutlined />} loading={bulkBusy}>Loại bỏ tất cả {expired.length} đơn vị hết hạn</Button>
    </Popconfirm>
  );

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
                <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                  <Segmented value={f.view} onChange={(v) => setF({ ...f, view: v })} options={[
                    { value: 'ConKho', label: 'Còn trong kho' },
                    { value: 'CanXuLy', label: <span>Cần xử lý <Badge count={canXuLyCount} size="small" style={{ marginLeft: 4 }} /></span> },
                    { value: 'DaXuat', label: 'Đã xuất' },
                    { value: 'HuyBo', label: 'Đã hủy' },
                    { value: 'TatCa', label: 'Tất cả' }
                  ]} />
                  {f.view === 'CanXuLy' && bulkButton}
                </div>
                {f.view === 'CanXuLy' && (
                  <Alert type="warning" showIcon style={{ marginBottom: 12 }}
                    message={`Đơn vị đã hết hạn (${expired.length}) phải loại bỏ khỏi kho; đơn vị sắp hết hạn trong ≤ ${soNgayCanhBao} ngày (${alerts?.loSapHetHan.length || 0}) nên ưu tiên xuất trước, hoặc hủy nếu không kịp sử dụng.`} />
                )}
                <div className="toolbar">
                  <Input allowClear prefix={<SearchOutlined />} placeholder="Mã đơn vị, vị trí, người hiến" style={{ width: 240 }} value={f.keyword} onChange={(e) => setF({ ...f, keyword: e.target.value })} />
                  <Select allowClear placeholder="Nhóm máu" style={{ width: 120 }} options={NHOM_MAU_OPTIONS} value={f.nhomMau} onChange={(v) => setF({ ...f, nhomMau: v })} />
                  <Select allowClear placeholder="Rh" style={{ width: 120 }} options={RH_OPTIONS} value={f.heRh} onChange={(v) => setF({ ...f, heRh: v })} />
                  <Select allowClear placeholder="Thành phần" style={{ width: 160 }} value={f.thanhPhan} onChange={(v) => setF({ ...f, thanhPhan: v })}
                    options={Object.entries(THANH_PHAN).map(([k, t]) => ({ value: k, label: t.label }))} />
                  <Typography.Text type="secondary">{shown.length} đơn vị · {f.view === 'ConKho' ? 'tồn' : 'tổng'} {fmtMl(totalMl)}</Typography.Text>
                </div>
                <Table rowKey="id" loading={loading} dataSource={shown} columns={unitColumns} scroll={{ x: 1400 }} pagination={{ pageSize: 12, showSizeChanger: true }}
                  rowClassName={(u) => (isExpired(u) ? 'row-expired' : isExpiring(u, soNgayCanhBao) ? 'row-expiring' : '')} />
              </>
            )
          },
          {
            key: 'alerts', label: <span>Cảnh báo {alerts && <Tag color="red" style={{ marginLeft: 4 }}>{alerts.nhomMauThieu.length + alerts.loSapHetHan.length + expired.length}</Tag>}</span>,
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
                  {expired.length > 0 && (
                    <Card size="small" style={{ marginBottom: 16, borderColor: '#fecaca' }} extra={bulkButton}
                      title={<><StopOutlined style={{ color: '#dc2626' }} /> Đơn vị máu đã hết hạn — cần loại bỏ ({expired.length})</>}>
                      <Table rowKey="id" size="small" dataSource={expired} pagination={{ pageSize: 5 }} scroll={{ x: 980 }} columns={alertColumns} />
                    </Card>
                  )}
                  <Card size="small" title={`Đơn vị máu sắp hết hạn (≤ ${alerts.soNgayCanhBao} ngày) — ưu tiên xuất trước hoặc hủy nếu không kịp dùng`}>
                    <Table rowKey="id" size="small" dataSource={alerts.loSapHetHan} pagination={{ pageSize: 8 }} scroll={{ x: 980 }} columns={alertColumns} />
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

      <DiscardModal unit={discardUnit} onClose={() => setDiscardUnit(null)} onDone={() => { setDiscardUnit(null); reloadAll(); }} />

      <Modal title={`Vị trí lưu trữ — ${locUnit?.maLoMau}`} open={!!locUnit} onCancel={() => setLocUnit(null)} onOk={saveLocation} okText="Lưu" cancelText="Hủy">
        <Input value={locValue} onChange={(e) => setLocValue(e.target.value)} placeholder="vd: Tủ lạnh O+ / Ngăn 3" maxLength={50} />
      </Modal>
    </>
  );
}
