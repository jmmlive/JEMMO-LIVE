/* JEMMO LIVE V1 · SEGUIDORES Y CHILI OFICIAL PRUEBA 04
   Relaciones sociales reales en Firestore: seguir, dejar de seguir, seguidores,
   seguidos y presencia institucional de Chili IA como asistente oficial.
*/
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
  authDomain: 'jemmo-live.firebaseapp.com',
  projectId: 'jemmo-live',
  storageBucket: 'jemmo-live.firebasestorage.app',
  messagingSenderId: '355540892255',
  appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
};

export const CHILI_UID = 'official_chili_ia';
export const CHILI_PROFILE = Object.freeze({
  uid: CHILI_UID,
  name: 'Chili IA',
  displayName: 'Chili IA',
  username: 'chili.ia',
  publicId: 'JEMMO-CHILI',
  verified: true,
  official: true,
  avatarData: 'chili-avatar.webp',
  bio: 'Asistente oficial de JEMMO LIVE. Ayuda, academia, seguridad y soporte.',
  country: 'JEMMO LIVE',
  city: ''
});

const app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let ownFollowingStop = null;
let ownFollowersStop = null;
let publicFollowingStop = null;
let publicFollowersStop = null;
let chiliFollowingStop = null;
let toastTimer = 0;

const clean = (value, max = 180) => String(value ?? '').trim().slice(0, max);
const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[character]));
const pageName = () => location.pathname.split('/').pop() || 'index.html';
const followId = (followerUid, targetUid) => `${followerUid}__${targetUid}`;
const relationRef = (followerUid, targetUid) => doc(db, 'seguimientos', followId(followerUid, targetUid));

function timestampMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return Number(value) || 0;
}

function normalizedProfile(uid, data = {}) {
  if (uid === CHILI_UID) return { ...CHILI_PROFILE };
  const name = clean(data.displayName || data.nombre || data.name || 'Usuario JEMMO', 50);
  return {
    uid,
    name,
    displayName: name,
    username: clean(data.username, 30).replace(/^@+/, ''),
    publicId: clean(data.publicId || data.profileId, 40),
    verified: Boolean(data.verified),
    official: false,
    avatarData: clean(data.avatarData, 800000),
    bio: clean(data.bio, 180),
    country: clean(data.country, 50),
    city: clean(data.city, 50)
  };
}

async function profileByUid(uid) {
  if (!uid) return null;
  if (uid === CHILI_UID) return { ...CHILI_PROFILE };
  const snapshot = await getDoc(doc(db, 'directorioMensajes', uid));
  return snapshot.exists() ? normalizedProfile(snapshot.id, snapshot.data() || {}) : null;
}

async function profilesByUids(uids) {
  const unique = [...new Set((uids || []).filter(Boolean))];
  const profiles = await Promise.all(unique.map(uid => profileByUid(uid).catch(() => null)));
  return profiles.filter(Boolean);
}

export async function isFollowing(targetUid, followerUid = currentUser?.uid) {
  if (!followerUid || !targetUid || followerUid === targetUid) return false;
  const snapshot = await getDoc(relationRef(followerUid, targetUid));
  return snapshot.exists();
}

export async function follow(targetUid, followerUid = currentUser?.uid) {
  if (!followerUid || !targetUid) throw new Error('jemmo-social-auth-required');
  if (followerUid === targetUid) throw new Error('jemmo-social-self-follow');
  await setDoc(relationRef(followerUid, targetUid), {
    followerUid,
    targetUid,
    createdAt: serverTimestamp(),
    version: 1
  });
  return true;
}

export async function unfollow(targetUid, followerUid = currentUser?.uid) {
  if (!followerUid || !targetUid) throw new Error('jemmo-social-auth-required');
  await deleteDoc(relationRef(followerUid, targetUid));
  return true;
}

export async function toggleFollow(targetUid, followerUid = currentUser?.uid) {
  const active = await isFollowing(targetUid, followerUid);
  if (active) await unfollow(targetUid, followerUid);
  else await follow(targetUid, followerUid);
  return !active;
}

export function subscribeFollowing(uid, callback, errorCallback = () => {}) {
  if (!uid) return () => {};
  const request = query(collection(db, 'seguimientos'), where('followerUid', '==', uid));
  let generation = 0;
  return onSnapshot(request, async snapshot => {
    const run = ++generation;
    const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .sort((a,b) => timestampMs(b.createdAt) - timestampMs(a.createdAt));
    const profiles = await profilesByUids(rows.map(item => item.targetUid));
    if (run !== generation) return;
    callback({ count: snapshot.size, rows, profiles });
  }, errorCallback);
}

export function subscribeFollowers(uid, callback, errorCallback = () => {}) {
  if (!uid) return () => {};
  const request = query(collection(db, 'seguimientos'), where('targetUid', '==', uid));
  let generation = 0;
  return onSnapshot(request, async snapshot => {
    const run = ++generation;
    const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .sort((a,b) => timestampMs(b.createdAt) - timestampMs(a.createdAt));
    const profiles = await profilesByUids(rows.map(item => item.followerUid));
    if (run !== generation) return;
    callback({ count: snapshot.size, rows, profiles });
  }, errorCallback);
}

function ensureStyles() {
  if (document.getElementById('jemmoSocialStyles')) return;
  const style = document.createElement('style');
  style.id = 'jemmoSocialStyles';
  style.textContent = `
    .jemmo-social-panel{margin:14px 0;border:1px solid #6b2b80;border-radius:23px;background:linear-gradient(155deg,#1b0424,#0b010f 74%);box-shadow:0 16px 44px #0008;overflow:hidden;color:#fff}
    .jemmo-social-panel-head{padding:15px 15px 10px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px}.jemmo-social-panel-head h2{margin:0;font-size:18px}.jemmo-social-panel-head p{margin:4px 0 0;color:#a997b0;font-size:10px}.jemmo-social-panel-head button{border:0;background:transparent;color:#ffd34e;font-size:10px;font-weight:1000}
    .jemmo-official-card{margin:0 12px 13px;padding:11px;border:1px solid #8b3ea5;border-radius:18px;background:radial-gradient(circle at 100% 0,#d432ff2b,transparent 38%),linear-gradient(135deg,#290636,#100117);display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:10px;align-items:center;text-decoration:none;color:#fff}.jemmo-official-avatar{width:54px;height:54px;border:2px solid #ca58ff;border-radius:17px;object-fit:cover;box-shadow:0 0 20px #c22cff55}.jemmo-official-copy{min-width:0}.jemmo-official-copy b{display:block;font-size:14px}.jemmo-official-copy b i{display:inline-grid;place-items:center;width:16px;height:16px;margin-left:3px;border-radius:50%;background:#408eff;color:#fff;font:1000 10px/1 sans-serif;font-style:normal}.jemmo-official-copy small{display:block;margin-top:4px;color:#cbbbd1;font-size:9px;line-height:1.35}.jemmo-follow-mini{min-width:76px;min-height:37px;padding:0 9px;border:0;border-radius:12px;background:linear-gradient(90deg,#ffd34e,#ff9447,#c437ff);color:#21031a;font-size:9px;font-weight:1000}.jemmo-follow-mini.following{border:1px solid #78418b;background:#25072e;color:#fff}
    .jemmo-following-title{padding:0 14px 8px;display:flex;align-items:center;justify-content:space-between;gap:10px}.jemmo-following-title b{font-size:12px}.jemmo-following-title span{color:#a997b0;font-size:9px}.jemmo-following-preview{padding:0 12px 13px;display:flex;gap:9px;overflow-x:auto;scrollbar-width:none}.jemmo-following-preview::-webkit-scrollbar{display:none}.jemmo-person-tile{width:78px;flex:0 0 78px;text-align:center;text-decoration:none;color:#fff}.jemmo-person-tile img,.jemmo-person-fallback{width:58px;height:58px;margin:auto;border:2px solid #8736a1;border-radius:50%;object-fit:cover;background:linear-gradient(145deg,#8d2db0,#21052a);display:grid;place-items:center;font-weight:1000;font-size:17px}.jemmo-person-tile b{display:block;margin-top:6px;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jemmo-person-tile small{display:block;margin-top:2px;color:#a997b0;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jemmo-social-empty{width:100%;padding:15px;border:1px dashed #5c2b6b;border-radius:15px;color:#a998af;text-align:center;font-size:10px;line-height:1.45}
    .jemmo-social-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px auto 0;max-width:330px}.jemmo-social-stat{min-height:55px;border:1px solid #603078;border-radius:15px;background:#120218;color:#fff}.jemmo-social-stat b{display:block;font-size:18px}.jemmo-social-stat span{display:block;margin-top:2px;color:#b7a7bd;font-size:9px;font-weight:850}
    .jemmo-public-follow{border:0!important;background:linear-gradient(90deg,#ffd34e,#ff9447,#bd38ff)!important;color:#22031b!important}.jemmo-public-follow.following{border:1px solid #73308c!important;background:#24062e!important;color:#fff!important}
    .jemmo-social-modal{position:fixed;z-index:2147483000;inset:0;padding:14px 10px calc(14px + env(safe-area-inset-bottom,0px));background:#030004dc;backdrop-filter:blur(7px);display:grid;place-items:end center}.jemmo-social-modal[hidden]{display:none!important}.jemmo-social-sheet{width:min(100%,520px);max-height:82svh;border:1px solid #81369a;border-radius:25px 25px 19px 19px;background:linear-gradient(180deg,#280634,#0d0111);box-shadow:0 -22px 70px #000;overflow:hidden}.jemmo-social-sheet-head{position:sticky;top:0;z-index:2;padding:14px;display:flex;align-items:center;justify-content:space-between;background:#21052bdc;border-bottom:1px solid #542264}.jemmo-social-sheet-head strong{font-size:18px}.jemmo-social-sheet-head button{width:39px;height:39px;border:1px solid #6b2e80;border-radius:12px;background:#370b42;color:#fff;font-size:24px}.jemmo-social-list{padding:10px;display:grid;gap:8px;overflow:auto;max-height:calc(82svh - 68px)}.jemmo-social-row{padding:9px;border:1px solid #552264;border-radius:16px;background:#130219;display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;color:#fff;text-decoration:none}.jemmo-social-row img,.jemmo-social-row .jemmo-person-fallback{width:48px;height:48px}.jemmo-social-row-copy{min-width:0}.jemmo-social-row-copy b,.jemmo-social-row-copy small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jemmo-social-row-copy b{font-size:12px}.jemmo-social-row-copy small{margin-top:3px;color:#aa99b1;font-size:8px}.jemmo-social-row-action{min-width:66px;min-height:35px;border:1px solid #6c2f81;border-radius:11px;background:#2a0734;color:#fff;font-size:8px;font-weight:1000}
    .jemmo-social-toast{position:fixed;z-index:2147483600;left:50%;bottom:calc(92px + env(safe-area-inset-bottom,0px));transform:translate(-50%,14px);width:min(calc(100% - 28px),420px);padding:12px 14px;border:1px solid #b23be0;border-radius:15px;background:#21042a;color:#fff;text-align:center;font:850 11px/1.4 Inter,system-ui,sans-serif;opacity:0;pointer-events:none;transition:.2s}.jemmo-social-toast.show{opacity:1;transform:translate(-50%,0)}
    .jemmo-messages-chili{margin:0 0 13px;padding:11px;border:1px solid #8a3da4;border-radius:18px;background:radial-gradient(circle at 90% 0,#d42fff24,transparent 38%),linear-gradient(135deg,#250631,#100117);display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:10px;align-items:center}.jemmo-messages-chili img{width:54px;height:54px;border:2px solid #bd49e8;border-radius:17px;object-fit:cover}.jemmo-messages-chili div{min-width:0}.jemmo-messages-chili b{display:block}.jemmo-messages-chili small{display:block;margin-top:4px;color:#bbaac1;font-size:9px;line-height:1.35}.jemmo-messages-chili a{min-height:38px;padding:0 11px;border-radius:12px;background:linear-gradient(90deg,#ffd34e,#c83cff);display:grid;place-items:center;color:#21031b;text-decoration:none;font-size:9px;font-weight:1000}
    .jemmo-chili-follow{min-height:42px;padding:0 14px;border:1px solid #ffd34e;border-radius:14px;background:linear-gradient(90deg,#ffd34e,#ff9a49,#ca3dff);color:#21031b;font-weight:1000}.jemmo-chili-follow.following{border-color:#a55cbd;background:#26062f;color:#fff}.jemmo-chili-follow-count{align-self:center;color:#f2d8ff;font-size:10px;font-weight:900}
    @media(max-width:390px){.jemmo-official-card{grid-template-columns:49px minmax(0,1fr) auto;margin-left:9px;margin-right:9px}.jemmo-official-avatar{width:49px;height:49px}.jemmo-follow-mini{min-width:68px}.jemmo-social-row{grid-template-columns:44px minmax(0,1fr) auto}.jemmo-social-row img,.jemmo-social-row .jemmo-person-fallback{width:44px;height:44px}}
  `;
  document.head.appendChild(style);
}

function toast(message, duration = 2600) {
  let element = document.getElementById('jemmoSocialToast');
  if (!element) {
    element = document.createElement('div');
    element.id = 'jemmoSocialToast';
    element.className = 'jemmo-social-toast';
    element.setAttribute('role', 'status');
    document.body.appendChild(element);
  }
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), duration);
}

function avatarHtml(profile, className = '') {
  const initials = clean(profile?.name || 'J', 2).split(/\s+/).map(word => word[0]).join('').slice(0,2).toUpperCase() || 'J';
  if (profile?.avatarData) return `<img class="${className}" src="${esc(profile.avatarData)}" alt="">`;
  return `<span class="jemmo-person-fallback ${className}">${esc(initials)}</span>`;
}

function profileHref(profile) {
  return profile.uid === CHILI_UID ? 'chili-ia.html' : `perfil-publico.html?uid=${encodeURIComponent(profile.uid)}`;
}

function profileSecondary(profile) {
  if (profile.uid === CHILI_UID) return '@chili.ia · Oficial';
  return profile.username ? `@${profile.username}` : (profile.publicId || 'Perfil JEMMO');
}

function ensureSocialModal() {
  let modal = document.getElementById('jemmoSocialModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'jemmoSocialModal';
  modal.className = 'jemmo-social-modal';
  modal.hidden = true;
  modal.innerHTML = `<section class="jemmo-social-sheet" role="dialog" aria-modal="true" aria-labelledby="jemmoSocialTitle"><header class="jemmo-social-sheet-head"><strong id="jemmoSocialTitle">Comunidad</strong><button id="jemmoSocialClose" type="button" aria-label="Cerrar">×</button></header><div class="jemmo-social-list" id="jemmoSocialList"></div></section>`;
  document.body.appendChild(modal);
  const close = () => { modal.hidden = true; document.body.style.overflow = ''; };
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  modal.querySelector('#jemmoSocialClose')?.addEventListener('click', close);
  return modal;
}

function renderModal(title, profiles, { ownFollowing = false } = {}) {
  const modal = ensureSocialModal();
  modal.querySelector('#jemmoSocialTitle').textContent = title;
  const list = modal.querySelector('#jemmoSocialList');
  list.innerHTML = '';
  if (!profiles.length) {
    list.innerHTML = '<div class="jemmo-social-empty">Todavía no hay personas en esta lista.</div>';
  } else {
    profiles.forEach(profile => {
      const row = document.createElement('div');
      row.className = 'jemmo-social-row';
      row.innerHTML = `${avatarHtml(profile)}<a class="jemmo-social-row-copy" href="${profileHref(profile)}"><b>${esc(profile.name)}${profile.verified ? ' ✓' : ''}</b><small>${esc(profileSecondary(profile))}</small></a>${ownFollowing ? `<button class="jemmo-social-row-action" type="button" data-social-unfollow="${esc(profile.uid)}">DEJAR</button>` : `<a class="jemmo-social-row-action" href="${profileHref(profile)}" style="display:grid;place-items:center;text-decoration:none">VER</a>`}`;
      list.appendChild(row);
    });
    if (ownFollowing) list.querySelectorAll('[data-social-unfollow]').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try { await unfollow(button.dataset.socialUnfollow); toast('Has dejado de seguir esta cuenta.'); }
        catch (error) { toast(socialError(error), 4500); button.disabled = false; }
      });
    });
  }
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function socialError(error) {
  const code = clean(error?.code || error?.message, 120);
  if (code.includes('permission-denied')) return 'Firebase bloqueó la relación. Publica las reglas sociales de PRUEBA 04.';
  if (code.includes('unavailable')) return 'No hay conexión con Firebase. Vuelve a intentarlo.';
  if (code.includes('self-follow')) return 'No puedes seguir tu propia cuenta.';
  return 'No se pudo completar la acción social.';
}

function officialCard({ compact = false } = {}) {
  const element = document.createElement('div');
  element.className = 'jemmo-official-card';
  element.innerHTML = `<a href="chili-ia.html"><img class="jemmo-official-avatar" src="chili-avatar.webp" alt="Chili IA"></a><a class="jemmo-official-copy" href="chili-ia.html" style="text-decoration:none;color:inherit"><b>Chili IA <i>✓</i></b><small>${compact ? 'Asistente oficial siempre disponible.' : 'Síguela para recibir ayuda, academia y novedades. La ayuda esencial está disponible aunque no la sigas.'}</small></a><button class="jemmo-follow-mini" type="button" data-follow-chili>SEGUIR</button>`;
  const button = element.querySelector('[data-follow-chili]');
  const refresh = async () => {
    if (!currentUser) return;
    const active = await isFollowing(CHILI_UID).catch(() => false);
    button.textContent = active ? 'SIGUIENDO' : 'SEGUIR';
    button.classList.toggle('following', active);
  };
  button.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    button.disabled = true;
    try {
      const active = await toggleFollow(CHILI_UID);
      toast(active ? 'Ahora sigues a Chili IA.' : 'Has dejado de seguir a Chili IA. Seguirá disponible como asistente oficial.');
      await refresh();
    } catch (error) { toast(socialError(error), 4500); }
    finally { button.disabled = false; }
  });
  refresh();
  return element;
}

function profileTile(profile) {
  const anchor = document.createElement('a');
  anchor.className = 'jemmo-person-tile';
  anchor.href = profileHref(profile);
  anchor.innerHTML = `${avatarHtml(profile)}<b>${esc(profile.name)}</b><small>${esc(profileSecondary(profile))}</small>`;
  return anchor;
}

function injectOwnProfile(user) {
  const card = document.querySelector('.profile-card');
  if (!card || document.getElementById('jemmoOwnSocial')) return;
  const panel = document.createElement('section');
  panel.className = 'jemmo-social-panel';
  panel.id = 'jemmoOwnSocial';
  panel.innerHTML = `<header class="jemmo-social-panel-head"><div><h2>Tu comunidad</h2><p>Seguidores y personas que sigues, sincronizados con Firebase.</p></div><button id="jemmoViewFollowing" type="button">VER TODOS</button></header><div id="jemmoOwnOfficial"></div><div class="jemmo-following-title"><b>Personas que sigues</b><span id="jemmoFollowingLabel">Cargando…</span></div><div class="jemmo-following-preview" id="jemmoFollowingPreview"><div class="jemmo-social-empty">Conectando tu comunidad…</div></div>`;
  card.insertAdjacentElement('afterend', panel);
  panel.querySelector('#jemmoOwnOfficial').appendChild(officialCard());

  let followingProfiles = [];
  let followerProfiles = [];
  const followerCount = document.getElementById('followersCount');
  const followingCount = document.getElementById('followingCount');
  const preview = panel.querySelector('#jemmoFollowingPreview');
  const label = panel.querySelector('#jemmoFollowingLabel');

  if (ownFollowingStop) ownFollowingStop();
  ownFollowingStop = subscribeFollowing(user.uid, result => {
    followingProfiles = result.profiles;
    if (followingCount) followingCount.textContent = String(result.count);
    label.textContent = `${result.count} seguidos`;
    preview.innerHTML = '';
    if (!followingProfiles.length) preview.innerHTML = '<div class="jemmo-social-empty">Todavía no sigues a nadie. Busca una persona por su ID JEMMO o empieza siguiendo a Chili.</div>';
    else followingProfiles.slice(0,8).forEach(profile => preview.appendChild(profileTile(profile)));
  }, error => { preview.innerHTML = `<div class="jemmo-social-empty">${esc(socialError(error))}</div>`; });

  if (ownFollowersStop) ownFollowersStop();
  ownFollowersStop = subscribeFollowers(user.uid, result => {
    followerProfiles = result.profiles;
    if (followerCount) followerCount.textContent = String(result.count);
  }, () => {});

  panel.querySelector('#jemmoViewFollowing').addEventListener('click', () => renderModal('Personas que sigues', followingProfiles, { ownFollowing: true }));
  document.querySelector('[data-action="Seguidores"]')?.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); renderModal('Tus seguidores', followerProfiles); }, true);
  document.querySelector('[data-action="Siguiendo"]')?.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); renderModal('Personas que sigues', followingProfiles, { ownFollowing: true }); }, true);
}

function ensurePublicProfileSocial(user, targetUid) {
  if (!targetUid) return;
  const identity = document.querySelector('.identity');
  const actions = document.getElementById('actions');
  if (!identity || !actions) return;

  let stats = document.getElementById('jemmoPublicSocialStats');
  if (!stats) {
    stats = document.createElement('div');
    stats.id = 'jemmoPublicSocialStats';
    stats.className = 'jemmo-social-stats';
    stats.innerHTML = `<button class="jemmo-social-stat" id="jemmoPublicFollowers" type="button"><b>0</b><span>Seguidores</span></button><button class="jemmo-social-stat" id="jemmoPublicFollowing" type="button"><b>0</b><span>Seguidos</span></button>`;
    identity.appendChild(stats);
  }

  let followingProfiles = [];
  let followerProfiles = [];
  if (publicFollowersStop) publicFollowersStop();
  publicFollowersStop = subscribeFollowers(targetUid, result => {
    followerProfiles = result.profiles;
    stats.querySelector('#jemmoPublicFollowers b').textContent = String(result.count);
  }, () => {});
  if (publicFollowingStop) publicFollowingStop();
  publicFollowingStop = subscribeFollowing(targetUid, result => {
    followingProfiles = result.profiles;
    stats.querySelector('#jemmoPublicFollowing b').textContent = String(result.count);
  }, () => {});
  stats.querySelector('#jemmoPublicFollowers').onclick = () => renderModal('Seguidores', followerProfiles);
  stats.querySelector('#jemmoPublicFollowing').onclick = () => renderModal('Personas que sigue', followingProfiles);

  if (user.uid !== targetUid) {
    let button = document.getElementById('jemmoPublicFollow');
    if (!button) {
      button = document.createElement('button');
      button.id = 'jemmoPublicFollow';
      button.type = 'button';
      button.className = 'jemmo-public-follow';
      actions.insertBefore(button, actions.firstChild);
    }
    const refresh = async () => {
      const active = await isFollowing(targetUid).catch(() => false);
      button.textContent = active ? 'SIGUIENDO ✓' : 'SEGUIR';
      button.classList.toggle('following', active);
    };
    button.onclick = async () => {
      button.disabled = true;
      try {
        const active = await toggleFollow(targetUid);
        toast(active ? 'Ahora sigues a esta persona.' : 'Has dejado de seguir esta persona.');
        await refresh();
      } catch (error) { toast(socialError(error), 4500); }
      finally { button.disabled = false; }
    };
    refresh();
  } else {
    document.getElementById('jemmoPublicFollow')?.remove();
  }

  if (!document.getElementById('jemmoPublicOfficial')) {
    const holder = document.createElement('section');
    holder.id = 'jemmoPublicOfficial';
    holder.className = 'jemmo-social-panel';
    holder.style.margin = '13px';
    holder.innerHTML = '<header class="jemmo-social-panel-head"><div><h2>Asistente oficial</h2><p>Chili está disponible para todos los perfiles.</p></div></header>';
    holder.appendChild(officialCard({ compact: true }));
    document.querySelector('.status')?.insertAdjacentElement('afterend', holder);
  }
}

function injectMessagesChili() {
  const listArea = document.getElementById('listArea');
  if (!listArea || document.getElementById('jemmoMessagesChili')) return;
  const card = document.createElement('section');
  card.id = 'jemmoMessagesChili';
  card.className = 'jemmo-messages-chili';
  card.innerHTML = `<img src="chili-avatar.webp" alt="Chili IA"><div><b>Chili IA ✓</b><small>Asistente oficial. Siempre disponible, aunque decidas no seguirla.</small></div><a href="chili-ia.html">ABRIR</a>`;
  listArea.insertBefore(card, listArea.firstChild);
}

function injectChiliFollow(user) {
  const actions = document.querySelector('.hero-actions');
  if (!actions || document.getElementById('jemmoChiliFollow')) return;
  const button = document.createElement('button');
  button.id = 'jemmoChiliFollow';
  button.className = 'jemmo-chili-follow';
  button.type = 'button';
  button.textContent = 'SEGUIR A CHILI';
  const count = document.createElement('span');
  count.id = 'jemmoChiliFollowerCount';
  count.className = 'jemmo-chili-follow-count';
  count.textContent = '0 seguidores';
  actions.append(button, count);

  const refresh = async () => {
    const active = await isFollowing(CHILI_UID, user.uid).catch(() => false);
    button.textContent = active ? 'SIGUIENDO A CHILI ✓' : 'SEGUIR A CHILI';
    button.classList.toggle('following', active);
  };
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const active = await toggleFollow(CHILI_UID, user.uid);
      toast(active ? 'Ahora sigues a Chili IA.' : 'Has dejado de seguir a Chili. La ayuda esencial seguirá disponible.');
      await refresh();
    } catch (error) { toast(socialError(error), 4500); }
    finally { button.disabled = false; }
  });
  refresh();
  if (chiliFollowingStop) chiliFollowingStop();
  chiliFollowingStop = subscribeFollowers(CHILI_UID, result => {
    count.textContent = `${result.count.toLocaleString('es-ES')} ${result.count === 1 ? 'seguidor' : 'seguidores'}`;
  }, () => {});
}

function startForUser(user) {
  currentUser = user;
  ensureStyles();
  ensureSocialModal();
  const page = pageName();
  if (page === 'yo.html') injectOwnProfile(user);
  if (page === 'perfil-publico.html') {
    const targetUid = new URLSearchParams(location.search).get('uid') || '';
    ensurePublicProfileSocial(user, targetUid);
    const observer = new MutationObserver(() => ensurePublicProfileSocial(user, targetUid));
    const actions = document.getElementById('actions');
    if (actions) observer.observe(actions, { childList: true, subtree: false });
    setTimeout(() => observer.disconnect(), 12000);
  }
  if (page === 'mensajes.html') injectMessagesChili();
  if (page === 'chili-ia.html') injectChiliFollow(user);
}

onAuthStateChanged(auth, user => {
  if (!user) return;
  startForUser(user);
});

window.addEventListener('jemmo-auth-ready', event => {
  if (currentUser || !auth.currentUser) return;
  startForUser(auth.currentUser);
});

window.JemmoSocial = {
  CHILI_UID,
  CHILI_PROFILE,
  follow,
  unfollow,
  toggleFollow,
  isFollowing,
  subscribeFollowing,
  subscribeFollowers,
  profileByUid,
  profilesByUids
};
