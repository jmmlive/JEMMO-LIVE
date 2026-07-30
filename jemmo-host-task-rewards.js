/* JEMMO LIVE V1 · SEGURIDAD DE REGALOS Y ACCESO GLOBAL A MIS TAREAS PRUEBA 44
   Tareas exclusivas de Emisoras formalmente asignadas a una Casa.
   Cada hora se cobra por separado. El nivel usa únicamente el 70% neto de regalos recibidos en LIVE.
   MODO DE PRUEBAS: antes de producción, cálculo y abono deben validarse en backend. */
(() => {
  'use strict';
  if (window.JemmoHostTaskRewards?.version) return;

  const VERSION = '44.0-test';
  const params = new URLSearchParams(location.search);
  const pagePath = location.pathname.toLowerCase();
  const isLivePage = pagePath.endsWith('live.html');
  const isHouseRoom = pagePath.endsWith('salas.html') && (
    params.get('houseRoom') === '1' ||
    window.JemmoHouseRoomContext?.enabled === true
  );
  const isHomePage = pagePath.endsWith('inicio.html') || pagePath.endsWith('/');
  const isProfilePage = pagePath.endsWith('yo.html');
  const isGlobalTaskPage = isHomePage || isProfilePage;
  if (!isHouseRoom && !isLivePage && !isGlobalTaskPage) return;

  const firebaseConfig = {
    apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
    authDomain: 'jemmo-live.firebaseapp.com',
    projectId: 'jemmo-live',
    storageBucket: 'jemmo-live.firebasestorage.app',
    messagingSenderId: '355540892255',
    appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
  };

  const HOUR_SECONDS = 3600;
  const AUDIO_ROOM_REWARD = 800;
  const LIVE_MAX_HOURS = 3;
  const AUDIO_ROOM_MAX_HOURS = 2;
  const TIERS = Object.freeze([
    { code: 'BASE', target: 0, reward: 2000, hours: 1, label: 'Inicial' },
    { code: 'I', target: 150000, reward: 3000, hours: 2, label: 'Nivel I' },
    { code: 'H', target: 300000, reward: 5000, hours: 2, label: 'Nivel H' },
    { code: 'G', target: 900000, reward: 9000, hours: 3, label: 'Nivel G' },
    { code: 'F', target: 1200000, reward: 12000, hours: 3, label: 'Nivel F' },
    { code: 'E', target: 2000000, reward: 18000, hours: 3, label: 'Nivel E' },
    { code: 'D', target: 4000000, reward: 28000, hours: 3, label: 'Nivel D' },
    { code: 'C', target: 7000000, reward: 35000, hours: 3, label: 'Nivel C' },
    { code: 'B', target: 10000000, reward: 40000, hours: 3, label: 'Nivel B' },
    { code: 'A', target: 22000000, reward: 50000, hours: 3, label: 'Nivel A' },
    { code: 'S', target: 50000000, reward: 70000, hours: 4, label: 'Nivel S' }
  ]);

  const $ = id => document.getElementById(id);
  function clean(value, max = 180) {
    return String(value ?? '').trim().slice(0, max);
  }

  // La utilidad clean debe existir antes de resolver la Casa. En PRUEBA 33
  // se invocaba antes de inicializarse y el módulo se detenía con ReferenceError.
  window.__JEMMO_TASK_UI_OWNER__ = 'rewards-44-loading';

  let servicesPromise = null;
  let user = null;
  let profile = {};
  let member = {};
  let task = {};
  const roomHouseId = () => clean(
    window.JemmoHouseRoomContext?.id ||
    document.documentElement.dataset.jemmoHouseId ||
    params.get('house') ||
    '',
    80
  );
  let houseId = roomHouseId();
  let giftDocuments = [];
  let taskHistory = [];
  let taskRewards = [];
  let giftNet7d = 0;
  let giftBuckets = [];
  let emitter = false;
  let memberExists = false;
  let eligibilityState = 'checking';
  let migrationRunning = false;
  let cleanupRunning = false;
  let claiming = false;
  let attachedHouse = '';
  let lastTierSignature = '';
  let windowTimer = 0;
  let uiTimer = 0;
  let activity = { status: isGlobalTaskPage ? 'overview' : 'checking', type: isLivePage ? 'live' : isHouseRoom ? 'house_room' : 'overview', startedAtClient: 0, baseLiveSeconds: 0, baseHouseRoomSeconds: 0, seat: 0, reason: '', wakeActive: false, wakeSupported: true };
  const unsubscribers = [];
  const houseUnsubscribers = [];
  const seatTaskUnsubscribers = new Map();
  const seatTasks = new Map();

  const number = value => Math.max(0, Math.floor(Number(value) || 0));
  const fmt = value => number(value).toLocaleString('es-ES');
  const millis = value => value?.toMillis?.() || (value?.seconds ? Number(value.seconds) * 1000 : Number(value || 0));
  const totalSeconds = value => number(value.liveSeconds) + number(value.houseRoomSeconds);
  const cycleKey = value => clean(value.cycleKey || `24h-${number(value.cycleStartedAtClient)}`, 100);
  const dayKey = value => {
    const date = new Date(Number(value) || Date.now());
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const startOfDay = value => {
    const date = new Date(Number(value) || Date.now());
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };
  const giftWindowStart = value => {
    const date = new Date(startOfDay(value));
    date.setDate(date.getDate() - 6);
    return date.getTime();
  };
  const formatClock = seconds => {
    const total = number(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  function projectedTask() {
    const view = { ...task };
    if (activity.status !== 'active' || !activity.startedAtClient) return view;
    const elapsed = Math.max(0, Math.floor((Date.now() - activity.startedAtClient) / 1000));
    view.liveSeconds = activity.baseLiveSeconds + (activity.type === 'live' ? elapsed : 0);
    view.houseRoomSeconds = activity.baseHouseRoomSeconds + (activity.type === 'house_room' ? elapsed : 0);
    return view;
  }

  function compactClock(seconds) {
    const total = number(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  function emitterTaskDocument(value = {}) {
    const position = clean(value.housePosition, 30).toLowerCase();
    const role = clean(value.accountRole || value.role, 30).toLowerCase();
    return position === 'emitter' || role === 'emisor' || role === 'emisora' || role === 'emitter';
  }
  function remoteTaskProjection(value = {}) {
    const view = { ...value };
    const recent = clean(value.lastActivityType, 30) === 'house_room' && Date.now() - number(value.lastActivityAtClient) <= 90000;
    if (recent) view.houseRoomSeconds = number(value.houseRoomSeconds) + Math.max(0, Math.floor((Date.now() - number(value.lastActivityAtClient)) / 1000));
    return { view, recent };
  }
  function compactTaskVisual(value = {}, current = false) {
    const remote = current ? null : remoteTaskProjection(value);
    const view = current ? projectedTask() : remote.view;
    const recent = current ? activity.status === 'active' : remote.recent;
    const taskState = clean(value.taskState, 20).toLowerCase();
    const completion = clean(value.completionState, 20).toLowerCase();
    const ended = taskState === 'expired' || taskState === 'inactive' || completion === 'expired' || completion === 'inactive';
    const done = completion === 'paid' || value.rewardClaimed === true;
    const css = done ? 'done' : ended ? 'stopped' : recent ? 'active' : 'paused';
    const label = done ? 'COBRADA' : ended ? 'DETENIDA' : recent ? 'ACTIVA' : 'PAUSADA';
    const seconds = isLivePage ? number(view.liveSeconds) : number(view.houseRoomSeconds);
    return { css, label, seconds };
  }
  function clearSeatTaskListeners() {
    seatTaskUnsubscribers.forEach(stop => { try { stop(); } catch {} });
    seatTaskUnsubscribers.clear();
    seatTasks.clear();
  }
  function syncSeatTaskTabs() {
    if (!isHouseRoom) return;
    const seats = [...document.querySelectorAll('#seatsGrid .jr-seat[data-uid]')];
    seats.forEach(seat => {
      seat.classList.remove('has-task-tab');
      seat.querySelectorAll('.jr-seat-task-tab').forEach(node => node.remove());
      const uid = clean(seat.dataset.uid, 160);
      if (!uid) return;
      const current = Boolean(user && uid === user.uid);
      const value = current ? task : (seatTasks.get(uid) || {});
      if (current ? !emitter : !emitterTaskDocument(value)) return;
      const visual = compactTaskVisual(value, current);
      const tab = document.createElement('span');
      tab.className = `jr-seat-task-tab ${visual.css}`;
      tab.setAttribute('aria-label', `Tarea ${visual.label.toLowerCase()} · ${compactClock(visual.seconds)}`);
      tab.innerHTML = `<i></i><span>${visual.label}</span><b>${compactClock(visual.seconds)}</b>`;
      seat.classList.add('has-task-tab');
      seat.append(tab);
    });
  }
  async function syncSeatTaskListeners() {
    if (!isHouseRoom) return;
    if (!user || !houseId) { clearSeatTaskListeners(); syncSeatTaskTabs(); return; }
    const uids = new Set([...document.querySelectorAll('#seatsGrid .jr-seat[data-uid]')].map(node => clean(node.dataset.uid, 160)).filter(uid => uid && uid !== user.uid));
    for (const [uid, stop] of [...seatTaskUnsubscribers.entries()]) {
      if (uids.has(uid)) continue;
      try { stop(); } catch {}
      seatTaskUnsubscribers.delete(uid);
      seatTasks.delete(uid);
    }
    if (!uids.size) { syncSeatTaskTabs(); return; }
    const s = await services();
    uids.forEach(uid => {
      if (seatTaskUnsubscribers.has(uid)) return;
      const stop = s.onSnapshot(s.doc(s.db, 'casas', houseId, 'tareas', uid), snapshot => {
        seatTasks.set(uid, snapshot.data() || {});
        syncSeatTaskTabs();
      }, error => console.warn('JEMMO tareas: pestaña de Emisora', uid, error?.code || error?.message || error));
      seatTaskUnsubscribers.set(uid, stop);
    });
    syncSeatTaskTabs();
  }
  function handleSeatsRendered() {
    if (!isHouseRoom) return;
    syncSeatTaskTabs();
    void syncSeatTaskListeners();
  }
  function roomControlState() {
    try {
      if (isLivePage) return window.JemmoLiveTaskControls?.getState?.() || {};
      return window.JemmoHouseRoomControls?.getState?.() || {};
    } catch { return {}; }
  }
  function activityLabel() {
    if (isGlobalTaskPage) return 'PANEL PERMANENTE · DATOS DE FIREBASE';
    const controls = roomControlState();
    if (activity.status === 'active') {
      if (isLivePage) return 'ACTIVA · LIVE CONTANDO';
      const seat = activity.seat || controls.localSeat || 0;
      if (controls.moderatedMuted === true) return `ACTIVA · SILENCIO DE MODERACIÓN${seat ? ` · SILLA ${seat}` : ''}`;
      return `ACTIVA · CONTANDO${seat ? ` EN SILLA ${seat}` : ''}`;
    }
    if (document.hidden) return 'PAUSADA · JEMMO ESTÁ EN SEGUNDO PLANO';
    if (activity.reason === 'offline') return 'PAUSADA · SIN CONEXIÓN';
    if (isLivePage) {
      const reasons = Array.isArray(controls.pauseReasons) ? controls.pauseReasons : [];
      if (controls.liveOpen !== true) return 'PAUSADA · INICIA EL LIVE';
      if (reasons.includes('safety')) return 'PAUSADA · REVISIÓN DE SEGURIDAD';
      if (reasons.includes('camera') || controls.cameraEnabled === false || controls.videoTrackLive === false) return 'PAUSADA · ACTIVA LA CÁMARA';
      if (reasons.includes('microphone')) return 'PAUSADA · ACTIVA EL MICRÓFONO';
      if (reasons.includes('inactivity')) return 'PAUSADA · CONFIRMA ACTIVIDAD';
      return 'PREPARANDO CRONÓMETRO REAL…';
    }
    if (controls.houseSeatActive !== true) return 'PAUSADA · SUBE A UNA SILLA';
    if (controls.micEnabled !== true) return 'PAUSADA · ACTIVA EL MICRÓFONO';
    if (controls.mediaActive !== true) return 'PAUSADA · PERMITE EL MICRÓFONO';
    return 'PREPARANDO CRONÓMETRO…';
  }
  function wakeLabel() {
    if (isGlobalTaskPage) return 'INICIO · PERFIL · LIVE · AUDIO ROOM';
    if (!activity.wakeSupported) return 'PANTALLA: NO COMPATIBLE';
    return activity.wakeActive ? 'PANTALLA ACTIVA' : 'ACTIVANDO PANTALLA…';
  }
  function syncActivityBaseline() {
    activity.baseLiveSeconds = number(task.liveSeconds);
    activity.baseHouseRoomSeconds = number(task.houseRoomSeconds);
    if (activity.status === 'active') activity.startedAtClient = Date.now();
  }
  function handleActivityEvent(event) {
    const detail = event?.detail || {};
    activity.status = clean(detail.status || 'inactive', 40);
    activity.type = clean(detail.type || activity.type || 'house_room', 20);
    activity.reason = activity.status === 'active' ? '' : activity.status;
    activity.seat = number(detail.seat || roomControlState().localSeat);
    syncActivityBaseline();
    render();
  }
  function handleWakeEvent(event) {
    const detail = event?.detail || {};
    activity.wakeSupported = detail.supported !== false;
    activity.wakeActive = detail.active === true;
    renderClock();
  }
  const formatDay = value => new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(value));
  const currentTier = net => {
    let result = TIERS[0];
    for (const tier of TIERS) if (number(net) >= tier.target) result = tier;
    return result;
  };
  const nextTier = net => TIERS.find(tier => tier.target > number(net)) || null;
  const claimedSlots = value => {
    const raw = Array.isArray(value?.claimedHourSlots) ? value.claimedHourSlots : [];
    return [...new Set(raw.map(number).filter(slot => slot >= 1 && slot <= 4))].sort((a, b) => a - b);
  };
  const hourlyClaims = value => value?.hourlyClaims && typeof value.hourlyClaims === 'object' ? value.hourlyClaims : {};
  const normalizeTaskMode = value => {
    const mode = normalizeRole(value);
    if (['house_room', 'audio_room', 'audio', 'sala', 'sala_oficial'].includes(mode)) return 'house_room';
    if (['live', 'video_live', 'directo'].includes(mode)) return 'live';
    return '';
  };
  const modeLabel = mode => { const normalized = normalizeTaskMode(mode); return normalized === 'house_room' ? 'AUDIO ROOM' : normalized === 'live' ? 'LIVE' : 'TAREA ANTERIOR'; };
  const rewardForMode = (mode, tier) => normalizeTaskMode(mode) === 'house_room' ? AUDIO_ROOM_REWARD : number(tier?.reward || 2000);
  const modeHourLimit = (mode, tier) => normalizeTaskMode(mode) === 'house_room'
    ? Math.min(number(tier?.hours || 1), AUDIO_ROOM_MAX_HOURS)
    : Math.min(number(tier?.hours || 1), LIVE_MAX_HOURS);
  const completedModeHours = value => ({
    live: Math.floor(number(value?.liveSeconds) / HOUR_SECONDS),
    house_room: Math.floor(number(value?.houseRoomSeconds) / HOUR_SECONDS)
  });
  const claimedModeCounts = value => {
    const counts = { live: 0, house_room: 0, legacy: 0 };
    const claims = hourlyClaims(value);
    for (const slot of claimedSlots(value)) {
      const mode = normalizeTaskMode(claims[`h${slot}`]?.taskMode);
      if (mode) counts[mode] += 1;
      else counts.legacy += 1;
    }
    return counts;
  };
  const nextDailySlot = (value, tier) => {
    const paid = new Set(claimedSlots(value));
    for (let slot = 1; slot <= tier.hours; slot += 1) if (!paid.has(slot)) return slot;
    return 0;
  };
  const claimableModes = (value, tier) => {
    if (claimedSlots(value).filter(slot => slot <= tier.hours).length >= tier.hours) return [];
    const completed = completedModeHours(value);
    const claimed = claimedModeCounts(value);
    const modes = [];
    if (claimed.live < modeHourLimit('live', tier) && completed.live > claimed.live) modes.push('live');
    if (claimed.house_room < modeHourLimit('house_room', tier) && completed.house_room > claimed.house_room) modes.push('house_room');
    return modes;
  };
  const completedPayableHours = (value, tier = currentTier(giftNet7d)) => {
    const completed = completedModeHours(value);
    return Math.min(completed.live, modeHourLimit('live', tier)) + Math.min(completed.house_room, modeHourLimit('house_room', tier));
  };
  const qualifyingSeconds = (value, tier) => {
    const live = number(value?.liveSeconds), room = number(value?.houseRoomSeconds);
    const liveComplete = Math.min(Math.floor(live / HOUR_SECONDS), modeHourLimit('live', tier));
    const roomComplete = Math.min(Math.floor(room / HOUR_SECONDS), modeHourLimit('house_room', tier));
    const complete = Math.min(tier.hours, liveComplete + roomComplete);
    const partials = [];
    if (liveComplete < modeHourLimit('live', tier)) partials.push(live % HOUR_SECONDS);
    if (roomComplete < modeHourLimit('house_room', tier)) partials.push(room % HOUR_SECONDS);
    const partial = complete < tier.hours && partials.length ? Math.max(...partials) : 0;
    return Math.min(tier.hours * HOUR_SECONDS, complete * HOUR_SECONDS + partial);
  };
  const minutesToNextModeHour = (value, tier = currentTier(giftNet7d)) => {
    const completed = completedModeHours(value);
    const candidates = [];
    if (completed.live < modeHourLimit('live', tier)) candidates.push(HOUR_SECONDS - (number(value?.liveSeconds) % HOUR_SECONDS));
    if (completed.house_room < modeHourLimit('house_room', tier)) candidates.push(HOUR_SECONDS - (number(value?.houseRoomSeconds) % HOUR_SECONDS));
    return candidates.length ? Math.max(1, Math.ceil(Math.min(...candidates) / 60)) : 60;
  };
  const normalizeRole = value => clean(value, 40).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const emitterRoles = new Set(['emitter', 'emisor', 'emisora', 'host', 'streamer', 'creator', 'creador', 'creadora']);
  const managementRoles = new Set(['owner', 'propietario', 'superadmin', 'admin', 'administrador', 'agent', 'agente', 'agency']);
  const inactiveStatuses = new Set(['left', 'removed', 'inactive', 'expelled', 'salio', 'salida', 'eliminado', 'eliminada']);
  const isEmitterRole = value => emitterRoles.has(normalizeRole(value));
  const isManagementRole = value => managementRoles.has(normalizeRole(value));
  const isActiveMember = () => memberExists && !inactiveStatuses.has(normalizeRole(member.status || profile.houseStatus || 'active'));
  const profileMatchesHouse = () => !clean(profile.houseId, 80) || clean(profile.houseId, 80) === houseId;
  const explicitHousePosition = () => {
    const memberPosition = member.housePosition || member.position || member.houseRole || member.house_role;
    if (clean(memberPosition, 40)) return memberPosition;
    return profileMatchesHouse() ? (profile.housePosition || profile.houseRole || profile.house_role) : '';
  };
  const authorityRole = () => member.role || member.accountRole || (profileMatchesHouse() ? (profile.role || profile.rol || profile.accountRole) : '');
  const assignedAgentUid = () => clean(
    member.assignedAgentUid ||
    // Compatibilidad: si existe una membresía real en la Casa abierta,
    // el agente guardado en el Perfil puede migrarse aunque houseId esté antiguo.
    (memberExists ? profile.assignedAgentUid : '') ||
    task.assignedAgentUid,
    160
  );
  const taskIsUsableEvidence = () => {
    const state = normalizeRole(task.taskState);
    const hasAssignment = isEmitterRole(task.housePosition || task.position) || Boolean(clean(task.assignedAgentUid, 160));
    // Una pausa creada por las pruebas 30-32 no debe borrar la asignación real.
    return hasAssignment && !['cancelled', 'removed', 'deleted'].includes(state);
  };
  const blockedByManagementRole = () => isManagementRole(explicitHousePosition()) || isManagementRole(authorityRole());
  const hasEmitterAssignmentEvidence = () => {
    if (blockedByManagementRole()) return false;
    if (isEmitterRole(explicitHousePosition())) return true;
    if (assignedAgentUid()) return true;
    if (isEmitterRole(member.accountRole) || (profileMatchesHouse() && isEmitterRole(profile.role || profile.rol || profile.accountRole))) return true;
    return taskIsUsableEvidence() && (isEmitterRole(task.housePosition || task.position) || Boolean(clean(task.assignedAgentUid, 160)));
  };
  const isFormalHouseEmitter = () => isActiveMember() && hasEmitterAssignmentEvidence();

  function eligibilityMessage() {
    if (eligibilityState === 'checking') return 'Comprobando tu asignación de Emisora en Firebase…';
    if (eligibilityState === 'no_membership') return 'No se encontró una membresía activa en esta Casa.';
    if (eligibilityState === 'inactive') return 'Tu pertenencia a esta Casa no está activa.';
    if (eligibilityState === 'management') return 'Los propietarios, agentes y administradores no cobran tareas de Emisora.';
    if (eligibilityState === 'error') return 'No se pudo leer la asignación. Vuelve a entrar en la Sala de tu Casa.';
    return 'La Casa todavía no te ha asignado formalmente como Emisor/a y a un agente responsable.';
  }

  async function migrateLegacyEmitter() {
    // La asignación de Emisor/a y agente es una operación administrativa.
    // La migración automática desde el móvil queda deshabilitada para impedir
    // que un perfil se promocione a sí mismo mediante datos locales antiguos.
    return false;
  }

  async function pauseInvalidTask() {
    if (cleanupRunning || emitter || !user || !houseId || !task || clean(task.taskState, 20) !== 'active') return;
    if (!memberExists || eligibilityState === 'checking') return;
    cleanupRunning = true;
    try {
      const s = await services();
      await s.setDoc(s.doc(s.db, 'casas', houseId, 'tareas', user.uid), {
        taskState: 'paused',
        completionState: 'inactive',
        pausedReason: blockedByManagementRole() ? 'management_role_no_emitter_task' : 'not_formal_house_emitter',
        pausedAtClient: Date.now(),
        pausedAt: s.serverTimestamp(),
        updatedAt: s.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn('JEMMO tareas: limpieza de tarea incorrecta', error?.code || error?.message || error);
    } finally {
      cleanupRunning = false;
    }
  }

  async function ensureEligibleTaskActive(reason = 'eligible_house_emitter') {
    if (!emitter || !user || !houseId) return;
    try {
      const s = await services();
      const ref = s.doc(s.db, 'casas', houseId, 'tareas', user.uid);
      await s.runTransaction(s.db, async transaction => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.data() || {};
        const now = Date.now();
        const end = number(current.cycleEndsAtClient);
        const active = clean(current.taskState, 20) === 'active' && end > now;
        if (active) return;
        const tier = currentTier(giftNet7d);
        transaction.set(ref, {
          uid: user.uid,
          displayName: clean(profile.displayName || user.displayName || user.email?.split('@')[0] || 'Emisora JEMMO', 60),
          publicId: clean(profile.publicId, 48),
          houseId,
          housePosition: 'emitter',
          assignedAgentUid: assignedAgentUid(),
          taskState: 'active',
          completionState: 'in_progress',
          cycleDurationHours: 24,
          cycleStartedAtClient: now,
          cycleEndsAtClient: now + 86400000,
          cycleKey: `24h-${now}`,
          cycleNumber: Math.max(1, number(current.cycleNumber) + 1),
          liveSeconds: 0,
          houseRoomSeconds: 0,
          dailyHours: tier.hours,
          totalTargetMinutes: tier.hours * 60,
          hourlyRewardJems: tier.reward,
          liveHourlyRewardJems: tier.reward,
          audioRoomHourlyRewardJems: AUDIO_ROOM_REWARD,
          liveMaxHours: LIVE_MAX_HOURS,
          audioRoomMaxHours: AUDIO_ROOM_MAX_HOURS,
          giftProgressSource: 'live_only',
          rewardRatePolicy: 'mode_specific_v2',
          taskTierCode: tier.code,
          claimedHourSlots: [],
          claimedHours: 0,
          hourlyClaims: {},
          rewardClaimed: false,
          rewardAmount: 0,
          rewardTotalClaimed: 0,
          reviewStatus: 'pending',
          activatedReason: reason,
          activatedAtClient: now,
          recoveredFromPendingAtClient: now,
          updatedAt: s.serverTimestamp()
        }, { merge: true });
      });
    } catch (error) {
      console.warn('JEMMO tareas: activar ciclo visible', error?.code || error?.message || error);
    }
  }

  function recomputeEligibility() {
    const previous = emitter;
    if (!memberExists) {
      emitter = false;
      eligibilityState = 'no_membership';
    } else if (!isActiveMember()) {
      emitter = false;
      eligibilityState = 'inactive';
    } else if (blockedByManagementRole()) {
      emitter = false;
      eligibilityState = 'management';
    } else {
      emitter = isFormalHouseEmitter();
      eligibilityState = emitter ? 'eligible' : 'not_emitter';
    }
    render();
    if (emitter) {
      void migrateLegacyEmitter();
      void ensureEligibleTaskActive(previous ? 'task_assignment_refreshed' : 'task_rewards_ready');
      if (!previous) void window.JemmoHouseActivity?.ensureTaskCycle?.('task_rewards_ready');
    } else {
      void pauseInvalidTask();
    }
  }

  async function services() {
    if (servicesPromise) return servicesPromise;
    servicesPromise = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
    ]).then(([appModule, authModule, firestore]) => {
      const app = appModule.getApps()[0] || appModule.initializeApp(firebaseConfig);
      return { ...firestore, auth: authModule.getAuth(app), onAuthStateChanged: authModule.onAuthStateChanged, db: firestore.getFirestore(app) };
    });
    return servicesPromise;
  }

  function waitForUser(s, timeout = 12000) {
    if (s.auth.currentUser) return Promise.resolve(s.auth.currentUser);
    return new Promise((resolve, reject) => {
      let stop = () => {};
      const timer = setTimeout(() => { stop(); reject(new Error('La sesión no está disponible.')); }, timeout);
      stop = s.onAuthStateChanged(s.auth, current => {
        if (!current) return;
        clearTimeout(timer);
        stop();
        resolve(current);
      }, error => {
        clearTimeout(timer);
        stop();
        reject(error);
      });
    });
  }

  function injectStyles() {
    if ($('jemmoHostTaskStyles')) return;
    const style = document.createElement('style');
    style.id = 'jemmoHostTaskStyles';
    style.textContent = `
      body.jr-task-open{overflow:hidden}
      .jr-task-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(5px);z-index:1400}
      .jr-task-sheet{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,540px);max-height:91dvh;overflow:auto;background:linear-gradient(180deg,#1c102b 0%,#09060f 38%,#050508 100%);border:1px solid rgba(226,93,255,.48);border-radius:24px 24px 0 0;box-shadow:0 -20px 60px rgba(0,0,0,.7);padding:0 16px 26px;z-index:1401;color:#fff}
      .jr-task-sheet>header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:16px 2px 13px;background:linear-gradient(180deg,#1c102b 75%,rgba(28,16,43,0));border-bottom:1px solid rgba(255,255,255,.08)}
      .jr-task-sheet>header small{display:block;color:#f7df49;font-size:10px;font-weight:900;letter-spacing:1.3px}.jr-task-sheet>header h2{margin:3px 0 0;font-size:24px}.jr-task-sheet>header button{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:#130c1d;color:#fff;font-size:26px}
      #jemmoHostTaskContent{display:grid;gap:12px;padding-top:10px}.jr-task-empty{padding:22px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.05);line-height:1.45}
      .jr-task-activity-card,.jr-task-reward-card,.jr-task-progress-card,.jr-task-tier-card,.jr-task-window-card{border:1px solid rgba(255,255,255,.12);border-radius:18px;background:linear-gradient(145deg,rgba(117,46,163,.25),rgba(13,8,21,.92));padding:15px}
      .jr-task-activity-card{display:flex;justify-content:space-between;gap:10px;align-items:center;border-color:rgba(72,232,155,.55);background:linear-gradient(135deg,rgba(21,103,67,.36),rgba(18,8,28,.96))}.jr-task-activity-card.paused{border-color:rgba(255,209,65,.46);background:linear-gradient(135deg,rgba(105,73,14,.34),rgba(18,8,28,.96))}.jr-task-activity-card b{display:block;font-size:13px;color:#61efad}.jr-task-activity-card.paused b{color:#ffe05d}.jr-task-activity-card small{display:block;margin-top:3px;color:#c7b9cf;font-size:10px}.jr-task-activity-card em{font-style:normal;text-align:right;color:#e8d8ef;font-size:9px;font-weight:900}
      .jr-task-reward-card small,.jr-task-progress-title small,.jr-task-tier-card small,.jr-task-window-card>small{color:#cdb8d8;font-size:10px;font-weight:900;letter-spacing:.8px}.jr-task-reward-card strong{display:block;margin-top:3px;font-size:34px;color:#ffe843;text-shadow:0 0 15px rgba(255,232,67,.28)}.jr-task-reward-card strong em{font-size:14px;font-style:normal}.jr-task-reward-card span{display:block;color:#d7cadf;font-size:12px;line-height:1.4}
      .jr-task-progress-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.jr-task-progress-title b{display:block;margin-top:4px;font-size:18px}.jr-task-progress-title em{font-style:normal;color:#ffe843;font-weight:900}.jr-task-progress-card>i,.jr-task-tier-card>i{display:block;height:9px;margin:12px 0;border-radius:999px;background:#24152f;overflow:hidden}.jr-task-progress-card>i span,.jr-task-tier-card>i span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#9e37e8,#ffe946)}
      .jr-task-split{display:grid;grid-template-columns:1fr 1fr;gap:8px}.jr-task-split span{padding:10px;border-radius:13px;background:rgba(255,255,255,.055)}.jr-task-split small{display:block;color:#a995b7;font-size:9px}.jr-task-split b{display:block;margin-top:3px;font-size:13px}.jr-task-progress-card p,.jr-task-tier-card p,.jr-task-rule{margin:10px 0 0;color:#bfaec8;font-size:11px;line-height:1.45}
      .jr-task-hours{display:grid;gap:8px}.jr-task-hour{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:11px 12px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#0e0915}.jr-task-hour>span{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#271434;color:#ffe843;font-weight:900}.jr-task-hour b{display:block;font-size:13px}.jr-task-hour small{display:block;margin-top:2px;color:#a995b7;font-size:10px}.jr-task-hour em{font-style:normal;font-size:10px;font-weight:900;color:#a995b7}.jr-task-hour.ready{border-color:#ffe843;box-shadow:0 0 16px rgba(255,232,67,.12)}.jr-task-hour.ready em{color:#ffe843}.jr-task-hour.paid{border-color:rgba(73,229,154,.48);background:rgba(21,89,58,.22)}.jr-task-hour.paid em{color:#49e59a}
      .jr-task-claim{width:100%;min-height:52px;border:0;border-radius:15px;background:linear-gradient(90deg,#9c31df,#f4d936);color:#100713;font-weight:1000;font-size:13px;letter-spacing:.4px}.jr-task-claim:disabled{opacity:.46;filter:saturate(.45)}.jr-task-claim.claimed{background:#183a2c;color:#55e8a3}.jr-task-claim-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.jr-task-claim-grid.single{grid-template-columns:1fr}.jr-task-rate-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.jr-task-rate-pair span{padding:11px;border-radius:12px;background:rgba(255,255,255,.055)}.jr-task-rate-pair small{display:block;color:#c5b4cc;font-size:9px}.jr-task-rate-pair b{display:block;margin-top:3px;font-size:17px;color:#f3df4c}.jr-task-mode-note{margin-top:8px!important;color:#cabbd0!important}
      .jr-task-tier-card{display:grid;grid-template-columns:1fr auto;gap:8px}.jr-task-tier-card>div b{display:block;margin-top:4px}.jr-task-tier-card>div span{display:block;margin-top:3px;color:#bfaec8;font-size:11px}.jr-task-tier-card>em{font-style:normal;color:#ffe843;font-weight:900}.jr-task-tier-card>i,.jr-task-tier-card>p{grid-column:1/-1}
      .jr-task-window-card{display:grid;gap:8px}.jr-task-window-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.045)}.jr-task-window-row b{font-size:12px}.jr-task-window-row span{color:#a995b7;font-size:10px}.jr-task-window-row em{font-style:normal;color:#f4dd4c;font-weight:900;font-size:12px}
      .jr-task-levels{border:1px solid rgba(255,255,255,.11);border-radius:15px;background:#0d0913;overflow:hidden}.jr-task-levels summary{cursor:pointer;padding:13px 14px;color:#f1de4b;font-size:11px;font-weight:900}.jr-task-levels>div{display:grid;gap:6px;padding:0 10px 12px}.jr-task-levels span{display:grid;grid-template-columns:48px 1fr auto;gap:8px;align-items:center;padding:9px;border-radius:11px;background:rgba(255,255,255,.04)}.jr-task-levels span.active{outline:1px solid #f0d941;background:rgba(240,217,65,.09)}.jr-task-levels b{font-size:11px}.jr-task-levels small{color:#bbaac4;font-size:10px}.jr-task-levels em{font-style:normal;text-align:right;color:#f1df4b;font-size:10px;font-weight:900}
      body.jemmo-house-room #houseTaskClock{display:none!important}
      body.live-running #taskCard.active,body.live-running #taskCard.done{border-color:#43e397;background:#0b3a29;color:#8ff6c4}
      body.live-running #taskCard.paused{border-color:#f3a23b;background:#432408;color:#ffd08d}
      body.live-running #taskCard.stopped{border-color:#ea647c;background:#3d0b17;color:#ff9cad}
      .jemmo-global-task-card{margin:8px 12px 12px;padding:0;border:1px solid rgba(218,71,255,.46);border-radius:18px;background:radial-gradient(circle at 92% 12%,rgba(255,219,61,.18),transparent 30%),linear-gradient(145deg,#24052f,#0c0111);overflow:hidden;box-shadow:0 10px 28px rgba(0,0,0,.24)}
      .jemmo-global-task-card button{width:100%;min-height:72px;padding:12px 14px;border:0;background:transparent;color:#fff;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left}.jemmo-global-task-card .icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:#3a0c49;font-size:23px}.jemmo-global-task-card b{display:block;font-size:14px}.jemmo-global-task-card small{display:block;margin-top:3px;color:#cbb9d2;font-size:9px}.jemmo-global-task-card em{font-style:normal;padding:5px 8px;border-radius:999px;background:#392308;color:#ffe275;font-size:9px;font-weight:1000}.jemmo-global-task-card em.active,.jemmo-global-task-card em.done{background:#113c2a;color:#65edaa}.jemmo-global-task-card em.stopped{background:#43101b;color:#ff9bae}
      .profile-action.jemmo-task-profile{border-color:#865d20;background:linear-gradient(160deg,#3b2507,#160c02);color:#ffe28b}.profile-action.jemmo-task-profile span{font-size:17px}.profile-action.jemmo-task-profile b{font-size:9.5px}
      .jr-task-history-card{border:1px solid rgba(255,255,255,.11);border-radius:18px;background:#0c0811;padding:14px;display:grid;gap:8px}.jr-task-history-card>small{color:#cdb8d8;font-size:10px;font-weight:900;letter-spacing:.8px}.jr-task-history-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px;border-radius:13px;background:rgba(255,255,255,.045)}.jr-task-history-row b{display:block;font-size:11px}.jr-task-history-row span{display:block;margin-top:3px;color:#a995b7;font-size:9px}.jr-task-history-row em{align-self:center;font-style:normal;padding:5px 7px;border-radius:999px;background:#3a2608;color:#ffe278;font-size:8px;font-weight:1000}.jr-task-history-row em.paid{background:#123b2b;color:#5be9a3}.jr-task-history-row em.paused{background:#42270a;color:#ffd17b}.jr-task-history-row em.stopped{background:#42101b;color:#ff9aad}
      body.jemmo-house-room .jr-seat.has-task-tab .jr-seat-person-label{bottom:18%!important}
      body.jemmo-house-room .jr-seat-task-tab{position:absolute;z-index:8;left:9%;right:9%;bottom:3%;height:12px;padding:0 4px;border:1px solid rgba(255,255,255,.24);border-radius:999px;display:flex;align-items:center;justify-content:center;gap:3px;background:#3b0d14;color:#ffd6df;box-shadow:0 1px 6px rgba(0,0,0,.6);font-size:5.6px;line-height:1;font-weight:1000;white-space:nowrap;overflow:hidden;pointer-events:none}.jr-seat-task-tab i{width:4px;height:4px;border-radius:50%;background:currentColor;box-shadow:0 0 5px currentColor;flex:0 0 auto}.jr-seat-task-tab span,.jr-seat-task-tab b{margin:0!important;max-width:none!important;font-size:inherit!important;line-height:1!important;overflow:visible!important}.jr-seat-task-tab.active,.jr-seat-task-tab.done{border-color:#43e397;background:#0b3a29;color:#8ff6c4}.jr-seat-task-tab.paused{border-color:#f3a23b;background:#432408;color:#ffd08d}.jr-seat-task-tab.stopped{border-color:#ea647c;background:#3d0b17;color:#ff9cad}
      @media(max-width:380px){.jr-task-claim-grid,.jr-task-rate-pair{grid-template-columns:1fr}.jr-task-sheet{padding-left:11px;padding-right:11px}.jr-task-levels span{grid-template-columns:42px 1fr}.jr-task-levels em{grid-column:2;text-align:left}}
    `;
    document.head.appendChild(style);
  }

  function injectTaskSheet() {
    injectStyles();
    if ($('jemmoHostTaskSheet')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="jr-task-backdrop" id="jemmoHostTaskBackdrop" hidden></div>
      <section class="jr-task-sheet" id="jemmoHostTaskSheet" hidden aria-label="Mis tareas de Emisora">
        <header><div><small>EMISORA DE CASA</small><h2>Mis tareas</h2></div><button type="button" id="jemmoHostTaskClose" aria-label="Cerrar">×</button></header>
        <div id="jemmoHostTaskContent"></div>
      </section>`;
    document.body.append(...wrap.children);
    $('jemmoHostTaskBackdrop')?.addEventListener('click', closeSheet);
    $('jemmoHostTaskClose')?.addEventListener('click', closeSheet);
  }

  function openSheet() {
    injectTaskSheet();
    $('jemmoHostTaskBackdrop').hidden = false;
    $('jemmoHostTaskSheet').hidden = false;
    document.body.classList.add('jr-task-open');
    if (emitter) void window.JemmoHouseActivity?.ensureTaskCycle?.('task_panel_open');
    render();
  }

  function closeSheet() {
    if ($('jemmoHostTaskBackdrop')) $('jemmoHostTaskBackdrop').hidden = true;
    if ($('jemmoHostTaskSheet')) $('jemmoHostTaskSheet').hidden = true;
    document.body.classList.remove('jr-task-open');
  }

  function installGlobalTaskEntries() {
    if (!isGlobalTaskPage) return;
    if (isHomePage && !$('jemmoGlobalTaskCard')) {
      const main = document.querySelector('main.app-shell');
      const header = main?.querySelector('.app-header');
      if (main && header) {
        const section = document.createElement('section');
        section.id = 'jemmoGlobalTaskCard';
        section.className = 'jemmo-global-task-card';
        section.innerHTML = '<button type="button" id="jemmoGlobalTaskOpen"><span class="icon">📋</span><span><b>MIS TAREAS</b><small>Horas, nivel LIVE, cobros e historial</small></span><em id="jemmoGlobalTaskState">CARGANDO</em></button>';
        header.insertAdjacentElement('afterend', section);
      }
    }
    if (isProfilePage && !$('jemmoProfileTaskOpen')) {
      const actions = document.querySelector('.profile-actions');
      if (actions) {
        const button = document.createElement('button');
        button.id = 'jemmoProfileTaskOpen';
        button.type = 'button';
        button.className = 'profile-action jemmo-task-profile';
        button.innerHTML = '<span>📋</span><b>Mis tareas</b>';
        actions.append(button);
      }
    }
    const menu = $('menuList');
    if (menu && !$('jemmoMenuTaskOpen')) {
      const button = document.createElement('button');
      button.id = 'jemmoMenuTaskOpen';
      button.type = 'button';
      button.dataset.search = 'mis tareas tarea emisora horas live audio cobros nivel historial';
      button.innerHTML = '<span>📋</span><span><b>Mis tareas</b><small>Horas, nivel, cobros e historial</small></span><i>›</i>';
      menu.insertBefore(button, menu.children[1] || null);
    }
    ['jemmoGlobalTaskOpen', 'jemmoProfileTaskOpen', 'jemmoMenuTaskOpen'].forEach(id => $(id)?.addEventListener('click', event => {
      event.preventDefault();
      $('menuBackdrop')?.click();
      openSheet();
    }));
  }

  function renderGlobalTaskEntry() {
    if (!isGlobalTaskPage) return;
    const stateNode = $('jemmoGlobalTaskState');
    const profileButton = $('jemmoProfileTaskOpen');
    let label = 'SIN TAREA', css = 'stopped';
    if (eligibilityState === 'checking') { label = 'CARGANDO'; css = ''; }
    else if (emitter) {
      const visual = compactTaskVisual(task, false);
      label = visual.label;
      css = visual.css;
    }
    if (stateNode) {
      stateNode.textContent = label;
      stateNode.className = css;
    }
    if (profileButton) profileButton.setAttribute('aria-label', `Abrir Mis tareas · ${label.toLowerCase()}`);
  }

  function giftCountsForLiveTask(item = {}) {
    const explicit = normalizeTaskMode(item.taskProgressMode || item.taskMode);
    if (explicit) return explicit === 'live';
    const source = normalizeRole(item.source);
    const context = normalizeRole(item.context);
    return source === 'live-gift' || context === 'live';
  }

  const historyDate = value => new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(Number(value) || Date.now()));
  function historyStatus(value = {}) {
    const completion = normalizeRole(value.completionState);
    const state = normalizeRole(value.taskState);
    if (completion === 'paid' || value.rewardClaimed === true) return { label: 'COBRADA', css: 'paid' };
    if (completion === 'completed') return { label: 'COMPLETADA', css: 'paid' };
    if (state === 'paused' || completion === 'paused') return { label: 'PAUSADA', css: 'paused' };
    if (state === 'expired' || state === 'inactive' || completion === 'expired' || completion === 'inactive') return { label: 'DETENIDA', css: 'stopped' };
    return { label: 'PENDIENTE', css: 'paused' };
  }
  function historyRewardTotal(value = {}) {
    const claims = value.hourlyClaims && typeof value.hourlyClaims === 'object' ? value.hourlyClaims : {};
    const claimTotal = Object.values(claims).reduce((sum, claim) => sum + number(claim?.rewardJems), 0);
    if (claimTotal) return claimTotal;
    const key = cycleKey(value);
    return taskRewards.filter(reward => cycleKey(reward) === key).reduce((sum, reward) => sum + number(reward.rewardJems), 0);
  }
  function taskHistoryHtml() {
    const current = task?.cycleStartedAtClient ? [{ ...task, __current: true }] : [];
    const rows = [...current, ...taskHistory]
      .sort((a, b) => number(b.cycleStartedAtClient || b.archivedAtClient) - number(a.cycleStartedAtClient || a.archivedAtClient))
      .slice(0, 20);
    if (!rows.length) return '<section class="jr-task-history-card"><small>HISTORIAL DE TAREAS</small><div class="jr-task-empty">Todavía no hay ciclos de tarea registrados.</div></section>';
    return `<section class="jr-task-history-card"><small>HISTORIAL · COBRADAS, COMPLETADAS, PAUSADAS Y PENDIENTES</small>${rows.map(item => {
      const status = historyStatus(item);
      const start = number(item.cycleStartedAtClient || item.activatedAtClient || item.archivedAtClient);
      const paid = historyRewardTotal(item);
      return `<div class="jr-task-history-row"><div><b>${item.__current ? 'CICLO ACTUAL' : `CICLO · ${historyDate(start)}`}</b><span>LIVE ${formatClock(item.liveSeconds)} · AUDIO ${formatClock(item.houseRoomSeconds)}${paid ? ` · ${fmt(paid)} JEMS abonados` : ''}</span></div><em class="${status.css}">${status.label}</em></div>`;
    }).join('')}</section>`;
  }

  function buildGiftBuckets() {
    const start = giftWindowStart(Date.now());
    const map = new Map();
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      map.set(dayKey(date.getTime()), { day: dayKey(date.getTime()), startedAt: date.getTime(), amount: 0 });
    }
    for (const item of giftDocuments) {
      const created = Number(item.createdAtClient || millis(item.createdAt));
      if (!created || created < start || created > Date.now()) continue;
      if (item.hasHouse !== true || clean(item.houseId, 80) !== houseId) continue;
      if (!giftCountsForLiveTask(item)) continue;
      const key = dayKey(created);
      const bucket = map.get(key);
      if (bucket) bucket.amount += number(item.emitterTotal);
    }
    return [...map.values()];
  }

  function recalculateGiftWindow(forceSync = true) {
    const previous = giftNet7d;
    giftBuckets = buildGiftBuckets();
    giftNet7d = giftBuckets.reduce((sum, item) => sum + number(item.amount), 0);
    render();
    if (forceSync || giftNet7d !== previous) void syncTierSnapshot();
  }

  function renderClock() {
    renderGlobalTaskEntry();
    const box = $('houseTaskClock');
    if (box) box.hidden = true;
    const managementHidden = !emitter && eligibilityState === 'management';
    const setting = $('jemmoHostTaskSetting');
    if (setting) setting.hidden = managementHidden;
    if (isLivePage) {
      const card = $('taskCard');
      const text = $('taskText');
      const time = $('taskTime');
      if (!card) return;
      if (!emitter) { card.hidden = true; return; }
      const visual = compactTaskVisual(task, true);
      card.hidden = false;
      card.classList.remove('active', 'paused', 'stopped', 'done', 'complete');
      card.classList.add(visual.css);
      if (text) text.textContent = visual.label;
      if (time) time.textContent = compactClock(visual.seconds);
      card.setAttribute('aria-label', `Abrir mis tareas reales · ${visual.label.toLowerCase()} · ${compactClock(visual.seconds)}`);
      return;
    }
    syncSeatTaskTabs();
  }

  function render() {
    renderClock();
    const target = $('jemmoHostTaskContent');
    if (!target) return;
    if (!emitter) {
      target.innerHTML = `<div class="jr-task-empty"><b>Estado de la tarea</b><br>${eligibilityMessage()}<br><br>Las tareas existen únicamente para Emisoras vinculadas a una Casa. Una Emisora independiente conserva el reparto 70/30, pero no tiene tareas por horas.</div>`;
      return;
    }

    const tier = currentTier(giftNet7d);
    const next = nextTier(giftNet7d);
    const viewTask = projectedTask();
    const seconds = qualifyingSeconds(viewTask, tier);
    const targetSeconds = tier.hours * HOUR_SECONDS;
    const progress = Math.min(100, Math.floor(seconds / targetSeconds * 100));
    const giftProgress = next ? Math.min(100, Math.floor(giftNet7d / next.target * 100)) : 100;
    const paidSlots = claimedSlots(task);
    const paidSet = new Set(paidSlots);
    const availableModes = claimableModes(viewTask, tier);
    const paidForTier = paidSlots.filter(slot => slot <= tier.hours).length;
    const allPaid = paidForTier >= tier.hours;
    const active = clean(task.taskState, 20) === 'active';
    const nextSlot = nextDailySlot(task, tier);
    const minutesNeeded = minutesToNextModeHour(viewTask, tier);
    const nextText = next
      ? `Faltan ${fmt(Math.max(0, next.target - giftNet7d))} JEMS netos de regalos recibidos en LIVE para subir a ${fmt(next.reward)} JEMS/h y ${next.hours} horas totales. Audio Room permanece siempre en ${fmt(AUDIO_ROOM_REWARD)} JEMS/h.`
      : `Has alcanzado el nivel máximo por regalos recibidos en LIVE. Audio Room permanece siempre en ${fmt(AUDIO_ROOM_REWARD)} JEMS/h.`;

    const hoursHtml = Array.from({ length: tier.hours }, (_, index) => {
      const slot = index + 1;
      const paid = paidSet.has(slot);
      const claim = hourlyClaims(task)[`h${slot}`] || {};
      const paidMode = normalizeTaskMode(claim.taskMode);
      const amount = number(claim.rewardJems || (paidMode ? rewardForMode(paidMode, tier) : 0));
      const ready = !paid && slot === nextSlot && availableModes.length > 0;
      const stateClass = paid ? 'paid' : ready ? 'ready' : '';
      const livePartial = completedModeHours(viewTask).live < modeHourLimit('live', tier) ? number(viewTask.liveSeconds) % HOUR_SECONDS : 0;
      const roomPartial = completedModeHours(viewTask).house_room < modeHourLimit('house_room', tier) ? number(viewTask.houseRoomSeconds) % HOUR_SECONDS : 0;
      const bestProgress = Math.min(60, Math.floor(Math.max(livePartial, roomPartial) / 60));
      const stateText = paid ? 'COBRADA' : ready ? `LISTA · ${availableModes.map(modeLabel).join(' / ')}` : `${bestProgress}/60 MIN`;
      const title = paid
        ? `HORA ${slot} · ${modeLabel(paidMode)} · ${fmt(amount)} JEMS`
        : `HORA ${slot} · LIVE ${fmt(tier.reward)} / AUDIO ${fmt(AUDIO_ROOM_REWARD)}`;
      const detail = paid
        ? `Abonada: ${fmt(amount)} JEMS · hora ${number(claim.modeHourNumber || 1)} de ${modeLabel(paidMode)}`
        : 'Completa 60 minutos dentro de LIVE o dentro de Audio Room. Los minutos parciales de modalidades distintas no se mezclan.';
      return `<div class="jr-task-hour ${stateClass}"><span>${slot}</span><div><b>${title}</b><small>${detail}</small></div><em>${stateText}</em></div>`;
    }).join('');

    const bucketsHtml = giftBuckets.map(bucket => {
      const expires = new Date(bucket.startedAt);
      expires.setDate(expires.getDate() + 6);
      return `<div class="jr-task-window-row"><div><b>${formatDay(bucket.startedAt)}</b><span>Cuenta hasta terminar ${formatDay(expires.getTime())}</span></div><em>${fmt(bucket.amount)} JEMS</em></div>`;
    }).join('');

    const paidTotal = paidSlots.reduce((sum, slot) => sum + number(hourlyClaims(task)[`h${slot}`]?.rewardJems), 0);
    let claimButtons = '';
    if (allPaid) {
      claimButtons = `<button class="jr-task-claim claimed" type="button" disabled>TODAS LAS HORAS COBRADAS · ${fmt(paidTotal)} JEMS</button>`;
    } else if (availableModes.length) {
      claimButtons = availableModes.map(mode => `<button class="jr-task-claim" data-claim-mode="${mode}" type="button" ${!active || claiming ? 'disabled' : ''}>COBRAR HORA ${modeLabel(mode)} · ${fmt(rewardForMode(mode, tier))} JEMS</button>`).join('');
    } else {
      claimButtons = `<button class="jr-task-claim" type="button" disabled>FALTAN ${minutesNeeded} MIN PARA COMPLETAR UNA HORA</button>`;
    }

    target.innerHTML = `
      <section class="jr-task-activity-card ${activity.status === 'active' || isGlobalTaskPage ? '' : 'paused'}"><div><b>${activityLabel()}</b><small>${isGlobalTaskPage ? 'Consulta el mismo documento real desde Inicio, Perfil, LIVE y Audio Room. El historial permanece disponible aunque el ciclo esté pausado o cobrado.' : activity.status === 'active' ? (isLivePage ? 'El LIVE real está sumando tiempo y se guarda periódicamente en Firebase.' : (roomControlState().moderatedMuted === true ? 'La moderación ha silenciado el audio, pero la presencia en silla continúa contando.' : 'El cronómetro avanza segundo a segundo y se guarda periódicamente en Firebase.')) : (isLivePage ? 'El tiempo solo suma con el LIVE visible, cámara real y controles de tarea activos.' : 'El tiempo solo suma con la Sala visible, en una silla y con micrófono real activo.')}</small></div><em>${wakeLabel()}</em></section>
      <section class="jr-task-reward-card">
        <small>TARIFAS DE TAREA · NIVEL ${tier.code}</small>
        <div class="jr-task-rate-pair"><span><small>LIVE</small><b>${fmt(tier.reward)} JEMS/HORA</b></span><span><small>AUDIO ROOM · FIJO</small><b>${fmt(AUDIO_ROOM_REWARD)} JEMS/HORA</b></span></div>
        <p class="jr-task-mode-note">El nivel se calcula solo con regalos recibidos en LIVE. LIVE permite hasta 3 horas y Audio Room hasta 2 horas por ciclo, sin superar las horas totales del nivel. Audio Room nunca cambia de precio: cada hora completa paga ${fmt(AUDIO_ROOM_REWARD)} JEMS.</p>
      </section>
      <section class="jr-task-progress-card">
        <div class="jr-task-progress-title"><div><small>PROGRESO VÁLIDO DEL CICLO DE 24 HORAS</small><b>${formatClock(seconds)} / ${formatClock(targetSeconds)}</b></div><em>${progress}%</em></div>
        <i><span style="width:${progress}%"></span></i>
        <div class="jr-task-split"><span><small>LIVE ACTIVO · ${fmt(tier.reward)}/H</small><b>${formatClock(viewTask.liveSeconds)}</b></span><span><small>AUDIO ROOM · ${fmt(AUDIO_ROOM_REWARD)}/H</small><b>${formatClock(viewTask.houseRoomSeconds)}</b></span></div>
        <p>Escuchar abajo no suma. Cada bloque remunerado exige 60 minutos completos en la misma modalidad. Máximos: LIVE 3 horas y Audio Room 2 horas por ciclo.</p>
      </section>
      <section class="jr-task-hours">${hoursHtml}</section>
      <div class="jr-task-claim-grid ${availableModes.length < 2 ? 'single' : ''}">${claimButtons}</div>
      <section class="jr-task-tier-card">
        <div><small>NIVEL ACTUAL · VENTANA MÓVIL</small><b>${tier.label} · ${tier.code}</b><span>${fmt(giftNet7d)} JEMS netos de regalos recibidos en LIVE durante 7 días naturales</span></div>
        <em>${tier.hours}h totales · LIVE máx. ${modeHourLimit('live', tier)} · AUDIO máx. ${modeHourLimit('house_room', tier)}</em>
        <i><span style="width:${giftProgress}%"></span></i>
        <p>${nextText}</p>
      </section>
      <section class="jr-task-window-card"><small>DESGLOSE DE LOS 7 DÍAS QUE CUENTAN AHORA</small>${bucketsHtml}</section>
      <p class="jr-task-rule">Solo cuentan para subir el nivel los regalos recibidos dentro de LIVE mientras eres Emisora de esta Casa. Los regalos de Audio Room, Perfil, Mensajes, Destellos o Batalla no incrementan la tarea. De cada regalo: 70% Emisora, 20% JEMMO LIVE y 10% Casa/agente. Para tu nivel cuenta exclusivamente tu 70% neto. Una Emisora independiente recibe 70/30, pero no tiene tareas.</p>
      <details class="jr-task-levels"><summary>VER TODA LA ESCALA</summary><div>${TIERS.map(item => `<span class="${item.code === tier.code ? 'active' : ''}"><b>${item.code}</b><small>${fmt(item.target)} netos LIVE</small><em>${item.hours}h totales · LIVE máx. ${Math.min(item.hours, LIVE_MAX_HOURS)} · AUDIO máx. ${Math.min(item.hours, AUDIO_ROOM_MAX_HOURS)}</em></span>`).join('')}</div></details>
      ${taskHistoryHtml()}`;
    target.querySelectorAll('[data-claim-mode]').forEach(button => button.addEventListener('click', () => void claimReward(button.dataset.claimMode)));
  }

  function syncClaimedRewardsToWallet() {
    if (!user || !houseId) return;
    const key = cycleKey(task);
    if (!key) return;
    const claims = hourlyClaims(task);
    for (const slot of claimedSlots(task)) {
      const claim = claims[`h${slot}`] || {};
      const amount = number(claim.rewardJems);
      if (!amount) continue;
      window.JemmoWallet?.addJems?.(amount, {
        type: 'task-reward',
        title: `Hora ${slot} de tarea de Emisora`,
        detail: `60 minutos · ${modeLabel(claim.taskMode)} · Nivel ${clean(claim.taskTierCode || task.taskTierCode || 'BASE', 10)}`,
        source: 'host-task-hour-sync',
        idempotencyKey: `host-task:${houseId}:${user.uid}:${key}:hour:${slot}`
      });
    }
  }

  async function syncTierSnapshot() {
    if (!emitter || !user || !houseId || !task.cycleStartedAtClient) return;
    const tier = currentTier(giftNet7d);
    const paid = claimedSlots(task);
    const signature = `${cycleKey(task)}:${giftNet7d}:${tier.code}:${tier.reward}:${AUDIO_ROOM_REWARD}:${tier.hours}:${paid.join(',')}`;
    if (signature === lastTierSignature) return;
    lastTierSignature = signature;
    try {
      const s = await services();
      const start = giftWindowStart(Date.now());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      await s.setDoc(s.doc(s.db, 'casas', houseId, 'tareas', user.uid), {
        totalTargetMinutes: tier.hours * 60,
        dailyHours: tier.hours,
        giftWindowDays: 7,
        giftWindowType: 'calendar_day_rolling',
        giftWindowStartClient: start,
        giftWindowEndClient: end.getTime(),
        giftNet7d,
        giftDailyBuckets: giftBuckets.map(item => ({ day: item.day, amount: number(item.amount), startedAtClient: item.startedAt })),
        taskTierCode: tier.code,
        taskTierLabel: tier.label,
        hourlyRewardJems: tier.reward,
        liveHourlyRewardJems: tier.reward,
        audioRoomHourlyRewardJems: AUDIO_ROOM_REWARD,
        liveMaxHours: LIVE_MAX_HOURS,
        audioRoomMaxHours: AUDIO_ROOM_MAX_HOURS,
        giftProgressSource: 'live_only',
        rewardRatePolicy: 'mode_specific_v2',
        rewardClaimed: paid.filter(slot => slot <= tier.hours).length >= tier.hours,
        tierUpdatedAtClient: Date.now(),
        tierUpdatedAt: s.serverTimestamp(),
        simulation: true
      }, { merge: true });
    } catch (error) {
      lastTierSignature = '';
      console.warn('JEMMO tareas: nivel', error?.code || error?.message || error);
    }
  }

  async function claimReward(requestedMode) {
    const requested = normalizeTaskMode(requestedMode);
    if (claiming || !requested || !emitter || !user || !houseId) return;
    claiming = true;
    render();
    try {
      await window.JemmoHouseActivity?.flush?.();
      const s = await services();
      const tier = currentTier(giftNet7d);
      const taskRef = s.doc(s.db, 'casas', houseId, 'tareas', user.uid);
      let result = null;
      await s.runTransaction(s.db, async transaction => {
        const taskSnap = await transaction.get(taskRef);
        const current = taskSnap.data() || {};
        const key = cycleKey(current);
        if (!key) throw new Error('La tarea todavía no tiene un ciclo activo.');
        const slot = nextDailySlot(current, tier);
        if (!slot) throw new Error('Ya has cobrado todas las horas disponibles de este nivel.');
        const modes = claimableModes(current, tier);
        if (!modes.includes(requested)) throw new Error(`Todavía no has completado una hora entera en ${modeLabel(requested)}.`);
        const claimedByMode = claimedModeCounts(current);
        const modeHourNumber = claimedByMode[requested] + 1;
        const amount = rewardForMode(requested, tier);
        const rewardId = `${key}-${requested}-hour-${modeHourNumber}`;
        const rewardRef = s.doc(s.db, 'users', user.uid, 'recompensasTareas', rewardId);
        const rewardSnap = await transaction.get(rewardRef);
        if (rewardSnap.exists()) {
          result = { duplicate: true, ...rewardSnap.data() };
          return;
        }

        const common = {
          rewardId,
          cycleKey: key,
          hourSlot: slot,
          taskMode: requested,
          taskModeLabel: modeLabel(requested),
          modeHourNumber,
          houseId,
          uid: user.uid,
          displayName: clean(profile.displayName || user.displayName || 'Emisora JEMMO', 60),
          taskTierCode: tier.code,
          taskTierLabel: tier.label,
          giftNet7d,
          giftWindowDays: 7,
          giftWindowType: 'calendar_day_rolling',
          targetMinutes: 60,
          dailyHours: tier.hours,
          liveSeconds: number(current.liveSeconds),
          houseRoomSeconds: number(current.houseRoomSeconds),
          liveHourlyRewardJems: tier.reward,
          audioRoomHourlyRewardJems: AUDIO_ROOM_REWARD,
          liveMaxHours: LIVE_MAX_HOURS,
          audioRoomMaxHours: AUDIO_ROOM_MAX_HOURS,
          giftProgressSource: 'live_only',
          rewardRatePolicy: 'mode_specific_v2',
          rewardJems: amount,
          status: 'confirmed',
          claimedAtClient: Date.now(),
          claimedAt: s.serverTimestamp(),
          simulation: true,
          schemaVersion: 3
        };
        transaction.set(rewardRef, common);
        transaction.set(s.doc(s.db, 'casas', houseId, 'recompensasTareas', `${user.uid}_${rewardId}`), common);

        const slots = claimedSlots(current);
        if (!slots.includes(slot)) slots.push(slot);
        slots.sort((a, b) => a - b);
        const claims = { ...hourlyClaims(current), [`h${slot}`]: {
          hourSlot: slot,
          taskMode: requested,
          taskModeLabel: modeLabel(requested),
          modeHourNumber,
          rewardJems: amount,
          taskTierCode: tier.code,
          taskTierLabel: tier.label,
          giftNet7d,
          claimedAtClient: Date.now()
        } };
        const totalClaimed = number(current.rewardTotalClaimed) + amount;
        const allPaid = slots.filter(value => value <= tier.hours).length >= tier.hours;
        transaction.set(taskRef, {
          completionState: allPaid ? 'paid' : completedPayableHours(current, tier) >= tier.hours ? 'completed' : 'in_progress',
          claimedHourSlots: slots,
          claimedHours: slots.length,
          hourlyClaims: claims,
          rewardClaimed: allPaid,
          rewardAmount: totalClaimed,
          rewardTotalClaimed: totalClaimed,
          lastRewardAmount: amount,
          lastRewardHourSlot: slot,
          lastRewardTaskMode: requested,
          liveHourlyRewardJems: tier.reward,
          audioRoomHourlyRewardJems: AUDIO_ROOM_REWARD,
          liveMaxHours: LIVE_MAX_HOURS,
          audioRoomMaxHours: AUDIO_ROOM_MAX_HOURS,
          giftProgressSource: 'live_only',
          rewardRatePolicy: 'mode_specific_v2',
          rewardTierCode: tier.code,
          rewardGiftNet7d: giftNet7d,
          rewardClaimedAtClient: Date.now(),
          rewardClaimedAt: s.serverTimestamp(),
          updatedAt: s.serverTimestamp()
        }, { merge: true });
        transaction.set(s.doc(s.db, 'users', user.uid, 'economia', 'resumen'), {
          taskRewardsCount: s.increment(1),
          taskHoursPaid: s.increment(1),
          taskJemsConfirmed: s.increment(amount),
          [`taskHoursPaid_${requested}`]: s.increment(1),
          [`taskJemsConfirmed_${requested}`]: s.increment(amount),
          lastTaskRewardAtClient: Date.now(),
          lastTaskRewardAt: s.serverTimestamp(),
          updatedAt: s.serverTimestamp(),
          simulation: true
        }, { merge: true });
        transaction.set(s.doc(s.collection(s.db, 'casas', houseId, 'auditoria')), {
          action: 'host_task_hour_reward_claimed',
          subjectUid: user.uid,
          actorUid: user.uid,
          cycleKey: key,
          hourSlot: slot,
          taskMode: requested,
          modeHourNumber,
          rewardJems: amount,
          taskTierCode: tier.code,
          giftNet7d,
          createdAtClient: Date.now(),
          createdAt: s.serverTimestamp(),
          simulation: true,
          schemaVersion: 3
        });
        result = common;
      });

      const amount = number(result?.rewardJems || rewardForMode(requested, tier));
      const key = clean(result?.cycleKey || cycleKey(task), 100);
      const slot = number(result?.hourSlot);
      const mode = normalizeTaskMode(result?.taskMode || requested);
      window.JemmoWallet?.addJems?.(amount, {
        type: 'task-reward',
        title: `Hora ${slot} de tarea · ${modeLabel(mode)}`,
        detail: `60 minutos · ${modeLabel(mode)} · Nivel ${clean(result?.taskTierCode || tier.code, 10)}`,
        source: 'host-task-hour-reward',
        idempotencyKey: `host-task:${houseId}:${user.uid}:${key}:hour:${slot}`
      });
      window.dispatchEvent(new CustomEvent('jemmo-host-task-reward', { detail: { houseId, uid: user.uid, rewardJems: amount, cycleKey: key, hourSlot: slot, taskMode: mode } }));
      if (window.toast) window.toast(`Hora de ${modeLabel(mode)} cobrada: +${fmt(amount)} JEMS.`);
      else alert(`Hora de ${modeLabel(mode)} cobrada: +${fmt(amount)} JEMS.`);
    } catch (error) {
      const message = clean(error?.message || 'No se pudo cobrar esta hora.', 180);
      if (window.toast) window.toast(message);
      else alert(message);
    } finally {
      claiming = false;
      render();
    }
  }

  function clearHouseListeners() {
    houseUnsubscribers.splice(0).forEach(stop => { try { stop(); } catch {} });
    clearSeatTaskListeners();
    attachedHouse = '';
    giftDocuments = [];
    taskHistory = [];
    taskRewards = [];
    giftBuckets = [];
    giftNet7d = 0;
    task = {};
    member = {};
    memberExists = false;
    emitter = false;
    eligibilityState = 'checking';
  }

  function attachHouse(s) {
    if (!houseId || attachedHouse === houseId) return;
    clearHouseListeners();
    attachedHouse = houseId;
    houseUnsubscribers.push(s.onSnapshot(s.doc(s.db, 'casas', houseId, 'miembros', user.uid), snapshot => {
      memberExists = snapshot.exists();
      member = snapshot.data() || {};
      recomputeEligibility();
    }, error => {
      eligibilityState = 'error';
      render();
      console.warn('JEMMO tareas: membresía', error?.code || error?.message || error);
    }));
    houseUnsubscribers.push(s.onSnapshot(s.doc(s.db, 'casas', houseId, 'tareas', user.uid), snapshot => {
      task = snapshot.data() || {};
      syncActivityBaseline();
      recomputeEligibility();
      syncClaimedRewardsToWallet();
      void syncTierSnapshot();
    }));
    const historyQuery = s.query(
      s.collection(s.db, 'casas', houseId, 'historialTareas'),
      s.where('uid', '==', user.uid),
      s.limit(80)
    );
    houseUnsubscribers.push(s.onSnapshot(historyQuery, snapshot => {
      taskHistory = snapshot.docs.map(document => ({ id: document.id, ...(document.data() || {}) }));
      render();
    }, error => console.warn('JEMMO tareas: historial', error?.code || error?.message || error)));
    const rewardsQuery = s.query(s.collection(s.db, 'users', user.uid, 'recompensasTareas'), s.limit(120));
    houseUnsubscribers.push(s.onSnapshot(rewardsQuery, snapshot => {
      taskRewards = snapshot.docs.map(document => ({ id: document.id, ...(document.data() || {}) }));
      render();
    }, error => console.warn('JEMMO tareas: recompensas', error?.code || error?.message || error)));
    const giftsQuery = s.query(
      s.collection(s.db, 'users', user.uid, 'gananciasRegalos'),
      s.orderBy('createdAtClient', 'desc'),
      s.limit(2000)
    );
    houseUnsubscribers.push(s.onSnapshot(giftsQuery, snapshot => {
      giftDocuments = snapshot.docs.map(document => document.data() || {});
      recalculateGiftWindow(true);
    }, error => console.warn('JEMMO tareas: regalos 7 días', error?.code || error?.message || error)));
    void syncSeatTaskListeners();
  }

  async function boot() {
    try {
      window.__JEMMO_TASK_UI_OWNER__ = 'rewards-44';
      window.addEventListener('jemmo-house-activity', handleActivityEvent);
      window.addEventListener('jemmo-wake-lock', handleWakeEvent);
      if (isHouseRoom) window.addEventListener('jemmo-room-seats-rendered', handleSeatsRendered);
      const currentActivity = window.JemmoHouseActivity?.getState?.();
      if (currentActivity?.running) handleActivityEvent({ detail: { ...currentActivity, status: 'active', startedAtClient: Date.now() } });
      const currentWake = window.JemmoKeepAwake?.getState?.();
      if (currentWake) handleWakeEvent({ detail: currentWake });
      injectTaskSheet();
      installGlobalTaskEntries();
      renderClock();
      const box = $('houseTaskClock');
      if (isHouseRoom) {
        box?.addEventListener('click', openSheet);
        box?.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openSheet();
          }
        });
      }
      if (isLivePage) $('taskCard')?.addEventListener('click', openSheet);
      const settings = $('settingsSheet');
      if (settings && !$('jemmoHostTaskSetting')) {
        const button = document.createElement('button');
        button.id = 'jemmoHostTaskSetting';
        button.type = 'button';
        if (isLivePage) {
          button.innerHTML = '📋<small>Mis tareas</small>';
          settings.querySelector('.jl-sheet-grid')?.append(button);
        } else {
          button.className = 'jr-setting';
          button.innerHTML = '<span>📋</span><b>Mis tareas<small>Horas, nivel, regalos y cobros</small></b><i>›</i>';
          settings.insertBefore(button, settings.querySelector('[data-action="minor"]'));
        }
        button.addEventListener('click', () => {
          document.querySelectorAll('[data-close],[data-close-sheet]').forEach(node => node.click());
          openSheet();
        });
      }
      const s = await services();
      user = await waitForUser(s);
      if (isHouseRoom) void syncSeatTaskListeners();
      unsubscribers.push(s.onSnapshot(s.doc(s.db, 'users', user.uid), snapshot => {
        profile = snapshot.data() || {};
        // En una Sala oficial, la Casa abierta manda. El Perfil solo es respaldo.
        const currentRoomHouse = roomHouseId();
        const nextHouse = clean(currentRoomHouse || profile.houseId, 80);
        if (nextHouse && nextHouse !== houseId) {
          houseId = nextHouse;
          clearHouseListeners();
        }
        if (houseId) attachHouse(s);
        else { eligibilityState = 'no_membership'; render(); }
      }, error => {
        eligibilityState = 'error';
        render();
        console.warn('JEMMO tareas: perfil', error?.code || error?.message || error);
      }));
      clearInterval(windowTimer);
      windowTimer = setInterval(() => recalculateGiftWindow(false), 60000);
      clearInterval(uiTimer);
      uiTimer = setInterval(() => {
        if (isHouseRoom) syncSeatTaskTabs();
        if (emitter || isLivePage || isGlobalTaskPage) render();
      }, 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) recalculateGiftWindow(false); });
    } catch (error) {
      eligibilityState = 'error';
      const box = $('houseTaskClock');
      if (box) box.hidden = true;
      syncSeatTaskTabs();
      console.warn('JEMMO tareas remuneradas:', error?.code || error?.message || error);
    }
  }

  window.addEventListener('pagehide', () => {
    clearInterval(windowTimer);
    clearInterval(uiTimer);
    window.removeEventListener('jemmo-house-activity', handleActivityEvent);
    window.removeEventListener('jemmo-wake-lock', handleWakeEvent);
    if (isHouseRoom) window.removeEventListener('jemmo-room-seats-rendered', handleSeatsRendered);
    clearSeatTaskListeners();
    clearHouseListeners();
    unsubscribers.splice(0).forEach(stop => { try { stop(); } catch {} });
  });

  window.JemmoHostTaskRewards = Object.freeze({
    version: VERSION,
    tiers: TIERS,
    currentTier,
    nextTier,
    nextDailySlot,
    claimableModes,
    completedModeHours,
    rewardForMode,
    modeHourLimit,
    claimedSlots,
    giftWindowStart,
    open: openSheet,
    close: closeSheet,
    claim: claimReward,
    getState: () => ({ houseId, emitter, task: { ...task }, taskHistory: taskHistory.map(item => ({ ...item })), giftNet7d, giftBuckets: giftBuckets.map(item => ({ ...item })), tier: currentTier(giftNet7d) })
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else void boot();
})();
