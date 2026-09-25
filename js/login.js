/* ================================================
   LOGIN PAGE JAVASCRIPT
   ================================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Get Elements
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');

  // ================================================
  // PASSWORD TOGGLE VISIBILITY
  // ================================================
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      
      // Change icon based on visibility
      const icon = this.querySelector('.toggle-icon');
      if (icon) {
        icon.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
      }
    });
  }

  // ================================================
  // REAL-TIME VALIDATION
  // ================================================
  if (emailInput) {
    emailInput.addEventListener('blur', validateEmail);
    emailInput.addEventListener('input', validateEmail);
  }

  if (passwordInput) {
    passwordInput.addEventListener('blur', validatePassword);
    passwordInput.addEventListener('input', validatePassword);
  }

  // ================================================
  // VALIDATION FUNCTIONS
  // ================================================
  function validateEmail() {
    const value = emailInput.value.trim();
    
    if (!value) {
      showError('email', 'emailError', 'Vui lòng nhập email hoặc số điện thoại');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;
    
    if (!emailRegex.test(value) && !phoneRegex.test(value)) {
      showError('email', 'emailError', 'Email hoặc số điện thoại không hợp lệ');
      return false;
    }
    
    clearError('email', 'emailError');
    return true;
  }

  function validatePassword() {
    const value = passwordInput.value;
    
    if (!value) {
      showError('password', 'passwordError', 'Vui lòng nhập mật khẩu');
      return false;
    }
    
    if (value.length < 6) {
      showError('password', 'passwordError', 'Mật khẩu phải chứa ít nhất 6 ký tự');
      return false;
    }
    
    clearError('password', 'passwordError');
    return true;
  }

  // ================================================
  // FORM SUBMISSION
  // ================================================
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Validate both fields
      const isEmailValid = validateEmail();
      const isPasswordValid = validatePassword();
      
      if (isEmailValid && isPasswordValid) {
        // Submit login form via API
        submitLoginForm();
      }
    });
  }

  // ================================================
  // SUBMIT LOGIN FORM (ĐÃ KẾT NỐI API THẬT)
  // ================================================
  async function submitLoginForm() {
    const submitBtn = loginForm.querySelector('.btn-login-submit');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Đang xử lý...</span>';
    
    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      // Gọi API Đăng nhập từ api-config.js
      const data = await apiCall('/auth/login', 'POST', { email, password });

      if (data && data.token) {
        // Lưu Token và thông tin người dùng vào LocalStorage
        setAuthToken(data.token);
        if (data.user) {
          localStorage.setItem('userEmail', data.user.email || '');
          localStorage.setItem('userRole', data.user.role !== undefined ? data.user.role : '');
          localStorage.setItem('userName', data.user.name || '');
        }
        localStorage.setItem('isLoggedIn', 'true');

        // Hiển thị thông báo thành công
        showSuccessMessage();

        // Chuyển hướng sau 1.5 giây
        setTimeout(() => {
          // Phân quyền điều hướng dựa vào Role (VD: Role 2 = Admin, Role 1 = Doctor, Role 0 = User)
          if (data.user && (data.user.role === 2 || data.user.role === 1)) {
            window.location.href = 'admin-dashboard.html';
          } else {
            window.location.href = 'dashboard-user.html';
          }
        }, 1500);
      }
    } catch (error) {
      // Khôi phục nút bấm khi gặp lỗi
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      // Hiển thị thông báo lỗi lên giao diện
      showError('password', 'passwordError', error.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại!');
    }
  }

  // ================================================
  // SUCCESS MESSAGE
  // ================================================
  function showSuccessMessage() {
    // Create success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #43A047;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      animation: slideInRight 0.3s ease-out;
      font-weight: 500;
    `;
    notification.textContent = '✓ Đăng nhập thành công!';
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 2700);
  }

  // ================================================
  // SOCIAL LOGIN BUTTONS
  // ================================================
  const googleBtn = document.querySelector('.btn-google');
  if (googleBtn) {
    googleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      alert('Tính năng đăng nhập với Google sẽ được kích hoạt trong phiên bản tiếp theo!');
    });
  }

  // ================================================
  // KEYBOARD ENTER SHORTCUT
  // ================================================
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && loginForm) {
      const emailValid = validateEmail();
      const passwordValid = validatePassword();
      
      if (emailValid && passwordValid) {
        submitLoginForm();
      }
    }
  });

  // ================================================
  // CLEAR ERRORS ON FOCUS
  // ================================================
  if (emailInput) {
    emailInput.addEventListener('focus', function() {
      this.closest('.form-group').classList.remove('error');
      emailError.textContent = '';
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('focus', function() {
      this.closest('.form-group').classList.remove('error');
      passwordError.textContent = '';
    });
  }

  // ================================================
  // PREFILL FOR DEMO (OPTIONAL)
  // ================================================
  // Uncomment to prefill email/password for testing
  // emailInput.value = 'demo@example.com';
  // passwordInput.value = 'demo123';
});

// ================================================
// UTILITY FUNCTIONS
// ================================================
function showError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);
  
  if (field && errorEl) {
    field.closest('.form-group').classList.add('error');
    errorEl.textContent = message;
  }
}

function clearError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);
  
  if (field && errorEl) {
    field.closest('.form-group').classList.remove('error');
    errorEl.textContent = '';
  }
}