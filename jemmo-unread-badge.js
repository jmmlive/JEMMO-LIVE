/* JEMMO LIVE V1 · ID PÚBLICA Y SEGURIDAD PRUEBA 08
   Contador global de conversaciones no leídas.
*/
(() => {
  'use strict';

  if (window.__jemmoUnreadBadgeRealtime01) return;
  window.__jemmoUnreadBadgeRealtime01 = true;

  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
    authDomain: 'jemmo-live.firebaseapp.com',
    projectId: 'jemmo-live',
    storageBucket: 'jemmo-live.firebasestorage.app',
    messagingSenderId: '355540892255',
    appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
  };

  const SCRIPT_VERSION = 'id-seguridad-08';
  const BADGE_SELECTORS = [
    '#navUnread',
    'a[href$="mensajes.html"] .nav-badge',
    'a[href$="mensajes.html"] .badge',
    'a[href$="mensajes.html"] .jl-badge',
    '[data-tab="mensajes"] .badge',
    '[data-tab="mensajes"] .jl-badge'
  ].join(',');

  let stopSnapshot = null;
  let currentUid = '';

  function messageLinks() {
    return [...document.querySelectorAll(
      'a[href$="mensajes.html"], a[href*="mensajes.html?"], [data-tab="mensajes"]'
    )];
  }

  function makeBadge(link) {
    let badge = link.querySelector('.jemmo-realtime-unread-badge');
    if (badge) return badge;

    badge = document.createElement('span');
    badge.className = 'jemmo-realtime-unread-badge';
    badge.setAttribute('aria-label', 'Mensajes no leídos');
    Object.assign(badge.style, {
      position: 'absolute',
      zIndex: '40',
      top: '2px',
      right: '10px',
      minWidth: '19px',
      height: '19px',
      padding: '0 5px',
      borderRadius: '999px',
      display: 'none',
      placeItems: 'center',
      background: '#ff304f',
      color: '#fff',
      border: '2px solid #110016',
      boxShadow: '0 0 10px rgba(255,48,79,.75)',
      fontSize: '9px',
      lineHeight: '15px',
      fontWeight: '1000',
      pointerEvents: 'none'
    });
    if (getComputedStyle(link).position === 'static') link.style.position = 'relative';
    link.appendChild(badge);
    return badge;
  }

  function allBadges() {
    const badges = [...document.querySelectorAll(BADGE_SELECTORS)];
    for (const link of messageLinks()) {
      const localBadge = link.querySelector('#navUnread,.nav-badge,.badge,.jl-badge,.jemmo-realtime-unread-badge');
      if (!localBadge) badges.push(makeBadge(link));
    }
    return [...new Set(badges)];
  }

  function renderCount(value) {
    const count = Math.max(0, Number(value) || 0);
    const text = count > 99 ? '99+' : String(count);

    for (const badge of allBadges()) {
      badge.textContent = text;
      badge.hidden = count === 0;
      badge.classList.toggle('hidden', count === 0);
      badge.setAttribute('aria-hidden', count === 0 ? 'true' : 'false');
      if (badge.classList.contains('jemmo-realtime-unread-badge')) {
        badge.style.display = count === 0 ? 'none' : 'grid';
      } else if (count === 0) {
        badge.style.display = 'none';
      } else {
        badge.style.removeProperty('display');
      }
    }

    document.documentElement.dataset.jemmoUnreadMessages = String(count);
    window.dispatchEvent(new CustomEvent('jemmo-unread-change', {
      detail: { count, source: SCRIPT_VERSION }
    }));
  }

  function timestampValue(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    return Number(value) || 0;
  }

  async function start() {
    renderCount(0); // Elimina el “8” fijo mientras se consulta el dato real.

    try {
      const [appSdk, authSdk, firestoreSdk] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
      ]);

      const app = appSdk.getApps()[0] || appSdk.initializeApp(FIREBASE_CONFIG);
      const auth = authSdk.getAuth(app);
      const db = firestoreSdk.getFirestore(app);

      authSdk.onAuthStateChanged(auth, user => {
        if (stopSnapshot) {
          stopSnapshot();
          stopSnapshot = null;
        }

        currentUid = user?.uid || '';
        if (!currentUid) {
          renderCount(0);
          return;
        }

        const conversationsQuery = firestoreSdk.query(
          firestoreSdk.collection(db, 'conversaciones'),
          firestoreSdk.where('participants', 'array-contains', currentUid)
        );

        stopSnapshot = firestoreSdk.onSnapshot(
          conversationsQuery,
          snapshot => {
            let total = 0;
            let newest = 0;
            snapshot.forEach(documentSnapshot => {
              const data = documentSnapshot.data() || {};
              total += Math.max(0, Number(data.unreadBy?.[currentUid]) || 0);
              newest = Math.max(newest, timestampValue(data.updatedAt || data.lastMessageAt));
            });
            renderCount(total);
            document.documentElement.dataset.jemmoMessagesUpdatedAt = String(newest || Date.now());
          },
          error => {
            console.warn('[JEMMO mensajes] No se pudo leer el contador real.', error);
            renderCount(0);
            window.dispatchEvent(new CustomEvent('jemmo-messages-error', {
              detail: { code: error?.code || 'unknown', area: 'unread-badge' }
            }));
          }
        );
      });
    } catch (error) {
      console.warn('[JEMMO mensajes] No se pudo iniciar el contador global.', error);
      renderCount(0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
