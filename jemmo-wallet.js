/* =========================================================
   JEMMO LIVE · CORRECCIÓN RECARGA PERSISTENTE 03
   Un solo saldo y un solo libro económico para toda la app
   ========================================================= */
(() => {
  'use strict';
  if (window.JemmoWallet?.version) return;

  const VERSION = '7.1.1-test';
  const FINANCE_KEY = 'jemmo_finance_v1';
  const STORAGE_DB = 'jemmo_live_durable_v1';
  const STORAGE_DB_VERSION = 1;
  const WALLET_STORE = 'wallets';
  const FINANCE_STORE = 'finance';
  let authenticatedUid = '';
  const walletMemory = new Map();
  const walletSaveStatus = new Map();
  let financeMemory = null;
  let financeSavePromise = null;
  let storageDbPromise = null;
  const byId = id => document.getElementById(id);
  const nowId = (prefix = 'op') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const currentUid = () => String(window.__jemmoAuthenticatedUid || authenticatedUid || localStorage.getItem('jemmo_active_uid') || 'local-user');
  const storageKeyFor = uid => `jemmo_wallet_v1_${uid}`;
  const storageKey = () => storageKeyFor(currentUid());
  const formatNumber = value => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('es-ES');
  const formatMoney = value => Math.max(0, Number(value) || 0).toLocaleString('es-ES', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  const formatDate = value => new Date(Number(value) || Date.now()).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
  });
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
  const readJson = (key, fallback) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  };
  const saveJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const isQuotaError = error => Boolean(error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22 || error.code === 1014));

  function openStorageDb() {
    if (storageDbPromise) return storageDbPromise;
    storageDbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('indexeddb-unavailable'));
        return;
      }
      const request = indexedDB.open(STORAGE_DB, STORAGE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WALLET_STORE)) db.createObjectStore(WALLET_STORE, { keyPath: 'uid' });
        if (!db.objectStoreNames.contains(FINANCE_STORE)) db.createObjectStore(FINANCE_STORE, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('indexeddb-open-failed'));
    });
    return storageDbPromise;
  }

  async function idbGet(storeName, key) {
    const db = await openStorageDb();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const request = transaction.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('indexeddb-read-failed'));
    });
  }

  async function idbPut(storeName, value) {
    const db = await openStorageDb();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error || new Error('indexeddb-write-failed'));
      transaction.onabort = () => reject(transaction.error || new Error('indexeddb-write-aborted'));
      transaction.objectStore(storeName).put(value);
    });
  }

  function removeSafeLegacyStorage() {
    const removable = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) || '';
      if (/^jemmo_wallet_(?:legacy|backup|old)/i.test(key)) removable.push(key);
      if (/^jemmo_finance_(?:legacy|backup|old)/i.test(key)) removable.push(key);
    }
    removable.forEach(key => localStorage.removeItem(key));
    try {
      const archives = readJson('jemmo_finance_reset_archives_v1', []);
      if (Array.isArray(archives) && archives.length > 3) saveJson('jemmo_finance_reset_archives_v1', archives.slice(0, 3));
    } catch {}
  }

  const DEFAULT_SETTINGS = {
    jemsPerUsd: 10000,
    minimumWithdrawJems: 100000,
    confirmationHours: 72,
    reservePct: 15,
    hostPct: 70,
    appHousePct: 20,
    agencyPct: 10,
    appIndependentPct: 30,
    googleFeePct: 15,
    cardFeePct: 3.5,
    epayFeePct: 5,
    cryptoFeePct: 1,
    feeBinanceBep20: 0.5,
    feeUsdtTrc20: 1,
    feeUsdcBep20: 0.5
  };

  const METHOD_INFO = {
    google: { icon: '▶', name: 'Google Play', copy: 'Paquetes de Google Play', risk: 'reversible' },
    card: { icon: '💳', name: 'Tarjeta', copy: 'Visa o Mastercard de prueba', risk: 'reversible' },
    epay: { icon: '🌐', name: 'Epay', copy: 'Pago externo simulado', risk: 'reversible' },
    usdt: { icon: '₮', name: 'USDT', copy: 'Recarga cripto confirmada', risk: 'confirmed' },
    usdc: { icon: '◉', name: 'USDC', copy: 'Recarga cripto confirmada', risk: 'confirmed' }
  };

  const RECHARGE_PACKAGES = {
    google: [
      { usd: 0.99, jemmos: 7000 }, { usd: 2.99, jemmos: 21000 },
      { usd: 9.99, jemmos: 70000 }, { usd: 29.99, jemmos: 210000 },
      { usd: 49.99, jemmos: 350000 }, { usd: 99.99, jemmos: 700000 },
      { usd: 199.99, jemmos: 1400000 }
    ],
    card: [
      { usd: 10, jemmos: 83000, bonus: 18 }, { usd: 30, jemmos: 252000, bonus: 20 },
      { usd: 50, jemmos: 430000, bonus: 22 }, { usd: 100, jemmos: 870000, bonus: 24 },
      { usd: 200, jemmos: 1780000, bonus: 27 }
    ],
    epay: [
      { usd: 10, jemmos: 83000, bonus: 18 }, { usd: 30, jemmos: 252000, bonus: 20 },
      { usd: 50, jemmos: 430000, bonus: 22 }, { usd: 100, jemmos: 870000, bonus: 24 },
      { usd: 200, jemmos: 1780000, bonus: 27 }
    ]
  };

  const CRYPTO_NETWORKS = {
    usdt: ['Binance Smart Chain · BEP20', 'TRON · TRC20', 'Ethereum · ERC20'],
    usdc: ['Binance Smart Chain · BEP20', 'Ethereum · ERC20']
  };

  const WITHDRAW_METHODS = {
    binance_bep20: { name: 'Binance · BEP20', setting: 'feeBinanceBep20' },
    usdt_trc20: { name: 'USDT · TRC20', setting: 'feeUsdtTrc20' },
    usdc_bep20: { name: 'USDC · BEP20', setting: 'feeUsdcBep20' }
  };

  const defaultWallet = () => ({
    schemaVersion: 5,
    version: 5,
    jemmos: 0,
    coins: 0,
    jems: 0,
    earnings: 0,
    jemsConfirmed: 0,
    jemsPending: 0,
    jemsWithdrawn: 0,
    crystals: 0,
    diamonds: 0,
    methodType: '',
    methodAlias: '',
    history: [],
    ledger: [],
    lots: [],
    pendingCredits: [],
    earningsHistory: [],
    withdrawals: [],
    updatedAt: 0
  });

  function normalizeWallet(input) {
    const raw = input && typeof input === 'object' ? input : {};
    const wallet = { ...defaultWallet(), ...raw };
    wallet.schemaVersion = 5;
    wallet.version = Math.max(5, Number(raw.version) || 0);
    wallet.jemmos = Math.max(0, Math.floor(Number(raw.jemmos ?? raw.coins) || 0));
    wallet.coins = wallet.jemmos;
    const hadSplit = Object.prototype.hasOwnProperty.call(raw, 'jemsConfirmed') || Object.prototype.hasOwnProperty.call(raw, 'jemsPending');
    wallet.jemsConfirmed = Math.max(0, Math.floor(Number(hadSplit ? raw.jemsConfirmed : (raw.jems ?? raw.earnings)) || 0));
    wallet.jemsPending = Math.max(0, Math.floor(Number(raw.jemsPending) || 0));
    wallet.jemsWithdrawn = Math.max(0, Math.floor(Number(raw.jemsWithdrawn) || 0));
    wallet.jems = wallet.jemsConfirmed + wallet.jemsPending;
    wallet.earnings = wallet.jems;
    wallet.crystals = Math.max(0, Math.floor(Number(raw.crystals ?? raw.diamonds) || 0));
    wallet.diamonds = wallet.crystals;
    wallet.methodType = String(raw.methodType || '');
    wallet.methodAlias = String(raw.methodAlias || '');
    wallet.history = Array.isArray(raw.history) ? raw.history.slice(0, 250) : [];
    wallet.ledger = Array.isArray(raw.ledger) ? raw.ledger.slice(0, 400) : [];
    wallet.lots = Array.isArray(raw.lots) ? raw.lots.map(lot => ({
      ...lot,
      remaining: Math.max(0, Math.floor(Number(lot.remaining) || 0)),
      createdAt: Number(lot.createdAt) || Date.now()
    })).filter(lot => lot.remaining > 0) : [];
    wallet.pendingCredits = Array.isArray(raw.pendingCredits) ? raw.pendingCredits : [];
    wallet.earningsHistory = Array.isArray(raw.earningsHistory) ? raw.earningsHistory : [];
    wallet.withdrawals = Array.isArray(raw.withdrawals) ? raw.withdrawals : [];
    wallet.updatedAt = Object.prototype.hasOwnProperty.call(raw, 'updatedAt')
      ? Math.max(0, Number(raw.updatedAt) || 0)
      : 0;

    let lotTotal = wallet.lots.reduce((sum, lot) => sum + lot.remaining, 0);
    if (wallet.jemmos > lotTotal) {
      wallet.lots.push({
        id: nowId('legacy'), method: 'legacy', label: 'Saldo anterior', risk: 'confirmed',
        initialJemmos: wallet.jemmos - lotTotal, remaining: wallet.jemmos - lotTotal,
        createdAt: Date.now(), simulation: true
      });
      lotTotal = wallet.jemmos;
    }
    if (lotTotal > wallet.jemmos) {
      let excess = lotTotal - wallet.jemmos;
      for (let index = wallet.lots.length - 1; index >= 0 && excess > 0; index -= 1) {
        const cut = Math.min(excess, wallet.lots[index].remaining);
        wallet.lots[index].remaining -= cut;
        excess -= cut;
      }
      wallet.lots = wallet.lots.filter(lot => lot.remaining > 0);
    }
    return wallet;
  }

  const defaultFinance = () => ({
    version: 3,
    settings: { ...DEFAULT_SETTINGS },
    cash: { gross: 0, received: 0, pending: 0, fees: 0, paidOut: 0 },
    app: { confirmed: 0, pending: 0 },
    agencies: {},
    membership: {},
    migration: { wallets: {} },
    period: { cycle: 1, startedAt: Date.now(), dayKey: localDayKey(), lastClosedAt: 0 },
    closures: [], resetLog: [], recharges: [], gifts: [], tasks: [], withdrawals: [],
    expenses: [], pendingSystem: [], audit: []
  });

  function localDayKey(value = Date.now()) {
    const date = new Date(Number(value) || Date.now());
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function normalizeFinance(input) {
    const raw = input && typeof input === 'object' ? input : {};
    const base = defaultFinance();
    const state = { ...base, ...raw };
    state.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
    state.cash = { ...base.cash, ...(raw.cash || {}) };
    state.app = { ...base.app, ...(raw.app || {}) };
    state.agencies = raw.agencies && typeof raw.agencies === 'object' && !Array.isArray(raw.agencies) ? raw.agencies : {};
    state.membership = raw.membership && typeof raw.membership === 'object' && !Array.isArray(raw.membership) ? raw.membership : {};
    state.migration = raw.migration && typeof raw.migration === 'object' && !Array.isArray(raw.migration) ? raw.migration : { wallets: {} };
    if (!state.migration.wallets || typeof state.migration.wallets !== 'object') state.migration.wallets = {};
    ['closures', 'resetLog', 'recharges', 'gifts', 'tasks', 'withdrawals', 'expenses', 'pendingSystem', 'audit'].forEach(key => {
      if (!Array.isArray(state[key])) state[key] = [];
    });
    state.period = { ...base.period, ...(raw.period || {}) };
    if (!Number(state.period.startedAt)) state.period.startedAt = Date.now();
    if (!state.period.dayKey) state.period.dayKey = localDayKey(state.period.startedAt);
    if (!Number(state.period.cycle)) state.period.cycle = 1;
    return state;
  }

  function readFinance() {
    const raw = readJson(FINANCE_KEY, null);
    const localState = normalizeFinance(raw);
    if (!raw) localState.updatedAt = 0;
    if (financeMemory && Number(financeMemory.updatedAt || 0) >= Number(localState.updatedAt || 0)) return normalizeFinance(financeMemory);
    financeMemory = localState;
    return localState;
  }

  async function hydrateFinanceFromDb() {
    try {
      const record = await idbGet(FINANCE_STORE, FINANCE_KEY);
      if (!record?.state) return readFinance();
      const stored = normalizeFinance(record.state);
      const current = readFinance();
      if (Number(stored.updatedAt || 0) <= Number(current.updatedAt || 0)) return current;
      financeMemory = stored;
      try { saveJson(FINANCE_KEY, compactFinanceState(stored)); } catch {}
      return stored;
    } catch (error) {
      console.warn('JEMMO IndexedDB finance restore', error);
      return readFinance();
    }
  }

  function compactFinanceState(input) {
    const state = normalizeFinance(input);
    state.recharges = state.recharges.slice(0, 160);
    state.gifts = state.gifts.slice(0, 220);
    state.tasks = state.tasks.slice(0, 160);
    state.withdrawals = state.withdrawals.slice(0, 140);
    state.expenses = state.expenses.slice(0, 140);
    state.pendingSystem = state.pendingSystem.slice(0, 220);
    state.audit = state.audit.slice(0, 240);
    state.closures = state.closures.slice(0, 80);
    state.resetLog = state.resetLog.slice(0, 30);
    return state;
  }

  function compactStoredFinance() {
    try {
      const current = readFinance();
      current.updatedAt = Date.now();
      saveJson(FINANCE_KEY, compactFinanceState(current));
      return true;
    } catch {
      return false;
    }
  }

  const writeFinance = state => {
    let clean = normalizeFinance(state);
    clean.updatedAt = Date.now();
    let localSaved = false;
    try {
      saveJson(FINANCE_KEY, clean);
      localSaved = true;
    } catch (error) {
      if (!isQuotaError(error)) throw error;
      try { removeSafeLegacyStorage(); } catch {}
      clean = compactFinanceState(clean);
      clean.updatedAt = Date.now();
      try {
        saveJson(FINANCE_KEY, clean);
        localSaved = true;
      } catch (retryError) {
        if (!isQuotaError(retryError)) throw retryError;
      }
    }
    financeMemory = clean;
    financeSavePromise = idbPut(FINANCE_STORE, { key: FINANCE_KEY, state: clean, updatedAt: clean.updatedAt })
      .catch(error => {
        if (localSaved) {
          console.warn('JEMMO IndexedDB finance copy', error);
          return false;
        }
        throw error;
      });
    financeSavePromise.catch(() => false);
    return clean;
  };

  function auditFinance(state, type, label, details = {}) {
    state.audit.unshift({
      id: nowId('audit'), type, label, details, actor: currentUid(),
      createdAt: Date.now(), simulation: true
    });
    state.audit = state.audit.slice(0, 600);
  }

  function getWallet(uid = currentUid()) {
    const raw = readJson(storageKeyFor(uid), null);
    const localWallet = normalizeWallet(raw);
    if (!raw) localWallet.updatedAt = 0;
    const memoryWallet = walletMemory.get(uid);
    if (memoryWallet && Number(memoryWallet.updatedAt || 0) >= Number(localWallet.updatedAt || 0)) return normalizeWallet(memoryWallet);
    walletMemory.set(uid, localWallet);
    return localWallet;
  }

  async function hydrateWalletFromDb(uid = currentUid()) {
    try {
      const record = await idbGet(WALLET_STORE, uid);
      if (!record?.wallet) return getWallet(uid);
      const stored = normalizeWallet(record.wallet);
      const current = getWallet(uid);
      if (Number(stored.updatedAt || 0) <= Number(current.updatedAt || 0)) return current;
      walletMemory.set(uid, stored);
      try {
        saveJson(storageKeyFor(uid), compactWalletState(stored));
      } catch (error) {
        if (!isQuotaError(error)) console.warn('JEMMO local wallet restore', error);
      }
      emit(stored, 'indexeddb-restore');
      return stored;
    } catch (error) {
      console.warn('JEMMO IndexedDB wallet restore', error);
      return getWallet(uid);
    }
  }

  function emit(wallet, source = 'global') {
    const detail = { wallet: normalizeWallet(wallet), uid: currentUid(), source };
    window.dispatchEvent(new CustomEvent('jemmo-wallet-change', { detail }));
    document.dispatchEvent(new CustomEvent('jemmo-wallet-change', { detail }));
    syncVisibleBalances(detail.wallet);
  }

  function compactWalletState(input) {
    const wallet = normalizeWallet(input);
    wallet.history = wallet.history.slice(0, 120);
    wallet.ledger = wallet.ledger.slice(0, 220);
    wallet.pendingCredits = wallet.pendingCredits.slice(0, 160);
    wallet.earningsHistory = wallet.earningsHistory.slice(0, 180);
    wallet.withdrawals = wallet.withdrawals.slice(0, 100);
    return wallet;
  }

  function saveWalletFor(uid, next) {
    let wallet = normalizeWallet(next);
    wallet.updatedAt = Date.now();
    let localSaved = false;
    let lastError = null;
    try {
      saveJson(storageKeyFor(uid), wallet);
      localSaved = true;
    } catch (error) {
      lastError = error;
      if (!isQuotaError(error)) throw error;
      try { compactStoredFinance(); } catch {}
      try { removeSafeLegacyStorage(); } catch {}
      wallet = compactWalletState(wallet);
      wallet.updatedAt = Date.now();
      try {
        saveJson(storageKeyFor(uid), wallet);
        localSaved = true;
      } catch (retryError) {
        lastError = retryError;
        if (!isQuotaError(retryError)) throw retryError;
      }
    }
    walletMemory.set(uid, wallet);
    const durablePromise = idbPut(WALLET_STORE, { uid, wallet, updatedAt: wallet.updatedAt })
      .then(() => true)
      .catch(error => {
        if (localSaved) {
          console.warn('JEMMO IndexedDB wallet copy', error);
          return false;
        }
        throw error;
      });
    walletSaveStatus.set(uid, { localSaved, durablePromise, error: lastError });
    return wallet;
  }

  async function waitForWalletPersistence(uid = currentUid()) {
    const status = walletSaveStatus.get(uid);
    if (!status) return true;
    if (status.localSaved) {
      status.durablePromise.catch(() => false);
      return true;
    }
    await status.durablePromise;
    return true;
  }

  function saveWallet(next, source = 'global') {
    const wallet = saveWalletFor(currentUid(), next);
    emit(wallet, source);
    return wallet;
  }

  function pushLedger(wallet, type, label, data = {}) {
    wallet.ledger.unshift({
      id: data.id || nowId('mov'), type, label, ...data,
      createdAt: Number(data.createdAt) || Date.now(), simulation: true
    });
    wallet.ledger = wallet.ledger.slice(0, 400);
  }

  function pushHistory(wallet, item) {
    wallet.history.unshift({
      id: item.id || nowId('W'),
      type: item.type || 'movement',
      title: item.title || 'Movimiento',
      detail: item.detail || '',
      amount: item.amount || '',
      tone: item.tone || 'neutral',
      createdAt: Number(item.createdAt) || Date.now(),
      ...item
    });
    wallet.history = wallet.history.slice(0, 250);
  }

  function toast(text) {
    let node = byId('jw-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'jw-toast';
      node.className = 'jw-toast';
      document.body.append(node);
    }
    node.textContent = text;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 2800);
  }

  function feePercent(settings, method) {
    if (method === 'google') return Number(settings.googleFeePct) || 0;
    if (method === 'card') return Number(settings.cardFeePct) || 0;
    if (method === 'epay') return Number(settings.epayFeePct) || 0;
    return Number(settings.cryptoFeePct) || 0;
  }

  function profileCountry() {
    const profile = readJson(`jemmo_profile_v1_${currentUid()}`, {});
    return String(profile.country || '').toLowerCase();
  }

  const isCuba = () => profileCountry().includes('cuba');

  function consumeLots(wallet, amount) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    const allocations = [];
    wallet.lots.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    for (const lot of wallet.lots) {
      if (remaining <= 0) break;
      const available = Math.max(0, Math.floor(Number(lot.remaining) || 0));
      if (!available) continue;
      const used = Math.min(available, remaining);
      lot.remaining = available - used;
      remaining -= used;
      allocations.push({
        method: lot.method || 'legacy',
        label: lot.label || lot.method || 'Saldo',
        risk: lot.risk || 'confirmed',
        amount: used,
        lotId: lot.id || ''
      });
    }
    wallet.lots = wallet.lots.filter(lot => Number(lot.remaining) > 0);
    return remaining > 0 ? null : allocations;
  }

  function ensureAgency(state, houseId = 'casa-demo', houseName = 'Casa JEMMO Demo') {
    if (!state.agencies[houseId]) {
      state.agencies[houseId] = { id: houseId, name: houseName, confirmed: 0, pending: 0, withdrawn: 0 };
    }
    return state.agencies[houseId];
  }

  function addPendingCredit(wallet, amount, source, label, releaseAt, reference) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (!amount) return;
    wallet.jemsPending += amount;
    wallet.pendingCredits.push({
      id: nowId('pending'), amount, source, label, releaseAt,
      status: 'pending', reference, createdAt: Date.now()
    });
    wallet.earningsHistory.unshift({
      id: nowId('earn'), amount, status: 'pending', source, label, reference, createdAt: Date.now()
    });
  }

  function addConfirmedCredit(wallet, amount, source, label, reference) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (!amount) return;
    wallet.jemsConfirmed += amount;
    wallet.earningsHistory.unshift({
      id: nowId('earn'), amount, status: 'confirmed', source, label, reference, createdAt: Date.now()
    });
  }

  function releasePending(all = false) {
    const uid = currentUid();
    const wallet = getWallet(uid);
    const state = readFinance();
    const now = Date.now();
    let released = 0;
    let financeChanged = false;

    wallet.pendingCredits.forEach(entry => {
      if (entry.status !== 'pending' || (!all && Number(entry.releaseAt) > now)) return;
      entry.status = 'confirmed';
      entry.confirmedAt = now;
      wallet.jemsPending = Math.max(0, wallet.jemsPending - Number(entry.amount || 0));
      wallet.jemsConfirmed += Number(entry.amount || 0);
      released += Number(entry.amount || 0);
      const history = wallet.earningsHistory.find(item => item.reference === entry.reference && item.status === 'pending' && Number(item.amount) === Number(entry.amount));
      if (history) {
        history.status = 'confirmed';
        history.confirmedAt = now;
      }
    });

    state.pendingSystem.forEach(entry => {
      if (entry.status !== 'pending' || (!all && Number(entry.releaseAt) > now)) return;
      entry.status = 'confirmed';
      entry.confirmedAt = now;
      if (entry.app) {
        state.app.pending = Math.max(0, Number(state.app.pending) - Number(entry.app));
        state.app.confirmed += Number(entry.app);
      }
      if (entry.agency && entry.houseId) {
        const agency = ensureAgency(state, entry.houseId, entry.houseName);
        agency.pending = Math.max(0, Number(agency.pending) - Number(entry.agency));
        agency.confirmed += Number(entry.agency);
      }
      financeChanged = true;
    });

    if (released) {
      pushLedger(wallet, 'confirm', 'JEMS confirmados', { amountJems: released, status: 'confirmed' });
      pushHistory(wallet, {
        type: 'gift-received', title: 'JEMS confirmados',
        detail: 'Ganancias pendientes liberadas', amount: `+${formatNumber(released)} JEMS`, tone: 'positive'
      });
      auditFinance(state, 'confirm', 'Liberación de JEMS pendientes', { amountJems: released, all });
      financeChanged = true;
    }

    if (financeChanged) writeFinance(state);
    if (released) saveWallet(wallet, 'confirm-pending');
    return released;
  }

  function registerRecharge({ method, usd, jemmos, bonus = 0, network = '' }) {
    const info = METHOD_INFO[method];
    usd = Math.max(0, Number(usd) || 0);
    jemmos = Math.max(0, Math.floor(Number(jemmos) || 0));
    if (!info || !usd || !jemmos) return { ok: false, reason: 'invalid' };
    if (method === 'google' && isCuba()) return { ok: false, reason: 'country' };

    const uid = currentUid();
    const previousWallet = getWallet(uid);
    const previousFinance = readFinance();
    const state = normalizeFinance(previousFinance);
    const settings = state.settings;
    const commission = usd * feePercent(settings, method) / 100;
    const net = Math.max(0, usd - commission);
    const operationId = nowId('recharge');
    const createdAt = Date.now();
    const settlement = info.risk === 'confirmed' ? 'received' : 'pending';
    const wallet = normalizeWallet(previousWallet);

    wallet.jemmos += jemmos;
    wallet.coins = wallet.jemmos;
    wallet.lots.push({
      id: operationId, method, label: info.name, risk: info.risk,
      remaining: jemmos, initialJemmos: jemmos, usd, bonus,
      commission, net, settlement, createdAt, network, simulation: true
    });
    pushHistory(wallet, {
      id: operationId,
      type: 'recharge',
      title: `Recarga ${info.name}`,
      detail: `${network ? `${network} · ` : ''}${formatMoney(usd)} · registrada en JEMMO Finanzas`,
      amount: `+${formatNumber(jemmos)} JEMMOS`,
      amountJemmos: jemmos,
      tone: 'positive', createdAt
    });
    pushLedger(wallet, 'recharge', `Recarga ${info.name}`, {
      id: operationId, operationId, amountJemmos: jemmos, usd, method,
      methodName: info.name, network, bonus, commission, net,
      status: 'confirmed', settlement, createdAt
    });

    state.cash.gross += usd;
    state.cash.fees += commission;
    if (settlement === 'received') state.cash.received += net;
    else state.cash.pending += net;
    state.recharges.unshift({
      id: operationId, userId: currentUid(), method, methodName: info.name,
      network, usd, jemmos, bonus, commission, net, settlement,
      createdAt, simulation: true
    });
    state.recharges = state.recharges.slice(0, 500);
    auditFinance(state, 'recharge', `Recarga simulada por ${info.name}`, {
      operationId, usd, jemmos, commission, net, network, settlement
    });

    let saved;
    try {
      // El saldo se guarda primero. Un fallo de espacio en Finanzas ya no anula la recarga.
      saved = saveWallet(wallet, 'recharge');
    } catch (error) {
      console.error('JEMMO recharge wallet save', error);
      return { ok: false, reason: isQuotaError(error) ? 'storage' : 'save', error };
    }

    let financeSaved = true;
    try {
      writeFinance(state);
    } catch (error) {
      financeSaved = false;
      console.error('JEMMO recharge finance save', error);
    }
    const persistence = waitForWalletPersistence(uid);
    const rollback = () => {
      const restoredWallet = normalizeWallet(previousWallet);
      const restoredFinance = normalizeFinance(previousFinance);
      walletMemory.set(uid, restoredWallet);
      financeMemory = restoredFinance;
      emit(restoredWallet, 'recharge-rollback');
    };
    return { ok: true, wallet: saved, operationId, commission, net, settlement, financeSaved, persistence, rollback };
  }

  function addCoins(amount, meta = {}) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (!amount) return getWallet();
    if (METHOD_INFO[meta.method] && Number(meta.usd) > 0) {
      return registerRecharge({
        method: meta.method,
        usd: Number(meta.usd),
        jemmos: amount,
        bonus: Number(meta.bonus) || 0,
        network: meta.network || ''
      }).wallet || getWallet();
    }
    const wallet = getWallet();
    const operationId = nowId(meta.type || 'credit');
    wallet.jemmos += amount;
    wallet.coins = wallet.jemmos;
    wallet.lots.push({
      id: operationId,
      method: meta.method || 'promotion',
      label: meta.detail || meta.title || 'Crédito de prueba',
      risk: 'confirmed', initialJemmos: amount, remaining: amount,
      createdAt: Date.now(), simulation: true
    });
    pushHistory(wallet, {
      id: operationId, type: meta.type || 'adjustment',
      title: meta.title || 'JEMMOS añadidos',
      detail: meta.detail || 'Crédito interno de prueba',
      amount: `+${formatNumber(amount)} JEMMOS`, amountJemmos: amount, tone: 'positive'
    });
    pushLedger(wallet, meta.type || 'adjustment', meta.title || 'JEMMOS añadidos', {
      id: operationId, operationId, amountJemmos: amount,
      method: meta.method || 'promotion', status: 'confirmed'
    });
    return saveWallet(wallet, meta.source || 'add-jemmos');
  }

  function spendCoins(amount, meta = {}) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    const senderUid = currentUid();
    const wallet = getWallet(senderUid);
    if (!amount || wallet.jemmos < amount) {
      return { ok: false, wallet, missing: Math.max(0, amount - wallet.jemmos) };
    }

    const allocations = consumeLots(wallet, amount);
    if (!allocations) return { ok: false, wallet, missing: amount };
    wallet.jemmos -= amount;
    wallet.coins = wallet.jemmos;

    const state = readFinance();
    const settings = state.settings;
    const recipientUid = String(meta.recipientUid || senderUid);
    const member = state.membership[recipientUid] || { hasHouse: false, houseId: '', houseName: '' };
    const pendingSpent = allocations.filter(item => item.risk === 'reversible').reduce((sum, item) => sum + item.amount, 0);
    const pendingRatio = amount ? pendingSpent / amount : 0;
    const hostTotal = Math.floor(amount * Number(settings.hostPct || 70) / 100);
    const agencyTotal = member.hasHouse ? Math.floor(amount * Number(settings.agencyPct || 10) / 100) : 0;
    const appTotal = amount - hostTotal - agencyTotal;
    const hostPending = Math.round(hostTotal * pendingRatio);
    const hostConfirmed = hostTotal - hostPending;
    const appPending = Math.round(appTotal * pendingRatio);
    const appConfirmed = appTotal - appPending;
    const agencyPending = Math.round(agencyTotal * pendingRatio);
    const agencyConfirmed = agencyTotal - agencyPending;
    const operationId = nowId('gift');
    const releaseAt = Date.now() + Math.max(0, Number(settings.confirmationHours) || 0) * 3600000;
    const giftName = String(meta.giftName || meta.title || 'Regalo JEMMO').replace(/^Regalo enviado(?: en .*)?$/i, 'Regalo JEMMO');
    const context = String(meta.context || meta.source || 'Regalo');
    const reference = String(meta.reference || meta.detail || '');
    const recipient = recipientUid === senderUid ? wallet : getWallet(recipientUid);

    if (hostConfirmed) addConfirmedCredit(recipient, hostConfirmed, 'gift', giftName, operationId);
    if (hostPending) addPendingCredit(recipient, hostPending, 'gift', giftName, releaseAt, operationId);

    pushHistory(wallet, {
      id: operationId,
      type: 'gift', title: meta.title || 'Regalo enviado',
      detail: `${meta.detail || giftName} · reparto registrado`,
      amount: `-${formatNumber(amount)} JEMMOS`, amountJemmos: -amount,
      tone: 'negative'
    });
    pushLedger(wallet, 'gift_sent', meta.title || 'Regalo enviado', {
      id: operationId, operationId, amountJemmos: -amount,
      context, reference, allocations, recipientUid, giftName,
      hostTotal, appTotal, agencyTotal, status: 'confirmed'
    });

    pushHistory(recipient, {
      id: `${operationId}_income`,
      type: 'gift-received', title: `${giftName} recibido`,
      detail: hostPending ? `${formatNumber(hostConfirmed)} confirmados · ${formatNumber(hostPending)} pendientes` : 'Ganancia confirmada por regalo',
      amount: `+${formatNumber(hostTotal)} JEMS`, amountJems: hostTotal,
      tone: 'positive'
    });
    pushLedger(recipient, 'gift_received', `${giftName} recibido`, {
      id: `${operationId}_income`, operationId, amountJems: hostTotal,
      confirmed: hostConfirmed, pending: hostPending,
      context, reference, status: hostPending ? 'pending' : 'confirmed'
    });

    state.app.confirmed += appConfirmed;
    state.app.pending += appPending;
    if (member.hasHouse) {
      const agency = ensureAgency(state, member.houseId, member.houseName);
      agency.confirmed += agencyConfirmed;
      agency.pending += agencyPending;
    }
    if (appPending || agencyPending) {
      state.pendingSystem.push({
        id: operationId, status: 'pending', releaseAt,
        app: appPending, agency: agencyPending,
        houseId: member.houseId, houseName: member.houseName
      });
    }
    state.gifts.unshift({
      id: operationId, senderUid, recipientUid, context, reference, giftName,
      total: amount, hostTotal, hostConfirmed, hostPending,
      appTotal, appConfirmed, appPending,
      agencyTotal, agencyConfirmed, agencyPending,
      hasHouse: Boolean(member.hasHouse), houseId: member.houseId || '', houseName: member.houseName || '',
      sourceMethods: allocations, createdAt: Date.now(), simulation: true
    });
    state.gifts = state.gifts.slice(0, 600);
    auditFinance(state, 'gift', `${giftName} repartido`, {
      operationId, total: amount, hostTotal, appTotal, agencyTotal,
      hostPending, appPending, agencyPending, hasHouse: Boolean(member.hasHouse), context
    });

    if (recipientUid !== senderUid) saveWalletFor(recipientUid, recipient);
    writeFinance(state);
    const saved = saveWallet(wallet, meta.source || 'gift');
    return {
      ok: true, wallet: saved, operationId,
      hostTotal, hostConfirmed, hostPending,
      appTotal, agencyTotal, hasHouse: Boolean(member.hasHouse)
    };
  }

  function addJems(amount, meta = {}) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (!amount) return getWallet();
    const wallet = getWallet();
    wallet.jemsConfirmed += amount;
    wallet.jems = wallet.jemsConfirmed + wallet.jemsPending;
    wallet.earnings = wallet.jems;
    pushHistory(wallet, {
      type: meta.type || 'gift-received', title: meta.title || 'JEMS añadidos',
      detail: meta.detail || 'Ganancia confirmada', amount: `+${formatNumber(amount)} JEMS`,
      amountJems: amount, tone: 'positive'
    });
    pushLedger(wallet, meta.type || 'gift-received', meta.title || 'JEMS añadidos', {
      amountJems: amount, detail: meta.detail || '', status: 'confirmed'
    });
    return saveWallet(wallet, meta.source || 'add-jems');
  }

  function addCrystals(amount, meta = {}) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (!amount) return getWallet();
    const wallet = getWallet();
    wallet.crystals += amount;
    wallet.diamonds = wallet.crystals;
    pushHistory(wallet, {
      type: meta.type || 'crystals', title: meta.title || 'Cristales añadidos',
      detail: meta.detail || 'Saldo para juegos y minijuegos',
      amount: `+${formatNumber(amount)} CRISTALES`, amountCrystals: amount, tone: 'positive'
    });
    pushLedger(wallet, meta.type || 'crystals', meta.title || 'Cristales añadidos', {
      amountCrystals: amount, detail: meta.detail || ''
    });
    return saveWallet(wallet, meta.source || 'add-crystals');
  }

  function movement(type, title, detail, amount, tone = 'neutral') {
    const wallet = getWallet();
    pushHistory(wallet, { type, title, detail, amount: String(amount || ''), tone });
    pushLedger(wallet, type, title, { detail, amountText: String(amount || '') });
    return saveWallet(wallet, type);
  }

  function exchangeCalculation() {
    const type = byId('jw-exchange-type')?.value;
    const requested = Math.floor(Number(byId('jw-exchange-amount')?.value) || 0);
    const wallet = getWallet();
    if (requested <= 0) return { valid: false, message: 'Escribe una cantidad para calcular el resultado.' };
    if (type === 'jemmos-crystals') {
      const output = Math.floor(requested / 10);
      const used = output * 10;
      if (output < 1) return { valid: false, message: 'Se necesitan al menos 10 JEMMOS.' };
      return {
        valid: wallet.jemmos >= used, input: used, output, type,
        message: `Recibirás <b>${formatNumber(output)} CRISTALES</b> usando ${formatNumber(used)} JEMMOS.${wallet.jemmos < used ? ' Saldo insuficiente.' : ''}`
      };
    }
    if (type === 'crystals-jemmos') {
      return {
        valid: wallet.crystals >= requested, input: requested, output: requested * 10, type,
        message: `Recibirás <b>${formatNumber(requested * 10)} JEMMOS</b> usando ${formatNumber(requested)} CRISTALES.${wallet.crystals < requested ? ' Saldo insuficiente.' : ''}`
      };
    }
    return {
      valid: wallet.jemsConfirmed >= requested, input: requested, output: requested * 10, type,
      message: `Recibirás <b>${formatNumber(requested * 10)} JEMMOS</b> usando ${formatNumber(requested)} JEMS confirmados.${wallet.jemsConfirmed < requested ? ' Saldo insuficiente.' : ''}`
    };
  }

  function executeExchange() {
    const result = exchangeCalculation();
    if (!result.valid) return toast('Revisa la cantidad o el saldo.');
    const wallet = getWallet();
    const operationId = nowId('exchange');
    if (result.type === 'jemmos-crystals') {
      const allocations = consumeLots(wallet, result.input);
      if (!allocations) return toast('No se pudo usar el saldo seleccionado.');
      wallet.jemmos -= result.input;
      wallet.crystals += result.output;
      pushHistory(wallet, {
        id: operationId, type: 'exchange', title: 'Cambio a CRISTALES',
        detail: `${formatNumber(result.input)} JEMMOS → ${formatNumber(result.output)} CRISTALES`,
        amount: `+${formatNumber(result.output)} CRISTALES`, tone: 'positive'
      });
      pushLedger(wallet, 'exchange', 'Cambio a CRISTALES', { id: operationId, operationId, allocations, amountJemmos: -result.input, amountCrystals: result.output });
    } else if (result.type === 'crystals-jemmos') {
      wallet.crystals -= result.input;
      wallet.jemmos += result.output;
      wallet.lots.push({ id: operationId, method: 'exchange', label: 'Cambio desde CRISTALES', risk: 'confirmed', initialJemmos: result.output, remaining: result.output, createdAt: Date.now() });
      pushHistory(wallet, {
        id: operationId, type: 'exchange', title: 'Cambio a JEMMOS',
        detail: `${formatNumber(result.input)} CRISTALES → ${formatNumber(result.output)} JEMMOS`,
        amount: `+${formatNumber(result.output)} JEMMOS`, tone: 'positive'
      });
      pushLedger(wallet, 'exchange', 'Cambio a JEMMOS', { id: operationId, operationId, amountCrystals: -result.input, amountJemmos: result.output });
    } else {
      wallet.jemsConfirmed -= result.input;
      wallet.jemmos += result.output;
      wallet.lots.push({ id: operationId, method: 'exchange', label: 'Cambio desde JEMS', risk: 'confirmed', initialJemmos: result.output, remaining: result.output, createdAt: Date.now() });
      pushHistory(wallet, {
        id: operationId, type: 'exchange', title: 'JEMS cambiados a JEMMOS',
        detail: `${formatNumber(result.input)} JEMS → ${formatNumber(result.output)} JEMMOS`,
        amount: `+${formatNumber(result.output)} JEMMOS`, tone: 'positive'
      });
      pushLedger(wallet, 'exchange', 'JEMS cambiados a JEMMOS', { id: operationId, operationId, amountJems: -result.input, amountJemmos: result.output });
    }
    wallet.coins = wallet.jemmos;
    wallet.diamonds = wallet.crystals;
    wallet.jems = wallet.jemsConfirmed + wallet.jemsPending;
    wallet.earnings = wallet.jems;
    const state = readFinance();
    auditFinance(state, 'exchange', 'Cambio interno del monedero', { operationId, type: result.type, input: result.input, output: result.output });
    writeFinance(state);
    saveWallet(wallet, 'exchange');
    byId('jw-exchange-amount').value = '';
    render();
    toast('Cambio realizado en modo de pruebas.');
  }

  function withdrawalPreview() {
    const wallet = getWallet();
    const state = readFinance();
    const settings = state.settings;
    const amount = Math.max(0, Math.floor(Number(byId('jw-withdraw-amount')?.value) || 0));
    const methodKey = byId('jw-withdraw-method')?.value || 'binance_bep20';
    const method = WITHDRAW_METHODS[methodKey];
    const gross = amount / Number(settings.jemsPerUsd || 10000);
    const fee = Math.min(gross, Number(settings[method.setting]) || 0);
    const net = Math.max(0, gross - fee);
    const valid = amount >= Number(settings.minimumWithdrawJems || 100000) && amount <= wallet.jemsConfirmed;
    return { amount, methodKey, method, gross, fee, net, valid, settings };
  }

  function updateWithdrawPreview() {
    const box = byId('jw-withdraw-preview');
    const button = byId('jw-withdraw-confirm');
    if (!box || !button) return;
    const result = withdrawalPreview();
    box.innerHTML = `Solicitas <b>${formatMoney(result.gross)}</b> · comisión <b>${formatMoney(result.fee)}</b><br>Recibirás <b>${formatMoney(result.net)}</b> por ${escapeHtml(result.method.name)}.<br>Mínimo: <b>${formatNumber(result.settings.minimumWithdrawJems)} JEMS</b>.`;
    button.disabled = !result.valid;
  }

  function executeWithdrawal() {
    releasePending(false);
    const result = withdrawalPreview();
    const address = String(byId('jw-withdraw-address')?.value || '').trim();
    const wallet = getWallet();
    const state = readFinance();
    if (result.amount < result.settings.minimumWithdrawJems) return toast(`El mínimo es ${formatNumber(result.settings.minimumWithdrawJems)} JEMS.`);
    if (result.amount > wallet.jemsConfirmed) return toast('No tienes suficientes JEMS confirmados.');
    if (address.length < 5) return toast('Escribe una dirección o identificador válido.');
    const expenses = state.expenses.reduce((sum, item) => sum + Number(item.usd || 0), 0);
    const availableCash = Number(state.cash.received) - Number(state.cash.paidOut) - expenses;
    if (availableCash < result.gross) return toast('JEMMO Finanzas no tiene saldo recibido suficiente. Liquida primero las recargas pendientes.');
    if (!confirm(`RETIRADA SIMULADA\n\nSolicitado: ${formatMoney(result.gross)}\nComisión: ${formatMoney(result.fee)}\nRecibirás: ${formatMoney(result.net)}\nMétodo: ${result.method.name}\n\n¿Confirmar?`)) return;

    const operationId = nowId('withdraw');
    const masked = address.length > 10 ? `${address.slice(0, 4)}••••${address.slice(-4)}` : address;
    wallet.jemsConfirmed -= result.amount;
    wallet.jemsWithdrawn += result.amount;
    wallet.jems = wallet.jemsConfirmed + wallet.jemsPending;
    wallet.earnings = wallet.jems;
    wallet.withdrawals.unshift({
      id: operationId, amountJems: result.amount, grossUsd: result.gross,
      feeUsd: result.fee, netUsd: result.net, method: result.methodKey,
      methodName: result.method.name, addressMasked: masked,
      status: 'paid', createdAt: Date.now(), simulation: true
    });
    pushHistory(wallet, {
      id: operationId, type: 'withdraw', title: 'Retirada de JEMS',
      detail: `${result.method.name} · ${masked} · registrada en JEMMO Finanzas`,
      amount: `-${formatNumber(result.amount)} JEMS`, tone: 'negative'
    });
    pushLedger(wallet, 'withdrawal', 'Retirada completada', {
      id: operationId, operationId, amountJems: -result.amount,
      grossUsd: result.gross, feeUsd: result.fee, netUsd: result.net,
      method: result.method.name, status: 'paid'
    });

    state.cash.paidOut += result.gross;
    state.withdrawals.unshift({
      id: operationId, userId: currentUid(), amountJems: result.amount,
      grossUsd: result.gross, feeUsd: result.fee, netUsd: result.net,
      method: result.methodKey, methodName: result.method.name,
      addressMasked: masked, status: 'paid', requestedAt: Date.now(),
      paidAt: Date.now(), simulation: true
    });
    state.withdrawals = state.withdrawals.slice(0, 400);
    auditFinance(state, 'withdrawal', 'Retirada simulada pagada', {
      operationId, amountJems: result.amount, grossUsd: result.gross,
      feeUsd: result.fee, netUsd: result.net, method: result.method.name
    });
    writeFinance(state);
    saveWallet(wallet, 'withdrawal');
    byId('jw-withdraw-address').value = '';
    render();
    toast(`Retirada registrada: ${formatMoney(result.net)} netos.`);
  }

  function injectStyles() {
    if (byId('jemmo-wallet-global-style')) return;
    const style = document.createElement('style');
    style.id = 'jemmo-wallet-global-style';
    style.textContent = `
      :root{--jw-gold:#ffd34e;--jw-purple:#bd3cff;--jw-green:#51dfa0;--jw-muted:#b9a9c0}
      .jw-backdrop{position:fixed;inset:0;z-index:2147483000;background:#030004dc;backdrop-filter:blur(6px)}
      .jw-sheet{position:fixed;z-index:2147483001;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,520px);height:min(94svh,820px);padding:14px 14px calc(18px + env(safe-area-inset-bottom,0px));border:1px solid #7a2c92;border-radius:26px 26px 0 0;background:radial-gradient(circle at 76% 0,#4e0862 0,#1b0325 28%,#09000d 72%);color:#fff;box-shadow:0 -24px 70px #000;overflow:auto;overscroll-behavior:contain;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
      .jw-sheet[hidden],.jw-backdrop[hidden]{display:none!important}.jw-head{position:sticky;top:-14px;z-index:3;display:flex;align-items:center;gap:10px;margin:-14px -14px 12px;padding:calc(14px + env(safe-area-inset-top,0px)) 14px 12px;background:linear-gradient(180deg,#24052ff8,#17021ff2);border-bottom:1px solid #5d2170;backdrop-filter:blur(16px)}
      .jw-head-copy{min-width:0;flex:1}.jw-head-copy small{display:block;color:var(--jw-gold);font-size:8px;font-weight:1000;letter-spacing:.14em}.jw-head-copy strong{display:block;margin-top:2px;font-size:21px}.jw-head-copy span{display:block;margin-top:2px;color:#bdafc2;font-size:9px}.jw-close{width:40px;height:40px;flex:0 0 40px;border:1px solid #74328a;border-radius:13px;background:#25062e;color:#fff;font-size:25px}
      .jw-test{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;padding:7px 9px;border:1px solid #9a7024;border-radius:13px;background:#2a1806;color:#ffe292;font-size:8px;font-weight:1000}.jw-test span:last-child{color:#d9c58d;font-size:7px}
      .jw-balances{display:grid;grid-template-columns:1fr 1fr;gap:8px}.jw-balance{min-height:88px;padding:12px;border:1px solid #653078;border-radius:18px;background:linear-gradient(150deg,#260731,#100116);box-shadow:inset 0 0 24px #bb35ff12}.jw-balance.coins{border-color:#8d6b22;background:linear-gradient(150deg,#3c2808,#171006)}.jw-balance.earnings{grid-column:1/-1;min-height:76px;background:linear-gradient(150deg,#103125,#08150f);border-color:#276b4d}.jw-balance small{display:flex;align-items:center;gap:5px;color:#c9bacd;font-size:8px;font-weight:900}.jw-balance b{display:block;margin-top:7px;font-size:25px;line-height:1}.jw-balance.coins b{color:var(--jw-gold)}.jw-balance.diamonds b{color:#df7bff}.jw-balance.earnings b{color:#62e6a1}.jw-balance em{display:block;margin-top:6px;color:#9f91a5;font-size:8px;font-style:normal;line-height:1.35}
      .jw-tabs{display:flex;gap:7px;margin:12px -2px 10px;padding:2px;overflow-x:auto;scrollbar-width:none}.jw-tabs::-webkit-scrollbar{display:none}.jw-tab{flex:0 0 auto;min-height:36px;padding:0 12px;border:1px solid #572769;border-radius:999px;background:#14031b;color:#bfaec6;font-size:8px;font-weight:1000}.jw-tab.active{border-color:var(--jw-gold);background:linear-gradient(135deg,#5c3d08,#2a1204);color:#ffe28b;box-shadow:0 0 15px #ffd34e2a}
      .jw-view{display:grid;gap:10px}.jw-view[hidden]{display:none!important}.jw-card{padding:13px;border:1px solid #542267;border-radius:18px;background:#110117d9}.jw-card h3{margin:0;font-size:14px}.jw-card>p{margin:5px 0 0;color:#ad9eb3;font-size:9px;line-height:1.45}.jw-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.jw-shortcut{min-height:68px;padding:8px 5px;border:1px solid #643078;border-radius:15px;background:#1b0524;color:#fff;font-size:9px;font-weight:950}.jw-shortcut span{display:block;margin-bottom:4px;font-size:22px}.jw-shortcut.gold{border-color:#8b6721;background:#2d1d06;color:#ffe18a}
      .jw-methods{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.jw-method-choice{min-height:70px;padding:10px;border:1px solid #5c286c;border-radius:15px;background:#13021a;color:#fff;text-align:left}.jw-method-choice.active{border-color:#ffd34e;background:linear-gradient(145deg,#3a2708,#180d03);box-shadow:0 0 15px #ffd34e22}.jw-method-choice:disabled{opacity:.45}.jw-method-choice b{display:block;font-size:10px}.jw-method-choice small{display:block;margin-top:5px;color:#a898ae;font-size:7.5px;line-height:1.35}.jw-method-choice.active small{color:#dac895}
      .jw-packages{display:grid;grid-template-columns:1fr 1fr;gap:9px}.jw-package{min-height:82px;padding:10px;border:1px solid #7b5b1e;border-radius:17px;background:radial-gradient(circle at 80% 10%,#ffcf4730,transparent 36%),linear-gradient(150deg,#3b2607,#170d03);color:#fff;text-align:left}.jw-package strong{display:block;color:var(--jw-gold);font-size:18px}.jw-package small{display:block;margin-top:5px;color:#d6c298;font-size:8px}.jw-package span{display:inline-block;margin-top:8px;padding:4px 7px;border-radius:999px;background:var(--jw-gold);color:#2b1703;font-size:7px;font-weight:1000}
      .jw-field{display:grid;gap:6px}.jw-field>span{color:#e6dbe9;font-size:9px;font-weight:900}.jw-field input,.jw-field select{width:100%;min-height:45px;border:1px solid #5c2a6d;border-radius:13px;background:#09000d;color:#fff;padding:0 12px;outline:none}.jw-field input:focus,.jw-field select:focus{border-color:var(--jw-gold);box-shadow:0 0 0 3px #ffd34e1d}.jw-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.jw-preview{padding:11px;border:1px dashed #6c377d;border-radius:14px;background:#0b010f;color:#bfaec5;font-size:9px;line-height:1.5}.jw-preview b{color:#ffe17c}.jw-primary{width:100%;min-height:47px;border:0;border-radius:14px;background:linear-gradient(90deg,var(--jw-gold),#d63aff);color:#1c031f;font-weight:1000}.jw-primary:disabled{opacity:.45}.jw-secondary{width:100%;min-height:42px;border:1px solid #673079;border-radius:13px;background:#210529;color:#fff;font-weight:900}.jw-note{padding:10px;border:1px solid #6e5320;border-radius:13px;background:#251706;color:#dbc991;font-size:8px;line-height:1.45}.jw-receipt{padding:11px;border:1px solid #2f7653;border-radius:14px;background:#0b291d}.jw-receipt[hidden]{display:none!important}.jw-receipt small{display:block;color:#8fd5ae;font-size:7px;font-weight:1000}.jw-receipt b{display:block;margin-top:5px;color:#65e8a2;font-size:11px}.jw-receipt span{display:block;margin-top:4px;color:#a5c9b5;font-size:8px;line-height:1.4}
      .jw-history{display:grid;gap:8px}.jw-empty{padding:24px 12px;border:1px dashed #50305a;border-radius:16px;color:#8f8095;text-align:center;font-size:9px}.jw-movement{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px;border:1px solid #482057;border-radius:14px;background:#0d0112}.jw-movement-icon{width:36px;height:36px;border-radius:12px;background:#2b0736;display:grid;place-items:center;font-size:18px}.jw-movement-copy{min-width:0}.jw-movement-copy b{display:block;font-size:9.5px}.jw-movement-copy small{display:block;margin-top:3px;color:#94869a;font-size:7.5px;line-height:1.35}.jw-movement-amount{text-align:right;font-size:9px;font-weight:1000;white-space:nowrap}.jw-movement-amount.positive{color:#62e6a1}.jw-movement-amount.negative{color:#ff8fa4}.jw-movement-amount.neutral{color:#ffe17b}.jw-rate{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border:1px solid #482057;border-radius:13px;background:#0d0112;color:#a99bad;font-size:8px}.jw-rate b{color:#ffe17b}.jw-toast{position:fixed;z-index:2147483647;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);width:max-content;max-width:calc(100% - 32px);padding:10px 13px;border:1px solid #815f23;border-radius:999px;background:#1c1004;color:#ffe494;font:900 9px/1.35 Inter,system-ui,sans-serif;text-align:center;opacity:0;pointer-events:none;transition:.2s}.jw-toast.show{opacity:1;transform:translate(-50%,0)}
      .jw-confirm-backdrop{position:fixed;inset:0;z-index:2147483002;background:#020003d9;backdrop-filter:blur(8px)}.jw-confirm-backdrop[hidden],.jw-confirm-dialog[hidden]{display:none!important}.jw-confirm-dialog{position:fixed;z-index:2147483003;left:50%;top:50%;transform:translate(-50%,-50%);width:min(calc(100% - 30px),390px);padding:18px;border:1px solid #9b7427;border-radius:22px;background:radial-gradient(circle at 80% 0,#5a3b0d 0,#210c05 28%,#0b010e 72%);color:#fff;box-shadow:0 24px 80px #000;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}.jw-confirm-dialog small{display:block;color:#ffd34e;font-size:8px;font-weight:1000;letter-spacing:.12em}.jw-confirm-dialog h3{margin:7px 0 0;font-size:20px}.jw-confirm-dialog p{margin:8px 0 0;color:#d2c4d6;font-size:10px;line-height:1.5}.jw-confirm-summary{display:grid;gap:7px;margin-top:13px;padding:12px;border:1px solid #634a1d;border-radius:15px;background:#120804}.jw-confirm-summary span{display:flex;justify-content:space-between;gap:12px;color:#b9a9bd;font-size:9px}.jw-confirm-summary b{color:#ffe28a;text-align:right}.jw-confirm-actions{display:grid;grid-template-columns:1fr 1.25fr;gap:8px;margin-top:14px}.jw-confirm-actions button{min-height:46px;border-radius:14px;font-weight:1000}.jw-confirm-cancel{border:1px solid #653078;background:#1d0525;color:#fff}.jw-confirm-accept{border:0;background:linear-gradient(90deg,#ffd34e,#d63aff);color:#1c031f}.jw-confirm-accept:disabled{opacity:.55}
      @media(max-width:380px){.jw-sheet{padding-left:11px;padding-right:11px}.jw-head{margin-left:-11px;margin-right:-11px;padding-left:11px;padding-right:11px}.jw-form-grid{grid-template-columns:1fr}.jw-actions{gap:6px}.jw-shortcut{font-size:8px}.jw-methods{gap:6px}}
    `;
    document.head.append(style);
  }

  function walletMarkup() {
    return `
      <div class="jw-backdrop" id="jw-backdrop" hidden></div>
      <section class="jw-sheet" id="jw-sheet" hidden role="dialog" aria-modal="true" aria-labelledby="jw-title">
        <div class="jw-head"><div class="jw-head-copy"><small>ECONOMÍA JEMMO</small><strong id="jw-title">Monedero y ganancias</strong><span>El mismo saldo en Inicio, LIVE, Salas, Mensajes y Perfil</span></div><button class="jw-close" id="jw-close" type="button" aria-label="Cerrar">×</button></div>
        <div class="jw-test"><span>🧪 MODO DE PRUEBAS · SIN COBROS REALES</span><span>VINCULADO A JEMMO FINANZAS</span></div>
        <div class="jw-balances">
          <article class="jw-balance coins"><small>🪙 JEMMOS</small><b id="jw-jemmos">0</b><em>Moneda recargable para regalos e interacción</em></article>
          <article class="jw-balance diamonds"><small>💗 JEMS</small><b id="jw-jems">0</b><em id="jw-jems-detail">0 confirmados · 0 pendientes</em></article>
          <article class="jw-balance earnings"><small>💎 CRISTALES</small><b id="jw-crystals">0</b><em>Moneda para juegos, ruletas y minijuegos</em></article>
        </div>
        <div class="jw-tabs" role="tablist"><button class="jw-tab active" data-jw-tab="summary">RESUMEN</button><button class="jw-tab" data-jw-tab="recharge">RECARGAR</button><button class="jw-tab" data-jw-tab="exchange">CAMBIAR</button><button class="jw-tab" data-jw-tab="withdraw">RETIRAR</button><button class="jw-tab" data-jw-tab="history">HISTORIAL</button></div>
        <div class="jw-view" data-jw-view="summary">
          <article class="jw-card"><h3>Un monedero para toda la aplicación</h3><p>Las recargas aumentan JEMMOS, los regalos descuentan JEMMOS y crean el reparto financiero, y las retiradas usan únicamente JEMS confirmados.</p><div class="jw-actions"><button class="jw-shortcut gold" data-jw-go="recharge"><span>🪙</span>Recargar</button><button class="jw-shortcut" data-jw-go="exchange"><span>⇄</span>Cambiar</button><button class="jw-shortcut" data-jw-go="withdraw"><span>↗</span>Retirar JEMS</button></div></article>
          <article class="jw-card"><h3>Reglas activas</h3><p>10.000 JEMS = 1 USD · retirada mínima 100.000 JEMS · la comisión de retirada la paga quien retira.</p></article>
          <article class="jw-card"><h3>Últimos movimientos</h3><p>Recargas, regalos, cambios y retiradas quedan guardados por cuenta.</p><div class="jw-history" id="jw-recent"></div></article>
        </div>
        <div class="jw-view" data-jw-view="recharge" hidden>
          <div class="jw-receipt" id="jw-recharge-receipt" hidden><small>ÚLTIMA RECARGA REGISTRADA</small><b id="jw-recharge-receipt-title">—</b><span id="jw-recharge-receipt-copy">—</span></div>
          <article class="jw-card"><h3>Elige el método</h3><p>La operación es ficticia, pero el saldo, la red, la comisión, la fecha y el ingreso se registran como una operación completa de prueba.</p><div class="jw-methods" id="jw-recharge-methods"></div></article>
          <article class="jw-card" id="jw-package-card"><h3 id="jw-package-title">Paquetes</h3><p id="jw-package-copy">Selecciona una recarga.</p><div class="jw-packages" id="jw-recharge-packages"></div></article>
          <article class="jw-card" id="jw-crypto-card" hidden><h3>Recarga cripto simulada</h3><p>Comprueba siempre que la red seleccionada coincide con la red de envío.</p><div class="jw-form-grid"><label class="jw-field"><span>Cantidad</span><input id="jw-crypto-amount" type="number" inputmode="decimal" min="1" step="1" value="10"></label><label class="jw-field"><span>Red</span><select id="jw-crypto-network"></select></label></div><div class="jw-preview" id="jw-crypto-preview"></div><button class="jw-primary" id="jw-crypto-submit" type="button">SIMULAR RECARGA</button></article>
          <p class="jw-note">USDT admite Binance Smart Chain BEP20, TRON TRC20 y Ethereum ERC20. USDC admite Binance BEP20 y Ethereum ERC20. No se mueve dinero real.</p>
        </div>
        <div class="jw-view" data-jw-view="exchange" hidden>
          <article class="jw-card"><h3>Intercambiar monedas internas</h3><p>Los JEMMOS pueden convertirse en CRISTALES. Los JEMS confirmados también pueden convertirse en JEMMOS.</p></article>
          <label class="jw-field"><span>Tipo de cambio</span><select id="jw-exchange-type"><option value="jemmos-crystals">JEMMOS → CRISTALES</option><option value="crystals-jemmos">CRISTALES → JEMMOS</option><option value="jems-jemmos">JEMS → JEMMOS</option></select></label>
          <label class="jw-field"><span id="jw-exchange-label">Cantidad de JEMMOS</span><input id="jw-exchange-amount" type="number" min="1" inputmode="numeric" placeholder="Escribe la cantidad"></label>
          <div class="jw-preview" id="jw-exchange-preview">Escribe una cantidad para calcular el resultado.</div>
          <button class="jw-primary" id="jw-exchange-confirm" type="button" disabled>CONFIRMAR CAMBIO</button>
          <div class="jw-rate"><span>JEMMOS ↔ CRISTALES</span><b>10 = 1</b></div><div class="jw-rate"><span>JEMS → JEMMOS</span><b>1 = 10</b></div>
        </div>
        <div class="jw-view" data-jw-view="withdraw" hidden>
          <article class="jw-card"><h3>Retirar JEMS de prueba</h3><p>Solo se usan JEMS confirmados. La retirada queda registrada en el monedero y en JEMMO Finanzas.</p></article>
          <label class="jw-field"><span>Cantidad de JEMS · disponible <b id="jw-withdraw-available">0</b></span><input id="jw-withdraw-amount" type="number" min="100000" step="10000" inputmode="numeric" value="100000"></label>
          <label class="jw-field"><span>Método de retirada</span><select id="jw-withdraw-method"><option value="binance_bep20">Binance · BEP20</option><option value="usdt_trc20">USDT · TRC20</option><option value="usdc_bep20">USDC · BEP20</option></select></label>
          <label class="jw-field"><span>Dirección o identificador</span><input id="jw-withdraw-address" maxlength="80" placeholder="Dirección de cartera o ID de pago"></label>
          <div class="jw-preview" id="jw-withdraw-preview"></div>
          <button class="jw-primary" id="jw-withdraw-confirm" type="button">CONFIRMAR RETIRADA</button>
          <p class="jw-note">Retirada ficticia: los JEMS bajan, el pago queda anotado y no sale dinero real.</p>
        </div>
        <div class="jw-view" data-jw-view="history" hidden><article class="jw-card"><h3>Historial completo</h3><p>Todos los movimientos de esta cuenta.</p></article><div class="jw-history" id="jw-history"></div></div>
      </section>
      <div class="jw-confirm-backdrop" id="jw-confirm-backdrop" hidden></div>
      <section class="jw-confirm-dialog" id="jw-confirm-dialog" hidden role="dialog" aria-modal="true" aria-labelledby="jw-confirm-title">
        <small>RECARGA DE PRUEBA</small><h3 id="jw-confirm-title">Confirmar recarga</h3><p>Comprueba los datos. Al confirmar, el saldo se actualizará inmediatamente en toda la aplicación.</p>
        <div class="jw-confirm-summary"><span>Método <b id="jw-confirm-method">—</b></span><span>Importe <b id="jw-confirm-usd">—</b></span><span>Recibirás <b id="jw-confirm-jemmos">—</b></span><span id="jw-confirm-network-row" hidden>Red <b id="jw-confirm-network">—</b></span></div>
        <div class="jw-confirm-actions"><button class="jw-confirm-cancel" id="jw-confirm-cancel" type="button">CANCELAR</button><button class="jw-confirm-accept" id="jw-confirm-accept" type="button">CONFIRMAR RECARGA</button></div>
      </section>`;
  }

  function ensureUi() {
    if (byId('jw-sheet')) return true;
    injectStyles();
    const wrap = document.createElement('div');
    wrap.id = 'jemmo-wallet-global-root';
    wrap.innerHTML = walletMarkup();
    document.body.append(wrap);
    bindUi();
    render();
    return true;
  }

  function iconFor(type) {
    return ({
      recharge: '🪙', gift: '🎁', gift_sent: '🎁', gift_received: '💗',
      'gift-received': '💗', exchange: '⇄', withdraw: '↗', withdrawal: '↗',
      method: '⚙️', adjustment: '✦', crystals: '💎', confirm: '✓'
    }[type] || '•');
  }

  function movementNode(item) {
    const row = document.createElement('article');
    row.className = 'jw-movement';
    row.innerHTML = '<span class="jw-movement-icon"></span><span class="jw-movement-copy"><b></b><small></small></span><span class="jw-movement-amount"></span>';
    row.querySelector('.jw-movement-icon').textContent = iconFor(item.type);
    row.querySelector('.jw-movement-copy b').textContent = item.title || 'Movimiento';
    row.querySelector('.jw-movement-copy small').textContent = `${item.detail || ''} · ${formatDate(item.createdAt)}`;
    const amount = row.querySelector('.jw-movement-amount');
    amount.textContent = item.amount || '';
    amount.classList.add(item.tone || 'neutral');
    return row;
  }

  function renderHistory(target, limit) {
    if (!target) return;
    target.replaceChildren();
    const list = getWallet().history.slice(0, limit || 150);
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'jw-empty';
      empty.textContent = 'Todavía no hay movimientos en este monedero.';
      target.append(empty);
      return;
    }
    list.forEach(item => target.append(movementNode(item)));
  }

  let rechargeMethod = isCuba() ? 'card' : 'google';

  function renderRechargeMethods() {
    const methods = byId('jw-recharge-methods');
    if (!methods) return;
    methods.innerHTML = Object.entries(METHOD_INFO).map(([key, info]) => `
      <button class="jw-method-choice ${rechargeMethod === key ? 'active' : ''}" type="button" data-jw-method="${key}" ${key === 'google' && isCuba() ? 'disabled' : ''}>
        <b>${info.icon} ${escapeHtml(info.name)}</b><small>${key === 'google' && isCuba() ? 'No disponible para Cuba' : escapeHtml(info.copy)}</small>
      </button>`).join('');

    const crypto = rechargeMethod === 'usdt' || rechargeMethod === 'usdc';
    byId('jw-crypto-card').hidden = !crypto;
    byId('jw-package-card').hidden = crypto;
    if (crypto) {
      const networks = CRYPTO_NETWORKS[rechargeMethod] || [];
      byId('jw-crypto-network').innerHTML = networks.map(network => `<option>${escapeHtml(network)}</option>`).join('');
      updateCryptoPreview();
      return;
    }
    const packages = RECHARGE_PACKAGES[rechargeMethod] || [];
    byId('jw-package-title').textContent = `Paquetes ${METHOD_INFO[rechargeMethod].name}`;
    byId('jw-package-copy').textContent = 'Toca un paquete para revisar y registrar la recarga.';
    byId('jw-recharge-packages').innerHTML = packages.map((pack, index) => `
      <button class="jw-package" type="button" data-jw-package="${index}">
        <strong>${formatNumber(pack.jemmos)}</strong><small>JEMMOS · ${formatMoney(pack.usd)}</small><span>${pack.bonus ? `+${pack.bonus}%` : 'AÑADIR'}</span>
      </button>`).join('');
  }

  function updateCryptoPreview() {
    const amount = Math.max(1, Number(byId('jw-crypto-amount')?.value) || 0);
    const jemmos = Math.floor(amount * 9900);
    const network = byId('jw-crypto-network')?.value || '';
    if (byId('jw-crypto-preview')) {
      byId('jw-crypto-preview').innerHTML = `Enviarás <b>${amount.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${rechargeMethod.toUpperCase()}</b> por <b>${escapeHtml(network)}</b><br>Recibirás <b>${formatNumber(jemmos)} JEMMOS</b>. La red, comisión y fecha quedarán registradas.`;
    }
  }

  let pendingRecharge = null;
  let rechargeBusy = false;

  function closeRechargeConfirmation() {
    pendingRecharge = null;
    rechargeBusy = false;
    if (byId('jw-confirm-backdrop')) byId('jw-confirm-backdrop').hidden = true;
    if (byId('jw-confirm-dialog')) byId('jw-confirm-dialog').hidden = true;
    if (byId('jw-confirm-accept')) {
      byId('jw-confirm-accept').disabled = false;
      byId('jw-confirm-accept').textContent = 'CONFIRMAR RECARGA';
    }
  }

  function requestRechargeConfirmation(data) {
    const info = METHOD_INFO[data?.method];
    const usd = Math.max(0, Number(data?.usd) || 0);
    const jemmos = Math.max(0, Math.floor(Number(data?.jemmos) || 0));
    if (!info || !usd || !jemmos) return toast('No se pudo preparar esta recarga.');
    if (data.method === 'google' && isCuba()) return toast('Google Play no está disponible para Cuba.');
    ensureUi();
    pendingRecharge = { method: data.method, usd, jemmos, bonus: Number(data.bonus) || 0, network: String(data.network || '') };
    byId('jw-confirm-method').textContent = info.name;
    const cryptoCode = data.method === 'usdt' ? 'USDT' : data.method === 'usdc' ? 'USDC' : '';
    byId('jw-confirm-usd').textContent = cryptoCode
      ? `${usd.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cryptoCode}`
      : formatMoney(usd);
    byId('jw-confirm-jemmos').textContent = `${formatNumber(jemmos)} JEMMOS`;
    byId('jw-confirm-network').textContent = pendingRecharge.network || '—';
    byId('jw-confirm-network-row').hidden = !pendingRecharge.network;
    byId('jw-confirm-backdrop').hidden = false;
    byId('jw-confirm-dialog').hidden = false;
  }

  async function confirmPendingRecharge() {
    if (!pendingRecharge || rechargeBusy) return;
    rechargeBusy = true;
    const button = byId('jw-confirm-accept');
    if (button) {
      button.disabled = true;
      button.textContent = 'REGISTRANDO…';
    }
    const data = { ...pendingRecharge };
    const result = registerRecharge(data);
    if (!result.ok) {
      rechargeBusy = false;
      if (button) {
        button.disabled = false;
        button.textContent = 'CONFIRMAR RECARGA';
      }
      return toast('No se pudo registrar la recarga.');
    }
    try {
      await result.persistence;
    } catch (error) {
      console.error('JEMMO durable recharge save', error);
      result.rollback?.();
      rechargeBusy = false;
      if (button) {
        button.disabled = false;
        button.textContent = 'REINTENTAR RECARGA';
      }
      return toast('No se pudo guardar el saldo ni en el respaldo seguro del móvil. Libera espacio del navegador y vuelve a intentarlo.');
    }
    closeRechargeConfirmation();
    render();
    const info = METHOD_INFO[data.method];
    toast(result.financeSaved === false ? `${formatNumber(data.jemmos)} JEMMOS añadidos. El saldo quedó protegido en el respaldo del móvil.` : `${formatNumber(data.jemmos)} JEMMOS añadidos mediante ${info.name}.`);
  }

  function renderRechargeReceipt() {
    const item = readFinance().recharges?.[0];
    const box = byId('jw-recharge-receipt');
    if (!box) return;
    if (!item) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    byId('jw-recharge-receipt-title').textContent = `${item.methodName} · +${formatNumber(item.jemmos)} JEMMOS`;
    byId('jw-recharge-receipt-copy').textContent = `${formatDate(item.createdAt)} · ${item.network ? `${item.network} · ` : ''}${formatMoney(item.usd)} · ${item.settlement === 'received' ? 'INGRESO RECIBIDO' : 'PENDIENTE DE LIQUIDAR'}`;
  }

  function updateExchangePreview() {
    const type = byId('jw-exchange-type')?.value;
    if (!byId('jw-exchange-preview')) return;
    byId('jw-exchange-label').textContent = type === 'jemmos-crystals' ? 'Cantidad de JEMMOS' : type === 'crystals-jemmos' ? 'Cantidad de CRISTALES' : 'Cantidad de JEMS';
    const result = exchangeCalculation();
    byId('jw-exchange-preview').innerHTML = result.message;
    byId('jw-exchange-confirm').disabled = !result.valid;
  }

  function render() {
    if (!byId('jw-sheet')) return;
    const wallet = getWallet();
    byId('jw-jemmos').textContent = formatNumber(wallet.jemmos);
    byId('jw-jems').textContent = formatNumber(wallet.jems);
    byId('jw-crystals').textContent = formatNumber(wallet.crystals);
    byId('jw-jems-detail').textContent = `${formatNumber(wallet.jemsConfirmed)} confirmados · ${formatNumber(wallet.jemsPending)} pendientes`;
    byId('jw-withdraw-available').textContent = formatNumber(wallet.jemsConfirmed);
    renderHistory(byId('jw-recent'), 4);
    renderHistory(byId('jw-history'), 150);
    renderRechargeMethods();
    renderRechargeReceipt();
    updateExchangePreview();
    updateWithdrawPreview();
    syncVisibleBalances(wallet);
  }

  function showTab(name = 'summary') {
    if (!ensureUi()) return;
    document.querySelectorAll('[data-jw-tab]').forEach(button => button.classList.toggle('active', button.dataset.jwTab === name));
    document.querySelectorAll('[data-jw-view]').forEach(view => { view.hidden = view.dataset.jwView !== name; });
    if (name === 'history') renderHistory(byId('jw-history'), 150);
    render();
  }

  let closingFromHistory = false;
  const walletVisible = () => Boolean(byId('jw-sheet') && !byId('jw-sheet').hidden);

  function hideWallet() {
    if (!byId('jw-sheet')) return;
    closeRechargeConfirmation();
    byId('jw-backdrop').hidden = true;
    byId('jw-sheet').hidden = true;
    document.body.style.overflow = document.documentElement.dataset.jwOverflow || '';
  }

  function open(tab = 'summary') {
    releasePending(false);
    if (!ensureUi()) return;
    const wasVisible = walletVisible();
    const legacySheet = byId('walletSheet') || byId('jfWalletSheet');
    if (legacySheet) {
      legacySheet.setAttribute('aria-hidden', 'true');
      legacySheet.hidden = true;
      legacySheet.classList.remove('open', 'active', 'show');
    }
    ['walletBackdrop', 'jfWalletBackdrop'].forEach(id => { if (byId(id)) byId(id).hidden = true; });
    const sideMenu = byId('sideMenu');
    if (sideMenu) {
      sideMenu.classList.remove('open');
      sideMenu.setAttribute('aria-hidden', 'true');
    }
    if (byId('menuBackdrop')) byId('menuBackdrop').hidden = true;
    showTab(tab);
    byId('jw-backdrop').hidden = false;
    byId('jw-sheet').hidden = false;
    document.documentElement.dataset.jwOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    if (!wasVisible && history.state?.jemmoOverlay !== 'wallet') {
      history.pushState({ ...(history.state || {}), jemmoOverlay: 'wallet' }, '');
    }
  }

  function close() {
    if (!walletVisible()) return;
    if (!closingFromHistory && history.state?.jemmoOverlay === 'wallet') {
      history.back();
      return;
    }
    hideWallet();
  }

  function bindUi() {
    byId('jw-close')?.addEventListener('click', close);
    byId('jw-backdrop')?.addEventListener('click', close);
    byId('jw-confirm-cancel')?.addEventListener('click', closeRechargeConfirmation);
    byId('jw-confirm-backdrop')?.addEventListener('click', closeRechargeConfirmation);
    byId('jw-confirm-accept')?.addEventListener('click', confirmPendingRecharge);
    document.querySelectorAll('[data-jw-tab]').forEach(button => button.addEventListener('click', () => showTab(button.dataset.jwTab)));
    document.querySelectorAll('[data-jw-go]').forEach(button => button.addEventListener('click', () => showTab(button.dataset.jwGo)));

    byId('jw-recharge-methods')?.addEventListener('click', event => {
      const button = event.target.closest('[data-jw-method]');
      if (!button || button.disabled) return;
      rechargeMethod = button.dataset.jwMethod;
      renderRechargeMethods();
    });
    byId('jw-recharge-packages')?.addEventListener('click', event => {
      const button = event.target.closest('[data-jw-package]');
      if (!button) return;
      const pack = (RECHARGE_PACKAGES[rechargeMethod] || [])[Number(button.dataset.jwPackage)];
      const info = METHOD_INFO[rechargeMethod];
      if (!pack || !info) return;
      requestRechargeConfirmation({ method: rechargeMethod, ...pack });
    });
    byId('jw-crypto-amount')?.addEventListener('input', updateCryptoPreview);
    byId('jw-crypto-network')?.addEventListener('change', updateCryptoPreview);
    byId('jw-crypto-submit')?.addEventListener('click', () => {
      const amount = Math.max(1, Number(byId('jw-crypto-amount').value) || 0);
      const network = byId('jw-crypto-network').value;
      const jemmos = Math.floor(amount * 9900);
      const info = METHOD_INFO[rechargeMethod];
      if (!info) return toast('Selecciona USDT o USDC.');
      requestRechargeConfirmation({ method: rechargeMethod, usd: amount, jemmos, network });
    });

    byId('jw-exchange-type')?.addEventListener('change', updateExchangePreview);
    byId('jw-exchange-amount')?.addEventListener('input', updateExchangePreview);
    byId('jw-exchange-confirm')?.addEventListener('click', executeExchange);
    byId('jw-withdraw-amount')?.addEventListener('input', updateWithdrawPreview);
    byId('jw-withdraw-method')?.addEventListener('change', updateWithdrawPreview);
    byId('jw-withdraw-confirm')?.addEventListener('click', executeWithdrawal);
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function syncLegacyCurrencyCards(wallet) {
    const values = {
      monedas: { label: 'JEMMOS', value: formatNumber(wallet.jemmos) },
      diamantes: { label: 'JEMS', value: formatNumber(wallet.jems) },
      ganancias: { label: 'CRISTALES', value: formatNumber(wallet.crystals) }
    };
    document.querySelectorAll('small,span,b,strong').forEach(labelNode => {
      if (labelNode.closest('#jw-sheet')) return;
      const raw = (labelNode.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const key = Object.keys(values).find(name => raw === name || raw === `${name}:`);
      if (!key) return;
      const card = labelNode.closest('[class*="wallet"],[class*="coin"],[class*="balance"],button,article,li,section,div');
      if (!card) return;
      const numeric = [...card.querySelectorAll('strong,b,span')].find(node => {
        if (node === labelNode || node.contains(labelNode) || labelNode.contains(node)) return false;
        return /^[-+]?\d[\d.,\s]*(?:€|USD)?$/.test((node.textContent || '').trim());
      });
      setText(labelNode, values[key].label);
      if (numeric) setText(numeric, values[key].value);
    });
  }

  function syncVisibleBalances(wallet = getWallet()) {
    const jemmos = formatNumber(wallet.jemmos);
    const jems = formatNumber(wallet.jems);
    const crystals = formatNumber(wallet.crystals);
    document.querySelectorAll('[data-wallet="jemmos"] strong,[data-jemmo-coins],[data-jemmo-jemmos]').forEach(node => setText(node, jemmos));
    document.querySelectorAll('[data-wallet="jems"] strong,[data-jemmo-diamonds],[data-jemmo-jems]').forEach(node => setText(node, jems));
    document.querySelectorAll('[data-wallet="cristales"] strong,[data-jemmo-earnings],[data-jemmo-crystals]').forEach(node => setText(node, crystals));
    document.querySelectorAll('[data-wallet="jemmos"] small').forEach(node => setText(node, 'JEMMOS'));
    document.querySelectorAll('[data-wallet="jems"] small').forEach(node => setText(node, 'JEMS'));
    document.querySelectorAll('[data-wallet="cristales"] small').forEach(node => setText(node, 'CRISTALES'));
    syncLegacyCurrencyCards(wallet);

    const legacy = byId('walletSheet');
    if (legacy) {
      setText(legacy.querySelector('.wallet-detail.gold strong'), `JEMMOS · ${jemmos}`);
      setText(legacy.querySelector('.wallet-detail.pink strong'), `JEMS · ${jems}`);
      setText(legacy.querySelector('.wallet-detail.blue strong'), `CRISTALES · ${crystals}`);
    }
    const giftBalance = byId('giftBalance');
    if (giftBalance && document.body.dataset.jemmoWalletNativeGifts !== 'true') setText(giftBalance, `Saldo: ${jemmos} JEMMOS`);
    if (byId('balanceLabel')) setText(byId('balanceLabel'), `Saldo: ${jemmos} JEMMOS`);
    if (byId('globalWalletCoins')) setText(byId('globalWalletCoins'), jemmos);
  }

  function shouldOpenWallet(element) {
    if (!element || element.closest('#jw-sheet') || element.closest('[data-open-finance]')) return false;
    if (element.matches('[data-open-wallet],#walletPlus,[data-wallet],[data-action="wallet"]')) return true;
    const label = element.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || '';
    return label.includes('monedero') || label === 'recargar' || label.includes('+ recargar') || label.includes('retirar jems');
  }

  function bindOpeners(root = document) {
    root.querySelectorAll?.('button,a,[data-open-wallet],[data-wallet],[data-action="wallet"]').forEach(element => {
      if (element.dataset.jwBound === '1' || !shouldOpenWallet(element)) return;
      element.dataset.jwBound = '1';
      element.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const requested = String(element.dataset.openWallet || '').toLowerCase();
        const label = element.textContent?.toLowerCase() || '';
        const tab = requested || (label.includes('recarg') ? 'recharge' : label.includes('retir') ? 'withdraw' : 'summary');
        open(['summary', 'recharge', 'exchange', 'withdraw', 'history'].includes(tab) ? tab : 'summary');
      }, true);
    });
  }

  const liveGiftPrices = { rose: 10, fish: 50, crown: 250, rocket: 500, diamond: 900, castle: 1500 };
  const numericText = value => Number(String(value || '').replace(/[^0-9]/g, '')) || 0;

  function giftPrice(button) {
    const direct = Number(button.dataset.cost || button.dataset.price);
    if (direct > 0) return direct;
    const mapped = Number(liveGiftPrices[button.dataset.gift]);
    if (mapped > 0) return mapped;
    const match = (button.textContent || '').replace(/\./g, '').match(/(\d+)\s*(?:JEMMOS|monedas?)?/i);
    return match ? Number(match[1]) : 0;
  }

  const giftName = button => button.querySelector('b')?.textContent?.trim() || button.dataset.gift || 'Regalo';
  const giftIcon = button => button.querySelector('span')?.textContent?.trim() || (/[^a-z0-9_-]/i.test(String(button.dataset.gift || '')) ? String(button.dataset.gift) : '🎁');

  function closeGiftPanels() {
    ['giftSheet', 'giftsSheet'].forEach(id => { if (byId(id)) byId(id).hidden = true; });
    ['liveModalBackdrop', 'liveBackdrop'].forEach(id => { if (byId(id)) byId(id).hidden = true; });
  }

  function updateLiveGiftVisuals(button, price) {
    const name = giftName(button);
    const icon = giftIcon(button);
    const giftCount = byId('giftCount');
    const giftTotal = byId('giftTotal');
    if (giftCount) setText(giftCount, `🎁 ${formatNumber(numericText(giftCount.textContent) + price)}`);
    if (giftTotal) setText(giftTotal, formatNumber(numericText(giftTotal.textContent) + price));
    const burst = byId('giftBurst');
    if (burst) {
      setText(byId('giftBurstIcon'), icon);
      setText(byId('giftBurstText'), `${name} enviado · ${formatNumber(price)} JEMMOS`);
      burst.hidden = false;
      burst.style.animation = 'none';
      void burst.offsetWidth;
      burst.style.animation = '';
      clearTimeout(updateLiveGiftVisuals.timer);
      updateLiveGiftVisuals.timer = setTimeout(() => { burst.hidden = true; }, 1800);
    }
    const chat = byId('liveChat');
    if (chat) {
      const line = document.createElement('div');
      line.className = 'jl-chat-line';
      line.textContent = `Tú enviaste ${icon} ${name} · ${formatNumber(price)} puntos`;
      chat.append(line);
      while (chat.children.length > 6) chat.firstElementChild?.remove();
      chat.scrollTop = chat.scrollHeight;
    }
    const scoreA = byId('scoreA');
    const scoreB = byId('scoreB');
    if (scoreA) {
      const nextA = numericText(scoreA.textContent) + price;
      setText(scoreA, formatNumber(nextA));
      const currentB = numericText(scoreB?.textContent);
      const total = Math.max(1, nextA + currentB);
      const percent = Math.round(nextA / total * 100);
      if (byId('barA')) byId('barA').style.width = `${percent}%`;
      if (byId('barB')) byId('barB').style.width = `${100 - percent}%`;
    }
    closeGiftPanels();
  }

  function installLiveGiftBridge() {
    if (document.body.dataset.jemmoWalletNativeGifts === 'true') return;
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-gift]');
      if (!button || button.closest('#jw-sheet,#walletSheet')) return;
      const price = giftPrice(button);
      if (!price) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const result = spendCoins(price, {
        title: 'Regalo enviado en LIVE', giftName: giftName(button),
        detail: `${giftIcon(button)} ${giftName(button)}`,
        context: 'LIVE', source: 'live-gift'
      });
      if (!result.ok) {
        toast(`Saldo insuficiente. Faltan ${formatNumber(result.missing)} JEMMOS.`);
        open('recharge');
        return;
      }
      updateLiveGiftVisuals(button, price);
      syncVisibleBalances(result.wallet);
      toast(`${giftName(button)} enviado. Reparto guardado en JEMMO Finanzas.`);
    }, true);
  }

  function hydrateActiveState(uid = currentUid(), source = 'boot') {
    return Promise.allSettled([hydrateWalletFromDb(uid), hydrateFinanceFromDb()]).then(() => {
      releasePending(false);
      syncVisibleBalances();
      render();
      return { uid, source };
    });
  }

  function boot() {
    injectStyles();
    try { removeSafeLegacyStorage(); } catch {}
    releasePending(false);
    syncVisibleBalances();
    bindOpeners();
    installLiveGiftBridge();
    hydrateActiveState(currentUid(), 'boot');
    window.addEventListener('jemmo-auth-ready', event => {
      const uid = String(event.detail?.uid || currentUid());
      authenticatedUid = uid;
      hydrateActiveState(uid, 'auth-ready');
    });
    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => { if (node.nodeType === 1) bindOpeners(node); });
      }
      syncVisibleBalances();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('storage', event => {
      if (event.key === storageKey() || event.key === FINANCE_KEY) {
        syncVisibleBalances();
        render();
      }
    });
    window.addEventListener('jemmo-wallet-change', () => render());
    window.addEventListener('pageshow', () => { releasePending(false); syncVisibleBalances(); render(); });
    window.addEventListener('keydown', event => { if (event.key === 'Escape' && walletVisible()) close(); });
    window.addEventListener('popstate', event => {
      if (!walletVisible()) return;
      closingFromHistory = true;
      hideWallet();
      closingFromHistory = false;
      event.stopImmediatePropagation();
    }, true);
  }

  window.JemmoWallet = Object.freeze({
    version: VERSION,
    key: storageKey,
    get: getWallet,
    save: saveWallet,
    addCoins,
    spendCoins,
    addJems,
    addDiamonds: addJems,
    addCrystals,
    addEarnings: addJems,
    record: movement,
    recharge: registerRecharge,
    releasePending,
    getFinance: readFinance,
    saveFinance: writeFinance,
    rehydrate: uid => hydrateActiveState(String(uid || currentUid()), 'manual'),
    open,
    openRecharge: () => open('recharge'),
    close,
    showTab,
    render,
    formatNumber,
    formatMoney
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
