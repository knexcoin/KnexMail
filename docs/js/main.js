/* ============================================
   KNEXMAIL - MAIN JAVASCRIPT
   Navigation, Forms, Interactions
   ============================================ */

// API Base URL
const API_BASE = 'https://p46ez1okte.execute-api.us-east-1.amazonaws.com/prod';

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
    this.API_URL = `${API_BASE}/signup`;

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
        // Show success with referral code and tier progress
        this.showSuccess(handle, result.referralCode, result.tierProgress);
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

  showSuccess(handle, referralCode, tierProgress) {
    // Hide form, show success
    this.form.style.display = 'none';
    this.successEl.style.display = 'block';

    // Hide stats lookup when showing success
    const statsLookup = document.getElementById('statsLookup');
    if (statsLookup) statsLookup.style.display = 'none';

    // Update success content
    if (this.successHandle) {
      this.successHandle.textContent = `${handle}@knexmail.com`;
    }

    if (this.referralLink) {
      this.referralLink.value = `https://knexmail.com?ref=${referralCode}`;
    }

    // Update tier progress
    this.updateTierProgress(tierProgress);

    // Animate in
    this.successEl.style.animation = 'scaleIn 0.5s ease-out';
  }

  updateTierProgress(tierProgress) {
    if (!tierProgress) return;

    const tierCount = document.getElementById('tierCount');
    const tierBarFill = document.getElementById('tierBarFill');
    const tierNext = document.getElementById('tierNext');
    const rewardTiers = document.getElementById('rewardTiers');

    if (tierCount) {
      tierCount.textContent = `${tierProgress.referralCount} referral${tierProgress.referralCount !== 1 ? 's' : ''}`;
    }

    if (tierBarFill && tierProgress.nextTier) {
      tierBarFill.style.width = `${tierProgress.nextTier.progress}%`;
    }

    if (tierNext && tierProgress.nextTier) {
      tierNext.innerHTML = `
        <span class="tier-icon">${tierProgress.nextTier.icon}</span>
        <span>${tierProgress.nextTier.remaining} more for <strong>${tierProgress.nextTier.reward}</strong></span>
      `;
    } else if (tierNext) {
      tierNext.innerHTML = '<span class="text-neon">🎉 All tiers unlocked!</span>';
    }

    // Mark unlocked tiers
    if (rewardTiers && tierProgress.unlockedTiers) {
      const tierItems = rewardTiers.querySelectorAll('.tier-item');
      tierItems.forEach(item => {
        const count = parseInt(item.dataset.count);
        if (tierProgress.referralCount >= count) {
          item.classList.add('unlocked');
        }
      });
    }
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


// ============ STATS LOOKUP ============
class StatsLookup {
  constructor() {
    this.API_URL = `${API_BASE}/stats`;

    this.showBtn = document.getElementById('showStatsForm');
    this.statsForm = document.getElementById('statsForm');
    this.handleInput = document.getElementById('statsHandleInput');
    this.checkBtn = document.getElementById('checkStatsBtn');
    this.resultEl = document.getElementById('statsResult');

    if (!this.showBtn) return;

    this.init();
  }

  init() {
    // Show/hide form
    this.showBtn.addEventListener('click', () => {
      this.statsForm.style.display = this.statsForm.style.display === 'none' ? 'flex' : 'none';
    });

    // Handle input formatting
    if (this.handleInput) {
      this.handleInput.addEventListener('input', (e) => {
        e.target.value = e.target.value
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 20);
      });

      // Enter key to submit
      this.handleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.checkStats();
        }
      });
    }

    // Check button
    if (this.checkBtn) {
      this.checkBtn.addEventListener('click', () => this.checkStats());
    }
  }

  async checkStats() {
    const handle = this.handleInput?.value.trim();
    if (!handle) return;

    this.checkBtn.textContent = 'Loading...';
    this.checkBtn.disabled = true;

    try {
      const response = await fetch(`${this.API_URL}?handle=${encodeURIComponent(handle)}`, {
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Not found');
      }

      this.showResult(result);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.checkBtn.textContent = 'Check Stats';
      this.checkBtn.disabled = false;
    }
  }

  showResult(data) {
    const tierProgress = data.tierProgress;
    const nextTierText = tierProgress?.nextTier
      ? `${tierProgress.nextTier.remaining} more for ${tierProgress.nextTier.reward}`
      : 'All tiers unlocked! 🎉';

    this.resultEl.innerHTML = `
      <div class="stats-card">
        <div class="stats-header">
          <span class="stats-handle">${data.handle}@knexmail.com</span>
        </div>
        <div class="stats-body">
          <div class="stats-row">
            <span class="stats-label">Referrals</span>
            <span class="stats-value text-neon">${data.referralCount}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">Your Code</span>
            <span class="stats-value">${data.referralCode}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">Next Reward</span>
            <span class="stats-value">${nextTierText}</span>
          </div>
        </div>
        <div class="stats-footer">
          <input type="text" value="${data.referralLink}" readonly class="stats-link">
          <button class="btn btn-small copy-stats-link">Copy Link</button>
        </div>
      </div>
    `;
    this.resultEl.style.display = 'block';

    // Add copy functionality
    const copyBtn = this.resultEl.querySelector('.copy-stats-link');
    const linkInput = this.resultEl.querySelector('.stats-link');
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(linkInput.value);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy Link', 2000);
      } catch (e) {
        linkInput.select();
        document.execCommand('copy');
      }
    });
  }

  showError(message) {
    this.resultEl.innerHTML = `
      <div class="stats-error">
        ${message === 'Handle not found'
          ? '⚠️ This handle is not on the waitlist.'
          : '⚠️ ' + message}
      </div>
    `;
    this.resultEl.style.display = 'block';
  }
}


// ============ LEADERBOARD ============
class Leaderboard {
  constructor() {
    this.API_URL = `${API_BASE}/leaderboard`;
    this.container = document.getElementById('leaderboardTable');
    this.totalEl = document.getElementById('totalWaitlist');

    if (!this.container) return;

    this.init();
  }

  init() {
    this.loadLeaderboard();
  }

  async loadLeaderboard() {
    try {
      const response = await fetch(this.API_URL, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to load');

      const data = await response.json();
      this.render(data);
    } catch (error) {
      console.error('Leaderboard error:', error);
      this.container.innerHTML = '<div class="leaderboard-error">Unable to load leaderboard</div>';
    }
  }

  render(data) {
    // Update total count
    if (this.totalEl) {
      this.totalEl.textContent = data.totalWaitlist?.toLocaleString() || '-';
    }

    // Render leaderboard
    if (!data.leaderboard || data.leaderboard.length === 0) {
      this.container.innerHTML = `
        <div class="leaderboard-empty">
          <p>No referrals yet. Be the first!</p>
        </div>
      `;
      return;
    }

    const rows = data.leaderboard.map((item, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      return `
        <div class="leaderboard-row ${index < 3 ? 'top-three' : ''}">
          <span class="lb-rank">${medal || item.rank}</span>
          <span class="lb-handle">${item.handle}</span>
          <span class="lb-count">${item.referralCount} referral${item.referralCount !== 1 ? 's' : ''}</span>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="leaderboard-header">
        <span class="lb-rank">Rank</span>
        <span class="lb-handle">Handle</span>
        <span class="lb-count">Referrals</span>
      </div>
      ${rows}
    `;
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
  new StatsLookup();
  new Leaderboard();

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
