import { useEffect, useMemo, useState } from 'react';
import {
  Alert, App, Button, Card, Col, DatePicker, Descriptions, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tabs, Tag, Typography
} from 'antd';
import { ExperimentOutlined, SearchOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { collectionApi } from '../../api';
import { BloodBadge, PageHeader } from '../../components/common';
import { fmtDateTime, fmtDate, fmtMl, THANH_PHAN, NHOM_MAU_OPTIONS, RH_OPTIONS, LOAI_TUI, BAO_QUAN } from '../../utils/format';

const round10 = (v) => Math.round(v / 10) * 10;

// Thể tích gợi ý của từng chế phẩm khi điều chế (phần còn lại là hao hụt / dung dịch chống đông)
function suggestParts(loaiTui, v) {
  if (loaiTui === 'Don') return { ToanPhan: v };
  if (loaiTui === 'Doi') return { HongCau: round10(v * 0.55), HuyetTuong: round10(v * 0.4) };
  return { HongCau: round10(v * 0.52), HuyetTuong: round10(v * 0.33), TieuCau: v >= 450 ? 60 : 50 };
}

function defaultLocation(tp, nhomMau, heRh) {
  if (tp === 'HuyetTuong') return 'Tủ đông HT-01';
  if (tp === 'TieuCau') return 'Máy lắc tiểu cầu TC-01';
  return nhomMau ? `Tủ lạnh ${nhomMau}${heRh === 'Rh-' ? '-' : '+'} / Ngăn 1` : '';
}

function BagTypePicker({ value, onChange, theTich }) {
  return (
    <Row gutter={10}>
      {Object.entries(LOAI_TUI).map(([k, t]) => {
        const disabled = k === 'Ba' && theTich < 350;
        const active = value === k;
        return (
          <Col span={8} key={k}>
            <div onClick={() => !disabled && onChange(k)} style={{
              cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, height: '100%',
              border: `2px solid ${active ? '#c8102e' : '#e2e8f0'}`, background: active ? '#fff5f6' : '#fff', borderRadius: 12, padding: '10px 12px'
            }}>
              <div style={{ fontWeight: 700, color: active ? '#c8102e' : undefined }}>{t.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', margin: '2px 0 6px' }}>{t.desc}</div>
              <Space size={4} wrap>{t.parts.map((p) => <Tag key={p} color={THANH_PHAN[p].color} bordered={false} style={{ marginInlineEnd: 0 }}>{THANH_PHAN[p].short}</Tag>)}</Space>
            </div>
          </Col>
        );
      })}
    </Row>
  );
}

export default function Collection() {
  const { message, modal } = App.useApp();
  const [pending, setPending] = useState([]);
  const [done, setDone] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [current, setCurrent] = useState(null);
  const [parts, setParts] = useState({});
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const theTich = Form.useWatch('theTich', form) || 0;
  const loaiTui = Form.useWatch('loaiTui', form) || 'Don';
  const ngayLayMau = Form.useWatch('ngayLayMau', form);
  const nhomMauNhap = Form.useWatch('nhomMau', form);
  const heRhNhap = Form.useWatch('heRh', form);

  const load = () => {
    setLoading(true);
    Promise.all([collectionApi.getPending().then(setPending), collectionApi.getAll().then(setDone)]).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const nhomMau = current?.nhomMau || nhomMauNhap;
  const heRh = current?.heRh || heRhNhap;

  // Đổi thể tích / loại túi -> tính lại thể tích gợi ý từng chế phẩm
  useEffect(() => {
    if (!current || !theTich) return;
    const s = suggestParts(loaiTui, theTich);
    setParts(Object.fromEntries(Object.entries(s).map(([tp, ml]) => [tp, { ml, viTri: parts[tp]?.viTri ?? defaultLocation(tp, nhomMau, heRh) }])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaiTui, theTich, current]);

  useEffect(() => { if (loaiTui === 'Ba' && theTich && theTich < 350) form.setFieldValue('loaiTui', 'Doi'); }, [theTich, loaiTui, form]);

  const open = (s) => {
    setCurrent(s);
    form.resetFields();
    form.setFieldsValue({ theTich: s.theTichChiDinh || 350, ngayLayMau: dayjs(), loaiTui: 'Don' });
    setParts({});
  };

  const totalParts = useMemo(() => Object.values(parts).reduce((a, p) => a + (p.ml || 0), 0), [parts]);
  const maxTheTich = current?.theTichChiDinh ? Math.round(current.theTichChiDinh * 1.1) : 500;
  const ngay = ngayLayMau || dayjs();
  const maTui = `LM${ngay.format('YYMMDD')}·····`;

  const submit = async () => {
    const v = await form.validateFields();
    const entries = Object.entries(parts);
    if (entries.some(([, p]) => !p.ml)) { message.warning('Nhập thể tích cho từng chế phẩm'); return; }
    if (totalParts > v.theTich) { message.warning('Tổng thể tích chế phẩm vượt quá lượng máu đã lấy'); return; }
    const payload = {
      khamSangLocId: current.id, theTich: v.theTich, ghiChu: v.ghiChu, nhomMau: v.nhomMau, heRh: v.heRh,
      ngayLayMau: v.ngayLayMau.format('YYYY-MM-DDTHH:mm:ss'), loaiTui: v.loaiTui
    };
    if (v.loaiTui === 'Don') Object.assign(payload, { thanhPhanMau: 'ToanPhan', viTriLuuTru: parts.ToanPhan?.viTri || null });
    else payload.thanhPhans = entries.map(([tp, p]) => ({ thanhPhanMau: tp, theTich: p.ml, viTriLuuTru: p.viTri || null }));

    setSaving(true);
    try {
      const res = await collectionApi.create(payload);
      setCurrent(null);
      modal.success({
        title: `Đã tiếp nhận túi máu ${res.maTuiMau}`,
        width: 560,
        content: (
          <div>
            {LOAI_TUI[res.loaiTui]?.label} · {fmtMl(res.theTich)} · lấy lúc {fmtDateTime(res.ngayLayMau)}. Đã nhập kho {res.cacLoMau.length} đơn vị:
            <ul style={{ paddingLeft: 18, marginTop: 8 }}>
              {res.cacLoMau.map((l) => <li key={l.id}><b>{l.maLoMau}</b> — {THANH_PHAN[l.thanhPhanMau].label} {fmtMl(l.soLuong)}, HSD {fmtDate(l.hanSuDung)}</li>)}
            </ul>
          </div>
        )
      });
      load();
    } catch (e) { message.error(e.message); }
    finally { setSaving(false); }
  };

  const kw = keyword.toLowerCase();

  return (
    <>
      <PageHeader title="Tiếp nhận máu & nhập kho" subtitle="Ghi nhận túi máu đã lấy từ người đạt sàng lọc, điều chế chế phẩm và nhập kho theo từng túi" />
      <Card variant="borderless">
        <div className="toolbar">
          <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm người hiến" style={{ width: 240 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <Tabs items={[
          {
            key: 'pending', label: `Chờ lấy máu (${pending.length})`,
            children: (
              <Table rowKey="id" loading={loading} dataSource={pending.filter((p) => !kw || p.hoTenNguoiHien.toLowerCase().includes(kw))} pagination={{ pageSize: 10 }}
                columns={[
                  { title: 'Người hiến', dataIndex: 'hoTenNguoiHien', render: (v, r) => <><b>{v}</b><div style={{ fontSize: 12, color: '#64748b' }}>{r.tenDot}</div></> },
                  { title: 'Nhóm máu', width: 100, render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                  { title: 'Đạt sàng lọc lúc', dataIndex: 'ngayKham', width: 160, render: fmtDateTime },
                  { title: 'Chỉ số', render: (_, r) => <Space size={4} wrap><Tag>{r.canNang} kg</Tag><Tag>HA {r.huyetAp}</Tag><Tag>Hb {r.hemoglobin}</Tag></Space> },
                  { title: 'BS chỉ định', dataIndex: 'theTichChiDinh', width: 120, align: 'center', render: (v) => (v ? <Tag color="red" bordered={false} style={{ fontWeight: 600 }}>{v} ml</Tag> : '—') },
                  { title: '', width: 150, render: (_, r) => <Button type="primary" icon={<ExperimentOutlined />} onClick={() => open(r)}>Tiếp nhận</Button> }
                ]} />
            )
          },
          {
            key: 'done', label: `Đã tiếp nhận (${done.length})`,
            children: (
              <Table rowKey="id" loading={loading} dataSource={done.filter((p) => !kw || p.hoTenNguoiHien.toLowerCase().includes(kw))} pagination={{ pageSize: 10 }} scroll={{ x: 1100 }}
                columns={[
                  { title: 'Mã túi máu', dataIndex: 'maTuiMau', width: 150, render: (v) => <Typography.Text strong copyable>{v}</Typography.Text> },
                  { title: 'Người hiến', dataIndex: 'hoTenNguoiHien', render: (v, r) => <><b>{v}</b><div style={{ fontSize: 12, color: '#64748b' }}>{r.tenDot}</div></> },
                  { title: 'Nhóm máu', width: 90, render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                  { title: 'Lấy máu lúc', dataIndex: 'ngayLayMau', width: 140, render: fmtDateTime, sorter: (a, b) => dayjs(a.ngayLayMau) - dayjs(b.ngayLayMau) },
                  { title: 'Thể tích', width: 120, render: (_, r) => <><b>{fmtMl(r.theTich)}</b>{r.theTichChiDinh && <div style={{ fontSize: 11, color: '#64748b' }}>chỉ định {r.theTichChiDinh} ml</div>}</> },
                  { title: 'Loại túi', dataIndex: 'loaiTui', width: 90, render: (v) => (v ? LOAI_TUI[v]?.label : '—') },
                  { title: 'Đơn vị máu nhập kho', render: (_, r) => <Space size={4} wrap>{r.cacLoMau.map((l) => <Tag key={l.id} color={THANH_PHAN[l.thanhPhanMau].color}>{l.maLoMau.slice(-2)} · {THANH_PHAN[l.thanhPhanMau].short} {l.soLuong} ml · HSD {fmtDate(l.hanSuDung)}</Tag>)}</Space> },
                  { title: 'Nhân viên', dataIndex: 'nhanVienThucHien', width: 140 }
                ]} />
            )
          }
        ]} />
      </Card>

      <Modal open={!!current} onCancel={() => setCurrent(null)} title="Phiếu tiếp nhận máu & nhập kho" width={960} onOk={submit} okText="Xác nhận nhập kho" cancelText="Hủy" confirmLoading={saving} destroyOnHidden>
        {current && (
          <>
            <Descriptions size="small" column={4} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Người hiến"><b>{current.hoTenNguoiHien}</b></Descriptions.Item>
              <Descriptions.Item label="Nhóm máu"><BloodBadge nhomMau={current.nhomMau} heRh={current.heRh} /></Descriptions.Item>
              <Descriptions.Item label="Cân nặng">{current.canNang} kg</Descriptions.Item>
              <Descriptions.Item label="BS chỉ định"><b style={{ color: '#c8102e' }}>{current.theTichChiDinh ? `${current.theTichChiDinh} ml` : '—'}</b></Descriptions.Item>
            </Descriptions>
            <Form form={form} layout="vertical">
              {!current.nhomMau && (
                <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Người hiến chưa có nhóm máu — nhập kết quả xét nghiệm nhóm máu (sẽ lưu vào hồ sơ)." />
              )}
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="ngayLayMau" label="Thời điểm lấy máu" rules={[{ required: true, message: 'Chọn thời điểm' }]} extra="Hạn sử dụng tính từ ngày này">
                    <DatePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} allowClear={false}
                      disabledDate={(d) => d.isAfter(dayjs(), 'day') || d.isBefore(dayjs(current.ngayKham), 'day')} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="theTich" label="Thể tích thực lấy" rules={[{ required: true, message: 'Nhập thể tích' }]}
                    extra={current.theTichChiDinh ? `Tối đa ${maxTheTich} ml (chỉ định ±10%)` : 'Túi chuẩn 250 / 350 / 450 ml'}>
                    <InputNumber min={50} max={maxTheTich} step={10} suffix="ml" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                {!current.nhomMau && (
                  <>
                    <Col span={4}><Form.Item name="nhomMau" label="Nhóm máu" rules={[{ required: true }]}><Select options={NHOM_MAU_OPTIONS} /></Form.Item></Col>
                    <Col span={4}><Form.Item name="heRh" label="Hệ Rh" rules={[{ required: true }]}><Select options={RH_OPTIONS} /></Form.Item></Col>
                  </>
                )}
              </Row>

              <Form.Item name="loaiTui" label="Loại túi & cách điều chế" style={{ marginBottom: 12 }}>
                <BagTypePicker theTich={theTich} />
              </Form.Item>

              <Typography.Text strong>Đơn vị máu sẽ nhập kho (túi gốc {maTui})</Typography.Text>
              <Table size="small" style={{ margin: '8px 0' }} pagination={false} rowKey="tp"
                dataSource={Object.entries(parts).map(([tp, p]) => ({ tp, ...p }))}
                columns={[
                  { title: 'Mã đơn vị', width: 150, render: (_, r) => <Typography.Text code>{maTui}{({ ToanPhan: 'TP', HongCau: 'HC', HuyetTuong: 'HT', TieuCau: 'TC' })[r.tp]}</Typography.Text> },
                  { title: 'Chế phẩm', width: 150, render: (_, r) => <Tag color={THANH_PHAN[r.tp].color}>{THANH_PHAN[r.tp].label}</Tag> },
                  {
                    title: 'Thể tích', width: 120, render: (_, r) => (
                      <InputNumber size="small" min={1} max={theTich} value={r.ml} suffix="ml" disabled={loaiTui === 'Don'} style={{ width: 100 }}
                        onChange={(v) => setParts({ ...parts, [r.tp]: { ...parts[r.tp], ml: v } })} />
                    )
                  },
                  { title: 'Hạn sử dụng', width: 120, render: (_, r) => <><b>{ngay.add(THANH_PHAN[r.tp].days, 'day').format('DD/MM/YYYY')}</b><div style={{ fontSize: 11, color: '#64748b' }}>{THANH_PHAN[r.tp].days} ngày</div></> },
                  { title: 'Bảo quản', width: 150, render: (_, r) => <span style={{ fontSize: 12 }}>{BAO_QUAN[r.tp]}</span> },
                  {
                    title: 'Vị trí lưu trữ', render: (_, r) => (
                      <Input size="small" value={r.viTri} placeholder="Vị trí" onChange={(e) => setParts({ ...parts, [r.tp]: { ...parts[r.tp], viTri: e.target.value } })} />
                    )
                  }
                ]} />
              {loaiTui !== 'Don' && (
                <Typography.Text type={totalParts > theTich ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                  Tổng chế phẩm {totalParts} / {theTich} ml{totalParts <= theTich && ` · hao hụt điều chế ${theTich - totalParts} ml`}
                </Typography.Text>
              )}
              <Alert type="info" showIcon icon={<InfoCircleOutlined />} style={{ margin: '12px 0' }}
                message="Nguyên tắc nhập kho"
                description={<>
                  Mỗi lần hiến là <b>một túi máu riêng</b>, không trộn chung máu của nhiều người. Khi điều chế, túi máu được ly tâm rồi ép tách sang các
                  túi con trong cùng bộ túi kín; mỗi túi con là <b>một đơn vị máu</b> mang mã túi gốc + ký hiệu chế phẩm (TP/HC/HT/TC) để truy vết đến người hiến.
                </>} />
              <Form.Item name="ghiChu" label="Ghi chú"><Input placeholder="vd: Người hiến khỏe, không có phản ứng sau hiến" /></Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </>
  );
}
