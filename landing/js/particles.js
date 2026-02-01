/* ============================================
   KNEXMAIL - PARTICLE SYSTEM
   Floating Background Particles
   ============================================ */

class ParticleSystem {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.options = {
      particleCount: options.particleCount || 30,
      colors: options.colors || ['#00ff88', '#00ffff', '#ff00ff'],
      minSize: options.minSize || 2,
      maxSize: options.maxSize || 6,
      minDuration: options.minDuration || 15,
      maxDuration: options.maxDuration || 30,
      ...options
    };

    this.init();
  }

  init() {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.createParticles();
  }

  createParticles() {
    for (let i = 0; i < this.options.particleCount; i++) {
      this.createParticle();
    }
  }

  createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';

    // Random properties
    const size = this.randomBetween(this.options.minSize, this.options.maxSize);
    const color = this.options.colors[Math.floor(Math.random() * this.options.colors.length)];
    const duration = this.randomBetween(this.options.minDuration, this.options.maxDuration);
    const delay = this.randomBetween(0, this.options.maxDuration);
    const startX = this.randomBetween(0, 100);

    // Apply styles
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      left: ${startX}%;
      bottom: -10px;
      opacity: 0;
      box-shadow: 0 0 ${size * 2}px ${color};
      animation: particleFloat ${duration}s linear ${delay}s infinite;
      pointer-events: none;
    `;

    this.container.appendChild(particle);
  }

  randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Clean up particles (useful for page transitions)
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Initialize particles when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only create particles on larger screens for performance
  if (window.innerWidth > 768) {
    window.particleSystem = new ParticleSystem('particles', {
      particleCount: 25,
      colors: ['#00ff88', '#00ffff', '#ff00ff', '#ffff00'],
      minSize: 2,
      maxSize: 5,
      minDuration: 20,
      maxDuration: 40
    });
  }
});

// Handle visibility change to pause/resume animations
document.addEventListener('visibilitychange', () => {
  const particles = document.querySelectorAll('.particle');
  particles.forEach(p => {
    p.style.animationPlayState = document.hidden ? 'paused' : 'running';
  });
});
