/* =========================================================
   JEMMO LIVE · V0.6.5 · CORRECCIÓN FINAL
   Vídeo estable + limpieza de capas + sonido acuático GRU
   ========================================================= */
(() => {
  'use strict';

  if (window.__jemmoV065FixLoaded) return;
  window.__jemmoV065FixLoaded = true;

  const byId = id => document.getElementById(id);

  function prepareVideo(video) {
    if (!video) return;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.setAttribute('disablepictureinpicture', '');
    video.addEventListener('loadedmetadata', () => {
      const parentHidden =
        video.closest('.jl-hidden,[hidden]') ||
        video.closest('#broadcastScreen.jl-hidden');

      if (!parentHidden) {
        video.play().catch(() => {});
      }
    });
  }

  ['mainVideo', 'pipVideo', 'broadcastVideo', 'broadcastPip']
    .map(byId)
    .filter(Boolean)
    .forEach(prepareVideo);

  function broadcastIsVisible() {
    const screen = byId('broadcastScreen');
    if (!screen) return false;
    return !screen.classList.contains('jl-hidden') &&
      !screen.hasAttribute('hidden') &&
      getComputedStyle(screen).display !== 'none';
  }

  function synchroniseVideoLayers() {
    const live = broadcastIsVisible();
    document.body.classList.toggle('jl-live-active', live);

    if (!live) {
      ['broadcastVideo', 'broadcastPip'].forEach(id => {
        const video = byId(id);
        if (!video) return;
        try { video.pause(); } catch (_) {}
        try { video.srcObject = null; } catch (_) {}
        video.classList.add('jl-hidden');
      });
    } else {
      const main = byId('broadcastVideo');
      if (main) main.classList.remove('jl-hidden');
    }
  }

  const broadcastScreen = byId('broadcastScreen');
  if (broadcastScreen) {
    new MutationObserver(synchroniseVideoLayers).observe(broadcastScreen, {
      attributes: true,
      attributeFilter: ['class', 'hidden', 'style']
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) synchroniseVideoLayers();
  });

  window.addEventListener('pageshow', synchroniseVideoLayers);
  setTimeout(synchroniseVideoLayers, 0);
  setTimeout(synchroniseVideoLayers, 350);

  /* Sonido corto de agua/pez: "gru, gru, gru" */
  let audioContext = null;
  let lastGru = 0;

  function context() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContext) audioContext = new AudioCtx();
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function makeNoiseBuffer(ctx, seconds = 0.16) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.82 + white * 0.18;
      data[i] = last;
    }
    return buffer;
  }

  function gruPulse(ctx, start, variation = 0) {
    const end = start + 0.145;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, start);
    master.gain.exponentialRampToValueAtTime(0.23, start + 0.014);
    master.gain.exponentialRampToValueAtTime(0.0001, end);
    master.connect(ctx.destination);

    const growl = ctx.createOscillator();
    growl.type = 'sawtooth';
    growl.frequency.setValueAtTime(104 + variation, start);
    growl.frequency.exponentialRampToValueAtTime(57 + variation * 0.25, end);

    const lowPass = ctx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.setValueAtTime(290, start);
    lowPass.frequency.exponentialRampToValueAtTime(145, end);
    lowPass.Q.value = 3.2;

    const growlGain = ctx.createGain();
    growlGain.gain.value = 0.52;

    growl.connect(lowPass);
    lowPass.connect(growlGain);
    growlGain.connect(master);
    growl.start(start);
    growl.stop(end);

    const water = ctx.createBufferSource();
    water.buffer = makeNoiseBuffer(ctx, 0.16);

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(430 + variation * 2, start);
    band.frequency.exponentialRampToValueAtTime(205, end);
    band.Q.value = 5.5;

    const waterGain = ctx.createGain();
    waterGain.gain.setValueAtTime(0.08, start);
    waterGain.gain.exponentialRampToValueAtTime(0.0001, end);

    water.connect(band);
    band.connect(waterGain);
    waterGain.connect(master);
    water.start(start);
    water.stop(end);
  }

  function playGruGruGru() {
    const nowMs = Date.now();
    if (nowMs - lastGru < 500) return;
    lastGru = nowMs;

    const ctx = context();
    if (!ctx) return;

    const t = ctx.currentTime + 0.018;
    gruPulse(ctx, t, 0);
    gruPulse(ctx, t + 0.17, -5);
    gruPulse(ctx, t + 0.34, 3);
  }

  function isFishControl(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest([
      '.bottom-nav a',
      '.nav-fish',
      '.fish',
      '.fish-button',
      '.pez',
      '.chicharro',
      '[class*="fish"]',
      '[class*="pez"]',
      '[class*="chicharro"]',
      'img[alt*="pez" i]',
      'img[alt*="fish" i]',
      'img[alt*="chicharro" i]'
    ].join(',')));
  }

  document.addEventListener('pointerdown', event => {
    if (isFishControl(event.target)) playGruGruGru();
  }, { passive: true });

  window.jemmoPlayGru = playGruGruGru;
})();
