import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="Trang bạn tìm không tồn tại hoặc đã được di chuyển."
      extra={<Link to="/"><Button type="primary">Về trang chủ</Button></Link>}
      style={{ padding: '80px 0' }}
    />
  );
}
