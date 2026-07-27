/* JEMMO LIVE V1 · TAREA REAL EN LA CASA ACTUAL PRUEBA 33
   Tareas exclusivas de Emisoras formalmente asignadas a una Casa.
   Cada hora se cobra por separado. El nivel usa únicamente el 70% neto de regalos de Casa.
   MODO DE PRUEBAS: antes de producción, cálculo y abono deben validarse en backend. */
(() => {
  'use strict';
  if (window.JemmoHostTaskRewards?.version) return;

  const VERSION = '33.0-test';
  const params = new URLSearchParams(location.search);
  const isHouseRoom = location.pathname.toLowerCase().endsWith('salas.html') && (
    params.get('houseRoom') === '1' ||
    window.JemmoHouseRoomContext?.enabled === true
  );
  if (!isHouseRoom) return;

  const firebaseConfig = {
    apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
    authDomain: 'jemmo-live.firebaseapp.com',
    projectId: 'jemmo-live',
    storageBucket: 'jemmo-live.firebasestorage.app',
    messagingSenderId: '355540892255',
    appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
  };

  const HOUR_SECONDS = 3600;
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
  const unsubscribers = [];
  const houseUnsubscribers = [];

  const $ = id => document.getElementById(id);
  const clean = (value, max = 180) => String(value ?? '').trim().slice(0, max);
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
  const completedHours = value => Math.floor(totalSeconds(value) / HOUR_SECONDS);
  const nextClaimableSlot = (value, tier) => {
    const paid = new Set(claimedSlots(value));
    const available = Math.min(completedHours(value), tier.hours);
    for (let slot = 1; slot <= available; slot += 1) if (!paid.has(slot)) return slot;
    return 0;
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
    if (migrationRunning || !emitter || !user || !houseId || (isEmitterRole(member.housePosition) && assignedAgentUid())) return;
    migrationRunning = true;
    try {
      const s = await services();
      const agentUid = assignedAgentUid();
      const memberPatch = {
        housePosition: 'emitter',
        status: clean(member.status || 'active', 20) || 'active',
        migratedEmitterPositionAtClient: Date.now(),
        migratedEmitterPositionAt: s.serverTimestamp(),
        updatedAt: s.serverTimestamp()
      };
      const profilePatch = {
        houseId,
        housePosition: 'emitter',
        houseStatus: 'active',
        houseUpdatedAt: s.serverTimestamp()
      };
      if (agentUid) {
        memberPatch.assignedAgentUid = agentUid;
        profilePatch.assignedAgentUid = agentUid;
      }
      await Promise.all([
        s.setDoc(s.doc(s.db, 'casas', houseId, 'miembros', user.uid), memberPatch, { merge: true }),
        s.setDoc(s.doc(s.db, 'users', user.uid), profilePatch, { merge: true }),
        s.setDoc(s.doc(s.db, 'casas', houseId, 'tareas', user.uid), {
          uid: user.uid,
          housePosition: 'emitter',
          assignedAgentUid: agentUid || clean(task.assignedAgentUid, 160),
          taskState: clean(task.taskState, 20) === 'active' ? 'active' : 'waiting',
          assignmentVerifiedAtClient: Date.now(),
          assignmentVerifiedAt: s.serverTimestamp(),
          updatedAt: s.serverTimestamp()
        }, { merge: true })
      ]);
      member.housePosition = 'emitter';
      if (agentUid) member.assignedAgentUid = agentUid;
    } catch (error) {
      console.warn('JEMMO tareas: migración de Emisora', error?.code || error?.message || error);
    } finally {
      migrationRunning = false;
    }
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
      .jr-task-reward-card,.jr-task-progress-card,.jr-task-tier-card,.jr-task-window-card{border:1px solid rgba(255,255,255,.12);border-radius:18px;background:linear-gradient(145deg,rgba(117,46,163,.25),rgba(13,8,21,.92));padding:15px}
      .jr-task-reward-card small,.jr-task-progress-title small,.jr-task-tier-card small,.jr-task-window-card>small{color:#cdb8d8;font-size:10px;font-weight:900;letter-spacing:.8px}.jr-task-reward-card strong{display:block;margin-top:3px;font-size:34px;color:#ffe843;text-shadow:0 0 15px rgba(255,232,67,.28)}.jr-task-reward-card strong em{font-size:14px;font-style:normal}.jr-task-reward-card span{display:block;color:#d7cadf;font-size:12px;line-height:1.4}
      .jr-task-progress-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.jr-task-progress-title b{display:block;margin-top:4px;font-size:18px}.jr-task-progress-title em{font-style:normal;color:#ffe843;font-weight:900}.jr-task-progress-card>i,.jr-task-tier-card>i{display:block;height:9px;margin:12px 0;border-radius:999px;background:#24152f;overflow:hidden}.jr-task-progress-card>i span,.jr-task-tier-card>i span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#9e37e8,#ffe946)}
      .jr-task-split{display:grid;grid-template-columns:1fr 1fr;gap:8px}.jr-task-split span{padding:10px;border-radius:13px;background:rgba(255,255,255,.055)}.jr-task-split small{display:block;color:#a995b7;font-size:9px}.jr-task-split b{display:block;margin-top:3px;font-size:13px}.jr-task-progress-card p,.jr-task-tier-card p,.jr-task-rule{margin:10px 0 0;color:#bfaec8;font-size:11px;line-height:1.45}
      .jr-task-hours{display:grid;gap:8px}.jr-task-hour{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:11px 12px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#0e0915}.jr-task-hour>span{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#271434;color:#ffe843;font-weight:900}.jr-task-hour b{display:block;font-size:13px}.jr-task-hour small{display:block;margin-top:2px;color:#a995b7;font-size:10px}.jr-task-hour em{font-style:normal;font-size:10px;font-weight:900;color:#a995b7}.jr-task-hour.ready{border-color:#ffe843;box-shadow:0 0 16px rgba(255,232,67,.12)}.jr-task-hour.ready em{color:#ffe843}.jr-task-hour.paid{border-color:rgba(73,229,154,.48);background:rgba(21,89,58,.22)}.jr-task-hour.paid em{color:#49e59a}
      .jr-task-claim{width:100%;min-height:52px;border:0;border-radius:15px;background:linear-gradient(90deg,#9c31df,#f4d936);color:#100713;font-weight:1000;font-size:13px;letter-spacing:.4px}.jr-task-claim:disabled{opacity:.46;filter:saturate(.45)}.jr-task-claim.claimed{background:#183a2c;color:#55e8a3}
      .jr-task-tier-card{display:grid;grid-template-columns:1fr auto;gap:8px}.jr-task-tier-card>div b{display:block;margin-top:4px}.jr-task-tier-card>div span{display:block;margin-top:3px;color:#bfaec8;font-size:11px}.jr-task-tier-card>em{font-style:normal;color:#ffe843;font-weight:900}.jr-task-tier-card>i,.jr-task-tier-card>p{grid-column:1/-1}
      .jr-task-window-card{display:grid;gap:8px}.jr-task-window-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.045)}.jr-task-window-row b{font-size:12px}.jr-task-window-row span{color:#a995b7;font-size:10px}.jr-task-window-row em{font-style:normal;color:#f4dd4c;font-weight:900;font-size:12px}
      .jr-task-levels{border:1px solid rgba(255,255,255,.11);border-radius:15px;background:#0d0913;overflow:hidden}.jr-task-levels summary{cursor:pointer;padding:13px 14px;color:#f1de4b;font-size:11px;font-weight:900}.jr-task-levels>div{display:grid;gap:6px;padding:0 10px 12px}.jr-task-levels span{display:grid;grid-template-columns:48px 1fr auto;gap:8px;align-items:center;padding:9px;border-radius:11px;background:rgba(255,255,255,.04)}.jr-task-levels span.active{outline:1px solid #f0d941;background:rgba(240,217,65,.09)}.jr-task-levels b{font-size:11px}.jr-task-levels small{color:#bbaac4;font-size:10px}.jr-task-levels em{font-style:normal;text-align:right;color:#f1df4b;font-size:10px;font-weight:900}
      @media(max-width:380px){.jr-task-sheet{padding-left:11px;padding-right:11px}.jr-task-levels span{grid-template-columns:42px 1fr}.jr-task-levels em{grid-column:2;text-align:left}}
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
    const box = $('houseTaskClock');
    const label = box?.querySelector('small');
    const count = $('houseTaskCountdown');
    const mini = $('houseTaskProgressMini');
    if (!box || !count || !mini) return;
    const managementHidden = !emitter && eligibilityState === 'management';
    box.hidden = managementHidden;
    const setting = $('jemmoHostTaskSetting');
    if (setting) setting.hidden = managementHidden;
    if (managementHidden) return;
    box.setAttribute('role', 'button');
    box.setAttribute('tabindex', '0');
    box.setAttribute('aria-label', emitter ? 'Abrir mis tareas de Emisora' : 'Consultar estado de tareas de Casa');
    if (!emitter) {
      box.classList.add('waiting');
      box.classList.remove('done');
      if (label) label.textContent = eligibilityState === 'checking' ? 'COMPROBANDO TAREA' : 'TAREA DE CASA';
      count.textContent = eligibilityState === 'checking' ? 'CARGANDO…' : 'NO ACTIVA';
      mini.textContent = eligibilityMessage();
      return;
    }
    const tier = currentTier(giftNet7d);
    const paid = claimedSlots(task).filter(slot => slot <= tier.hours).length;
    const allPaid = paid >= tier.hours;
    box.classList.remove('waiting');
    box.classList.toggle('done', allPaid);
    if (label) label.textContent = allPaid ? 'TAREA DIARIA COBRADA' : 'MI TAREA · TOCA PARA VER';
    count.textContent = `${fmt(tier.reward)} JEMS/HORA`;
    mini.textContent = `${paid}/${tier.hours} horas cobradas · Nivel ${tier.code}`;
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
    const seconds = totalSeconds(task);
    const targetSeconds = tier.hours * HOUR_SECONDS;
    const progress = Math.min(100, Math.floor(seconds / targetSeconds * 100));
    const giftProgress = next ? Math.min(100, Math.floor(giftNet7d / next.target * 100)) : 100;
    const paidSlots = claimedSlots(task);
    const paidSet = new Set(paidSlots);
    const claimable = nextClaimableSlot(task, tier);
    const paidForTier = paidSlots.filter(slot => slot <= tier.hours).length;
    const allPaid = paidForTier >= tier.hours;
    const active = clean(task.taskState, 20) === 'active';
    const nextNeededHour = Math.min(tier.hours, paidForTier + 1);
    const secondsNeededForNext = Math.max(0, nextNeededHour * HOUR_SECONDS - seconds);
    const minutesNeeded = Math.ceil(secondsNeededForNext / 60);
    const nextText = next ? `Faltan ${fmt(Math.max(0, next.target - giftNet7d))} JEMS netos para ${fmt(next.reward)} JEMS/h y ${next.hours} horas diarias.` : 'Has alcanzado el nivel máximo.';

    const hoursHtml = Array.from({ length: tier.hours }, (_, index) => {
      const slot = index + 1;
      const paid = paidSet.has(slot);
      const ready = !paid && seconds >= slot * HOUR_SECONDS;
      const stateClass = paid ? 'paid' : ready ? 'ready' : '';
      const stateText = paid ? 'COBRADA' : ready ? 'LISTA PARA COBRAR' : `${Math.min(60, Math.floor(Math.max(0, seconds - index * HOUR_SECONDS) / 60))}/60 MIN`;
      const claim = hourlyClaims(task)[`h${slot}`] || {};
      const amount = number(claim.rewardJems || tier.reward);
      return `<div class="jr-task-hour ${stateClass}"><span>${slot}</span><div><b>HORA ${slot} · ${fmt(tier.reward)} JEMS</b><small>${paid ? `Abonada: ${fmt(amount)} JEMS` : '60 minutos activos combinando LIVE y Sala oficial'}</small></div><em>${stateText}</em></div>`;
    }).join('');

    const bucketsHtml = giftBuckets.map(bucket => {
      const expires = new Date(bucket.startedAt);
      expires.setDate(expires.getDate() + 6);
      return `<div class="jr-task-window-row"><div><b>${formatDay(bucket.startedAt)}</b><span>Cuenta hasta terminar ${formatDay(expires.getTime())}</span></div><em>${fmt(bucket.amount)} JEMS</em></div>`;
    }).join('');

    const buttonText = allPaid
      ? `TODAS LAS HORAS COBRADAS · ${fmt(paidSlots.reduce((sum, slot) => sum + number(hourlyClaims(task)[`h${slot}`]?.rewardJems), 0))} JEMS`
      : claimable
        ? `COBRAR HORA ${claimable} · ${fmt(tier.reward)} JEMS`
        : `FALTAN ${minutesNeeded} MIN PARA LA HORA ${nextNeededHour}`;

    target.innerHTML = `
      <section class="jr-task-reward-card">
        <small>PAGO ACTUAL POR CADA HORA</small>
        <strong>${fmt(tier.reward)} <em>JEMS/HORA</em></strong>
        <span>Nivel ${tier.code}: hasta ${tier.hours} cobro${tier.hours === 1 ? '' : 's'} diario${tier.hours === 1 ? '' : 's'}, uno por cada bloque completo de 60 minutos.</span>
      </section>
      <section class="jr-task-progress-card">
        <div class="jr-task-progress-title"><div><small>PROGRESO DEL CICLO DE 24 HORAS</small><b>${formatClock(seconds)} / ${formatClock(targetSeconds)}</b></div><em>${progress}%</em></div>
        <i><span style="width:${progress}%"></span></i>
        <div class="jr-task-split"><span><small>LIVE ACTIVO</small><b>${formatClock(task.liveSeconds)}</b></span><span><small>AUDIO ROOM EN SILLA</small><b>${formatClock(task.houseRoomSeconds)}</b></span></div>
        <p>Escuchar abajo no suma. Cada hora completa se cobra de forma independiente y las siguientes horas continúan acumulándose.</p>
      </section>
      <section class="jr-task-hours">${hoursHtml}</section>
      <button class="jr-task-claim ${allPaid ? 'claimed' : ''}" id="jemmoHostTaskClaim" type="button" ${!active || !claimable || claiming ? 'disabled' : ''}>${buttonText}</button>
      <section class="jr-task-tier-card">
        <div><small>NIVEL ACTUAL · VENTANA MÓVIL</small><b>${tier.label} · ${tier.code}</b><span>${fmt(giftNet7d)} JEMS netos de regalos de Casa durante 7 días naturales</span></div>
        <em>${fmt(tier.reward)}/h · ${tier.hours}h</em>
        <i><span style="width:${giftProgress}%"></span></i>
        <p>${nextText}</p>
      </section>
      <section class="jr-task-window-card"><small>DESGLOSE DE LOS 7 DÍAS QUE CUENTAN AHORA</small>${bucketsHtml}</section>
      <p class="jr-task-rule">Solo cuentan regalos enviados mientras eres Emisora de esta Casa. De cada regalo: 70% Emisora, 20% JEMMO LIVE y 10% Casa/agente. Para tu nivel cuenta exclusivamente tu 70% neto. Una Emisora independiente recibe 70/30, pero no tiene tareas.</p>
      <details class="jr-task-levels"><summary>VER TODA LA ESCALA</summary><div>${TIERS.map(item => `<span class="${item.code === tier.code ? 'active' : ''}"><b>${item.code}</b><small>${fmt(item.target)} netos</small><em>${fmt(item.reward)}/h · ${item.hours}h/día</em></span>`).join('')}</div></details>`;
    $('jemmoHostTaskClaim')?.addEventListener('click', () => void claimReward());
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
        detail: `60 minutos · Nivel ${clean(claim.taskTierCode || task.taskTierCode || 'BASE', 10)}`,
        source: 'host-task-hour-sync',
        idempotencyKey: `host-task:${houseId}:${user.uid}:${key}:hour:${slot}`
      });
    }
  }

  async function syncTierSnapshot() {
    if (!emitter || !user || !houseId || !task.cycleStartedAtClient) return;
    const tier = currentTier(giftNet7d);
    const paid = claimedSlots(task);
    const signature = `${cycleKey(task)}:${giftNet7d}:${tier.code}:${tier.reward}:${tier.hours}:${paid.join(',')}`;
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

  async function claimReward() {
    if (claiming || !emitter || !user || !houseId) return;
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
        const slot = nextClaimableSlot(current, tier);
        if (!slot) throw new Error('Todavía no existe una hora nueva disponible para cobrar.');
        const rewardId = `${key}-hour-${slot}`;
        const rewardRef = s.doc(s.db, 'users', user.uid, 'recompensasTareas', rewardId);
        const rewardSnap = await transaction.get(rewardRef);
        if (rewardSnap.exists()) {
          result = { duplicate: true, ...rewardSnap.data() };
          return;
        }

        const amount = tier.reward;
        const common = {
          rewardId,
          cycleKey: key,
          hourSlot: slot,
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
          rewardJems: amount,
          status: 'confirmed',
          claimedAtClient: Date.now(),
          claimedAt: s.serverTimestamp(),
          simulation: true,
          schemaVersion: 2
        };
        transaction.set(rewardRef, common);
        transaction.set(s.doc(s.db, 'casas', houseId, 'recompensasTareas', `${user.uid}_${rewardId}`), common);

        const slots = claimedSlots(current);
        if (!slots.includes(slot)) slots.push(slot);
        slots.sort((a, b) => a - b);
        const claims = { ...hourlyClaims(current), [`h${slot}`]: {
          hourSlot: slot,
          rewardJems: amount,
          taskTierCode: tier.code,
          taskTierLabel: tier.label,
          giftNet7d,
          claimedAtClient: Date.now()
        } };
        const totalClaimed = number(current.rewardTotalClaimed) + amount;
        const allPaid = slots.filter(value => value <= tier.hours).length >= tier.hours;
        transaction.set(taskRef, {
          completionState: allPaid ? 'paid' : totalSeconds(current) >= tier.hours * HOUR_SECONDS ? 'completed' : 'in_progress',
          claimedHourSlots: slots,
          claimedHours: slots.length,
          hourlyClaims: claims,
          rewardClaimed: allPaid,
          rewardAmount: totalClaimed,
          rewardTotalClaimed: totalClaimed,
          lastRewardAmount: amount,
          lastRewardHourSlot: slot,
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
          rewardJems: amount,
          taskTierCode: tier.code,
          giftNet7d,
          createdAtClient: Date.now(),
          createdAt: s.serverTimestamp(),
          simulation: true,
          schemaVersion: 2
        });
        result = common;
      });

      const amount = number(result?.rewardJems || tier.reward);
      const key = clean(result?.cycleKey || cycleKey(task), 100);
      const slot = number(result?.hourSlot);
      window.JemmoWallet?.addJems?.(amount, {
        type: 'task-reward',
        title: `Hora ${slot} de tarea de Emisora`,
        detail: `60 minutos · Nivel ${clean(result?.taskTierCode || tier.code, 10)}`,
        source: 'host-task-hour-reward',
        idempotencyKey: `host-task:${houseId}:${user.uid}:${key}:hour:${slot}`
      });
      window.dispatchEvent(new CustomEvent('jemmo-host-task-reward', { detail: { houseId, uid: user.uid, rewardJems: amount, cycleKey: key, hourSlot: slot } }));
      if (window.toast) window.toast(`Hora ${slot} cobrada: +${fmt(amount)} JEMS.`);
      else alert(`Hora ${slot} cobrada: +${fmt(amount)} JEMS.`);
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
    attachedHouse = '';
    giftDocuments = [];
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
      recomputeEligibility();
      syncClaimedRewardsToWallet();
      void syncTierSnapshot();
    }));
    const giftsQuery = s.query(
      s.collection(s.db, 'users', user.uid, 'gananciasRegalos'),
      s.orderBy('createdAtClient', 'desc'),
      s.limit(2000)
    );
    houseUnsubscribers.push(s.onSnapshot(giftsQuery, snapshot => {
      giftDocuments = snapshot.docs.map(document => document.data() || {});
      recalculateGiftWindow(true);
    }, error => console.warn('JEMMO tareas: regalos 7 días', error?.code || error?.message || error)));
  }

  async function boot() {
    try {
      window.__JEMMO_TASK_UI_OWNER__ = 'rewards-33';
      injectTaskSheet();
      renderClock();
      const box = $('houseTaskClock');
      box?.addEventListener('click', openSheet);
      box?.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openSheet();
        }
      });
      const settings = $('settingsSheet');
      if (settings && !$('jemmoHostTaskSetting')) {
        const button = document.createElement('button');
        button.className = 'jr-setting';
        button.id = 'jemmoHostTaskSetting';
        button.type = 'button';
        button.innerHTML = '<span>📋</span><b>Mis tareas<small>Horas, nivel, regalos y cobros</small></b><i>›</i>';
        button.addEventListener('click', () => {
          document.querySelectorAll('[data-close]').forEach(node => node.click());
          openSheet();
        });
        settings.insertBefore(button, settings.querySelector('[data-action="minor"]'));
      }
      const s = await services();
      user = await waitForUser(s);
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
      document.addEventListener('visibilitychange', () => { if (!document.hidden) recalculateGiftWindow(false); });
    } catch (error) {
      console.warn('JEMMO tareas remuneradas:', error?.code || error?.message || error);
    }
  }

  window.addEventListener('pagehide', () => {
    clearInterval(windowTimer);
    clearHouseListeners();
    unsubscribers.splice(0).forEach(stop => { try { stop(); } catch {} });
  });

  window.JemmoHostTaskRewards = Object.freeze({
    version: VERSION,
    tiers: TIERS,
    currentTier,
    nextTier,
    nextClaimableSlot,
    claimedSlots,
    giftWindowStart,
    open: openSheet,
    close: closeSheet,
    claim: claimReward,
    getState: () => ({ houseId, emitter, task: { ...task }, giftNet7d, giftBuckets: giftBuckets.map(item => ({ ...item })), tier: currentTier(giftNet7d) })
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else void boot();
})();
