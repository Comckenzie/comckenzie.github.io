(function(){
  // Utility functions
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Load image metadata
  const loadImg = src => new Promise(res => {
    const i = new Image();
    i.src = src;
    i.onload = () => res({src, w: i.naturalWidth || 1, h: i.naturalHeight || 1});
    i.onerror = () => res({src, w: 1, h: 1});
  });

  // Initialize hero section
  async function initHero(){
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const subtitle = hero.querySelector('.hero__title');
    if (subtitle && typeof wrapSectionLetters === 'function') {
      try {
        wrapSectionLetters(subtitle);
        subtitle.classList.add('is-active');
      } catch (e) {
        console.warn('wrapSectionLetters failed', e);
      }
    }
    await initHeroParallax();
  }

  // Setup parallax images
  async function initHeroParallax(){
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const container = hero.querySelector('.hero__squares');
    if (!container) return;
    container.innerHTML = '';

    const imgs = ['assets/images/noteA.png', 'assets/images/noteB.png', 'assets/images/noteC.png'];
    const metas = await Promise.all(imgs.map(loadImg));

    // Constants
    const N = 20, MIN_SPEED = 0.05, MAX_SPEED = 0.15, MIN_S = 20, MAX_S = 80, MIN_TOP = 60, MAX_TOP = 100, PARALLAX_FACTOR = 600, PARALLAX_MAX = 360;

    const rect = hero.getBoundingClientRect(), W = rect.width, H = rect.height;
    const rows = clamp(Math.round(Math.sqrt(N)), 2, 6), cols = Math.ceil(N / rows);
    const areaTop = (MIN_TOP / 100) * H, areaH = ((MAX_TOP - MIN_TOP) / 100) * H;
    const cellW = W / cols, cellH = areaH / rows;

    // Generate and shuffle cells
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({r, c});
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    const placed = [], squares = [], frag = document.createDocumentFragment();

    // Place squares
    for (let i = 0; i < Math.min(N, cells.length); i++) {
      const cell = cells[i];
      let tries = 0, box;
      do {
        tries++;
        const size = rand(MIN_S, MAX_S);
        const meta = metas[randInt(0, metas.length - 1)];
        const aspect = Math.max(0.1, meta.h / meta.w);
        let w = Math.min(size, cellW - 12);
        w = clamp(w, MIN_S, Math.max(MIN_S, cellW - 12));
        let h = Math.min(w * aspect, cellH - 12);
        if (h < MIN_S) {
          h = MIN_S;
          w = Math.min(w, Math.max(MIN_S, h / aspect));
        }
        const cellLeft = cell.c * cellW, cellTop = areaTop + cell.r * cellH;
        const left = cellLeft + 6 + Math.random() * Math.max(0, cellW - 12 - w);
        const top = cellTop + 6 + Math.random() * Math.max(0, cellH - 12 - h);
        box = {left, right: left + w, top, bottom: top + h, w, h, meta};
        if (tries > 40) break;
      } while (placed.some(b => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top));

      placed.push(box);
      const speed = rand(MIN_SPEED, MAX_SPEED);

      const sq = document.createElement('div');
      sq.className = 'hero__square';
      sq.dataset.speed = speed.toFixed(3);
      Object.assign(sq.style, {
        position: 'absolute',
        left: box.left + 'px',
        top: box.top + 'px',
        width: box.w + 'px',
        height: box.h + 'px',
        transition: 'none'
      });
      const img = document.createElement('img');
      img.src = box.meta.src;
      img.alt = '';
      Object.assign(img.style, {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        pointerEvents: 'none',
        animationDuration: (2.5 + Math.random() * 2.5).toFixed(2) + 's',
        animationDelay: (Math.random() * 4).toFixed(2) + 's'
      });
      sq.appendChild(img);
      frag.appendChild(sq);
      squares.push(sq);
    }

    container.appendChild(frag);

    // Parallax animation
    let ticking = false, cur = 0;
    const applyTransforms = centered => {
      for (const s of squares) {
        const sp = +s.dataset.speed || 0.12;
        const raw = centered * PARALLAX_FACTOR * sp;
        const clamped = clamp(raw, -PARALLAX_MAX, PARALLAX_MAX);
        s.style.transform = `translate3d(0, ${clamped}px, 0)`;
        const norm = Math.max(0, Math.min(1, (sp - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)));
        const o = (0.06 + 0.16 * norm).toFixed(2);
        const im = s.querySelector('img');
        if (im) im.style.opacity = o;
      }
    };

    const init = () => {
      const r = hero.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = clamp((vh - r.top) / (vh + r.height), 0, 1);
      applyTransforms((progress - 0.5) * 2);
      void container.offsetHeight;
      setTimeout(() => {
        for (const s of squares) s.style.transition = 'transform 0.35s cubic-bezier(0.22,1,0.36,1)';
      }, 30);
    };

    function update() {
      const r = hero.getBoundingClientRect();
      const vh = window.innerHeight;
      const target = (clamp((vh - r.top) / (vh + r.height), 0, 1) - 0.5) * 2;
      const ease = 0.02;
      cur += (target - cur) * ease;
      applyTransforms(cur);
      if (Math.abs(target - cur) > 0.0005) requestAnimationFrame(update);
      else ticking = false;
    }

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    init();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  window.initHero = initHero;
})();