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
      // Submit to Google Sheets
      const result = await this.submitToGoogleSheets({ handle, email, referral });

      // Show success with referral code from server
      this.showSuccess(handle, result.referralCode);

      // Update counter
      this.incrementWaitlistCount();

    } catch (error) {
      console.error('Waitlist submission error:', error);
      alert('Something went wrong. Please try again.');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  async submitToGoogleSheets(data) {
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbsJfrI_jEi1JljxPS1MR_Ib37_gdu9xW7iiz1Gk77CDJ9MLk9sEYEb9zBpDVwOm4/exec';

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    // Note: no-cors mode doesn't return response body, so we generate referral code client-side
    // The server still saves the data and generates its own code
    return {
      success: true,
      referralCode: this.generateReferralCode(data.handle)
    };
  }

  generateReferralCode(handle) {
    // Simple referral code generation (replace with server-side generation)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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
      this.referralLink.value = `https://knexmail.com/join/${referralCode}`;
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
