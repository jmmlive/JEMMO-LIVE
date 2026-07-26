/* JEMMO LIVE V1 · TAREAS, FINANZAS E IDENTIDAD DE SALA PRUEBA 27
   Sala oficial, tareas auditables, emisoras asignadas y reparto 70/20/10. */
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
    return { ...firestore, auth: authModule.getAuth(app), onAuthStateChanged: authModule.onAuthStateChanged, db: firestore.getFirestore(app) };
  });
  return firebasePromise;
}

const $ = selector => document.querySelector(selector);
const clean = (value, max = 180) => String(value || '').trim().slice(0, max);
const escapeHtml = value => clean(value, 1000).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const number = value => Math.max(0, Number(value) || 0);
const formatNumber = value => Math.round(number(value)).toLocaleString('es-ES');
const minutes = seconds => Math.floor(number(seconds) / 60);
const formatMinutes = seconds => `${minutes(seconds).toLocaleString('es-ES')} min`;
const formatDuration = seconds => { const total=Math.max(0,Math.floor(number(seconds))); const h=Math.floor(total/3600),m=Math.floor(total%3600/60),sec=total%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; };
const formatJems = value => `${formatNumber(value)} JEMS`;
const formatDate = value => {
  const millis = value?.toMillis?.() || (value?.seconds ? value.seconds * 1000 : Number(value || 0));
  if (!millis) return 'Sin actividad';
  try { return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(millis)); }
  catch { return new Date(millis).toLocaleString('es-ES'); }
};
const DAY_MS = 24 * 60 * 60 * 1000;
const countdown = value => { const total = Math.max(0, Math.ceil(number(value) / 1000)); const h = Math.floor(total / 3600), m = Math.floor(total % 3600 / 60), s = total % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; };

const DEFAULT_TASK_CONFIG = {
  enabled: true,
  liveTargetMinutes: 60,
  houseRoomTargetMinutes: 60,
  cycleHours: 24,
  minActiveDays: 1
};
const DEFAULT_ROOM_CONFIG = {
  capacity: 20,
  mode: 'audio',
  seatPolicy: 'members',
  minLevel: 1,
  title: 'Sala oficial de la Casa',
  description: 'Audio Room permanente para tareas y comunidad de la Casa.',
  roomPhotoData: ''
};

const state = {
  services: null,
  user: null,
  profile: {},
  houseId: '',
  house: {},
  memberRole: 'member',
  selfHousePosition: 'member',
  platformOwner: false,
  actualAdmin: false,
  actualAgent: false,
  isAdmin: false,
  canViewAgentPanel: false,
  canManageRoom: false,
  testRole: '',
  members: [],
  profiles: new Map(),
  tasks: new Map(),
  taskHistory: [],
  financeMovements: [],
  financeFilter: '30d',
  financeSearch: '',
  financeFrom: '',
  financeTo: '',
  selectedEmitterUid: '',
  taskConfig: { ...DEFAULT_TASK_CONFIG },
  roomConfig: { ...DEFAULT_ROOM_CONFIG },
  room: {},
  unsubscribers: [],
  attachToken: 0
};

function toast(message, mode = '') {
  const element = $('#demoToast');
  if (!element) return;
  element.textContent = clean(message, 220);
  element.className = `demo-toast show ${mode}`.trim();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { element.className = 'demo-toast'; }, 3200);
}

function waitForUser(s, timeout = 12000) {
  if (s.auth.currentUser) return Promise.resolve(s.auth.currentUser);
  return new Promise((resolve, reject) => {
    let stop = () => {};
    const timer = setTimeout(() => { stop(); reject(new Error('La sesión no está disponible.')); }, timeout);
    stop = s.onAuthStateChanged(s.auth, user => {
      if (!user) return;
      clearTimeout(timer);
      stop();
      resolve(user);
    }, error => { clearTimeout(timer); stop(); reject(error); });
  });
}

function normalizedAccountRole(value) {
  const role = clean(value, 40).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (['owner', 'propietario', 'superadmin'].includes(role)) return 'owner';
  if (['agente', 'agent', 'agency'].includes(role)) return 'agent';
  if (['emisor', 'emisora', 'host', 'streamer', 'creator', 'creador', 'creadora'].includes(role)) return 'emitter';
  return 'user';
}

function readTestRole() {
  if (!state.platformOwner || !state.user?.uid) return '';
  try {
    const saved = JSON.parse(localStorage.getItem(`jemmo_role_lab_v1_${state.user.uid}`) || 'null');
    return ['owner', 'agent', 'emitter', 'member'].includes(saved?.mode) ? saved.mode : 'owner';
  } catch { return 'owner'; }
}
function refreshAuthority() {
  state.testRole = readTestRole();
  state.actualAdmin = state.platformOwner || ['owner', 'admin'].includes(state.memberRole);
  state.actualAgent = state.selfHousePosition === 'agent' || normalizedAccountRole(state.profile.role || state.profile.rol || state.profile.accountRole) === 'agent';
  state.isAdmin = state.testRole ? ['owner', 'agent'].includes(state.testRole) : state.actualAdmin;
  state.canViewAgentPanel = Boolean(state.isAdmin || state.actualAgent);
  state.canManageRoom = Boolean(state.isAdmin || state.actualAgent);
}

function positionLabel(member) {
  if (member?.uid === state.user?.uid && state.testRole) {
    return ({ owner: 'PROPIETARIO', agent: 'AGENTE DE CASA', emitter: 'EMISOR/A', member: 'MIEMBRO' })[state.testRole] || 'MIEMBRO';
  }
  const position = clean(member.housePosition || member.position, 30);
  if (position === 'emitter') return 'EMISOR/A';
  if (position === 'agent') return 'AGENTE';
  if (member.role === 'owner') return 'PROPIETARIO';
  if (member.role === 'admin') return 'ADMINISTRADOR';
  const profile = state.profiles.get(member.uid) || {};
  const accountRole = normalizedAccountRole(profile.role || profile.rol || member.accountRole);
  if (accountRole === 'emitter') return 'EMISOR/A';
  if (accountRole === 'agent') return 'AGENTE';
  return 'MIEMBRO';
}

function isEmitter(member) {
  if (member?.uid === state.user?.uid && state.testRole) return state.testRole === 'emitter';
  const profile = state.profiles.get(member.uid) || {};
  return clean(member.housePosition, 30) === 'emitter' || normalizedAccountRole(profile.role || profile.rol || member.accountRole) === 'emitter';
}

function currentTask(uid) {
  const task = state.tasks.get(uid) || {};
  return { uid, taskState: 'waiting', liveSeconds: 0, houseRoomSeconds: 0, reviewStatus: 'pending', ...task };
}

function taskStatus(task) {
  const liveDone = minutes(task.liveSeconds) >= number(state.taskConfig.liveTargetMinutes);
  const roomDone = minutes(task.houseRoomSeconds) >= number(state.taskConfig.houseRoomTargetMinutes);
  const end = Number(task.cycleEndsAtClient || 0);
  const active = clean(task.taskState, 20) === 'active' && end > Date.now();
  return { liveDone, roomDone, complete: liveDone && roomDone, active, expired: Boolean(end && end <= Date.now()), remainingMs: Math.max(0, end - Date.now()) };
}

function memberAgentUid(member) {
  const profile = state.profiles.get(member?.uid) || {};
  return clean(member?.assignedAgentUid || profile.assignedAgentUid, 160);
}

function memberAgentName(member) {
  const profile = state.profiles.get(member?.uid) || {};
  const direct = clean(member?.assignedAgentName || profile.assignedAgentName, 80);
  if (direct) return direct;
  const uid = memberAgentUid(member);
  const agent = state.members.find(item => item.uid === uid);
  const agentProfile = state.profiles.get(uid) || {};
  return clean(agent?.displayName || agentProfile.displayName || (uid ? 'Agente asignado' : 'Sin agente'), 80);
}

function availableAgents() {
  const seen = new Set();
  const list = [];
  state.members.forEach(member => {
    const profile = state.profiles.get(member.uid) || {};
    const position = clean(member.housePosition || member.position, 30);
    const role = clean(member.role, 20);
    const accountRole = normalizedAccountRole(profile.role || profile.rol || member.accountRole);
    if (!(position === 'agent' || role === 'owner' || role === 'admin' || accountRole === 'agent')) return;
    if (!member.uid || seen.has(member.uid)) return;
    seen.add(member.uid);
    list.push({
      uid: member.uid,
      name: clean(member.displayName || profile.displayName || (role === 'owner' ? 'Casa / Propietario' : 'Agente JEMMO'), 80),
      label: role === 'owner' ? 'PROPIETARIO' : position === 'agent' || accountRole === 'agent' ? 'AGENTE' : 'ADMINISTRACIÓN'
    });
  });
  if (state.user?.uid && !seen.has(state.user.uid) && (state.platformOwner || state.actualAdmin || state.actualAgent)) {
    list.unshift({ uid: state.user.uid, name: clean(state.profile.displayName || state.user.displayName || 'Responsable de la Casa', 80), label: state.actualAgent ? 'AGENTE' : 'PROPIETARIO' });
  }
  return list;
}

function defaultAgentUid() {
  if (state.actualAgent && state.user?.uid) return state.user.uid;
  const agents = availableAgents();
  return clean(agents.find(item => item.label === 'AGENTE')?.uid || agents.find(item => item.label === 'PROPIETARIO')?.uid || agents[0]?.uid || state.user?.uid, 160);
}

async function writeAudit(action, subjectUid = '', details = {}) {
  if (!state.services || !state.houseId || !state.user?.uid) return;
  const s = state.services;
  try {
    await s.addDoc(s.collection(s.db, 'casas', state.houseId, 'auditoria'), {
      action: clean(action, 80),
      subjectUid: clean(subjectUid, 160),
      actorUid: state.user.uid,
      actorName: clean(state.profile.displayName || state.user.displayName || 'Usuario JEMMO', 80),
      details,
      createdAtClient: Date.now(),
      createdAt: s.serverTimestamp(),
      simulation: true,
      schemaVersion: 1
    });
  } catch (error) {
    console.warn('JEMMO auditoría Casa:', error?.code || error?.message || error);
  }
}

function visibleEmitters() {
  const emitters = state.members.filter(isEmitter);
  if (state.testRole === 'owner') return emitters;
  if (state.testRole === 'agent') return emitters.filter(member => memberAgentUid(member) === state.user?.uid);
  if (state.platformOwner || state.actualAdmin) return emitters;
  if (state.actualAgent) return emitters.filter(member => memberAgentUid(member) === state.user?.uid);
  return [];
}

function movementTime(movement) {
  return Number(movement?.createdAtClient || movement?.createdAt?.toMillis?.() || (movement?.createdAt?.seconds ? movement.createdAt.seconds * 1000 : 0));
}

function periodBounds() {
  const now = new Date(), end = Date.now() + 1000;
  if (state.financeFilter === 'today') { const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); return { start, end }; }
  if (state.financeFilter === '7d') return { start: Date.now() - 7 * DAY_MS, end };
  if (state.financeFilter === 'month') return { start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end };
  if (state.financeFilter === 'custom') {
    const start = state.financeFrom ? new Date(`${state.financeFrom}T00:00:00`).getTime() : 0;
    const customEnd = state.financeTo ? new Date(`${state.financeTo}T23:59:59.999`).getTime() : end;
    return { start: Number.isFinite(start) ? start : 0, end: Number.isFinite(customEnd) ? customEnd : end };
  }
  return { start: Date.now() - 30 * DAY_MS, end };
}

function visibleMovements() {
  const bounds = periodBounds();
  const allowed = new Set(visibleEmitters().map(member => member.uid));
  return state.financeMovements.filter(item => allowed.has(item.recipientUid) && movementTime(item) >= bounds.start && movementTime(item) <= bounds.end && (!state.actualAgent || state.platformOwner || !item.agentUid || item.agentUid === state.user?.uid));
}

function emitterFinance(uid) {
  const list = visibleMovements().filter(item => item.recipientUid === uid);
  return list.reduce((sum, item) => ({
    giftCount: sum.giftCount + 1,
    gross: sum.gross + number(item.totalJemmos),
    emitter: sum.emitter + number(item.emitterTotal),
    app: sum.app + number(item.appTotal),
    agent: sum.agent + number(item.agentTotal),
    agentConfirmed: sum.agentConfirmed + number(item.agentConfirmed),
    agentPending: sum.agentPending + number(item.agentPending),
    emitterConfirmed: sum.emitterConfirmed + number(item.emitterConfirmed),
    emitterPending: sum.emitterPending + number(item.emitterPending)
  }), { giftCount:0,gross:0,emitter:0,app:0,agent:0,agentConfirmed:0,agentPending:0,emitterConfirmed:0,emitterPending:0 });
}

function emitterMatches(member) {
  const query = clean(state.financeSearch, 80).toLocaleLowerCase('es');
  if (!query) return true;
  const profile = state.profiles.get(member.uid) || {};
  return [member.displayName, member.publicId, profile.displayName, profile.publicId].some(value => clean(value, 100).toLocaleLowerCase('es').includes(query));
}

function taskHistoryFor(uid) {
  return state.taskHistory.filter(item => item.uid === uid).sort((a,b) => Number(b.cycleStartedAtClient||0)-Number(a.cycleStartedAtClient||0));
}

function progress(value, target) {
  if (!target) return 100;
  return Math.min(100, Math.round(number(value) / Math.max(1, number(target)) * 100));
}

function stopSubscriptions() {
  state.unsubscribers.splice(0).forEach(stop => { try { stop(); } catch {} });
}

async function loadMemberProfiles(token) {
  const s = state.services;
  const missing = state.members.filter(member => !state.profiles.has(member.uid));
  await Promise.all(missing.slice(0, 80).map(async member => {
    try {
      const snapshot = await s.getDoc(s.doc(s.db, 'users', member.uid));
      if (snapshot.exists()) state.profiles.set(member.uid, snapshot.data() || {});
    } catch {}
  }));
  if (token === state.attachToken) renderAll();
}

function subscribeHouse(houseId) {
  stopSubscriptions();
  const s = state.services;
  const token = ++state.attachToken;
  state.houseId = houseId;
  state.members = [];
  state.tasks = new Map();
  state.taskHistory = [];
  state.financeMovements = [];
  state.selectedEmitterUid = '';
  state.room = {};

  state.unsubscribers.push(s.onSnapshot(s.doc(s.db, 'casas', houseId), snapshot => {
    state.house = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : { id: houseId, name: $('#workspaceName')?.textContent || 'Casa JEMMO' };
    renderAll();
  }, error => console.warn('JEMMO Casa operaciones: Casa', error?.code || error)));

  state.unsubscribers.push(s.onSnapshot(s.doc(s.db, 'casas', houseId, 'miembros', state.user.uid), snapshot => {
    const data = snapshot.data() || {};
    state.memberRole = clean(data.role || state.profile.houseRole || 'member', 20);
    state.selfHousePosition = clean(data.housePosition || state.profile.housePosition || 'member', 30);
    refreshAuthority();
    renderAll();
    if (state.actualAdmin) void ensurePermanentRoom();
  }));

  state.unsubscribers.push(s.onSnapshot(s.collection(s.db, 'casas', houseId, 'miembros'), snapshot => {
    state.members = snapshot.docs.map(document => ({ uid: document.id, ...document.data() }))
      .filter(member => member.status !== 'removed' && member.status !== 'left')
      .sort((a, b) => (a.role === 'owner' ? -2 : a.role === 'admin' ? -1 : 0) - (b.role === 'owner' ? -2 : b.role === 'admin' ? -1 : 0));
    renderAll();
    void loadMemberProfiles(token);
  }, error => console.warn('JEMMO Casa operaciones: miembros', error?.code || error)));

  state.unsubscribers.push(s.onSnapshot(s.collection(s.db, 'casas', houseId, 'tareas'), snapshot => {
    state.tasks = new Map(snapshot.docs.map(document => [document.id, { uid: document.id, ...document.data() }]));
    renderAll();
  }, error => console.warn('JEMMO Casa operaciones: tareas', error?.code || error)));

  state.unsubscribers.push(s.onSnapshot(s.collection(s.db, 'casas', houseId, 'historialTareas'), snapshot => {
    state.taskHistory = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
    renderAll();
  }, error => console.warn('JEMMO Casa operaciones: historial de tareas', error?.code || error)));

  state.unsubscribers.push(s.onSnapshot(s.collection(s.db, 'casas', houseId, 'movimientos'), snapshot => {
    state.financeMovements = snapshot.docs.map(document => ({ id: document.id, ...document.data() })).sort((a,b) => movementTime(b)-movementTime(a));
    renderAll();
  }, error => console.warn('JEMMO Casa operaciones: movimientos', error?.code || error)));

  state.unsubscribers.push(s.onSnapshot(s.doc(s.db, 'casas', houseId, 'configuracion', 'tareas'), snapshot => {
    const data = snapshot.data() || {};
    state.taskConfig = {
      ...DEFAULT_TASK_CONFIG,
      ...data,
      liveTargetMinutes: Math.max(0, Number(data.liveTargetMinutes ?? DEFAULT_TASK_CONFIG.liveTargetMinutes)),
      houseRoomTargetMinutes: Math.max(0, Number(data.houseRoomTargetMinutes ?? DEFAULT_TASK_CONFIG.houseRoomTargetMinutes)),
      cycleHours: 24,
      minActiveDays: Math.max(1, Number(data.minActiveDays ?? 1))
    };
    renderAll();
  }));

  state.unsubscribers.push(s.onSnapshot(s.doc(s.db, 'casas', houseId, 'configuracion', 'sala'), snapshot => {
    state.roomConfig = { ...DEFAULT_ROOM_CONFIG, ...(snapshot.data() || {}) };
    renderAll();
  }));

  state.unsubscribers.push(s.onSnapshot(s.doc(s.db, 'casas', houseId, 'salaActual', 'estado'), snapshot => {
    state.room = snapshot.exists() ? (snapshot.data() || {}) : {};
    renderAll();
  }, error => console.warn('JEMMO Casa operaciones: sala', error?.code || error)));
}

function permanentRoomUrl() {
  const houseName = clean(state.house.name || $('#workspaceName')?.textContent || 'Mi Casa', 60);
  const url = new URL('salas.html', location.href);
  url.searchParams.set('houseRoom', '1');
  url.searchParams.set('direct', '1');
  url.searchParams.set('house', state.houseId);
  url.searchParams.set('houseName', houseName);
  url.searchParams.set('mode', 'audio');
  url.searchParams.set('count', '20');
  url.searchParams.set('title', clean(state.roomConfig.title || `Sala 24/7 de ${houseName}`, 60));
  url.searchParams.set('description', clean(state.roomConfig.description || 'Audio Room permanente para tareas y comunidad de la Casa.', 180));
  return url.href;
}

async function ensurePermanentRoom() {
  if (!state.canManageRoom || !state.services || !state.houseId) return;
  const s = state.services;
  try {
    await s.setDoc(s.doc(s.db, 'casas', state.houseId, 'configuracion', 'sala'), {
      capacity: 20, mode: 'audio', permanent: true, open24x7: true,
      seatPolicy: clean(state.roomConfig.seatPolicy || 'members', 20),
      minLevel: Math.min(100, Math.max(1, Number(state.roomConfig.minLevel) || 1)),
      title: clean(state.roomConfig.title || `Sala 24/7 de ${clean(state.house.name || 'Casa JEMMO', 60)}`, 60),
      description: clean(state.roomConfig.description || 'Audio Room permanente para tareas y comunidad de la Casa.', 180),
      roomPhotoData: clean(state.roomConfig.roomPhotoData || state.house.logo || state.house.photo || state.house.cover, 260000),
      updatedBy: state.user.uid, updatedAt: s.serverTimestamp()
    }, { merge: true });
    await s.setDoc(s.doc(s.db, 'casas', state.houseId, 'salaActual', 'estado'), {
      status: 'open', permanent: true, open24x7: true, mode: 'audio', capacity: 20, count: 20,
      houseId: state.houseId, houseName: clean(state.house.name || 'Casa Padre JEMMO', 60),
      roomTitle: clean(state.roomConfig.title || `Sala 24/7 de ${clean(state.house.name || 'Casa JEMMO', 60)}`, 60),
      roomDescription: clean(state.roomConfig.description || 'Audio Room permanente para tareas y comunidad de la Casa.', 180),
      roomPhoto: clean(state.roomConfig.roomPhotoData || state.house.logo || state.house.photo || state.house.cover, 260000),
      directUrl: permanentRoomUrl(), updatedAt: s.serverTimestamp()
    }, { merge: true });
  } catch (error) { console.warn('JEMMO Casa: sala permanente', error?.code || error); }
}

function renderRoom() {
  const target = $('#houseRoomPanel');
  if (!target) return;
  const houseName = clean(state.house.name || $('#workspaceName')?.textContent || 'Mi Casa', 60);
  const directUrl = permanentRoomUrl();
  const sessionActive = clean(state.room.sessionStatus, 20) === 'active' && Number(state.room.sessionExpiresAtMs || state.room.expiresAtMs || 0) > Date.now();
  const policy = ({ members: 'Solo miembros', fans: 'Fans y miembros', followers: 'Seguidores, fans y miembros', admins: 'Solo responsables', manual: 'Invitación manual' })[state.roomConfig.seatPolicy] || 'Solo miembros';
  const roomTitle = clean(state.roomConfig.title || `Sala 24/7 de ${houseName}`, 60);
  const roomDescription = clean(state.roomConfig.description || 'Audio Room permanente para tareas y comunidad de la Casa.', 180);
  const roomPhoto = clean(state.roomConfig.roomPhotoData || state.house.logo || state.house.photo || state.house.cover, 260000);
  target.innerHTML = `
    <div class="house-room-hero is-live is-permanent">
      <span class="house-room-icon">${roomPhoto ? `<img src="${escapeHtml(roomPhoto)}" alt="Foto de la sala" onerror="this.remove()">` : '🎙'}</span>
      <div><small>SALA DE CASA ABIERTA 24/7 · SOLO AUDIO</small><h2>${escapeHtml(roomTitle)}</h2><p>${sessionActive ? `Sesión de audio dirigida por ${escapeHtml(state.room.hostName || 'la Casa')}.` : escapeHtml(roomDescription)}</p></div>
      <span class="house-room-status">24/7</span>
    </div>
    <div class="house-room-data">
      <div><small>CAPACIDAD</small><b>20</b></div><div><small>ACCESO A SILLA</small><b>${escapeHtml(policy)}</b></div><div><small>CÁMARA</small><b>DESACTIVADA</b></div>
    </div>
    <div class="house-room-actions"><a class="primary" href="${escapeHtml(directUrl)}">ENTRAR DIRECTAMENTE</a></div>
    ${state.canManageRoom ? `<form class="house-room-config expanded" id="houseRoomConfigForm"><label class="wide">Nombre de la Sala<input name="title" type="text" maxlength="60" value="${escapeHtml(roomTitle)}" required></label><label class="wide">Descripción<input name="description" type="text" maxlength="180" value="${escapeHtml(roomDescription)}" required></label><label class="wide">Foto oficial de la Sala<input name="roomPhoto" type="file" accept="image/*"></label><label>Quién puede subir a silla<select name="seatPolicy"><option value="members" ${state.roomConfig.seatPolicy === 'members' ? 'selected' : ''}>Solo miembros</option><option value="fans" ${state.roomConfig.seatPolicy === 'fans' ? 'selected' : ''}>Fans y miembros</option><option value="followers" ${state.roomConfig.seatPolicy === 'followers' ? 'selected' : ''}>Seguidores, fans y miembros</option><option value="admins" ${state.roomConfig.seatPolicy === 'admins' ? 'selected' : ''}>Solo responsables</option><option value="manual" ${state.roomConfig.seatPolicy === 'manual' ? 'selected' : ''}>Invitación manual</option></select></label><label>Nivel mínimo<input name="minLevel" type="number" min="1" max="100" value="${number(state.roomConfig.minLevel || 1)}"></label><button type="submit">GUARDAR IDENTIDAD Y AJUSTES</button></form>` : ''}
    <p class="house-module-note">Esta sala pertenece a la Casa, no al perfil personal de una emisora. Permanece disponible aunque una persona salga. Las emisoras entran desde Mi Casa o desde su perfil y el tiempo cuenta para la tarea.</p>`;
}

function renderOwnTasks() {
  const target = $('#houseOwnTasks');
  if (!target || !state.user) return;
  const task = currentTask(state.user.uid), status = taskStatus(task);
  const livePercent = progress(minutes(task.liveSeconds), state.taskConfig.liveTargetMinutes), roomPercent = progress(minutes(task.houseRoomSeconds), state.taskConfig.houseRoomTargetMinutes);
  const headline = status.active ? countdown(status.remainingMs) : status.expired ? 'CICLO VENCIDO' : 'PENDIENTE DE ACTIVAR';
  target.innerHTML = `
    <div class="house-task-deadline ${status.active ? 'active' : ''}"><div><small>TAREA AUTOMÁTICA DE 24 HORAS</small><b data-task-countdown="${number(task.cycleEndsAtClient)}">${headline}</b><span>${status.active ? 'El contador comenzó al activarse como Emisor/a.' : 'Se activa al ingresar o ser asignado como Emisor/a.'}</span></div><em class="${status.complete ? 'done' : ''}">${status.complete ? 'OBJETIVOS COMPLETOS' : status.active ? 'EN CURSO' : 'SIN INICIAR'}</em></div>
    <article class="house-task-progress"><div><span>🔴</span><div><b>LIVE</b><small>${formatMinutes(task.liveSeconds)} de ${formatNumber(state.taskConfig.liveTargetMinutes)} min</small></div><em>${livePercent}%</em></div><i><span style="width:${livePercent}%"></span></i><p>Cuenta únicamente mientras el LIVE permanece activo.</p></article>
    <article class="house-task-progress"><div><span>🎙</span><div><b>SALA DE LA CASA</b><small>${formatMinutes(task.houseRoomSeconds)} de ${formatNumber(state.taskConfig.houseRoomTargetMinutes)} min</small></div><em>${roomPercent}%</em></div><i><span style="width:${roomPercent}%"></span></i><p>Solo cuenta dentro de la Sala oficial 24/7 de la Casa.</p></article>
    <div class="house-task-review"><span>REVISIÓN DE LA CASA</span><b>${task.reviewStatus === 'approved' ? 'APROBADA' : task.reviewStatus === 'rejected' ? 'REVISAR' : 'PENDIENTE'}</b><small>Última actividad: ${escapeHtml(formatDate(task.lastActivityAt || task.lastActivityAtClient))}</small></div>`;
}

function renderEmitters() {
  const target = $('#houseEmittersDashboard'); if (!target) return;
  if (!state.canViewAgentPanel) {
    target.innerHTML = '<div class="house-workspace-empty">Este panel está reservado para propietarios, administradores y agentes autorizados.</div>';
    return;
  }
  const emitters = visibleEmitters().filter(emitterMatches);
  const movements = visibleMovements();
  const totals = movements.reduce((sum,item)=>({gross:sum.gross+number(item.totalJemmos),agent:sum.agent+number(item.agentTotal),confirmed:sum.confirmed+number(item.agentConfirmed),pending:sum.pending+number(item.agentPending)}),{gross:0,agent:0,confirmed:0,pending:0});
  const selected = state.selectedEmitterUid ? emitters.find(member => member.uid === state.selectedEmitterUid) : null;

  if (selected) {
    const profile=state.profiles.get(selected.uid)||{},task=currentTask(selected.uid),status=taskStatus(task),finance=emitterFinance(selected.uid),history=taskHistoryFor(selected.uid),movementList=movements.filter(item=>item.recipientUid===selected.uid).slice(0,80);
    target.innerHTML=`<button class="house-agent-back" type="button" data-agent-back>‹ VOLVER AL EQUIPO</button>
      <section class="house-agent-person"><span>${escapeHtml((selected.displayName||profile.displayName||'JM').slice(0,2).toUpperCase())}</span><div><small>EMISORA ASIGNADA</small><h3>${escapeHtml(selected.displayName||profile.displayName||'Usuario JEMMO')}</h3><p>${escapeHtml(selected.publicId||profile.publicId||'ID pendiente')} · ${positionLabel(selected)} · Agente: ${escapeHtml(memberAgentName(selected))}</p></div><em class="${status.complete?'done':''}">${status.complete?'TAREA COMPLETA':status.active?'EN CURSO':'PENDIENTE'}</em></section>
      <div class="house-agent-detail-kpis"><div><small>VALOR BRUTO</small><b>${formatJems(finance.gross)}</b></div><div><small>EMISORA · 70%</small><b>${formatJems(finance.emitter)}</b></div><div><small>JEMMO · 20%</small><b>${formatJems(finance.app)}</b></div><div><small>AGENTE/CASA · 10%</small><b>${formatJems(finance.agent)}</b></div></div>
      <div class="house-agent-confirmation"><span><small>COMISIÓN CONFIRMADA</small><b>${formatJems(finance.agentConfirmed)}</b></span><span><small>COMISIÓN PENDIENTE</small><b>${formatJems(finance.agentPending)}</b></span></div>
      <section class="house-agent-task-detail"><div class="house-workspace-title"><h2>TAREA ACTUAL</h2><span>${status.active?`Quedan ${countdown(status.remainingMs)}`:'Sin ciclo activo'}</span></div><div class="house-emitter-metrics four"><span><small>LIVE</small><b>${formatDuration(task.liveSeconds)}</b></span><span><small>SALA OFICIAL</small><b>${formatDuration(task.houseRoomSeconds)}</b></span><span><small>OBJETIVO LIVE</small><b>${formatNumber(state.taskConfig.liveTargetMinutes)} min</b></span><span><small>OBJETIVO SALA</small><b>${formatNumber(state.taskConfig.houseRoomTargetMinutes)} min</b></span></div>${state.isAdmin?`<div class="house-emitter-actions"><button type="button" data-review-task="approved" data-task-uid="${escapeHtml(selected.uid)}">APROBAR TAREA</button><button type="button" class="secondary" data-reset-task="${escapeHtml(selected.uid)}">NUEVO CICLO 24H</button></div>`:''}</section>
      <section class="house-agent-history"><div class="house-workspace-title"><h2>MOVIMIENTOS ECONÓMICOS</h2><span>${formatNumber(movementList.length)} registros</span></div>${movementList.length?movementList.map(item=>`<article><div><b>${escapeHtml(item.giftName||'Regalo JEMMO')}</b><small>${escapeHtml(item.context||'JEMMO LIVE')} · ${escapeHtml(formatDate(item.createdAt||item.createdAtClient))}</small></div><span><b>+${formatJems(item.agentTotal)}</b><small class="${item.status==='pending'?'pending':'confirmed'}">${item.status==='pending'?'PENDIENTE':'CONFIRMADO'}</small></span></article>`).join(''):'<div class="house-workspace-empty">No hay regalos registrados para esta emisora en el periodo seleccionado.</div>'}</section>
      <section class="house-agent-history"><div class="house-workspace-title"><h2>HISTORIAL DE CICLOS</h2><span>${formatNumber(history.length)} ciclos archivados</span></div>${history.length?history.slice(0,20).map(item=>`<article><div><b>Ciclo ${formatDate(item.cycleStartedAtClient)}</b><small>${formatDuration(item.liveSeconds)} LIVE · ${formatDuration(item.houseRoomSeconds)} Sala</small></div><span><b>${item.reviewStatus==='approved'?'APROBADO':'ARCHIVADO'}</b><small>${escapeHtml(item.archiveReason||'ciclo finalizado')}</small></span></article>`).join(''):'<div class="house-workspace-empty">Todavía no hay ciclos anteriores archivados.</div>'}</section>`;
    return;
  }

  const completed=visibleEmitters().filter(member=>taskStatus(currentTask(member.uid)).complete).length;
  const filterLabel=({today:'Hoy','7d':'7 días','30d':'30 días',month:'Mes actual',custom:'Rango'})[state.financeFilter]||'30 días';
  const rows=emitters.map(member=>{const task=currentTask(member.uid),status=taskStatus(task),profile=state.profiles.get(member.uid)||{},finance=emitterFinance(member.uid),time=status.active?countdown(status.remainingMs):status.expired?'VENCIDA':'SIN ACTIVAR';return{member,task,status,profile,finance,time}}).sort((a,b)=>b.finance.agent-a.finance.agent);
  target.innerHTML=`<section class="house-agent-summary"><div><small>MI COMISIÓN · ${filterLabel.toUpperCase()}</small><b>${formatJems(totals.agent)}</b><span>70% emisora · 20% JEMMO · 10% Casa/agente</span></div><div class="house-agent-summary-split"><span><small>CONFIRMADA</small><b>${formatJems(totals.confirmed)}</b></span><span><small>PENDIENTE</small><b>${formatJems(totals.pending)}</b></span></div></section>
    <div class="house-agent-periods"><button type="button" data-agent-period="today" class="${state.financeFilter==='today'?'active':''}">HOY</button><button type="button" data-agent-period="7d" class="${state.financeFilter==='7d'?'active':''}">7 DÍAS</button><button type="button" data-agent-period="30d" class="${state.financeFilter==='30d'?'active':''}">30 DÍAS</button><button type="button" data-agent-period="month" class="${state.financeFilter==='month'?'active':''}">MES</button><button type="button" data-agent-period="custom" class="${state.financeFilter==='custom'?'active':''}">RANGO</button></div>
    <form class="house-agent-search" id="houseAgentSearchForm"><input name="query" value="${escapeHtml(state.financeSearch)}" placeholder="Buscar nombre o ID JEMMO" maxlength="80"><button type="submit">BUSCAR</button></form>
    <form class="house-agent-dates ${state.financeFilter==='custom'?'show':''}" id="houseAgentDateForm"><label>Desde<input type="date" name="from" value="${escapeHtml(state.financeFrom)}"></label><label>Hasta<input type="date" name="to" value="${escapeHtml(state.financeTo)}"></label><button type="submit">APLICAR</button></form>
    <div class="house-emitter-kpis"><div><b>${formatNumber(visibleEmitters().length)}</b><small>EMISORAS ASIGNADAS</small></div><div><b>${formatNumber(completed)}</b><small>TAREA COMPLETA</small></div><div><b>${formatJems(totals.gross)}</b><small>VALOR BRUTO</small></div><div><b>${formatNumber(movements.length)}</b><small>REGALOS</small></div></div>
    <div class="house-emitter-list">${rows.length?rows.map(({member,task,status,profile,finance,time})=>`<article class="house-emitter-row house-emitter-open" data-emitter-detail="${escapeHtml(member.uid)}" role="button" tabindex="0"><div class="house-emitter-head"><span>${escapeHtml((member.displayName||profile.displayName||'JM').slice(0,2).toUpperCase())}</span><div><b>${escapeHtml(member.displayName||profile.displayName||'Usuario JEMMO')}</b><small>${escapeHtml(member.publicId||profile.publicId||'ID pendiente')} · ${positionLabel(member)} · Agente: ${escapeHtml(memberAgentName(member))}</small></div><em class="${status.complete?'done':''}">${status.complete?'COMPLETA':status.active?'EN CURSO':'PENDIENTE'}</em></div><div class="house-emitter-metrics four"><span><small>LIVE</small><b>${formatDuration(task.liveSeconds)}</b></span><span><small>SALA CASA</small><b>${formatDuration(task.houseRoomSeconds)}</b></span><span><small>REGALOS</small><b>${formatJems(finance.gross)}</b></span><span><small>MI 10%</small><b>${formatJems(finance.agent)}</b></span></div><div class="house-emitter-footer"><span>Queda: <b data-task-countdown="${number(task.cycleEndsAtClient)}">${time}</b></span><span>Confirmado: <b>${formatJems(finance.agentConfirmed)}</b></span><i>VER DETALLE ›</i></div></article>`).join(''):'<div class="house-workspace-empty">No hay emisoras asignadas que coincidan con la búsqueda. Asigna la función EMISOR/A desde Administración.</div>'}</div>
    <p class="house-module-note">Panel financiero de pruebas conectado a Firestore. Cada regalo queda ligado a la emisora, Casa, agente, fecha, estado y operación original. No permite modificar saldos.</p>`;
}

function renderTaskAdmin() {
  const target = $('#houseTaskAdmin'); if (!target) return;
  target.hidden = !state.isAdmin; if (!state.isAdmin) return;
  target.innerHTML = `<div class="house-workspace-title"><h2>CONFIGURACIÓN DE TAREAS</h2><span>Cada emisora dispone de un ciclo individual de 24 horas</span></div><form id="houseTaskConfigForm" class="house-task-config"><label>Minutos de LIVE<input name="liveTargetMinutes" type="number" min="0" max="10000" value="${number(state.taskConfig.liveTargetMinutes)}"></label><label>Minutos en Sala de Casa<input name="houseRoomTargetMinutes" type="number" min="0" max="10000" value="${number(state.taskConfig.houseRoomTargetMinutes)}"></label><label>Duración del ciclo<input value="24 horas" disabled></label><button type="submit">GUARDAR OBJETIVOS</button></form><p class="house-module-note">La tarea se activa automáticamente al ingresar o ser asignado como Emisor/a. Al vencer, el siguiente acceso a LIVE o Sala abre un nuevo ciclo y conserva un resumen del anterior. La tarea acredita actividad real, pero no concede salario automático. Las ganancias del agente proceden del 10% de regalos registrados para sus emisoras.</p>`;
}

function renderAssignments() {
  const target = $('#houseMemberAssignments');
  if (!target || !state.isAdmin) return;
  const agents = availableAgents();
  target.innerHTML = state.members.map(member => {
    const selected = clean(member.housePosition, 30) || (isEmitter(member) ? 'emitter' : member.role === 'owner' ? 'owner' : 'member');
    const assigned = memberAgentUid(member) || (selected === 'emitter' ? defaultAgentUid() : '');
    const agentControl = selected === 'emitter' ? `<label class="house-agent-assignment"><span>Agente responsable</span><select data-assigned-agent="${escapeHtml(member.uid)}" ${agents.length ? '' : 'disabled'}>${agents.length ? agents.map(agent => `<option value="${escapeHtml(agent.uid)}" ${assigned === agent.uid ? 'selected' : ''}>${escapeHtml(agent.name)} · ${escapeHtml(agent.label)}</option>`).join('') : '<option value="">Primero asigna un agente</option>'}</select></label>` : '';
    return `<article class="house-assignment-row"><div class="house-assignment-person"><b>${escapeHtml(member.displayName || 'Usuario JEMMO')}</b><small>${escapeHtml(member.publicId || 'ID pendiente')} · ${positionLabel(member)}</small></div><div class="house-assignment-controls"><label><span>Función en la Casa</span><select data-house-position="${escapeHtml(member.uid)}" ${member.role === 'owner' ? 'disabled' : ''}><option value="member" ${selected === 'member' ? 'selected' : ''}>Miembro</option><option value="emitter" ${selected === 'emitter' ? 'selected' : ''}>Emisor/a</option><option value="agent" ${selected === 'agent' ? 'selected' : ''}>Agente</option><option value="admin" ${selected === 'admin' ? 'selected' : ''}>Apoyo administrativo</option><option value="owner" ${selected === 'owner' ? 'selected' : ''}>Propietario</option></select></label>${agentControl}</div></article>`;
  }).join('') || '<div class="house-workspace-empty">No hay miembros para asignar.</div>';
}

function renderAll() {
  refreshAuthority();
  const workspace = $('#houseWorkspace');
  if (!workspace || workspace.hidden || !state.houseId) return;
  document.querySelectorAll('[data-workspace-tab="emitters"]').forEach(element => { element.hidden = !state.canViewAgentPanel; });
  const assignments = $('#houseAssignmentsBlock');
  if (assignments) assignments.hidden = !state.isAdmin;
  renderRoom();
  renderOwnTasks();
  renderEmitters();
  renderTaskAdmin();
  renderAssignments();
}

async function saveTaskConfig(event) {
  event.preventDefault();
  if (!state.canManageRoom) return;
  const data = new FormData(event.currentTarget);
  const next = {
    enabled: true,
    liveTargetMinutes: Math.max(0, Number(data.get('liveTargetMinutes')) || 0),
    houseRoomTargetMinutes: Math.max(0, Number(data.get('houseRoomTargetMinutes')) || 0),
    minActiveDays: 1,
    cycleHours: 24,
    updatedBy: state.user.uid,
    updatedAt: state.services.serverTimestamp()
  };
  try {
    await state.services.setDoc(state.services.doc(state.services.db, 'casas', state.houseId, 'configuracion', 'tareas'), next, { merge: true });
    await writeAudit('task_config_updated', '', { liveTargetMinutes: next.liveTargetMinutes, houseRoomTargetMinutes: next.houseRoomTargetMinutes, cycleHours: 24 });
    toast('Objetivos de tareas guardados.', 'success');
  } catch (error) { toast('No se pudieron guardar los objetivos.', 'error'); }
}


async function roomImageFromFile(file) {
  if (!(file instanceof File) || !file.size) return '';
  if (!String(file.type || '').startsWith('image/')) throw new Error('La imagen de la sala debe ser una foto.');
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen supera 8 MB.');
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('La imagen no es válida.'));
    img.src = source;
  });
  const size = 520, canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  let output = canvas.toDataURL('image/jpeg', .82);
  if (output.length > 250000) output = canvas.toDataURL('image/jpeg', .68);
  if (output.length > 260000) throw new Error('No se pudo reducir la imagen lo suficiente.');
  return output;
}

async function saveRoomConfig(event) {
  event.preventDefault();
  if (!state.isAdmin) return;
  const data = new FormData(event.currentTarget);
  try {
    const file = data.get('roomPhoto');
    const roomPhotoData = file instanceof File && file.size ? await roomImageFromFile(file) : clean(state.roomConfig.roomPhotoData || '', 260000);
    const title = clean(data.get('title'), 60) || `Sala 24/7 de ${clean(state.house.name || 'Casa JEMMO', 60)}`;
    const description = clean(data.get('description'), 180) || 'Audio Room permanente para tareas y comunidad de la Casa.';
    await state.services.setDoc(state.services.doc(state.services.db, 'casas', state.houseId, 'configuracion', 'sala'), {
      capacity: 20,
      mode: 'audio',
      title,
      description,
      roomPhotoData,
      seatPolicy: clean(data.get('seatPolicy'), 20) || 'members',
      minLevel: Math.min(100, Math.max(1, Number(data.get('minLevel')) || 1)),
      updatedBy: state.user.uid,
      updatedAt: state.services.serverTimestamp()
    }, { merge: true });
    await writeAudit('official_room_config_updated', '', { capacity: 20, mode: 'audio', title, seatPolicy: clean(data.get('seatPolicy'), 20) || 'members', minLevel: Math.min(100, Math.max(1, Number(data.get('minLevel')) || 1)) });
    toast('Ajustes de la sala guardados.', 'success');
  } catch { toast('No se pudieron guardar los ajustes.', 'error'); }
}

async function reviewTask(uid, status) {
  if (!state.isAdmin || !uid) return;
  try {
    await state.services.setDoc(state.services.doc(state.services.db, 'casas', state.houseId, 'tareas', uid), {
      uid,
      reviewStatus: status,
      reviewedBy: state.user.uid,
      reviewedByName: clean(state.profile.displayName || state.user.displayName || 'Administración', 48),
      reviewedAt: state.services.serverTimestamp(),
      updatedAt: state.services.serverTimestamp()
    }, { merge: true });
    await writeAudit(status === 'approved' ? 'task_approved' : 'task_reopened', uid, { reviewStatus: status });
    toast(status === 'approved' ? 'Tarea aprobada.' : 'Tarea reabierta para revisión.', 'success');
  } catch { toast('No se pudo actualizar la revisión.', 'error'); }
}

function newTaskCycle(uid, reason, current = {}) {
  const now = Date.now();
  return { uid, taskState: 'active', cycleDurationHours: 24, cycleStartedAtClient: now, cycleEndsAtClient: now + DAY_MS, cycleKey: `24h-${now}`, cycleNumber: Math.max(1, Number(current.cycleNumber || 0) + 1), liveSeconds: 0, houseRoomSeconds: 0, reviewStatus: 'pending', activatedReason: reason, activatedAtClient: Number(current.activatedAtClient || now), updatedAt: state.services.serverTimestamp() };
}

async function activateTask(uid, reason = 'emitter_assigned', force = false) {
  if (!state.services || !state.houseId || !uid) return;
  const s = state.services, ref = s.doc(s.db, 'casas', state.houseId, 'tareas', uid), now = Date.now();
  await s.runTransaction(s.db, async transaction => {
    const snapshot = await transaction.get(ref), current = snapshot.data() || {}, active = clean(current.taskState, 20) === 'active' && Number(current.cycleEndsAtClient || 0) > now;
    if (active && !force) return;
    if (Number(current.cycleStartedAtClient || 0)) {
      const history = s.doc(s.db, 'casas', state.houseId, 'historialTareas', `${uid}_${Number(current.cycleStartedAtClient)}`);
      transaction.set(history, { ...current, uid, houseId: state.houseId, archivedAtClient: now, archivedAt: s.serverTimestamp(), archiveReason: force ? 'manual_reset' : 'automatic_rollover' }, { merge: true });
    }
    transaction.set(ref, newTaskCycle(uid, reason, current), { merge: true });
  });
}

async function resetTask(uid) {
  if (!state.isAdmin || !uid) return;
  try { await activateTask(uid, 'admin_manual_24h_reset', true); await writeAudit('task_cycle_reset', uid, { cycleHours: 24 }); toast('Nuevo ciclo de 24 horas activado.', 'success'); }
  catch { toast('No se pudo reiniciar la tarea.', 'error'); }
}

async function changePosition(uid, position) {
  if (!state.isAdmin || !uid) return;
  try {
    const s = state.services;
    const existingMember = state.members.find(member => member.uid === uid) || {};
    const assignedAgentUid = position === 'emitter' ? clean(existingMember.assignedAgentUid || defaultAgentUid(), 160) : '';
    const assignedAgent = availableAgents().find(agent => agent.uid === assignedAgentUid);
    await Promise.all([
      s.setDoc(s.doc(s.db, 'casas', state.houseId, 'miembros', uid), { housePosition: position, assignedAgentUid: position === 'emitter' ? assignedAgentUid : s.deleteField(), assignedAgentName: position === 'emitter' ? clean(assignedAgent?.name || state.profile.displayName || state.user.displayName || 'Agente JEMMO', 80) : s.deleteField(), updatedAt: s.serverTimestamp() }, { merge: true }),
      s.setDoc(s.doc(s.db, 'users', uid), { housePosition: position, assignedAgentUid: position === 'emitter' ? assignedAgentUid : s.deleteField(), houseUpdatedAt: s.serverTimestamp() }, { merge: true })
    ]);
    if (position === 'emitter') window.JemmoWallet?.setMembership?.(uid, { hasHouse: true, houseId: state.houseId, houseName: state.house.name || 'Casa JEMMO', agentUid: assignedAgentUid });
    if (position === 'emitter') await activateTask(uid, 'emitter_assigned');
    else await s.setDoc(s.doc(s.db, 'casas', state.houseId, 'tareas', uid), { taskState: 'paused', pausedReason: 'house_position_changed', pausedAt: s.serverTimestamp(), updatedAt: s.serverTimestamp() }, { merge: true });
    await writeAudit('house_position_changed', uid, { previousPosition: clean(existingMember.housePosition || 'member', 30), newPosition: position, assignedAgentUid });
    toast(position === 'emitter' ? 'Función Emisor/a asignada y tarea de 24 horas activada.' : 'Función interna actualizada.', 'success');
  } catch { toast('No se pudo cambiar la función.', 'error'); }
}

async function assignAgent(emitterUid, agentUid) {
  if (!state.isAdmin || !emitterUid || !agentUid) return;
  const emitter = state.members.find(member => member.uid === emitterUid);
  if (!emitter || !isEmitter(emitter)) { toast('Primero asigna la función Emisor/a.', 'error'); renderAssignments(); return; }
  const agent = availableAgents().find(item => item.uid === agentUid);
  if (!agent) { toast('El agente seleccionado no pertenece a esta Casa.', 'error'); renderAssignments(); return; }
  try {
    const s = state.services;
    await Promise.all([
      s.setDoc(s.doc(s.db, 'casas', state.houseId, 'miembros', emitterUid), { assignedAgentUid: agent.uid, assignedAgentName: agent.name, updatedAt: s.serverTimestamp() }, { merge: true }),
      s.setDoc(s.doc(s.db, 'users', emitterUid), { assignedAgentUid: agent.uid, assignedAgentName: agent.name, houseUpdatedAt: s.serverTimestamp() }, { merge: true }),
      s.setDoc(s.doc(s.db, 'casas', state.houseId, 'tareas', emitterUid), { assignedAgentUid: agent.uid, assignedAgentName: agent.name, updatedAt: s.serverTimestamp() }, { merge: true })
    ]);
    window.JemmoWallet?.setMembership?.(emitterUid, { hasHouse: true, houseId: state.houseId, houseName: state.house.name || 'Casa JEMMO', agentUid: agent.uid });
    await writeAudit('emitter_agent_assigned', emitterUid, { agentUid: agent.uid, agentName: agent.name });
    toast(`${clean(emitter.displayName || 'La emisora', 60)} quedó asignada a ${agent.name}.`, 'success');
  } catch (error) {
    console.warn('JEMMO asignación de agente:', error?.code || error?.message || error);
    toast('No se pudo asignar el agente.', 'error');
  }
}

function bind() {
  document.addEventListener('submit', event => {
    if (event.target.id === 'houseTaskConfigForm') void saveTaskConfig(event);
    if (event.target.id === 'houseRoomConfigForm') void saveRoomConfig(event);
    if (event.target.id === 'houseAgentSearchForm') { event.preventDefault(); state.financeSearch = clean(new FormData(event.target).get('query'), 80); renderEmitters(); }
    if (event.target.id === 'houseAgentDateForm') { event.preventDefault(); const data=new FormData(event.target); state.financeFrom=clean(data.get('from'),10); state.financeTo=clean(data.get('to'),10); state.financeFilter='custom'; renderEmitters(); }
  });
  document.addEventListener('click', event => {
    const review = event.target.closest('[data-review-task]');
    if (review) { review.disabled = true; void reviewTask(review.dataset.taskUid, review.dataset.reviewTask).finally(() => { review.disabled = false; }); return; }
    const reset = event.target.closest('[data-reset-task]');
    if (reset) { reset.disabled = true; void resetTask(reset.dataset.resetTask).finally(() => { reset.disabled = false; }); return; }
    const period = event.target.closest('[data-agent-period]');
    if (period) { state.financeFilter=period.dataset.agentPeriod||'30d'; renderEmitters(); return; }
    const detail = event.target.closest('[data-emitter-detail]');
    if (detail) { state.selectedEmitterUid=detail.dataset.emitterDetail||''; renderEmitters(); return; }
    if (event.target.closest('[data-agent-back]')) { state.selectedEmitterUid=''; renderEmitters(); return; }
  });
  document.addEventListener('keydown', event => {
    const detail = event.target.closest?.('[data-emitter-detail]');
    if (!detail || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    state.selectedEmitterUid = detail.dataset.emitterDetail || '';
    renderEmitters();
  });
  document.addEventListener('change', event => {
    const position = event.target.closest('[data-house-position]');
    if (position) { void changePosition(position.dataset.housePosition, position.value); return; }
    const agent = event.target.closest('[data-assigned-agent]');
    if (agent) void assignAgent(agent.dataset.assignedAgent, agent.value);
  });
}

async function attachCurrentWorkspace() {
  const workspace = $('#houseWorkspace');
  if (!workspace || workspace.hidden) return;
  const houseId = clean(workspace.dataset.houseId || window.JemmoHouses?.getState?.().membership?.houseId, 80);
  if (!houseId || houseId === state.houseId) { renderAll(); return; }
  subscribeHouse(houseId);
}

async function boot() {
  if (!$('#houseWorkspace')) return;
  try {
    state.services = await firebaseServices();
    state.user = await waitForUser(state.services);
    const profileSnap = await state.services.getDoc(state.services.doc(state.services.db, 'users', state.user.uid));
    state.profile = profileSnap.exists() ? (profileSnap.data() || {}) : {};
    state.platformOwner = ['owner', 'propietario', 'superadmin'].includes(clean(state.profile.role || state.profile.rol, 30).toLocaleLowerCase('es'));
    try {
      const security = JSON.parse(localStorage.getItem('jemmo_owner_security_v1') || 'null');
      if (security?.ownerUid === state.user.uid) state.platformOwner = true;
    } catch {}
    refreshAuthority();
    bind();
    window.addEventListener('jemmo-test-role-change', event => { refreshAuthority(); renderAll(); if (event.detail?.mode === 'emitter') void activateTask(state.user.uid, 'owner_role_lab'); });
    const workspace = $('#houseWorkspace');
    new MutationObserver(() => void attachCurrentWorkspace()).observe(workspace, { attributes: true, attributeFilter: ['hidden', 'data-house-id'] });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-open-my-house],[data-workspace-tab],[data-house-action]')) setTimeout(() => void attachCurrentWorkspace(), 40);
    });
    await attachCurrentWorkspace();
    setInterval(() => { document.querySelectorAll('[data-task-countdown]').forEach(element => { const end = Number(element.dataset.taskCountdown || 0); if (end > Date.now()) element.textContent = countdown(end - Date.now()); }); }, 1000);
  } catch (error) {
    console.warn('JEMMO Casa operaciones:', error?.message || error);
  }
}

window.JemmoHouseOperations = {
  refresh: () => attachCurrentWorkspace(),
  getState: () => ({ houseId: state.houseId, isAdmin: state.isAdmin, actualAdmin: state.actualAdmin, actualAgent: state.actualAgent, canViewAgentPanel: state.canViewAgentPanel, testRole: state.testRole, memberRole: state.memberRole, room: { ...state.room }, taskConfig: { ...state.taskConfig }, movementCount: state.financeMovements.length })
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else void boot();
