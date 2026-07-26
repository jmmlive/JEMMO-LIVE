/* JEMMO LIVE V1 · ID PÚBLICA Y SEGURIDAD PRUEBA 08
   Asigna una ID JEMMO pública, única y permanente mediante transacción Firestore.
*/
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  runTransaction,
  serverTimestamp,
  deleteField
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
  authDomain: 'jemmo-live.firebaseapp.com',
  projectId: 'jemmo-live',
  storageBucket: 'jemmo-live.firebasestorage.app',
  messagingSenderId: '355540892255',
  appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
};

const app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const defaultDb = getFirestore(app);
const COUNTER_PATH = ['sistema', 'publicIdCounter'];
const FIRST_NUMBER = 1000001;
const PUBLIC_ID_PATTERN = /^JEMMO-(\d{7,12})$/;
let currentPromise = null;

export function normalizePublicId(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (/^\d{7,12}$/.test(raw)) return `JEMMO-${raw}`;
  if (/^JEMMO\d{7,12}$/.test(raw)) return `JEMMO-${raw.slice(5)}`;
  return PUBLIC_ID_PATTERN.test(raw) ? raw : '';
}

export function publicIdNumber(value) {
  const normalized = normalizePublicId(value);
  const match = normalized.match(PUBLIC_ID_PATTERN);
  return match ? Number(match[1]) : 0;
}

export function formatPublicId(number) {
  const safe = Math.max(FIRST_NUMBER, Math.floor(Number(number) || FIRST_NUMBER));
  return `JEMMO-${String(safe).padStart(7, '0')}`;
}

function safeLocalProfile(uid) {
  try {
    const key = `jemmo_profile_v1_${uid}`;
    const parsed = JSON.parse(localStorage.getItem(key) || '{}') || {};
    return { key, profile: parsed && typeof parsed === 'object' ? parsed : {} };
  } catch {
    return { key: `jemmo_profile_v1_${uid}`, profile: {} };
  }
}

function persistLocalPublicId(uid, publicId) {
  const { key, profile: localProfile } = safeLocalProfile(uid);
  let profile = { ...(window.JemmoProfileStorage?.peek?.(uid) || {}), ...localProfile };
  try { profile = { ...profile, ...(JSON.parse(sessionStorage.getItem(key) || '{}') || {}) }; } catch {}
  const next = { ...profile, id: publicId, publicId, updatedAt: Math.max(Date.now(), Number(profile.updatedAt) || 0) };
  try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  try { sessionStorage.setItem(key, JSON.stringify(next)); } catch {}
  const durableSave = window.JemmoProfileStorage?.save?.(uid, next);
  durableSave?.catch(error => console.warn('[JEMMO ID] Respaldo duradero falló.', error));
}

function patchOwnProfileUi(publicId) {
  const idNode = document.getElementById('profileId');
  if (idNode) idNode.textContent = publicId;

  const copyButton = document.getElementById('copyId');
  if (copyButton && !copyButton.dataset.jemmoPublicIdBound) {
    copyButton.dataset.jemmoPublicIdBound = '1';
    copyButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      copyPublicId(publicId);
    }, true);
  }

  const line = idNode?.closest('.id-line');
  if (line && !document.getElementById('shareJemmoId')) {
    const share = document.createElement('button');
    share.id = 'shareJemmoId';
    share.type = 'button';
    share.className = 'copy-id-button';
    share.setAttribute('aria-label', 'Compartir ID JEMMO');
    share.setAttribute('title', 'Compartir ID JEMMO');
    share.textContent = '↗';
    share.style.cssText = 'font-size:14px;line-height:1;padding-left:7px';
    share.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      sharePublicId(publicId);
    }, true);
    line.appendChild(share);
  }
}

function showToast(message) {
  if (typeof window.toast === 'function') {
    window.toast(message);
    return;
  }
  const existing = document.getElementById('toast');
  if (existing) {
    existing.textContent = message;
    existing.classList.add('show');
    setTimeout(() => existing.classList.remove('show'), 2200);
    return;
  }
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;z-index:2147483647;left:50%;bottom:88px;transform:translateX(-50%);max-width:88%;padding:10px 14px;border:1px solid #8b39a5;border-radius:14px;background:#1d0526;color:#fff;font:800 12px/1.3 system-ui;box-shadow:0 12px 35px #000;text-align:center';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

export async function copyPublicId(publicId) {
  const normalized = normalizePublicId(publicId);
  if (!normalized) return false;
  try {
    await navigator.clipboard.writeText(normalized);
    showToast('ID JEMMO copiada');
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = normalized;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand?.('copy') === true;
    area.remove();
    showToast(copied ? 'ID JEMMO copiada' : `ID JEMMO: ${normalized}`);
    return copied;
  }
}

export async function sharePublicId(publicId, displayName = '') {
  const normalized = normalizePublicId(publicId);
  if (!normalized) return false;
  const text = `${displayName ? `${displayName}: ` : ''}Encuéntrame en JEMMO LIVE con mi ID: ${normalized}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'JEMMO LIVE', text });
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') return false;
    }
  }
  await copyPublicId(normalized);
  return false;
}

export async function ensurePublicId(currentUser, db = defaultDb) {
  if (!currentUser?.uid) throw new Error('jemmo-public-id-user-required');
  if (currentPromise) return currentPromise;

  currentPromise = runTransaction(db, async transaction => {
    const userRef = doc(db, 'users', currentUser.uid);
    const directoryRef = doc(db, 'directorioMensajes', currentUser.uid);
    const counterRef = doc(db, ...COUNTER_PATH);

    const userSnapshot = await transaction.get(userRef);
    const userData = userSnapshot.exists() ? (userSnapshot.data() || {}) : {};
    const existing = normalizePublicId(userData.publicId || userData.profileId);
    if (existing) {
      const number = publicIdNumber(existing);
      transaction.set(userRef, {
        publicId: existing,
        publicIdLower: existing.toLocaleLowerCase('es'),
        publicIdNumber: number,
        profileId: existing,
        publicIdVersion: 1,
        updatedAt: serverTimestamp()
      }, { merge: true });
      transaction.set(directoryRef, {
        uid: currentUser.uid,
        email: deleteField(),
        emailLower: deleteField(),
        publicId: existing,
        publicIdLower: existing.toLocaleLowerCase('es'),
        publicIdNumber: number,
        profileId: existing,
        publicIdVersion: 1,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return { publicId: existing, publicIdNumber: number, created: false };
    }

    const counterSnapshot = await transaction.get(counterRef);
    const lastAssigned = counterSnapshot.exists()
      ? Math.max(FIRST_NUMBER - 1, Number(counterSnapshot.data()?.lastAssigned) || FIRST_NUMBER - 1)
      : FIRST_NUMBER - 1;
    const nextNumber = lastAssigned + 1;
    const publicId = formatPublicId(nextNumber);
    const reservationRef = doc(db, 'idsPublicas', publicId);
    const reservationSnapshot = await transaction.get(reservationRef);
    if (reservationSnapshot.exists()) throw new Error('jemmo-public-id-reservation-conflict');

    transaction.set(counterRef, {
      lastAssigned: nextNumber,
      lastPublicId: publicId,
      updatedBy: currentUser.uid,
      updatedAt: serverTimestamp(),
      version: 1
    }, { merge: true });
    transaction.set(reservationRef, {
      uid: currentUser.uid,
      publicId,
      publicIdLower: publicId.toLocaleLowerCase('es'),
      publicIdNumber: nextNumber,
      profileId: publicId,
      assignedAt: serverTimestamp(),
      version: 1
    });
    transaction.set(userRef, {
      uid: currentUser.uid,
      publicId,
      publicIdLower: publicId.toLocaleLowerCase('es'),
      publicIdNumber: nextNumber,
      profileId: publicId,
      publicIdAssignedAt: serverTimestamp(),
      publicIdVersion: 1,
      updatedAt: serverTimestamp()
    }, { merge: true });
    transaction.set(directoryRef, {
      uid: currentUser.uid,
      email: deleteField(),
      emailLower: deleteField(),
      publicId,
      publicIdLower: publicId.toLocaleLowerCase('es'),
      publicIdNumber: nextNumber,
      profileId: publicId,
      publicIdAssignedAt: serverTimestamp(),
      publicIdVersion: 1,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { publicId, publicIdNumber: nextNumber, created: true };
  }).finally(() => {
    currentPromise = null;
  });

  const result = await currentPromise;
  persistLocalPublicId(currentUser.uid, result.publicId);
  patchOwnProfileUi(result.publicId);
  window.__jemmoPublicId = result.publicId;
  window.dispatchEvent(new CustomEvent('jemmo-public-id-ready', { detail: result }));
  return result;
}

onAuthStateChanged(auth, currentUser => {
  if (!currentUser || !navigator.onLine) return;
  ensurePublicId(currentUser).catch(error => {
    console.warn('[JEMMO ID] No se pudo asignar la ID pública.', error?.code || error?.message || error);
    window.dispatchEvent(new CustomEvent('jemmo-public-id-error', { detail: { error } }));
  });
});

window.addEventListener('online', () => {
  const currentUser = auth.currentUser;
  if (currentUser) ensurePublicId(currentUser).catch(() => {});
});

window.JemmoPublicId = {
  ensure: ensurePublicId,
  normalize: normalizePublicId,
  copy: copyPublicId,
  share: sharePublicId,
  format: formatPublicId
};
