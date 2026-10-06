import { useEffect, useState } from 'react';
import {
  Alert, App, Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space, Table, Tabs, Tag, Typography, Steps, Result
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, ThunderboltOutlined, PrinterOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { inventoryApi, catalogApi } from '../../api';
import { BloodBadge, PageHeader } from '../../components/common';
import { fmtDate, fmtDateTime, fmtMl, THANH_PHAN, NHOM_MAU_OPTIONS, RH_OPTIONS, COMPATIBILITY, bloodLabel, thanhPhanLabel } from '../../utils/format';

// In phiếu xuất kho theo mẫu (mở cửa sổ mới chỉ chứa nội dung phiếu)
export function printIssue(p) {
  const rows = p.chiTiet.map((c, i) => `<tr><td>${i + 1}</td><td>${c.maLoMau}</td><td>${bloodLabel(c.nhomMau, c.heRh)}</td><td>${thanhPhanLabel(c.thanhPhanMau)}</td><td style="text-align:right">${c.soLuong}</td></tr>`).join('');
  const w = window.open('', '_blank', 'width=820,height=900');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${p.maPhieu}</title>
  <style>body{font-family:'Times New Roman',serif;padding:40px;color:#111}h2{text-align:center;margin:4px 0}table{width:100%;border-collapse:collapse;margin-top:16px}
  td,th{border:1px solid #333;padding:6px 8px;font-size:14px}th{background:#f2f2f2}.head{display:flex;justify-content:space-between;font-size:14px}
  .sign{display:flex;justify-content:space-around;margin-top:48px;text-align:center}.muted{color:#555;font-size:13px}</style></head><body>
  <div class="head"><div><b>TRUNG TÂM HIẾN MÁU NHÂN ĐẠO</b><br/><span class="muted">Hệ thống Giọt Hồng</span></div><div style="text-align:right">Số: <b>${p.maPhieu}</b><br/>${fmtDateTime(p.ngayXuat)}</div></div>
  <h2>PHIẾU XUẤT KHO MÁU</h2>
  <p>Nơi nhận: <b>${p.noiNhan}</b><br/>Lý do xuất: ${p.lyDo || '—'}<br/>Người lập phiếu: ${p.nhanVienThucHien}</p>
  <table><thead><tr><th>STT</th><th>Mã đơn vị máu</th><th>Nhóm máu</th><th>Thành phần</th><th>Số lượng (ml)</th></tr></thead>
  <tbody>${rows}<tr><td colspan="4" style="text-align:right"><b>Tổng cộng</b></td><td style="text-align:right"><b>${p.tongSoLuong}</b></td></tr></tbody></table>
  <div class="sign"><div><b>Người nhận</b><br/><i class="muted">(Ký, ghi rõ họ tên)</i></div><div><b>Người lập phiếu</b><br/><i class="muted">(Ký, ghi rõ họ tên)</i><br/><br/><br/><br/>${p.nhanVienThucHien}</div></div>
  <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

function CreateIssue({ onCreated }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [facilities, setFacilities] = useState([]);
  const [picked, setPicked] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { catalogApi.getFacilities().then(setFacilities); }, []);

  const suggest = async () => {
    const v = await form.validateFields(['yeuCau']);
    setSuggesting(true);
    try {
      const all = [];
      const short = [];
      for (const line of v.yeuCau) {
        const s = await inventoryApi.suggest({ nhomMau: line.nhomMau, heRh: line.heRh, thanhPhan: line.thanhPhan, soLuong: line.soLuong });
        s.chiTiet.forEach((c) => all.push({ ...c.lo, soLuongXuat: Number(c.soLuongXuat) }));
        if (!s.duSoLuong) short.push({ ...line, thieu: s.soLuongYeuCau - s.soLuongDapUng });
      }
      // Gộp trùng lô nếu nhiều dòng yêu cầu cùng loại
      const merged = Object.values(all.reduce((a, u) => {
        a[u.id] = a[u.id] ? { ...a[u.id], soLuongXuat: Math.min(u.soLuong, a[u.id].soLuongXuat + u.soLuongXuat) } : u;
        return a;
      }, {}));
      setPicked(merged);
      setShortages(short);
      if (!merged.length) message.warning('Không tìm thấy đơn vị máu phù hợp trong kho');
    } catch (e) { message.error(e.message); }
    finally { setSuggesting(false); }
  };

  const submit = async () => {
    const v = await form.validateFields(['coSoYTeId', 'lyDo']);
    if (!picked.length) { message.warning('Chưa có đơn vị máu nào trong phiếu'); return; }
    setSaving(true);
    try {
      const res = await inventoryApi.issue({ coSoYTeId: v.coSoYTeId, lyDo: v.lyDo, chiTiet: picked.map((p) => ({ khoMauId: p.id, soLuong: p.soLuongXuat })) });
      setResult(res);
      onCreated?.();
    } catch (e) { message.error(e.message); }
    finally { setSaving(false); }
  };

  const reset = () => { setResult(null); setPicked([]); setShortages([]); form.resetFields(); };

  if (result) {
    return (
      <Result status="success" title={`Đã xuất kho phiếu ${result.maPhieu}`}
        subTitle={`${result.chiTiet.length} đơn vị · ${fmtMl(result.tongSoLuong)} cho ${result.noiNhan}. Tồn kho đã được cập nhật.`}
        extra={[<Button key="p" type="primary" icon={<PrinterOutlined />} onClick={() => printIssue(result)}>In phiếu xuất</Button>, <Button key="n" onClick={reset}>Lập phiếu mới</Button>]} />
    );
  }

  return (
    <Row gutter={24}>
      <Col xs={24} lg={10}>
        <Steps direction="vertical" size="small" current={picked.length ? 2 : 0} items={[{ title: 'Nhập yêu cầu của cơ sở y tế' }, { title: 'Hệ thống chọn đơn vị máu (FEFO)' }, { title: 'Xác nhận xuất kho' }]} style={{ marginBottom: 16 }} />
        <Form form={form} layout="vertical" initialValues={{ yeuCau: [{ nhomMau: 'O', heRh: 'Rh+', thanhPhan: 'HongCau', soLuong: 500 }] }}>
          <Form.Item name="coSoYTeId" label="Cơ sở y tế nhận máu" rules={[{ required: true, message: 'Chọn cơ sở y tế' }]}>
            <Select showSearch optionFilterProp="label" options={facilities.map((f) => ({ value: f.id, label: f.tenCoSo }))} placeholder="Chọn bệnh viện" />
          </Form.Item>
          <Form.Item name="lyDo" label="Lý do / mục đích sử dụng"><Input placeholder="vd: Phẫu thuật cấp cứu" /></Form.Item>
          <Typography.Text strong>Yêu cầu máu</Typography.Text>
          <Form.List name="yeuCau">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginTop: 8 }} wrap>
                    <Form.Item name={[name, 'nhomMau']} rules={[{ required: true }]} noStyle><Select style={{ width: 76 }} options={NHOM_MAU_OPTIONS.map((o) => ({ ...o, label: o.value }))} /></Form.Item>
                    <Form.Item name={[name, 'heRh']} rules={[{ required: true }]} noStyle><Select style={{ width: 76 }} options={RH_OPTIONS.map((o) => ({ ...o, label: o.value }))} /></Form.Item>
                    <Form.Item name={[name, 'thanhPhan']} rules={[{ required: true }]} noStyle><Select style={{ width: 136 }} options={Object.entries(THANH_PHAN).map(([k, t]) => ({ value: k, label: t.label }))} /></Form.Item>
                    <Form.Item name={[name, 'soLuong']} rules={[{ required: true }]} noStyle><InputNumber min={1} style={{ width: 104 }} suffix="ml" /></Form.Item>
                    {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(name)} />}
                  </Space>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => add({ heRh: 'Rh+', thanhPhan: 'HongCau', soLuong: 250 })}>Thêm dòng yêu cầu</Button>
              </>
            )}
          </Form.List>
          <Button type="primary" ghost block icon={<ThunderboltOutlined />} style={{ marginTop: 16 }} loading={suggesting} onClick={suggest}>Tự động chọn đơn vị máu (FEFO)</Button>
        </Form>
      </Col>
      <Col xs={24} lg={14}>
        <Typography.Title level={5}>Đơn vị máu sẽ xuất</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>Nguyên tắc FEFO: đơn vị có hạn sử dụng gần nhất được xuất trước để giảm lãng phí do hết hạn.</Typography.Paragraph>
        {shortages.map((s, i) => (
          <Alert key={i} type="warning" showIcon style={{ marginBottom: 8 }}
            message={`Thiếu ${fmtMl(s.thieu)} ${thanhPhanLabel(s.thanhPhan)} nhóm ${bloodLabel(s.nhomMau, s.heRh)}`}
            description={`Có thể thay thế bằng nhóm tương thích: ${COMPATIBILITY[`${s.nhomMau}${s.heRh === 'Rh+' ? '+' : '-'}`].filter((x) => x !== `${s.nhomMau}${s.heRh === 'Rh+' ? '+' : '-'}`).join(', ') || 'không có'} (theo chỉ định của bác sĩ). Nên gửi kêu gọi hiến máu.`} />
        ))}
        <Table rowKey="id" size="small" dataSource={picked} pagination={false} locale={{ emptyText: 'Nhập yêu cầu và bấm "Tự động chọn"' }}
          columns={[
            { title: 'Mã đơn vị', dataIndex: 'maLoMau', render: (v) => <b>{v}</b> },
            { title: 'Nhóm', render: (_, u) => <BloodBadge nhomMau={u.nhomMau} heRh={u.heRh} /> },
            { title: 'Thành phần', dataIndex: 'thanhPhanMau', render: (v) => thanhPhanLabel(v) },
            { title: 'HSD', dataIndex: 'hanSuDung', render: (v, u) => <>{fmtDate(v)} <Tag color={u.soNgayConLai <= 7 ? 'orange' : 'green'} bordered={false}>{u.soNgayConLai}d</Tag></> },
            { title: 'Tồn', dataIndex: 'soLuong', render: fmtMl },
            {
              title: 'Xuất (ml)', width: 120, render: (_, u) => (
                <InputNumber size="small" min={1} max={u.soLuong} value={u.soLuongXuat} onChange={(v) => setPicked(picked.map((p) => (p.id === u.id ? { ...p, soLuongXuat: v } : p)))} />
              )
            },
            { title: '', width: 40, render: (_, u) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => setPicked(picked.filter((p) => p.id !== u.id))} /> }
          ]} />
        <Divider />
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Text>Tổng: <b>{picked.length}</b> đơn vị · <b>{fmtMl(picked.reduce((a, p) => a + (p.soLuongXuat || 0), 0))}</b></Typography.Text>
          <Button type="primary" size="large" icon={<CheckOutlined />} disabled={!picked.length} loading={saving} onClick={submit}>Xác nhận xuất kho</Button>
        </Space>
      </Col>
    </Row>
  );
}

function IssueHistory({ reloadKey }) {
  const [data, setData] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [range, setRange] = useState([dayjs().subtract(3, 'month'), dayjs()]);
  const [facility, setFacility] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => { catalogApi.getFacilities(true).then(setFacilities); }, []);
  useEffect(() => {
    setLoading(true);
    inventoryApi.getIssues({ tuNgay: range?.[0]?.format('YYYY-MM-DD'), denNgay: range?.[1]?.format('YYYY-MM-DD'), coSoYTeId: facility })
      .then(setData).finally(() => setLoading(false));
  }, [range, facility, reloadKey]);

  return (
    <>
      <div className="toolbar">
        <DatePicker.RangePicker format="DD/MM/YYYY" value={range} onChange={setRange} />
        <Select allowClear placeholder="Tất cả cơ sở y tế" style={{ width: 260 }} value={facility} onChange={setFacility} options={facilities.map((f) => ({ value: f.id, label: f.tenCoSo }))} />
        <Typography.Text type="secondary">{data.length} phiếu · {fmtMl(data.reduce((a, p) => a + Number(p.tongSoLuong), 0))}</Typography.Text>
      </div>
      <Table rowKey="id" loading={loading} dataSource={data} pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (p) => (
            <Table rowKey="khoMauId" size="small" pagination={false} dataSource={p.chiTiet}
              columns={[
                { title: 'Mã đơn vị', dataIndex: 'maLoMau' },
                { title: 'Nhóm máu', render: (_, c) => <BloodBadge nhomMau={c.nhomMau} heRh={c.heRh} /> },
                { title: 'Thành phần', dataIndex: 'thanhPhanMau', render: thanhPhanLabel },
                { title: 'Số lượng', dataIndex: 'soLuong', render: fmtMl }
              ]} />
          )
        }}
        columns={[
          { title: 'Số phiếu', dataIndex: 'maPhieu', render: (v) => <b>{v}</b> },
          { title: 'Ngày xuất', dataIndex: 'ngayXuat', render: fmtDateTime },
          { title: 'Nơi nhận', dataIndex: 'noiNhan' },
          { title: 'Lý do', dataIndex: 'lyDo', render: (v) => v || '—' },
          { title: 'Số đơn vị', render: (_, p) => p.chiTiet.length, align: 'center' },
          { title: 'Tổng', dataIndex: 'tongSoLuong', render: (v) => <b>{fmtMl(v)}</b>, align: 'right' },
          { title: 'Người lập', dataIndex: 'nhanVienThucHien' },
          { title: '', render: (_, p) => <Button size="small" icon={<PrinterOutlined />} onClick={() => printIssue(p)}>In</Button> }
        ]} />
    </>
  );
}

export default function Issues() {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <>
      <PageHeader title="Xuất kho máu" subtitle="Cấp phát máu theo yêu cầu của cơ sở y tế, tự động cập nhật tồn kho" />
      <Card variant="borderless">
        <Tabs items={[
          { key: 'create', label: 'Lập phiếu xuất', children: <CreateIssue onCreated={() => setReloadKey((k) => k + 1)} /> },
          { key: 'history', label: 'Lịch sử phiếu xuất', children: <IssueHistory reloadKey={reloadKey} /> }
        ]} />
      </Card>
    </>
  );
}
