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

    if (!this.nav) {
      console.warn('Navigation: nav element not found');
      return;
    }

    if (!this.navToggle) {
      console.warn('Navigation: navToggle element not found');
    }

    if (!this.mobileMenu) {
      console.warn('Navigation: mobileMenu element not found');
    }

    this.init();
  }

  init() {
    // Scroll behavior
    this.handleScroll();
    window.addEventListener('scroll', () => this.handleScroll());

    // Mobile menu toggle - handle both click and touch events
    if (this.navToggle) {
      this.navToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleMobileMenu();
      });

      // Add touch event for better mobile support
      this.navToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleMobileMenu();
      }, { passive: false });
    }

    // Close menu on link click
    this.mobileLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        this.closeMobileMenu();
        // Let the link navigation happen naturally
      });
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
    const isOpen = this.mobileMenu.classList.contains('open');

    if (isOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  openMobileMenu() {
    this.navToggle?.classList.add('active');
    this.mobileMenu?.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Prevent body scroll on iOS
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  closeMobileMenu() {
    this.navToggle?.classList.remove('active');
    this.mobileMenu?.classList.remove('open');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
}


// ============ QUIZ POPUP ============
class QuizPopup {
  constructor() {
    this.popup = document.getElementById('quizPopup');
    this.feedback = document.getElementById('quizFeedback');
    this.hasScrolled = false;
    this.scrollThreshold = 500; // pixels
    this.showDelay = 10000; // 10 seconds after scrolling
    this.shown = false;

    if (!this.popup) return;

    // Check if user has already completed quiz
    if (localStorage.getItem('quizCompleted') === 'true') {
      return; // Don't show quiz again
    }

    this.init();
  }

  init() {
    // Detect scroll
    window.addEventListener('scroll', () => {
      if (!this.hasScrolled && window.scrollY > this.scrollThreshold) {
        this.hasScrolled = true;
        setTimeout(() => this.showQuiz(), this.showDelay);
      }
    });

    // Setup quiz options
    const options = this.popup.querySelectorAll('.quiz-option');
    options.forEach(option => {
      option.addEventListener('click', (e) => this.handleAnswer(e));
    });
  }

  showQuiz() {
    if (this.shown) return;
    this.shown = true;
    this.popup.classList.add('show');
  }

  handleAnswer(e) {
    const button = e.target;
    const isCorrect = button.dataset.answer === 'correct';
    const options = this.popup.querySelectorAll('.quiz-option');

    // Disable all options
    options.forEach(opt => {
      opt.style.pointerEvents = 'none';
    });

    if (isCorrect) {
      button.classList.add('correct');
      this.feedback.className = 'quiz-feedback correct';
      this.feedback.textContent = '✓ Correct! You understand GENESIS. Unlocking site...';
      this.feedback.style.display = 'block';

      // Save to localStorage
      localStorage.setItem('quizCompleted', 'true');

      // Hide quiz after 2 seconds
      setTimeout(() => {
        this.popup.classList.remove('show');
      }, 2000);
    } else {
      button.classList.add('wrong');
      this.feedback.className = 'quiz-feedback wrong';
      this.feedback.textContent = '✗ Wrong! Here\'s the answer: 60,000 KNEX (10K signup + 5 × 10K super referrals)';
      this.feedback.style.display = 'block';

      // Show correct answer after 2 seconds
      setTimeout(() => {
        options.forEach(opt => {
          if (opt.dataset.answer === 'correct') {
            opt.classList.add('correct');
          }
        });

        // Auto-close after showing answer
        setTimeout(() => {
          localStorage.setItem('quizCompleted', 'true');
          this.popup.classList.remove('show');
        }, 3000);
      }, 2000);
    }
  }
}


// ============ COUNTDOWN TIMER ============
class CountdownTimer {
  constructor() {
    this.countdownEl = document.getElementById('genesisCountdown');
    this.targetDate = new Date('2026-02-07T00:00:00').getTime();

    if (!this.countdownEl) return;

    this.elements = {
      days: document.getElementById('countDays'),
      hours: document.getElementById('countHours'),
      minutes: document.getElementById('countMinutes'),
      seconds: document.getElementById('countSeconds')
    };

    this.init();
  }

  init() {
    this.updateCountdown();
    setInterval(() => this.updateCountdown(), 1000);
  }

  updateCountdown() {
    const now = new Date().getTime();
    const distance = this.targetDate - now;

    // If countdown is over, hide it
    if (distance < 0) {
      this.countdownEl.style.display = 'none';
      return;
    }

    // Show countdown
    this.countdownEl.style.display = 'block';

    // Calculate time
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Update display
    if (this.elements.days) this.elements.days.textContent = String(days).padStart(2, '0');
    if (this.elements.hours) this.elements.hours.textContent = String(hours).padStart(2, '0');
    if (this.elements.minutes) this.elements.minutes.textContent = String(minutes).padStart(2, '0');
    if (this.elements.seconds) this.elements.seconds.textContent = String(seconds).padStart(2, '0');
  }
}


// ============ GENESIS TRACKER ============
class GenesisTracker {
  constructor() {
    this.statusUrl = `${API_BASE}/genesis-status`;
    this.updateInterval = null;
    this.hasScrolled = false;
    this.init();
  }

  async init() {
    await this.updateStatus();
    // Update every 10 seconds
    this.updateInterval = setInterval(() => this.updateStatus(), 10000);
  }

  async updateStatus() {
    try {
      const response = await fetch(this.statusUrl);
      const data = await response.json();

      // Update total waitlist counter
      const waitlistCountEl = document.getElementById('waitlistCount');
      if (waitlistCountEl && data.totalWaitlistCount !== undefined) {
        waitlistCountEl.textContent = data.totalWaitlistCount.toLocaleString();
      }
    } catch (error) {
      console.error('Error updating GENESIS status:', error);
    }
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}


// ============ WAITLIST FORM ============
class WaitlistForm {
  constructor() {
    this.API_URL = `${API_BASE}/signup`;
    this.CHECK_URL = `${API_BASE}/check`;

    this.form = document.getElementById('waitlistForm');
    this.handleInput = document.getElementById('handleInput');
    this.emailInput = document.getElementById('emailInput');
    this.referralInput = document.getElementById('referralInput');
    this.successEl = document.getElementById('waitlistSuccess');
    this.successHandle = document.getElementById('successHandle');
    this.referralLink = document.getElementById('referralLink');
    this.copyBtn = document.getElementById('copyReferral');
    this.handleStatus = document.getElementById('handleStatus');
    this.handleFeedback = document.getElementById('handleFeedback');

    this.checkTimeout = null;
    this.lastCheckedHandle = '';

    if (!this.form) return;

    this.init();
  }

  init() {
    // Check for referral code in URL
    this.checkReferralFromURL();

    // Handle input formatting and real-time availability check
    if (this.handleInput) {
      this.handleInput.addEventListener('input', (e) => {
        // Only allow lowercase letters, numbers, and underscores
        e.target.value = e.target.value
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 20);

        // Real-time availability check with debounce
        this.debouncedCheckAvailability(e.target.value);
      });
    }

    // Referral input - auto-extract code from URL
    if (this.referralInput) {
      this.referralInput.addEventListener('input', (e) => {
        let value = e.target.value.trim();

        // If user pasted a URL, extract the referral code
        if (value.includes('?ref=') || value.includes('&ref=')) {
          const match = value.match(/[?&]ref=([A-Z0-9-]+)/);
          if (match) {
            e.target.value = match[1];
            // Show visual feedback
            e.target.style.borderColor = 'var(--neon)';
            setTimeout(() => {
              e.target.style.borderColor = '';
            }, 2000);
          }
        }
      });

      this.referralInput.addEventListener('paste', (e) => {
        // Handle paste event with slight delay to let the value populate
        setTimeout(() => {
          let value = e.target.value.trim();
          if (value.includes('?ref=') || value.includes('&ref=')) {
            const match = value.match(/[?&]ref=([A-Z0-9-]+)/);
            if (match) {
              e.target.value = match[1];
              e.target.style.borderColor = 'var(--neon)';
              setTimeout(() => {
                e.target.style.borderColor = '';
              }, 2000);
            }
          }
        }, 10);
      });
    }

    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Copy referral link
    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => this.copyReferralLink());
    }
  }

  debouncedCheckAvailability(handle) {
    // Clear existing timeout
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }

    // Hide status while typing
    if (this.handleStatus) {
      this.handleStatus.classList.remove('show');
      this.handleFeedback.classList.remove('show');
    }

    // Don't check if handle is too short or same as last checked
    if (!handle || handle.length < 3) {
      return;
    }

    if (handle === this.lastCheckedHandle) {
      return;
    }

    // Show checking status
    if (this.handleStatus) {
      this.handleStatus.className = 'handle-status checking show';
      this.handleStatus.textContent = 'Checking...';
    }

    // Wait 500ms after user stops typing
    this.checkTimeout = setTimeout(() => {
      this.checkHandleAvailability(handle);
    }, 500);
  }

  async checkHandleAvailability(handle) {
    this.lastCheckedHandle = handle;
    const fullHandle = '@' + handle;

    try {
      const response = await fetch(`${this.CHECK_URL}?handle=${encodeURIComponent(fullHandle)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (this.handleStatus && this.handleFeedback) {
        if (data.available) {
          // Handle is available
          this.handleStatus.className = 'handle-status available show';
          this.handleStatus.textContent = '✓ Available';
          this.handleFeedback.className = 'handle-feedback available show';
          this.handleFeedback.textContent = `${fullHandle} is available! 🎉`;
        } else {
          // Handle is taken
          this.handleStatus.className = 'handle-status taken show';
          this.handleStatus.textContent = '✗ Taken';
          this.handleFeedback.className = 'handle-feedback taken show';
          this.handleFeedback.textContent = `${fullHandle} is already reserved. Try another!`;
        }
      }

    } catch (error) {
      console.error('Error checking handle availability:', error);
      if (this.handleStatus && this.handleFeedback) {
        this.handleStatus.className = 'handle-status show';
        this.handleStatus.textContent = '';
        this.handleFeedback.className = 'handle-feedback error show';
        this.handleFeedback.textContent = 'Unable to check availability. Please try again.';
      }
    }
  }

  checkReferralFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode && this.referralInput) {
      this.referralInput.value = refCode;
      // Highlight referral field to show it was auto-filled
      this.referralInput.style.borderColor = 'var(--neon)';
      this.referralInput.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.3)';

      // Add a small note below the input
      const parent = this.referralInput.parentElement;
      const note = document.createElement('div');
      note.style.cssText = 'color: var(--neon); font-size: 0.75rem; margin-top: 4px; font-family: var(--font-mono);';
      note.textContent = '✓ Referral code applied';
      parent.appendChild(note);
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const handle = this.handleInput?.value.trim();
    const email = this.emailInput?.value.trim();
    let referral = this.referralInput?.value.trim();

    // Extract referral code from URL if user pasted full URL
    if (referral && referral.includes('?ref=')) {
      const match = referral.match(/[?&]ref=([A-Z0-9-]+)/);
      if (match) {
        referral = match[1];
      }
    }

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
        // Check if GENESIS member
        if (result.genesisStatus) {
          // Show GENESIS modal instead of regular success
          this.showGenesisModal(result);
        } else {
          // Show regular success with referral code and tier progress
          this.showSuccess(handle, result.referralCode, result.tierProgress);
        }
        // GenesisTracker will auto-update the counts every 10 seconds
        // Trigger immediate update if needed
        if (window.genesisTracker && window.genesisTracker.updateStatus) {
          window.genesisTracker.updateStatus();
        }
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

  getTierIconSvg(icon) {
    const iconMap = {
      '⚡': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>',
      '🏆': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>',
      '💎': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 3L2 7V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V7L18 3H6M12 10C14.2091 10 16 11.7909 16 14C16 16.2091 14.2091 18 12 18C9.79086 18 8 16.2091 8 14C8 11.7909 9.79086 10 12 10Z"/></svg>',
      '👑': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z"/></svg>',
      '🎉': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>'
    };
    return iconMap[icon] || icon;
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
      const iconSvg = this.getTierIconSvg(tierProgress.nextTier.icon);
      tierNext.innerHTML = `
        <span class="tier-icon">${iconSvg}</span>
        <span>${tierProgress.nextTier.remaining} more for <strong>${tierProgress.nextTier.reward}</strong></span>
      `;
    } else if (tierNext) {
      const celebrationSvg = '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>';
      tierNext.innerHTML = `<span class="text-neon">${celebrationSvg} All tiers unlocked!</span>`;
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


  showGenesisModal(data) {
    const modal = document.getElementById('genesisModal');
    const genesisNumber = document.getElementById('genesisNumber');
    const shareLink = document.getElementById('shareLink');
    const superCount = document.getElementById('superCount');

    if (!modal) return;

    // Update modal content
    if (genesisNumber) {
      genesisNumber.textContent = data.genesisNumber || '?';
    }

    if (shareLink) {
      shareLink.value = data.referralLink || `https://knexmail.com?ref=${data.referralCode}`;
    }

    if (superCount) {
      superCount.textContent = data.genesisReferralCount || 0;
    }

    // Setup share buttons
    this.setupShareButtons(data);

    // Setup copy button
    const copyBtn = document.getElementById('copyShareLink');
    if (copyBtn && shareLink) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(shareLink.value);
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 6L9 17l-5-5"/></svg> Copied!';
          setTimeout(() => {
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy';
          }, 2000);
        } catch (err) {
          shareLink.select();
          document.execCommand('copy');
        }
      });
    }

    // Setup close button
    const closeBtn = document.getElementById('closeGenesisModal');
    const overlay = document.getElementById('genesisModalOverlay');

    const closeModal = () => {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    if (overlay) {
      overlay.addEventListener('click', closeModal);
    }

    // Show modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Confetti celebration! 🎉
    if (typeof confetti !== 'undefined') {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff88', '#00d4ff', '#ff00ff', '#ffdd00']
        });

        // Second burst
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#00ff88', '#00d4ff']
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#ff00ff', '#ffdd00']
          });
        }, 200);
      }, 300);
    }

    // Hide form
    this.form.style.display = 'none';

    // Hide stats lookup
    const statsLookup = document.getElementById('statsLookup');
    if (statsLookup) statsLookup.style.display = 'none';
  }

  setupShareButtons(data) {
    const { genesisNumber, referralLink, referralCode } = data;
    const link = referralLink || `https://knexmail.com?ref=${referralCode}`;

    // X/Twitter
    const twitterBtn = document.getElementById('shareTwitter');
    if (twitterBtn) {
      twitterBtn.addEventListener('click', () => {
        const text = `I just became GENESIS Member #${genesisNumber} at @KnexMail! 🔥\n\nFirst 100 get 10,000 KNEX + super referral power.\n\nWeb3 email is here - your inbox IS your wallet!\n\nJoin before spots run out:`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
      });
    }

    // Facebook
    const facebookBtn = document.getElementById('shareFacebook');
    if (facebookBtn) {
      facebookBtn.addEventListener('click', () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
      });
    }

    // Instagram (copy to clipboard with message)
    const instagramBtn = document.getElementById('shareInstagram');
    if (instagramBtn) {
      instagramBtn.addEventListener('click', async () => {
        const text = `🚀 Just joined KnexMail as GENESIS Member #${genesisNumber}!\n\nThe first 100 people get 10K KNEX tokens + exclusive status forever.\n\nThis is the future of email - your inbox IS your crypto wallet!\n\nJoin the waitlist: ${link}`;
        try {
          await navigator.clipboard.writeText(text);
          alert('✓ Post copied to clipboard! Paste it on Instagram.');
        } catch (err) {
          prompt('Copy this text for Instagram:', text);
        }
      });
    }

    // WhatsApp
    const whatsappBtn = document.getElementById('shareWhatsApp');
    if (whatsappBtn) {
      whatsappBtn.addEventListener('click', () => {
        const text = `Hey! I just got GENESIS status (#${genesisNumber}) at KnexMail - first 100 people get 10,000 KNEX tokens!\n\nIt's like if Gmail was also your crypto wallet. Pretty wild!\n\nCheck it out before spots run out: ${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      });
    }

    // SMS
    const smsBtn = document.getElementById('shareSMS');
    if (smsBtn) {
      smsBtn.addEventListener('click', () => {
        const text = `Hey! I just got GENESIS status (#${genesisNumber}) at KnexMail - first 100 people get 10,000 KNEX tokens! Check it out: ${link}`;
        window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
      });
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
    // Show/hide form with animation
    this.showBtn.addEventListener('click', () => {
      const isHidden = this.statsForm.style.display === 'none';
      if (isHidden) {
        this.statsForm.style.display = 'flex';
        this.statsForm.style.animation = 'fadeIn 0.3s ease-out';
        this.showBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Hide Stats Form
        `;
        // Focus the input
        this.handleInput?.focus();
      } else {
        this.statsForm.style.display = 'none';
        this.resultEl.style.display = 'none';
        this.showBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Check Your Referral Stats
        `;
      }
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
          e.preventDefault();
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
    if (!handle) {
      this.handleInput?.focus();
      return;
    }

    // Show loading state
    const originalHTML = this.checkBtn.innerHTML;
    this.checkBtn.innerHTML = '<span class="spinner"></span> Loading...';
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
      this.checkBtn.innerHTML = originalHTML;
      this.checkBtn.disabled = false;
    }
  }

  getTierIconSvg(icon) {
    const iconMap = {
      '⚡': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>',
      '🏆': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>',
      '💎': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 3L2 7V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V7L18 3H6M12 10C14.2091 10 16 11.7909 16 14C16 16.2091 14.2091 18 12 18C9.79086 18 8 16.2091 8 14C8 11.7909 9.79086 10 12 10Z"/></svg>',
      '👑': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z"/></svg>',
      '🎉': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>'
    };
    return iconMap[icon] || icon;
  }

  showResult(data) {
    const tierProgress = data.tierProgress;
    const celebrationSvg = '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>';
    const nextTierText = tierProgress?.nextTier
      ? `${tierProgress.nextTier.remaining} more for ${tierProgress.nextTier.reward}`
      : `All tiers unlocked! ${celebrationSvg}`;
    const nextTierIcon = tierProgress?.nextTier?.icon ? this.getTierIconSvg(tierProgress.nextTier.icon) : celebrationSvg;
    const progressPercent = tierProgress?.nextTier?.progress || 100;

    // Build unlocked tiers display
    const unlockedTiersHTML = tierProgress?.unlockedTiers?.length
      ? tierProgress.unlockedTiers.map(t => `<span class="unlocked-tier">${this.getTierIconSvg(t.icon)} ${t.reward}</span>`).join('')
      : '<span class="no-tiers">Start referring to unlock rewards!</span>';

    // Remove @ from handle if it exists
    const cleanHandle = data.handle.replace(/^@/, '');

    this.resultEl.innerHTML = `
      <div class="stats-card">
        <div class="stats-header">
          <span class="stats-handle">${cleanHandle}@knexmail.com</span>
        </div>
        <div class="stats-body">
          <div class="stats-big-number">
            <span class="big-count">${data.referralCount}</span>
            <span class="big-label">Referrals</span>
          </div>
          <div class="stats-progress">
            <div class="stats-progress-bar">
              <div class="stats-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="stats-progress-text">
              <span class="tier-icon">${nextTierIcon}</span>
              <span>${nextTierText}</span>
            </div>
          </div>
          <div class="stats-unlocked">
            ${unlockedTiersHTML}
          </div>
          <div class="stats-row">
            <span class="stats-label">Your Code</span>
            <span class="stats-value stats-code">${data.referralCode}</span>
          </div>
        </div>
        <div class="stats-footer">
          <input type="text" value="${data.referralLink}" readonly class="stats-link">
          <button class="btn btn-primary copy-stats-link">
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    `;
    this.resultEl.style.display = 'block';
    this.resultEl.style.animation = 'fadeIn 0.3s ease-out';

    // Add copy functionality
    const copyBtn = this.resultEl.querySelector('.copy-stats-link');
    const linkInput = this.resultEl.querySelector('.stats-link');
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(linkInput.value);
        copyBtn.innerHTML = '<span>Copied! ✓</span>';
        copyBtn.style.background = 'var(--neon)';
        copyBtn.style.color = 'var(--black)';
        setTimeout(() => {
          copyBtn.innerHTML = '<span>Copy Link</span>';
          copyBtn.style.background = '';
          copyBtn.style.color = '';
        }, 2000);
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


// ============ MOBILE VIEWPORT FIX ============
class MobileViewportFix {
  constructor() {
    this.init();
  }

  init() {
    // Set CSS custom property for viewport height (fixes iOS address bar issues)
    this.setViewportHeight();
    window.addEventListener('resize', () => this.setViewportHeight());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.setViewportHeight(), 100);
    });

    // Prevent scroll jump when keyboard opens on mobile
    this.preventKeyboardScrollJump();
  }

  setViewportHeight() {
    // Set --vh custom property for use in CSS
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  preventKeyboardScrollJump() {
    // On mobile, when keyboard opens, the viewport shrinks
    // This can cause the page to jump. We prevent this by using smooth scroll
    const inputs = document.querySelectorAll('input, textarea');

    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        // Small delay to let keyboard open
        setTimeout(() => {
          // Scroll input into view smoothly
          input.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }, 300);
      });
    });
  }
}


// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', () => {
  // Mobile viewport fix (run first)
  new MobileViewportFix();

  // Core functionality
  new Navigation();
  new WaitlistForm();
  new HandleChecker();
  new StatsLookup();
  new Leaderboard();

  // GENESIS tracker - store globally so WaitlistForm can trigger updates
  window.genesisTracker = new GenesisTracker();

  // Quiz popup
  new QuizPopup();

  // Countdown timer
  new CountdownTimer();

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
