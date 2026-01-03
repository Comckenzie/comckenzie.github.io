/* Shared UI + data rendering */

async function loadPartial(targetId, url) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  target.innerHTML = await res.text();
}

function getCurrentPageName() {
  const name = window.location.pathname.split('/').pop();
  return name && name.length ? name : 'index.html';
}

function getLinkPageName(href) {
  if (!href) return null;
  if (href.startsWith('#')) return null;
  const url = new URL(href, window.location.href);
  const name = url.pathname.split('/').pop();
  return name && name.length ? name : 'index.html';
}

function wrapNavLetters(el) {
  const text = (el.textContent || '').trim();
  if (!text) return;

  el.textContent = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const span = document.createElement('span');
    span.className = 'nav-letter';
    span.style.setProperty('--i', String(i));
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    el.appendChild(span);
  }
}

function wrapSectionLetters(el) {
  const text = (el.textContent || '').trim();
  if (!text) return;

  el.textContent = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const span = document.createElement('span');
    span.className = 'section-letter';
    span.style.setProperty('--i', String(i));
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    el.appendChild(span);
  }
}

function initSectionTitles() {
  const heads = document.querySelectorAll('.section__head h2');
  for (const h of heads) {
    wrapSectionLetters(h);
  }
}

function initActiveNav() {
  const page = getCurrentPageName();
  const links = document.querySelectorAll('.nav__links a, .nav__menu a');
  const currentParams = new URLSearchParams(window.location.search);

  for (const a of links) {
    const href = a.getAttribute('href');

    // Wrap all nav letters for hover animation
    if (a.closest('.nav__links')) {
      wrapNavLetters(a);
      addRollHover(a);
    }

    if (!href) continue;

    const linkUrl = new URL(href, window.location.href);
    const target = linkUrl.pathname.split('/').pop() || 'index.html';

    // Home link on index.html uses a hash.
    const isHomeHash = page === 'index.html' && href && href.startsWith('index.html#');
    const isExact = target === page;

    // Only mark as active when the page matches; for the projects page, also ensure the
    // `source` query param matches when present on the link so only the correct dropdown
    // item is highlighted.
    if (isExact || isHomeHash) {
      if (page === 'projects.html' && linkUrl.searchParams.has('source')) {
        const linkSource = linkUrl.searchParams.get('source');
        const currentSource = currentParams.get('source') || 'personal';
        if (linkSource === currentSource) {
          a.classList.add('is-active');
        } else {
          a.classList.remove('is-active');
        }
      } else {
        a.classList.add('is-active');
      }
    } else {
      a.classList.remove('is-active');
    }
  }
}

const NAV_ROLL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function startRoll(element, durationMs = 1000) {
  const letters = Array.from(element.querySelectorAll('.nav-letter'));
  const originals = letters.map((l) => l.textContent);

  const now0 = performance.now();
  const end = now0 + durationMs;

  const states = letters
    .map((span, index) => {
      const orig = originals[index];
      const isSpace = orig === '\u00A0' || orig === ' ';
      if (isSpace) return null;

      // Pre-generate 3 random chars, plus original for restore
      const randChars = [
        NAV_ROLL_CHARS[Math.floor(Math.random() * NAV_ROLL_CHARS.length)],
        NAV_ROLL_CHARS[Math.floor(Math.random() * NAV_ROLL_CHARS.length)],
        NAV_ROLL_CHARS[Math.floor(Math.random() * NAV_ROLL_CHARS.length)],
        orig, // Final: restore to original
      ];

      return {
        span,
        index,
        orig,
        next: now0 + index * 40,
        interval: 50,
        randChars,
        charIndex: 0,
        firstShown: false,
      };
    })
    .filter(Boolean);

  let rafId = 0;
  let cancelled = false;

  function restore() {
    for (let i = 0; i < letters.length; i++) {
      letters[i].textContent = originals[i];
      letters[i].style.opacity = '';
    }
  }

  function tick(now) {
    if (cancelled) return;

    for (const st of states) {
      while (now >= st.next && now < end) {
        if (st.charIndex < st.randChars.length) {
          st.span.textContent = st.randChars[st.charIndex];
          if (st.charIndex === 0) {
            // First replacement: transparent
            st.span.style.opacity = '0';
          } else if (st.charIndex === st.randChars.length - 1) {
            // Last replacement: restore original with full opacity
            st.span.style.opacity = '1';
          } else {
            // Middle replacements: visible
            st.span.style.opacity = '1';
          }
          st.charIndex++;
        }
        st.next += st.interval;
      }
    }

    if (now < end) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    restore();
    element.__navRollState = null;
  }

  rafId = requestAnimationFrame(tick);

  return {
    cancel() {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      restore();
    },
  };
}

function addRollHover(element) {
  element.addEventListener('mouseenter', () => {
    if (element.__navRollState) element.__navRollState.cancel();
    element.__navRollState = startRoll(element, 1000);
  });

  element.addEventListener('mouseleave', () => {
    if (!element.__navRollState) return;
    element.__navRollState.cancel();
    element.__navRollState = null;
  });
}

function initFooterYear() {
  const el = document.getElementById('year');
  if (!el) return;
  el.textContent = String(new Date().getFullYear());
}

async function initShell() {
  await loadPartial('site-header', 'assets/partials/header.html');
  await loadPartial('site-footer', 'assets/partials/footer.html');

  // Ensure the CRT overlay is a direct child of <body> so it stays fixed to the viewport
  // and is not affected by transforms applied to other elements (e.g. page scaling).
  const crt = document.querySelector('.crt-overlay');
  if (crt && crt.parentElement !== document.body) {
    document.body.appendChild(crt);
  }

  // Ensure a single vignette element (.crt-vignette) exists on every page and is
  // placed before the site header so the navbar sits above it while the CRT
  // overlay remains on top.
  (function ensureVignette() {
    const existing = document.querySelector('.crt-vignette');
    const header = document.getElementById('site-header');
    if (!header) return;

    if (existing) {
      if (existing.parentElement !== document.body) {
        document.body.insertBefore(existing, header);
      }
      return;
    }

    const v = document.createElement('div');
    v.className = 'crt-vignette';
    v.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(v, header);
  })();

  initActiveNav();
  initFooterYear();
  initTheme();
  initSectionActivation();
  if (window.initHero) window.initHero();
} 

/* Adds/removes .is-active on sections when they're in view so titles can animate */
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
/* Theme helpers: set, toggle, and initialize theme preference */
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
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
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
  } catch (e) {
    // ignore
  }

  // Attach listener to toggle button (header is loaded via partials)
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTheme();
    });
    updateThemeToggleIcon();
  }
}

/* Hero parallax: outer wrappers are transformed on scroll (parallax), inner squares animate up/down via CSS */
async function initHeroParallax() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const squaresContainer = hero.querySelector('.hero__squares');
  if (!squaresContainer) return;

  // Remove any existing squares/images
  squaresContainer.innerHTML = '';

  // Images to use for hero squares
  const heroImages = [
    'assets/images/noteA.png',
    'assets/images/noteB.png',
    'assets/images/noteC.png'
  ];

  // Preload images to get aspect ratios so we can preserve proportions
  const imgMeta = await Promise.all(
    heroImages.map((src) =>
      new Promise((res) => {
        const img = new Image();
        img.src = src;
        img.onload = () => res({ src, w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
        img.onerror = () => res({ src, w: 1, h: 1 });
      })
    )
  );

  // Parameters for random images
    const IMG_COUNT = 18;
    const MIN_SPEED = 0.06; // slowest
    const MAX_SPEED = 0.12; // normal speed (never faster)
    const MIN_SIZE = 24, MAX_SIZE = 88;
  const MIN_LEFT = 0, MAX_LEFT = 100; // percent (full width)
  const MIN_TOP = 60, MAX_TOP = 100; // percent, lower half (to bottom)

  // Parallax and cursor tuning
  const PARALLAX_FACTOR = 600; // multiplier for scroll parallax (higher = more movement)
  const PARALLAX_MAX = 360;    // clamp for parallax (px)
  const MOUSE_MULT_X = 1.5;    // horizontal cursor multiplier (increased)
  const MOUSE_MULT_Y = 1.5;    // vertical cursor multiplier (slightly reduced)

  // Helper to check overlap (bounding box collision in px units)
  function isOverlappingPx(newBox, boxes) {
    for (const box of boxes) {
      if (
        newBox.left < box.right &&
        newBox.right > box.left &&
        newBox.top < box.bottom &&
        newBox.bottom > box.top
      ) {
        return true;
      }
    }
    return false;
  }

  // Use hero's bounding box for accurate placement
  const heroRect = hero.getBoundingClientRect();
  const heroW = heroRect.width;
  const heroH = heroRect.height;

  // Generate images using a grid-based approach to spread them evenly in the lower area
  const squares = [];
  const placedBoxes = [];
  let attempts = 0;

  // Determine grid size (rows x cols) based on count
  const rows = Math.max(2, Math.min(6, Math.round(Math.sqrt(IMG_COUNT))));
  const cols = Math.ceil(IMG_COUNT / rows);

  // Vertical area bounds
  const areaTop = (MIN_TOP / 100) * heroH;
  const areaHeight = ((MAX_TOP - MIN_TOP) / 100) * heroH;

  const cellW = heroW / cols;
  const cellH = areaHeight / rows;

  // Build list of all cell indices and shuffle
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ r, c });
    }
  }
  // Fisher-Yates shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  for (let i = 0; i < IMG_COUNT && i < cells.length; i++) {
    const cell = cells[i];
    let leftPx, topPx, size, newBox;
    let tries = 0;

    do {
      size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);

      // Randomly pick an image meta to determine aspect ratio
      const meta = imgMeta[Math.floor(Math.random() * imgMeta.length)];
      const aspect = meta.h / meta.w;

      // Reduce size if it doesn't fit within a cell, leaving some padding
      const pad = 6;
      const availableW = Math.max(16, cellW - pad * 2);
      const availableH = Math.max(16, cellH - pad * 2);

      // Ensure the computed width doesn't exceed available width and height (after scaling by aspect)
      if (size > availableW) size = Math.max(MIN_SIZE, availableW);
      const height = Math.min(availableH, Math.max(MIN_SIZE * aspect, size * aspect));
      // If height exceeds availableH, shrink width accordingly
      const finalSize = Math.min(size, Math.max(MIN_SIZE, availableH / Math.max(0.001, aspect)));

      const cellLeft = cell.c * cellW;
      const cellTop = areaTop + cell.r * cellH;

      const maxLeftInCell = cellLeft + cellW - finalSize - pad;
      const minLeftInCell = cellLeft + pad;
      const maxTopInCell = cellTop + cellH - Math.max(16, finalSize * aspect) - pad;
      const minTopInCell = cellTop + pad;

      leftPx = minLeftInCell + Math.random() * Math.max(0, maxLeftInCell - minLeftInCell);
      topPx = minTopInCell + Math.random() * Math.max(0, maxTopInCell - minTopInCell);

      newBox = {
        left: leftPx,
        right: leftPx + finalSize,
        top: topPx,
        bottom: topPx + Math.max(16, finalSize * aspect)
      };

      // attach the chosen meta for later when creating the img element
      newBox.meta = meta;
      newBox.finalSize = finalSize;
      newBox.aspect = aspect;

      tries++;
      attempts++;
      // If after many tries we still overlap, reduce size slightly and try again
      if (tries > 30) {
        size = Math.max(MIN_SIZE, size - 6);
      }
      if (tries > 120) break;
    } while (isOverlappingPx(newBox, placedBoxes));

    placedBoxes.push(newBox);

    const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);

    const square = document.createElement('div');
    square.className = 'hero__square';
    square.dataset.speed = speed.toFixed(3);
    square.style.position = 'absolute';
    square.style.left = newBox.left + 'px';
    square.style.top = newBox.top + 'px';
    square.style.width = newBox.finalSize + 'px';
    square.style.height = Math.max(16, newBox.finalSize * newBox.aspect) + 'px';
    square.style.transition = 'none';

    // Use the preselected image meta so we keep aspect ratio consistent
    const img = document.createElement('img');
    img.src = newBox.meta.src;
    img.alt = '';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.pointerEvents = 'none';
    // Add slow floating animation with random duration and delay for natural effect
    const floatDuration = (2.5 + Math.random() * 2.5).toFixed(2) + 's'; // 2.5-5s
    const floatDelay = (Math.random() * 4).toFixed(2) + 's'; // 0-4s
    img.style.animationDuration = floatDuration;
    img.style.animationDelay = floatDelay;
    square.appendChild(img);

    squaresContainer.appendChild(square);
    squares.push(square);
  }

  let ticking = false;
  // Mouse normalized values (-1..1)
  let mouseNormX = 0;
  let mouseNormY = 0;
  // Smoothed mouse and scroll state used for easing
  let currentMouseX = 0;
  let currentMouseY = 0;
  let currentCentered = 0;

  // Add mouse listeners to hero for cursor parallax
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const ny = (e.clientY - (r.top + r.height / 2)) / r.height;
    // Apply separate X/Y multipliers (vertical more impactful)
    mouseNormX = Math.max(-1, Math.min(1, nx * MOUSE_MULT_X));
    mouseNormY = Math.max(-1, Math.min(1, ny * MOUSE_MULT_Y));
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  });



  // Set initial transform to the correct parallax position before transitions for smooth entry
  function setInitialTransforms() {
    const rect = hero.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
    const centered = (progress - 0.5) * 2;
    for (const sq of squares) {
      const speed = parseFloat(sq.dataset.speed) || 0.12;
    const raw = centered * PARALLAX_FACTOR * speed;
    const clamped = Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, raw));
      sq.style.transition = 'none';
      sq.style.transform = `translate3d(0, ${clamped}px, 0)`;
    }
    // Force reflow
    void squaresContainer.offsetHeight;
    // Re-enable transitions after a short delay to avoid any initial jump
    setTimeout(() => {
      for (const sq of squares) {
        sq.style.transition = 'transform 0.35s cubic-bezier(0.22,1,0.36,1)';
      }
    }, 30);
  }

  function update() {
    const rect = hero.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
    const targetCentered = (progress - 0.5) * 2;

    // Smoothly approach mouse and scroll positions for a much slower, heavily damped feel
    const ease = 0.02; // smoothing factor (0..1); lower = much slower/damped
    currentMouseX += (mouseNormX - currentMouseX) * ease;
    currentMouseY += (mouseNormY - currentMouseY) * ease;
    currentCentered += (targetCentered - currentCentered) * ease;

    let needsMoreFrames = false;

    for (const sq of squares) {
      const speed = parseFloat(sq.dataset.speed) || 0.12;
      // Parallax offset using smoothed centered
      const raw = currentCentered * PARALLAX_FACTOR * speed;
      const clamped = Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, raw));

      // Cursor parallax: faster (closer) items move more, but subtler overall
      const speedNorm = Math.max(0, Math.min(1, (speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)));
      const maxOffsetX = 64; // px (more horizontal influence)
      const maxOffsetY = 36; // px (reduced vertical influence)
      const offsetX = currentMouseX * maxOffsetX * (0.8 + speedNorm * 0.6);
      const offsetYMouse = currentMouseY * maxOffsetY * (0.6 + speedNorm * 0.6);

      const tx = offsetX;
      const ty = clamped + offsetYMouse;

      sq.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;

      // Fake depth: slower = less opacity, faster = more opacity
      // Increased range so images are more visible
      const minOpacity = 0.06, maxOpacity = 0.22;
      const norm = Math.max(0, Math.min(1, (speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)));
      const opacity = minOpacity + (maxOpacity - minOpacity) * norm;
      // For image squares, set opacity on the img
      const img = sq.querySelector('img');
      if (img) img.style.opacity = opacity.toFixed(2);

      // If we're still far from target, keep animating
      if (Math.abs(mouseNormX - currentMouseX) > 0.001 || Math.abs(mouseNormY - currentMouseY) > 0.001 || Math.abs(targetCentered - currentCentered) > 0.0005) {
        needsMoreFrames = true;
      }
    }

    if (needsMoreFrames) {
      requestAnimationFrame(update);
    } else {
      ticking = false;
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  setInitialTransforms();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
}

// Project data loading
async function loadProjects(source) {
  const res = await fetch(`assets/data/${source}.json`);
  if (!res.ok) throw new Error(`Failed to load ${source}.json`);
  return res.json();
}

function wrapLetters(text) {
  return text
    .split('')
    .map((char, i) => {
      if (char === ' ') return '<span class="letter" style="width: 0.3em;"> </span>';
      return `<span class="letter" style="transition-delay: ${i * 25}ms;">${char}</span>`;
    })
    .join('');
}

function renderGrid(container, projects, limit) {
  const slice = limit ? projects.slice(0, limit) : projects;
  
  container.innerHTML = slice
    .map(
      (p) => `
    <a class="card" href="project.html?source=${container.dataset.source}&id=${p.id}" aria-label="${p.name} — Open project">
      <img class="card__img" src="${p.image}" alt="${p.name}" loading="lazy" />
      <div class="card__overlay">
        <div class="card__meta">
          <h3 class="card__title">${wrapLetters(p.name)}</h3>
          ${p.creator ? `<p class="card__creator">${p.creator}</p>` : ''}
        </div>
      </div>
    </a>
  `
    )
    .join('');
}

async function initGrids() {
  const grids = document.querySelectorAll('.grid[data-source]');
  for (const grid of grids) {
    let source = grid.dataset.source;

    // If this is the unified projects page, allow source to be provided via ?source=personal|commissions
    if (!source && grid.id === 'projects-grid') {
      const params = new URLSearchParams(window.location.search);
      source = params.get('source') || 'personal';
      grid.dataset.source = source;

      // Update the page heading when present
      const heading = document.getElementById('projects-heading');
      if (heading) heading.textContent = source === 'commissions' ? 'Commissions' : 'Personal Projects';
    }

    const limit = grid.dataset.limit ? parseInt(grid.dataset.limit, 10) : null;
    try {
      const projects = await loadProjects(source);
      renderGrid(grid, projects, limit);
    } catch (err) {
      console.error(`Failed to load grid for ${source}:`, err);
      grid.innerHTML = '<p class="muted">Failed to load projects.</p>';
    }
  }
}

function renderProjectDetail(project, source) {
  const root = document.getElementById('project-root');
  if (!root) return;

  root.innerHTML = `
    <article class="project__inner" role="article">
      <div class="project__left">
        <img class="project__cover" src="${project.image}" alt="${project.name}" />
      </div>
      <div class="project__right">
        <header class="project__top">
          ${project.logo ? `<img class="project__logo" src="${project.logo}" alt="${project.name} logo" />` : ''}
          <div>
            <h1>${project.name}</h1>
            ${project.creator ? `<p class="muted">by ${project.creator}</p>` : ''}
          </div>
        </header>
        <p class="project__desc">${project.description}</p>

        ${
          project.tracks && project.tracks.length
            ? `
        <table class="tracks">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Title</th>
              <th scope="col">Duration</th>
            </tr>
          </thead>
          <tbody>
            ${project.tracks
              .map(
                (t, i) => `
              <tr>
                <th scope="row">${i + 1}</th>
                <td>${t.title}</td>
                <td>${t.duration}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        `
            : ''
        }
      </div>
    </article>
  `;
}

async function initProjectPage() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get('source');
  const id = params.get('id');

  if (!source || !id) {
    const root = document.getElementById('project-root');
    if (root) root.innerHTML = '<p class="muted">Project not found.</p>';
    return;
  }

  try {
    const projects = await loadProjects(source);
    const project = projects.find((p) => p.id === id);
    if (!project) {
      const root = document.getElementById('project-root');
      if (root) root.innerHTML = '<p class="muted">Project not found.</p>';
      return;
    }
    renderProjectDetail(project, source);
  } catch (err) {
    console.error('Failed to load project:', err);
    const root = document.getElementById('project-root');
    if (root) root.innerHTML = '<p class="muted">Failed to load project.</p>';
  }
}

// Scroll fade & slide effect for sections
function initScrollEffects() {
  // Effect removed: no fade/slide on scroll
}

/* Section indicators removed — feature disabled */
function initSectionSteps() {
  // intentionally left blank (feature removed)
} 

// Boot
initShell()
  .then(() => {
    initSectionTitles();
    initGrids();
    initScrollEffects();
    // section indicators removed — not initializing
    initCRT();
  })
  .catch((err) => {
    // If partial fetch fails, don't kill the whole page.
    console.error(err);
    initFooterYear();
  });

function initCRT() {
  try {
    // Honor reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const overlay = document.querySelector('.crt-overlay');
    if (!overlay) return;

    // Restore saved preference (default: enabled)
    const saved = localStorage.getItem('crt-enabled');
    if (saved === 'false') overlay.classList.add('crt-disabled');

    // Force-enable CRT overlay right now (user requested it be put back)
    overlay.classList.remove('crt-disabled');
    try { localStorage.setItem('crt-enabled', 'true'); } catch (e) {}

    // Wipe element and trigger logic (one short vertical sweep every ~30s)
    const wipe = overlay.querySelector('.crt-wipe');

    const startWipe = () => {
      if (!wipe) return;
      if (overlay.classList.contains('crt-disabled')) return;
      if (wipe.classList.contains('active')) return;
      wipe.classList.add('active');
      wipe.addEventListener('animationend', () => wipe.classList.remove('active'), { once: true });
    };

    if (wipe) {
      // ensure wipe is running (start immediately since we've re-enabled CRT)
      startWipe();

      // initial delayed wipe as well for additional effect
      setTimeout(() => {
        startWipe();
      }, 5000);

      // repeat every 10 seconds
      if (!overlay.__crtWipeInterval) {
        overlay.__crtWipeInterval = setInterval(() => {
          startWipe();
        }, 10000);
      }
    }

    // Toggle with 'c' key (press 'c' to toggle CRT overlay)
    document.addEventListener('keydown', (e) => {
      if (!e.key) return;
      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const disabled = overlay.classList.toggle('crt-disabled');
        localStorage.setItem('crt-enabled', disabled ? 'false' : 'true');

        // pause/resume wipes
        if (disabled) {
          if (overlay.__crtWipeInterval) { clearInterval(overlay.__crtWipeInterval); overlay.__crtWipeInterval = null; }
        } else {
          if (!overlay.__crtWipeInterval && wipe) {
            overlay.__crtWipeInterval = setInterval(startWipe, 10000);
          }
        }
      }
    });
  } catch (err) {
    console.error('CRT init failed', err);
  }
}
