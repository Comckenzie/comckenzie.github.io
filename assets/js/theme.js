(function () {
  'use strict';

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

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTheme(isDark ? 'light' : 'dark');
  }

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

  function initTheme() {
    try {
      let saved = null;
      try { saved = localStorage.getItem('theme'); } catch {}

      if (saved === 'dark' || saved === 'light') {
        setTheme(saved, false);
      } else {
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