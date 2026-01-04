(function () {
  async function initHero() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    // Wrap only the hero subtitle into per-letter spans (keep the name unchanged)
    try {
      const subtitle = hero.querySelector('.hero__title');
      if (typeof wrapSectionLetters === 'function' && subtitle) {
        wrapSectionLetters(subtitle);
        // Activate subtitle animations immediately
        subtitle.classList.add('is-active');
      }
    } catch (e) {
      // ignore if helper not available for any reason
      console.warn('wrapSectionLetters not available:', e);
    }

    await initHeroParallax();
  }

  async function initHeroParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const squaresContainer = hero.querySelector('.hero__squares');
    if (!squaresContainer) return;

    squaresContainer.innerHTML = '';

    const heroImages = [
      'assets/images/noteA.png',
      'assets/images/noteB.png',
      'assets/images/noteC.png'
    ];

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

    const IMG_COUNT = 18;
    const MIN_SPEED = 0.06;
    const MAX_SPEED = 0.12;
    const MIN_SIZE = 24;
    const MAX_SIZE = 88;
    const MIN_TOP = 60;
    const MAX_TOP = 100;

    const PARALLAX_FACTOR = 600;
    const PARALLAX_MAX = 360;

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

    const heroRect = hero.getBoundingClientRect();
    const heroW = heroRect.width;
    const heroH = heroRect.height;

    const squares = [];
    const placedBoxes = [];

    const rows = Math.max(2, Math.min(6, Math.round(Math.sqrt(IMG_COUNT))));
    const cols = Math.ceil(IMG_COUNT / rows);

    const areaTop = (MIN_TOP / 100) * heroH;
    const areaHeight = ((MAX_TOP - MIN_TOP) / 100) * heroH;

    const cellW = heroW / cols;
    const cellH = areaHeight / rows;

    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ r, c });
      }
    }
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

        const meta = imgMeta[Math.floor(Math.random() * imgMeta.length)];
        const aspect = meta.h / meta.w;

        const pad = 6;
        const availableW = Math.max(16, cellW - pad * 2);
        const availableH = Math.max(16, cellH - pad * 2);

        if (size > availableW) size = Math.max(MIN_SIZE, availableW);
        const height = Math.min(availableH, Math.max(MIN_SIZE * aspect, size * aspect));
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

        newBox.meta = meta;
        newBox.finalSize = finalSize;
        newBox.aspect = aspect;

        tries++;
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

      const img = document.createElement('img');
      img.src = newBox.meta.src;
      img.alt = '';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.pointerEvents = 'none';
      const floatDuration = (2.5 + Math.random() * 2.5).toFixed(2) + 's';
      const floatDelay = (Math.random() * 4).toFixed(2) + 's';
      img.style.animationDuration = floatDuration;
      img.style.animationDelay = floatDelay;
      square.appendChild(img);

      squaresContainer.appendChild(square);
      squares.push(square);
    }

    let ticking = false;
    let currentCentered = 0;




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
      void squaresContainer.offsetHeight;
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

      const ease = 0.02;
      currentCentered += (targetCentered - currentCentered) * ease;

      let needsMoreFrames = false;

      for (const sq of squares) {
        const speed = parseFloat(sq.dataset.speed) || 0.12;
        const raw = currentCentered * PARALLAX_FACTOR * speed;
        const clamped = Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, raw));

        sq.style.transform = `translate3d(0, ${clamped}px, 0)`;

        const minOpacity = 0.06, maxOpacity = 0.22;
        const norm = Math.max(0, Math.min(1, (speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)));
        const opacity = minOpacity + (maxOpacity - minOpacity) * norm;
        const img = sq.querySelector('img');
        if (img) img.style.opacity = opacity.toFixed(2);

        if (Math.abs(targetCentered - currentCentered) > 0.0005) {
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

  window.initHero = initHero;
})();