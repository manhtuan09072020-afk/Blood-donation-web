import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, App, Button, Card, Checkbox, Col, DatePicker, Divider, Form, Input, InputNumber, Radio, Row, Select, Space, Table, Tabs, Tag, Typography, Steps, Result, Tooltip
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, ThunderboltOutlined, PrinterOutlined, CheckOutlined, DeleteOutlined, NotificationOutlined, EnvironmentOutlined, SwapOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { inventoryApi, catalogApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { BloodBadge, PageHeader } from '../../components/common';
import { fmtDate, fmtDateTime, fmtMl, THANH_PHAN, NHOM_MAU_OPTIONS, RH_OPTIONS, MUC_DO_KHAN, BAO_QUAN, bloodLabel, thanhPhanLabel } from '../../utils/format';
import { exportExcel } from '../../utils/exportExcel';

const CHECKLIST = [
  'Đã đối chiếu mã túi, nhóm máu, chế phẩm với phiếu yêu cầu của cơ sở y tế',
  'Đã kiểm tra nhãn và hạn sử dụng của từng túi',
  'Túi máu nguyên vẹn: không rò rỉ, không vón cục, không đổi màu, không tan máu',
  'Đã xếp vào thùng vận chuyển đúng nhiệt độ (hồng cầu/toàn phần 2–10 °C, tiểu cầu 20–24 °C, huyết tương giữ đông)'
];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// In phiếu xuất kho kiêm biên bản giao nhận máu (mở cửa sổ mới chỉ chứa nội dung phiếu)
export function printIssue(p) {
  const rows = p.chiTiet.map((c, i) => `<tr><td class="c">${i + 1}</td><td>${esc(c.maLoMau)}</td><td class="c">${bloodLabel(c.nhomMau, c.heRh)}</td><td>${thanhPhanLabel(c.thanhPhanMau)}</td><td class="r">${Number(c.soLuong)}</td><td class="c">${c.hanSuDung ? fmtDate(c.hanSuDung) : ''}</td><td>${BAO_QUAN[c.thanhPhanMau] || ''}</td></tr>`).join('');
  const mucDo = MUC_DO_KHAN[p.mucDoKhanCap]?.label || 'Thường quy';
  const w = window.open('', '_blank', 'width=900,height=1000');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${p.maPhieu}</title>
  <style>
    body{font-family:'Times New Roman',serif;padding:36px 44px;color:#111;font-size:14px}
    .top{display:flex;justify-content:space-between;text-align:center}.top b{display:block}
    h2{text-align:center;margin:22px 0 2px;font-size:20px}.sub{text-align:center;font-style:italic;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border:1px solid #333;padding:6px 7px}th{background:#f1f1f1}
    .c{text-align:center}.r{text-align:right}.info td{border:none;padding:3px 0}.badge{border:1px solid #c8102e;color:#c8102e;padding:1px 8px;border-radius:4px;font-weight:bold}
    .check{margin-top:12px}.check div{margin:3px 0}.sign{display:flex;justify-content:space-around;margin-top:36px;text-align:center}.sign div{width:30%}.muted{color:#555;font-size:13px}
  </style></head><body>
  <div class="top"><div><b>TRUNG TÂM HIẾN MÁU NHÂN ĐẠO</b><span class="muted">Hệ thống Giọt Hồng</span></div>
  <div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><u><b>Độc lập - Tự do - Hạnh phúc</b></u></div></div>
  <h2>PHIẾU XUẤT KHO KIÊM BIÊN BẢN GIAO NHẬN MÁU</h2>
  <div class="sub">Số: <b>${p.maPhieu}</b> &nbsp;·&nbsp; ${fmtDateTime(p.ngayXuat)} &nbsp;·&nbsp; Mức độ: <span class="badge">${mucDo}</span></div>
  <table class="info"><tr><td style="width:50%">Đơn vị nhận: <b>${esc(p.noiNhan)}</b></td><td>Người nhận: <b>${esc(p.nguoiNhan || '..............................')}</b></td></tr>
  <tr><td>Lý do / chẩn đoán: ${esc(p.lyDo || '—')}</td><td>Người giao (thủ kho): <b>${esc(p.nhanVienThucHien)}</b></td></tr></table>
  <table><thead><tr><th>STT</th><th>Mã đơn vị máu</th><th>Nhóm máu</th><th>Chế phẩm</th><th>Thể tích (ml)</th><th>Hạn sử dụng</th><th>Điều kiện bảo quản</th></tr></thead>
  <tbody>${rows}<tr><td colspan="4" class="r"><b>Tổng cộng: ${p.chiTiet.length} đơn vị</b></td><td class="r"><b>${Number(p.tongSoLuong)}</b></td><td colspan="2"></td></tr></tbody></table>
  <div class="check"><b>Kiểm tra khi giao nhận:</b>${CHECKLIST.map((c) => `<div>☑ ${c}</div>`).join('')}
  <div>Nhiệt độ thùng vận chuyển khi giao: ........ °C &nbsp;&nbsp; Thời gian giao: ....... giờ ....... phút</div></div>
  <div class="sign"><div><b>Người nhận</b><br/><i class="muted">(Ký, ghi rõ họ tên)</i><br/><br/><br/><br/>${esc(p.nguoiNhan || '')}</div>
  <div><b>Người giao</b><br/><i class="muted">(Ký, ghi rõ họ tên)</i><br/><br/><br/><br/>${esc(p.nhanVienThucHien)}</div>
  <div><b>Phụ trách kho máu</b><br/><i class="muted">(Ký, ghi rõ họ tên)</i></div></div>
  <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

const keyOf = (l) => `${l.nhomMau}|${l.heRh}|${l.thanhPhan}`;

function CreateIssue({ onCreated }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [facilities, setFacilities] = useState([]);
  const [picked, setPicked] = useState([]);
  const [lines, setLines] = useState([]); // kết quả đáp ứng từng dòng yêu cầu
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [checks, setChecks] = useState([]);

  useEffect(() => { catalogApi.getFacilities().then(setFacilities); }, []);

  const suggest = async () => {
    const v = await form.validateFields(['yeuCau']);
    setSuggesting(true);
    try {
      // Gộp các dòng trùng loại để không chọn trùng túi
      const merged = Object.values(v.yeuCau.reduce((a, l) => {
        const k = keyOf(l);
        a[k] = a[k] ? { ...a[k], soLuong: a[k].soLuong + l.soLuong } : { ...l };
        return a;
      }, {}));
      const choPhepThayThe = form.getFieldValue('choPhepThayThe');
      const all = [];
      const res = [];
      for (const line of merged) {
        const s = await inventoryApi.suggest({ nhomMau: line.nhomMau, heRh: line.heRh, thanhPhan: line.thanhPhan, soLuong: line.soLuong, choPhepThayThe });
        const fresh = s.chiTiet.map((c) => ({ ...c.lo, yeuCau: keyOf(line) })).filter((u) => !all.some((x) => x.id === u.id));
        all.push(...fresh);
        res.push({ ...line, key: keyOf(line), dapUng: fresh.reduce((a, u) => a + Number(u.soLuong), 0), soTui: fresh.length, thayThe: fresh.filter((u) => u.laThayThe).length, nhomTuongThich: s.nhomTuongThich });
      }
      setPicked(all);
      setLines(res);
      setChecks([]);
      if (!all.length) message.warning('Không tìm thấy đơn vị máu phù hợp trong kho');
    } catch (e) { message.error(e.message); }
    finally { setSuggesting(false); }
  };

  const remove = (u) => {
    const next = picked.filter((p) => p.id !== u.id);
    setPicked(next);
    setLines(lines.map((l) => {
      const mine = next.filter((p) => p.yeuCau === l.key);
      return { ...l, dapUng: mine.reduce((a, p) => a + Number(p.soLuong), 0), soTui: mine.length, thayThe: mine.filter((p) => p.laThayThe).length };
    }));
  };

  const submit = async () => {
    const v = await form.validateFields(['coSoYTeId', 'lyDo', 'nguoiNhan', 'mucDoKhanCap']);
    if (!picked.length) { message.warning('Chưa có đơn vị máu nào trong phiếu'); return; }
    setSaving(true);
    try {
      const res = await inventoryApi.issue({ ...v, chiTiet: picked.map((p) => ({ khoMauId: p.id, soLuong: p.soLuong })) });
      setResult(res);
      onCreated?.();
    } catch (e) { message.error(e.message); }
    finally { setSaving(false); }
  };

  const reset = () => { setResult(null); setPicked([]); setLines([]); setChecks([]); form.resetFields(); };
  const total = picked.reduce((a, p) => a + Number(p.soLuong), 0);
  const step = result ? 3 : picked.length ? (checks.length === CHECKLIST.length ? 2 : 1) : 0;

  if (result) {
    return (
      <Result status="success" title={`Đã xuất kho phiếu ${result.maPhieu}`}
        subTitle={`${result.chiTiet.length} túi máu · ${fmtMl(result.tongSoLuong)} cho ${result.noiNhan}${result.nguoiNhan ? ` (người nhận: ${result.nguoiNhan})` : ''}. Tồn kho đã được cập nhật.`}
        extra={[<Button key="p" type="primary" icon={<PrinterOutlined />} onClick={() => printIssue(result)}>In phiếu xuất & biên bản giao nhận</Button>, <Button key="n" onClick={reset}>Lập phiếu mới</Button>]} />
    );
  }

  return (
    <>
      <Steps size="small" current={step} style={{ marginBottom: 20 }}
        items={[{ title: 'Phiếu yêu cầu', description: 'Cơ sở y tế cần máu' }, { title: 'Chọn túi máu', description: 'FEFO · nguyên túi' }, { title: 'Kiểm tra trước khi giao' }, { title: 'Xuất kho & in phiếu' }]} />
      <Row gutter={24}>
        <Col xs={24} lg={10}>
          <Form form={form} layout="vertical" initialValues={{ mucDoKhanCap: 'Thuong', choPhepThayThe: false, yeuCau: [{ nhomMau: 'O', heRh: 'Rh+', thanhPhan: 'HongCau', soLuong: 500 }] }}>
            <Form.Item name="coSoYTeId" label="Cơ sở y tế yêu cầu máu" rules={[{ required: true, message: 'Chọn cơ sở y tế' }]}>
              <Select showSearch optionFilterProp="label" options={facilities.map((f) => ({ value: f.id, label: f.tenCoSo }))} placeholder="Chọn bệnh viện" />
            </Form.Item>
            <Form.Item name="mucDoKhanCap" label="Mức độ khẩn cấp">
              <Radio.Group block optionType="button" buttonStyle="solid" options={Object.entries(MUC_DO_KHAN).map(([k, m]) => ({ value: k, label: m.label }))} />
            </Form.Item>
            <Form.Item name="nguoiNhan" label="Người đến nhận máu"><Input placeholder="vd: ĐD Nguyễn Thị Lan – Khoa Hồi sức" maxLength={100} /></Form.Item>
            <Form.Item name="lyDo" label="Lý do / chẩn đoán"><Input placeholder="vd: Phẫu thuật cấp cứu – xuất huyết tiêu hóa" maxLength={255} /></Form.Item>
            <Typography.Text strong>Yêu cầu máu</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '2px 0 0' }}>Nhập lượng cần (ml); hệ thống chọn đủ số túi nguyên vẹn.</Typography.Paragraph>
            <Form.List name="yeuCau">
              {(fields, { add, remove: rm }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <Space key={key} align="baseline" style={{ display: 'flex', marginTop: 8 }} wrap>
                      <Form.Item name={[name, 'nhomMau']} rules={[{ required: true }]} noStyle><Select style={{ width: 72 }} options={NHOM_MAU_OPTIONS.map((o) => ({ ...o, label: o.value }))} /></Form.Item>
                      <Form.Item name={[name, 'heRh']} rules={[{ required: true }]} noStyle><Select style={{ width: 76 }} options={RH_OPTIONS.map((o) => ({ ...o, label: o.value }))} /></Form.Item>
                      <Form.Item name={[name, 'thanhPhan']} rules={[{ required: true }]} noStyle><Select style={{ width: 140 }} options={Object.entries(THANH_PHAN).map(([k, t]) => ({ value: k, label: t.label }))} /></Form.Item>
                      <Form.Item name={[name, 'soLuong']} rules={[{ required: true }]} noStyle><InputNumber min={1} step={50} style={{ width: 106 }} suffix="ml" /></Form.Item>
                      {fields.length > 1 && <MinusCircleOutlined onClick={() => rm(name)} />}
                    </Space>
                  ))}
                  <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => add({ heRh: 'Rh+', thanhPhan: 'HongCau', soLuong: 250 })}>Thêm dòng yêu cầu</Button>
                </>
              )}
            </Form.List>
            <Form.Item name="choPhepThayThe" valuePropName="checked" style={{ margin: '14px 0 0' }}>
              <Checkbox>Cho phép dùng nhóm máu tương thích khi thiếu đúng nhóm <Tooltip title="Hồng cầu: tương thích ABO/Rh (O− dùng sau cùng). Huyết tương/tiểu cầu: AB cho được mọi nhóm. Máu toàn phần bắt buộc cùng nhóm."><Typography.Text type="secondary">(theo chỉ định bác sĩ)</Typography.Text></Tooltip></Checkbox>
            </Form.Item>
            <Button type="primary" ghost block icon={<ThunderboltOutlined />} style={{ marginTop: 12 }} loading={suggesting} onClick={suggest}>Tự động chọn túi máu (FEFO)</Button>
          </Form>
        </Col>

        <Col xs={24} lg={14}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>Túi máu sẽ xuất</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            Máu được xuất <b>nguyên túi</b> (không rút một phần túi để giữ hệ kín, vô trùng). Túi có hạn dùng gần nhất được xuất trước (FEFO).
            Cần lượng nhỏ hơn một túi (bệnh nhi) thì <b>chia túi vô trùng</b> ở trang Tồn kho rồi xuất túi nhỏ.
          </Typography.Paragraph>

          {lines.map((l) => {
            const thieu = l.soLuong - l.dapUng;
            return (
              <Alert key={l.key} showIcon style={{ marginBottom: 8 }} type={thieu > 0 ? 'warning' : 'success'}
                message={<>
                  <b>{thanhPhanLabel(l.thanhPhan)} {bloodLabel(l.nhomMau, l.heRh)}</b>: yêu cầu {fmtMl(l.soLuong)} → {l.soTui} túi · {fmtMl(l.dapUng)}
                  {thieu > 0 ? <Typography.Text type="danger"> · thiếu {fmtMl(thieu)}</Typography.Text> : thieu < 0 && <Typography.Text type="secondary"> · dư {fmtMl(-thieu)} do xuất nguyên túi</Typography.Text>}
                  {l.thayThe > 0 && <Tag color="purple" style={{ marginLeft: 8 }}><SwapOutlined /> {l.thayThe} túi nhóm tương thích</Tag>}
                </>}
                description={thieu > 0 && (
                  <Space wrap>
                    <span>{l.nhomTuongThich?.length ? `Đã thử cả nhóm tương thích: ${l.nhomTuongThich.join(', ')}.` : 'Có thể bật "dùng nhóm tương thích" nếu bác sĩ chỉ định.'}</span>
                    <Button size="small" danger icon={<NotificationOutlined />} onClick={() => navigate(`/admin/outreach?nhomMau=${l.nhomMau}&heRh=${encodeURIComponent(l.heRh)}`)}>Kêu gọi hiến máu nhóm {bloodLabel(l.nhomMau, l.heRh)}</Button>
                  </Space>
                )} />
            );
          })}

          <Table rowKey="id" size="small" dataSource={picked} pagination={false} scroll={{ x: 720 }} locale={{ emptyText: 'Nhập phiếu yêu cầu và bấm "Tự động chọn túi máu"' }}
            columns={[
              { title: 'Mã túi', dataIndex: 'maLoMau', render: (v, u) => <><b>{v}</b>{u.laThayThe && <Tag color="purple" bordered={false} style={{ marginLeft: 4 }}>Thay thế</Tag>}</> },
              { title: 'Nhóm', width: 70, render: (_, u) => <BloodBadge nhomMau={u.nhomMau} heRh={u.heRh} /> },
              { title: 'Chế phẩm', dataIndex: 'thanhPhanMau', width: 120, render: (v) => <Tag color={THANH_PHAN[v]?.color}>{THANH_PHAN[v]?.short}</Tag> },
              { title: 'Thể tích', dataIndex: 'soLuong', width: 85, align: 'right', render: (v) => <b>{fmtMl(v)}</b> },
              { title: 'HSD', dataIndex: 'hanSuDung', width: 130, render: (v, u) => <>{fmtDate(v)} <Tag color={u.soNgayConLai <= 2 ? 'red' : u.soNgayConLai <= 7 ? 'orange' : 'green'} bordered={false}>{u.soNgayConLai}d</Tag></> },
              { title: 'Lấy tại', dataIndex: 'viTriLuuTru', render: (v) => <span style={{ fontSize: 12 }}><EnvironmentOutlined /> {v || 'Chưa xếp'}</span> },
              { title: '', width: 40, render: (_, u) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => remove(u)} /> }
            ]} />

          {picked.length > 0 && (
            <Card size="small" style={{ marginTop: 16, background: '#f8fafc' }} title="Kiểm tra trước khi giao máu">
              <Checkbox.Group value={checks} onChange={setChecks} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                options={CHECKLIST.map((c, i) => ({ value: i, label: c }))} />
            </Card>
          )}
          <Divider />
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Typography.Text>Tổng: <b>{picked.length}</b> túi · <b>{fmtMl(total)}</b></Typography.Text>
            <Tooltip title={picked.length && checks.length < CHECKLIST.length ? 'Hoàn tất bảng kiểm trước khi xuất' : ''}>
              <Button type="primary" size="large" icon={<CheckOutlined />} disabled={!picked.length || checks.length < CHECKLIST.length} loading={saving} onClick={submit}>Xác nhận xuất kho</Button>
            </Tooltip>
          </Space>
        </Col>
      </Row>
    </>
  );
}

function IssueHistory({ reloadKey }) {
  const { user } = useAuth();
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

  const detailRows = useMemo(() => data.flatMap((p) => p.chiTiet.map((c) => ({ ...c, maPhieu: p.maPhieu, ngayXuat: p.ngayXuat, noiNhan: p.noiNhan }))), [data]);

  return (
    <>
      <div className="toolbar">
        <DatePicker.RangePicker format="DD/MM/YYYY" value={range} onChange={setRange} />
        <Select allowClear placeholder="Tất cả cơ sở y tế" style={{ width: 260 }} value={facility} onChange={setFacility} options={facilities.map((f) => ({ value: f.id, label: f.tenCoSo }))} />
        <Typography.Text type="secondary">{data.length} phiếu · {fmtMl(data.reduce((a, p) => a + Number(p.tongSoLuong), 0))}</Typography.Text>
        <div style={{ flex: 1 }} />
        <Button icon={<DownloadOutlined />} onClick={() => exportExcel({
          fileName: 'so-xuat-kho-mau', title: 'Sổ xuất kho máu', sheetName: 'Xuất kho', signer: user?.hoTen,
          subtitle: `Từ ${range?.[0]?.format('DD/MM/YYYY') || '…'} đến ${range?.[1]?.format('DD/MM/YYYY') || '…'}${facility ? ` · ${facilities.find((f) => f.id === facility)?.tenCoSo}` : ''}`,
          summary: [
            { label: 'Số phiếu xuất', value: data.length }, { label: 'Số túi máu', value: detailRows.length },
            { label: 'Tổng thể tích', value: data.reduce((a, p) => a + Number(p.tongSoLuong), 0), type: 'ml' },
            { label: 'Phiếu cấp cứu', value: data.filter((p) => p.mucDoKhanCap === 'CapCuu').length, color: 'FFDC2626' }
          ],
          sections: [
            {
              title: 'DANH SÁCH PHIẾU XUẤT', rows: data, columns: [
                { title: 'Số phiếu', value: 'maPhieu' }, { title: 'Ngày xuất', value: 'ngayXuat', type: 'datetime' }, { title: 'Cơ sở y tế nhận', value: 'noiNhan' },
                { title: 'Mức độ', value: (p) => MUC_DO_KHAN[p.mucDoKhanCap]?.label || 'Thường quy' }, { title: 'Người nhận', value: 'nguoiNhan' },
                { title: 'Lý do', value: 'lyDo' }, { title: 'Số túi', value: (p) => p.chiTiet.length, type: 'number', total: 'sum' },
                { title: 'Tổng thể tích', value: 'tongSoLuong', type: 'ml', total: 'sum' }, { title: 'Người lập', value: 'nhanVienThucHien' }
              ]
            },
            {
              title: 'CHI TIẾT TÚI MÁU ĐÃ XUẤT', rows: detailRows, columns: [
                { title: 'Số phiếu', value: 'maPhieu' }, { title: 'Ngày xuất', value: 'ngayXuat', type: 'date' }, { title: 'Mã đơn vị', value: 'maLoMau' },
                { title: 'Nhóm máu', value: (c) => bloodLabel(c.nhomMau, c.heRh), align: 'center' }, { title: 'Chế phẩm', value: (c) => thanhPhanLabel(c.thanhPhanMau) },
                { title: 'Thể tích', value: 'soLuong', type: 'ml', total: 'sum' }, { title: 'Hạn sử dụng', value: 'hanSuDung', type: 'date' }, { title: 'Nơi nhận', value: 'noiNhan' }
              ]
            }
          ]
        })}>Xuất Excel</Button>
      </div>
      <Table rowKey="id" loading={loading} dataSource={data} pagination={{ pageSize: 10 }} scroll={{ x: 1000 }}
        expandable={{
          expandedRowRender: (p) => (
            <Table rowKey="khoMauId" size="small" pagination={false} dataSource={p.chiTiet}
              columns={[
                { title: 'Mã đơn vị', dataIndex: 'maLoMau' },
                { title: 'Nhóm máu', render: (_, c) => <BloodBadge nhomMau={c.nhomMau} heRh={c.heRh} /> },
                { title: 'Chế phẩm', dataIndex: 'thanhPhanMau', render: thanhPhanLabel },
                { title: 'Thể tích', dataIndex: 'soLuong', render: fmtMl },
                { title: 'Hạn sử dụng', dataIndex: 'hanSuDung', render: fmtDate }
              ]} />
          )
        }}
        columns={[
          { title: 'Số phiếu', dataIndex: 'maPhieu', render: (v) => <b>{v}</b> },
          { title: 'Ngày xuất', dataIndex: 'ngayXuat', render: fmtDateTime },
          { title: 'Nơi nhận', dataIndex: 'noiNhan', render: (v, p) => <>{v}{p.nguoiNhan && <div style={{ fontSize: 12, color: '#64748b' }}>Người nhận: {p.nguoiNhan}</div>}</> },
          { title: 'Mức độ', dataIndex: 'mucDoKhanCap', render: (v) => <Tag color={MUC_DO_KHAN[v]?.color}>{MUC_DO_KHAN[v]?.label || 'Thường quy'}</Tag> },
          { title: 'Lý do', dataIndex: 'lyDo', render: (v) => v || '—' },
          { title: 'Số túi', render: (_, p) => p.chiTiet.length, align: 'center' },
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
      <PageHeader title="Xuất kho máu" subtitle="Cấp phát máu theo phiếu yêu cầu của cơ sở y tế: chọn túi FEFO, kiểm tra, giao nhận và cập nhật tồn kho" />
      <Card variant="borderless">
        <Tabs items={[
          { key: 'create', label: 'Lập phiếu xuất', children: <CreateIssue onCreated={() => setReloadKey((k) => k + 1)} /> },
          { key: 'history', label: 'Lịch sử phiếu xuất', children: <IssueHistory reloadKey={reloadKey} /> }
        ]} />
      </Card>
    </>
  );
}
