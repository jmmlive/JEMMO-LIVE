const firebaseConfig = {
  apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
  authDomain: 'jemmo-live.firebaseapp.com',
  projectId: 'jemmo-live',
  storageBucket: 'jemmo-live.firebasestorage.app',
  messagingSenderId: '355540892255',
  appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
};
const SESSION_KEY = 'jemmo_session';
const ACTIVE_UID_KEY = 'jemmo_active_uid';
const SIGNED_OUT_KEY = 'jemmo_signed_out_at';
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
let auth = null;
let signOutFn = null;
let resolved = false;

function readLocalSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    const uid = localStorage.getItem(ACTIVE_UID_KEY) || '';
    const signedOutAt = Number(localStorage.getItem(SIGNED_OUT_KEY) || 0);
    const verifiedAt = Number(session?.verifiedAt || 0);
    const valid = Boolean(session && session.version === 2 && session.uid && session.uid === uid && verifiedAt && Date.now() - verifiedAt <= SESSION_TTL && signedOutAt < verifiedAt);
    return valid ? session : null;
  } catch { return null; }
}
function rememberSession(user) {
  const verifiedAt = Date.now();
  localStorage.setItem(ACTIVE_UID_KEY, user.uid);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ version: 2, uid: user.uid, verifiedAt }));
  localStorage.removeItem(SIGNED_OUT_KEY);
}
function clearSessionMarker() {
  localStorage.removeItem(ACTIVE_UID_KEY);
  localStorage.removeItem(SESSION_KEY);
}
function reveal(mode = 'verified', uid = '') {
  if (resolved) return;
  resolved = true;
  document.documentElement.classList.remove('jemmo-auth-pending');
  document.documentElement.classList.add('jemmo-auth-ready');
  document.documentElement.dataset.sessionMode = mode;
  window.dispatchEvent(new CustomEvent('jemmo-auth-ready', { detail: { uid, offline: mode === 'offline-local' } }));
}
function useOfflineFallback() {
  if (navigator.onLine !== false) return false;
  const local = readLocalSession();
  if (!local) return false;
  reveal('offline-local', local.uid);
  return true;
}
async function closeSession(trigger) {
  if (trigger) { trigger.setAttribute('aria-busy', 'true'); if ('disabled' in trigger) trigger.disabled = true; }
  localStorage.setItem(SIGNED_OUT_KEY, String(Date.now()));
  clearSessionMarker();
  sessionStorage.removeItem('jemmo_access_fields');
  sessionStorage.removeItem('jemmo_owner_unlocked_until');
  try { if (auth && signOutFn) await signOutFn(auth); }
  catch (error) { console.error('JEMMO logout:', error); }
  finally { location.replace('acceso.html?sesion=cerrada'); }
}

async function bootstrapSession() {
  if (useOfflineFallback()) return;
  try {
    const [appModule, authModule] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js')
    ]);
    const app = appModule.getApps()[0] || appModule.initializeApp(firebaseConfig);
    auth = authModule.getAuth(app);
    signOutFn = authModule.signOut;
    window.JemmoSession.auth = auth;
    await authModule.setPersistence(auth, authModule.browserLocalPersistence).catch(error => console.error('JEMMO persistence:', error));
    authModule.onAuthStateChanged(auth, user => {
      if (resolved) return;
      if (user) { rememberSession(user); reveal('verified', user.uid); return; }
      if (useOfflineFallback()) return;
      clearSessionMarker();
      location.replace('acceso.html?sesion=requerida');
    }, error => {
      console.error('JEMMO auth state:', error);
      if (!useOfflineFallback()) location.replace('acceso.html?sesion=error');
    });
  } catch (error) {
    console.error('JEMMO session bootstrap:', error);
    if (!useOfflineFallback()) location.replace('acceso.html?sesion=error');
  }
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-jemmo-logout], #logoutButton');
  if (!trigger) return;
  event.preventDefault(); event.stopImmediatePropagation(); closeSession(trigger);
}, true);
window.setTimeout(() => { if (!resolved && !useOfflineFallback()) location.replace('acceso.html?sesion=timeout'); }, 9000);
window.JemmoSession = { auth, closeSession, readLocalSession, rememberSession };
bootstrapSession();
