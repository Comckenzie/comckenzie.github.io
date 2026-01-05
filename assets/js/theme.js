(function () {
  'use strict';

  // Set theme
  function setTheme(theme, save = true) {
    document.documentElement.toggleAttribute('data-theme', theme === 'dark');
    if (save) try { localStorage.setItem('theme', theme); } catch {}
    updateThemeToggleIcon();
  }

  // Toggle theme
  function toggleTheme() {
    const isDark = document.documentElement.hasAttribute('data-theme');
    setTheme(isDark ? 'light' : 'dark');
  }

  // Update toggle icon
  function updateThemeToggleIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const label = document.getElementById('theme-toggle-label');
    const isDark = document.documentElement.hasAttribute('data-theme');
    btn.setAttribute('aria-pressed', isDark);
    const icon = isDark ? 'sun' : 'moon';
    const imgHtml = `<img src="assets/images/icons/${icon}.png" alt="${icon}" style="height:32px; width:auto;">`;
    if (label) label.innerHTML = imgHtml;
    else btn.innerHTML = imgHtml;
  }

  // Initialize theme
  function initTheme() {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      } else {
        const mq = matchMedia?.('(prefers-color-scheme: dark)');
        const systemDark = mq?.matches || false;
        setTheme(systemDark ? 'dark' : 'light', false);
        if (mq) {
          const handleChange = ev => {
            if (!localStorage.getItem('theme')) setTheme(ev.matches ? 'dark' : 'light', false);
          };
          mq.addEventListener?.('change', handleChange) || mq.addListener?.(handleChange);
        }
      }
    } catch {}

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', e => {
        e.preventDefault();
        toggleTheme();
        toggle.blur();
      });
      updateThemeToggleIcon();
    }
  }

  window.initTheme = initTheme;
  window.setTheme = setTheme;
})();