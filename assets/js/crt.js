(function () {
  'use strict';

  function initCRT() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const overlay = document.querySelector('.crt-overlay');
      if (!overlay) return;

      const saved = localStorage.getItem('crt-enabled');
      if (saved === 'false') overlay.classList.add('crt-disabled');

      overlay.classList.remove('crt-disabled');
      try { localStorage.setItem('crt-enabled', 'true'); } catch (e) {}

      const wipe = overlay.querySelector('.crt-wipe');

      const startWipe = () => {
        if (!wipe) return;
        if (overlay.classList.contains('crt-disabled')) return;
        if (wipe.classList.contains('active')) return;
        wipe.classList.add('active');
        wipe.addEventListener('animationend', () => wipe.classList.remove('active'), { once: true });
      };

      if (wipe) {
        startWipe();
        setTimeout(startWipe, 5000);
        if (!overlay.__crtWipeInterval) {
          overlay.__crtWipeInterval = setInterval(startWipe, 30000);
        }
      }

      document.addEventListener('keydown', (e) => {
        if (!e.key) return;
        if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const disabled = overlay.classList.toggle('crt-disabled');
          localStorage.setItem('crt-enabled', disabled ? 'false' : 'true');

          if (disabled) {
            if (overlay.__crtWipeInterval) { clearInterval(overlay.__crtWipeInterval); overlay.__crtWipeInterval = null; }
          } else {
            if (!overlay.__crtWipeInterval && wipe) overlay.__crtWipeInterval = setInterval(startWipe, 30000);
          }
        }
      });
    } catch (err) {
      console.error('CRT init failed', err);
    }
  }

  window.initCRT = initCRT;
})();