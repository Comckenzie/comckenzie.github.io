async function loadPartial(targetId, url) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  target.innerHTML = await res.text();
}

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

function initSectionTitles() {
  const heads = document.querySelectorAll('.section__head h2, .accentuation-title');
  for (const h of heads) {
    wrapSectionLetters(h);
  }
}





function initFooterYear() {
  const el = document.getElementById('year');
  if (!el) return;
  el.textContent = String(new Date().getFullYear());
}

async function initShell() {
  await loadPartial('site-header', 'assets/partials/header.html');
  await loadPartial('site-footer', 'assets/partials/footer.html');

  const crt = document.querySelector('.crt-overlay');
  if (crt && crt.parentElement !== document.body) {
    document.body.appendChild(crt);
  }

  // vignette is included inside the .crt-overlay markup in the header partial

  if (window.initNav) window.initNav();
  if (window.initMobileNav) window.initMobileNav();
  initFooterYear();
  if (window.initTheme) window.initTheme();
  initSectionActivation();
  if (window.initHero) window.initHero();
  if (window.initGrids) window.initGrids();
} 

function initSectionActivation() {
  const sections = Array.from(document.querySelectorAll('.section'));
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.classList.add('is-active');
      } else {
        el.classList.remove('is-active');
      }
    });
  }, { threshold: 0.55 });

  sections.forEach(s => observer.observe(s));
}

function initScrollEffects() {
}

initShell()
  .then(() => {
    initSectionTitles();
    if (window.initGrids) window.initGrids();
    if (window.initProjectPage) window.initProjectPage();
    initScrollEffects();
    if (window.initCRT) window.initCRT();
  })
  .catch((err) => {
    console.error(err);
    initFooterYear();
  });


