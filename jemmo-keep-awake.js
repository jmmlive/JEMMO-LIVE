/* JEMMO LIVE V1 · PANTALLA ACTIVA EN LIVE Y SALAS PRUEBA 36
   Mantiene la pantalla despierta mientras la transmisión o la Sala están visibles.
   El navegador puede liberar el bloqueo al ocultarse la app; se solicita de nuevo al volver. */
(() => {
  'use strict';
  if (window.JemmoKeepAwake?.version) return;

  const path = location.pathname.toLowerCase();
  const targetId = path.endsWith('live.html') ? 'broadcastScreen' : path.endsWith('salas.html') ? 'roomView' : '';
  if (!targetId) return;

  let sentinel = null;
  let requesting = false;
  let observer = null;
  let timer = 0;
  let lastState = '';

  function targetVisible() {
    const target = document.getElementById(targetId);
    if (!target || document.hidden) return false;
    if (target.hidden || target.classList.contains('jr-hidden')) return false;
    const style = getComputedStyle(target);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function emit(reason = '') {
    const detail = {
      supported: Boolean(navigator.wakeLock?.request),
      active: Boolean(sentinel && !sentinel.released),
      wanted: targetVisible(),
      reason
    };
    const signature = JSON.stringify(detail);
    if (signature === lastState) return;
    lastState = signature;
    window.dispatchEvent(new CustomEvent('jemmo-wake-lock', { detail }));
  }

  async function requestLock(reason = 'active_view') {
    if (requesting || !targetVisible()) return;
    if (!navigator.wakeLock?.request) { emit('unsupported'); return; }
    if (sentinel && !sentinel.released) { emit(reason); return; }
    requesting = true;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
        emit('released');
        if (!document.hidden && targetVisible()) setTimeout(() => void requestLock('reacquire_after_release'), 350);
      }, { once: true });
      emit(reason);
    } catch (error) {
      sentinel = null;
      emit(error?.name || 'request_failed');
      console.warn('JEMMO pantalla activa:', error?.name || error?.message || error);
    } finally {
      requesting = false;
    }
  }

  async function releaseLock(reason = 'inactive_view') {
    const current = sentinel;
    sentinel = null;
    if (current && !current.released) {
      try { await current.release(); } catch {}
    }
    emit(reason);
  }

  function sync(reason = 'sync') {
    if (targetVisible()) void requestLock(reason);
    else void releaseLock(reason);
  }

  function boot() {
    const target = document.getElementById(targetId);
    if (!target) return;
    observer = new MutationObserver(() => sync('view_change'));
    observer.observe(target, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
    document.addEventListener('visibilitychange', () => sync(document.hidden ? 'background' : 'foreground'));
    window.addEventListener('focus', () => sync('focus'));
    window.addEventListener('pageshow', () => sync('pageshow'));
    window.addEventListener('jemmo-house-seat-change', () => sync('seat_change'));
    ['pointerdown', 'touchstart', 'keydown'].forEach(type => document.addEventListener(type, () => sync('user_gesture'), { passive: true, capture: true }));
    window.addEventListener('pagehide', () => {
      clearInterval(timer);
      observer?.disconnect();
      void releaseLock('pagehide');
    });
    clearInterval(timer);
    timer = setInterval(() => sync('heartbeat'), 5000);
    sync('boot');
  }

  window.JemmoKeepAwake = Object.freeze({
    version: '36.0-test',
    sync,
    request: requestLock,
    release: releaseLock,
    getState: () => ({ supported: Boolean(navigator.wakeLock?.request), active: Boolean(sentinel && !sentinel.released), wanted: targetVisible() })
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
