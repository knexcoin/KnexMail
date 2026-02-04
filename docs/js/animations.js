/* ============================================
   KNEXMAIL - ANIMATIONS
   Scroll Reveals, Counters, Effects
   ============================================ */

// ============ SCROLL REVEAL ============
class ScrollReveal {
  constructor() {
    this.elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children');
    this.sections = document.querySelectorAll('.section');

    if (this.elements.length === 0 && this.sections.length === 0) return;

    this.init();
  }

  init() {
    // Check for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.showAll();
      return;
    }

    this.observeElements();
    this.observeSections();
  }

  observeElements() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    this.elements.forEach((el) => observer.observe(el));
  }

  observeSections() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.05
      }
    );

    this.sections.forEach((section) => observer.observe(section));
  }

  showAll() {
    this.elements.forEach((el) => el.classList.add('active'));
    this.sections.forEach((section) => section.classList.add('visible'));
  }
}


// ============ COUNTER ANIMATION ============
class CounterAnimation {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      duration: options.duration || 2000,
      start: options.start || 0,
      end: options.end || parseInt(element.textContent.replace(/,/g, '')) || 0,
      separator: options.separator || ',',
      decimals: options.decimals || 0,
      ...options
    };

    this.observed = false;
  }

  observe() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.observed) {
            this.observed = true;
            this.animate();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(this.element);
  }

  animate() {
    const { start, end, duration, separator, decimals } = this.options;
    const startTime = performance.now();
    const range = end - start;

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + range * eased;

      this.element.textContent = this.formatNumber(current, decimals, separator);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }

  formatNumber(num, decimals, separator) {
    const fixed = num.toFixed(decimals);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return parts.join('.');
  }
}


// ============ TYPING EFFECT ============
class TypingEffect {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      strings: options.strings || [element.textContent],
      typeSpeed: options.typeSpeed || 100,
      backSpeed: options.backSpeed || 50,
      backDelay: options.backDelay || 2000,
      loop: options.loop !== undefined ? options.loop : true,
      ...options
    };

    this.currentString = 0;
    this.currentChar = 0;
    this.isDeleting = false;
    this.text = '';

    this.init();
  }

  init() {
    this.element.textContent = '';
    this.type();
  }

  type() {
    const current = this.options.strings[this.currentString];

    if (this.isDeleting) {
      this.text = current.substring(0, this.currentChar - 1);
      this.currentChar--;
    } else {
      this.text = current.substring(0, this.currentChar + 1);
      this.currentChar++;
    }

    this.element.textContent = this.text;

    let typeSpeed = this.options.typeSpeed;

    if (this.isDeleting) {
      typeSpeed = this.options.backSpeed;
    }

    if (!this.isDeleting && this.text === current) {
      typeSpeed = this.options.backDelay;
      if (this.options.loop || this.currentString < this.options.strings.length - 1) {
        this.isDeleting = true;
      }
    } else if (this.isDeleting && this.text === '') {
      this.isDeleting = false;
      this.currentString++;
      if (this.currentString >= this.options.strings.length) {
        if (this.options.loop) {
          this.currentString = 0;
        } else {
          return;
        }
      }
      typeSpeed = 500;
    }

    setTimeout(() => this.type(), typeSpeed);
  }
}


// ============ SMOOTH SCROLL ============
class SmoothScroll {
  constructor() {
    this.init();
  }

  init() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));

        if (target) {
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          // Close mobile menu if open
          document.getElementById('mobileMenu')?.classList.remove('open');
          document.getElementById('navToggle')?.classList.remove('active');
        }
      });
    });
  }
}


// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', () => {
  // Scroll reveal
  new ScrollReveal();

  // Smooth scroll
  new SmoothScroll();

  // Counter animations
  const waitlistCount = document.getElementById('waitlistCount');
  if (waitlistCount) {
    new CounterAnimation(waitlistCount, {
      duration: 2500,
      start: 0,
      end: 12847
    }).observe();
  }

  const demoBalance = document.getElementById('demoBalance');
  if (demoBalance) {
    new CounterAnimation(demoBalance, {
      duration: 2000,
      start: 0,
      end: 1247.5,
      decimals: 2
    }).observe();
  }

  // Custom typing effect with emoji conversion for demo email
  const demoEmail = document.getElementById('demoEmail');
  if (demoEmail) {
    const emails = [
      { text: 'david@knexmail.com', emoji: false },
      { text: 'fire.rocket@knexmail.com', emoji: true, final: '🔥🚀@knexmail.com' },
      { text: 'alice@knexmail.com', emoji: false }
    ];

    let currentIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let displayedText = ''; // Track what's actually shown

    function typeEmail() {
      const current = emails[currentIndex];
      const fullText = current.text;

      if (isDeleting) {
        // When deleting emoji email, use the final converted version
        const deleteText = current.emoji ? current.final : fullText;
        charIndex--;
        displayedText = deleteText.substring(0, charIndex);
        demoEmail.textContent = displayedText;

        if (charIndex === 0) {
          isDeleting = false;
          currentIndex = (currentIndex + 1) % emails.length;
          displayedText = '';
          setTimeout(typeEmail, 500);
          return;
        }
        setTimeout(typeEmail, 40);
      } else {
        // Typing forward
        if (charIndex < fullText.length) {
          charIndex++;
          displayedText = fullText.substring(0, charIndex);

          // Apply emoji conversion for fire.rocket email
          if (current.emoji) {
            let convertedText = displayedText;

            // Convert "fire." to 🔥 (remove dot)
            if (displayedText.includes('fire.')) {
              convertedText = convertedText.replace('fire.', '🔥');
            }

            // Convert "rocket" to 🚀 after it's fully typed
            if (displayedText.includes('rocket')) {
              convertedText = convertedText.replace('rocket', '🚀');
            }

            demoEmail.textContent = convertedText;
          } else {
            demoEmail.textContent = displayedText;
          }

          setTimeout(typeEmail, 80);
        } else {
          // Finished typing, wait then delete
          setTimeout(() => {
            isDeleting = true;
            typeEmail();
          }, 3000);
        }
      }
    }

    typeEmail();
  }
});
