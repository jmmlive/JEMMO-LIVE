const VERSION = '40.0-test';
const FIREBASE_VERSION = '10.12.5';
const appEl = document.querySelector('#jaa-app');
if (!appEl) throw new Error('JEMMO Agent Agenda: contenedor no encontrado');

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clean = (value) => String(value ?? '').trim();
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const clamp = (value, min, max) => Math.min(max, Math.max(min, number(value)));
const formatInt = (value) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(number(value));
const formatHours = (seconds) => {
  const total = Math.max(0, Math.floor(number(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${formatInt(hours)} h ${String(minutes).padStart(2, '0')} min`;
};
const formatShortHours = (seconds) => `${(Math.max(0, number(seconds)) / 3600).toLocaleString('es-ES', {minimumFractionDigits: 1, maximumFractionDigits: 1})} h`;
const initials = (name) => clean(name).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'J';
const escapeHtml = (value) => clean(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const withTimeout = (promise, ms, fallback = null) => Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(fallback), ms))]);
const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const daysSince = (value) => {
  const date = normalizeDate(value);
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
};
const readStorage = (...keys) => {
  for (const key of keys) {
    try {
      const value = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (clean(value)) return clean(value);
    } catch (_) {}
  }
  return '';
};

const LEVELS = [
  { name: 'BASE', net: 0, liveRate: 2000, audioRate: 800, hours: 1 },
  { name: 'I', net: 150000, liveRate: 3000, audioRate: 800, hours: 2 },
  { name: 'H', net: 300000, liveRate: 5000, audioRate: 800, hours: 2 },
  { name: 'G', net: 900000, liveRate: 9000, audioRate: 800, hours: 3 },
  { name: 'F', net: 1200000, liveRate: 12000, audioRate: 800, hours: 3 },
  { name: 'E', net: 2000000, liveRate: 18000, audioRate: 800, hours: 3 },
  { name: 'D', net: 4000000, liveRate: 28000, audioRate: 800, hours: 3 },
  { name: 'C', net: 7000000, liveRate: 35000, audioRate: 800, hours: 3 },
  { name: 'B', net: 10000000, liveRate: 40000, audioRate: 800, hours: 3 },
  { name: 'A', net: 22000000, liveRate: 50000, audioRate: 800, hours: 3 },
  { name: 'S', net: 50000000, liveRate: 70000, audioRate: 800, hours: 4 }
];

const demoNames = ['Alma Vega','Daniela Sol','Nayra Luna','Mía Coral','Kiara Luz','Sara Neón','Valeria Mar','Lía Estrella','Camila Violeta','Noa Brisa'];
const demoCities = ['Madrid','Santa Cruz','La Habana','Cienfuegos','Valencia','Sevilla','Las Palmas','Málaga','Barcelona','Santiago'];
const demoEmitters = demoNames.map((name, index) => {
  const liveToday = [2700, 5400, 1800, 7200, 3600, 8400, 4200, 6000, 2400, 6600][index];
  const audioToday = [900, 1800, 3000, 1200, 2400, 600, 3600, 1500, 2100, 3300][index];
  const gross = [420000,980000,215000,1420000,670000,310000,1950000,540000,760000,1180000][index];
  const net = Math.round(gross * .7);
  const level = [...LEVELS].reverse().find(item => net >= item.net) || LEVELS[0];
  const required = level.hours * 3600;
  return {
    uid: `demo-emitter-${index + 1}`,
    source: 'demo',
    name,
    publicId: `JEMMO-${1100200 + index}`,
    city: demoCities[index],
    avatar: '',
    online: index % 3 !== 2,
    createdAt: new Date(Date.now() - (530 + index * 121) * 86400000),
    liveToday,
    audioToday,
    liveTotal: 1250000 + index * 184000,
    audioTotal: 510000 + index * 97000,
    gross,
    emitterNet: net,
    jemmoShare: Math.round(gross * .2),
    agentShare: Math.round(gross * .1),
    confirmedAgent: Math.round(gross * .082),
    pendingAgent: Math.round(gross * .018),
    giftNet7d: net,
    taskLevel: level.name,
    liveRate: level.liveRate,
    audioRate: level.audioRate,
    requiredHours: level.hours,
    taskRequiredSeconds: required,
    taskDoneSeconds: Math.min(required, liveToday + audioToday),
    taskState: liveToday + audioToday >= required ? 'completed' : 'active',
    seatNow: index % 4 === 0,
    lastMovements: [
      { title:'Regalos en LIVE', detail:'Reparto 70/20/10 de demostración', amount:Math.round(gross * .061) },
      { title:'Regalos en Audio Room', detail:'Comisión atribuida al agente', amount:Math.round(gross * .026) },
      { title:'Pendiente de confirmar', detail:'Origen reversible en modo de pruebas', amount:Math.round(gross * .013) }
    ]
  };
});

const state = {
  firebase: null,
  agent: {
    uid: readStorage('jemmo_active_uid','jemmo_uid','activeUid'),
    name: 'Jesús',
    publicId: 'JEMMO · CUENTA RESPONSABLE',
    avatar: '',
    createdAt: new Date(Date.now() - 2500 * 86400000),
    level: 'AGENTE',
    houseId: new URLSearchParams(location.search).get('house') || readStorage('jemmo_house_id','jemmo_active_house') || 'padre'
  },
  realEmitters: [],
  allEmitters: [],
  visibleEmitters: [],
  period: 'today',
  query: '',
  selected: null,
  sync: 'loading'
};

async function attemptProjectBootstrap() {
  const candidates = ['./jemmo-session.js','./jemmo-cloud-profile.js','./jemmo-houses.js'];
  for (const path of candidates) {
    try { await import(path); } catch (_) {}
  }
}

async function connectFirebase() {
  try {
    await withTimeout(attemptProjectBootstrap(), 1800, null);
    const loaded = await withTimeout(Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]), 4500, null);
    if (!loaded) return null;
    const [appSdk, authSdk, fsSdk] = loaded;
    const apps = appSdk.getApps();
    if (!apps.length) return null;
    const app = apps[0];
    const auth = authSdk.getAuth(app);
    const db = fsSdk.getFirestore(app);
    state.agent.uid = auth.currentUser?.uid || state.agent.uid;
    return { appSdk, authSdk, fsSdk, app, auth, db };
  } catch (error) {
    console.info('[JEMMO Agent Agenda] Firebase no disponible; modo demo seguro.', error?.message || error);
    return null;
  }
}

function field(data, names, fallback = '') {
  for (const name of names) {
    if (data && data[name] !== undefined && data[name] !== null && data[name] !== '') return data[name];
  }
  return fallback;
}

function compatiblePosition(data) {
  const value = clean(field(data,['housePosition','position','houseRole','role'])).toLowerCase();
  return ['emitter','emisor','emisora','emisor/a','host'].includes(value);
}

async function getAgentProfile(firebase) {
  const { fsSdk, db } = firebase;
  if (!state.agent.uid) return;
  try {
    const snap = await fsSdk.getDoc(fsSdk.doc(db,'users',state.agent.uid));
    if (!snap.exists()) return;
    const data = snap.data();
    state.agent.name = clean(field(data,['displayName','publicName','name','nombre'],'Jesús')) || 'Jesús';
    state.agent.publicId = clean(field(data,['publicId','jemmoId','idPublica'],'JEMMO · CUENTA RESPONSABLE'));
    state.agent.avatar = clean(field(data,['avatarData','profilePhoto','fotoPerfil','profileImage','photoURL','photo','avatar']));
    state.agent.createdAt = field(data,['createdAt','fechaRegistro','registeredAt'],state.agent.createdAt);
    state.agent.houseId = clean(field(data,['houseId','casaId'],state.agent.houseId)) || state.agent.houseId;
  } catch (error) {
    console.warn('[JEMMO Agent Agenda] No se pudo leer el perfil del agente.', error);
  }
}

async function listAssignedMemberIds(firebase) {
  const { fsSdk, db } = firebase;
  const ids = new Set();
  const houseId = clean(state.agent.houseId);
  const agentUid = clean(state.agent.uid);
  if (!houseId || !agentUid) return [];
  try {
    const membersRef = fsSdk.collection(db,'casas',houseId,'miembros');
    const assigned = await fsSdk.getDocs(fsSdk.query(membersRef,fsSdk.where('assignedAgentUid','==',agentUid)));
    assigned.forEach(docSnap => { if (compatiblePosition(docSnap.data())) ids.add(docSnap.id); });
  } catch (error) {
    console.info('[JEMMO Agent Agenda] Consulta asignada no disponible; se intentará lectura compatible.', error?.message || error);
    try {
      const all = await fsSdk.getDocs(fsSdk.collection(db,'casas',houseId,'miembros'));
      all.forEach(docSnap => {
        const data = docSnap.data();
        if (compatiblePosition(data) && clean(field(data,['assignedAgentUid','agentUid','responsibleUid'])) === agentUid) ids.add(docSnap.id);
      });
    } catch (_) {}
  }
  return [...ids];
}

async function findRuthId(firebase, existingIds) {
  const { fsSdk, db } = firebase;
  if (existingIds.length) return '';
  try {
    const users = await fsSdk.getDocs(fsSdk.collection(db,'users'));
    let found = '';
    users.forEach(docSnap => {
      if (found) return;
      const data = docSnap.data();
      const name = clean(field(data,['displayName','publicName','name','nombre'])).toLowerCase();
      const assigned = clean(field(data,['assignedAgentUid','agentUid','responsibleUid']));
      if (name.includes('ruth') && (!assigned || assigned === state.agent.uid)) found = docSnap.id;
    });
    return found;
  } catch (_) { return ''; }
}

async function readEmitter(firebase, uid) {
  const { fsSdk, db } = firebase;
  const houseId = state.agent.houseId;
  const [profileSnap, taskSnap, summarySnap] = await Promise.allSettled([
    fsSdk.getDoc(fsSdk.doc(db,'users',uid)),
    fsSdk.getDoc(fsSdk.doc(db,'casas',houseId,'tareas',uid)),
    fsSdk.getDoc(fsSdk.doc(db,'casas',houseId,'resumenEmisoras',uid))
  ]);
  const profile = profileSnap.status === 'fulfilled' && profileSnap.value.exists() ? profileSnap.value.data() : {};
  const task = taskSnap.status === 'fulfilled' && taskSnap.value.exists() ? taskSnap.value.data() : {};
  const summary = summarySnap.status === 'fulfilled' && summarySnap.value.exists() ? summarySnap.value.data() : {};
  const name = clean(field(profile,['displayName','publicName','name','nombre'],'Emisora real'));
  const liveToday = number(field(task,['liveSeconds','liveTodaySeconds','todayLiveSeconds','liveSecondsCurrentCycle'],0));
  const audioToday = number(field(task,['audioSeconds','roomSeconds','audioTodaySeconds','todayRoomSeconds','roomSecondsCurrentCycle'],0));
  const liveTotal = number(field(profile,['totalLiveSeconds','liveLifetimeSeconds'],field(summary,['liveSecondsTotal'],0)));
  const audioTotal = number(field(profile,['totalAudioSeconds','roomLifetimeSeconds'],field(summary,['audioSecondsTotal','roomSecondsTotal'],0)));
  const gross = number(field(summary,['gross','grossJemmos','totalGross','regalosBrutos'],field(task,['gross7d','giftGross7d'],0)));
  const emitterNet = number(field(summary,['emitterShare','emitterNet','net70'],Math.round(gross * .7)));
  const agentShare = number(field(summary,['agentShare','houseShare','agent10','commission10'],Math.round(gross * .1)));
  const jemmoShare = number(field(summary,['appShare','jemmoShare','app20'],Math.round(gross * .2)));
  const giftNet7d = number(field(task,['giftNet7d','netGifts7d','sevenDayNet'],emitterNet));
  const levelName = clean(field(task,['level','taskLevel','rewardLevel'],'BASE')).toUpperCase();
  const level = LEVELS.find(item => item.name === levelName) || [...LEVELS].reverse().find(item => giftNet7d >= item.net) || LEVELS[0];
  const requiredHours = number(field(task,['maxHours','dailyHours','requiredHours'],level.hours)) || level.hours;
  const requiredSeconds = requiredHours * 3600;
  const stateValue = clean(field(task,['taskState','state','status'],'active')).toLowerCase();
  return {
    uid,
    source:'real',
    name,
    publicId:clean(field(profile,['publicId','jemmoId','idPublica'],uid)),
    city:clean(field(profile,['city','ciudad','country','pais'],'Cuenta real')),
    avatar:clean(field(profile,['avatarData','profilePhoto','fotoPerfil','profileImage','photoURL','photo','avatar'])),
    online:Boolean(field(profile,['online','isOnline','presence'],false)),
    createdAt:field(profile,['createdAt','fechaRegistro','registeredAt'],null),
    liveToday,
    audioToday,
    liveTotal,
    audioTotal,
    gross,
    emitterNet,
    jemmoShare,
    agentShare,
    confirmedAgent:number(field(summary,['agentConfirmed','confirmedAgent','confirmed10'],agentShare)),
    pendingAgent:number(field(summary,['agentPending','pendingAgent','pending10'],0)),
    giftNet7d,
    taskLevel:level.name,
    liveRate:number(field(task,['liveRate','liveHourlyRate','rewardPerLiveHour'],level.liveRate)),
    audioRate:number(field(task,['audioRate','audioHourlyRate','rewardPerAudioHour'],800)),
    requiredHours,
    taskRequiredSeconds:requiredSeconds,
    taskDoneSeconds:Math.min(requiredSeconds,liveToday + audioToday),
    taskState:['completed','done','claimed','approved'].includes(stateValue) || liveToday + audioToday >= requiredSeconds ? 'completed' : stateValue || 'active',
    seatNow:Boolean(field(task,['houseSeatActive','seatActive','seated'],false)),
    lastMovements:[]
  };
}

async function loadRealData() {
  state.firebase = await connectFirebase();
  if (!state.firebase) {
    state.sync = 'demo';
    return;
  }
  await getAgentProfile(state.firebase);
  let ids = await listAssignedMemberIds(state.firebase);
  const ruthId = await findRuthId(state.firebase, ids);
  if (ruthId) ids.push(ruthId);
  ids = [...new Set(ids)].filter(uid => uid && uid !== state.agent.uid).slice(0,30);
  const results = await Promise.allSettled(ids.map(uid => readEmitter(state.firebase,uid)));
  state.realEmitters = results.filter(item => item.status === 'fulfilled').map(item => item.value);
  state.sync = state.realEmitters.length ? 'real' : 'demo';
}

function makeRuthPlaceholder() {
  return {
    uid:'ruth-real-pending', source:'real-pending', name:'Ruth María', publicId:'CUENTA REAL · CARGANDO FIREBASE', city:'Cienfuegos', avatar:'', online:false,
    createdAt:null, liveToday:0, audioToday:0, liveTotal:0, audioTotal:0, gross:0, emitterNet:0, jemmoShare:0, agentShare:0,
    confirmedAgent:0, pendingAgent:0, giftNet7d:0, taskLevel:'BASE', liveRate:2000, audioRate:800, requiredHours:1,
    taskRequiredSeconds:3600, taskDoneSeconds:0, taskState:'pending', seatNow:false, lastMovements:[]
  };
}

function composeEmitters() {
  const real = [...state.realEmitters];
  const hasRuth = real.some(item => item.name.toLowerCase().includes('ruth'));
  if (!hasRuth) real.unshift(makeRuthPlaceholder());
  const neededDemo = Math.max(0,11 - real.length);
  state.allEmitters = [...real, ...demoEmitters.slice(0,neededDemo)];
  applyFilters();
}

function avatarHtml(person, extraClass='') {
  const name = escapeHtml(person.name);
  const image = clean(person.avatar);
  return `<div class="jaa-avatar ${extraClass}">${image ? `<img src="${escapeHtml(image)}" alt="Foto de ${name}" referrerpolicy="no-referrer">` : escapeHtml(initials(person.name))}</div>`;
}

function emitterTaskProgress(item) {
  return clamp(item.taskRequiredSeconds ? item.taskDoneSeconds / item.taskRequiredSeconds * 100 : 0,0,100);
}

function applyFilters() {
  const query = state.query.toLowerCase();
  state.visibleEmitters = state.allEmitters.filter(item => {
    if (!query) return true;
    return `${item.name} ${item.publicId} ${item.city}`.toLowerCase().includes(query);
  });
  render();
}

function renderAgent() {
  $('#jaa-agent-name').textContent = state.agent.name;
  $('#jaa-agent-public-id').textContent = state.agent.publicId;
  $('#jaa-agent-level').textContent = state.agent.level;
  $('#jaa-agent-days').textContent = formatInt(daysSince(state.agent.createdAt));
  $('#jaa-agent-avatar').innerHTML = state.agent.avatar ? `<img src="${escapeHtml(state.agent.avatar)}" alt="Foto de ${escapeHtml(state.agent.name)}">` : escapeHtml(initials(state.agent.name));
  const gross = state.allEmitters.reduce((sum,item)=>sum+number(item.gross),0);
  const agent = state.allEmitters.reduce((sum,item)=>sum+number(item.agentShare),0);
  $('#jaa-total-gross').textContent = formatInt(gross);
  $('#jaa-total-agent').textContent = formatInt(agent);
  $('#jaa-total-emitters').textContent = formatInt(state.allEmitters.length);
  const progress = state.allEmitters.length ? state.allEmitters.reduce((sum,item)=>sum+emitterTaskProgress(item),0)/state.allEmitters.length : 0;
  $('#jaa-team-progress-label').textContent = `${Math.round(progress)}%`;
  $('#jaa-team-progress').style.width = `${progress}%`;
}

function renderSync() {
  const el = $('#jaa-sync-state');
  el.className = 'jaa-sync';
  if (state.sync === 'real') { el.classList.add('jaa-sync-real'); el.textContent = 'FIREBASE REAL'; }
  else if (state.sync === 'error') { el.classList.add('jaa-sync-error'); el.textContent = 'SIN CONEXIÓN'; }
  else if (state.sync === 'loading') { el.classList.add('jaa-sync-loading'); el.textContent = 'CARGANDO'; }
  else { el.classList.add('jaa-sync-demo'); el.textContent = 'REAL + DEMO'; }
}

function renderList() {
  const list = $('#jaa-list');
  if (!state.visibleEmitters.length) {
    list.innerHTML = '<div class="jaa-empty">No se encontraron emisoras con ese nombre o ID.</div>';
    return;
  }
  list.innerHTML = state.visibleEmitters.map(item => {
    const progress = emitterTaskProgress(item);
    const real = item.source === 'real';
    const pending = item.source === 'real-pending';
    const tagClass = real ? 'jaa-chip-real' : pending ? 'jaa-chip-real' : 'jaa-chip-demo';
    const tag = real ? 'REAL' : pending ? 'REAL · PENDIENTE' : 'DEMO';
    const status = item.taskState === 'completed' ? 'TAREA COMPLETA' : item.seatNow ? 'CONTANDO EN SILLA' : 'TAREA EN PROGRESO';
    return `<article class="jaa-emitter ${real ? 'is-real':''}" data-uid="${escapeHtml(item.uid)}">
      <button class="jaa-emitter-avatar" data-profile="${escapeHtml(item.uid)}" type="button" aria-label="Abrir perfil de ${escapeHtml(item.name)}">
        ${avatarHtml(item)}<i class="jaa-online ${item.online ? 'is-online':''}"></i>
      </button>
      <button class="jaa-emitter-main" data-detail="${escapeHtml(item.uid)}" type="button">
        <div class="jaa-emitter-name-row"><span class="jaa-emitter-name">${escapeHtml(item.name)}</span><span class="jaa-chip ${tagClass}">${tag}</span></div>
        <div class="jaa-emitter-id">${escapeHtml(item.publicId)} · ${escapeHtml(item.city)}</div>
        <div class="jaa-emitter-status"><i class="jaa-task-dot ${item.taskState === 'completed' ? 'is-done':''}"></i><span>${status}</span><span class="jaa-mini-progress"><i style="width:${progress}%"></i></span><b>${Math.round(progress)}%</b></div>
      </button>
      <button class="jaa-emitter-side" data-detail="${escapeHtml(item.uid)}" type="button">
        <span>TE HA GENERADO</span><strong>${formatInt(item.agentShare)}</strong><span>JEMS · 10%</span><small>Hoy ${formatShortHours(item.liveToday + item.audioToday)}</small>
      </button>
    </article>`;
  }).join('');
}

function render() {
  renderAgent();
  renderSync();
  renderList();
}

function openProfile(item) {
  if (!item || item.source !== 'real') {
    showToast(item?.source === 'real-pending' ? 'Ruth se abrirá cuando Firebase devuelva su UID real.' : 'Este perfil es de demostración visual.');
    return;
  }
  location.href = `perfil-publico.html?uid=${encodeURIComponent(item.uid)}`;
}

function movementHtml(item) {
  if (!item.lastMovements?.length) return '<div class="jaa-empty">Los movimientos reales aparecerán cuando Firebase tenga operaciones atribuidas a esta emisora.</div>';
  return item.lastMovements.map(movement => `<article class="jaa-movement"><div><strong>${escapeHtml(movement.title)}</strong><p>${escapeHtml(movement.detail)}</p></div><b>+${formatInt(movement.amount)}</b></article>`).join('');
}

function openDetail(item) {
  state.selected = item;
  const progress = emitterTaskProgress(item);
  const total = item.liveTotal + item.audioTotal;
  const dayTotal = item.liveToday + item.audioToday;
  const sheet = $('#jaa-detail');
  $('#jaa-detail-content').innerHTML = `
    <section class="jaa-detail-identity">
      ${avatarHtml(item)}
      <div><span class="jaa-chip ${item.source === 'demo' ? 'jaa-chip-demo':'jaa-chip-real'}">${item.source === 'demo' ? 'DATOS DEMO':'CUENTA REAL'}</span><h2 id="jaa-detail-name">${escapeHtml(item.name)}</h2><p>${escapeHtml(item.publicId)} · ${escapeHtml(item.city)}</p></div>
    </section>
    <section class="jaa-detail-grid">
      <article class="jaa-stat"><span>HORAS HOY</span><strong>${formatShortHours(dayTotal)}</strong><small>LIVE + Audio Room</small></article>
      <article class="jaa-stat"><span>HORAS TOTALES EN JEMMO</span><strong>${formatInt(Math.floor(total/3600))}</strong><small>${formatHours(total)}</small></article>
      <article class="jaa-stat"><span>DÍAS EN LA APP</span><strong>${formatInt(daysSince(item.createdAt))}</strong><small>desde su registro</small></article>
      <article class="jaa-stat"><span>EN SILLA AHORA</span><strong>${item.seatNow ? 'SÍ':'NO'}</strong><small>${item.seatNow ? 'contador activo':'sin actividad de silla'}</small></article>
    </section>
    <h3 class="jaa-section-title">TAREA ACTUAL · CICLO DE 24 HORAS</h3>
    <section class="jaa-task-card">
      <div class="jaa-task-card-head"><div><h3>NIVEL ${escapeHtml(item.taskLevel)} · ${item.requiredHours} ${item.requiredHours === 1 ? 'HORA':'HORAS'}</h3><p>LIVE ${formatInt(item.liveRate)} JEMS/h · Audio Room ${formatInt(item.audioRate)} JEMS/h</p></div><span class="jaa-task-state ${item.taskState === 'completed' ? 'is-done':''}">${item.taskState === 'completed' ? 'HECHA':'EN PROGRESO'}</span></div>
      <div class="jaa-task-bars">
        <div class="jaa-task-line"><div><span>PROGRESO TOTAL</span><b>${formatHours(item.taskDoneSeconds)} / ${item.requiredHours} h</b></div><div class="jaa-progress"><i style="width:${progress}%"></i></div></div>
        <div class="jaa-task-line"><div><span>LIVE HOY</span><b>${formatHours(item.liveToday)}</b></div><div class="jaa-progress"><i style="width:${clamp(item.liveToday/item.taskRequiredSeconds*100,0,100)}%"></i></div></div>
        <div class="jaa-task-line"><div><span>AUDIO ROOM HOY</span><b>${formatHours(item.audioToday)}</b></div><div class="jaa-progress"><i style="width:${clamp(item.audioToday/item.taskRequiredSeconds*100,0,100)}%"></i></div></div>
      </div>
    </section>
    <h3 class="jaa-section-title">RESULTADO ECONÓMICO PARA EL AGENTE</h3>
    <section class="jaa-detail-grid">
      <article class="jaa-stat"><span>REGALOS BRUTOS</span><strong>${formatInt(item.gross)}</strong><small>JEMMOS</small></article>
      <article class="jaa-stat"><span>EMISORA · 70%</span><strong>${formatInt(item.emitterNet)}</strong><small>JEMS</small></article>
      <article class="jaa-stat"><span>JEMMO LIVE · 20%</span><strong>${formatInt(item.jemmoShare)}</strong><small>JEMS</small></article>
      <article class="jaa-stat"><span>AGENTE/CASA · 10%</span><strong>${formatInt(item.agentShare)}</strong><small>JEMS generados</small></article>
    </section>
    <div class="jaa-split" aria-label="Reparto 70 20 10"><i></i><i></i><i></i></div>
    <div class="jaa-split-labels"><span>EMISORA<b>${formatInt(item.emitterNet)}</b></span><span>JEMMO<b>${formatInt(item.jemmoShare)}</b></span><span>AGENTE<b>${formatInt(item.agentShare)}</b></span></div>
    <h3 class="jaa-section-title">ESTADO DE LA COMISIÓN</h3>
    <section class="jaa-detail-grid">
      <article class="jaa-stat"><span>CONFIRMADO</span><strong>${formatInt(item.confirmedAgent)}</strong><small>JEMS</small></article>
      <article class="jaa-stat"><span>PENDIENTE</span><strong>${formatInt(item.pendingAgent)}</strong><small>JEMS</small></article>
    </section>
    <h3 class="jaa-section-title">ÚLTIMOS MOVIMIENTOS</h3>
    <section class="jaa-movements">${movementHtml(item)}</section>
    <p class="jaa-note">${item.source === 'demo' ? 'Este desglose es una simulación visual. No se ha escrito ningún saldo, tarea ni movimiento en Firebase.' : item.source === 'real-pending' ? 'Ruth está reservada como cuenta real, pero sus cifras permanecen en cero hasta recuperar su UID y sus documentos de Firebase.' : 'Datos leídos en modo consulta. La Agenda no modifica saldos ni tareas.'}</p>`;
  $('#jaa-open-profile').disabled = item.source !== 'real';
  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(()=>$('.jaa-sheet-panel',sheet)?.focus?.());
}

function closeDetail() {
  $('#jaa-detail').hidden = true;
  document.body.style.overflow = '';
  state.selected = null;
}

let toastTimer = 0;
function showToast(message) {
  let toast = $('#jaa-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'jaa-toast';
    Object.assign(toast.style,{position:'fixed',left:'50%',bottom:'calc(22px + env(safe-area-inset-bottom))',transform:'translateX(-50%)',zIndex:'300',maxWidth:'calc(100% - 34px)',padding:'10px 13px',border:'1px solid rgba(255,255,255,.16)',borderRadius:'13px',background:'rgba(19,13,25,.96)',boxShadow:'0 12px 38px rgba(0,0,0,.5)',color:'#fff',fontSize:'11px',fontWeight:'800',textAlign:'center'});
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{toast.hidden=true;},2600);
}

function bindEvents() {
  $('#jaa-search').addEventListener('input', event => { state.query = event.target.value; applyFilters(); });
  $$('.jaa-filters button').forEach(button => button.addEventListener('click',()=>{
    $$('.jaa-filters button').forEach(item=>item.classList.remove('is-active'));
    button.classList.add('is-active');
    state.period = button.dataset.period;
    showToast(`Periodo seleccionado: ${button.textContent}. Los datos de prueba conservan el mismo desglose visual.`);
  }));
  $('#jaa-list').addEventListener('click', event => {
    const detailButton = event.target.closest('[data-detail]');
    const profileButton = event.target.closest('[data-profile]');
    const uid = detailButton?.dataset.detail || profileButton?.dataset.profile;
    const item = state.allEmitters.find(emitter=>emitter.uid === uid);
    if (!item) return;
    if (profileButton) openProfile(item); else openDetail(item);
  });
  $$('[data-close-detail]').forEach(element=>element.addEventListener('click',closeDetail));
  $('#jaa-open-profile').addEventListener('click',()=>openProfile(state.selected));
  $('#jaa-refresh').addEventListener('click',async()=>{
    state.sync='loading'; renderSync(); state.realEmitters=[];
    await loadRealData(); composeEmitters(); showToast('Agenda actualizada.');
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#jaa-detail').hidden)closeDetail();});
}

async function boot() {
  bindEvents();
  state.sync = 'loading';
  composeEmitters();
  await loadRealData();
  composeEmitters();
  document.documentElement.dataset.jemmoAgentAgenda = VERSION;
  window.JemmoAgentAgenda = Object.freeze({ version:VERSION, refresh:async()=>{await loadRealData();composeEmitters();}, openByUid:(uid)=>{const item=state.allEmitters.find(e=>e.uid===uid);if(item)openDetail(item);} });
}

boot().catch(error=>{
  console.error('[JEMMO Agent Agenda] Error de inicio',error);
  state.sync='error'; composeEmitters();
});
