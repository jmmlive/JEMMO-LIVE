import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
  authDomain: 'jemmo-live.firebaseapp.com',
  projectId: 'jemmo-live',
  storageBucket: 'jemmo-live.firebasestorage.app',
  messagingSenderId: '355540892255',
  appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
};

const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getFirestore(app);
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

function safeGet(storage, key) {
  try { return storage.getItem(key) || ''; } catch { return ''; }
}

function safeSet(storage, key, value) {
  try { storage.setItem(key, value); return true; } catch { return false; }
}

function readActiveUid() {
  return safeGet(localStorage, 'jemmo_active_uid') || safeGet(sessionStorage, 'jemmo_active_uid');
}

function storeActiveUid(uid) {
  const value = String(uid || '');
  window.__jemmoAuthenticatedUid = value;
  if (!value) return false;
  if (safeSet(localStorage, 'jemmo_active_uid', value)) {
    try { sessionStorage.removeItem('jemmo_active_uid'); } catch {}
    return true;
  }
  return safeSet(sessionStorage, 'jemmo_active_uid', value);
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

function cleanText(value, max = 120) {
  return String(value || '').trim().slice(0, max);
}

function normalizeSearch(value) {
  return cleanText(value, 160).toLocaleLowerCase('es');
}

function readLocalProfile(uid) {
  if (!uid) return {};
  try {
    const raw = localStorage.getItem(`jemmo_profile_v1_${uid}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function buildIdentity(user) {
  const local = readLocalProfile(user.uid);
  const email = cleanText(user.email, 180);
  const displayName = cleanText(local.name || user.displayName || email.split('@')[0] || 'Usuario JEMMO', 40);
  const username = cleanText(local.username || '', 24).replace(/^@+/, '');
  const country = cleanText(local.country || '', 40);
  const city = cleanText(local.city || '', 40);
  const bio = cleanText(local.bio || '', 160);
  return {
    uid: user.uid,
    email,
    emailLower: normalizeSearch(email),
    displayName,
    displayNameLower: normalizeSearch(displayName),
    nombre: displayName,
    name: displayName,
    nameLower: normalizeSearch(displayName),
    username,
    usernameLower: normalizeSearch(username),
    country,
    city,
    bio,
    profileId: cleanText(local.id || '', 40),
    verified: Boolean(local.verified),
    level: Math.max(1, Number(local.level) || 1),
    publicProfileEnabled: true,
    messagesEnabled: true,
    messagesVersion: 2,
    profileVersion: 2,
    profileUpdatedAtClient: Math.max(0, Number(local.updatedAt) || 0)
  };
}

async function syncCloudIdentity(user) {
  if (!user?.uid || !navigator.onLine) return null;
  const identity = buildIdentity(user);
  const publicIdentity = {
    ...identity,
    ultimaActividad: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const userIdentity = {
    ...identity,
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await Promise.all([
    setDoc(doc(db, 'users', user.uid), userIdentity, { merge: true }),
    setDoc(doc(db, 'directorioMensajes', user.uid), publicIdentity, { merge: true })
  ]);
  window.dispatchEvent(new CustomEvent('jemmo-cloud-identity-synced', { detail: identity }));
  return identity;
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
  syncCloudIdentity(user).catch(error => {
    console.warn('JEMMO cloud identity:', error?.code || error);
  });
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

window.JemmoSession = { auth, db, closeSession, syncCloudIdentity, readLocalProfile };
