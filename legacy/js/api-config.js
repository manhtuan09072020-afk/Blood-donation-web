// js/api-config.js

// 1. Đường dẫn Backend .NET API (Hãy sửa lại đúng Port mà Visual Studio đang chạy)
const API_BASE_URL = 'https://localhost:7298/api'; // Thay 7298 bằng đúng Port của bạn

// 2. Lưu token sau khi đăng nhập thành công vào trình duyệt
function setAuthToken(token) {
    localStorage.setItem('authToken', token);
}

// 3. Lấy token ra để dùng cho các request cần xác thực
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// 4. Tạo Header chuẩn kèm theo JWT Token
function getHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// 5. Hàm gọi API dùng chung (Helper Function)
async function apiCall(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: getHeaders()
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

        // Nếu Hết hạn phiên đăng nhập hoặc Un-authorized (Lỗi 401)
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = 'login.html';
            return null;
        }

        if (!response.ok) {
            const errorMsg = await response.text();
            throw new Error(errorMsg || `Lỗi API: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}