/* ================================================
   HOME PAGE JAVASCRIPT
   ================================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize features
  initStatisticsCounter();
  initNewsletterForm();
  initNavbarActiveLink();
  initSmoothScroll();
});

/* ================================================
   STATISTICS COUNTER ANIMATION
   ================================================ */
function initStatisticsCounter() {
  const counters = document.querySelectorAll('[data-count]');
  
  if (counters.length === 0) return;

  // Intersection Observer to trigger animation when visible
  const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  counters.forEach(counter => {
    observer.observe(counter);
  });
}

function animateCounter(element) {
  const targetValue = parseInt(element.getAttribute('data-count'));
  const duration = 2000; // 2 seconds
  const startValue = 0;
  const startTime = Date.now();

  const formatter = new Intl.NumberFormat('vi-VN');

  function updateCounter() {
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out)
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);

    element.textContent = formatter.format(currentValue);

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = formatter.format(targetValue);
    }
  }

  updateCounter();
}

/* ================================================
   NEWSLETTER FORM
   ================================================ */
function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const emailInput = this.querySelector('input[type="email"]');
    const email = emailInput.value.trim();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showNotification('Email không hợp lệ', 'error');
      return;
    }

    // Show loading state
    const button = this.querySelector('button');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Đang xử lý...';

    // Simulate API call
    setTimeout(() => {
      // Show success message
      showNotification('✓ Đăng ký thành công! Vui lòng kiểm tra email của bạn.', 'success');

      // Reset form
      form.reset();
      button.disabled = false;
      button.textContent = originalText;
    }, 1500);
  });
}

/* ================================================
   NAVBAR ACTIVE LINK
   ================================================ */
function initNavbarActiveLink() {
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* ================================================
   SMOOTH SCROLL FOR ANCHOR LINKS
   ================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const navHeight = document.querySelector('.navbar').offsetHeight;
          const targetPosition = target.offsetTop - navHeight - 20;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });
}

/* ================================================
   NOTIFICATION SYSTEM
   ================================================ */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 8px;
    font-weight: 500;
    z-index: 9999;
    animation: slideInRight 0.3s ease-out;
    max-width: 400px;
  `;

  // Set color based on type
  if (type === 'success') {
    notification.style.backgroundColor = '#43A047';
    notification.style.color = 'white';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#D32F2F';
    notification.style.color = 'white';
  } else {
    notification.style.backgroundColor = '#1976D2';
    notification.style.color = 'white';
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  // Add box shadow
  notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';

  // Remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 4000);
}

/* ================================================
   SCROLL ANIMATIONS FOR CARDS
   ================================================ */
function initScrollAnimations() {
  const cards = document.querySelectorAll('.why-card, .event-card, .faq-item');
  
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        entry.target.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s backwards`;
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  cards.forEach(card => {
    observer.observe(card);
  });
}

// Initialize scroll animations when DOM is ready
initScrollAnimations();

/* ================================================
   NAVBAR SCROLL EFFECT
   ================================================ */
window.addEventListener('scroll', function() {
  const navbar = document.querySelector('.navbar');
  
  if (window.scrollY > 50) {
    navbar.style.boxShadow = 'var(--shadow-md)';
  } else {
    navbar.style.boxShadow = 'var(--shadow-sm)';
  }
});

/* ================================================
   EVENT CARD CLICK HANDLER
   ================================================ */
document.querySelectorAll('.event-card').forEach(card => {
  const button = card.querySelector('a[href="#"]');
  if (button) {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      // Placeholder: In real app, this would navigate to event detail page
      const eventTitle = card.querySelector('.event-title').textContent;
      showNotification(`Chuyển đến chi tiết sự kiện: ${eventTitle}`, 'info');
    });
  }
});

/* ================================================
   CONSOLE MESSAGE
   ================================================ */
console.log('%c❤️ Cảm ơn bạn đã quan tâm đến hệ thống hiến máu', 'color: #D32F2F; font-size: 16px; font-weight: bold;');
console.log('%cHãy cùng chúng tôi cứu sống những cuộc sống quý báu!', 'color: #43A047; font-size: 14px;');