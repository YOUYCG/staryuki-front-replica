/* Shared low-latency terminal SFX. All audio stays on this site's origin. */
(() => {
  'use strict';
  const soundIds = ['boot_typewriter', 'boot_scramble_out', 'boot_glitch_in', 'boot_shuffle_settle', 'global_transition', 'key_cursor_move', 'key_backspace', 'key_capture', 'key_flight', 'key_land', 'verify_submit', 'verify_scan', 'access_denied', 'deny_wave', 'deny_recover', 'access_granted', 'granted_slot_fill', 'granted_shuffle', 'debris_hover'];
  const sources = new Map();
  const buffers = new Map();
  const active = new Set();
  const loops = new Map();
  const timestamps = new Map();
  let context;
  let master;
  let enabled = true;
  let unlockRequested = false;
  let readiness = Promise.resolve(false);
  let played = 0;
  let lastId = '';
  try { enabled = localStorage.getItem('starcore-sound-muted') !== 'true'; } catch {}

  // Download only public static WAVs. Creating/resuming AudioContext waits for
  // a real pointer or keyboard gesture, as required by browser autoplay rules.
  soundIds.forEach(name => {
    const id = `sfx_${name}`;
    sources.set(id, fetch(`/audio/${id}.wav`).then(response => {
      if (!response.ok) throw new Error('Audio asset unavailable');
      return response.arrayBuffer();
    }).catch(() => null));
  });

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'sound-toggle';
  toggle.id = 'sound-toggle';
  toggle.dataset.soundControl = 'true';
  toggle.title = '音效开关 · 首次点击或按键后启用声音';
  document.body.append(toggle);

  function updateToggle() {
    toggle.textContent = enabled ? '[ SFX ON ]' : '[ SFX OFF ]';
    toggle.setAttribute('aria-label', enabled ? '关闭音效' : '开启音效');
    toggle.setAttribute('aria-pressed', String(enabled));
    document.documentElement.dataset.sound = enabled ? (context?.state === 'running' ? 'ready' : 'armed') : 'muted';
  }

  function unlock() {
    unlockRequested = true;
    if (!enabled) return Promise.resolve(false);
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { toggle.hidden = true; return Promise.resolve(false); }
    try {
      if (!context) {
        context = new AudioContext({ latencyHint: 'interactive' });
        master = context.createGain();
        master.gain.value = .32;
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 6;
        limiter.ratio.value = 8;
        master.connect(limiter);
        limiter.connect(context.destination);
        context.addEventListener('statechange', updateToggle);
      }
      // This call is made synchronously inside the user's gesture.
      const resumed = context.state === 'running' ? Promise.resolve() : context.resume();
      readiness = resumed.then(() => { updateToggle(); return context.state === 'running'; }).catch(() => false);
      return readiness;
    } catch { return Promise.resolve(false); }
  }

  function decoded(id) {
    if (!buffers.has(id)) {
      buffers.set(id, sources.get(id)?.then(bytes => bytes && context.decodeAudioData(bytes.slice(0))).catch(() => null) || Promise.resolve(null));
    }
    return buffers.get(id);
  }

  function play(id, { delay = 0, level = 1, rate = 1 } = {}) {
    if (!enabled || !unlockRequested || document.hidden || !sources.has(id)) return;
    const now = performance.now();
    if (!delay && now - (timestamps.get(id) ?? -1000) < 22) return;
    timestamps.set(id, now);
    if (!context) return;
    Promise.all([decoded(id), readiness]).then(([buffer, ready]) => {
      if (!ready || !buffer || !enabled || document.hidden || context.state !== 'running') return;
      // Do not replay old keystrokes after a slow first download.
      if (performance.now() - now > 600) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = Math.max(.5, Math.min(2, rate));
      gain.gain.value = Math.max(0, Math.min(1, level));
      source.connect(gain); gain.connect(master);
      active.add(source);
      source.onended = () => { active.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(context.currentTime + Math.max(0, delay));
      played++;
      lastId = id;
      toggle.dataset.lastSound = id;
      toggle.dataset.playCount = String(played);
    });
  }

  function stopLoop(name) { clearInterval(loops.get(name)); loops.delete(name); }
  function startLoop(name, id, milliseconds) {
    stopLoop(name);
    play(id);
    loops.set(name, setInterval(() => play(id), milliseconds));
  }
  function stopAll() {
    for (const name of loops.keys()) stopLoop(name);
    for (const source of active) { try { source.stop(); } catch {} }
  }
  function setEnabled(next) {
    enabled = Boolean(next);
    try { localStorage.setItem('starcore-sound-muted', String(!enabled)); } catch {}
    if (!enabled) { stopAll(); if (master) master.gain.value = 0; }
    else {
      if (master) master.gain.value = .32;
      unlock().then(ready => {
        if (!ready) return;
        play('sfx_key_capture');
        if (document.querySelector('#terminal[data-phase="verifying"]')) startLoop('verification', 'sfx_verify_scan', 300);
      });
    }
    updateToggle();
  }
  toggle.addEventListener('click', () => setEnabled(!enabled));
  document.addEventListener('pointerdown', event => { if (!event.target.closest('[data-sound-control]')) unlock(); }, { capture: true, passive: true });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' && !event.ctrlKey && !event.metaKey && !event.target.closest('[data-sound-control]')) unlock();
  }, { capture: true });
  document.addEventListener('pointerover', event => {
    const control = event.target.closest('a, button');
    if (!control || control.contains(event.relatedTarget) || control.closest('[data-sound-control]')) return;
    play('sfx_debris_hover', { level: .55 });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopAll(); if (context?.state === 'running') context.suspend().catch(() => {}); }
    else if (context && enabled) {
      context.resume().then(() => {
        if (document.querySelector('#terminal[data-phase="verifying"]')) startLoop('verification', 'sfx_verify_scan', 300);
      }).catch(() => {});
    }
  });
  window.addEventListener('pagehide', stopAll);
  window.StarSound = Object.freeze({
    play, startLoop, stopLoop, stopAll,
    getStatus: () => ({ enabled, state: context?.state || 'locked', played, lastId, active: active.size, loops: loops.size }),
  });
  updateToggle();
})();
