// Load partial HTML content
async function loadPartial(targetId, url) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  target.innerHTML = await res.text();
}

// UI sound helper: only play the theme audio file (assets/sounds/theme.mp3). No synth.
;(function () {
  const audioCache = new Map();

  function playAudioFile(name) {
    try {
      const path = `assets/sounds/${name}.mp3`;
      let a = audioCache.get(path);
      if (!a) {
        a = new Audio(path);
        a.preload = 'auto';
        a.volume = 0.6;
        audioCache.set(path, a);
      }
      if (!a.paused) {
        const clone = a.cloneNode();
        clone.volume = a.volume;
        clone.play().catch(() => {});
      } else {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  window.playUISound = function (name) {
    if (name === 'theme') {
      playAudioFile('theme');
    }
    // otherwise do nothing (no hover sounds)
  };
})();

// Wrap letters in section titles
function wrapSectionLetters(el) {
  const text = (el.textContent || '').trim();
  if (!text) return;

  el.textContent = '';
  const words = text.split(' ');
  words.forEach((word, wordIndex) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'section-word';
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const span = document.createElement('span');
      span.className = 'section-letter';
      span.style.setProperty('--i', String(wordIndex * 10 + i));
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      wordSpan.appendChild(span);
    }
    el.appendChild(wordSpan);
    if (wordIndex < words.length - 1) {
      el.appendChild(document.createTextNode(' '));
    }
  });
}

// Initialize section titles
function initSectionTitles() {
  const heads = document.querySelectorAll('.section__head h2, .accentuation-title');
  heads.forEach(h => wrapSectionLetters(h));
}

// Attach hover/focus sounds to interactive buttons
function initUIButtonSounds() {
  const seen = new WeakMap();
  function handlePlay(e) {
    const el = e.currentTarget;
    const last = seen.get(el) || 0;
    const now = Date.now();
    if (now - last < 120) return; // throttle rapid triggers
    seen.set(el, now);
    window.playUISound && window.playUISound('hover');
  }

  // Only play hover sound when hovering project cards (projects, personal, commissions grids)
  const selector = [
    '#projects-grid .card',
    '#personal-grid .card',
    '#commissions-grid .card'
  ].join(', ');
  document.querySelectorAll(selector).forEach(el => {
    // skip the theme toggle so hover.mp3 is not played on it
    if (el.id === 'theme-toggle' || el.classList.contains('theme-toggle')) return;
    el.addEventListener('mouseenter', handlePlay);
    el.addEventListener('focus', handlePlay);
  });
}

// Set footer year
function initFooterYear() {
  const el = document.querySelector('.footer__made');
  const year = String(new Date().getFullYear());
  if (el) el.textContent = `© ${year} — Website made by`;
}

// Initialize main shell
async function initShell() {
  await loadPartial('site-header', 'assets/partials/header.html');
  await loadPartial('site-footer', 'assets/partials/footer.html');

  const crt = document.querySelector('.crt-overlay');
  if (crt && crt.parentElement !== document.body) {
    document.body.appendChild(crt);
  }

  // Vignette included in CRT overlay markup

  if (window.initNav) window.initNav();
  initFooterYear();
  if (window.initTheme) window.initTheme();
  initSectionActivation();
  if (window.initHero) window.initHero();
  if (window.initGrids) window.initGrids();
}

// Activate sections on intersection
function initSectionActivation() {
  const sections = document.querySelectorAll('.section');
  if (!sections.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.classList.toggle('is-active', entry.isIntersecting);
    });
  }, { threshold: 0.55 });

  sections.forEach(s => observer.observe(s));
}

// Initialize scroll effects (placeholder)
function initScrollEffects() {
  // Future scroll effects
}

// Main initialization
initShell()
  .then(() => {
    initSectionTitles();
    initUIButtonSounds();
    if (window.initGrids) window.initGrids();
    if (window.initProjectPage) window.initProjectPage();
    initScrollEffects();
    if (window.initCRT) window.initCRT();
  })
  .catch(err => {
    console.error(err);
    initFooterYear();
  });