(() => {
  'use strict';

  const uid = localStorage.getItem('jemmo_active_uid') || 'local-user';
  const WALLET_KEY = `jemmo_wallet_v1_${uid}`;
  const FINANCE_KEY = 'jemmo_finance_v1';
  const PORTAL_ID = 'jemmoUnifiedWalletPortal';
  const FRAME_ID = 'jemmoUnifiedWalletFrame';
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

  const id = (prefix = 'op') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const readJSON = (key, fallback) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  };
  const saveJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const defaultWallet = () => ({
    version: 2,
    jemmos: 0,
    coins: 0,
    jems: 0,
    earnings: 0,
    jemsConfirmed: 0,
    jemsPending: 0,
    jemsWithdrawn: 0,
    lots: [],
    pendingCredits: [],
    earningsHistory: [],
    withdrawals: [],
    ledger: []
  });

  const syncWallet = wallet => {
    wallet.jemmos = Math.max(0, Math.floor(Number(wallet.jemmos ?? wallet.coins) || 0));
    wallet.coins = wallet.jemmos;
    wallet.jemsConfirmed = Math.max(0, Math.floor(Number(wallet.jemsConfirmed) || 0));
    wallet.jemsPending = Math.max(0, Math.floor(Number(wallet.jemsPending) || 0));
    wallet.jemsWithdrawn = Math.max(0, Math.floor(Number(wallet.jemsWithdrawn) || 0));
    wallet.jems = wallet.jemsConfirmed + wallet.jemsPending;
    wallet.earnings = wallet.jems;
    ['lots', 'pendingCredits', 'earningsHistory', 'withdrawals', 'ledger'].forEach(key => {
      if (!Array.isArray(wallet[key])) wallet[key] = [];
    });
    return wallet;
  };

  const normalizeWallet = raw => {
    const wallet = { ...defaultWallet(), ...(raw || {}) };
    if (!Object.prototype.hasOwnProperty.call(raw || {}, 'jemsConfirmed')) {
      wallet.jemsConfirmed = Math.max(0, Math.floor(Number(raw?.jems ?? raw?.earnings) || 0));
    }
    syncWallet(wallet);
    const lotsTotal = wallet.lots.reduce((sum, lot) => sum + Math.max(0, Math.floor(Number(lot.remaining) || 0)), 0);
    if (wallet.jemmos > lotsTotal) {
      wallet.lots.push({
        id: id('legacy'),
        method: 'legacy',
        label: 'Saldo anterior',
        risk: 'confirmed',
        remaining: wallet.jemmos - lotsTotal,
        createdAt: Date.now()
      });
    }
    if (lotsTotal > wallet.jemmos) {
      let difference = lotsTotal - wallet.jemmos;
      for (let index = wallet.lots.length - 1; index >= 0 && difference > 0; index -= 1) {
        const cut = Math.min(difference, Math.max(0, Number(wallet.lots[index].remaining) || 0));
        wallet.lots[index].remaining -= cut;
        difference -= cut;
      }
    }
    return syncWallet(wallet);
  };

  const readWallet = (userId = uid) => normalizeWallet(readJSON(`jemmo_wallet_v1_${userId}`, null));
  const writeWallet = (wallet, userId = uid) => {
    const clean = syncWallet(wallet);
    saveJSON(`jemmo_wallet_v1_${userId}`, clean);
    return clean;
  };

  const defaultFinance = () => ({
    version: 3,
    settings: { ...DEFAULT_SETTINGS },
    cash: { gross: 0, received: 0, pending: 0, fees: 0, paidOut: 0 },
    app: { confirmed: 0, pending: 0 },
    agencies: {},
    membership: {},
    migration: { wallets: {} },
    period: { cycle: 1, startedAt: Date.now(), dayKey: '', lastClosedAt: 0 },
    closures: [],
    resetLog: [],
    recharges: [],
    gifts: [],
    tasks: [],
    withdrawals: [],
    expenses: [],
    pendingSystem: [],
    audit: []
  });

  const normalizeFinance = raw => {
    const base = defaultFinance();
    const state = { ...base, ...(raw || {}) };
    state.settings = { ...DEFAULT_SETTINGS, ...(raw?.settings || {}) };
    state.cash = { ...base.cash, ...(raw?.cash || {}) };
    state.app = { ...base.app, ...(raw?.app || {}) };
    ['agencies', 'membership', 'migration'].forEach(key => {
      if (!state[key] || typeof state[key] !== 'object' || Array.isArray(state[key])) state[key] = {};
    });
    if (!state.migration.wallets || typeof state.migration.wallets !== 'object' || Array.isArray(state.migration.wallets)) {
      state.migration.wallets = {};
    }
    ['recharges', 'gifts', 'tasks', 'withdrawals', 'expenses', 'pendingSystem', 'audit', 'closures', 'resetLog'].forEach(key => {
      if (!Array.isArray(state[key])) state[key] = [];
    });
    state.period = { ...base.period, ...(raw?.period || {}) };
    if (!Number(state.period.startedAt)) state.period.startedAt = Date.now();
    if (!Number(state.period.cycle)) state.period.cycle = 1;
    return state;
  };

  const readFinance = () => normalizeFinance(readJSON(FINANCE_KEY, null));
  const writeFinance = state => saveJSON(FINANCE_KEY, normalizeFinance(state));
  const walletLedger = (wallet, type, label, data = {}) => {
    wallet.ledger.unshift({ id: id('mov'), type, label, ...data, createdAt: Date.now(), simulation: true });
    wallet.ledger = wallet.ledger.slice(0, 400);
  };
  const audit = (state, type, label, details = {}) => {
    state.audit.unshift({ id: id('audit'), type, label, details, actor: uid, createdAt: Date.now(), simulation: true });
    state.audit = state.audit.slice(0, 600);
  };
  const membership = (state, userId) => state.membership[userId] || { hasHouse: false, houseId: '', houseName: '' };
  const ensureAgency = (state, houseId = 'casa-demo', houseName = 'Casa JEMMO Demo') => {
    if (!state.agencies[houseId]) state.agencies[houseId] = { id: houseId, name: houseName, confirmed: 0, pending: 0, withdrawn: 0 };
    return state.agencies[houseId];
  };
  const addPendingCredit = (wallet, amount, source, label, releaseAt, reference) => {
    amount = Math.max(0, Math.floor(amount));
    if (!amount) return;
    wallet.jemsPending += amount;
    wallet.pendingCredits.push({ id: id('pending'), amount, source, label, releaseAt, status: 'pending', reference, createdAt: Date.now() });
    wallet.earningsHistory.unshift({ id: id('earn'), amount, status: 'pending', source, label, reference, createdAt: Date.now() });
  };
  const addConfirmedCredit = (wallet, amount, source, label, reference) => {
    amount = Math.max(0, Math.floor(amount));
    if (!amount) return;
    wallet.jemsConfirmed += amount;
    wallet.earningsHistory.unshift({ id: id('earn'), amount, status: 'confirmed', source, label, reference, createdAt: Date.now() });
  };

  const spendLots = (wallet, amount) => {
    amount = Math.max(0, Math.floor(amount));
    if (wallet.jemmos < amount) return null;
    const allocations = [];
    let remaining = amount;
    wallet.lots.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
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
        lotId: lot.id
      });
    }
    if (remaining > 0) return null;
    wallet.lots = wallet.lots.filter(lot => Number(lot.remaining) > 0);
    wallet.jemmos -= amount;
    syncWallet(wallet);
    return allocations;
  };

  const notify = source => {
    updateBalanceTokens();
    window.dispatchEvent(new CustomEvent('jemmo-wallet-change', { detail: { source } }));
  };

  const spendCoins = (amount, meta = {}) => {
    amount = Math.max(1, Math.floor(Number(amount) || 0));
    const wallet = readWallet();
    const allocations = spendLots(wallet, amount);
    if (!allocations) return { ok: false, reason: 'insufficient', missing: Math.max(0, amount - wallet.jemmos), wallet };
    walletLedger(wallet, meta.type || 'spend', meta.title || 'Consumo de JEMMOS', {
      amountJemmos: -amount,
      detail: meta.detail || '',
      source: meta.source || location.pathname,
      allocations
    });
    const clean = writeWallet(wallet);
    notify(meta.source || 'spend');
    return { ok: true, wallet: clean, allocations };
  };

  const sendGift = ({
    amount,
    context = 'Regalo',
    recipientUid = 'jemmo-demo-recipient',
    reference = '',
    giftName = 'Regalo JEMMO'
  } = {}) => {
    amount = Math.max(1, Math.floor(Number(amount) || 0));
    const state = readFinance();
    const settings = state.settings;
    const member = membership(state, recipientUid);
    const sender = readWallet(uid);
    const allocations = spendLots(sender, amount);
    if (!allocations) return { ok: false, reason: 'insufficient', missing: Math.max(0, amount - sender.jemmos), wallet: sender };

    const pendingSpent = allocations.filter(item => item.risk === 'reversible').reduce((sum, item) => sum + item.amount, 0);
    const pendingRatio = amount ? pendingSpent / amount : 0;
    const hostTotal = Math.floor(amount * settings.hostPct / 100);
    const agencyTotal = member.hasHouse ? Math.floor(amount * settings.agencyPct / 100) : 0;
    const appTotal = amount - hostTotal - agencyTotal;
    const hostPending = Math.round(hostTotal * pendingRatio);
    const hostConfirmed = hostTotal - hostPending;
    const appPending = Math.round(appTotal * pendingRatio);
    const appConfirmed = appTotal - appPending;
    const agencyPending = Math.round(agencyTotal * pendingRatio);
    const agencyConfirmed = agencyTotal - agencyPending;
    const operationId = id('gift');
    const releaseAt = Date.now() + Math.max(0, Number(settings.confirmationHours) || 0) * 3600000;
    const recipient = recipientUid === uid ? sender : readWallet(recipientUid);

    if (hostConfirmed) addConfirmedCredit(recipient, hostConfirmed, 'gift', giftName, operationId);
    if (hostPending) addPendingCredit(recipient, hostPending, 'gift', giftName, releaseAt, operationId);
    walletLedger(sender, 'gift_sent', `${giftName} enviado`, {
      amountJemmos: -amount,
      context,
      reference,
      operationId,
      allocations
    });
    walletLedger(recipient, 'gift_received', `${giftName} recibido`, {
      amountJems: hostTotal,
      confirmed: hostConfirmed,
      pending: hostPending,
      context,
      reference,
      operationId
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
        id: operationId,
        status: 'pending',
        releaseAt,
        app: appPending,
        agency: agencyPending,
        houseId: member.houseId,
        houseName: member.houseName
      });
    }
    state.gifts.unshift({
      id: operationId,
      senderUid: uid,
      recipientUid,
      context,
      reference,
      giftName,
      total: amount,
      hostTotal,
      hostConfirmed,
      hostPending,
      appTotal,
      appConfirmed,
      appPending,
      agencyTotal,
      agencyConfirmed,
      agencyPending,
      hasHouse: member.hasHouse,
      houseId: member.houseId,
      houseName: member.houseName,
      sourceMethods: allocations,
      createdAt: Date.now(),
      simulation: true
    });
    state.gifts = state.gifts.slice(0, 600);
    audit(state, 'gift', `${giftName} repartido`, {
      operationId,
      total: amount,
      hostTotal,
      appTotal,
      agencyTotal,
      hostPending,
      appPending,
      agencyPending,
      hasHouse: member.hasHouse
    });

    if (recipientUid !== uid) writeWallet(sender, uid);
    const recipientClean = writeWallet(recipient, recipientUid);
    writeFinance(state);
    notify('gift');
    return {
      ok: true,
      operationId,
      wallet: recipientUid === uid ? recipientClean : readWallet(uid),
      recipientWallet: recipientClean,
      hostTotal,
      hostConfirmed,
      hostPending,
      appTotal,
      agencyTotal,
      hasHouse: member.hasHouse
    };
  };

  let previousBodyOverflow = '';

  const ensurePortal = () => {
    let portal = document.getElementById(PORTAL_ID);
    if (portal) return portal;
    portal = document.createElement('div');
    portal.id = PORTAL_ID;
    portal.hidden = true;
    portal.setAttribute('aria-hidden', 'true');
    portal.innerHTML = `<iframe id="${FRAME_ID}" title="Monedero y ganancias JEMMO" allow="payment *" referrerpolicy="same-origin"></iframe>`;
    const style = document.createElement('style');
    style.id = 'jemmoUnifiedWalletStyle';
    style.textContent = `
      #${PORTAL_ID}{position:fixed;z-index:2147483000;inset:0;display:grid;place-items:end center;background:rgba(2,0,3,.76);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
      #${PORTAL_ID}[hidden]{display:none!important}
      #${PORTAL_ID} iframe{display:block;width:min(100%,520px);height:100svh;border:0;background:transparent;box-shadow:0 -20px 70px rgba(0,0,0,.82)}
    `;
    document.head.append(style);
    document.body.append(portal);
    return portal;
  };

  const normalizeTab = tab => {
    const value = String(tab || 'summary').toLowerCase();
    if (['recharge', 'recargar', 'recarga'].includes(value)) return 'recharge';
    if (['earnings', 'ganancias', 'jems'].includes(value)) return 'earnings';
    if (['withdraw', 'retirar', 'retiro'].includes(value)) return 'withdraw';
    if (['history', 'historia', 'movements', 'movimientos'].includes(value)) return 'history';
    return 'summary';
  };

  const hidePortal = () => {
    const portal = document.getElementById(PORTAL_ID);
    if (!portal || portal.hidden) return;
    const frame = portal.querySelector(`#${FRAME_ID}`);
    portal.hidden = true;
    portal.setAttribute('aria-hidden', 'true');
    if (frame) frame.src = 'about:blank';
    document.body.style.overflow = previousBodyOverflow;
    updateBalanceTokens();
    window.dispatchEvent(new CustomEvent('jemmo-wallet-closed'));
  };

  const open = (tab = 'summary') => {
    const portal = ensurePortal();
    const frame = portal.querySelector(`#${FRAME_ID}`);
    const normalized = normalizeTab(tab);
    const wasHidden = portal.hidden;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    portal.hidden = false;
    portal.setAttribute('aria-hidden', 'false');
    frame.src = `yo.html?wallet=${encodeURIComponent(normalized)}&embed=1&from=${encodeURIComponent(location.pathname)}&v=${Date.now()}`;
    if (wasHidden && !history.state?.jemmoWalletPortal) history.pushState({ ...(history.state || {}), jemmoWalletPortal: true }, '');
    window.dispatchEvent(new CustomEvent('jemmo-wallet-opened', { detail: { tab: normalized } }));
  };

  const close = () => {
    const portal = document.getElementById(PORTAL_ID);
    if (!portal || portal.hidden) return;
    if (history.state?.jemmoWalletPortal) {
      history.back();
      return;
    }
    hidePortal();
  };

  const updateBalanceTokens = () => {
    const wallet = readWallet();
    document.querySelectorAll('[data-wallet="jemmos"] strong').forEach(element => {
      element.textContent = wallet.jemmos.toLocaleString('es-ES');
    });
    document.querySelectorAll('[data-wallet="jems"] strong').forEach(element => {
      element.textContent = wallet.jems.toLocaleString('es-ES');
    });
    document.querySelectorAll('[data-jemmo-balance]').forEach(element => {
      element.textContent = wallet.jemmos.toLocaleString('es-ES');
    });
  };

  const removeLegacyWallet = () => {
    const old = document.getElementById('walletSheet');
    if (old) old.remove();
    document.querySelectorAll('.wallet-backdrop[data-legacy-wallet],.jemmo-wallet-backdrop,.jemmo-wallet-sheet').forEach(element => element.remove());
  };

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    let trigger = target.closest('[data-open-wallet]');
    let tab = trigger?.getAttribute('data-open-wallet') || '';
    if (!trigger) {
      trigger = target.closest('#walletPlus,[data-action="wallet"],.wallet-token[data-wallet]');
      if (trigger?.id === 'walletPlus') tab = 'recharge';
      else if (trigger?.matches('.wallet-token[data-wallet="jems"]')) tab = 'earnings';
      else if (trigger) tab = 'summary';
    }
    if (!trigger) {
      const demo = target.closest('[data-demo]');
      const label = String(demo?.getAttribute('data-demo') || '').toLowerCase();
      if (label.includes('recargar')) { trigger = demo; tab = 'recharge'; }
      else if (label.includes('retirar')) { trigger = demo; tab = 'withdraw'; }
      else if (label.includes('historial')) { trigger = demo; tab = 'history'; }
    }
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    open(tab || 'summary');
  }, true);


  window.addEventListener('popstate', event => {
    const portal = document.getElementById(PORTAL_ID);
    if (!portal || portal.hidden) return;
    hidePortal();
    event.stopImmediatePropagation();
  });

  window.addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    const frame = document.getElementById(FRAME_ID);
    if (!frame || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'jemmo-wallet-close') close();
    if (event.data?.type === 'jemmo-wallet-updated') notify('wallet-iframe');
  });

  window.addEventListener('storage', event => {
    if (event.key === WALLET_KEY || event.key === FINANCE_KEY) notify('storage');
  });

  window.addEventListener('pageshow', updateBalanceTokens);
  document.addEventListener('DOMContentLoaded', () => {
    removeLegacyWallet();
    updateBalanceTokens();
  });

  window.JemmoWallet = {
    key: () => WALLET_KEY,
    get: () => readWallet(),
    open,
    openRecharge: () => open('recharge'),
    close,
    render: updateBalanceTokens,
    spendCoins
  };
  window.JemmoEconomy = {
    ...(window.JemmoEconomy || {}),
    sendGift,
    readWallet,
    readFinance
  };
})();
