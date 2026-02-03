/* ============================================
   KNEXMAIL - MAIN JAVASCRIPT
   Navigation, Forms, Interactions
   ============================================ */

// ============ NAVIGATION ============
class Navigation {
  constructor() {
    this.nav = document.getElementById('nav');
    this.navToggle = document.getElementById('navToggle');
    this.mobileMenu = document.getElementById('mobileMenu');
    this.mobileLinks = document.querySelectorAll('.mobile-link');

    if (!this.nav) return;

    this.init();
  }

  init() {
    // Scroll behavior
    this.handleScroll();
    window.addEventListener('scroll', () => this.handleScroll());

    // Mobile menu toggle
    if (this.navToggle) {
      this.navToggle.addEventListener('click', () => this.toggleMobileMenu());
    }

    // Close menu on link click
    this.mobileLinks.forEach((link) => {
      link.addEventListener('click', () => this.closeMobileMenu());
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (
        this.mobileMenu?.classList.contains('open') &&
        !this.mobileMenu.contains(e.target) &&
        !this.navToggle.contains(e.target)
      ) {
        this.closeMobileMenu();
      }
    });

    // Close menu on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMobileMenu();
      }
    });
  }

  handleScroll() {
    if (window.scrollY > 50) {
      this.nav.classList.add('scrolled');
    } else {
      this.nav.classList.remove('scrolled');
    }
  }

  toggleMobileMenu() {
    this.navToggle.classList.toggle('active');
    this.mobileMenu.classList.toggle('open');
    document.body.style.overflow = this.mobileMenu.classList.contains('open') ? 'hidden' : '';
  }

  closeMobileMenu() {
    this.navToggle?.classList.remove('active');
    this.mobileMenu?.classList.remove('open');
    document.body.style.overflow = '';
  }
}


// ============ WAITLIST FORM ============
class WaitlistForm {
  constructor() {
    // API URL - UPDATE THIS AFTER AWS DEPLOYMENT
    this.API_URL = 'https://p46ez1okte.execute-api.us-east-1.amazonaws.com/prod/signup';

    this.form = document.getElementById('waitlistForm');
    this.handleInput = document.getElementById('handleInput');
    this.emailInput = document.getElementById('emailInput');
    this.referralInput = document.getElementById('referralInput');
    this.successEl = document.getElementById('waitlistSuccess');
    this.successHandle = document.getElementById('successHandle');
    this.referralLink = document.getElementById('referralLink');
    this.copyBtn = document.getElementById('copyReferral');

    if (!this.form) return;

    this.init();
  }

  init() {
    // Check for referral code in URL
    this.checkReferralFromURL();

    // Handle input formatting
    if (this.handleInput) {
      this.handleInput.addEventListener('input', (e) => {
        // Only allow lowercase letters, numbers, and underscores
        e.target.value = e.target.value
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 20);
      });
    }

    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Copy referral link
    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => this.copyReferralLink());
    }
  }

  checkReferralFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode && this.referralInput) {
      this.referralInput.value = refCode;
      // Highlight referral field to show it was auto-filled
      this.referralInput.style.borderColor = 'var(--neon)';
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const handle = this.handleInput?.value.trim();
    const email = this.emailInput?.value.trim();
    const referral = this.referralInput?.value.trim();

    if (!handle || !email) return;

    // Show loading state
    const submitBtn = this.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Reserving...';
    submitBtn.disabled = true;

    try {
      // Submit to AWS API
      const result = await this.submitToAPI({
        handle: '@' + handle,
        email,
        referral
      });

      if (result.success) {
        // Show success with referral code from server
        this.showSuccess(handle, result.referralCode);
        // Update counter
        this.incrementWaitlistCount();
      } else {
        throw new Error(result.error || 'Submission failed');
      }

    } catch (error) {
      console.error('Waitlist submission error:', error);
      this.showError(error.message);
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  async submitToAPI(data) {
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return result;
  }

  showError(message) {
    // Create error element if it doesn't exist
    let errorEl = document.getElementById('formError');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.id = 'formError';
      errorEl.style.cssText = `
        color: #ff4444;
        background: rgba(255, 68, 68, 0.1);
        border: 1px solid #ff4444;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
      `;
      this.form.insertBefore(errorEl, this.form.firstChild);
    }

    // Show appropriate message
    if (message.includes('already reserved')) {
      errorEl.textContent = '⚠️ This handle is already taken. Try another one!';
    } else if (message.includes('Invalid handle')) {
      errorEl.textContent = '⚠️ Invalid handle. Use letters, numbers, and underscores only.';
    } else if (message.includes('Invalid email')) {
      errorEl.textContent = '⚠️ Please enter a valid email address.';
    } else {
      errorEl.textContent = '⚠️ ' + message;
    }

    // Remove after 5 seconds
    setTimeout(() => errorEl.remove(), 5000);
  }

  showSuccess(handle, referralCode) {
    // Hide form, show success
    this.form.style.display = 'none';
    this.successEl.style.display = 'block';

    // Update success content
    if (this.successHandle) {
      this.successHandle.textContent = `${handle}@knexmail.com`;
    }

    if (this.referralLink) {
      this.referralLink.value = `https://knexmail.com?ref=${referralCode}`;
    }

    // Animate in
    this.successEl.style.animation = 'scaleIn 0.5s ease-out';
  }

  async copyReferralLink() {
    if (!this.referralLink) return;

    try {
      await navigator.clipboard.writeText(this.referralLink.value);
      this.copyBtn.textContent = 'Copied!';
      this.copyBtn.style.background = 'var(--neon)';
      this.copyBtn.style.color = 'var(--black)';

      setTimeout(() => {
        this.copyBtn.textContent = 'Copy';
        this.copyBtn.style.background = '';
        this.copyBtn.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // Fallback: select the text
      this.referralLink.select();
      document.execCommand('copy');
    }
  }

  incrementWaitlistCount() {
    const countEl = document.getElementById('waitlistCount');
    if (countEl) {
      const current = parseInt(countEl.textContent.replace(/,/g, '')) || 0;
      countEl.textContent = (current + 1).toLocaleString();
    }
  }
}


// ============ HANDLE AVAILABILITY CHECK ============
class HandleChecker {
  constructor() {
    this.input = document.getElementById('handleInput');
    this.debounceTimer = null;

    if (!this.input) return;

    this.init();
  }

  init() {
    this.input.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.checkAvailability(), 500);
    });
  }

  async checkAvailability() {
    const handle = this.input.value.trim();
    if (handle.length < 3) return;

    // TODO: Call API to check availability
    // For now, simulate check
    console.log(`Checking availability for: ${handle}@knexmail.com`);
  }
}


// ============ CONSOLE EASTER EGG ============
function showConsoleEasterEgg() {
  console.log('%c📧 KNEXMAIL', 'color: #00ff88; font-size: 32px; font-weight: bold; text-shadow: 0 0 10px #00ff88;');
  console.log('%cEmail That Pays You', 'color: #00ffff; font-size: 16px;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #333;');
  console.log('%cYour @knexmail.com address = Your Wallet', 'color: #ff00ff; font-size: 12px;');
  console.log('%cBuilt on KnexCoin Proof-of-Bandwidth', 'color: #ffff00; font-size: 11px;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #333;');
  console.log('%cInterested in contributing? https://github.com/knexcoin', 'color: #888; font-size: 11px;');
}


// ============ PERFORMANCE MONITORING ============
function monitorPerformance() {
  if ('performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        console.log(`Page load time: ${Math.round(perfData.loadEventEnd - perfData.startTime)}ms`);
      }, 0);
    });
  }
}


// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', () => {
  // Core functionality
  new Navigation();
  new WaitlistForm();
  new HandleChecker();

  // Easter egg
  showConsoleEasterEgg();

  // Performance monitoring (dev only)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    monitorPerformance();
  }

  // Page loaded class
  document.body.classList.add('page-loaded');
});


// ============ SERVICE WORKER REGISTRATION ============
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('Service Worker registration failed:', err);
    });
  });
}
