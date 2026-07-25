/* JEMMO LIVE V1 · INVITAR AMIGOS PRUEBA 11
   Enlace personal de registro y atribución básica de referidos en Firestore.
   No contiene cobros ni invitaciones privadas a emisores. */
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  runTransaction,
  serverTimestamp,
  increment
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
  authDomain: 'jemmo-live.firebaseapp.com',
  projectId: 'jemmo-live',
  storageBucket: 'jemmo-live.firebasestorage.app',
  messagingSenderId: '355540892255',
  appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
};

function runtime() {
  const app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

function normalizePublicId(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (/^\d{7,12}$/.test(raw)) return `JEMMO-${raw}`;
  if (/^JEMMO\d{7,12}$/.test(raw)) return `JEMMO-${raw.slice(5)}`;
  return /^JEMMO-\d{7,12}$/.test(raw) ? raw : '';
}
const STORAGE_KEY = 'jemmo_pending_referral_v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function safeRead(storage, key) {
  try { return storage.getItem(key) || ''; } catch { return ''; }
}
function safeWrite(storage, key, value) {
  try { storage.setItem(key, value); return true; } catch { return false; }
}
function safeRemove(storage, key) {
  try { storage.removeItem(key); } catch {}
}

function referralPayload(publicId) {
  return JSON.stringify({ publicId, capturedAt: Date.now(), version: 1 });
}

export function captureReferralFromUrl() {
  const params = new URLSearchParams(location.search);
  const publicId = normalizePublicId(params.get('ref') || params.get('invite') || '');
  if (!publicId) return readPendingReferral();
  const payload = referralPayload(publicId);
  safeWrite(localStorage, STORAGE_KEY, payload);
  safeWrite(sessionStorage, STORAGE_KEY, payload);
  window.dispatchEvent(new CustomEvent('jemmo-referral-captured', { detail: { publicId } }));
  return { publicId, capturedAt: Date.now(), version: 1 };
}

export function readPendingReferral() {
  const raw = safeRead(localStorage, STORAGE_KEY) || safeRead(sessionStorage, STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const publicId = normalizePublicId(parsed?.publicId);
    const capturedAt = Number(parsed?.capturedAt) || 0;
    if (!publicId || !capturedAt || Date.now() - capturedAt > MAX_AGE_MS) {
      clearPendingReferral();
      return null;
    }
    return { publicId, capturedAt, version: 1 };
  } catch {
    clearPendingReferral();
    return null;
  }
}

export function clearPendingReferral() {
  safeRemove(localStorage, STORAGE_KEY);
  safeRemove(sessionStorage, STORAGE_KEY);
}

function waitForUser(timeout = 12000) {
  const { auth } = runtime();
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve, reject) => {
    let stop = () => {};
    const timer = setTimeout(() => {
      stop();
      reject(new Error('La sesión de JEMMO no está disponible.'));
    }, timeout);
    stop = onAuthStateChanged(auth, user => {
      if (!user) return;
      clearTimeout(timer);
      stop();
      resolve(user);
    }, error => {
      clearTimeout(timer);
      stop();
      reject(error);
    });
  });
}

export async function applyPendingReferral(currentUser, suppliedDb = null) {
  const db = suppliedDb || runtime().db;
  const pending = readPendingReferral();
  if (!pending || !currentUser?.uid) return { ok: false, reason: 'none' };

  const result = await runTransaction(db, async transaction => {
    const reservationRef = doc(db, 'idsPublicas', pending.publicId);
    const userRef = doc(db, 'users', currentUser.uid);
    const referralRef = doc(db, 'referidos', currentUser.uid);

    const reservationSnapshot = await transaction.get(reservationRef);
    if (!reservationSnapshot.exists()) return { ok: false, reason: 'inviter-not-found' };
    const inviterUid = String(reservationSnapshot.data()?.uid || '');
    if (!inviterUid || inviterUid === currentUser.uid) return { ok: false, reason: 'self' };

    const userSnapshot = await transaction.get(userRef);
    const referralSnapshot = await transaction.get(referralRef);
    const userData = userSnapshot.exists() ? (userSnapshot.data() || {}) : {};
    if (referralSnapshot.exists() || userData.referredByUid) return { ok: false, reason: 'already-linked' };

    const inviterRef = doc(db, 'users', inviterUid);
    transaction.set(userRef, {
      referredByUid: inviterUid,
      referredByPublicId: pending.publicId,
      referralRegisteredAt: serverTimestamp(),
      referralVersion: 1,
      updatedAt: serverTimestamp()
    }, { merge: true });
    transaction.set(referralRef, {
      inviterUid,
      inviterPublicId: pending.publicId,
      invitedUid: currentUser.uid,
      status: 'registered',
      createdAt: serverTimestamp(),
      version: 1
    });
    transaction.set(inviterRef, {
      referralCount: increment(1),
      lastReferralAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { ok: true, inviterUid, inviterPublicId: pending.publicId };
  });

  if (result.ok || ['self', 'already-linked'].includes(result.reason)) clearPendingReferral();
  window.dispatchEvent(new CustomEvent('jemmo-referral-applied', { detail: result }));
  return result;
}

export async function getMyInviteData() {
  const user = await waitForUser();
  const { ensurePublicId } = await import('./jemmo-public-id.js');
  const assigned = await ensurePublicId(user, runtime().db);
  const url = new URL('./acceso.html', location.href);
  url.searchParams.set('ref', assigned.publicId);
  return { publicId: assigned.publicId, url: url.href, user };
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand?.('copy') === true;
    area.remove();
    return copied;
  }
}

export async function copyMyInvite() {
  const data = await getMyInviteData();
  const copied = await copyText(data.url);
  window.dispatchEvent(new CustomEvent('jemmo-invite-link-copied', { detail: { ...data, copied } }));
  return { ...data, copied };
}

export async function shareMyInvite(displayName = '') {
  const data = await getMyInviteData();
  const name = String(displayName || data.user.displayName || '').trim();
  const text = `${name ? `${name} te invita a ` : 'Te invito a '}JEMMO LIVE. Regístrate desde este enlace y forma parte de la comunidad.`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Invitación a JEMMO LIVE', text, url: data.url });
      return { ...data, shared: true };
    } catch (error) {
      if (error?.name === 'AbortError') return { ...data, shared: false, cancelled: true };
    }
  }
  const copied = await copyText(data.url);
  return { ...data, shared: false, copied };
}

window.JemmoReferrals = Object.freeze({
  capture: captureReferralFromUrl,
  pending: readPendingReferral,
  apply: applyPendingReferral,
  getMyInviteData,
  copyMyInvite,
  shareMyInvite
});
