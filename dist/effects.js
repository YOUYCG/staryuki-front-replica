(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector('.interactive-dot-field');
  const context = canvas?.getContext('2d');
  if (!context) return;
  let width = 0, height = 0, frame = 0, request = 0;
  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density); canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    if (reducedMotion) draw();
  }
  function draw() {
    frame++;
    pointer.x += (pointer.tx - pointer.x) * .16;
    pointer.y += (pointer.ty - pointer.y) * .16;
    context.clearRect(0, 0, width, height);
    const spacing = width < 640 ? 30 : 44;
    const radius = width < 640 ? 92 : 150;
    for (let y = 22; y < height; y += spacing) {
      for (let x = 18; x < width; x += spacing) {
        const wave = Math.sin(x * .017 + y * .011 + frame * .018);
        const dx = x - pointer.x, dy = y - pointer.y;
        const strength = Math.max(0, 1 - Math.hypot(dx, dy) / radius);
        const angle = Math.atan2(dy, dx);
        const alpha = .18 + .58 * strength + (wave + 1) * .035;
        context.fillStyle = strength > .08 ? `rgba(183,255,42,${Math.min(.9, alpha + .12)})` : `rgba(255,255,255,${alpha})`;
        context.beginPath();
        context.arc(x + Math.cos(angle) * 11 * strength, y + Math.sin(angle) * 11 * strength, .9 + 2.7 * strength + .35 * Math.max(0, wave), 0, 2 * Math.PI);
        context.fill();
      }
    }
    if (!reducedMotion && !document.hidden) request = requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', event => { pointer.tx = event.clientX; pointer.ty = event.clientY; }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.tx = pointer.ty = -9999; });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(request);
    if (!document.hidden && !reducedMotion) draw();
  });
  resize();
  if (!reducedMotion) draw();

  const glitch = document.querySelector('.signal-lost-glitch');
  const screen = glitch?.querySelector('canvas');
  const screenContext = screen?.getContext('2d');
  if (!glitch || !screenContext || reducedMotion) return;
  const noise = new Image();
  noise.src = '/signal_lost/ERROR.png';
  let visible = false;
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  intersection.observe(glitch);
  setInterval(() => {
    if (!visible || document.hidden || !noise.complete || !noise.naturalWidth) return;
    const box = glitch.getBoundingClientRect();
    screen.width = Math.round(box.width); screen.height = Math.round(box.height);
    screenContext.clearRect(0, 0, screen.width, screen.height);
    for (let index = 0; index < 5; index++) {
      const y = Math.random() * screen.height, slice = 3 + Math.random() * 18;
      screenContext.drawImage(noise, 0, Math.random() * noise.height * .8, noise.width, Math.min(slice, noise.height * .2), (Math.random() - .5) * 35, y, screen.width, slice);
    }
    glitch.style.opacity = '.6';
    setTimeout(() => { glitch.style.opacity = '0'; }, 100);
  }, 3400);
})();
