import { Form, Input, Modal, App } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { authApi } from '../api';

export default function ChangePasswordModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await authApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      message.success(res.message);
      form.resetFields();
      onClose();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Đổi mật khẩu" open={open} onCancel={onClose} onOk={submit} okText="Cập nhật" cancelText="Hủy" confirmLoading={saving} destroyOnHidden>
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
        <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}>
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>
        <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }]}>
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Nhập lại mật khẩu mới"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Nhập lại mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator: (_, v) => (!v || getFieldValue('newPassword') === v ? Promise.resolve() : Promise.reject(new Error('Mật khẩu nhập lại không khớp')))
            })
          ]}
        >
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
