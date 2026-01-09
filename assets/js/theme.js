(function () {
  'use strict';

  // Set theme; optionally persist when the user toggles
  function setTheme(theme, save = true) {
    try {
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch (e) { /* ignore DOM errors */ }

    if (save) {
      try { localStorage.setItem('theme', theme); } catch {}
    }
    updateThemeToggleIcon();
  }

  // Toggle theme
  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTheme(isDark ? 'light' : 'dark');
  }

  // Update toggle icon
  function updateThemeToggleIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const label = document.getElementById('theme-toggle-label');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    const icon = isDark ? 'sun' : 'moon';
    const img = document.createElement('img');
    img.src = `assets/images/icons/${icon}.png`;
    img.alt = icon;
    img.height = 32;
    img.style.width = 'auto';
    img.decoding = 'async';
    if (label) {
      label.innerHTML = '';
      label.appendChild(img);
    } else {
      btn.innerHTML = '';
      btn.appendChild(img);
    }
  }

  // Initialize theme: use stored choice if present, otherwise follow system preference
  function initTheme() {
    try {
      let saved = null;
      try { saved = localStorage.getItem('theme'); } catch {}

      if (saved === 'dark' || saved === 'light') {
        // Use persisted choice
        setTheme(saved, false);
      } else {
        // No stored choice: follow system preference at startup
        const mq = matchMedia?.('(prefers-color-scheme: dark)');
        const systemDark = mq?.matches || false;
        setTheme(systemDark ? 'dark' : 'light', false);
      }
    } catch {}

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', e => {
        e.preventDefault();
        toggleTheme();
        try { window.playUISound && window.playUISound('theme'); } catch (e) {}
        toggle.blur();
      });
      // also play sound on keyboard activation
      toggle.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          try { window.playUISound && window.playUISound('theme'); } catch (e) {}
        }
      });
      updateThemeToggleIcon();
    }
  }

  window.initTheme = initTheme;
  window.setTheme = setTheme;
})();