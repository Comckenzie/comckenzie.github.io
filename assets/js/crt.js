(function () {
  'use strict';

  // Initialize CRT effect
  function initCRT() {
    try {
      // Skip if reduced motion preferred
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const overlay = document.querySelector('.crt-overlay');
      if (!overlay) return;

      const wipe = overlay.querySelector('.crt-wipe');
      const saved = localStorage.getItem('crt-enabled');

      // Apply saved state
      if (saved === 'false') overlay.classList.add('crt-disabled');

      // Enable CRT and save state
      overlay.classList.remove('crt-disabled');
      try { localStorage.setItem('crt-enabled', 'true'); } catch (e) {}

      // Wipe animation handler
      const startWipe = () => {
        if (!wipe || overlay.classList.contains('crt-disabled') || wipe.classList.contains('active')) return;
        wipe.classList.add('active');
        wipe.addEventListener('animationend', () => wipe.classList.remove('active'), { once: true });
      };

      // Start periodic wipe
      if (wipe) {
        const startInterval = () => {
          startWipe();
          overlay.__crtWipeInterval = setInterval(startWipe, 30000);
        };
        setTimeout(startInterval, 30000);
      }

      // Toggle handler
      document.addEventListener('keydown', (e) => {
        if (e.key?.toLowerCase() !== 'c' || e.metaKey || e.ctrlKey || e.altKey) return;
        const disabled = overlay.classList.toggle('crt-disabled');
        localStorage.setItem('crt-enabled', disabled ? 'false' : 'true');

        if (disabled) {
          if (overlay.__crtWipeInterval) {
            clearInterval(overlay.__crtWipeInterval);
            overlay.__crtWipeInterval = null;
          }
        } else if (!overlay.__crtWipeInterval && wipe) {
          const startInterval = () => {
            startWipe();
            overlay.__crtWipeInterval = setInterval(startWipe, 30000);
          };
          setTimeout(startInterval, 30000);
        }
      });
    } catch (err) {
      console.error('CRT init failed', err);
    }
  }

  window.initCRT = initCRT;
})();