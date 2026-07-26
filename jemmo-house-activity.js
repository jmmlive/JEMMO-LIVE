/* JEMMO LIVE V1 · ACTIVIDAD DE CASAS PRUEBA 14
   Registra tiempo real de LIVE y de la Sala oficial de la Casa.
   No concede premios: solo aporta datos de control para administración. */
(() => {
  'use strict';

  const firebaseConfig = {
    apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
    authDomain: 'jemmo-live.firebaseapp.com',
    projectId: 'jemmo-live',
    storageBucket: 'jemmo-live.firebasestorage.app',
    messagingSenderId: '355540892255',
    appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
  };

  const path = location.pathname.toLowerCase();
  const params = new URLSearchParams(location.search);
  const activityType = path.endsWith('/live.html') || path.endsWith('live.html')
    ? 'live'
    : (path.endsWith('/salas.html') || path.endsWith('salas.html')) && params.get('houseRoom') === '1'
      ? 'house_room'
      : '';
  if (!activityType) return;

  const requestedHouseId = String(params.get('house') || '').trim().slice(0, 80);
  const targetId = activityType === 'live' ? 'broadcastScreen' : 'roomView';
  let services = null;
  let user = null;
  let profile = {};
  let houseId = '';
  let running = false;
  let startedAt = 0;
  let pendingSeconds = 0;
  let flushTimer = 0;
  let observer = null;
  let destroyed = false;

  const clean = (value, max = 120) => String(value || '').trim().slice(0, max);
  const cycleKey = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  async function getServices() {
    if (services) return services;
    const [appModule, authModule, firestore] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
    ]);
    const app = appModule.getApps()[0] || appModule.initializeApp(firebaseConfig);
    services = { ...firestore, auth: authModule.getAuth(app), db: firestore.getFirestore(app), onAuthStateChanged: authModule.onAuthStateChanged };
    return services;
  }

  function waitForUser(s, timeout = 12000) {
    if (s.auth.currentUser) return Promise.resolve(s.auth.currentUser);
    return new Promise((resolve, reject) => {
      let stop = () => {};
      const timer = setTimeout(() => { stop(); reject(new Error('Sesión no disponible.')); }, timeout);
      stop = s.onAuthStateChanged(s.auth, current => {
        if (!current) return;
        clearTimeout(timer);
        stop();
        resolve(current);
      }, error => { clearTimeout(timer); stop(); reject(error); });
    });
  }

  function targetRunning() {
    const target = document.getElementById(targetId);
    if (!target) return false;
    if (activityType === 'live') return !target.hidden && getComputedStyle(target).display !== 'none';
    return !target.classList.contains('jr-hidden') && getComputedStyle(target).display !== 'none';
  }

  async function resolveMembership() {
    const s = await getServices();
    user = await waitForUser(s);
    const userSnap = await s.getDoc(s.doc(s.db, 'users', user.uid));
    profile = userSnap.exists() ? (userSnap.data() || {}) : {};
    const membershipHouse = clean(profile.houseId, 80);
    if (activityType === 'house_room') {
      if (!requestedHouseId || membershipHouse !== requestedHouseId) return false;
      houseId = requestedHouseId;
    } else {
      houseId = membershipHouse;
    }
    return Boolean(houseId && profile.houseStatus !== 'left' && profile.houseStatus !== 'removed');
  }

  async function markPresence(status) {
    if (!services || !user || !houseId) return;
    const s = services;
    try {
      await s.setDoc(s.doc(s.db, 'casas', houseId, 'actividad', user.uid), {
        uid: user.uid,
        displayName: clean(profile.displayName || user.displayName || user.email?.split('@')[0] || 'Usuario JEMMO', 48),
        publicId: clean(profile.publicId, 48),
        type: activityType,
        status,
        page: activityType === 'live' ? 'live.html' : 'salas.html',
        updatedAtClient: Date.now(),
        updatedAt: s.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn('JEMMO actividad Casa: presencia', error?.code || error);
    }
  }

  async function flush(force = false) {
    if (!running && !force) return;
    if (running && startedAt) {
      const now = Date.now();
      pendingSeconds += Math.max(0, Math.floor((now - startedAt) / 1000));
      startedAt = now;
    }
    if (pendingSeconds < (force ? 1 : 20) || !services || !user || !houseId || !navigator.onLine) return;
    const seconds = pendingSeconds;
    pendingSeconds = 0;
    const s = services;
    const ref = s.doc(s.db, 'casas', houseId, 'tareas', user.uid);
    try {
      await s.runTransaction(s.db, async transaction => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.exists() ? (snapshot.data() || {}) : {};
        const key = cycleKey();
        const reset = clean(current.cycleKey, 20) !== key;
        const liveSeconds = reset ? 0 : Number(current.liveSeconds || 0);
        const houseRoomSeconds = reset ? 0 : Number(current.houseRoomSeconds || 0);
        transaction.set(ref, {
          uid: user.uid,
          displayName: clean(profile.displayName || user.displayName || user.email?.split('@')[0] || 'Usuario JEMMO', 48),
          publicId: clean(profile.publicId, 48),
          accountRole: clean(profile.role || profile.rol || profile.accountRole || 'usuario', 30),
          cycleKey: key,
          liveSeconds: liveSeconds + (activityType === 'live' ? seconds : 0),
          houseRoomSeconds: houseRoomSeconds + (activityType === 'house_room' ? seconds : 0),
          lastActivityType: activityType,
          lastActivityAtClient: Date.now(),
          lastActivityAt: s.serverTimestamp(),
          updatedAt: s.serverTimestamp(),
          reviewStatus: reset ? 'pending' : clean(current.reviewStatus || 'pending', 20)
        }, { merge: true });
      });
    } catch (error) {
      pendingSeconds += seconds;
      console.warn('JEMMO actividad Casa: no se pudo guardar', error?.code || error);
    }
  }

  function start() {
    if (running || destroyed || !houseId) return;
    running = true;
    startedAt = Date.now();
    clearInterval(flushTimer);
    flushTimer = setInterval(() => void flush(false), 30000);
    void markPresence('active');
    window.dispatchEvent(new CustomEvent('jemmo-house-activity', { detail: { type: activityType, status: 'active', houseId } }));
  }

  async function stop(reason = 'stopped') {
    if (!running) return;
    await flush(true);
    running = false;
    startedAt = 0;
    clearInterval(flushTimer);
    flushTimer = 0;
    await markPresence(reason);
    window.dispatchEvent(new CustomEvent('jemmo-house-activity', { detail: { type: activityType, status: reason, houseId } }));
  }

  function sync() {
    if (targetRunning()) start();
    else void stop('inactive');
  }

  async function boot() {
    try {
      if (!await resolveMembership()) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      observer = new MutationObserver(sync);
      observer.observe(target, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) void stop('background');
        else sync();
      });
      window.addEventListener('offline', () => void stop('offline'));
      window.addEventListener('online', sync);
      window.addEventListener('pagehide', () => { destroyed = true; void stop('closed'); });
      sync();
    } catch (error) {
      console.warn('JEMMO actividad Casa:', error?.message || error);
    }
  }

  window.JemmoHouseActivity = {
    getState: () => ({ type: activityType, houseId, running, pendingSeconds }),
    flush: () => flush(true)
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else void boot();
})();
