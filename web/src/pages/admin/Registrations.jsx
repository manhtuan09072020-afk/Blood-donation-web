import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { App, Button, Card, Form, Input, Modal, Segmented, Select, Space, Table, Typography, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, SearchOutlined, UserAddOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { registrationApi, campaignApi, donorApi } from '../../api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { BloodBadge, PageHeader, RegistrationStatusTag } from '../../components/common';
import { DANG_KY_STATUS, fmtDateTime, ageOf, bloodLabel } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import CreateDonorModal from '../../components/CreateDonorModal';

export default function Registrations() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState([]);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [walkIn, setWalkIn] = useState(false);
  const [donorOptions, setDonorOptions] = useState([]);
  const [walkForm] = Form.useForm();
  const [creatingDonor, setCreatingDonor] = useState(false);

  const dotId = params.get('dotId') ? Number(params.get('dotId')) : undefined;
  const status = params.get('trangThai') || 'all';
  const canApprove = hasRole(ROLES.QUAN_TRI, ROLES.NHAN_VIEN_TIEP_NHAN);

  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v === undefined || v === null || v === 'all') p.delete(k); else p.set(k, v);
    setParams(p, { replace: true });
  };

  const load = () => {
    setLoading(true);
    registrationApi.getAll({ dotId }).then((d) => { setData(d); setSelected([]); }).finally(() => setLoading(false));
  };
  useEffect(load, [dotId]);
  useEffect(() => { campaignApi.getAll().then(setCampaigns); }, []);

  const counts = useMemo(() => data.reduce((a, r) => ({ ...a, [r.trangThai]: (a[r.trangThai] || 0) + 1 }), {}), [data]);
  const shown = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return data.filter((r) => (status === 'all' || r.trangThai === status) && (!kw || `${r.hoTenNguoiHien} ${r.cccd} ${r.soDienThoai}`.toLowerCase().includes(kw)));
  }, [data, status, keyword]);

  const approve = async (ids) => {
    let ok = 0;
    for (const id of ids) {
      try { await registrationApi.updateStatus(id, { trangThai: 'DaDuyet' }); ok++; } catch (e) { message.error(e.message); }
    }
    if (ok) message.success(`Đã duyệt ${ok} đăng ký. Người hiến đã được thông báo.`);
    load();
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) { message.warning('Vui lòng nhập lý do từ chối'); return; }
    try {
      await registrationApi.updateStatus(rejecting.id, { trangThai: 'TuChoi', ghiChu: rejectReason });
      message.success('Đã từ chối đăng ký');
      setRejecting(null);
      setRejectReason('');
      load();
    } catch (e) { message.error(e.message); }
  };

  const searchDonor = async (q) => {
    if (!q || q.length < 2) return;
    const list = await donorApi.getAll({ keyword: q, trangThai: true });
    setDonorOptions(list.slice(0, 20).map((d) => ({ value: d.id, label: `${d.hoTen} — ${d.cccd} — ${bloodLabel(d.nhomMau, d.heRh)}` })));
  };

  const submitWalkIn = async () => {
    const v = await walkForm.validateFields();
    try {
      await registrationApi.walkIn(v);
      message.success('Đã đăng ký và duyệt — người hiến chuyển sang khám sàng lọc');
      setWalkIn(false);
      walkForm.resetFields();
      load();
    } catch (e) { message.error(e.message); }
  };

  const activeCampaigns = campaigns.filter((c) => ['SapDienRa', 'DangDienRa'].includes(c.trangThai));

  return (
    <>
      <PageHeader title="Đăng ký hiến máu" subtitle="Duyệt đăng ký trực tuyến và tiếp đón người hiến đến trực tiếp"
        extra={<>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('dang-ky-hien-mau', [
            { title: 'Người hiến', value: 'hoTenNguoiHien' }, { title: 'CCCD', value: 'cccd' }, { title: 'SĐT', value: 'soDienThoai' },
            { title: 'Nhóm máu', value: (r) => bloodLabel(r.nhomMau, r.heRh) }, { title: 'Đợt', value: 'tenDot' },
            { title: 'Ngày đăng ký', value: (r) => fmtDateTime(r.ngayDangKy) }, { title: 'Trạng thái', value: (r) => DANG_KY_STATUS[r.trangThai]?.label }
          ], shown)}>Xuất CSV</Button>
          {canApprove && <Button type="primary" icon={<UserAddOutlined />} onClick={() => { walkForm.setFieldsValue({ dotId: dotId || activeCampaigns.find((c) => c.trangThai === 'DangDienRa')?.id }); setWalkIn(true); }}>Đăng ký tại điểm</Button>}
        </>} />

      <Card variant="borderless">
        <div className="toolbar">
          <Select allowClear showSearch optionFilterProp="label" placeholder="Tất cả đợt hiến máu" style={{ width: 340 }} value={dotId}
            onChange={(v) => setParam('dotId', v)}
            options={campaigns.map((c) => ({ value: c.id, label: `${dayjs(c.ngayBatDau).format('DD/MM/YYYY')} · ${c.tenDot}` }))} />
          <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm tên, CCCD, SĐT" style={{ width: 240 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <Segmented style={{ marginBottom: 16 }} value={status} onChange={(v) => setParam('trangThai', v)}
          options={[{ label: `Tất cả (${data.length})`, value: 'all' }, ...Object.entries(DANG_KY_STATUS).map(([k, s]) => ({ label: `${s.label} (${counts[k] || 0})`, value: k }))]} />

        {canApprove && selected.length > 0 && (
          <Space style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7f8', borderRadius: 10, width: '100%' }}>
            <Typography.Text>Đã chọn <b>{selected.length}</b> đăng ký</Typography.Text>
            <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => approve(selected)}>Duyệt tất cả</Button>
          </Space>
        )}

        <Table
          rowKey="id" loading={loading} dataSource={shown} scroll={{ x: 1000 }}
          rowSelection={canApprove ? { selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: (r) => ({ disabled: r.trangThai !== 'ChoDuyet' }) } : undefined}
          pagination={{ pageSize: 12, showTotal: (t) => `${t} đăng ký` }}
          columns={[
            { title: 'Người hiến', dataIndex: 'hoTenNguoiHien', render: (v, r) => <><b>{v}</b><div style={{ color: '#64748b', fontSize: 12 }}>{r.gioiTinh}, {ageOf(r.ngaySinh)} tuổi · {r.soDienThoai}</div></> },
            { title: 'Nhóm máu', width: 100, render: (_, r) => <BloodBadge nhomMau={r.nhomMau} heRh={r.heRh} /> },
            { title: 'Đợt hiến máu', dataIndex: 'tenDot', render: (v, r) => <>{v}<div style={{ color: '#64748b', fontSize: 12 }}>{fmtDateTime(r.ngayBatDau)}</div></> },
            { title: 'Ngày đăng ký', dataIndex: 'ngayDangKy', width: 150, render: fmtDateTime, sorter: (a, b) => dayjs(a.ngayDangKy) - dayjs(b.ngayDangKy) },
            { title: 'Trạng thái', dataIndex: 'trangThai', width: 170, render: (v, r) => <Tooltip title={r.ghiChu}><span><RegistrationStatusTag value={v} /></span></Tooltip> },
            {
              title: '', width: 170, fixed: 'right', render: (_, r) => canApprove && (
                <Space>
                  {r.trangThai === 'ChoDuyet' && <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => approve([r.id])}>Duyệt</Button>}
                  {['ChoDuyet', 'DaDuyet'].includes(r.trangThai) && <Button size="small" danger icon={<CloseOutlined />} onClick={() => setRejecting(r)}>Từ chối</Button>}
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Modal title={`Từ chối đăng ký của ${rejecting?.hoTenNguoiHien}`} open={!!rejecting} onCancel={() => setRejecting(null)} onOk={confirmReject} okText="Từ chối" okButtonProps={{ danger: true }} cancelText="Hủy">
        <Typography.Paragraph type="secondary">Lý do sẽ được gửi đến người hiến qua thông báo.</Typography.Paragraph>
        <Select style={{ width: '100%', marginBottom: 8 }} placeholder="Chọn lý do thường gặp" onChange={setRejectReason}
          options={['Đợt hiến máu đã đủ số lượng', 'Thông tin cá nhân chưa chính xác', 'Chưa đủ 12 tuần kể từ lần hiến trước', 'Người hiến đề nghị đổi sang đợt khác'].map((v) => ({ value: v, label: v }))} />
        <Input.TextArea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Hoặc nhập lý do khác" maxLength={255} />
      </Modal>

      <Modal title="Đăng ký hiến máu tại điểm" open={walkIn} onCancel={() => setWalkIn(false)} onOk={submitWalkIn} okText="Đăng ký & duyệt" cancelText="Hủy" destroyOnHidden>
        <Typography.Paragraph type="secondary">Dành cho người hiến đến trực tiếp. Đăng ký được duyệt ngay và chuyển sang khám sàng lọc. Hệ thống vẫn kiểm tra tuổi và khoảng cách 12 tuần.</Typography.Paragraph>
        <Form form={walkForm} layout="vertical">
          <Form.Item name="nguoiHienId" label="Người hiến máu" rules={[{ required: true, message: 'Chọn người hiến' }]}>
            <Select showSearch filterOption={false} onSearch={searchDonor} options={donorOptions} placeholder="Gõ tên, CCCD hoặc SĐT để tìm…" notFoundContent="Nhập ít nhất 2 ký tự" />
          </Form.Item>
          <Typography.Paragraph style={{ marginTop: -12 }}>
            Người hiến lần đầu, chưa có hồ sơ? <a onClick={() => setCreatingDonor(true)}>Tạo hồ sơ mới</a>
          </Typography.Paragraph>
          <Form.Item name="dotId" label="Đợt hiến máu" rules={[{ required: true, message: 'Chọn đợt' }]}>
            <Select options={activeCampaigns.map((c) => ({ value: c.id, label: `${dayjs(c.ngayBatDau).format('DD/MM')} · ${c.tenDot}` }))} />
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú"><Input /></Form.Item>
        </Form>
      </Modal>

      <CreateDonorModal open={creatingDonor} onClose={() => setCreatingDonor(false)}
        onCreated={(d) => { setDonorOptions([{ value: d.id, label: `${d.hoTen} — ${d.cccd} — ${bloodLabel(d.nhomMau, d.heRh)}` }]); walkForm.setFieldValue('nguoiHienId', d.id); }} />
    </>
  );
}
