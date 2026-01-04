(function () {
  'use strict';

  function setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try { localStorage.setItem('theme', theme); } catch (e) {}
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
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');

    // Use icon and label text
    if (label) {
      label.innerHTML = isDark ? '<img src="assets/images/icons/sun.png" alt="sun" style="height:32px; width:auto;">' : '<img src="assets/images/icons/moon.png" alt="moon" style="height:32px; width:auto;">';
    } else {
      // fallback: set button text
      btn.innerHTML = isDark ? '<img src="assets/images/icons/sun.png" alt="sun" style="height:32px; width:auto;">' : '<img src="assets/images/icons/moon.png" alt="moon" style="height:32px; width:auto;">';
    }
  }

  function initTheme() {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    } catch (e) {}

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', (e) => {
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