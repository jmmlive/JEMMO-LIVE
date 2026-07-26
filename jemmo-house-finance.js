/* JEMMO LIVE V1 · ECONOMÍA DE CASAS Y AGENTES PRUEBA 23
   Sincroniza regalos, reparto 70/20/10 y auditoría en Firestore.
   MODO DE PRUEBAS: no mueve dinero real. */
(() => {
  'use strict';
  if (window.JemmoHouseFinance?.version) return;

  const VERSION = '23.0-test';
  const QUEUE_KEY = 'jemmo_cloud_gift_queue_v1';
  const firebaseConfig = {
    apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
    authDomain: 'jemmo-live.firebaseapp.com',
    projectId: 'jemmo-live',
    storageBucket: 'jemmo-live.firebasestorage.app',
    messagingSenderId: '355540892255',
    appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
  };

  let servicesPromise = null;
  let processing = false;
  let reconciling = false;
  let authenticatedUid = '';

  const clean = (value, max = 180) => String(value ?? '').trim().slice(0, max);
  const number = value => Math.max(0, Math.floor(Number(value) || 0));
  const normalizeRole = value => clean(value, 40).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isEmitterRole = value => ['emisor', 'emisora', 'emitter', 'host', 'streamer', 'creator', 'creador', 'creadora'].includes(normalizeRole(value));
  const isSyntheticUid = uid => !uid || uid === 'local-user' || /^(demo-|remote-|jemmo-battle-house-|seat-|host$)/i.test(uid);
  const dayKey = value => {
    const date = new Date(Number(value) || Date.now());
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  function readQueue() {
    try {
      const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(item => item && item.operationId).slice(0, 240) : [];
    } catch { return []; }
  }

  function writeQueue(queue) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, 240))); }
    catch {
      try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, 60))); } catch {}
    }
  }

  function enqueueGift(detail) {
    if (!detail?.operationId) return;
    const queue = readQueue();
    const index = queue.findIndex(item => item.operationId === detail.operationId);
    const entry = { ...detail, queuedAtClient: Number(detail.queuedAtClient || Date.now()), attempts: Number(detail.attempts || 0) };
    if (index >= 0) queue[index] = { ...queue[index], ...entry };
    else queue.unshift(entry);
    writeQueue(queue);
    void drainQueue();
  }

  async function services() {
    if (servicesPromise) return servicesPromise;
    servicesPromise = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
    ]).then(([appModule, authModule, firestore]) => {
      const app = appModule.getApps()[0] || appModule.initializeApp(firebaseConfig);
      const auth = authModule.getAuth(app);
      authModule.onAuthStateChanged(auth, user => {
        authenticatedUid = clean(user?.uid, 160);
        if (user) void drainQueue();
      });
      return { ...firestore, auth, onAuthStateChanged: authModule.onAuthStateChanged, db: firestore.getFirestore(app) };
    });
    return servicesPromise;
  }

  async function waitForUser(s, timeout = 12000) {
    if (s.auth.currentUser) return s.auth.currentUser;
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { stop(); reject(new Error('Sesión no disponible.')); }, timeout);
      const stop = s.onAuthStateChanged(s.auth, user => {
        if (!user) return;
        clearTimeout(timer);
        stop();
        resolve(user);
      }, error => { clearTimeout(timer); stop(); reject(error); });
    });
  }

  async function resolveMembership(s, recipientUid, hint = {}) {
    if (isSyntheticUid(recipientUid)) return { hasHouse: false, houseId: '', houseName: '', agentUid: '', recipientProfile: {} };
    const userRef = s.doc(s.db, 'users', recipientUid);
    const userSnap = await s.getDoc(userRef);
    const profile = userSnap.data() || {};
    const hintedHouseId = clean(hint.houseId, 80);
    const profileHouseId = clean(profile.houseId, 80);
    const houseId = hintedHouseId || profileHouseId;
    if (!houseId || ['left', 'removed'].includes(clean(profile.houseStatus, 20))) {
      window.JemmoWallet?.setMembership?.(recipientUid, { hasHouse: false, houseId: '', houseName: '' });
      return { hasHouse: false, houseId: '', houseName: '', agentUid: '', recipientProfile: profile };
    }

    const [memberSnap, houseSnap] = await Promise.all([
      s.getDoc(s.doc(s.db, 'casas', houseId, 'miembros', recipientUid)),
      s.getDoc(s.doc(s.db, 'casas', houseId))
    ]);
    const member = memberSnap.data() || {};
    const house = houseSnap.data() || {};
    const active = memberSnap.exists() && !['left', 'removed'].includes(clean(member.status, 20));
    const emitter = clean(member.housePosition, 30) === 'emitter' || clean(profile.housePosition, 30) === 'emitter' || isEmitterRole(member.accountRole || profile.role || profile.rol || profile.accountRole);
    const hasHouse = Boolean(active && emitter);
    const houseName = clean(house.name || profile.houseName || hint.houseName || 'Casa JEMMO', 80);
    const agentUid = clean(member.assignedAgentUid || profile.assignedAgentUid || house.ownerUid || house.createdBy || house.ownerId, 160);
    window.JemmoWallet?.setMembership?.(recipientUid, { hasHouse, houseId: hasHouse ? houseId : '', houseName: hasHouse ? houseName : '', agentUid });
    return { hasHouse, houseId: hasHouse ? houseId : '', houseName: hasHouse ? houseName : '', agentUid, recipientProfile: profile, member, house };
  }

  function splitFor(detail, hasHouse) {
    const total = number(detail.total);
    const emitterTotal = Math.floor(total * 0.70);
    const agentTotal = hasHouse ? Math.floor(total * 0.10) : 0;
    const appTotal = Math.max(0, total - emitterTotal - agentTotal);
    let pendingRatio = 0;
    const originalHostTotal = number(detail.hostTotal);
    if (originalHostTotal) pendingRatio = Math.min(1, number(detail.hostPending) / originalHostTotal);
    else if (Array.isArray(detail.sourceMethods) && total) {
      const pendingSpent = detail.sourceMethods.filter(item => item?.risk === 'reversible').reduce((sum, item) => sum + number(item.amount), 0);
      pendingRatio = Math.min(1, pendingSpent / total);
    }
    const emitterPending = Math.round(emitterTotal * pendingRatio);
    const appPending = Math.round(appTotal * pendingRatio);
    const agentPending = Math.round(agentTotal * pendingRatio);
    return {
      total,
      emitterTotal,
      emitterConfirmed: emitterTotal - emitterPending,
      emitterPending,
      appTotal,
      appConfirmed: appTotal - appPending,
      appPending,
      agentTotal,
      agentConfirmed: agentTotal - agentPending,
      agentPending,
      pendingRatio,
      status: emitterPending || appPending || agentPending ? 'pending' : 'confirmed'
    };
  }

  async function syncGift(detail) {
    const s = await services();
    const user = await waitForUser(s);
    const operationId = clean(detail.operationId, 180);
    const senderUid = clean(detail.senderUid || user.uid, 160);
    const recipientUid = clean(detail.recipientUid, 160);
    if (!operationId || isSyntheticUid(recipientUid) || detail.economicType === 'house-battle') return { skipped: true };

    const membership = await resolveMembership(s, recipientUid, detail);
    const split = splitFor(detail, membership.hasHouse);
    const createdAtClient = Number(detail.createdAtClient || detail.createdAt || Date.now());
    const releaseAtClient = Number(detail.releaseAtClient || detail.releaseAt || 0);
    const senderName = clean(detail.senderName || '', 80);
    const recipientName = clean(detail.recipientName || membership.recipientProfile.displayName || 'Usuario JEMMO', 80);
    const giftName = clean(detail.giftName || 'Regalo JEMMO', 100);
    const context = clean(detail.context || detail.source || 'Regalo', 80);
    const reference = clean(detail.reference || detail.detail || '', 240);
    const day = dayKey(createdAtClient);

    const globalRef = s.doc(s.db, 'giftOperations', operationId);
    let duplicate = false;
    await s.runTransaction(s.db, async transaction => {
      const existing = await transaction.get(globalRef);
      if (existing.exists()) { duplicate = true; return; }
      const common = {
        operationId,
        senderUid,
        senderName,
        recipientUid,
        recipientName,
        giftName,
        context,
        reference,
        totalJemmos: split.total,
        emitterTotal: split.emitterTotal,
        emitterConfirmed: split.emitterConfirmed,
        emitterPending: split.emitterPending,
        appTotal: split.appTotal,
        appConfirmed: split.appConfirmed,
        appPending: split.appPending,
        agentTotal: split.agentTotal,
        agentConfirmed: split.agentConfirmed,
        agentPending: split.agentPending,
        hasHouse: membership.hasHouse,
        houseId: membership.houseId,
        houseName: membership.houseName,
        agentUid: membership.agentUid,
        status: split.status,
        releaseAtClient,
        createdAtClient,
        createdDay: day,
        simulation: true,
        schemaVersion: 1,
        createdAt: s.serverTimestamp(),
        syncedBy: user.uid
      };
      transaction.set(globalRef, common);

      const earningRef = s.doc(s.db, 'users', recipientUid, 'gananciasRegalos', operationId);
      transaction.set(earningRef, common);
      const userSummaryRef = s.doc(s.db, 'users', recipientUid, 'economia', 'resumen');
      transaction.set(userSummaryRef, {
        giftCount: s.increment(1),
        grossGiftJemmos: s.increment(split.total),
        jemsConfirmed: s.increment(split.emitterConfirmed),
        jemsPending: s.increment(split.emitterPending),
        lastGiftAtClient: createdAtClient,
        lastGiftAt: s.serverTimestamp(),
        updatedAt: s.serverTimestamp(),
        simulation: true
      }, { merge: true });

      if (!membership.hasHouse) return;
      const movementRef = s.doc(s.db, 'casas', membership.houseId, 'movimientos', operationId);
      transaction.set(movementRef, common);
      const emitterSummaryRef = s.doc(s.db, 'casas', membership.houseId, 'resumenEmisoras', recipientUid);
      transaction.set(emitterSummaryRef, {
        uid: recipientUid,
        displayName: recipientName,
        publicId: clean(membership.recipientProfile.publicId, 60),
        assignedAgentUid: membership.agentUid,
        giftCount: s.increment(1),
        grossGiftJemmos: s.increment(split.total),
        emitterTotal: s.increment(split.emitterTotal),
        emitterConfirmed: s.increment(split.emitterConfirmed),
        emitterPending: s.increment(split.emitterPending),
        appTotal: s.increment(split.appTotal),
        appConfirmed: s.increment(split.appConfirmed),
        appPending: s.increment(split.appPending),
        agentTotal: s.increment(split.agentTotal),
        agentConfirmed: s.increment(split.agentConfirmed),
        agentPending: s.increment(split.agentPending),
        lastGiftAtClient: createdAtClient,
        lastGiftAt: s.serverTimestamp(),
        updatedAt: s.serverTimestamp(),
        simulation: true
      }, { merge: true });
      const dailyRef = s.doc(s.db, 'casas', membership.houseId, 'resumenDiario', day);
      transaction.set(dailyRef, {
        dayKey: day,
        giftCount: s.increment(1),
        grossGiftJemmos: s.increment(split.total),
        emitterTotal: s.increment(split.emitterTotal),
        emitterConfirmed: s.increment(split.emitterConfirmed),
        emitterPending: s.increment(split.emitterPending),
        appTotal: s.increment(split.appTotal),
        appConfirmed: s.increment(split.appConfirmed),
        appPending: s.increment(split.appPending),
        agentTotal: s.increment(split.agentTotal),
        agentConfirmed: s.increment(split.agentConfirmed),
        agentPending: s.increment(split.agentPending),
        updatedAt: s.serverTimestamp(),
        simulation: true
      }, { merge: true });
      if (membership.agentUid) {
        const agentSummaryRef = s.doc(s.db, 'casas', membership.houseId, 'resumenAgentes', membership.agentUid);
        transaction.set(agentSummaryRef, {
          agentUid: membership.agentUid,
          emitterUids: s.arrayUnion(recipientUid),
          giftCount: s.increment(1),
          grossGiftJemmos: s.increment(split.total),
          commissionTotal: s.increment(split.agentTotal),
          commissionConfirmed: s.increment(split.agentConfirmed),
          commissionPending: s.increment(split.agentPending),
          lastMovementAtClient: createdAtClient,
          updatedAt: s.serverTimestamp(),
          simulation: true
        }, { merge: true });
        const agentEarningRef = s.doc(s.db, 'users', membership.agentUid, 'gananciasAgente', operationId);
        transaction.set(agentEarningRef, { ...common, beneficiaryUid: membership.agentUid, beneficiaryType: 'house_agent', commissionTotal: split.agentTotal, commissionConfirmed: split.agentConfirmed, commissionPending: split.agentPending });
        const agentUserSummaryRef = s.doc(s.db, 'users', membership.agentUid, 'economiaAgente', 'resumen');
        transaction.set(agentUserSummaryRef, {
          agentUid: membership.agentUid,
          houseIds: s.arrayUnion(membership.houseId),
          emitterUids: s.arrayUnion(recipientUid),
          giftCount: s.increment(1),
          grossGiftJemmos: s.increment(split.total),
          commissionTotal: s.increment(split.agentTotal),
          commissionConfirmed: s.increment(split.agentConfirmed),
          commissionPending: s.increment(split.agentPending),
          lastMovementAtClient: createdAtClient,
          lastMovementAt: s.serverTimestamp(),
          updatedAt: s.serverTimestamp(),
          simulation: true
        }, { merge: true });
      }
      const auditRef = s.doc(s.collection(s.db, 'casas', membership.houseId, 'auditoria'));
      transaction.set(auditRef, {
        action: 'gift_split_registered',
        subjectUid: recipientUid,
        actorUid: senderUid,
        operationId,
        agentUid: membership.agentUid,
        totalJemmos: split.total,
        emitterTotal: split.emitterTotal,
        appTotal: split.appTotal,
        agentTotal: split.agentTotal,
        status: split.status,
        createdAtClient,
        createdAt: s.serverTimestamp(),
        simulation: true,
        schemaVersion: 1
      });
    });
    return { ok: true, duplicate, membership, split };
  }

  async function releasePendingOperation(s, operationId, userUid) {
    const globalRef = s.doc(s.db, 'giftOperations', operationId);
    return await s.runTransaction(s.db, async transaction => {
      const snapshot = await transaction.get(globalRef);
      if (!snapshot.exists()) return { skipped: true, reason: 'missing' };
      const current = snapshot.data() || {};
      const dueAt = Number(current.releaseAtClient || 0);
      if (current.status !== 'pending' || !dueAt || dueAt > Date.now()) return { skipped: true, reason: 'not_due' };

      const recipientUid = clean(current.recipientUid, 160);
      const houseId = clean(current.houseId, 80);
      const agentUid = clean(current.agentUid, 160);
      const createdDay = clean(current.createdDay || dayKey(current.createdAtClient), 20);
      const emitterPending = number(current.emitterPending);
      const appPending = number(current.appPending);
      const agentPending = number(current.agentPending);
      const patch = {
        status: 'confirmed',
        emitterConfirmed: number(current.emitterConfirmed) + emitterPending,
        emitterPending: 0,
        appConfirmed: number(current.appConfirmed) + appPending,
        appPending: 0,
        agentConfirmed: number(current.agentConfirmed) + agentPending,
        agentPending: 0,
        confirmedAtClient: Date.now(),
        confirmedAt: s.serverTimestamp(),
        confirmedBy: clean(userUid, 160),
        updatedAt: s.serverTimestamp()
      };
      transaction.set(globalRef, patch, { merge: true });

      if (recipientUid) {
        transaction.set(s.doc(s.db, 'users', recipientUid, 'gananciasRegalos', operationId), patch, { merge: true });
        transaction.set(s.doc(s.db, 'users', recipientUid, 'economia', 'resumen'), {
          jemsConfirmed: s.increment(emitterPending),
          jemsPending: s.increment(-emitterPending),
          lastConfirmationAtClient: Date.now(),
          updatedAt: s.serverTimestamp()
        }, { merge: true });
      }

      if (houseId) {
        transaction.set(s.doc(s.db, 'casas', houseId, 'movimientos', operationId), patch, { merge: true });
        if (recipientUid) transaction.set(s.doc(s.db, 'casas', houseId, 'resumenEmisoras', recipientUid), {
          emitterConfirmed: s.increment(emitterPending),
          emitterPending: s.increment(-emitterPending),
          appConfirmed: s.increment(appPending),
          appPending: s.increment(-appPending),
          agentConfirmed: s.increment(agentPending),
          agentPending: s.increment(-agentPending),
          lastConfirmationAtClient: Date.now(),
          updatedAt: s.serverTimestamp()
        }, { merge: true });
        if (createdDay) transaction.set(s.doc(s.db, 'casas', houseId, 'resumenDiario', createdDay), {
          emitterConfirmed: s.increment(emitterPending),
          emitterPending: s.increment(-emitterPending),
          appConfirmed: s.increment(appPending),
          appPending: s.increment(-appPending),
          agentConfirmed: s.increment(agentPending),
          agentPending: s.increment(-agentPending),
          updatedAt: s.serverTimestamp()
        }, { merge: true });
        if (agentUid) {
          transaction.set(s.doc(s.db, 'casas', houseId, 'resumenAgentes', agentUid), {
            commissionConfirmed: s.increment(agentPending),
            commissionPending: s.increment(-agentPending),
            lastConfirmationAtClient: Date.now(),
            updatedAt: s.serverTimestamp()
          }, { merge: true });
          transaction.set(s.doc(s.db, 'users', agentUid, 'gananciasAgente', operationId), {
            status: 'confirmed',
            commissionConfirmed: number(current.agentConfirmed) + agentPending,
            commissionPending: 0,
            confirmedAtClient: Date.now(),
            confirmedAt: s.serverTimestamp(),
            updatedAt: s.serverTimestamp()
          }, { merge: true });
          transaction.set(s.doc(s.db, 'users', agentUid, 'economiaAgente', 'resumen'), {
            commissionConfirmed: s.increment(agentPending),
            commissionPending: s.increment(-agentPending),
            lastConfirmationAtClient: Date.now(),
            updatedAt: s.serverTimestamp()
          }, { merge: true });
        }
        const auditRef = s.doc(s.collection(s.db, 'casas', houseId, 'auditoria'));
        transaction.set(auditRef, {
          action: 'gift_commission_confirmed',
          subjectUid: recipientUid,
          actorUid: clean(userUid, 160),
          operationId,
          emitterConfirmed: emitterPending,
          appConfirmed: appPending,
          agentConfirmed: agentPending,
          createdAtClient: Date.now(),
          createdAt: s.serverTimestamp(),
          simulation: true,
          schemaVersion: 1
        });
      }
      return { ok: true, operationId };
    });
  }

  async function reconcilePending() {
    if (reconciling || !navigator.onLine) return;
    reconciling = true;
    try {
      const s = await services();
      const user = await waitForUser(s);
      const operations = new Map();
      for (const field of ['senderUid', 'recipientUid']) {
        try {
          const snapshot = await s.getDocs(s.query(s.collection(s.db, 'giftOperations'), s.where(field, '==', user.uid), s.limit(120)));
          snapshot.docs.forEach(document => operations.set(document.id, document.data() || {}));
        } catch (error) {
          console.warn('JEMMO economía Casa: no se pudo consultar por', field, error?.code || error?.message || error);
        }
      }
      const due = [...operations.entries()].filter(([, item]) => item.status === 'pending' && Number(item.releaseAtClient || 0) > 0 && Number(item.releaseAtClient) <= Date.now()).slice(0, 120);
      for (const [operationId] of due) {
        try { await releasePendingOperation(s, operationId, user.uid); }
        catch (error) { console.warn('JEMMO economía Casa: confirmación pendiente', operationId, error?.code || error?.message || error); }
      }
    } catch (error) {
      console.warn('JEMMO economía Casa: conciliación pendiente', error?.code || error?.message || error);
    } finally { reconciling = false; }
  }

  async function drainQueue() {
    if (processing || !navigator.onLine) return;
    processing = true;
    try {
      const s = await services();
      await waitForUser(s);
      let queue = readQueue();
      for (const item of [...queue].reverse()) {
        try {
          await syncGift(item);
          queue = queue.filter(entry => entry.operationId !== item.operationId);
          writeQueue(queue);
          window.dispatchEvent(new CustomEvent('jemmo-house-finance-synced', { detail: { operationId: item.operationId } }));
        } catch (error) {
          queue = queue.map(entry => entry.operationId === item.operationId ? {
            ...entry,
            attempts: number(entry.attempts) + 1,
            lastAttemptAtClient: Date.now(),
            lastError: clean(error?.code || error?.message || error, 120)
          } : entry).filter(entry => number(entry.attempts) < 12);
          writeQueue(queue);
          console.warn('JEMMO economía Casa: movimiento pendiente', item.operationId, error?.code || error?.message || error);
        }
      }
    } catch (error) {
      console.warn('JEMMO economía Casa: cola pendiente', error?.code || error?.message || error);
    } finally { processing = false; }
    void reconcilePending();
  }

  window.addEventListener('jemmo-gift-registered', event => enqueueGift(event.detail || {}));
  window.addEventListener('online', () => { void drainQueue(); void reconcilePending(); });
  window.addEventListener('pageshow', () => { void drainQueue(); void reconcilePending(); });

  const previewSplit = (total, pendingSpent = 0, hasHouse = true) => splitFor({ total: number(total), sourceMethods: [{ risk: 'reversible', amount: number(pendingSpent) }, { risk: 'confirmed', amount: Math.max(0, number(total) - number(pendingSpent)) }] }, Boolean(hasHouse));
  window.JemmoHouseFinance = Object.freeze({ version: VERSION, enqueueGift, syncGift, drainQueue, reconcilePending, previewSplit, getQueue: readQueue });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void drainQueue(); void reconcilePending(); }, { once: true });
  else { void drainQueue(); void reconcilePending(); }
  setInterval(() => void reconcilePending(), 5 * 60 * 1000);
})();
