/* JEMMO LIVE V1 · PANEL OPERATIVO Y TAREAS 24H PRUEBA 16
   Sala oficial, objetivos de tareas y control de emisores/emisoras. */
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
  title: 'Sala oficial de la Casa'
};

const state = {
  services: null,
  user: null,
  profile: {},
  houseId: '',
  house: {},
  memberRole: 'member',
  platformOwner: false,
  actualAdmin: false,
  isAdmin: false,
  testRole: '',
  members: [],
  profiles: new Map(),
  tasks: new Map(),
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
  state.isAdmin = state.testRole ? ['owner', 'agent'].includes(state.testRole) : state.actualAdmin;
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
  state.room = {};

  state.unsubscribers.push(s.onSnapshot(s.doc(s.db, 'casas', houseId), snapshot => {
    state.house = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : { id: houseId, name: $('#workspaceName')?.textContent || 'Casa JEMMO' };
    renderAll();
  }, error => console.warn('JEMMO Casa operaciones: Casa', error?.code || error)));

  state.unsubscribers.push(s.onSnapshot(s.doc(s.db, 'casas', houseId, 'miembros', state.user.uid), snapshot => {
    const data = snapshot.data() || {};
    state.memberRole = clean(data.role || state.profile.houseRole || 'member', 20);
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
  url.searchParams.set('title', `Sala 24/7 de ${houseName}`);
  url.searchParams.set('description', 'Audio Room permanente para tareas y organización de emisores y emisoras de la Casa.');
  return url.href;
}

async function ensurePermanentRoom() {
  if (!state.actualAdmin || !state.services || !state.houseId) return;
  const s = state.services;
  try {
    await s.setDoc(s.doc(s.db, 'casas', state.houseId, 'configuracion', 'sala'), {
      capacity: 20, mode: 'audio', permanent: true, open24x7: true,
      seatPolicy: clean(state.roomConfig.seatPolicy || 'members', 20),
      minLevel: Math.min(100, Math.max(1, Number(state.roomConfig.minLevel) || 1)),
      updatedBy: state.user.uid, updatedAt: s.serverTimestamp()
    }, { merge: true });
    await s.setDoc(s.doc(s.db, 'casas', state.houseId, 'salaActual', 'estado'), {
      status: 'open', permanent: true, open24x7: true, mode: 'audio', capacity: 20, count: 20,
      houseId: state.houseId, houseName: clean(state.house.name || 'Casa Padre JEMMO', 60),
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
  target.innerHTML = `
    <div class="house-room-hero is-live is-permanent">
      <span class="house-room-icon">🎙</span>
      <div><small>SALA DE CASA ABIERTA 24/7 · SOLO AUDIO</small><h2>Sala de ${escapeHtml(houseName)}</h2><p>${sessionActive ? `Hay una conexión activa dirigida por ${escapeHtml(state.room.hostName || 'la Casa')}.` : 'Entra directamente. La primera persona conectada prepara la sesión de audio de prueba.'}</p></div>
      <span class="house-room-status">24/7</span>
    </div>
    <div class="house-room-data">
      <div><small>CAPACIDAD</small><b>20</b></div><div><small>ACCESO A SILLA</small><b>${escapeHtml(policy)}</b></div><div><small>CÁMARA</small><b>DESACTIVADA</b></div>
    </div>
    <div class="house-room-actions"><a class="primary" href="${escapeHtml(directUrl)}">ENTRAR DIRECTAMENTE</a></div>
    ${state.isAdmin ? `<form class="house-room-config" id="houseRoomConfigForm"><label>Quién puede subir a silla<select name="seatPolicy"><option value="members" ${state.roomConfig.seatPolicy === 'members' ? 'selected' : ''}>Solo miembros</option><option value="fans" ${state.roomConfig.seatPolicy === 'fans' ? 'selected' : ''}>Fans y miembros</option><option value="followers" ${state.roomConfig.seatPolicy === 'followers' ? 'selected' : ''}>Seguidores, fans y miembros</option><option value="admins" ${state.roomConfig.seatPolicy === 'admins' ? 'selected' : ''}>Solo responsables</option><option value="manual" ${state.roomConfig.seatPolicy === 'manual' ? 'selected' : ''}>Invitación manual</option></select></label><label>Nivel mínimo<input name="minLevel" type="number" min="1" max="100" value="${number(state.roomConfig.minLevel || 1)}"></label><button type="submit">GUARDAR AJUSTES</button></form>` : ''}
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
  const emitters = state.members.filter(isEmitter), completed = emitters.filter(member => taskStatus(currentTask(member.uid)).complete).length;
  const totalLive = emitters.reduce((sum, member) => sum + minutes(currentTask(member.uid).liveSeconds), 0), totalRoom = emitters.reduce((sum, member) => sum + minutes(currentTask(member.uid).houseRoomSeconds), 0);
  target.innerHTML = `<div class="house-emitter-kpis"><div><b>${formatNumber(emitters.length)}</b><small>EMISORES/AS</small></div><div><b>${formatNumber(completed)}</b><small>TAREA COMPLETA</small></div><div><b>${formatNumber(totalLive)}</b><small>MIN LIVE</small></div><div><b>${formatNumber(totalRoom)}</b><small>MIN SALA</small></div></div><div class="house-emitter-list">${emitters.length ? emitters.map(member => {
    const task=currentTask(member.uid),status=taskStatus(task),profile=state.profiles.get(member.uid)||{},time=status.active?countdown(status.remainingMs):status.expired?'VENCIDA':'SIN ACTIVAR';
    return `<article class="house-emitter-row"><div class="house-emitter-head"><span>${escapeHtml((member.displayName||profile.displayName||'JM').slice(0,2).toUpperCase())}</span><div><b>${escapeHtml(member.displayName||profile.displayName||'Usuario JEMMO')}</b><small>${escapeHtml(member.publicId||profile.publicId||'ID pendiente')} · ${positionLabel(member)}</small></div><em class="${status.complete?'done':''}">${status.complete?'COMPLETA':status.active?'EN CURSO':'PENDIENTE'}</em></div><div class="house-emitter-metrics four"><span><small>LIVE</small><b>${formatMinutes(task.liveSeconds)}</b></span><span><small>SALA CASA</small><b>${formatMinutes(task.houseRoomSeconds)}</b></span><span><small>QUEDA</small><b data-task-countdown="${number(task.cycleEndsAtClient)}">${time}</b></span><span><small>REVISIÓN</small><b>${task.reviewStatus==='approved'?'APROBADA':'PENDIENTE'}</b></span></div>${state.isAdmin?`<div class="house-emitter-actions"><button type="button" data-review-task="approved" data-task-uid="${escapeHtml(member.uid)}">APROBAR</button><button type="button" class="secondary" data-reset-task="${escapeHtml(member.uid)}">NUEVO CICLO 24H</button></div>`:''}</article>`;
  }).join(''):'<div class="house-workspace-empty">Todavía no hay emisores o emisoras asignados. Al marcar a un miembro como EMISOR/A se activará automáticamente su tarea de 24 horas.</div>'}</div>`;
}

function renderTaskAdmin() {
  const target = $('#houseTaskAdmin'); if (!target) return;
  target.hidden = !state.isAdmin; if (!state.isAdmin) return;
  target.innerHTML = `<div class="house-workspace-title"><h2>CONFIGURACIÓN DE TAREAS</h2><span>Cada emisora dispone de un ciclo individual de 24 horas</span></div><form id="houseTaskConfigForm" class="house-task-config"><label>Minutos de LIVE<input name="liveTargetMinutes" type="number" min="0" max="10000" value="${number(state.taskConfig.liveTargetMinutes)}"></label><label>Minutos en Sala de Casa<input name="houseRoomTargetMinutes" type="number" min="0" max="10000" value="${number(state.taskConfig.houseRoomTargetMinutes)}"></label><label>Duración del ciclo<input value="24 horas" disabled></label><button type="submit">GUARDAR OBJETIVOS</button></form><p class="house-module-note">La tarea se activa automáticamente al ingresar o ser asignado como Emisor/a. Al vencer, el siguiente acceso a LIVE o Sala abre un nuevo ciclo y conserva un resumen del anterior. No genera JEMS ni pagos automáticos.</p>`;
}

function renderAssignments() {
  const target = $('#houseMemberAssignments');
  if (!target || !state.isAdmin) return;
  target.innerHTML = state.members.map(member => {
    const selected = clean(member.housePosition, 30) || (isEmitter(member) ? 'emitter' : member.role === 'owner' ? 'owner' : 'member');
    return `<article class="house-assignment-row"><div><b>${escapeHtml(member.displayName || 'Usuario JEMMO')}</b><small>${escapeHtml(member.publicId || 'ID pendiente')} · ${positionLabel(member)}</small></div><select data-house-position="${escapeHtml(member.uid)}" ${member.role === 'owner' ? 'disabled' : ''}><option value="member" ${selected === 'member' ? 'selected' : ''}>Miembro</option><option value="emitter" ${selected === 'emitter' ? 'selected' : ''}>Emisor/a</option><option value="agent" ${selected === 'agent' ? 'selected' : ''}>Agente</option><option value="admin" ${selected === 'admin' ? 'selected' : ''}>Apoyo administrativo</option><option value="owner" ${selected === 'owner' ? 'selected' : ''}>Propietario</option></select></article>`;
  }).join('') || '<div class="house-workspace-empty">No hay miembros para asignar.</div>';
}

function renderAll() {
  refreshAuthority();
  const workspace = $('#houseWorkspace');
  if (!workspace || workspace.hidden || !state.houseId) return;
  document.querySelectorAll('[data-workspace-tab="emitters"]').forEach(element => { element.hidden = !state.isAdmin; });
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
  if (!state.isAdmin) return;
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
    toast('Objetivos de tareas guardados.', 'success');
  } catch (error) { toast('No se pudieron guardar los objetivos.', 'error'); }
}

async function saveRoomConfig(event) {
  event.preventDefault();
  if (!state.isAdmin) return;
  const data = new FormData(event.currentTarget);
  try {
    await state.services.setDoc(state.services.doc(state.services.db, 'casas', state.houseId, 'configuracion', 'sala'), {
      capacity: 20,
      mode: 'audio',
      seatPolicy: clean(data.get('seatPolicy'), 20) || 'members',
      minLevel: Math.min(100, Math.max(1, Number(data.get('minLevel')) || 1)),
      updatedBy: state.user.uid,
      updatedAt: state.services.serverTimestamp()
    }, { merge: true });
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
  try { await activateTask(uid, 'admin_manual_24h_reset', true); toast('Nuevo ciclo de 24 horas activado.', 'success'); }
  catch { toast('No se pudo reiniciar la tarea.', 'error'); }
}

async function changePosition(uid, position) {
  if (!state.isAdmin || !uid) return;
  try {
    const s = state.services;
    await Promise.all([
      s.setDoc(s.doc(s.db, 'casas', state.houseId, 'miembros', uid), { housePosition: position, updatedAt: s.serverTimestamp() }, { merge: true }),
      s.setDoc(s.doc(s.db, 'users', uid), { housePosition: position, houseUpdatedAt: s.serverTimestamp() }, { merge: true })
    ]);
    if (position === 'emitter') await activateTask(uid, 'emitter_assigned');
    else await s.setDoc(s.doc(s.db, 'casas', state.houseId, 'tareas', uid), { taskState: 'paused', pausedReason: 'house_position_changed', pausedAt: s.serverTimestamp(), updatedAt: s.serverTimestamp() }, { merge: true });
    toast(position === 'emitter' ? 'Función Emisor/a asignada y tarea de 24 horas activada.' : 'Función interna actualizada.', 'success');
  } catch { toast('No se pudo cambiar la función.', 'error'); }
}

function bind() {
  document.addEventListener('submit', event => {
    if (event.target.id === 'houseTaskConfigForm') void saveTaskConfig(event);
    if (event.target.id === 'houseRoomConfigForm') void saveRoomConfig(event);
  });
  document.addEventListener('click', event => {
    const review = event.target.closest('[data-review-task]');
    if (review) { review.disabled = true; void reviewTask(review.dataset.taskUid, review.dataset.reviewTask).finally(() => { review.disabled = false; }); return; }
    const reset = event.target.closest('[data-reset-task]');
    if (reset) { reset.disabled = true; void resetTask(reset.dataset.resetTask).finally(() => { reset.disabled = false; }); return; }
  });
  document.addEventListener('change', event => {
    const select = event.target.closest('[data-house-position]');
    if (select) void changePosition(select.dataset.housePosition, select.value);
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
  getState: () => ({ houseId: state.houseId, isAdmin: state.isAdmin, actualAdmin: state.actualAdmin, testRole: state.testRole, memberRole: state.memberRole, room: { ...state.room }, taskConfig: { ...state.taskConfig } })
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else void boot();
