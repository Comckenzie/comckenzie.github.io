async function loadPartial(targetId, url) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const res = await fetch(url, { cache: 'default' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  target.innerHTML = await res.text();
}

function wrapSectionLetters(el) {
  const text = el.textContent.trim();
  if (!text) return;
  const fragment = document.createDocumentFragment();
  let letterIndex = 0;
  const words = text.split(/\s+/);

  words.forEach((word, wordIndex) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'section-word';
    for (const character of word) {
      const span = document.createElement('span');
      span.className = 'section-letter';
      span.style.setProperty('--i', String(letterIndex++));
      span.textContent = character;
      wordSpan.appendChild(span);
    }
    fragment.appendChild(wordSpan);
    if (wordIndex < words.length - 1) fragment.appendChild(document.createTextNode(' '));
  });
  el.replaceChildren(fragment);
}

function initSectionTitles() {
  document.querySelectorAll('.accentuation-effect').forEach(wrapSectionLetters);
}

function initFooterYear() {
  const el = document.querySelector('.footer__made');
  if (el) el.textContent = `© ${new Date().getFullYear()} — Website made by`;
}

async function initShell() {
  await Promise.all([
    loadPartial('site-header', 'assets/partials/header.html'),
    loadPartial('site-footer', 'assets/partials/footer.html')
  ]);
  const crt = document.querySelector('.crt-overlay');
  if (crt && crt.parentElement !== document.body) document.body.appendChild(crt);
  if (window.initNav) window.initNav();
  if (window.initSoundToggle) window.initSoundToggle();
  initFooterYear();
  if (window.initTheme) window.initTheme();
  initSectionActivation();
  if (window.initHero) window.initHero();
  if (window.initGrids) await window.initGrids();
}

function initSectionActivation() {
  const sections = document.querySelectorAll('.section');
  if (!sections.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-active', entry.isIntersecting));
  }, { threshold: 0.55 });
  sections.forEach(s => observer.observe(s));
}

initShell()
  .then(async () => {
    initSectionTitles();
    if (window.initProjectPage) await window.initProjectPage();
    if (window.initPageTransition) window.initPageTransition();
  })
  .catch(err => {
    console.error(err);
    initFooterYear();
    if (window.initPageTransition) window.initPageTransition();
  });
