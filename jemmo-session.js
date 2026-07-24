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
let resolved = false;

function storeActiveUid(uid) {
  window.__jemmoAuthenticatedUid = String(uid || '');
  try {
    localStorage.setItem('jemmo_active_uid', window.__jemmoAuthenticatedUid);
  } catch (error) {
    console.warn('JEMMO active UID local backup:', error);
  }
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
    localStorage.removeItem('jemmo_active_uid');
    localStorage.removeItem('jemmo_session');
    sessionStorage.clear();
    location.replace('acceso.html?sesion=cerrada');
  }
}

setPersistence(auth, browserLocalPersistence).catch(error => console.error('JEMMO persistence:', error));

onAuthStateChanged(auth, user => {
  if (!user) {
    localStorage.removeItem('jemmo_active_uid');
    location.replace('acceso.html?sesion=requerida');
    return;
  }
  storeActiveUid(user.uid);
  reveal('verified');
  window.dispatchEvent(new CustomEvent('jemmo-auth-ready', { detail: { uid: user.uid } }));
}, error => {
  console.error('JEMMO auth state:', error);
  const localUid = localStorage.getItem('jemmo_active_uid');
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
  const localUid = localStorage.getItem('jemmo_active_uid');
  if (localUid) reveal('local-timeout');
  else location.replace('acceso.html?sesion=timeout');
}, 5000);

window.JemmoSession = { auth, closeSession };
