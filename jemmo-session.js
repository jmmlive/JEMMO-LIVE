import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { initializeAuth, getAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
  authDomain: 'jemmo-live.firebaseapp.com',
  projectId: 'jemmo-live',
  storageBucket: 'jemmo-live.firebasestorage.app',
  messagingSenderId: '355540892255',
  appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
};
const app = getApps()[0] || initializeApp(firebaseConfig);
let auth;
try {
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
  });
} catch (error) {
  auth = getAuth(app);
  console.warn('JEMMO Auth ya inicializado:', error?.code || error);
}
let resolved = false;

function readActiveUid() {
  try {
    const uid = localStorage.getItem('jemmo_active_uid');
    if (uid) return uid;
  } catch (error) {
    console.warn('JEMMO active UID local read:', error);
  }
  try {
    return sessionStorage.getItem('jemmo_active_uid') || '';
  } catch (error) {
    console.warn('JEMMO active UID session read:', error);
    return '';
  }
}

function storeActiveUid(uid) {
  const value = String(uid || '');
  window.__jemmoAuthenticatedUid = value;
  if (!value) return false;
  try {
    localStorage.setItem('jemmo_active_uid', value);
    try { sessionStorage.removeItem('jemmo_active_uid'); } catch {}
    return true;
  } catch (error) {
    console.warn('JEMMO active UID local backup:', error);
    try {
      sessionStorage.setItem('jemmo_active_uid', value);
      return true;
    } catch (sessionError) {
      console.warn('JEMMO active UID session backup:', sessionError);
      return false;
    }
  }
}

function clearStoredSession() {
  try { localStorage.removeItem('jemmo_active_uid'); } catch {}
  try { localStorage.removeItem('jemmo_session'); } catch {}
  try { sessionStorage.clear(); } catch {}
}

function reveal(mode = 'verified') {
  resolved = true;
  document.documentElement.classList.remove('jemmo-auth-pending');
  document.documentElement.classList.add('jemmo-auth-ready');
  document.documentElement.dataset.sessionMode = mode;
}

async function closeSession(trigger) {
  if (trigger) {
    trigger.setAttribute('aria-busy', 'true');
    if ('disabled' in trigger) trigger.disabled = true;
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error('JEMMO logout:', error);
  } finally {
    clearStoredSession();
    location.replace('acceso.html?sesion=cerrada');
  }
}

onAuthStateChanged(auth, user => {
  if (!user) {
    const backupUid = readActiveUid();
    if (backupUid) {
      reveal(navigator.onLine ? 'session-backup' : 'offline-local');
      window.dispatchEvent(new CustomEvent('jemmo-auth-ready', {
        detail: { uid: backupUid, backup: true, offline: !navigator.onLine }
      }));
      return;
    }
    clearStoredSession();
    location.replace('acceso.html?sesion=requerida');
    return;
  }
  storeActiveUid(user.uid);
  reveal('verified');
  window.dispatchEvent(new CustomEvent('jemmo-auth-ready', { detail: { uid: user.uid } }));
}, error => {
  console.error('JEMMO auth state:', error);
  const localUid = readActiveUid();
  if (localUid) {
    reveal('offline-local');
    window.dispatchEvent(new CustomEvent('jemmo-auth-ready', { detail: { uid: localUid, offline: true } }));
  } else {
    location.replace('acceso.html?sesion=error');
  }
});

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-jemmo-logout], #logoutButton');
  if (!trigger) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  closeSession(trigger);
}, true);

window.setTimeout(() => {
  if (resolved) return;
  const localUid = readActiveUid();
  if (localUid) reveal('local-timeout');
  else location.replace('acceso.html?sesion=timeout');
}, 5000);

window.JemmoSession = { auth, closeSession };
