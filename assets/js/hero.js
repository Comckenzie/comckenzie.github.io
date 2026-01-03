// Hero-only script: clean, simple, round-number constants
(function () {
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  async function initHero() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const container = hero.querySelector('.hero__squares');
    if (!container) return;

    // Clear existing
    container.innerHTML = '';

    // Image set
    const sources = ['assets/images/noteC.png', 'assets/images/noteA.png', 'assets/images/noteB.png'];

    // Preload metadata (natural sizes)
    const meta = await Promise.all(
      sources.map((s) =>
        new Promise((res) => {
          const i = new Image();
          i.src = s;
          i.onload = () => res({ src: s, w: i.naturalWidth || 1, h: i.naturalHeight || 1 });
          i.onerror = () => res({ src: s, w: 1, h: 1 });
        })
      )
    );

    // Round-number constants
    const IMG_COUNT = 18;
    const MIN_SIZE = 24; // px
    const MAX_SIZE = 88; // px
    const MIN_SPEED = 2; // depth units (even)
    const MAX_SPEED = 4; // even

    const MIN_TOP = 60; // percent
    const MAX_TOP = 100; // percent

    const PARALLAX_FACTOR = 200;
    const PARALLAX_MAX = 160; // px

    const MOUSE_MULT_X = 14; // will be divided by 10 when used
    const MOUSE_MULT_Y = 12; // will be divided by 10 when used

    const MAX_OFFSET_X = 64; // px
    const MAX_OFFSET_Y = 36; // px

    const EASE_NUM = 2; // smoothing numerator (even)
    const EASE_DEN = 50; // smoothing denominator (2/50 = 0.04)

    const MIN_OPACITY = 5; // percent
    const MAX_OPACITY = 20; // percent

    // Layout grid
    const rows = Math.max(2, Math.round(Math.sqrt(IMG_COUNT)));
    const cols = Math.ceil(IMG_COUNT / rows);

    const heroRect = hero.getBoundingClientRect();
    const heroW = Math.round(heroRect.width);
    const heroH = Math.round(heroRect.height);

    const areaTop = Math.round((MIN_TOP / 100) * heroH);
    const areaHeight = Math.round(((MAX_TOP - MIN_TOP) / 100) * heroH);

    const cellW = Math.round(heroW / cols);
    const cellH = Math.max(32, Math.round(areaHeight / rows));

    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c });
    shuffle(cells);

    const placed = [];

    for (let i = 0; i < IMG_COUNT && i < cells.length; i++) {
      const cell = cells[i];

      // pick random meta
      const m = meta[randInt(0, meta.length - 1)];
      const aspect = Math.round((m.h / m.w) * 100) / 100; // rounded two decimals

      let size = randInt(MIN_SIZE, MAX_SIZE);

      const pad = 6;
      const availW = Math.max(16, cellW - pad * 2);
      const availH = Math.max(16, cellH - pad * 2);

      if (size > availW) size = availW;
      const height = Math.min(availH, Math.max(MIN_SIZE, Math.round(size * aspect)));
      if (height > availH) size = Math.max(MIN_SIZE, Math.round(availH / Math.max(0.01, aspect)));

      const cellLeft = cell.c * cellW;
      const cellTop = areaTop + cell.r * cellH;

      const minLeft = cellLeft + pad;
      const maxLeft = cellLeft + cellW - size - pad;
      const minTop = cellTop + pad;
      const maxTop = cellTop + cellH - height - pad;

      const leftPx = Math.round(minLeft + Math.random() * Math.max(0, maxLeft - minLeft));
      const topPx = Math.round(minTop + Math.random() * Math.max(0, maxTop - minTop));

      const box = { left: leftPx, right: leftPx + size, top: topPx, bottom: topPx + height };

      // avoid overlap modestly
      let tries = 0;
      while (placed.some((b) => !(box.right <= b.left || box.left >= b.right || box.bottom <= b.top || box.top >= b.bottom)) && tries < 8) {
        // nudge inside cell
        const nx = Math.round(minLeft + Math.random() * Math.max(0, maxLeft - minLeft));
        const ny = Math.round(minTop + Math.random() * Math.max(0, maxTop - minTop));
        box.left = nx; box.right = nx + size; box.top = ny; box.bottom = ny + height;
        tries++;
      }

      placed.push(box);

      // choose even speed (2 or 4)
      const speed = randInt(1, 2) * 2;

      const el = document.createElement('div');
      el.className = 'hero__square';
      el.style.position = 'absolute';
      el.style.left = box.left + 'px';
      el.style.top = box.top + 'px';
      el.style.width = size + 'px';
      el.style.height = height + 'px';
      el.dataset.speed = String(speed);

      const img = document.createElement('img');
      img.src = m.src;
      img.alt = '';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';

      // floating animation: even seconds only (4 or 6)
      const dur = (randInt(2, 3) * 2) + 's';
      img.style.animationDuration = dur;
      img.style.animationTimingFunction = 'cubic-bezier(0.22,1,0.36,1)';

      el.appendChild(img);
      container.appendChild(el);
    }

    // runtime state
    let currentMouseX = 0;
    let currentMouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentCentered = 0;
    let loopRunning = false;

    function onMove(e) {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const ny = (e.clientY - (r.top + r.height / 2)) / r.height;
      // Use smooth floating point values (no rounding) for target to avoid quantization
      targetMouseX = Math.max(-1, Math.min(1, nx * (MOUSE_MULT_X / 10)));
      targetMouseY = Math.max(-1, Math.min(1, ny * (MOUSE_MULT_Y / 10)));
      if (!loopRunning) {
        loopRunning = true;
        requestAnimationFrame(loop);
      }
    }

    hero.addEventListener('mousemove', onMove);

    function loop() {
      const rect = hero.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
      const targetCentered = (progress - 0.5) * 2;

      // smooth with integer-based ease
      currentMouseX += (targetMouseX - currentMouseX) * (EASE_NUM / EASE_DEN);
      currentMouseY += (targetMouseY - currentMouseY) * (EASE_NUM / EASE_DEN);
      currentCentered += (targetCentered - currentCentered) * (EASE_NUM / EASE_DEN);

      for (const el of container.children) {
        const speed = Number(el.dataset.speed) || 1;
        const raw = currentCentered * PARALLAX_FACTOR * speed / 2; // divide to scale
        const clamped = Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, Math.round(raw)));

        const speedNorm = (speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED);

        const offsetX = Math.round(currentMouseX * MAX_OFFSET_X * (0.8 + speedNorm * 0.6));
        const offsetY = Math.round(currentMouseY * MAX_OFFSET_Y * (0.6 + speedNorm * 0.6));

        el.style.transform = 'translate3d(' + offsetX + 'px, ' + (clamped + offsetY) + 'px, 0)';

        const img = el.querySelector('img');
        if (img) {
          const opa = Math.round(MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * speedNorm);
          img.style.opacity = (opa / 100).toFixed(2);
        }
      }

      // continue RAF until values have nearly converged
      if (Math.abs(targetMouseX - currentMouseX) > 0.004 || Math.abs(targetMouseY - currentMouseY) > 0.004) {
        requestAnimationFrame(loop);
      } else {
        loopRunning = false;
      }
    }

    // start
    requestAnimationFrame(loop);
  }

  // expose initHero globally
  window.initHero = initHero;
})();