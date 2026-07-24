import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
  authDomain: 'jemmo-live.firebaseapp.com',
  projectId: 'jemmo-live',
  storageBucket: 'jemmo-live.firebasestorage.app',
  messagingSenderId: '355540892255',
  appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
};
const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const UID_KEY = 'jemmo_active_uid';
let resolved = false;

function safeGet(storage, key) {
  try { return storage.getItem(key) || ''; }
  catch { return ''; }
}

function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(storage, key) {
  try { storage.removeItem(key); }
  catch {}
}

function readActiveUid() {
  return safeGet(localStorage, UID_KEY)
    || safeGet(sessionStorage, UID_KEY)
    || String(window.__jemmoAuthenticatedUid || '');
}

function storeActiveUid(uid) {
  const value = String(uid || '');
  window.__jemmoAuthenticatedUid = value;
  if (!value) return;

  if (safeSet(localStorage, UID_KEY, value)) {
    safeRemove(sessionStorage, UID_KEY);
    return;
  }

  if (!safeSet(sessionStorage, UID_KEY, value)) {
    console.warn('JEMMO active UID no pudo persistirse; se mantiene en memoria durante esta carga.');
  }
}

function clearActiveUid() {
  window.__jemmoAuthenticatedUid = '';
  safeRemove(localStorage, UID_KEY);
  safeRemove(sessionStorage, UID_KEY);
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
    clearActiveUid();
    safeRemove(localStorage, 'jemmo_session');
    try { sessionStorage.clear(); } catch {}
    location.replace('acceso.html?sesion=cerrada');
  }
}

setPersistence(auth, browserLocalPersistence).catch(error => console.error('JEMMO persistence:', error));

onAuthStateChanged(auth, user => {
  if (!user) {
    clearActiveUid();
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

window.JemmoSession = { auth, closeSession, readActiveUid };
