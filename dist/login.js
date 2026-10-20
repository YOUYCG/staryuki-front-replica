/* Standalone visual demo. No network requests or credential persistence. */
(() => {
  'use strict';

  const terminal = document.getElementById('terminal');
  const boot = document.getElementById('boot-screen');
  const access = document.getElementById('access-screen');
  const form = document.getElementById('access-form');
  const input = document.getElementById('access-code');
  const feedback = document.getElementById('feedback');
  const title = document.getElementById('status-title');
  const subtitle = document.getElementById('status-subtitle');
  const submit = document.getElementById('submit-key');
  const glyphs = [...document.querySelectorAll('.glyph')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(pointer: coarse)');
  const pool = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const demoCode = 'STAR123';
  const sound = window.StarSound;
  let phase = 'boot';
  let soundValue = '';
  let verificationTimer;
  let feedbackTimer;
  let decorationTimer;
  let inputPosition = 0;

  const tickerRows = [...document.querySelectorAll('.ticker-row')].map((row, rowIndex) => {
    return Array.from({ length: 10 }, (_, index) => {
      const digit = document.createElement('span');
      digit.className = 'ticker-digit';
      digit.textContent = pool[(index * 7 + rowIndex * 11 + 3) % pool.length];
      row.append(digit);
      return digit;
    });
  });

  function setPhase(next) {
    if (phase === 'verifying' && next !== 'verifying') sound?.stopLoop('verification');
    phase = next;
    terminal.dataset.phase = next;
    submit.disabled = next === 'verifying';
    form.setAttribute('aria-busy', String(next === 'verifying'));
  }

  function renderSlots() {
    const value = input.value;
    glyphs.forEach((glyph, index) => {
      glyph.className = 'glyph';
      if (index < value.length) {
        glyph.textContent = value[index];
        glyph.classList.add('filled');
      } else {
        glyph.textContent = 'c';
      }
      if (phase === 'active' && index === Math.min(inputPosition, 6)) glyph.classList.add('cursor');
    });
    soundValue = value;
  }

  function restorePrompt() {
    const wasDenied = phase === 'denied';
    clearTimeout(verificationTimer);
    clearTimeout(feedbackTimer);
    setPhase('active');
    title.textContent = 'TERMINAL LOCKED';
    subtitle.textContent = 'PRESENT DATA ACCESS CARD ID';
    feedback.textContent = 'personal use only';
    input.removeAttribute('aria-invalid');
    submit.textContent = '[ ENTER ]';
    if (wasDenied) sound?.play('sfx_deny_recover');
  }

  function openTerminal(useDemo = false) {
    if (phase !== 'boot') return;
    sound?.play('sfx_boot_typewriter', { level: .35 });
    sound?.play('sfx_boot_scramble_out', { level: .35 });
    sound?.play('sfx_global_transition');
    sound?.play('sfx_boot_glitch_in', { delay: .08, level: .5 });
    sound?.play('sfx_boot_shuffle_settle', { delay: .3, level: .7 });
    boot.hidden = true;
    access.hidden = false;
    document.getElementById('connection-label').textContent = 'Connection Established / CAS.term 𝟶.4.5-23';
    restorePrompt();
    inputPosition = 0;
    renderSlots();
    if (!pointer.matches) input.focus({ preventScroll: true });
    startDecorations();
    drawDebris(0);
    if (useDemo) useDemoCard();
  }

  function deny(message, incomplete = false) {
    setPhase('denied');
    sound?.play('sfx_access_denied');
    sound?.play('sfx_deny_wave', { delay: .06, level: .6 });
    title.textContent = incomplete ? 'INCOMPLETE CARD ID' : 'ACCESS DENIED';
    subtitle.textContent = incomplete ? 'PRESENT ALL 7 CHARACTERS' : 'LOCAL DEMO / CARD NOT RECOGNIZED';
    feedback.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    submit.textContent = '[ RETRY ]';
    renderSlots();
    feedbackTimer = setTimeout(() => {
      if (phase !== 'denied') return;
      restorePrompt();
      inputPosition = input.value.length;
      renderSlots();
    }, 3200);
  }

  function verify() {
    if (phase === 'boot' || phase === 'verifying') return;
    clearTimeout(feedbackTimer);
    if (phase === 'granted') {
      sound?.play('sfx_deny_recover');
      restorePrompt();
      input.value = '';
      inputPosition = 0;
      renderSlots();
      input.focus({ preventScroll: true });
      return;
    }
    const value = input.value;
    if (!/^[A-Z0-9]{7}$/.test(value)) {
      deny('7 characters required / A–Z, 0–9', true);
      input.focus({ preventScroll: true });
      return;
    }
    setPhase('verifying');
    sound?.play('sfx_verify_submit');
    sound?.startLoop('verification', 'sfx_verify_scan', 300);
    title.textContent = 'READING ACCESS CARD';
    subtitle.textContent = 'LOCAL VALIDATION IN PROGRESS';
    feedback.textContent = 'checking card signature...';
    input.removeAttribute('aria-invalid');
    renderSlots();
    verificationTimer = setTimeout(() => {
      if (input.value !== value || phase !== 'verifying') return;
      if (value !== demoCode) {
        deny('demo card required: STAR123');
        return;
      }
      setPhase('granted');
      sound?.play('sfx_access_granted');
      sound?.play('sfx_granted_shuffle', { level: .6 });
      for (let slot = 0; slot < 7; slot++) sound?.play('sfx_granted_slot_fill', { delay: slot * .06, rate: 1 + slot * .04 });
      title.textContent = 'DEMO ACCESS GRANTED';
      subtitle.textContent = 'LOCAL TERMINAL / PREVIEW READY';
      feedback.textContent = '演示验证完成 · 未连接身份服务';
      submit.textContent = '[ RESET ]';
      renderSlots();
    }, motion.matches ? 250 : 1050);
  }

  function useDemoCard() {
    sound?.play('sfx_key_capture', { level: .6 });
    sound?.play('sfx_key_flight', { level: .55 });
    sound?.play('sfx_key_land', { delay: .1, level: .55 });
    restorePrompt();
    input.value = demoCode;
    inputPosition = demoCode.length;
    renderSlots();
    verify();
  }

  document.getElementById('transmit').addEventListener('click', () => openTerminal());
  document.getElementById('skip').addEventListener('click', () => openTerminal(true));
  document.getElementById('use-demo').addEventListener('click', useDemoCard);
  form.addEventListener('submit', event => {
    event.preventDefault();
    verify();
  });
  input.addEventListener('input', () => {
    const before = input.value;
    const selection = input.selectionStart ?? before.length;
    const value = before.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);
    if (value.length < soundValue.length) sound?.play('sfx_key_backspace');
    else if (value !== soundValue) sound?.play('sfx_key_cursor_move', { rate: .96 + Math.random() * .08 });
    const newSelection = before.slice(0, selection).replace(/[^a-zA-Z0-9]/g, '').length;
    restorePrompt();
    input.value = value;
    input.setSelectionRange(newSelection, newSelection);
    inputPosition = Math.min(newSelection, value.length);
    renderSlots();
    if (value.length === 7) verify();
  });
  input.addEventListener('paste', event => {
    const text = event.clipboardData?.getData('text');
    if (text === undefined) return;
    event.preventDefault();
    const value = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.value = (input.value.slice(0, start) + value + input.value.slice(end)).slice(0, 7);
    input.setSelectionRange(Math.min(start + value.length, 7), Math.min(start + value.length, 7));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  ['keyup', 'click', 'focus', 'select'].forEach(type => input.addEventListener(type, () => {
    inputPosition = input.selectionStart ?? input.value.length;
    renderSlots();
  }));
  document.addEventListener('keydown', event => {
    if (phase === 'boot' && event.key === 'Enter' && event.target === document.body) {
      event.preventDefault();
      openTerminal();
    }
    if (event.key === 'Escape' && phase !== 'boot') {
      sound?.play('sfx_key_backspace');
      restorePrompt();
      input.value = '';
      inputPosition = 0;
      renderSlots();
      input.focus({ preventScroll: true });
    }
  });

  function animateDecorations() {
    if (document.hidden || phase === 'boot') return;
    tickerRows.forEach((row, rowIndex) => row.forEach((digit, index) => {
      if (Math.random() > .45) return;
      const current = pool.indexOf(digit.textContent);
      digit.textContent = pool[(current + [1, 35, 7, 33][rowIndex]) % pool.length];
      digit.classList.toggle('inverted', (index + rowIndex) % 3 === 0 && Math.random() < .15);
    }));
    if (phase === 'active') glyphs.forEach((glyph, index) => {
      if (index >= input.value.length) glyph.textContent = Math.random() < .75 ? 'c' : '012678bef'[Math.floor(Math.random() * 9)];
    });
  }

  function startDecorations() {
    clearInterval(decorationTimer);
    if (!motion.matches && !document.hidden && phase !== 'boot') decorationTimer = setInterval(animateDecorations, 167);
  }

  // Sparse projected glyphs echo the original terminal's floating character field.
  const canvas = document.getElementById('debris');
  const context = canvas.getContext('2d');
  const particles = Array.from({ length: 110 }, (_, index) => ({
    angle: index * 2.39996,
    distance: .55 + ((index * 17) % 49) / 70,
    size: 10 + (index % 7) * 3,
    character: pool[(index * 11) % pool.length],
    glyph: index % 3 === 0,
    speed: .000015 * ((index % 3) + 1),
    color: index % 7 < 4 ? '#224060' : '#668b10'
  }));
  let width = 0;
  let height = 0;
  let frame;
  let lastFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context?.setTransform(scale, 0, 0, scale, 0, 0);
    if (motion.matches && phase !== 'boot') drawDebris(0);
  }

  function drawDebris(time) {
    if (!context || document.hidden || phase === 'boot') return;
    if (time - lastFrame > 32 || !time) {
      lastFrame = time;
      context.clearRect(0, 0, width, height);
      particles.forEach(particle => {
        const angle = particle.angle + (motion.matches ? 0 : time * particle.speed);
        const x = width / 2 + Math.cos(angle) * width * .55 * particle.distance + pointerX * 9;
        const y = height / 2 + Math.sin(angle) * height * .67 * particle.distance + pointerY * 9;
        if (Math.abs(x - width / 2) < 250 && Math.abs(y - height / 2) < 215) return;
        context.fillStyle = phase === 'denied' ? '#772a24' : particle.color;
        context.globalAlpha = .35 + (particle.size - 10) / 40;
        context.font = `${particle.size}px ${particle.glyph ? 'Encrypted' : 'MonoSpec'}, monospace`;
        context.fillText(particle.glyph ? '678abcdef'[Math.floor(particle.size) % 9] : particle.character, x, y);
      });
      context.globalAlpha = 1;
    }
    if (!motion.matches) frame = requestAnimationFrame(drawDebris);
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('pointermove', event => {
    pointerX = event.clientX / Math.max(width, 1) - .5;
    pointerY = event.clientY / Math.max(height, 1) - .5;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    startDecorations();
    if (!document.hidden && phase !== 'boot') drawDebris(0);
  });
  motion.addEventListener('change', () => {
    cancelAnimationFrame(frame);
    startDecorations();
    if (phase !== 'boot') drawDebris(0);
  });
  window.addEventListener('pagehide', () => {
    clearTimeout(verificationTimer);
    clearTimeout(feedbackTimer);
    clearInterval(decorationTimer);
    cancelAnimationFrame(frame);
    input.value = '';
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted || phase === 'boot') return;
    restorePrompt();
    inputPosition = 0;
    renderSlots();
    startDecorations();
    drawDebris(0);
  });
  resizeCanvas();
  renderSlots();
})();
