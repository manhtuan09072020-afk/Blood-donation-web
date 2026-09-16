/* ================================================
   MAIN JAVASCRIPT FILE
   ================================================ */

// Utility: Validate Email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;
  return emailRegex.test(email) || phoneRegex.test(email);
}

// Utility: Validate Password
function isValidPassword(password) {
  return password.length >= 6;
}

// Utility: Show/Hide Error Message
function showError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);
  
  if (field && errorEl) {
    field.closest('.form-group').classList.add('error');
    errorEl.textContent = message;
  }
}

// Utility: Clear Error Message
function clearError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);
  
  if (field && errorEl) {
    field.closest('.form-group').classList.remove('error');
    errorEl.textContent = '';
  }
}

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});

// Add Animation on Scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = `fadeInUp 0.6s ease-out forwards`;
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe all elements with data-animate attribute
document.querySelectorAll('[data-animate]').forEach(el => {
  observer.observe(el);
});

// Console Log
console.log('%c🩸 Blood Donation System', 'color: #D32F2F; font-size: 20px; font-weight: bold;');
console.log('%cWelcome to Blood Donation System!', 'color: #616161; font-size: 14px;');