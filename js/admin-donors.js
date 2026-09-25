/* ================================================
   ADMIN DONORS MANAGEMENT JAVASCRIPT
   ================================================ */

document.addEventListener('DOMContentLoaded', async function () {
    // 1. KIỂM TRA BẢO VỆ TRANG (AUTH GUARD)
    // Nếu chưa đăng nhập (không có Token), bắt quay về trang login ngay lập tức
    const token = getAuthToken();
    if (!token) {
        alert('Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn!');
        window.location.href = 'login.html';
        return;
    }

    // 2. TẢI DỮ LIỆU BAN ĐẦU
    await loadDonorsList();

    // 3. SỰ KIỆN TÌM KIẾM (Nếu có ô tìm kiếm)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const keyword = e.target.value.toLowerCase();
            filterDonorsTable(keyword);
        });
    }
});

// ================================================
// HÀM GỌI API LẤY DANH SÁCH NGƯỜI HIẾN MÁU
// ================================================
async function loadDonorsList() {
    const tableBody = document.getElementById('donorTableBody');
    if (!tableBody) return;

    // Hiển thị trạng thái đang tải dữ liệu
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 20px;">
                <span>⏳ Đang tải danh sách người hiến máu...</span>
            </td>
        </tr>
    `;

    try {
        // Gọi API lấy danh sách người hiến máu (API endpoint: /donors hoặc /api/donors)
        const donors = await apiCall('/donors', 'GET');

        if (donors && donors.length > 0) {
            renderDonorsTable(donors);
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px;">
                        Chưa có dữ liệu người hiến máu.
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Lỗi khi tải danh sách người hiến máu:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: red; padding: 20px;">
                    ❌ Lỗi tải dữ liệu: ${error.message}
                </td>
            </tr>
        `;
    }
}

// ================================================
// HÀM RENDER DỮ LIỆU VÀO BẢNG HTML
// ================================================
function renderDonorsTable(donors) {
    const tableBody = document.getElementById('donorTableBody');
    if (!tableBody) return;

    let htmlContent = '';

    donors.forEach((donor, index) => {
        // Xử lý hiển thị nhóm máu
        const bloodTypeName = donor.bloodType ? donor.bloodType.type : (donor.bloodTypeName || 'Chưa xác định');
        
        // Format ngày tháng năm
        const formattedDate = donor.lastDonationDate 
            ? new Date(donor.lastDonationDate).toLocaleDateString('vi-VN') 
            : 'Chưa hiến';

        htmlContent += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${donor.fullName || donor.name}</strong></td>
                <td>${donor.phone || 'N/A'}</td>
                <td><span class="badge badge-blood">${bloodTypeName}</span></td>
                <td>${donor.address || 'N/A'}</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="btn-action btn-view" onclick="viewDonorDetail(${donor.id})">👁️ Xem</button>
                    <button class="btn-action btn-delete" onclick="deleteDonor(${donor.id})">🗑️ Xóa</button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = htmlContent;
}

// ================================================
// HÀM LỌC DỮ LIỆU KHI TÌM KIẾM THEO TÊN/SĐT
// ================================================
function filterDonorsTable(keyword) {
    const rows = document.querySelectorAll('#donorTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(keyword)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ================================================
// HÀM XÓA NGƯỜI HIẾN MÁU (GỌI API DELETE)
// ================================================
async function deleteDonor(donorId) {
    if (!confirm('Bạn có chắc chắn muốn xóa người hiến máu này?')) return;

    try {
        await apiCall(`/donors/${donorId}`, 'DELETE');
        alert('Xóa thành công!');
        // Tải lại danh sách sau khi xóa
        await loadDonorsList();
    } catch (error) {
        alert('Xóa thất bại: ' + error.message);
    }
}

// ================================================
// HÀM XEM CHI TIẾT NGƯỜI HIẾN MÁU
// ================================================
function viewDonorDetail(donorId) {
    alert('Chi tiết người hiến máu ID: ' + donorId);
    // Bạn có thể mở Modal hoặc chuyển hướng sang trang chi tiết
}