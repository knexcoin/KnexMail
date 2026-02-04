// Cookie Banner Management
(function() {
  'use strict';

  // Cookie utility functions
  const CookieManager = {
    // Set a cookie
    set: function(name, value, days) {
      let expires = '';
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
      }
      document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Lax';
    },

    // Get a cookie
    get: function(name) {
      const nameEQ = name + '=';
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    },

    // Delete a cookie
    delete: function(name) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  };

  // Analytics control
  const Analytics = {
    // Initialize Google Analytics (if consent given)
    init: function() {
      if (typeof gtag !== 'undefined') {
        gtag('consent', 'update', {
          'analytics_storage': 'granted'
        });
        console.log('Analytics enabled');
      }
    },

    // Disable Google Analytics
    disable: function() {
      if (typeof gtag !== 'undefined') {
        gtag('consent', 'update', {
          'analytics_storage': 'denied'
        });
        console.log('Analytics disabled');
      }
    }
  };

  // Cookie Banner
  const CookieBanner = {
    banner: null,
    acceptBtn: null,
    essentialBtn: null,

    init: function() {
      this.banner = document.getElementById('cookieBanner');
      this.acceptBtn = document.getElementById('cookieAccept');
      this.essentialBtn = document.getElementById('cookieEssential');

      if (!this.banner) return;

      // Check if user has already made a choice
      const consent = CookieManager.get('cookie_consent');

      if (!consent) {
        // Show banner if no consent recorded
        this.show();
      } else if (consent === 'all') {
        // User previously accepted all cookies
        Analytics.init();
      } else if (consent === 'essential') {
        // User previously chose essential only
        Analytics.disable();
      }

      // Event listeners
      if (this.acceptBtn) {
        this.acceptBtn.addEventListener('click', () => this.acceptAll());
      }

      if (this.essentialBtn) {
        this.essentialBtn.addEventListener('click', () => this.acceptEssential());
      }

      // Check for Do Not Track
      this.checkDNT();
    },

    show: function() {
      if (this.banner) {
        this.banner.classList.add('show');
      }
    },

    hide: function() {
      if (this.banner) {
        this.banner.classList.remove('show');
        // Animate out
        setTimeout(() => {
          this.banner.style.display = 'none';
        }, 400);
      }
    },

    acceptAll: function() {
      // Set consent cookie for 1 year
      CookieManager.set('cookie_consent', 'all', 365);

      // Enable analytics
      Analytics.init();

      // Hide banner
      this.hide();

      console.log('All cookies accepted');
    },

    acceptEssential: function() {
      // Set consent cookie for 1 year
      CookieManager.set('cookie_consent', 'essential', 365);

      // Disable analytics
      Analytics.disable();

      // Hide banner
      this.hide();

      console.log('Essential cookies only');
    },

    checkDNT: function() {
      // Check if Do Not Track is enabled
      const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;

      if (dnt === '1' || dnt === 'yes') {
        console.log('Do Not Track detected - analytics disabled');
        Analytics.disable();

        // Auto-accept essential only if DNT is enabled
        const consent = CookieManager.get('cookie_consent');
        if (!consent) {
          CookieManager.set('cookie_consent', 'essential', 365);
          this.hide();
        }
      }
    }
  };

  // Referral code tracking (functional cookie)
  const ReferralTracking = {
    init: function() {
      // Check URL for referral code
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');

      if (refCode) {
        // Store referral code in cookie for 30 days
        CookieManager.set('referral_code', refCode, 30);
        console.log('Referral code stored:', refCode);
      }
    },

    get: function() {
      return CookieManager.get('referral_code');
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      CookieBanner.init();
      ReferralTracking.init();
    });
  } else {
    CookieBanner.init();
    ReferralTracking.init();
  }

  // Expose utility functions globally if needed
  window.KnexCookies = {
    manager: CookieManager,
    analytics: Analytics,
    banner: CookieBanner,
    referral: ReferralTracking
  };

})();
