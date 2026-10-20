(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menu = document.querySelector('#marathon-mobile-menu');
  const menuButton = document.querySelector('.marathon-menu-button');
  function setMenu(open) {
    menuButton?.setAttribute('aria-expanded', String(open));
    menuButton?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu?.setAttribute('aria-hidden', String(!open));
    menu?.classList.toggle('is-open', open);
    if (menu) menu.inert = !open;
  }
  setMenu(false);
  menuButton?.addEventListener('click', () => {
    window.StarSound?.play('sfx_key_capture', { level: .65 });
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      window.StarSound?.play('sfx_key_backspace', { level: .6 });
      setMenu(false);
      menuButton.focus();
    }
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  matchMedia('(min-width: 1024px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

  const loader = document.querySelector('.peonia-hero-loader');
  const startedAt = performance.now();
  function loadFrame(time) {
    const progress = Math.min(100, Math.round((time - startedAt) / 13));
    const percentage = loader?.querySelector('.peonia-loader-pct');
    const track = loader?.querySelector('.peonia-loader-track i');
    if (percentage) percentage.textContent = String(progress).padStart(3, '0') + '%';
    if (track) track.style.transform = `scaleX(${progress / 100})`;
    if (progress < 100) requestAnimationFrame(loadFrame);
    else setTimeout(() => loader?.remove(), 400);
  }
  if (reducedMotion) loader?.remove(); else requestAnimationFrame(loadFrame);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-/<>';
  function scramble(element) {
    if (reducedMotion || element.dataset.scrambling) return;
    const text = element.dataset.original || element.textContent;
    element.dataset.original = text;
    element.dataset.scrambling = 'true';
    const started = performance.now();
    function frame(time) {
      const progress = Math.min(1, (time - started) / 600);
      element.textContent = Array.from(text, (character, index) => character === ' ' || index < progress * text.length ? character : alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      if (progress < 1) requestAnimationFrame(frame);
      else { element.textContent = text; delete element.dataset.scrambling; }
    }
    requestAnimationFrame(frame);
  }
  document.querySelectorAll('.marathon-nav-link span, .starcore-section-title span').forEach(element => {
    element.addEventListener('mouseenter', () => scramble(element));
  });
  const panels = document.querySelectorAll('.starcore-gsap-panel, .starcore-section-title');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      const title = entry.target.matches('.starcore-section-title') && entry.target.querySelector('span');
      if (title) scramble(title);
      reveal.unobserve(entry.target);
    }), { threshold: .08 });
    panels.forEach(panel => { panel.classList.add('replica-reveal'); reveal.observe(panel); });
  }

  // The lower-page signal grid is decorative and remains explicitly disconnected.
  const cells = [...document.querySelectorAll('.signal-lost-panel__grid > span')];
  if (!reducedMotion && cells.length) setInterval(() => {
    if (document.hidden) return;
    const cell = cells[Math.floor(Math.random() * cells.length)];
    cell.dataset.dead = cell.dataset.dead === 'true' ? 'false' : 'true';
  }, 850);
})();

// The original mobile topbar expands its ACCESS control as the hero scrolls away.
(() => {
  const cta = document.querySelector('.marathon-mobile-cta');
  const spacer = document.querySelector('.marathon-mobile-cta-spacer');
  if (!cta) return;
  let scheduled = false;
  function update() {
    scheduled = false;
    const progress = Math.min(scrollY / Math.max(1, innerHeight * .5), 1);
    cta.style.left = (-60 + 60 * progress) + 'px';
    cta.style.width = (60 + progress * (innerWidth - 180)) + 'px';
    cta.querySelector('span').style.opacity = String(Math.max(0, (progress - .5) / .5));
    if (spacer) { spacer.style.opacity = String(Math.max(0, 1 - 2 * progress)); spacer.style.pointerEvents = progress > .5 ? 'none' : 'auto'; }
    const shade = Math.round(255 * Math.min(2 * progress, 1));
    document.querySelectorAll('.marathon-topbar-logo .md\\:hidden path, .marathon-topbar-logo .md\\:hidden polygon').forEach(shape => shape.setAttribute('fill', `rgb(${shade}, ${shade}, ${shade})`));
  }
  function queue() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  update();
})();
