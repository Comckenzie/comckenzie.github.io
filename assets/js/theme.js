(function () {
  'use strict';

  function setTheme(theme, save = true) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');

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
    const svgIcon = document.createElement('span');
    svgIcon.className = 'theme-toggle__icon';
    svgIcon.dataset.icon = icon;
    svgIcon.setAttribute('aria-hidden', 'true');
    (label || btn).replaceChildren(svgIcon);
  }

  function initTheme() {
    let savedTheme;
    try {
      savedTheme = localStorage.getItem('theme');
    } catch { /* Storage can be blocked by the browser. */ }

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : systemTheme;
    setTheme(theme, false);

    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      toggleTheme();
    });
    updateThemeToggleIcon();
  }

  window.initTheme = initTheme;
})();
