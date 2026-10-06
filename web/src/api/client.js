import axios from 'axios';

// Ưu tiên message do API trả về; với lỗi validation (ModelState) gộp các thông báo theo từng trường.
function extractMessage(error) {
  const data = error.response?.data;
  if (data?.message) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length > 0) return messages.join(' ');
  }
  if (!error.response) return 'Không kết nối được máy chủ. Hãy kiểm tra API đã chạy chưa.';
  if (error.response.status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (error.response.status === 404) return 'Không tìm thấy dữ liệu.';
  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject({ message: extractMessage(error), status: error.response?.status });
  }
);

export default client;
