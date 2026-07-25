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
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
  ]).then(([appModule, firestore]) => {
    const app = appModule.getApps()[0] || appModule.initializeApp(firebaseConfig);
    return { ...firestore, db: firestore.getFirestore(app) };
  }).catch(error => {
    console.warn('JEMMO Casas: sincronización en la nube no disponible', error?.message || error);
    return null;
  });
  return firebasePromise;
}

const FALLBACK_HOUSES = [
  {
    id: 'madre', name: 'Casa Madre JEMMO', short: 'JM', country: 'Oficial', city: 'JEMMO LIVE', flag: '✦',
    emblem: '♛', members: 1840, score: 318400, rank: 1, status: 'open', featured: true, newHouse: false,
    accent: '#ffd329', glow: 'rgba(255,211,41,.22)',
    description: 'Casa oficial para orientación, novedades y actividades generales de la comunidad.'
  },
  {
    id: 'tenerife', name: 'Casa Tenerife', short: 'JT', country: 'España', city: 'Tenerife', flag: '🇪🇸',
    emblem: 'JT', members: 286, score: 128500, rank: 2, status: 'battle', featured: true, newHouse: false,
    accent: '#ffd21a', glow: 'rgba(255,210,26,.22)',
    description: 'Comunidad canaria activa en directos, salas y Batallas de Casas.'
  },
  {
    id: 'unicornio', name: 'Casa Unicornio', short: 'CU', country: 'Internacional', city: 'Comunidad', flag: '🦄',
    emblem: '🦄', members: 241, score: 97300, rank: 3, status: 'battle', featured: true, newHouse: false,
    accent: '#ff43ce', glow: 'rgba(255,67,206,.23)',
    description: 'Una Casa creativa, internacional y centrada en el apoyo entre sus miembros.'
  },
  {
    id: 'cuba', name: 'Casa Cuba', short: 'CC', country: 'Cuba', city: 'La Habana', flag: '🇨🇺',
    emblem: 'CU', members: 194, score: 76150, rank: 4, status: 'open', featured: true, newHouse: false,
    accent: '#2ba9ff', glow: 'rgba(43,169,255,.21)',
    description: 'Audio Rooms ligeras, colaboración y actividades adaptadas a conexiones móviles.'
  },
  {
    id: 'madrid', name: 'Casa Madrid', short: 'CM', country: 'España', city: 'Madrid', flag: '🇪🇸',
    emblem: 'MD', members: 132, score: 58900, rank: 5, status: 'open', featured: false, newHouse: false,
    accent: '#a45cff', glow: 'rgba(164,92,255,.20)',
    description: 'Comunidad de entretenimiento, música y nuevos talentos de JEMMO LIVE.'
  },
  {
    id: 'caribe', name: 'Casa Caribe', short: 'CA', country: 'Caribe', city: 'Comunidad', flag: '🌴',
    emblem: 'CB', members: 68, score: 21400, rank: 6, status: 'open', featured: false, newHouse: true,
    accent: '#24e2c1', glow: 'rgba(36,226,193,.18)',
    description: 'Nueva Casa para creadores, salas musicales y comunidad del Caribe.'
  }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const cleanText = (value, max = 180) => String(value || '').trim().slice(0, max);
const number = value => Math.max(0, Number(value) || 0);
const formatNumber = value => Math.round(number(value)).toLocaleString('es-ES');
const escapeHtml = value => cleanText(value, 500)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function activeUid() {
  if (window.__jemmoAuthenticatedUid) return String(window.__jemmoAuthenticatedUid);
  try { return localStorage.getItem('jemmo_active_uid') || sessionStorage.getItem('jemmo_active_uid') || ''; } catch { return ''; }
}

function requestKey(uid = activeUid()) {
  return `jemmo_house_request_v1_${uid || 'guest'}`;
}

function readLocalRequest(uid = activeUid()) {
  try {
    const parsed = JSON.parse(localStorage.getItem(requestKey(uid)) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch { return null; }
}

function writeLocalRequest(data, uid = activeUid()) {
  try { localStorage.setItem(requestKey(uid), JSON.stringify(data)); } catch {}
}

function normalizeHouse(raw, fallback = {}) {
  const id = cleanText(raw.id || raw.houseId || fallback.id, 60).toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || fallback.id;
  return {
    ...fallback,
    id,
    name: cleanText(raw.name || raw.nombre || raw.houseName || fallback.name, 48) || 'Casa JEMMO',
    short: cleanText(raw.short || raw.siglas || fallback.short, 4).toUpperCase(),
    country: cleanText(raw.country || raw.pais || fallback.country, 40),
    city: cleanText(raw.city || raw.ciudad || fallback.city, 40),
    flag: cleanText(raw.flag || raw.bandera || fallback.flag, 6),
    emblem: cleanText(raw.emblem || raw.emblema || fallback.emblem || raw.short, 6),
    members: number(raw.members ?? raw.miembros ?? fallback.members),
    score: number(raw.score ?? raw.puntos ?? fallback.score),
    rank: Math.max(1, number(raw.rank ?? raw.posicion ?? fallback.rank) || 999),
    status: ['battle', 'open', 'closed'].includes(raw.status) ? raw.status : (fallback.status || 'open'),
    featured: raw.featured === true || raw.destacada === true || fallback.featured === true,
    newHouse: raw.newHouse === true || raw.nueva === true || fallback.newHouse === true,
    accent: cleanText(raw.accent || raw.color || fallback.accent, 24) || '#c441ec',
    glow: cleanText(raw.glow || fallback.glow, 48) || 'rgba(196,65,236,.18)',
    description: cleanText(raw.description || raw.descripcion || fallback.description, 180) || 'Comunidad de JEMMO LIVE.'
  };
}

let houses = FALLBACK_HOUSES.map(item => normalizeHouse(item, item));
let currentFilter = 'all';
let currentQuery = '';
let pendingRequest = readLocalRequest();
let selectedHouse = null;

async function loadCloudHouses() {
  if (!navigator.onLine) return houses;
  try {
    const services = await firebaseServices();
    if (!services) return houses;
    const snapshot = await services.getDocs(services.collection(services.db, 'casas'));
    if (snapshot.empty) return houses;
    const byId = new Map(houses.map(item => [item.id, item]));
    snapshot.docs.slice(0, 80).forEach(document => {
      const data = document.data() || {};
      const fallback = byId.get(document.id) || {};
      const normalized = normalizeHouse({ id: document.id, ...data }, fallback);
      byId.set(normalized.id, normalized);
    });
    houses = [...byId.values()].sort((a, b) => a.rank - b.rank || b.score - a.score);
  } catch (error) {
    console.warn('JEMMO Casas: catálogo local activo', error?.code || error);
  }
  return houses;
}

async function loadCloudRequest() {
  const uid = activeUid();
  if (!uid || !navigator.onLine) return pendingRequest;
  try {
    const services = await firebaseServices();
    if (!services) return pendingRequest;
    const snapshot = await services.getDoc(services.doc(services.db, 'solicitudesCasa', uid));
    if (snapshot.exists()) {
      const data = snapshot.data() || {};
      if (data.houseId) {
        pendingRequest = {
          houseId: cleanText(data.houseId, 60),
          houseName: cleanText(data.houseName || data.nombreCasa, 48),
          country: cleanText(data.country || data.pais, 40),
          status: cleanText(data.status || data.estado || 'pending', 24),
          requestedAt: number(data.requestedAtClient) || Date.now()
        };
        writeLocalRequest(pendingRequest, uid);
      }
    }
  } catch (error) {
    console.warn('JEMMO Casas: solicitud local activa', error?.code || error);
  }
  return pendingRequest;
}

function cardStyle(house) {
  return `--house-accent:${escapeHtml(house.accent)};--house-glow:${escapeHtml(house.glow)}`;
}

function renderHome() {
  const target = $('#homeHouseGrid');
  if (!target) return;
  const featured = houses.filter(house => house.featured).slice(0, 5);
  target.innerHTML = featured.map(house => `
    <a class="home-house-card" href="casa-demo.html?casa=${encodeURIComponent(house.id)}#explorar" style="${cardStyle(house)}">
      <span class="home-house-top"><span class="home-house-emblem">${escapeHtml(house.emblem || house.short)}</span>${house.status === 'battle' ? '<span class="house-live">EN BATALLA</span>' : ''}</span>
      <h3>${escapeHtml(house.name)}</h3>
      <p>${escapeHtml(house.flag)} ${escapeHtml(house.city || house.country)}</p>
      <span class="home-house-stats"><b>${formatNumber(house.members)} miembros</b><b>${formatNumber(house.score)} pts</b></span>
    </a>`).join('');
}

function matchesFilter(house) {
  if (currentFilter === 'battle') return house.status === 'battle';
  if (currentFilter === 'open') return house.status === 'open' || house.status === 'battle';
  if (currentFilter === 'new') return house.newHouse;
  return true;
}

function matchesQuery(house) {
  if (!currentQuery) return true;
  const haystack = `${house.name} ${house.country} ${house.city} ${house.description}`.toLocaleLowerCase('es');
  return haystack.includes(currentQuery);
}

function requestFor(house) {
  return pendingRequest?.houseId === house.id;
}

function renderExplorer() {
  const target = $('#houseExplorerGrid');
  if (!target) return;
  const filtered = houses.filter(house => matchesFilter(house) && matchesQuery(house));
  const count = $('#houseResultCount');
  if (count) count.textContent = `${filtered.length} ${filtered.length === 1 ? 'Casa' : 'Casas'}`;
  if (!filtered.length) {
    target.innerHTML = '<div class="house-empty">No encontramos Casas con esos filtros. Prueba otra búsqueda.</div>';
    return;
  }
  target.innerHTML = filtered.map(house => `
    <article class="house-card" style="${cardStyle(house)}" data-house-card="${escapeHtml(house.id)}">
      <div class="house-card-head"><span class="house-card-emblem">${escapeHtml(house.emblem || house.short)}</span><span class="house-card-rank">#${house.rank}</span></div>
      <h3>${escapeHtml(house.name)}</h3>
      <div class="house-card-location">${escapeHtml(house.flag)} ${escapeHtml(house.city || house.country)}</div>
      <p class="house-card-description">${escapeHtml(house.description)}</p>
      <div class="house-card-stats"><span><small>MIEMBROS</small><b>${formatNumber(house.members)}</b></span><span><small>PUNTOS</small><b>${formatNumber(house.score)}</b></span></div>
      <div class="house-card-actions">
        <button class="house-details-button" type="button" data-house-details="${escapeHtml(house.id)}">VER</button>
        <button class="house-join-button ${requestFor(house) ? 'requested' : ''}" type="button" data-house-join="${escapeHtml(house.id)}">${requestFor(house) ? 'SOLICITADA' : 'UNIRME'}</button>
      </div>
    </article>`).join('');
}

function renderRanking() {
  const target = $('#houseRanking');
  if (!target) return;
  target.innerHTML = [...houses].sort((a, b) => a.rank - b.rank || b.score - a.score).slice(0, 6).map((house, index) => `
    <div class="house-rank-row" style="--house-accent:${escapeHtml(house.accent)}">
      <span class="house-rank-position">${index + 1}</span>
      <span class="house-rank-emblem">${escapeHtml(house.emblem || house.short)}</span>
      <div><h3>${escapeHtml(house.name)}</h3><small>${escapeHtml(house.flag)} ${formatNumber(house.members)} miembros</small></div>
      <span class="house-rank-score"><b>${formatNumber(house.score)}</b><small>PUNTOS</small></span>
    </div>`).join('');
}

function renderMyHouse() {
  const panel = $('#myHousePanel');
  if (!panel) return;
  if (!pendingRequest) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const statusText = pendingRequest.status === 'accepted' ? 'ACEPTADA' : pendingRequest.status === 'rejected' ? 'REVISIÓN FINALIZADA' : 'SOLICITUD PENDIENTE';
  panel.innerHTML = `<span class="request-badge">${escapeHtml(statusText)}</span><h2>${escapeHtml(pendingRequest.houseName || 'Casa solicitada')}</h2><p>La solicitud está guardada. No se enviará otra mientras esta continúe activa.</p>`;
}

function renderAll() {
  renderHome();
  renderExplorer();
  renderRanking();
  renderMyHouse();
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

function houseById(id) {
  return houses.find(house => house.id === id) || houses[0];
}

function openHouse(house, joinFirst = false) {
  const modal = $('#houseModal');
  const content = $('#houseModalContent');
  if (!modal || !content || !house) return;
  selectedHouse = house;
  const requested = requestFor(house);
  content.innerHTML = `
    <div class="house-modal-head" style="--house-accent:${escapeHtml(house.accent)}">
      <span>${escapeHtml(house.emblem || house.short)}</span>
      <div><small>${house.status === 'battle' ? 'CASA EN BATALLA' : 'COMUNIDAD JEMMO LIVE'}</small><h2 id="houseModalTitle">${escapeHtml(house.name)}</h2></div>
    </div>
    <p class="house-modal-copy">${escapeHtml(house.description)}</p>
    <div class="house-modal-facts"><div><small>UBICACIÓN</small><b>${escapeHtml(house.flag)} ${escapeHtml(house.city || house.country)}</b></div><div><small>MIEMBROS</small><b>${formatNumber(house.members)}</b></div><div><small>RANKING</small><b>#${house.rank}</b></div></div>
    <button class="house-confirm" id="confirmHouseJoin" type="button" ${requested ? 'disabled' : ''}>${requested ? 'SOLICITUD YA ENVIADA' : 'SOLICITAR UNIRME'}</button>
    <p class="house-modal-note" id="houseJoinStatus">La Casa revisará la solicitud antes de añadirte.</p>`;
  setModalVisibility(modal, true);
  $('#confirmHouseJoin')?.addEventListener('click', () => requestJoin(house));
  if (joinFirst) setTimeout(() => $('#confirmHouseJoin')?.focus(), 80);
}

async function requestJoin(house) {
  const uid = activeUid();
  const button = $('#confirmHouseJoin');
  const status = $('#houseJoinStatus');
  if (!uid) {
    if (status) status.textContent = 'No se pudo confirmar tu sesión. Vuelve a iniciar sesión.';
    return;
  }
  if (pendingRequest && pendingRequest.houseId !== house.id && pendingRequest.status !== 'rejected') {
    if (status) status.textContent = `Ya tienes una solicitud activa para ${pendingRequest.houseName}.`;
    return;
  }
  if (button) { button.disabled = true; button.textContent = 'GUARDANDO…'; }
  const request = {
    houseId: house.id,
    houseName: house.name,
    country: house.country,
    status: 'pending',
    requestedAt: Date.now()
  };
  pendingRequest = request;
  writeLocalRequest(request, uid);
  let cloudSaved = false;
  if (navigator.onLine) {
    try {
      const services = await firebaseServices();
      if (services) {
        await Promise.all([
          services.setDoc(services.doc(services.db, 'solicitudesCasa', uid), {
            uid, houseId: house.id, houseName: house.name, country: house.country,
            status: 'pending', source: 'house-explorer', requestedAtClient: request.requestedAt,
            requestedAt: services.serverTimestamp(), updatedAt: services.serverTimestamp()
          }, { merge: true }),
          services.setDoc(services.doc(services.db, 'users', uid), {
            houseRequestId: house.id, houseRequestName: house.name, houseRequestStatus: 'pending',
            houseRequestUpdatedAt: services.serverTimestamp()
          }, { merge: true })
        ]);
        cloudSaved = true;
      }
    } catch (error) {
      console.warn('JEMMO Casas: solicitud guardada localmente', error?.code || error);
    }
  }
  if (status) status.textContent = cloudSaved ? 'Solicitud enviada. La Casa debe revisarla antes de aceptarte.' : 'Solicitud guardada en el móvil. Se sincronizará cuando haya conexión.';
  if (button) button.textContent = 'SOLICITUD ENVIADA';
  renderAll();
}

function openHelp() {
  const modal = $('#houseModal');
  const content = $('#houseModalContent');
  if (!modal || !content) return;
  content.innerHTML = `<div class="houses-help-card"><div class="house-modal-head"><span>?</span><div><small>GUÍA RÁPIDA</small><h2 id="houseModalTitle">Cómo funcionan las Casas</h2></div></div><ul><li>Solo puedes mantener una solicitud activa de ingreso.</li><li>La Casa revisa tu solicitud antes de añadirte.</li><li>Las Batallas y el Elevador suman los puntos de la comunidad.</li><li>Crear una Casa requiere revisión y rol de agente.</li></ul></div>`;
  setModalVisibility(modal, true);
}

function openCreateHouse() {
  const modal = $('#createHouseModal');
  const status = $('#createHouseStatus');
  if (status) status.textContent = '';
  setModalVisibility(modal, true);
}

async function submitCreateHouse(event) {
  event.preventDefault();
  const uid = activeUid();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const status = $('#createHouseStatus');
  const data = new FormData(form);
  const name = cleanText(data.get('name'), 36);
  const country = cleanText(data.get('country'), 40);
  const description = cleanText(data.get('description'), 180);
  if (!uid || !name || !country || !description) {
    if (status) status.textContent = 'Completa todos los campos y confirma tu sesión.';
    return;
  }
  submit.disabled = true;
  submit.textContent = 'ENVIANDO…';
  const request = { name, country, description, status: 'pending', requestedAt: Date.now() };
  try { localStorage.setItem(`jemmo_house_creation_request_v1_${uid}`, JSON.stringify(request)); } catch {}
  let cloudSaved = false;
  if (navigator.onLine) {
    try {
      const services = await firebaseServices();
      if (services) {
        await services.setDoc(services.doc(services.db, 'solicitudesCasaCreacion', uid), {
          uid, name, country, description, status: 'pending', source: 'house-explorer',
          requestedAtClient: request.requestedAt, requestedAt: services.serverTimestamp(),
          updatedAt: services.serverTimestamp()
        }, { merge: true });
        cloudSaved = true;
      }
    } catch (error) {
      console.warn('JEMMO Casas: creación guardada localmente', error?.code || error);
    }
  }
  if (status) status.textContent = cloudSaved ? 'Solicitud enviada para revisión de rol y datos.' : 'Solicitud guardada. Se sincronizará cuando vuelva la conexión.';
  submit.textContent = 'SOLICITUD GUARDADA';
  form.reset();
  setTimeout(() => { submit.disabled = false; submit.textContent = 'ENVIAR SOLICITUD'; }, 1800);
}

function bind() {
  $('#houseSearch')?.addEventListener('input', event => {
    currentQuery = cleanText(event.target.value, 80).toLocaleLowerCase('es');
    renderExplorer();
  });
  $('#houseFilters')?.addEventListener('click', event => {
    const button = event.target.closest('[data-house-filter]');
    if (!button) return;
    currentFilter = button.dataset.houseFilter || 'all';
    $$('#houseFilters [data-house-filter]').forEach(item => item.classList.toggle('active', item === button));
    renderExplorer();
  });
  document.addEventListener('click', event => {
    const details = event.target.closest('[data-house-details]');
    if (details) { openHouse(houseById(details.dataset.houseDetails)); return; }
    const join = event.target.closest('[data-house-join]');
    if (join) openHouse(houseById(join.dataset.houseJoin), true);
  });
  $('#houseModalClose')?.addEventListener('click', closeAllModals);
  $('#createHouseClose')?.addEventListener('click', closeAllModals);
  $('#houseModalBackdrop')?.addEventListener('click', closeAllModals);
  $('#housesHelp')?.addEventListener('click', openHelp);
  $('#createHouseOpen')?.addEventListener('click', openCreateHouse);
  $('#createHouseForm')?.addEventListener('submit', submitCreateHouse);
  window.addEventListener('keydown', event => { if (event.key === 'Escape') closeAllModals(); });
}

async function boot() {
  if (!$('#homeHouseGrid') && !$('#houseExplorerGrid')) return;
  bind();
  renderAll();
  await Promise.allSettled([loadCloudHouses(), loadCloudRequest()]);
  renderAll();
  const requestedId = new URL(location.href).searchParams.get('casa');
  if (requestedId && $('#houseExplorerGrid')) openHouse(houseById(requestedId));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
