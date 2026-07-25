import { ensurePublicId } from './jemmo-public-id.js';
/* JEMMO LIVE V1 · PERFIL SIN INVITACIONES PRIVADAS PRUEBA 11
   Sincroniza el perfil editable de Yo y elimina los campos antiguos de tarifa privada.
*/
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
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
const db = getFirestore(app);
const MEDIA_DB = 'jemmo-profile-media-v1';
const MEDIA_STORE = 'media';
const RELOAD_KEY = 'jemmo_profile_cloud_hydrated_11';
let user = null;
let syncing = false;


function safeSessionGet(key) {
  try { return sessionStorage.getItem(key) || ''; } catch { return ''; }
}

function safeSessionSet(key, value) {
  try { sessionStorage.setItem(key, value); return true; } catch { return false; }
}

function clean(value, max = 180) {
  return String(value || '').trim().slice(0, max);
}

function lower(value) {
  return clean(value).toLocaleLowerCase('es');
}

function profileKey(uid) {
  return `jemmo_profile_v1_${uid}`;
}

function readLocalProfile(uid) {
  try {
    const raw = localStorage.getItem(profileKey(uid));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalProfile(uid, profile) {
  try {
    localStorage.setItem(profileKey(uid), JSON.stringify(profile));
    return true;
  } catch (error) {
    console.warn('[JEMMO perfil] No se pudo actualizar el perfil local.', error);
    return false;
  }
}

function openMediaDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('indexeddb-unavailable'));
      return;
    }
    const request = indexedDB.open(MEDIA_DB, 1);
    request.onupgradeneeded = () => {
      const mediaDb = request.result;
      if (!mediaDb.objectStoreNames.contains(MEDIA_STORE)) mediaDb.createObjectStore(MEDIA_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('indexeddb-open-error'));
  });
}

async function mediaRead(key) {
  const mediaDb = await openMediaDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = mediaDb.transaction(MEDIA_STORE, 'readonly');
      const request = tx.objectStore(MEDIA_STORE).get(key);
      request.onsuccess = () => resolve(request.result || '');
      request.onerror = () => reject(request.error || new Error('indexeddb-read-error'));
    });
  } finally {
    mediaDb.close();
  }
}

async function mediaWrite(key, value) {
  const mediaDb = await openMediaDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = mediaDb.transaction(MEDIA_STORE, 'readwrite');
      const store = tx.objectStore(MEDIA_STORE);
      value ? store.put(value, key) : store.delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('indexeddb-write-error'));
      tx.onabort = () => reject(tx.error || new Error('indexeddb-abort'));
    });
  } finally {
    mediaDb.close();
  }
}

function dataUrlBytes(value) {
  if (typeof value !== 'string') return 0;
  const comma = value.indexOf(',');
  if (comma < 0) return 0;
  return Math.ceil((value.length - comma - 1) * 0.75);
}

function resizeDataUrl(dataUrl, { width, height, quality, square = false }) {
  return new Promise((resolve, reject) => {
    if (!String(dataUrl || '').startsWith('data:image/')) {
      resolve('');
      return;
    }
    const image = new Image();
    image.onerror = reject;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) {
        reject(new Error('canvas-context-unavailable'));
        return;
      }

      if (square) {
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        const sx = (image.naturalWidth - side) / 2;
        const sy = (image.naturalHeight - side) / 2;
        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, sx, sy, side, side, 0, 0, width, height);
      } else {
        const scale = Math.min(1, width / image.naturalWidth, height / image.naturalHeight);
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
      resolve(canvas.toDataURL('image/webp', quality));
    };
    image.src = dataUrl;
  });
}

async function publicMedia(uid) {
  const [avatarRaw, coverRaw] = await Promise.all([
    mediaRead(`${uid}:avatar`).catch(() => ''),
    mediaRead(`${uid}:cover`).catch(() => '')
  ]);

  let avatarData = '';
  let coverData = '';
  if (String(avatarRaw).startsWith('data:image/')) {
    avatarData = dataUrlBytes(avatarRaw) <= 180000
      ? avatarRaw
      : await resizeDataUrl(avatarRaw, { width: 300, height: 300, quality: 0.66, square: true }).catch(() => '');
  }
  if (String(coverRaw).startsWith('data:image/')) {
    coverData = dataUrlBytes(coverRaw) <= 360000
      ? coverRaw
      : await resizeDataUrl(coverRaw, { width: 960, height: 560, quality: 0.58 }).catch(() => '');
  }
  return { avatarData, coverData };
}

function profilePayload(currentUser, local, media, assigned) {
  const email = clean(currentUser.email, 180);
  const displayName = clean(local.name || currentUser.displayName || email.split('@')[0] || 'Usuario JEMMO', 40);
  const username = clean(local.username || '', 24).replace(/^@+/, '');
  const country = clean(local.country || '', 40);
  const city = clean(local.city || '', 40);
  const bio = clean(local.bio || '', 160);
  const instagram = clean(local.instagram || '', 160);
  const tiktok = clean(local.tiktok || '', 160);
  const youtube = clean(local.youtube || '', 160);
  const facebook = clean(local.facebook || '', 160);
  const website = clean(local.website || local.web || '', 220);
  const profileUpdatedAtClient = Math.max(0, Number(local.updatedAt) || 0);
  return {
    uid: currentUser.uid,
    email,
    emailLower: lower(email),
    displayName,
    displayNameLower: lower(displayName),
    nombre: displayName,
    name: displayName,
    nameLower: lower(displayName),
    username,
    usernameLower: lower(username),
    bio,
    country,
    city,
    instagram,
    tiktok,
    youtube,
    facebook,
    website,
    publicId: assigned.publicId,
    publicIdLower: assigned.publicId.toLocaleLowerCase('es'),
    publicIdNumber: assigned.publicIdNumber,
    profileId: assigned.publicId,
    verified: Boolean(local.verified),
    level: Math.max(1, Number(local.level) || 1),
    avatarData: media.avatarData || '',
    coverData: media.coverData || '',
    coverPosition: {
      x: Math.max(0, Math.min(100, Number(local.coverPosition?.x) || 50)),
      y: Math.max(0, Math.min(100, Number(local.coverPosition?.y) || 50))
    },
    publicProfileEnabled: true,
    messagesEnabled: true,
    messagesVersion: 2,
    profileVersion: 2,
    profileUpdatedAtClient
  };
}

async function syncLocalProfile() {
  if (!user || syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const assigned = await ensurePublicId(user, db);
    const local = readLocalProfile(user.uid);
    const media = await publicMedia(user.uid);
    const payload = profilePayload(user, local, media, assigned);
    if (local.id !== assigned.publicId || local.publicId !== assigned.publicId) {
      writeLocalProfile(user.uid, { ...local, id: assigned.publicId, publicId: assigned.publicId });
    }
    await Promise.all([
      setDoc(doc(db, 'users', user.uid), {
        ...payload,
        invitationsEnabled: deleteField(),
        invitationPrice: deleteField(),
        acceptsInvitations: deleteField(),
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(db, 'directorioMensajes', user.uid), {
        uid: payload.uid,
        email: deleteField(),
        emailLower: deleteField(),
        publicId: payload.publicId,
        publicIdLower: payload.publicIdLower,
        publicIdNumber: payload.publicIdNumber,
        profileId: payload.publicId,
        displayName: payload.displayName,
        displayNameLower: payload.displayNameLower,
        nombre: payload.nombre,
        name: payload.name,
        nameLower: payload.nameLower,
        username: payload.username,
        usernameLower: payload.usernameLower,
        bio: payload.bio,
        country: payload.country,
        city: payload.city,
        instagram: payload.instagram,
        tiktok: payload.tiktok,
        youtube: payload.youtube,
        facebook: payload.facebook,
        website: payload.website,
        invitationsEnabled: deleteField(),
        invitationPrice: deleteField(),
        acceptsInvitations: deleteField(),
        verified: payload.verified,
        level: payload.level,
        avatarData: payload.avatarData,
        coverData: payload.coverData,
        coverPosition: payload.coverPosition,
        publicProfileEnabled: true,
        messagesEnabled: true,
        messagesVersion: 3,
        profileVersion: 3,
        profileUpdatedAtClient: payload.profileUpdatedAtClient,
        ultimaActividad: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    ]);
    if (payload.displayName && payload.displayName !== user.displayName) {
      await updateProfile(user, { displayName: payload.displayName }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('jemmo-profile-cloud-synced', { detail: payload }));
  } catch (error) {
    console.warn('[JEMMO perfil] No se pudo sincronizar con Firebase.', error);
  } finally {
    syncing = false;
  }
}

async function hydrateFromCloud() {
  if (!user || !navigator.onLine) return;
  try {
    const snapshot = await getDoc(doc(db, 'users', user.uid));
    if (!snapshot.exists()) return;
    const cloud = snapshot.data() || {};
    const local = readLocalProfile(user.uid);
    const cloudUpdated = Number(cloud.profileUpdatedAtClient) || 0;
    const localUpdated = Number(local.updatedAt) || 0;
    if (!cloudUpdated || cloudUpdated <= localUpdated) return;

    const merged = {
      ...local,
      name: clean(cloud.displayName || cloud.name || cloud.nombre || local.name, 40),
      username: clean(cloud.username || local.username, 24),
      bio: clean(cloud.bio || local.bio, 160),
      country: clean(cloud.country || local.country, 40),
      city: clean(cloud.city || local.city, 40),
      instagram: clean(cloud.instagram || local.instagram, 160),
      tiktok: clean(cloud.tiktok || local.tiktok, 160),
      youtube: clean(cloud.youtube || local.youtube, 160),
      facebook: clean(cloud.facebook || local.facebook, 160),
      website: clean(cloud.website || local.website || local.web, 220),
      id: clean(cloud.publicId || cloud.profileId || local.publicId || local.id, 40),
      publicId: clean(cloud.publicId || cloud.profileId || local.publicId || local.id, 40),
      verified: Boolean(cloud.verified),
      level: Math.max(1, Number(cloud.level) || Number(local.level) || 1),
      coverPosition: cloud.coverPosition || local.coverPosition || { x: 50, y: 50 },
      avatar: cloud.avatarData ? 'indexeddb' : (local.avatar || ''),
      cover: cloud.coverData ? 'indexeddb' : (local.cover || ''),
      updatedAt: cloudUpdated
    };
    delete merged.invitationsEnabled;
    delete merged.invitationPrice;
    delete merged.acceptsInvitations;

    await Promise.all([
      cloud.avatarData ? mediaWrite(`${user.uid}:avatar`, cloud.avatarData) : Promise.resolve(),
      cloud.coverData ? mediaWrite(`${user.uid}:cover`, cloud.coverData) : Promise.resolve()
    ]);

    if (writeLocalProfile(user.uid, merged)) {
      const alreadyReloaded = safeSessionGet(RELOAD_KEY) === user.uid;
      if (!alreadyReloaded) {
        safeSessionSet(RELOAD_KEY, user.uid);
        location.reload();
      }
    }
  } catch (error) {
    console.warn('[JEMMO perfil] No se pudo recuperar el perfil de Firebase.', error);
  }
}

function watchProfileSave() {
  const button = document.getElementById('saveProfile');
  if (!button) return;
  button.addEventListener('click', () => {
    if (!user) return;
    const before = Number(readLocalProfile(user.uid).updatedAt) || 0;
    const started = Date.now();
    const timer = setInterval(() => {
      const after = Number(readLocalProfile(user.uid).updatedAt) || 0;
      if (after > before || Date.now() - started > 6500) {
        clearInterval(timer);
        if (after > before) syncLocalProfile();
      }
    }, 180);
  });
}

onAuthStateChanged(auth, async currentUser => {
  if (!currentUser) return;
  user = currentUser;
  watchProfileSave();
  await hydrateFromCloud();
  await syncLocalProfile();
});

window.addEventListener('online', () => syncLocalProfile());
window.JemmoCloudProfile = { sync: syncLocalProfile, hydrate: hydrateFromCloud };
