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
    const icon = document.getElementById('theme-toggle-icon');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');

    if (icon) {
      icon.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    } else {
      btn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }

    if (label) {
      label.textContent = isDark ? 'Light' : 'Dark';
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