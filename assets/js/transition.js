(function () {
  'use strict';

  const STORAGE_KEY = 'page-transition-target';
  const PIXEL_SIZE = 100;
  const DURATION = 100;
  const STAGGER = 500;
  const COVER_HOLD = 800;
  const TITLE_FADE = 200;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let arrivalOverlay = null;
  let navigationStarted = false;

  function pageKey(url) {
    const normalized = new URL(url, window.location.href);
    normalized.hash = '';
    return normalized.href;
  }

  function takeTarget() {
    try {
      const target = sessionStorage.getItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      return target;
    } catch {
      return null;
    }
  }

  function createMosaic(covered) {
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const columns = Math.max(1, Math.ceil(width / PIXEL_SIZE));
    const rows = Math.max(1, Math.ceil(height / PIXEL_SIZE));
    const overlay = document.createElement('div');
    overlay.className = 'page-transition';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    overlay.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;

    const pixels = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const pixel = document.createElement('span');
        pixel.className = 'page-transition__pixel';
        pixel.style.transform = `scale(${covered ? 1.06 : 0})`;
        pixels.push(pixel);
        overlay.appendChild(pixel);
      }
    }

    document.body.appendChild(overlay);
    return { element: overlay, pixels };
  }

  function animateMosaic(mosaic, cover) {
    const sequence = mosaic.pixels.slice();
    for (let index = sequence.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [sequence[index], sequence[swapIndex]] = [sequence[swapIndex], sequence[index]];
    }

    const animations = sequence.map((element, index) => {
      const delay = sequence.length > 1 ? (index / (sequence.length - 1)) * STAGGER : 0;
      const from = cover ? 'scale(0)' : 'scale(1.06)';
      const to = cover ? 'scale(1.06)' : 'scale(0)';

      if (typeof element.animate === 'function') {
        return element.animate(
          [{ transform: from }, { transform: to }],
          { duration: DURATION, delay, easing: 'steps(1, end)', fill: 'forwards' }
        ).finished.catch(() => {});
      }

      element.style.transition = `transform ${DURATION}ms steps(1, end) ${delay}ms`;
      requestAnimationFrame(() => { element.style.transform = to; });
      return new Promise(resolve => setTimeout(resolve, delay + DURATION));
    });
    return Promise.all(animations);
  }

  function pageTitle() {
    const heading = document.querySelector('main h1');
    const title = heading?.textContent.replace(/\s+/g, ' ').trim();
    if (title) return title;
    return document.title.split(/[—|]/, 1)[0].trim();
  }

  async function revealArrival() {
    if (!arrivalOverlay) return;
    const mosaic = arrivalOverlay;
    arrivalOverlay = null;

    const title = document.createElement('div');
    title.className = 'page-transition__title';
    title.textContent = pageTitle();
    mosaic.element.appendChild(title);
    requestAnimationFrame(() => title.classList.add('is-visible'));

    await new Promise(resolve => setTimeout(resolve, COVER_HOLD - TITLE_FADE));
    title.classList.remove('is-visible');
    await new Promise(resolve => setTimeout(resolve, TITLE_FADE));
    await animateMosaic(mosaic, false);
    mosaic.element.remove();
  }

  const pendingTarget = takeTarget();
  if (!reducedMotion.matches && pendingTarget === pageKey(window.location.href)) {
    arrivalOverlay = createMosaic(true);
  }
  document.documentElement.classList.remove('page-transition-pending');
  clearTimeout(window.__pageTransitionSafetyTimer);

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (navigationStarted || reducedMotion.matches) return;

    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const anchor = target?.closest('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;
    if (anchor.target && anchor.target.toLowerCase() !== '_self') return;
    if (anchor.relList.contains('external')) return;

    let destination;
    try {
      destination = new URL(anchor.href, window.location.href);
    } catch {
      return;
    }
    if (!['http:', 'https:'].includes(destination.protocol) || destination.origin !== window.location.origin) return;
    if (pageKey(destination.href) === pageKey(window.location.href)) return;

    event.preventDefault();
    navigationStarted = true;
    try { sessionStorage.setItem(STORAGE_KEY, pageKey(destination.href)); } catch {}

    window.siteSound?.transition();
    const mosaic = createMosaic(false);
    animateMosaic(mosaic, true).then(() => window.location.assign(destination.href));
  }, true);

  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    takeTarget();
    arrivalOverlay?.element.remove();
    document.querySelectorAll('.page-transition').forEach(overlay => overlay.remove());
    if (reducedMotion.matches) return;
    arrivalOverlay = createMosaic(true);
    revealArrival();
  });

  window.initPageTransition = revealArrival;
})();
