import { useEffect, useMemo, useState } from 'react';
import {
  Alert, App, Button, Card, Checkbox, Col, DatePicker, Descriptions, Form, Input, InputNumber, Modal, Radio, Row, Segmented, Select, Space, Table, Tabs, Tag, Typography
} from 'antd';
import { ExperimentOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { collectionApi } from '../../api';
import { BloodBadge, PageHeader } from '../../components/common';
import { fmtDateTime, fmtDate, fmtMl, THANH_PHAN, NHOM_MAU_OPTIONS, RH_OPTIONS } from '../../utils/format';

const COMPONENTS = ['HongCau', 'HuyetTuong', 'TieuCau'];

function defaultComponents(theTich) {
  return {
    HongCau: { on: true, ml: Math.round((theTich * 0.55) / 10) * 10, viTri: '' },
    HuyetTuong: { on: true, ml: Math.round((theTich * 0.35) / 10) * 10, viTri: 'Tủ đông HT-01' },
    TieuCau: { on: theTich >= 350, ml: 50, viTri: 'Máy lắc tiểu cầu TC-01' }
  };
}

export default function Collection() {
  const { message, modal } = App.useApp();
  const [pending, setPending] = useState([]);
  const [done, setDone] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [current, setCurrent] = useState(null);
  const [mode, setMode] = useState('whole');
  const [comps, setComps] = useState(defaultComponents(350));
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const theTich = Form.useWatch('theTich', form) || 0;

  const load = () => {
    setLoading(true);
    Promise.all([collectionApi.getPending().then(setPending), collectionApi.getAll().then(setDone)]).finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => { if (theTich) setComps(defaultComponents(theTich)); }, [theTich]);

  const open = (s) => {
    setCurrent(s);
    setMode('whole');
    form.resetFields();
    const rh = s.heRh === 'Rh-' ? '-' : '+';
    form.setFieldsValue({ theTich: 350, hanSuDung: dayjs().add(35, 'day'), viTriLuuTru: s.nhomMau ? `Tủ lạnh ${s.nhomMau}${rh} / Ngăn 1` : '' });
  };

  const totalComp = useMemo(() => COMPONENTS.filter((k) => comps[k].on).reduce((a, k) => a + (comps[k].ml || 0), 0), [comps]);

  const submit = async () => {
    const v = await form.validateFields();
    const payload = { khamSangLocId: current.id, theTich: v.theTich, ghiChu: v.ghiChu, nhomMau: v.nhomMau, heRh: v.heRh };
    if (mode === 'whole') {
      Object.assign(payload, { thanhPhanMau: 'ToanPhan', hanSuDung: v.hanSuDung.format('YYYY-MM-DD'), viTriLuuTru: v.viTriLuuTru });
    } else {
      const selected = COMPONENTS.filter((k) => comps[k].on);
      if (!selected.length) { message.warning('Chọn ít nhất một thành phần'); return; }
      if (totalComp > v.theTich) { message.warning('Tổng thể tích thành phần vượt quá lượng máu đã lấy'); return; }
      payload.thanhPhans = selected.map((k) => ({ thanhPhanMau: k, theTich: comps[k].ml, viTriLuuTru: comps[k].viTri || null }));
    }
    setSaving(true);
    try {
      const res = await collectionApi.create(payload);
      setCurrent(null);
      modal.success({
        title: 'Đã tiếp nhận & nhập kho',
        content: <div>Tạo {res.cacLoMau.length} đơn vị máu:<ul>{res.cacLoMau.map((l) => <li key={l.id}><b>{l.maLoMau}</b> — {THANH_PHAN[l.thanhPhanMau].label} {fmtMl(l.soLuong)}, HSD {fmtDate(l.hanSuDung)}</li>)}</ul></div>
      });
      load();
    } catch (e) { message.error(e.message); }
    finally { setSaving(false); }
  };

  const kw = keyword.toLowerCase();

  return (
    <>
      <PageHeader title="Tiếp nhận máu & nhập kho" subtitle="Ghi nhận lượng máu đã lấy từ người đạt sàng lọc và tạo đơn vị máu trong kho" />
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
                  { title: '', width: 150, render: (_, r) => <Button type="primary" icon={<ExperimentOutlined />} onClick={() => open(r)}>Tiếp nhận</Button> }
                ]} />
            )
          },
          {
            key: 'done', label: `Đã tiếp nhận (${done.length})`,
            children: (
              <Table rowKey="id" loading={loading} dataSource={done.filter((p) => !kw || p.hoTenNguoiHien.toLowerCase().includes(kw))} pagination={{ pageSize: 10 }} scroll={{ x: 900 }}
                columns={[
                  { title: 'Người hiến', dataIndex: 'hoTenNguoiHien', render: (v, r) => <><b>{v}</b><div style={{ fontSize: 12, color: '#64748b' }}>{r.tenDot}</div></> },
                  { title: 'Nhóm máu', width: 90, render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
                  { title: 'Lấy máu lúc', dataIndex: 'ngayLayMau', width: 150, render: fmtDateTime, sorter: (a, b) => dayjs(a.ngayLayMau) - dayjs(b.ngayLayMau) },
                  { title: 'Thể tích', dataIndex: 'theTich', width: 90, render: fmtMl },
                  { title: 'Đơn vị máu tạo ra', render: (_, r) => <Space size={4} wrap>{r.cacLoMau.map((l) => <Tag key={l.id} color={THANH_PHAN[l.thanhPhanMau].color}>{l.maLoMau} · {THANH_PHAN[l.thanhPhanMau].short} {l.soLuong}ml</Tag>)}</Space> },
                  { title: 'Nhân viên', dataIndex: 'nhanVienThucHien', width: 150 }
                ]} />
            )
          }
        ]} />
      </Card>

      <Modal open={!!current} onCancel={() => setCurrent(null)} title="Phiếu tiếp nhận máu" width={760} onOk={submit} okText="Xác nhận nhập kho" cancelText="Hủy" confirmLoading={saving} destroyOnHidden>
        {current && (
          <>
            <Descriptions size="small" column={3} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Người hiến"><b>{current.hoTenNguoiHien}</b></Descriptions.Item>
              <Descriptions.Item label="Nhóm máu"><BloodBadge nhomMau={current.nhomMau} heRh={current.heRh} /></Descriptions.Item>
              <Descriptions.Item label="Cân nặng">{current.canNang} kg</Descriptions.Item>
            </Descriptions>
            <Form form={form} layout="vertical">
              {!current.nhomMau && (
                <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Người hiến chưa có nhóm máu — nhập kết quả xét nghiệm nhóm máu (sẽ lưu vào hồ sơ)." />
              )}
              <Row gutter={12}>
                <Col span={14}>
                  <Form.Item name="theTich" label="Thể tích máu đã lấy (ml)" rules={[{ required: true }]}>
                    <Radio.Group optionType="button" buttonStyle="solid" options={[250, 350, 450].map((v) => ({ value: v, label: `${v} ml` }))} />
                  </Form.Item>
                </Col>
                {!current.nhomMau && (
                  <>
                    <Col span={5}><Form.Item name="nhomMau" label="Nhóm máu" rules={[{ required: true }]}><Select options={NHOM_MAU_OPTIONS} /></Form.Item></Col>
                    <Col span={5}><Form.Item name="heRh" label="Hệ Rh" rules={[{ required: true }]}><Select options={RH_OPTIONS} /></Form.Item></Col>
                  </>
                )}
              </Row>
              <Segmented block value={mode} onChange={setMode} style={{ marginBottom: 16 }}
                options={[{ label: 'Nhập kho nguyên túi (máu toàn phần)', value: 'whole' }, { label: 'Điều chế tách thành phần', value: 'split' }]} />

              {mode === 'whole' ? (
                <Row gutter={12}>
                  <Col span={10}><Form.Item name="hanSuDung" label="Hạn sử dụng" rules={[{ required: true }]} extra="Mặc định 35 ngày (túi CPDA-1)"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isBefore(dayjs().add(1, 'day'), 'day')} /></Form.Item></Col>
                  <Col span={14}><Form.Item name="viTriLuuTru" label="Vị trí lưu trữ"><Input placeholder="vd: Tủ lạnh O+ / Ngăn 2" /></Form.Item></Col>
                </Row>
              ) : (
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 12 }}>
                  {COMPONENTS.map((k) => (
                    <Row gutter={12} key={k} align="middle" style={{ marginBottom: 8 }}>
                      <Col span={7}><Checkbox checked={comps[k].on} onChange={(e) => setComps({ ...comps, [k]: { ...comps[k], on: e.target.checked } })}><b>{THANH_PHAN[k].label}</b></Checkbox></Col>
                      <Col span={5}><InputNumber disabled={!comps[k].on} min={1} value={comps[k].ml} suffix="ml" onChange={(v) => setComps({ ...comps, [k]: { ...comps[k], ml: v } })} /></Col>
                      <Col span={5}><Typography.Text type="secondary" style={{ fontSize: 12 }}>HSD {dayjs().add(THANH_PHAN[k].days, 'day').format('DD/MM/YYYY')}</Typography.Text></Col>
                      <Col span={7}><Input disabled={!comps[k].on} placeholder="Vị trí lưu trữ" value={comps[k].viTri} onChange={(e) => setComps({ ...comps, [k]: { ...comps[k], viTri: e.target.value } })} /></Col>
                    </Row>
                  ))}
                  <Typography.Text type={totalComp > theTich ? 'danger' : 'secondary'}>Tổng thành phần: {totalComp} / {theTich} ml</Typography.Text>
                </div>
              )}
              <Form.Item name="ghiChu" label="Ghi chú"><Input placeholder="vd: Người hiến khỏe, không có phản ứng sau hiến" /></Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </>
  );
}
