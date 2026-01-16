(function () {
  'use strict';

  const canvas = document.getElementById('crt-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let raf = null;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth * dpr;
    height = canvas.clientHeight * dpr;
    canvas.width = width;
    canvas.height = height;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < height; y += 2) ctx.fillRect(0, y, width, 1);

    const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 1.2);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    raf = requestAnimationFrame(draw);
  }

  function initCrt() { resize(); window.addEventListener('resize', resize); draw(); }

  window.initCrt = initCrt;
})();