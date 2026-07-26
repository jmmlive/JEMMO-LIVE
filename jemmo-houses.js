/* JEMMO LIVE V1 · MI CASA Y ACCESO DIRECTO A SALA OFICIAL PRUEBA 24 */
const firebaseConfig = {
  apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
  authDomain: 'jemmo-live.firebaseapp.com',
  projectId: 'jemmo-live',
  storageBucket: 'jemmo-live.firebasestorage.app',
  messagingSenderId: '355540892255',
  appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
};

let firebasePromise = null;
async function firebaseServices() {
  if (firebasePromise) return firebasePromise;
  firebasePromise = Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
  ]).then(([appModule, authModule, firestore]) => {
    const app = appModule.getApps()[0] || appModule.initializeApp(firebaseConfig);
    return {
      ...firestore,
      auth: authModule.getAuth(app),
      db: firestore.getFirestore(app)
    };
  }).catch(error => {
    console.warn('JEMMO Casas: Firebase no disponible', error?.message || error);
    return null;
  });
  return firebasePromise;
}

const PREVIEW_HOUSES = [
  {
    id: 'padre', name: 'Casa Padre JEMMO', short: 'JM', country: 'Oficial', city: 'JEMMO LIVE', flag: '✦',
    emblem: '♛', members: 0, score: 0, rank: 1, status: 'open', featured: true, newHouse: false,
    accent: '#ffd329', glow: 'rgba(255,211,41,.22)',
    description: 'Casa oficial para orientación, novedades y actividades generales de la comunidad.'
  },
  {
    id: 'tenerife', name: 'Casa Tenerife', short: 'JT', country: 'España', city: 'Tenerife', flag: '🇪🇸',
    emblem: 'JT', members: 0, score: 0, rank: 2, status: 'battle', featured: true, newHouse: false,
    accent: '#ffd21a', glow: 'rgba(255,210,26,.22)',
    description: 'Vista previa de una comunidad canaria para directos, salas y Batallas de Casas.'
  },
  {
    id: 'unicornio', name: 'Casa Unicornio', short: 'CU', country: 'Internacional', city: 'Comunidad', flag: '🦄',
    emblem: '🦄', members: 0, score: 0, rank: 3, status: 'battle', featured: true, newHouse: false,
    accent: '#ff43ce', glow: 'rgba(255,67,206,.23)',
    description: 'Vista previa de una Casa creativa e internacional.'
  },
  {
    id: 'cuba', name: 'Casa Cuba', short: 'CC', country: 'Cuba', city: 'La Habana', flag: '🇨🇺',
    emblem: 'CU', members: 0, score: 0, rank: 4, status: 'open', featured: true, newHouse: false,
    accent: '#2ba9ff', glow: 'rgba(43,169,255,.21)',
    description: 'Vista previa de una comunidad adaptada a conexiones móviles.'
  },
  {
    id: 'madrid', name: 'Casa Madrid', short: 'CM', country: 'España', city: 'Madrid', flag: '🇪🇸',
    emblem: 'MD', members: 0, score: 0, rank: 5, status: 'open', featured: false, newHouse: false,
    accent: '#a45cff', glow: 'rgba(164,92,255,.20)',
    description: 'Vista previa de una comunidad de entretenimiento y nuevos talentos.'
  },
  {
    id: 'caribe', name: 'Casa Caribe', short: 'CA', country: 'Caribe', city: 'Comunidad', flag: '🌴',
    emblem: 'CB', members: 0, score: 0, rank: 6, status: 'open', featured: false, newHouse: true,
    accent: '#24e2c1', glow: 'rgba(36,226,193,.18)',
    description: 'Vista previa de una Casa para creadores y salas musicales del Caribe.'
  }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const cleanText = (value, max = 180) => String(value || '').trim().slice(0, max);
const lower = value => cleanText(value, 200).toLocaleLowerCase('es');
const number = value => Math.max(0, Number(value) || 0);
const formatNumber = value => Math.round(number(value)).toLocaleString('es-ES');
const escapeHtml = value => cleanText(value, 1000)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const timestampMillis = value => {
  if (value?.toMillis) return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  return number(value);
};
const formatDateTime = value => {
  const ms = timestampMillis(value);
  if (!ms) return 'Ahora';
  try { return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ms)); }
  catch { return new Date(ms).toLocaleString('es-ES'); }
};

function activeUid() {
  if (window.__jemmoAuthenticatedUid) return String(window.__jemmoAuthenticatedUid);
  try { return localStorage.getItem('jemmo_active_uid') || sessionStorage.getItem('jemmo_active_uid') || ''; } catch { return ''; }
}

function readJson(storage, key, fallback = null) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch { return fallback; }
}
function writeJson(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
function removeStorage(storage, key) { try { storage.removeItem(key); } catch {} }

function requestKey(uid = activeUid()) { return `jemmo_house_request_v2_${uid || 'guest'}`; }
function membershipKey(uid = activeUid()) { return `jemmo_house_membership_v2_${uid || 'guest'}`; }
function readLocalRequest(uid = activeUid()) { return readJson(localStorage, requestKey(uid), null); }
function writeLocalRequest(data, uid = activeUid()) {
  if (data) writeJson(localStorage, requestKey(uid), data);
  else removeStorage(localStorage, requestKey(uid));
}
function readLocalMembership(uid = activeUid()) { return readJson(localStorage, membershipKey(uid), null); }
function writeLocalMembership(data, uid = activeUid()) {
  if (data) writeJson(localStorage, membershipKey(uid), data);
  else removeStorage(localStorage, membershipKey(uid));
}

function localProfile(uid = activeUid()) {
  if (!uid) return {};
  return readJson(localStorage, `jemmo_profile_v1_${uid}`, {}) || {};
}

function ownerSecurityUid() {
  return cleanText(readJson(localStorage, 'jemmo_owner_security_v1', {})?.ownerUid, 160);
}

function normalizeRole(value) {
  const role = lower(value).replaceAll('á', 'a');
  if (['owner', 'propietario', 'superadmin'].includes(role)) return 'owner';
  if (['admin', 'administrador'].includes(role)) return 'admin';
  if (['agent', 'agente'].includes(role)) return 'agent';
  return 'user';
}

function normalizeHouse(raw, fallback = {}) {
  const source = raw || {};
  const rawId = source.id || source.houseId || fallback.id;
  const id = cleanText(rawId, 80).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || fallback.id || 'casa-jemmo';
  const active = source.active !== false && source.activa !== false && source.status !== 'disabled';
  return {
    ...fallback,
    id,
    name: cleanText(source.name || source.nombre || source.houseName || fallback.name, 48) || 'Casa JEMMO',
    short: cleanText(source.short || source.siglas || fallback.short, 4).toUpperCase(),
    country: cleanText(source.country || source.pais || fallback.country, 40),
    city: cleanText(source.city || source.ciudad || fallback.city, 40),
    flag: cleanText(source.flag || source.bandera || fallback.flag, 8),
    emblem: cleanText(source.emblem || source.emblema || fallback.emblem || source.short, 8),
    members: number(source.memberCount ?? source.members ?? source.miembros ?? fallback.members),
    score: number(source.score ?? source.puntos ?? fallback.score),
    rank: Math.max(1, number(source.rank ?? source.posicion ?? fallback.rank) || 999),
    status: ['battle', 'open', 'closed'].includes(source.status) ? source.status : (source.open === false ? 'closed' : (fallback.status || 'open')),
    featured: source.featured === true || source.destacada === true || fallback.featured === true,
    newHouse: source.newHouse === true || source.nueva === true || fallback.newHouse === true,
    accent: cleanText(source.accent || source.color || fallback.accent, 24) || '#c441ec',
    glow: cleanText(source.glow || fallback.glow, 64) || 'rgba(196,65,236,.18)',
    description: cleanText(source.description || source.descripcion || fallback.description, 220) || 'Comunidad de JEMMO LIVE.',
    ownerUid: cleanText(source.ownerUid || source.propietarioUid || fallback.ownerUid, 160),
    adminUids: Array.isArray(source.adminUids) ? source.adminUids.map(uid => cleanText(uid, 160)).filter(Boolean).slice(0, 80) : (fallback.adminUids || []),
    active,
    cloud: source.cloud === true || fallback.cloud === true,
    preview: source.preview === true || fallback.preview === true
  };
}

const state = {
  uid: activeUid(),
  services: null,
  identity: { displayName: 'Usuario JEMMO', role: 'user' },
  platformAdmin: false,
  houses: PREVIEW_HOUSES.map(item => normalizeHouse({ ...item, preview: true }, { ...item, preview: true })),
  currentFilter: 'all',
  currentQuery: '',
  pendingRequest: readLocalRequest(),
  membership: readLocalMembership(),
  selectedHouse: null,
  workspaceHouse: null,
  workspaceTab: 'home',
  workspaceAsPlatformAdmin: false,
  members: [],
  requests: [],
  notices: [],
  messages: [],
  creationRequests: [],
  houseAdmin: false,
  houseOwner: false,
  actualHouseOwner: false,
  actualHouseAdmin: false,
  simulatedRole: '',
  cloudReady: false,
  bootstrappedMother: false,
  chatLastSentAt: 0,
  unsubscribers: [],
  ownUnsubscribers: []
};

function toast(message, mode = '') {
  const element = $('#demoToast');
  if (!element) return;
  element.textContent = cleanText(message, 220);
  element.className = `demo-toast show ${mode}`.trim();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { element.className = 'demo-toast'; }, 3200);
}

function setCloudState(message, mode = '') {
  const target = $('#houseCloudState');
  if (!target) return;
  target.textContent = message;
  target.dataset.mode = mode;
}

function cardStyle(house) {
  return `--house-accent:${escapeHtml(house.accent)};--house-glow:${escapeHtml(house.glow)}`;
}

function houseById(id) {
  return state.houses.find(house => house.id === id) || null;
}

function activeRequest(request = state.pendingRequest) {
  return request && ['pending', 'reviewing'].includes(cleanText(request.status || 'pending', 30));
}

function requestFor(house) {
  return activeRequest() && state.pendingRequest?.houseId === house.id;
}

function sameMembership(house) {
  return state.membership?.houseId === house.id && state.membership?.status !== 'left';
}

function membershipCanManage() {
  const role = lower(state.membership?.role || 'member');
  const position = lower(state.membership?.position || state.membership?.housePosition || 'member');
  return Boolean(state.platformAdmin || ['owner','admin','agent','propietario','administrador','agente'].includes(role) || position === 'agent');
}

function permanentHouseRoomUrl(house = houseById(state.membership?.houseId)) {
  const houseId = cleanText(state.membership?.houseId || house?.id, 80);
  const houseName = cleanText(house?.name || state.membership?.houseName || 'Mi Casa', 60);
  const url = new URL('salas.html', location.href);
  url.searchParams.set('houseRoom', '1');
  url.searchParams.set('direct', '1');
  url.searchParams.set('house', houseId);
  url.searchParams.set('houseName', houseName);
  url.searchParams.set('mode', 'audio');
  url.searchParams.set('count', '20');
  url.searchParams.set('title', `Sala 24/7 de ${houseName}`);
  url.searchParams.set('description', 'Audio Room oficial de la Casa para miembros, emisores, tareas y comunidad.');
  return url.href;
}

function openMembershipDestination(house = houseById(state.membership?.houseId), preferManagement = false) {
  if (!house) return;
  if (preferManagement && membershipCanManage()) { openWorkspace(house); return; }
  location.href = permanentHouseRoomUrl(house);
}

function matchesFilter(house) {
  if (state.currentFilter === 'battle') return house.status === 'battle';
  if (state.currentFilter === 'open') return house.status === 'open' || house.status === 'battle';
  if (state.currentFilter === 'new') return house.newHouse;
  if (state.currentFilter === 'real') return house.cloud && house.active;
  return true;
}

function matchesQuery(house) {
  if (!state.currentQuery) return true;
  const haystack = `${house.name} ${house.country} ${house.city} ${house.description}`.toLocaleLowerCase('es');
  return haystack.includes(state.currentQuery);
}

function renderHome() {
  const target = $('#homeHouseGrid');
  if (!target) return;
  const real = state.houses.filter(house => house.cloud && house.active);
  const source = real.length ? real : state.houses;
  const featured = source.filter(house => house.featured).slice(0, 5);
  target.innerHTML = featured.map(house => `
    <a class="home-house-card" href="casa-demo.html?casa=${encodeURIComponent(house.id)}" style="${cardStyle(house)}">
      <span class="home-house-top"><span class="home-house-emblem">${escapeHtml(house.emblem || house.short)}</span>${house.status === 'battle' ? '<span class="house-live">EN BATALLA</span>' : ''}${house.preview ? '<span class="house-preview-tag">VISTA PREVIA</span>' : ''}</span>
      <h3>${escapeHtml(house.name)}</h3>
      <p>${escapeHtml(house.flag)} ${escapeHtml(house.city || house.country)}</p>
      <span class="home-house-stats"><b>${formatNumber(house.members)} miembros</b><b>${formatNumber(house.score)} pts</b></span>
    </a>`).join('');
  const join = $('#homeHouseJoin');
  if (join) {
    if (state.membership?.houseId) {
      const ownHouse = houseById(state.membership.houseId) || normalizeHouse({ id: state.membership.houseId, name: state.membership.houseName, cloud: true });
      join.textContent = 'ENTRAR A AUDIO ROOM DE MI CASA';
      join.href = permanentHouseRoomUrl(ownHouse);
    } else if (activeRequest()) {
      join.textContent = 'VER MI SOLICITUD';
      join.href = 'casa-demo.html?solicitud=1';
    } else {
      join.textContent = 'UNIRME A UNA CASA';
      join.href = 'casa-demo.html#explorar';
    }
  }
}

function renderExplorer() {
  const target = $('#houseExplorerGrid');
  if (!target) return;
  const filtered = state.houses.filter(house => matchesFilter(house) && matchesQuery(house) && house.active);
  const count = $('#houseResultCount');
  if (count) count.textContent = `${filtered.length} ${filtered.length === 1 ? 'Casa' : 'Casas'}`;
  if (!filtered.length) {
    target.innerHTML = '<div class="house-empty">No encontramos Casas con esos filtros. Prueba otra búsqueda.</div>';
    return;
  }
  target.innerHTML = filtered.map(house => {
    const isMine = sameMembership(house);
    const requested = requestFor(house);
    const action = isMine ? (membershipCanManage() ? 'GESTIONAR' : 'AUDIO ROOM') : house.preview ? 'VISTA' : requested ? 'PENDIENTE' : 'SOLICITAR';
    return `
      <article class="house-card ${house.preview ? 'preview' : 'real'}" style="${cardStyle(house)}" data-house-card="${escapeHtml(house.id)}">
        <div class="house-card-head"><span class="house-card-emblem">${escapeHtml(house.emblem || house.short)}</span><span class="house-card-rank">#${house.rank}</span></div>
        <div class="house-card-badges">${house.preview ? '<span>VISTA PREVIA</span>' : '<span class="real">CASA ACTIVA</span>'}${house.status === 'battle' ? '<span class="battle">EN BATALLA</span>' : ''}</div>
        <h3>${escapeHtml(house.name)}</h3>
        <div class="house-card-location">${escapeHtml(house.flag)} ${escapeHtml(house.city || house.country)}</div>
        <p class="house-card-description">${escapeHtml(house.description)}</p>
        <div class="house-card-stats"><span><small>MIEMBROS</small><b>${formatNumber(house.members)}</b></span><span><small>PUNTOS</small><b>${formatNumber(house.score)}</b></span></div>
        <div class="house-card-actions">
          <button class="house-details-button" type="button" data-house-details="${escapeHtml(house.id)}">VER</button>
          <button class="house-join-button ${requested ? 'requested' : ''} ${isMine ? 'mine' : ''}" type="button" data-house-action="${escapeHtml(house.id)}">${action}</button>
        </div>
      </article>`;
  }).join('');
}

function renderRanking() {
  const target = $('#houseRanking');
  if (!target) return;
  const real = state.houses.filter(house => house.cloud && house.active);
  const source = real.length ? real : state.houses;
  target.innerHTML = [...source].sort((a, b) => a.rank - b.rank || b.score - a.score).slice(0, 8).map((house, index) => `
    <button class="house-rank-row" type="button" data-house-details="${escapeHtml(house.id)}" style="--house-accent:${escapeHtml(house.accent)}">
      <span class="house-rank-position">${index + 1}</span>
      <span class="house-rank-emblem">${escapeHtml(house.emblem || house.short)}</span>
      <span><h3>${escapeHtml(house.name)}</h3><small>${house.preview ? 'VISTA PREVIA' : `${escapeHtml(house.flag)} ${formatNumber(house.members)} miembros`}</small></span>
      <span class="house-rank-score"><b>${formatNumber(house.score)}</b><small>PUNTOS</small></span>
    </button>`).join('');
}

function renderMyHouse() {
  const panel = $('#myHousePanel');
  if (!panel) return;
  if (state.membership?.houseId) {
    const house = houseById(state.membership.houseId) || normalizeHouse({ id: state.membership.houseId, name: state.membership.houseName, cloud: true });
    panel.hidden = false;
    panel.innerHTML = `
      <div class="my-house-main" style="${cardStyle(house)}">
        <span class="my-house-emblem">${escapeHtml(house.emblem || house.short || '♛')}</span>
        <div><span class="request-badge accepted">MI CASA · ${escapeHtml((state.membership.position || state.membership.role || 'member').toUpperCase())}</span><h2>${escapeHtml(house.name)}</h2><p>Tu membresía está activa. La Sala oficial de audio está disponible directamente desde aquí.</p></div>
      </div>
      <button class="my-house-open" type="button" data-open-my-house-room>ENTRAR A AUDIO ROOM DE MI CASA</button>
      <div class="request-actions"><button type="button" data-house-details="${escapeHtml(house.id)}">VER MI CASA</button><button type="button" data-explore-other-houses>EXPLORAR OTRAS CASAS</button>${membershipCanManage() ? '<button type="button" data-open-my-house>GESTIONAR CASA</button>' : ''}</div>`;
    return;
  }
  if (state.pendingRequest) {
    const status = cleanText(state.pendingRequest.status || 'pending', 30);
    const rejected = status === 'rejected';
    const cancelled = status === 'cancelled';
    if (cancelled) {
      state.pendingRequest = null;
      writeLocalRequest(null);
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const statusText = rejected ? 'SOLICITUD RECHAZADA' : status === 'accepted' ? 'ACEPTADA · ACTUALIZANDO' : 'SOLICITUD PENDIENTE';
    panel.innerHTML = `
      <span class="request-badge ${rejected ? 'rejected' : ''}">${escapeHtml(statusText)}</span>
      <h2>${escapeHtml(state.pendingRequest.houseName || 'Casa solicitada')}</h2>
      <p>${rejected ? 'La Casa no aceptó esta solicitud. Puedes eliminarla y solicitar otra.' : 'La solicitud está en la bandeja de administración de la Casa.'}</p>
      <div class="request-actions">
        <button type="button" data-request-details>VER ESTADO</button>
        <button type="button" class="danger" data-cancel-request>${rejected ? 'ELIMINAR' : 'CANCELAR SOLICITUD'}</button>
      </div>`;
    return;
  }
  panel.hidden = true;
}

function renderAll() {
  renderHome();
  renderExplorer();
  renderRanking();
  renderMyHouse();
  renderWorkspace();
}

function setModalVisibility(modal, visible) {
  const backdrop = $('#houseModalBackdrop');
  if (backdrop) backdrop.hidden = !visible;
  modal?.classList.toggle('open', visible);
  modal?.setAttribute('aria-hidden', String(!visible));
  document.body.style.overflow = visible ? 'hidden' : '';
}

function closeAllModals() {
  $$('.house-modal.open').forEach(modal => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  });
  const backdrop = $('#houseModalBackdrop');
  if (backdrop) backdrop.hidden = true;
  document.body.style.overflow = '';
}

function joinButtonCopy(house) {
  if (sameMembership(house)) return membershipCanManage() ? 'GESTIONAR MI CASA' : 'ENTRAR A AUDIO ROOM';
  if (state.platformAdmin && house.cloud && !house.preview) return 'ADMINISTRAR CASA';
  if (house.preview) return state.platformAdmin ? 'ACTIVAR CASA REAL' : 'CASA DE MUESTRA';
  if (requestFor(house)) return 'CANCELAR SOLICITUD';
  if (state.membership?.houseId) return 'YA PERTENECES A UNA CASA';
  if (activeRequest()) return 'YA TIENES OTRA SOLICITUD';
  if (house.status === 'closed') return 'SOLICITUDES CERRADAS';
  return 'SOLICITAR UNIRME';
}

function openHouse(house, actionFirst = false) {
  const modal = $('#houseModal');
  const content = $('#houseModalContent');
  if (!modal || !content || !house) return;
  state.selectedHouse = house;
  const isMine = sameMembership(house);
  const requested = requestFor(house);
  const disabled = (!isMine && !requested && !house.preview && (Boolean(state.membership?.houseId) || activeRequest() || house.status === 'closed')) || (house.preview && !state.platformAdmin);
  content.innerHTML = `
    <div class="house-modal-head" style="--house-accent:${escapeHtml(house.accent)}">
      <span>${escapeHtml(house.emblem || house.short)}</span>
      <div><small>${house.preview ? 'VISTA PREVIA · SIN DATOS REALES' : house.status === 'battle' ? 'CASA ACTIVA · EN BATALLA' : 'CASA ACTIVA EN JEMMO LIVE'}</small><h2 id="houseModalTitle">${escapeHtml(house.name)}</h2></div>
    </div>
    <p class="house-modal-copy">${escapeHtml(house.description)}</p>
    <div class="house-modal-facts"><div><small>UBICACIÓN</small><b>${escapeHtml(house.flag)} ${escapeHtml(house.city || house.country)}</b></div><div><small>MIEMBROS</small><b>${formatNumber(house.members)}</b></div><div><small>RANKING</small><b>#${house.rank}</b></div></div>
    ${house.preview ? '<div class="house-preview-warning">Esta ficha es una vista previa de diseño. No tiene miembros ni actividad real hasta que el propietario la active.</div>' : ''}
    <button class="house-confirm" id="confirmHouseAction" type="button" ${disabled ? 'disabled' : ''}>${escapeHtml(joinButtonCopy(house))}</button>
    <p class="house-modal-note" id="houseJoinStatus">${house.preview ? (state.platformAdmin ? 'Al activarla se creará en Firestore como Casa real.' : 'Solo el propietario de JEMMO LIVE puede activar esta Casa.') : 'Las solicitudes se revisan desde el panel de administración de la Casa.'}</p>`;
  setModalVisibility(modal, true);
  $('#confirmHouseAction')?.addEventListener('click', () => handleHouseAction(house));
  if (actionFirst) setTimeout(() => $('#confirmHouseAction')?.focus(), 80);
}

async function handleHouseAction(house) {
  if (state.platformAdmin && house.cloud && !house.preview && !sameMembership(house)) {
    closeAllModals();
    openWorkspace(house, true);
    return;
  }
  if (sameMembership(house)) {
    closeAllModals();
    openMembershipDestination(house, true);
    return;
  }
  if (house.preview) {
    await activatePreviewHouse(house);
    return;
  }
  if (requestFor(house)) {
    await cancelJoinRequest();
    closeAllModals();
    return;
  }
  await requestJoin(house);
}

async function loadIdentity() {
  state.uid = activeUid();
  const local = localProfile(state.uid);
  state.identity = {
    uid: state.uid,
    displayName: cleanText(local.name || local.displayName || local.username || 'Usuario JEMMO', 48),
    publicId: cleanText(local.publicId || local.id, 48),
    avatarData: cleanText(local.avatarData, 800000),
    role: normalizeRole(local.role || local.rol)
  };
  if (!state.services || !state.uid) {
    state.platformAdmin = ownerSecurityUid() === state.uid || state.identity.role === 'owner';
    return;
  }
  try {
    const snapshot = await state.services.getDoc(state.services.doc(state.services.db, 'users', state.uid));
    if (snapshot.exists()) {
      const data = snapshot.data() || {};
      state.identity = {
        ...state.identity,
        displayName: cleanText(data.displayName || data.nombre || data.name || state.identity.displayName, 48),
        publicId: cleanText(data.publicId || data.profileId || state.identity.publicId, 48),
        avatarData: cleanText(data.avatarData || state.identity.avatarData, 800000),
        role: normalizeRole(data.role || data.rol || data.accountRole || state.identity.role)
      };
    }
  } catch (error) {
    console.warn('JEMMO Casas: identidad local activa', error?.code || error);
  }
  state.platformAdmin = ownerSecurityUid() === state.uid || state.identity.role === 'owner';
}

async function ensureFatherHouseForOwner() {
  if (!state.services || !state.uid || !state.platformAdmin || state.bootstrappedMother) return;
  state.bootstrappedMother = true;
  const s = state.services;
  try {
    await s.runTransaction(s.db, async transaction => {
      const houseRef = s.doc(s.db, 'casas', 'padre');
      const memberRef = s.doc(s.db, 'casas', 'padre', 'miembros', state.uid);
      const legacyHouseRef = s.doc(s.db, 'casas', 'madre');
      const legacyMemberRef = s.doc(s.db, 'casas', 'madre', 'miembros', state.uid);
      const userRef = s.doc(s.db, 'users', state.uid);
      const ownRequestRef = s.doc(s.db, 'solicitudesCasa', state.uid);
      const houseSnap = await transaction.get(houseRef);
      const memberSnap = await transaction.get(memberRef);
      const legacyHouseSnap = await transaction.get(legacyHouseRef);
      const legacyMemberSnap = await transaction.get(legacyMemberRef);
      const userSnap = await transaction.get(userRef);
      const ownRequestSnap = await transaction.get(ownRequestRef);
      const userData = userSnap.data() || {};
      const houseData = houseSnap.exists() ? (houseSnap.data() || {}) : (legacyHouseSnap.data() || {});
      const base = PREVIEW_HOUSES[0];
      transaction.set(houseRef, {
        name: base.name, short: base.short, country: base.country, city: base.city, flag: base.flag,
        emblem: base.emblem, description: base.description, accent: base.accent, glow: base.glow,
        ownerUid: state.uid, adminUids: s.arrayUnion(state.uid), active: true, open: true,
        status: cleanText(houseData.status || 'open', 20), featured: true, official: true,
        score: number(houseData.score), rank: Math.max(1, number(houseData.rank) || 1),
        memberCount: Math.max(1, number(houseData.memberCount ?? houseData.members)),
        migratedFrom: legacyHouseSnap.exists() ? 'madre' : s.deleteField(),
        updatedAt: s.serverTimestamp(), createdAt: houseSnap.exists() ? (houseData.createdAt || s.serverTimestamp()) : (houseData.createdAt || s.serverTimestamp())
      }, { merge: true });
      const legacyMember = legacyMemberSnap.data() || {};
      transaction.set(memberRef, {
        uid: state.uid, displayName: state.identity.displayName, publicId: state.identity.publicId,
        role: 'owner', housePosition: 'owner', accountRole: cleanText(userData.role || 'owner', 30), status: 'active',
        joinedAt: memberSnap.exists() ? (memberSnap.data()?.joinedAt || s.serverTimestamp()) : (legacyMember.joinedAt || s.serverTimestamp()),
        updatedAt: s.serverTimestamp()
      }, { merge: true });
      if (!cleanText(userData.houseId, 80) || userData.houseId === 'madre') {
        transaction.set(userRef, {
          houseId: 'padre', houseName: base.name, houseRole: 'owner', housePosition: 'owner', houseStatus: 'active',
          houseJoinedAt: userData.houseJoinedAt || s.serverTimestamp(), houseUpdatedAt: s.serverTimestamp(),
          houseRequestId: s.deleteField(), houseRequestName: s.deleteField(), houseRequestStatus: s.deleteField()
        }, { merge: true });
      }
      if (legacyHouseSnap.exists()) {
        transaction.set(legacyHouseRef, {
          active: false, open: false, status: 'disabled', migratedTo: 'padre',
          migrationLabel: 'Casa Padre JEMMO', updatedAt: s.serverTimestamp()
        }, { merge: true });
      }
      if (legacyMemberSnap.exists()) transaction.delete(legacyMemberRef);
      if (ownRequestSnap.exists() && ['pending', 'reviewing'].includes(cleanText(ownRequestSnap.data()?.status, 30))) {
        transaction.set(ownRequestRef, {
          status: ['padre','madre'].includes(ownRequestSnap.data()?.houseId) ? 'accepted' : 'cancelled',
          houseId: 'padre', houseName: base.name,
          reviewedBy: state.uid, reviewedAt: s.serverTimestamp(), updatedAt: s.serverTimestamp(),
          reviewNote: 'Cerrada al activar la propiedad de Casa Padre JEMMO.'
        }, { merge: true });
      }
    });
    setCloudState('Casas conectadas · Casa Padre operativa', 'online');
  } catch (error) {
    state.bootstrappedMother = false;
    console.warn('JEMMO Casas: no se pudo activar Casa Padre', error?.code || error);
  }
}

async function activatePreviewHouse(house) {
  const status = $('#houseJoinStatus');
  const button = $('#confirmHouseAction');
  if (!state.platformAdmin) {
    if (status) status.textContent = 'Esta acción es exclusiva del propietario de JEMMO LIVE.';
    return;
  }
  if (!state.services || !navigator.onLine) {
    if (status) status.textContent = 'Necesitas conexión para activar una Casa real.';
    return;
  }
  if (button) { button.disabled = true; button.textContent = 'ACTIVANDO…'; }
  try {
    const s = state.services;
    await s.setDoc(s.doc(s.db, 'casas', house.id), {
      name: house.name, short: house.short, country: house.country, city: house.city, flag: house.flag,
      emblem: house.emblem, description: house.description.replace(/^Vista previa de /i, ''),
      accent: house.accent, glow: house.glow, ownerUid: state.uid, adminUids: [state.uid],
      active: true, open: true, status: house.status, featured: house.featured, newHouse: house.newHouse,
      memberCount: 0, score: 0, rank: house.rank, createdBy: state.uid,
      createdAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
    }, { merge: false });
    await loadCloudHouses();
    const real = houseById(house.id);
    if (status) status.textContent = 'Casa activada en Firestore. Ya puede recibir solicitudes reales.';
    if (button) { button.textContent = 'CASA ACTIVA'; button.disabled = true; }
    toast(`${house.name} ya es una Casa real.`, 'success');
    renderAll();
    if (real) state.selectedHouse = real;
  } catch (error) {
    if (status) status.textContent = `No se pudo activar: ${friendlyError(error)}`;
    if (button) { button.disabled = false; button.textContent = 'REINTENTAR'; }
  }
}

async function loadCloudHouses() {
  if (!state.services || !navigator.onLine) return state.houses;
  try {
    const snapshot = await state.services.getDocs(state.services.collection(state.services.db, 'casas'));
    const cloudById = new Map();
    snapshot.docs.slice(0, 120).forEach(document => {
      const fallback = PREVIEW_HOUSES.find(item => item.id === document.id) || {};
      const house = normalizeHouse({ id: document.id, ...document.data(), cloud: true, preview: false }, fallback);
      if (house.active) cloudById.set(house.id, house);
    });
    const previews = PREVIEW_HOUSES
      .filter(item => !cloudById.has(item.id))
      .map(item => normalizeHouse({ ...item, preview: true }, { ...item, preview: true }));
    state.houses = [...cloudById.values(), ...previews].sort((a, b) => a.rank - b.rank || b.score - a.score);
    state.cloudReady = true;
    setCloudState(cloudById.size ? `${cloudById.size} Casas reales conectadas` : 'Sin Casas reales: se muestran vistas previas', cloudById.size ? 'online' : 'warning');
  } catch (error) {
    state.cloudReady = false;
    setCloudState('Sin conexión con Casas · modo de vista previa', 'offline');
    console.warn('JEMMO Casas: catálogo local activo', error?.code || error);
  }
  return state.houses;
}

function ownStateFromUser(data = {}) {
  const houseId = cleanText(data.houseId, 80);
  if (!houseId) return null;
  return {
    houseId,
    houseName: cleanText(data.houseName, 48),
    role: cleanText(data.houseRole || 'member', 20),
    position: cleanText(data.housePosition || 'member', 30),
    assignedAgentUid: cleanText(data.assignedAgentUid, 160),
    status: cleanText(data.houseStatus || 'active', 20),
    joinedAt: timestampMillis(data.houseJoinedAt) || Date.now()
  };
}

function ownRequestFromData(data = {}) {
  const houseId = cleanText(data.houseId, 80);
  if (!houseId) return null;
  return {
    houseId,
    houseName: cleanText(data.houseName || data.nombreCasa, 48),
    country: cleanText(data.country || data.pais, 40),
    status: cleanText(data.status || data.estado || 'pending', 24),
    requestedAt: timestampMillis(data.requestedAt) || number(data.requestedAtClient) || Date.now(),
    reviewedAt: timestampMillis(data.reviewedAt),
    reviewNote: cleanText(data.reviewNote, 160)
  };
}

function subscribeOwnState() {
  state.ownUnsubscribers.forEach(unsub => { try { unsub(); } catch {} });
  state.ownUnsubscribers = [];
  if (!state.services || !state.uid) return;
  const s = state.services;
  const userUnsub = s.onSnapshot(s.doc(s.db, 'users', state.uid), snapshot => {
    const membership = snapshot.exists() ? ownStateFromUser(snapshot.data()) : null;
    state.membership = membership;
    writeLocalMembership(membership);
    renderAll();
    if (membership?.houseId && $('#houseWorkspace') && !$('#houseWorkspace').hidden) {
      const house = houseById(membership.houseId);
      if (house && state.workspaceHouse?.id !== house.id) openWorkspace(house);
    }
  }, error => console.warn('JEMMO Casas: estado de membresía', error?.code || error));
  const requestUnsub = s.onSnapshot(s.doc(s.db, 'solicitudesCasa', state.uid), snapshot => {
    const request = snapshot.exists() ? ownRequestFromData(snapshot.data()) : null;
    state.pendingRequest = request;
    writeLocalRequest(request);
    renderAll();
  }, error => console.warn('JEMMO Casas: estado de solicitud', error?.code || error));
  state.ownUnsubscribers.push(userUnsub, requestUnsub);
}

function friendlyError(error) {
  const message = cleanText(error?.message || error, 240);
  const code = cleanText(error?.code, 100);
  const marker = `${code} ${message}`;
  if (marker.includes('ALREADY_MEMBER')) return 'Ya perteneces a una Casa.';
  if (marker.includes('REQUEST_EXISTS')) return 'Ya tienes una solicitud pendiente.';
  if (marker.includes('HOUSE_CLOSED')) return 'Esta Casa no acepta solicitudes ahora.';
  if (marker.includes('NOT_ADMIN')) return 'No tienes permiso para administrar esta Casa.';
  if (marker.includes('OWNER_CANNOT_LEAVE')) return 'El propietario no puede abandonar su propia Casa.';
  if (marker.includes('permission-denied')) return 'Firestore bloqueó esta acción. Hay que actualizar las reglas de Casas.';
  if (marker.includes('unavailable') || marker.includes('network')) return 'No hay conexión estable. Inténtalo de nuevo.';
  return message || 'Ocurrió un error inesperado.';
}

async function requestJoin(house) {
  const uid = state.uid || activeUid();
  const button = $('#confirmHouseAction');
  const status = $('#houseJoinStatus');
  if (!uid) {
    if (status) status.textContent = 'No se pudo confirmar tu sesión. Vuelve a iniciar sesión.';
    return;
  }
  if (!house.cloud || house.preview) {
    if (status) status.textContent = 'Esta ficha es solo una vista previa y todavía no puede recibir solicitudes.';
    return;
  }
  if (!state.services || !navigator.onLine) {
    if (status) status.textContent = 'Necesitas conexión para enviar una solicitud real.';
    return;
  }
  if (button) { button.disabled = true; button.textContent = 'ENVIANDO…'; }
  const s = state.services;
  try {
    await s.runTransaction(s.db, async transaction => {
      const userRef = s.doc(s.db, 'users', uid);
      const requestRef = s.doc(s.db, 'solicitudesCasa', uid);
      const houseRef = s.doc(s.db, 'casas', house.id);
      const inboxRef = s.doc(s.db, 'casas', house.id, 'solicitudes', uid);
      const userSnap = await transaction.get(userRef);
      const requestSnap = await transaction.get(requestRef);
      const houseSnap = await transaction.get(houseRef);
      const userData = userSnap.data() || {};
      const requestData = requestSnap.data() || {};
      const houseData = houseSnap.data() || {};
      if (cleanText(userData.houseId, 80)) throw new Error('ALREADY_MEMBER');
      if (requestSnap.exists() && ['pending', 'reviewing'].includes(cleanText(requestData.status, 30))) throw new Error('REQUEST_EXISTS');
      if (!houseSnap.exists() || houseData.active === false || houseData.open === false || houseData.status === 'closed') throw new Error('HOUSE_CLOSED');
      const payload = {
        uid, applicantName: state.identity.displayName, applicantPublicId: state.identity.publicId,
        houseId: house.id, houseName: house.name, country: house.country,
        status: 'pending', source: 'house-explorer-v13', requestedAtClient: Date.now(),
        requestedAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
      };
      transaction.set(requestRef, payload, { merge: false });
      transaction.set(inboxRef, payload, { merge: false });
      transaction.set(userRef, {
        houseRequestId: house.id, houseRequestName: house.name, houseRequestStatus: 'pending',
        houseRequestUpdatedAt: s.serverTimestamp()
      }, { merge: true });
    });
    state.pendingRequest = { houseId: house.id, houseName: house.name, country: house.country, status: 'pending', requestedAt: Date.now() };
    writeLocalRequest(state.pendingRequest, uid);
    if (status) status.textContent = 'Solicitud enviada. Ya aparece en el panel de administración de la Casa.';
    if (button) button.textContent = 'CANCELAR SOLICITUD';
    toast('Solicitud real enviada.', 'success');
    renderAll();
  } catch (error) {
    if (status) status.textContent = friendlyError(error);
    if (button) { button.disabled = false; button.textContent = 'SOLICITAR UNIRME'; }
  }
}

async function cancelJoinRequest() {
  const uid = state.uid || activeUid();
  const request = state.pendingRequest;
  if (!uid || !request?.houseId) return;
  if (!state.services || !navigator.onLine) {
    toast('Necesitas conexión para cancelar la solicitud real.', 'error');
    return;
  }
  try {
    const s = state.services;
    await s.runTransaction(s.db, async transaction => {
      const requestRef = s.doc(s.db, 'solicitudesCasa', uid);
      const inboxRef = s.doc(s.db, 'casas', request.houseId, 'solicitudes', uid);
      const userRef = s.doc(s.db, 'users', uid);
      const requestSnap = await transaction.get(requestRef);
      const current = requestSnap.data() || {};
      if (requestSnap.exists() && ['accepted'].includes(cleanText(current.status, 30))) throw new Error('La solicitud ya fue aceptada.');
      transaction.set(requestRef, {
        ...current, uid, houseId: request.houseId, houseName: request.houseName,
        status: 'cancelled', cancelledAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
      }, { merge: true });
      transaction.set(inboxRef, {
        ...current, uid, houseId: request.houseId, houseName: request.houseName,
        status: 'cancelled', cancelledAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
      }, { merge: true });
      transaction.set(userRef, {
        houseRequestId: s.deleteField(), houseRequestName: s.deleteField(), houseRequestStatus: s.deleteField(),
        houseRequestUpdatedAt: s.serverTimestamp()
      }, { merge: true });
    });
    state.pendingRequest = null;
    writeLocalRequest(null, uid);
    toast('Solicitud cancelada.', 'success');
    renderAll();
  } catch (error) { toast(friendlyError(error), 'error'); }
}

function openHelp() {
  const modal = $('#houseModal');
  const content = $('#houseModalContent');
  if (!modal || !content) return;
  content.innerHTML = `<div class="houses-help-card"><div class="house-modal-head"><span>?</span><div><small>CASAS FUNCIONALES</small><h2 id="houseModalTitle">Cómo funcionan las Casas</h2></div></div><ul><li>Las fichas “Casa activa” están conectadas a Firestore. Las fichas “Vista previa” todavía no contienen personas reales.</li><li>Solo puedes pertenecer a una Casa y mantener una solicitud pendiente.</li><li>El propietario o los administradores aceptan o rechazan las solicitudes.</li><li>Los miembros acceden a avisos, chat interno y listado de miembros.</li><li>Crear una Casa requiere aprobación del propietario de JEMMO LIVE.</li></ul></div>`;
  setModalVisibility(modal, true);
}

function openCreateHouse() {
  const modal = $('#createHouseModal');
  const status = $('#createHouseStatus');
  if (status) status.textContent = state.membership?.houseId ? 'Ya perteneces a una Casa. Debes salir antes de solicitar la creación de otra.' : '';
  const submit = $('#createHouseForm button[type="submit"]');
  if (submit) submit.disabled = Boolean(state.membership?.houseId);
  setModalVisibility(modal, true);
}

async function submitCreateHouse(event) {
  event.preventDefault();
  const uid = state.uid || activeUid();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const status = $('#createHouseStatus');
  const data = new FormData(form);
  const name = cleanText(data.get('name'), 36);
  const country = cleanText(data.get('country'), 40);
  const city = cleanText(data.get('city'), 40);
  const description = cleanText(data.get('description'), 180);
  if (!uid || !name || !country || !description) {
    if (status) status.textContent = 'Completa los campos obligatorios y confirma tu sesión.';
    return;
  }
  if (state.membership?.houseId) {
    if (status) status.textContent = 'Ya perteneces a una Casa.';
    return;
  }
  if (!state.services || !navigator.onLine) {
    if (status) status.textContent = 'Necesitas conexión para enviar una solicitud real.';
    return;
  }
  submit.disabled = true;
  submit.textContent = 'ENVIANDO…';
  try {
    const s = state.services;
    await s.setDoc(s.doc(s.db, 'solicitudesCasaCreacion', uid), {
      uid, applicantName: state.identity.displayName, applicantPublicId: state.identity.publicId,
      name, country, city, description, status: 'pending', source: 'house-create-v13',
      requestedAtClient: Date.now(), requestedAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
    }, { merge: false });
    if (status) status.textContent = 'Solicitud real enviada. El propietario de JEMMO LIVE podrá aprobarla o rechazarla.';
    submit.textContent = 'SOLICITUD ENVIADA';
    form.reset();
    toast('Solicitud de creación enviada.', 'success');
  } catch (error) {
    if (status) status.textContent = friendlyError(error);
    submit.disabled = false;
    submit.textContent = 'ENVIAR SOLICITUD';
  }
}

function clearWorkspaceSubscriptions() {
  state.unsubscribers.forEach(unsub => { try { unsub(); } catch {} });
  state.unsubscribers = [];
  state.members = [];
  state.requests = [];
  state.notices = [];
  state.messages = [];
  state.creationRequests = [];
}

function currentMember() {
  return state.members.find(member => member.uid === state.uid) || null;
}

function currentTestRole() {
  if (!state.platformAdmin || !state.uid) return '';
  try {
    const value = JSON.parse(localStorage.getItem(`jemmo_role_lab_v1_${state.uid}`) || 'null');
    return ['owner', 'agent', 'emitter', 'member'].includes(value?.mode) ? value.mode : 'owner';
  } catch { return 'owner'; }
}
function testRoleLabel(role) {
  return ({ owner: 'PROPIETARIO · PRUEBA', agent: 'AGENTE DE CASA · PRUEBA', emitter: 'EMISOR/A · PRUEBA', member: 'MIEMBRO · PRUEBA' })[role] || '';
}

function calculatePermissions(house = state.workspaceHouse) {
  const member = currentMember();
  const membershipRole = state.membership?.houseId === house?.id ? state.membership?.role : '';
  const role = cleanText(member?.role || membershipRole, 20);
  state.actualHouseOwner = role === 'owner' || house?.ownerUid === state.uid;
  state.actualHouseAdmin = state.workspaceAsPlatformAdmin || state.actualHouseOwner || role === 'admin' || house?.adminUids?.includes(state.uid);
  state.simulatedRole = currentTestRole();
  if (state.simulatedRole) {
    state.houseOwner = state.simulatedRole === 'owner';
    state.houseAdmin = ['owner', 'agent'].includes(state.simulatedRole);
  } else {
    state.houseOwner = state.actualHouseOwner;
    state.houseAdmin = state.actualHouseAdmin;
  }
}

function openWorkspace(house = houseById(state.membership?.houseId), asPlatformAdmin = false) {
  const memberAccess = Boolean(house && state.membership?.houseId === house.id);
  const platformAccess = Boolean(house && house.cloud && state.platformAdmin && asPlatformAdmin);
  if (!memberAccess && !platformAccess) {
    toast('Tu membresía todavía no está activa.', 'error');
    return;
  }
  state.workspaceAsPlatformAdmin = platformAccess;
  state.workspaceHouse = house;
  state.workspaceTab = 'home';
  const workspace = $('#houseWorkspace');
  if (workspace) workspace.hidden = false;
  $('#explorar')?.setAttribute('hidden', '');
  $('.house-ranking-panel')?.setAttribute('hidden', '');
  $('.house-mother-panel')?.setAttribute('hidden', '');
  $('.houses-hero')?.setAttribute('hidden', '');
  renderWorkspace();
  subscribeWorkspace(house.id);
  setTimeout(() => workspace?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

function closeWorkspace() {
  clearWorkspaceSubscriptions();
  state.workspaceHouse = null;
  state.workspaceAsPlatformAdmin = false;
  const workspace = $('#houseWorkspace');
  if (workspace) workspace.hidden = true;
  $('#explorar')?.removeAttribute('hidden');
  $('.house-ranking-panel')?.removeAttribute('hidden');
  $('.house-mother-panel')?.removeAttribute('hidden');
  $('.houses-hero')?.removeAttribute('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function subscribeWorkspace(houseId) {
  clearWorkspaceSubscriptions();
  if (!state.services || !houseId) return;
  const s = state.services;
  const houseUnsub = s.onSnapshot(s.doc(s.db, 'casas', houseId), snapshot => {
    if (!snapshot.exists()) return;
    const fallback = houseById(houseId) || {};
    const updated = normalizeHouse({ id: houseId, ...snapshot.data(), cloud: true }, fallback);
    state.workspaceHouse = updated;
    const index = state.houses.findIndex(item => item.id === houseId);
    if (index >= 0) state.houses[index] = updated;
    else state.houses.unshift(updated);
    calculatePermissions(updated);
    renderAll();
  }, error => toast(friendlyError(error), 'error'));
  const membersUnsub = s.onSnapshot(s.collection(s.db, 'casas', houseId, 'miembros'), snapshot => {
    state.members = snapshot.docs.map(document => ({ id: document.id, uid: document.id, ...document.data() }))
      .filter(member => member.status !== 'removed')
      .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || cleanText(a.displayName).localeCompare(cleanText(b.displayName), 'es'));
    calculatePermissions();
    renderWorkspace();
    subscribeAdminStreamsIfNeeded(houseId);
  }, error => console.warn('JEMMO Casas: miembros', error?.code || error));
  const noticesQuery = s.query(s.collection(s.db, 'casas', houseId, 'avisos'), s.orderBy('createdAt', 'desc'), s.limit(40));
  const noticesUnsub = s.onSnapshot(noticesQuery, snapshot => {
    state.notices = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
    renderWorkspace();
  }, error => console.warn('JEMMO Casas: avisos', error?.code || error));
  const messagesQuery = s.query(s.collection(s.db, 'casas', houseId, 'mensajes'), s.orderBy('createdAt', 'desc'), s.limit(80));
  const messagesUnsub = s.onSnapshot(messagesQuery, snapshot => {
    state.messages = snapshot.docs.map(document => ({ id: document.id, ...document.data() })).reverse();
    renderWorkspace();
    setTimeout(() => { const list = $('#houseChatMessages'); if (list) list.scrollTop = list.scrollHeight; }, 20);
  }, error => console.warn('JEMMO Casas: chat', error?.code || error));
  state.unsubscribers.push(houseUnsub, membersUnsub, noticesUnsub, messagesUnsub);
}

function subscribeAdminStreamsIfNeeded(houseId) {
  const alreadyAdmin = state.unsubscribers.some(unsub => unsub.__jemmoAdminStream);
  if (!state.houseAdmin || alreadyAdmin || !state.services) return;
  const s = state.services;
  const requestUnsub = s.onSnapshot(s.collection(s.db, 'casas', houseId, 'solicitudes'), snapshot => {
    state.requests = snapshot.docs.map(document => ({ id: document.id, uid: document.id, ...document.data() }))
      .filter(request => request.status === 'pending' || request.status === 'reviewing')
      .sort((a, b) => timestampMillis(a.requestedAt) - timestampMillis(b.requestedAt));
    renderWorkspace();
  }, error => console.warn('JEMMO Casas: solicitudes recibidas', error?.code || error));
  requestUnsub.__jemmoAdminStream = true;
  state.unsubscribers.push(requestUnsub);
  if (state.platformAdmin) {
    const creationUnsub = s.onSnapshot(s.collection(s.db, 'solicitudesCasaCreacion'), snapshot => {
      state.creationRequests = snapshot.docs.map(document => ({ id: document.id, uid: document.id, ...document.data() }))
        .filter(request => request.status === 'pending')
        .sort((a, b) => timestampMillis(a.requestedAt) - timestampMillis(b.requestedAt));
      renderWorkspace();
    }, error => console.warn('JEMMO Casas: solicitudes de creación', error?.code || error));
    creationUnsub.__jemmoAdminStream = true;
    state.unsubscribers.push(creationUnsub);
  }
}

function roleOrder(role) {
  if (role === 'owner') return 0;
  if (role === 'admin') return 1;
  return 2;
}
function roleLabel(role) {
  if (role === 'owner') return 'PROPIETARIO';
  if (role === 'admin') return 'ADMINISTRADOR';
  return 'MIEMBRO';
}

function renderWorkspace() {
  const workspace = $('#houseWorkspace');
  if (!workspace || workspace.hidden || !state.workspaceHouse) return;
  const house = state.workspaceHouse;
  workspace.dataset.houseId = house.id;
  calculatePermissions(house);
  $('#workspaceEmblem').textContent = house.emblem || house.short || '♛';
  $('#workspaceName').textContent = house.name;
  $('#workspaceLocation').textContent = `${house.flag || ''} ${house.city || house.country}`.trim();
  const workspaceRole = state.simulatedRole ? testRoleLabel(state.simulatedRole) : (state.workspaceAsPlatformAdmin ? 'ADMIN JEMMO' : roleLabel(currentMember()?.role || (state.membership?.houseId === house.id ? state.membership?.role : 'member')));
  $('#workspaceRole').textContent = workspaceRole;
  $('#workspaceMemberCount').textContent = formatNumber(house.members || state.members.length);
  $('#workspaceScore').textContent = formatNumber(house.score);
  const leaveButton = $('[data-leave-house]');
  if (leaveButton) leaveButton.hidden = state.workspaceAsPlatformAdmin || state.houseOwner;
  const adminTab = $('[data-workspace-tab="admin"]');
  if (adminTab) adminTab.hidden = !state.houseAdmin;
  $$('.house-workspace-tab').forEach(button => button.classList.toggle('active', button.dataset.workspaceTab === state.workspaceTab));
  $$('.house-workspace-view').forEach(view => { view.hidden = view.dataset.workspaceView !== state.workspaceTab; });
  renderWorkspaceHome();
  renderWorkspaceChat();
  renderWorkspaceMembers();
  renderWorkspaceAdmin();
}

function renderWorkspaceHome() {
  const notices = $('#houseNoticeList');
  const composer = $('#houseNoticeComposer');
  if (composer) composer.hidden = !state.houseAdmin;
  if (notices) {
    notices.innerHTML = state.notices.length ? state.notices.map(notice => `
      <article class="house-notice">
        <div><span>📌 AVISO</span><time>${escapeHtml(formatDateTime(notice.createdAt || notice.createdAtClient))}</time></div>
        <h3>${escapeHtml(notice.title || 'Aviso de la Casa')}</h3>
        <p>${escapeHtml(notice.text)}</p>
        <small>Publicado por ${escapeHtml(notice.authorName || 'Administración')}</small>
      </article>`).join('') : '<div class="house-workspace-empty">Todavía no hay avisos. La administración puede publicar el primero.</div>';
  }
  const activity = $('#houseActivitySummary');
  if (activity) activity.innerHTML = `
    <div><b>${formatNumber(state.members.length || state.workspaceHouse.members)}</b><small>MIEMBROS ACTIVOS</small></div>
    <div><b>${formatNumber(state.notices.length)}</b><small>AVISOS</small></div>
    <div><b>${formatNumber(state.messages.length)}</b><small>MENSAJES RECIENTES</small></div>
    <div><b>${formatNumber(state.workspaceHouse.score)}</b><small>PUNTOS DE CASA</small></div>`;
}

function renderWorkspaceChat() {
  const list = $('#houseChatMessages');
  if (!list) return;
  list.innerHTML = state.messages.length ? state.messages.map(message => `
    <div class="house-chat-message ${message.uid === state.uid ? 'mine' : ''}">
      <span>${escapeHtml((message.authorName || 'J').slice(0, 2).toUpperCase())}</span>
      <div><b>${escapeHtml(message.authorName || 'Usuario JEMMO')}</b><p>${escapeHtml(message.text)}</p><time>${escapeHtml(formatDateTime(message.createdAt || message.createdAtClient))}</time></div>
    </div>`).join('') : '<div class="house-workspace-empty">El chat interno está vacío. Envía el primer mensaje.</div>';
}

function renderWorkspaceMembers() {
  const list = $('#houseMembersList');
  if (!list) return;
  list.innerHTML = state.members.length ? state.members.map(member => {
    const canManage = state.houseAdmin && member.uid !== state.uid && member.role !== 'owner' && (state.houseOwner || member.role === 'member');
    return `
      <article class="house-member-row">
        <span class="house-member-avatar">${escapeHtml((member.displayName || 'JM').slice(0, 2).toUpperCase())}</span>
        <div><b>${escapeHtml(member.displayName || 'Usuario JEMMO')}</b><small>${escapeHtml(member.publicId || 'ID pendiente')} · ${roleLabel(member.role)}</small></div>
        ${canManage ? `<button type="button" data-member-menu="${escapeHtml(member.uid)}">GESTIONAR</button>` : `<em>${member.uid === state.uid ? 'TÚ' : roleLabel(member.role)}</em>`}
      </article>`;
  }).join('') : '<div class="house-workspace-empty">No se pudieron cargar los miembros.</div>';
}

function renderWorkspaceAdmin() {
  const requests = $('#houseAdminRequests');
  const memberAdmin = $('#houseAdminMembers');
  const creation = $('#houseCreationRequests');
  const creationBlock = $('#houseCreationAdminBlock');
  if (creationBlock) creationBlock.hidden = !state.platformAdmin;
  if (requests) {
    requests.innerHTML = state.requests.length ? state.requests.map(request => `
      <article class="house-admin-request">
        <div><b>${escapeHtml(request.applicantName || 'Usuario JEMMO')}</b><small>${escapeHtml(request.applicantPublicId || request.uid)} · ${escapeHtml(formatDateTime(request.requestedAt || request.requestedAtClient))}</small></div>
        <div class="house-admin-actions"><button type="button" class="accept" data-review-request="accept" data-request-uid="${escapeHtml(request.uid)}">ACEPTAR</button><button type="button" class="reject" data-review-request="reject" data-request-uid="${escapeHtml(request.uid)}">RECHAZAR</button></div>
      </article>`).join('') : '<div class="house-workspace-empty">No hay solicitudes pendientes.</div>';
  }
  if (memberAdmin) {
    memberAdmin.innerHTML = state.members.filter(member => member.uid !== state.uid && member.role !== 'owner').map(member => `
      <article class="house-admin-member">
        <div><b>${escapeHtml(member.displayName || 'Usuario JEMMO')}</b><small>${roleLabel(member.role)}</small></div>
        <div>${state.houseOwner ? `<button type="button" data-role-member="${escapeHtml(member.uid)}" data-next-role="${member.role === 'admin' ? 'member' : 'admin'}">${member.role === 'admin' ? 'QUITAR ADMIN' : 'HACER ADMIN'}</button>` : ''}<button type="button" class="reject" data-remove-member="${escapeHtml(member.uid)}">EXPULSAR</button></div>
      </article>`).join('') || '<div class="house-workspace-empty">No hay otros miembros para administrar.</div>';
  }
  if (creation) {
    creation.innerHTML = state.creationRequests.length ? state.creationRequests.map(request => `
      <article class="house-creation-request">
        <div><b>${escapeHtml(request.name)}</b><small>${escapeHtml(request.country)}${request.city ? ` · ${escapeHtml(request.city)}` : ''} · solicitada por ${escapeHtml(request.applicantName || request.uid)}</small><p>${escapeHtml(request.description)}</p></div>
        <div class="house-admin-actions"><button type="button" class="accept" data-review-creation="approve" data-creation-uid="${escapeHtml(request.uid)}">APROBAR</button><button type="button" class="reject" data-review-creation="reject" data-creation-uid="${escapeHtml(request.uid)}">RECHAZAR</button></div>
      </article>`).join('') : '<div class="house-workspace-empty">No hay solicitudes de creación pendientes.</div>';
  }
}

async function createNotice(event) {
  event.preventDefault();
  if (!state.houseAdmin || !state.services || !state.workspaceHouse) return;
  const form = event.currentTarget;
  const title = cleanText(new FormData(form).get('title'), 60);
  const text = cleanText(new FormData(form).get('text'), 500);
  if (!title || !text) { toast('Escribe el título y el aviso.', 'error'); return; }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const s = state.services;
    await s.addDoc(s.collection(s.db, 'casas', state.workspaceHouse.id, 'avisos'), {
      title, text, authorUid: state.uid, authorName: state.identity.displayName,
      createdAtClient: Date.now(), createdAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
    });
    form.reset();
    toast('Aviso publicado.', 'success');
  } catch (error) { toast(friendlyError(error), 'error'); }
  finally { button.disabled = false; }
}

async function sendHouseMessage(event) {
  event.preventDefault();
  const input = $('#houseChatInput');
  const text = cleanText(input?.value, 400);
  if (!text || !state.services || !state.workspaceHouse) return;
  const now = Date.now();
  if (now - state.chatLastSentAt < 1300) { toast('Espera un momento antes de enviar otro mensaje.', 'error'); return; }
  state.chatLastSentAt = now;
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const s = state.services;
    await s.addDoc(s.collection(s.db, 'casas', state.workspaceHouse.id, 'mensajes'), {
      uid: state.uid, authorName: state.identity.displayName, authorPublicId: state.identity.publicId,
      text, type: 'text', createdAtClient: now, createdAt: s.serverTimestamp()
    });
    input.value = '';
  } catch (error) { toast(friendlyError(error), 'error'); }
  finally { button.disabled = false; }
}

async function verifyHouseAdmin(houseId) {
  if (!state.services || !state.uid) throw new Error('NOT_ADMIN');
  if (state.platformAdmin && state.workspaceAsPlatformAdmin) return 'platform-owner';
  const s = state.services;
  const snapshot = await s.getDoc(s.doc(s.db, 'casas', houseId, 'miembros', state.uid));
  const role = cleanText(snapshot.data()?.role, 20);
  if (!snapshot.exists() || !['owner', 'admin'].includes(role)) throw new Error('NOT_ADMIN');
  return role;
}

async function reviewJoinRequest(applicantUid, decision) {
  const house = state.workspaceHouse;
  if (!house || !state.services) return;
  try {
    await verifyHouseAdmin(house.id);
    const s = state.services;
    const acceptedAtClient = Date.now();
    await s.runTransaction(s.db, async transaction => {
      const inboxRef = s.doc(s.db, 'casas', house.id, 'solicitudes', applicantUid);
      const globalRef = s.doc(s.db, 'solicitudesCasa', applicantUid);
      const houseRef = s.doc(s.db, 'casas', house.id);
      const memberRef = s.doc(s.db, 'casas', house.id, 'miembros', applicantUid);
      const userRef = s.doc(s.db, 'users', applicantUid);
      const taskRef = s.doc(s.db, 'casas', house.id, 'tareas', applicantUid);
      const auditRef = s.doc(s.collection(s.db, 'casas', house.id, 'auditoria'));
      const inboxSnap = await transaction.get(inboxRef);
      const houseSnap = await transaction.get(houseRef);
      const memberSnap = await transaction.get(memberRef);
      const userSnap = await transaction.get(userRef);
      const taskSnap = await transaction.get(taskRef);
      if (!inboxSnap.exists() || inboxSnap.data()?.status !== 'pending') throw new Error('La solicitud ya no está pendiente.');
      const request = inboxSnap.data() || {};
      const userData = userSnap.data() || {};
      if (decision === 'accept') {
        if (cleanText(userData.houseId, 80) && userData.houseId !== house.id) throw new Error('ALREADY_MEMBER');
        const initialPosition = ['emisor','emisora','emitter','host','streamer','creator','creador','creadora'].includes(lower(userData.role || userData.rol || userData.accountRole)) ? 'emitter' : 'member';
        transaction.set(memberRef, {
          uid: applicantUid, displayName: cleanText(request.applicantName || userData.displayName || 'Usuario JEMMO', 48),
          publicId: cleanText(request.applicantPublicId || userData.publicId, 48), role: 'member', status: 'active',
          accountRole: cleanText(userData.role || userData.rol || 'usuario', 30), housePosition: initialPosition,
          assignedAgentUid: initialPosition === 'emitter' ? state.uid : s.deleteField(),
          assignedAgentName: initialPosition === 'emitter' ? cleanText(state.identity.displayName || 'Responsable de Casa', 80) : s.deleteField(),
          joinedAt: memberSnap.exists() ? (memberSnap.data()?.joinedAt || s.serverTimestamp()) : s.serverTimestamp(),
          approvedBy: state.uid, updatedAt: s.serverTimestamp()
        }, { merge: true });
        transaction.set(userRef, {
          houseId: house.id, houseName: house.name, houseRole: 'member', houseStatus: 'active', housePosition: initialPosition,
          assignedAgentUid: initialPosition === 'emitter' ? state.uid : s.deleteField(),
          houseJoinedAt: s.serverTimestamp(), houseUpdatedAt: s.serverTimestamp(),
          houseRequestId: s.deleteField(), houseRequestName: s.deleteField(), houseRequestStatus: s.deleteField()
        }, { merge: true });
        if (initialPosition === 'emitter') {
          const previousTask = taskSnap.data() || {};
          transaction.set(taskRef, { uid: applicantUid, displayName: cleanText(request.applicantName || userData.displayName || 'Emisora JEMMO', 48), publicId: cleanText(request.applicantPublicId || userData.publicId, 48), assignedAgentUid: state.uid, taskState: 'active', completionState: 'in_progress', cycleDurationHours: 24, cycleStartedAtClient: acceptedAtClient, cycleEndsAtClient: acceptedAtClient + 86400000, cycleKey: `24h-${acceptedAtClient}`, cycleNumber: Math.max(1, Number(previousTask.cycleNumber || 0) + 1), liveSeconds: 0, houseRoomSeconds: 0, reviewStatus: 'pending', activatedReason: 'membership_accepted_as_emitter', activatedAtClient: acceptedAtClient, updatedAt: s.serverTimestamp() }, { merge: true });
        }
        transaction.set(houseRef, {
          memberCount: number(houseSnap.data()?.memberCount ?? houseSnap.data()?.members) + (memberSnap.exists() ? 0 : 1), updatedAt: s.serverTimestamp()
        }, { merge: true });
      }
      const review = {
        status: decision === 'accept' ? 'accepted' : 'rejected', reviewedBy: state.uid,
        reviewedByName: state.identity.displayName, reviewedAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
      };
      transaction.set(inboxRef, review, { merge: true });
      transaction.set(globalRef, review, { merge: true });
      transaction.set(auditRef, { action: decision === 'accept' ? 'membership_request_accepted' : 'membership_request_rejected', subjectUid: applicantUid, actorUid: state.uid, actorName: state.identity.displayName, decision, createdAtClient: acceptedAtClient, createdAt: s.serverTimestamp(), simulation: true, schemaVersion: 1 });
      if (decision === 'reject') {
        transaction.set(userRef, {
          houseRequestId: s.deleteField(), houseRequestName: s.deleteField(), houseRequestStatus: 'rejected',
          houseRequestUpdatedAt: s.serverTimestamp()
        }, { merge: true });
      }
    });
    toast(decision === 'accept' ? 'Solicitud aceptada. Si la cuenta es Emisor/a, su tarea de 24 horas ya está activa.' : 'Solicitud rechazada.', 'success');
    if (decision === 'accept') await addSystemMessage(`${state.identity.displayName} aceptó a un nuevo miembro en ${house.name}.`);
  } catch (error) { toast(friendlyError(error), 'error'); }
}

async function changeMemberRole(memberUid, nextRole) {
  if (!state.houseOwner || !state.services || !state.workspaceHouse) { toast('Solo el propietario puede cambiar administradores.', 'error'); return; }
  if (!['admin', 'member'].includes(nextRole)) return;
  try {
    const s = state.services;
    await s.runTransaction(s.db, async transaction => {
      const ownerRef = s.doc(s.db, 'casas', state.workspaceHouse.id, 'miembros', state.uid);
      const memberRef = s.doc(s.db, 'casas', state.workspaceHouse.id, 'miembros', memberUid);
      const userRef = s.doc(s.db, 'users', memberUid);
      const houseRef = s.doc(s.db, 'casas', state.workspaceHouse.id);
      const auditRef = s.doc(s.collection(s.db, 'casas', state.workspaceHouse.id, 'auditoria'));
      const ownerSnap = await transaction.get(ownerRef);
      const memberSnap = await transaction.get(memberRef);
      if (ownerSnap.data()?.role !== 'owner' || !memberSnap.exists() || memberSnap.data()?.role === 'owner') throw new Error('NOT_ADMIN');
      transaction.set(memberRef, { role: nextRole, updatedAt: s.serverTimestamp() }, { merge: true });
      transaction.set(userRef, { houseRole: nextRole, houseUpdatedAt: s.serverTimestamp() }, { merge: true });
      transaction.set(houseRef, {
        adminUids: nextRole === 'admin' ? s.arrayUnion(memberUid) : s.arrayRemove(memberUid), updatedAt: s.serverTimestamp()
      }, { merge: true });
      transaction.set(auditRef, { action: 'house_admin_role_changed', subjectUid: memberUid, actorUid: state.uid, actorName: state.identity.displayName, nextRole, createdAtClient: Date.now(), createdAt: s.serverTimestamp(), simulation: true, schemaVersion: 1 });
    });
    toast(nextRole === 'admin' ? 'Administrador añadido.' : 'Administrador retirado.', 'success');
  } catch (error) { toast(friendlyError(error), 'error'); }
}

async function removeMember(memberUid) {
  if (!state.houseAdmin || !state.services || !state.workspaceHouse || memberUid === state.uid) return;
  const member = state.members.find(item => item.uid === memberUid);
  if (!member || member.role === 'owner' || (!state.houseOwner && member.role === 'admin')) { toast('No puedes expulsar a este miembro.', 'error'); return; }
  if (!confirm(`¿Expulsar a ${member.displayName || 'este miembro'} de ${state.workspaceHouse.name}?`)) return;
  try {
    const s = state.services;
    await s.runTransaction(s.db, async transaction => {
      const adminRef = s.doc(s.db, 'casas', state.workspaceHouse.id, 'miembros', state.uid);
      const memberRef = s.doc(s.db, 'casas', state.workspaceHouse.id, 'miembros', memberUid);
      const userRef = s.doc(s.db, 'users', memberUid);
      const houseRef = s.doc(s.db, 'casas', state.workspaceHouse.id);
      const taskRef = s.doc(s.db, 'casas', state.workspaceHouse.id, 'tareas', memberUid);
      const auditRef = s.doc(s.collection(s.db, 'casas', state.workspaceHouse.id, 'auditoria'));
      const adminSnap = await transaction.get(adminRef);
      const memberSnap = await transaction.get(memberRef);
      const userSnap = await transaction.get(userRef);
      const houseSnap = await transaction.get(houseRef);
      const adminRole = adminSnap.data()?.role;
      const targetRole = memberSnap.data()?.role;
      if (!['owner', 'admin'].includes(adminRole) || targetRole === 'owner' || (adminRole === 'admin' && targetRole === 'admin')) throw new Error('NOT_ADMIN');
      transaction.delete(memberRef);
      if (userSnap.data()?.houseId === state.workspaceHouse.id) {
        transaction.set(userRef, {
          houseId: s.deleteField(), houseName: s.deleteField(), houseRole: s.deleteField(), houseStatus: 'removed',
          housePosition: s.deleteField(), assignedAgentUid: s.deleteField(),
          houseLeftAt: s.serverTimestamp(), houseUpdatedAt: s.serverTimestamp()
        }, { merge: true });
      }
      transaction.set(taskRef, { taskState: 'paused', pausedReason: 'removed_from_house', pausedAt: s.serverTimestamp(), updatedAt: s.serverTimestamp() }, { merge: true });
      transaction.set(houseRef, {
        memberCount: Math.max(0, number(houseSnap.data()?.memberCount ?? houseSnap.data()?.members) - (memberSnap.exists() ? 1 : 0)),
        adminUids: s.arrayRemove(memberUid), updatedAt: s.serverTimestamp()
      }, { merge: true });
      transaction.set(auditRef, { action: 'house_member_removed', subjectUid: memberUid, actorUid: state.uid, actorName: state.identity.displayName, createdAtClient: Date.now(), createdAt: s.serverTimestamp(), simulation: true, schemaVersion: 1 });
    });
    toast('Miembro expulsado.', 'success');
    await addSystemMessage(`${member.displayName || 'Un miembro'} salió de la Casa por decisión de la administración.`);
  } catch (error) { toast(friendlyError(error), 'error'); }
}

async function leaveHouse() {
  if (!state.services || !state.workspaceHouse || !state.membership || state.workspaceAsPlatformAdmin) return;
  const role = state.membership.role || currentMember()?.role;
  if (role === 'owner') { toast('El propietario no puede abandonar su propia Casa. Debe transferirla en una fase posterior.', 'error'); return; }
  if (!confirm(`¿Abandonar ${state.workspaceHouse.name}? Perderás el acceso al chat y a los avisos internos.`)) return;
  try {
    const s = state.services;
    const houseId = state.workspaceHouse.id;
    await s.runTransaction(s.db, async transaction => {
      const memberRef = s.doc(s.db, 'casas', houseId, 'miembros', state.uid);
      const userRef = s.doc(s.db, 'users', state.uid);
      const houseRef = s.doc(s.db, 'casas', houseId);
      const auditRef = s.doc(s.collection(s.db, 'casas', houseId, 'auditoria'));
      const memberSnap = await transaction.get(memberRef);
      const houseSnap = await transaction.get(houseRef);
      if (memberSnap.data()?.role === 'owner') throw new Error('OWNER_CANNOT_LEAVE');
      transaction.delete(memberRef);
      transaction.set(userRef, {
        houseId: s.deleteField(), houseName: s.deleteField(), houseRole: s.deleteField(), houseStatus: 'left',
        housePosition: s.deleteField(), assignedAgentUid: s.deleteField(),
        houseLeftAt: s.serverTimestamp(), houseUpdatedAt: s.serverTimestamp()
      }, { merge: true });
      transaction.set(houseRef, {
        memberCount: Math.max(0, number(houseSnap.data()?.memberCount ?? houseSnap.data()?.members) - (memberSnap.exists() ? 1 : 0)),
        adminUids: s.arrayRemove(state.uid), updatedAt: s.serverTimestamp()
      }, { merge: true });
      transaction.set(auditRef, { action: 'house_member_left', subjectUid: state.uid, actorUid: state.uid, actorName: state.identity.displayName, createdAtClient: Date.now(), createdAt: s.serverTimestamp(), simulation: true, schemaVersion: 1 });
    });
    writeLocalMembership(null);
    state.membership = null;
    closeWorkspace();
    toast('Has abandonado la Casa.', 'success');
    renderAll();
  } catch (error) { toast(friendlyError(error), 'error'); }
}

async function addSystemMessage(text) {
  if (!state.services || !state.workspaceHouse) return;
  const s = state.services;
  try {
    await s.addDoc(s.collection(s.db, 'casas', state.workspaceHouse.id, 'mensajes'), {
      uid: 'system', authorName: 'JEMMO LIVE', text: cleanText(text, 400), type: 'system',
      createdAtClient: Date.now(), createdAt: s.serverTimestamp()
    });
  } catch {}
}

async function approveCreation(requestUid, decision) {
  if (!state.platformAdmin || !state.services) { toast('Acción exclusiva del propietario de JEMMO LIVE.', 'error'); return; }
  const request = state.creationRequests.find(item => item.uid === requestUid);
  if (!request) return;
  try {
    const s = state.services;
    if (decision === 'reject') {
      await s.setDoc(s.doc(s.db, 'solicitudesCasaCreacion', requestUid), {
        status: 'rejected', reviewedBy: state.uid, reviewedAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
      }, { merge: true });
      toast('Solicitud de creación rechazada.', 'success');
      return;
    }
    const houseId = `casa-${requestUid.slice(0, 10).toLocaleLowerCase('es')}`;
    await s.runTransaction(s.db, async transaction => {
      const requestRef = s.doc(s.db, 'solicitudesCasaCreacion', requestUid);
      const houseRef = s.doc(s.db, 'casas', houseId);
      const memberRef = s.doc(s.db, 'casas', houseId, 'miembros', requestUid);
      const userRef = s.doc(s.db, 'users', requestUid);
      const requestSnap = await transaction.get(requestRef);
      const houseSnap = await transaction.get(houseRef);
      const userSnap = await transaction.get(userRef);
      const current = requestSnap.data() || {};
      if (!requestSnap.exists() || current.status !== 'pending') throw new Error('La solicitud ya fue revisada.');
      if (cleanText(userSnap.data()?.houseId, 80)) throw new Error('ALREADY_MEMBER');
      if (houseSnap.exists()) throw new Error('La Casa ya existe.');
      const short = cleanText(current.name, 36).split(/\s+/).map(word => word[0]).join('').slice(0, 3).toUpperCase() || 'CJ';
      transaction.set(houseRef, {
        name: cleanText(current.name, 36), short, country: cleanText(current.country, 40), city: cleanText(current.city, 40),
        flag: '✦', emblem: short, description: cleanText(current.description, 180),
        accent: '#c441ec', glow: 'rgba(196,65,236,.18)', ownerUid: requestUid, adminUids: [requestUid],
        active: true, open: true, status: 'open', featured: false, newHouse: true,
        memberCount: 1, score: 0, rank: 999, createdBy: requestUid,
        approvedBy: state.uid, approvedAt: s.serverTimestamp(), createdAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
      });
      transaction.set(memberRef, {
        uid: requestUid, displayName: cleanText(current.applicantName || userSnap.data()?.displayName || 'Propietario', 48),
        publicId: cleanText(current.applicantPublicId || userSnap.data()?.publicId, 48), role: 'owner', status: 'active', housePosition: 'owner', accountRole: cleanText(userSnap.data()?.role || 'owner', 30),
        joinedAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
      });
      transaction.set(userRef, {
        houseId, houseName: cleanText(current.name, 36), houseRole: 'owner', houseStatus: 'active',
        houseJoinedAt: s.serverTimestamp(), houseUpdatedAt: s.serverTimestamp()
      }, { merge: true });
      transaction.set(requestRef, {
        status: 'approved', houseId, reviewedBy: state.uid, reviewedAt: s.serverTimestamp(), updatedAt: s.serverTimestamp()
      }, { merge: true });
    });
    toast('Casa aprobada y activada.', 'success');
    await loadCloudHouses();
    renderAll();
  } catch (error) { toast(friendlyError(error), 'error'); }
}

function openMemberMenu(uid) {
  const member = state.members.find(item => item.uid === uid);
  if (!member) return;
  const modal = $('#houseModal');
  const content = $('#houseModalContent');
  if (!modal || !content) return;
  const canRole = state.houseOwner && member.role !== 'owner';
  content.innerHTML = `
    <div class="house-modal-head"><span>${escapeHtml((member.displayName || 'JM').slice(0, 2).toUpperCase())}</span><div><small>GESTIÓN DE MIEMBRO</small><h2 id="houseModalTitle">${escapeHtml(member.displayName || 'Usuario JEMMO')}</h2></div></div>
    <p class="house-modal-copy">${escapeHtml(member.publicId || 'ID pública pendiente')} · ${roleLabel(member.role)}</p>
    <div class="member-menu-actions">${canRole ? `<button type="button" data-role-member="${escapeHtml(uid)}" data-next-role="${member.role === 'admin' ? 'member' : 'admin'}">${member.role === 'admin' ? 'QUITAR COMO ADMINISTRADOR' : 'HACER ADMINISTRADOR'}</button>` : ''}<button type="button" class="danger" data-remove-member="${escapeHtml(uid)}">EXPULSAR DE LA CASA</button></div>`;
  setModalVisibility(modal, true);
}

function bind() {
  $('#houseSearch')?.addEventListener('input', event => {
    state.currentQuery = cleanText(event.target.value, 80).toLocaleLowerCase('es');
    renderExplorer();
  });
  $('#houseFilters')?.addEventListener('click', event => {
    const button = event.target.closest('[data-house-filter]');
    if (!button) return;
    state.currentFilter = button.dataset.houseFilter || 'all';
    $$('#houseFilters [data-house-filter]').forEach(item => item.classList.toggle('active', item === button));
    renderExplorer();
  });
  document.addEventListener('click', async event => {
    const details = event.target.closest('[data-house-details]');
    if (details) { const house = houseById(details.dataset.houseDetails); if (house) openHouse(house); return; }
    const action = event.target.closest('[data-house-action]');
    if (action) { const house = houseById(action.dataset.houseAction); if (!house) return; if (sameMembership(house)) openMembershipDestination(house, true); else openHouse(house, true); return; }
    if (event.target.closest('[data-open-my-house-room]')) { openMembershipDestination(); return; }
    if (event.target.closest('[data-open-my-house]')) { if (membershipCanManage()) openWorkspace(); else openMembershipDestination(); return; }
    if (event.target.closest('[data-explore-other-houses]')) { document.getElementById('explorar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (event.target.closest('[data-cancel-request]')) { await cancelJoinRequest(); return; }
    if (event.target.closest('[data-request-details]')) { const house = houseById(state.pendingRequest?.houseId); if (house) openHouse(house); return; }
    const tab = event.target.closest('[data-workspace-tab]');
    if (tab) { state.workspaceTab = tab.dataset.workspaceTab; renderWorkspace(); return; }
    if (event.target.closest('[data-close-workspace]')) { closeWorkspace(); return; }
    if (event.target.closest('[data-leave-house]')) { await leaveHouse(); return; }
    const review = event.target.closest('[data-review-request]');
    if (review) { review.disabled = true; await reviewJoinRequest(review.dataset.requestUid, review.dataset.reviewRequest); review.disabled = false; return; }
    const memberMenu = event.target.closest('[data-member-menu]');
    if (memberMenu) { openMemberMenu(memberMenu.dataset.memberMenu); return; }
    const role = event.target.closest('[data-role-member]');
    if (role) { role.disabled = true; await changeMemberRole(role.dataset.roleMember, role.dataset.nextRole); role.disabled = false; closeAllModals(); return; }
    const remove = event.target.closest('[data-remove-member]');
    if (remove) { remove.disabled = true; await removeMember(remove.dataset.removeMember); remove.disabled = false; closeAllModals(); return; }
    const creation = event.target.closest('[data-review-creation]');
    if (creation) { creation.disabled = true; await approveCreation(creation.dataset.creationUid, creation.dataset.reviewCreation); creation.disabled = false; return; }
  });
  $('#houseModalClose')?.addEventListener('click', closeAllModals);
  $('#createHouseClose')?.addEventListener('click', closeAllModals);
  $('#houseModalBackdrop')?.addEventListener('click', closeAllModals);
  $('#housesHelp')?.addEventListener('click', openHelp);
  $('#createHouseOpen')?.addEventListener('click', openCreateHouse);
  $('#createHouseForm')?.addEventListener('submit', submitCreateHouse);
  $('#houseNoticeComposer')?.addEventListener('submit', createNotice);
  $('#houseChatForm')?.addEventListener('submit', sendHouseMessage);
  window.addEventListener('keydown', event => { if (event.key === 'Escape') closeAllModals(); });
  window.addEventListener('jemmo-test-role-change', event => {
    state.simulatedRole = event.detail?.mode || currentTestRole();
    calculatePermissions();
    if (!state.houseAdmin && ['emitters', 'admin'].includes(state.workspaceTab)) state.workspaceTab = state.simulatedRole === 'emitter' ? 'tasks' : 'home';
    renderWorkspace();
    setTimeout(() => window.JemmoHouseOperations?.refresh?.(), 30);
  });
  window.addEventListener('online', async () => {
    state.services = await firebaseServices();
    await loadIdentity();
    await ensureFatherHouseForOwner();
    await loadCloudHouses();
    subscribeOwnState();
    renderAll();
  });
  window.addEventListener('offline', () => setCloudState('Sin conexión · lectura local disponible', 'offline'));
}

async function boot() {
  if (!$('#homeHouseGrid') && !$('#houseExplorerGrid')) return;
  bind();
  renderAll();
  setCloudState(navigator.onLine ? 'Conectando Casas…' : 'Sin conexión · vista previa', navigator.onLine ? '' : 'offline');
  state.services = navigator.onLine ? await firebaseServices() : null;
  await loadIdentity();
  await ensureFatherHouseForOwner();
  await loadCloudHouses();
  subscribeOwnState();
  renderAll();
  const params = new URL(location.href).searchParams;
  if (params.get('miCasa') === '1' && state.membership?.houseId) {
    if (membershipCanManage()) {
      openWorkspace();
      const requestedTab = params.get('tab');
      if (['home','room','tasks','emitters','chat','members','admin'].includes(requestedTab)) { state.workspaceTab = requestedTab; renderWorkspace(); }
    } else {
      openMembershipDestination();
      return;
    }
  }
  const requestedId = params.get('casa');
  if (requestedId && $('#houseExplorerGrid')) {
    const house = houseById(requestedId);
    if (house) openHouse(house);
  }
}

window.JemmoHouses = {
  getState: () => ({
    uid: state.uid, platformAdmin: state.platformAdmin, houses: state.houses.map(house => ({ ...house })),
    membership: state.membership ? { ...state.membership } : null,
    request: state.pendingRequest ? { ...state.pendingRequest } : null
  }),
  openMyHouse: () => membershipCanManage() ? openWorkspace() : openMembershipDestination(),
  openMyHouseRoom: () => openMembershipDestination(),
  refresh: async () => { await loadCloudHouses(); renderAll(); }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
