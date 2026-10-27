(function () {
  'use strict';

  const SQUARE_COUNT = 20;
  const SPEED_RANGE = [0.05, 0.15];
  const SIZE_RANGE = [20, 80];
  const TOP_RANGE = [60, 100];
  const PARALLAX_DISTANCE = 600;
  const MAX_PARALLAX = 360;

  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const randomInteger = (min, max) => Math.floor(randomBetween(min, max + 1));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function loadImageInfo(src) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve({ src, width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
      image.onerror = () => resolve({ src, width: 1, height: 1 });
      image.src = src;
    });
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index--) {
      const otherIndex = randomInteger(0, index);
      [items[index], items[otherIndex]] = [items[otherIndex], items[index]];
    }
    return items;
  }

  function getGridCells(rowCount, columnCount) {
    const cells = [];
    for (let row = 0; row < rowCount; row++) {
      for (let column = 0; column < columnCount; column++) cells.push({ row, column });
    }
    return shuffle(cells);
  }

  function createSquare(cell, grid, images, placedSquares) {
    let placement;
    let attempts = 0;

    do {
      attempts++;
      const preferredSize = randomBetween(...SIZE_RANGE);
      const imageInfo = images[randomInteger(0, images.length - 1)];
      const imageRatio = Math.max(0.1, imageInfo.height / imageInfo.width);
      let width = clamp(preferredSize, 20, Math.max(20, grid.cellWidth - 12));
      let height = Math.min(width * imageRatio, grid.cellHeight - 12);

      if (height < 20) {
        height = 20;
        width = Math.min(width, Math.max(20, height / imageRatio));
      }

      const cellLeft = cell.column * grid.cellWidth;
      const cellTop = grid.areaTop + cell.row * grid.cellHeight;
      const left = cellLeft + 6 + Math.random() * Math.max(0, grid.cellWidth - 12 - width);
      const top = cellTop + 6 + Math.random() * Math.max(0, grid.cellHeight - 12 - height);

      placement = { left, top, width, height, imageInfo };
      const overlaps = placedSquares.some(square =>
        left < square.right && left + width > square.left &&
        top < square.bottom && top + height > square.top
      );

      if (!overlaps || attempts > 40) break;
    } while (true);

    placedSquares.push({
      left: placement.left,
      right: placement.left + placement.width,
      top: placement.top,
      bottom: placement.top + placement.height
    });

    const element = document.createElement('div');
    element.className = 'hero__square';
    Object.assign(element.style, {
      left: `${placement.left}px`,
      top: `${placement.top}px`,
      width: `${placement.width}px`,
      height: `${placement.height}px`,
      transition: 'none'
    });

    const image = document.createElement('img');
    image.src = placement.imageInfo.src;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    Object.assign(image.style, {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      pointerEvents: 'none',
      animationDuration: `${randomBetween(2.5, 5).toFixed(2)}s`,
      animationDelay: `${randomBetween(0, 4).toFixed(2)}s`
    });
    element.appendChild(image);

    return {
      element,
      image,
      speed: randomBetween(...SPEED_RANGE)
    };
  }

  function getScrollProgress(hero) {
    const rect = hero.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    return clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);
  }

  async function initHero() {
    const hero = document.querySelector('.hero');
    const container = hero?.querySelector('.hero__squares');
    if (!hero || !container) return;

    const imagePaths = ['assets/images/noteA.png', 'assets/images/noteB.png', 'assets/images/noteC.png'];
    const images = await Promise.all(imagePaths.map(loadImageInfo));
    const heroRect = hero.getBoundingClientRect();
    const rowCount = clamp(Math.round(Math.sqrt(SQUARE_COUNT)), 2, 6);
    const columnCount = Math.ceil(SQUARE_COUNT / rowCount);
    const areaTop = TOP_RANGE[0] / 100 * heroRect.height;
    const areaHeight = (TOP_RANGE[1] - TOP_RANGE[0]) / 100 * heroRect.height;
    const grid = {
      cellWidth: heroRect.width / columnCount,
      cellHeight: areaHeight / rowCount,
      areaTop
    };

    const placedSquares = [];
    const squares = getGridCells(rowCount, columnCount)
      .slice(0, SQUARE_COUNT)
      .map(cell => createSquare(cell, grid, images, placedSquares));
    const fragment = document.createDocumentFragment();
    squares.forEach(square => fragment.appendChild(square.element));
    container.replaceChildren(fragment);

    function applyParallax(progress) {
      squares.forEach(({ element, image, speed }) => {
        const offset = clamp(progress * PARALLAX_DISTANCE * speed, -MAX_PARALLAX, MAX_PARALLAX);
        element.style.transform = `translate3d(0, ${offset}px, 0)`;

        const opacity = 0.06 + 0.16 * (speed - SPEED_RANGE[0]) / (SPEED_RANGE[1] - SPEED_RANGE[0]);
        image.style.opacity = opacity.toFixed(2);
      });
    }

    applyParallax((getScrollProgress(hero) - 0.5) * 2);
    void container.offsetHeight;
    setTimeout(() => {
      squares.forEach(({ element }) => {
        element.style.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
      });
    }, 30);

    let currentProgress = 0;
    let animationFrame = 0;

    function animateParallax() {
      const target = (getScrollProgress(hero) - 0.5) * 2;
      currentProgress += (target - currentProgress) * 0.02;
      applyParallax(currentProgress);

      if (Math.abs(target - currentProgress) > 0.0005) {
        animationFrame = requestAnimationFrame(animateParallax);
      } else {
        animationFrame = 0;
      }
    }

    function scheduleParallax() {
      if (animationFrame) return;
      animationFrame = requestAnimationFrame(animateParallax);
    }

    window.addEventListener('scroll', scheduleParallax, { passive: true });
    window.addEventListener('resize', scheduleParallax);
    scheduleParallax();
  }

  window.initHero = initHero;
})();
