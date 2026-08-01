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
    console.warn('JEMMO Batalla: sincronización en la nube no disponible', error?.message || error);
    return null;
  });
  return firebasePromise;
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const formatNumber = value => Math.max(0, Math.round(Number(value) || 0)).toLocaleString('es-ES');

const HOUSES = [
  { id: 'tenerife', name: 'Casa Tenerife', emblem: 'JT', base: 128500, scoreId: 'battleScoreTenerife' },
  { id: 'unicornio', name: 'Casa Unicornio', emblem: '🦄', base: 97300, scoreId: 'battleScoreUnicornio' }
];
const GIFTS = [
  { id: 'rosa', name: 'Rosa JEMMO', icon: '🌹', price: 10 },
  { id: 'estrella', name: 'Estrella', icon: '⭐', price: 50 },
  { id: 'corona', name: 'Corona Real', icon: '👑', price: 200 },
  { id: 'leon', name: 'León de Oro', icon: '🦁', price: 1000 }
];
const QUANTITIES = [1, 10, 20, 100];
const SCORE_KEY = 'jemmo_battle_house_points_v1';

let selectedHouse = '';
let selectedGift = '';
let selectedQuantity = 1;
let busy = false;
let rechargeRequired = false;
let previousBodyOverflow = '';
let localPoints = readLocalPoints();
let cloudPoints = {};
let closingFromHistory = false;

function activeUid() {
  if (window.__jemmoAuthenticatedUid) return String(window.__jemmoAuthenticatedUid);
  try { return localStorage.getItem('jemmo_active_uid') || sessionStorage.getItem('jemmo_active_uid') || ''; } catch { return ''; }
}

function readLocalPoints() {
  try {
    const data = JSON.parse(localStorage.getItem(SCORE_KEY) || '{}');
    return data && typeof data === 'object' ? data : {};
  } catch { return {}; }
}
function saveLocalPoints() {
  try { localStorage.setItem(SCORE_KEY, JSON.stringify(localPoints)); } catch {}
}
function houseById(id) { return HOUSES.find(item => item.id === id); }
function giftById(id) { return GIFTS.find(item => item.id === id); }
function effectiveGiftPoints(id) { return Math.max(Number(localPoints[id]) || 0, Number(cloudPoints[id]) || 0); }
function totalScore(house) { return house.base + effectiveGiftPoints(house.id); }
function sheetIsOpen() { return Boolean($('#battleGiftSheet')?.classList.contains('open')); }

function buildSheet() {
  if ($('#battleGiftSheet')) return;
  const backdrop = document.createElement('div');
  backdrop.id = 'battleGiftBackdrop';
  backdrop.className = 'battle-gift-backdrop';
  backdrop.hidden = true;
  const sheet = document.createElement('section');
  sheet.id = 'battleGiftSheet';
  sheet.className = 'battle-gift-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.setAttribute('aria-labelledby', 'battleGiftTitle');
  sheet.innerHTML = `
    <button class="battle-gift-close" id="battleGiftClose" type="button" aria-label="Cerrar">×</button>
    <div class="battle-gift-head"><small>BATALLA OFICIAL</small><h2 id="battleGiftTitle">Apoya con regalos</h2><p>Selecciona la Casa, el regalo y la cantidad. El envío se cobrará una sola vez.</p></div>
    <div class="battle-gift-step" id="battleHouseStep"><strong>1. CASA DESTINATARIA</strong><div class="battle-house-options">${HOUSES.map(house => `<button class="battle-choice" type="button" data-battle-house-choice="${house.id}" aria-pressed="false"><span>${house.emblem}</span><b>${house.name}</b><small>${formatNumber(totalScore(house))} puntos</small></button>`).join('')}</div></div>
    <div class="battle-gift-step" id="battleGiftStep"><strong>2. REGALO</strong><div class="battle-gift-options">${GIFTS.map(gift => `<button class="battle-choice" type="button" data-battle-gift-choice="${gift.id}" aria-pressed="false"><span>${gift.icon}</span><b>${gift.name}</b><small>${formatNumber(gift.price)} JEMMOS</small></button>`).join('')}</div></div>
    <div class="battle-gift-step" id="battleQtyStep"><strong>3. CANTIDAD</strong><div class="battle-qty-options">${QUANTITIES.map(quantity => `<button class="battle-choice ${quantity === 1 ? 'active' : ''}" type="button" data-battle-qty="${quantity}" aria-pressed="${quantity === 1}">×${quantity}</button>`).join('')}</div></div>
    <div class="battle-gift-summary"><div><small>DESTINO Y REGALO</small><b id="battleGiftDestination">Falta seleccionar una Casa y un regalo</b></div><div class="battle-gift-cost"><small>COSTE TOTAL</small><b id="battleGiftCost">—</b></div></div>
    <button class="battle-gift-confirm is-incomplete" id="battleGiftConfirm" type="button" aria-disabled="true">SELECCIONAR CASA</button>
    <p class="battle-gift-status hint" id="battleGiftStatus" role="status" aria-live="polite">Primero elige la Casa que recibirá los puntos.</p>`;
  document.body.append(backdrop, sheet);
}

function updateScoreUi() {
  HOUSES.forEach(house => {
    const element = document.getElementById(house.scoreId);
    if (element) element.textContent = formatNumber(totalScore(house));
    const option = $(`[data-battle-house-choice="${house.id}"] small`);
    if (option) option.textContent = `${formatNumber(totalScore(house))} puntos`;
  });
  const total = HOUSES.reduce((sum, house) => sum + totalScore(house), 0);
  const first = total ? totalScore(HOUSES[0]) / total : .5;
  const fill = $('#battleProgressFill');
  if (fill) fill.style.width = `${Math.max(6, Math.min(94, first * 100))}%`;
}

function updateSummary({ announce = false } = {}) {
  const house = houseById(selectedHouse);
  const gift = giftById(selectedGift);
  const complete = Boolean(house && gift);
  const total = complete ? gift.price * selectedQuantity : 0;
  const destination = $('#battleGiftDestination');
  const cost = $('#battleGiftCost');
  const confirm = $('#battleGiftConfirm');
  const houseStep = $('#battleHouseStep');
  const giftStep = $('#battleGiftStep');

  houseStep?.classList.toggle('needs-attention', !house);
  giftStep?.classList.toggle('needs-attention', Boolean(house && !gift));

  if (destination) {
    if (complete) destination.textContent = `${gift.icon} ${gift.name} ×${selectedQuantity} → ${house.name}`;
    else if (!house && gift) destination.textContent = `${gift.icon} ${gift.name} ×${selectedQuantity} · falta seleccionar una Casa`;
    else if (house && !gift) destination.textContent = `${house.name} · falta seleccionar un regalo`;
    else destination.textContent = 'Falta seleccionar una Casa y un regalo';
  }
  if (cost) cost.textContent = complete ? `${formatNumber(total)} JEMMOS` : '—';
  if (confirm) {
    confirm.disabled = busy;
    confirm.classList.toggle('is-incomplete', !complete && !rechargeRequired);
    confirm.setAttribute('aria-disabled', String(busy || (!complete && !rechargeRequired)));
    confirm.textContent = rechargeRequired
      ? 'RECARGAR JEMMOS'
      : busy
        ? 'ENVIANDO…'
        : !house
          ? 'SELECCIONAR CASA'
          : !gift
            ? 'SELECCIONAR REGALO'
            : 'CONFIRMAR ENVÍO';
  }
  if (announce && !complete) {
    setStatus(!house ? 'Falta seleccionar la Casa destinataria.' : 'Falta seleccionar el regalo.', 'error');
  }
}

function setStatus(message = '', tone = '') {
  const status = $('#battleGiftStatus');
  if (!status) return;
  status.textContent = message;
  status.className = `battle-gift-status${tone ? ` ${tone}` : ''}`;
}

function pushSheetHistory() {
  if (history.state?.jemmoOverlay === 'battle-gift') return;
  history.pushState({ ...(history.state || {}), jemmoOverlay: 'battle-gift' }, '', location.href);
}

function showSheet() {
  const sheet = $('#battleGiftSheet');
  const backdrop = $('#battleGiftBackdrop');
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  if (backdrop) backdrop.hidden = false;
  sheet?.classList.add('open');
  sheet?.setAttribute('aria-hidden', 'false');
}

function hideSheet() {
  const sheet = $('#battleGiftSheet');
  const backdrop = $('#battleGiftBackdrop');
  sheet?.classList.remove('open');
  sheet?.setAttribute('aria-hidden', 'true');
  if (backdrop) backdrop.hidden = true;
  document.body.style.overflow = previousBodyOverflow;
}

function openSheet(preselectedHouse = '') {
  buildSheet();
  if (preselectedHouse && houseById(preselectedHouse)) {
    const button = $(`[data-battle-house-choice="${preselectedHouse}"]`);
    selectHouse(preselectedHouse, button, { silent: true });
  }
  showSheet();
  pushSheetHistory();
  rechargeRequired = false;
  setStatus(selectedHouse ? 'Ahora selecciona el regalo.' : 'Primero elige la Casa que recibirá los puntos.', 'hint');
  updateSummary();
  setTimeout(() => {
    const target = selectedHouse ? $('[data-battle-gift-choice]') : $('[data-battle-house-choice]');
    target?.focus({ preventScroll: true });
  }, 80);
}

function closeSheet({ fromHistory = false } = {}) {
  if (!sheetIsOpen()) return;
  if (!fromHistory && !closingFromHistory && history.state?.jemmoOverlay === 'battle-gift') {
    history.back();
    return;
  }
  hideSheet();
}

function resetSelection() {
  selectedHouse = '';
  selectedGift = '';
  selectedQuantity = 1;
  rechargeRequired = false;
  $$('[data-battle-house-choice],[data-battle-gift-choice]').forEach(button => {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  });
  $$('[data-battle-qty]').forEach(button => {
    const active = Number(button.dataset.battleQty) === 1;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  updateSummary();
}

function selectHouse(id, button, { silent = false } = {}) {
  if (!houseById(id)) return;
  selectedHouse = id;
  rechargeRequired = false;
  $$('[data-battle-house-choice]').forEach(item => {
    const active = item === button || item.dataset.battleHouseChoice === id;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  if (!silent) setStatus(selectedGift ? 'Selección completa. Revisa el coste y confirma.' : 'Casa seleccionada. Ahora elige el regalo.', 'hint');
  updateSummary();
}
function selectGift(id, button) {
  if (!giftById(id)) return;
  selectedGift = id;
  rechargeRequired = false;
  $$('[data-battle-gift-choice]').forEach(item => {
    const active = item === button || item.dataset.battleGiftChoice === id;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  setStatus(selectedHouse ? 'Selección completa. Revisa el coste y confirma.' : 'Regalo seleccionado. Falta elegir la Casa destinataria.', selectedHouse ? 'hint' : 'error');
  updateSummary();
}
function selectQuantity(quantity, button) {
  selectedQuantity = QUANTITIES.includes(quantity) ? quantity : 1;
  rechargeRequired = false;
  $$('[data-battle-qty]').forEach(item => {
    const active = item === button || Number(item.dataset.battleQty) === selectedQuantity;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  setStatus(selectedHouse && selectedGift ? 'Cantidad actualizada. Revisa el coste y confirma.' : 'Cantidad actualizada. Completa los pasos pendientes.', 'hint');
  updateSummary();
}

function focusMissingSelection() {
  const house = houseById(selectedHouse);
  const gift = giftById(selectedGift);
  const target = !house ? $('[data-battle-house-choice]') : !gift ? $('[data-battle-gift-choice]') : null;
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => target?.focus({ preventScroll: true }), 280);
  updateSummary({ announce: true });
}

function appendChatMessage(house, gift, quantity, total) {
  const messages = $('#battleChatMessages');
  if (!messages) return;
  const row = document.createElement('p');
  row.className = 'battle-message gift chat-own message-enter';
  const name = document.createElement('b');
  name.textContent = '🎁 Tú: ';
  const content = document.createElement('span');
  content.className = 'battle-message-text';
  content.textContent = `enviaste ${gift.name} ×${quantity} a ${house.name} · ${formatNumber(total)} JEMMOS`;
  const time = document.createElement('time');
  time.textContent = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  row.append(name, content, time);
  messages.append(row);
  while (messages.children.length > 12) messages.firstElementChild?.remove();
  messages.scrollTop = messages.scrollHeight;
}

async function syncGiftToCloud({ operationId, house, gift, quantity, total }) {
  const uid = activeUid();
  if (!navigator.onLine || !uid || !operationId) return false;
  try {
    const services = await firebaseServices();
    if (!services) return false;
    await Promise.all([
      services.setDoc(services.doc(services.db, 'batallas', 'oficial-prueba', 'casas', house.id), {
        houseId: house.id, houseName: house.name, giftPoints: services.increment(total),
        updatedAt: services.serverTimestamp()
      }, { merge: true }),
      services.setDoc(services.doc(services.db, 'batallas', 'oficial-prueba', 'eventos', operationId), {
        operationId, senderUid: uid, houseId: house.id, houseName: house.name,
        giftId: gift.id, giftName: gift.name, quantity, totalJemmos: total, simulation: true,
        createdAt: services.serverTimestamp()
      })
    ]);
    return true;
  } catch (error) {
    console.warn('JEMMO Batalla: evento pendiente de sincronización', error?.code || error);
    return false;
  }
}

async function waitForWalletReady(timeout = 2400) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (window.JemmoWallet?.spendCoins && window.JemmoWallet?.get) return window.JemmoWallet;
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  return null;
}

async function confirmGift() {
  if (rechargeRequired) {
    closeSheet();
    setTimeout(() => window.JemmoWallet?.openRecharge?.(), 120);
    return;
  }
  if (busy) return;
  const house = houseById(selectedHouse);
  const gift = giftById(selectedGift);
  if (!house || !gift) {
    focusMissingSelection();
    return;
  }
  const total = gift.price * selectedQuantity;
  busy = true;
  updateSummary();
  setStatus('Comprobando saldo y registrando el regalo…', 'hint');
  const wallet = await waitForWalletReady();
  if (!wallet) {
    busy = false;
    updateSummary();
    setStatus('El monedero no terminó de cargar. Cierra este panel y vuelve a abrirlo.', 'error');
    return;
  }
  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let result;
  try {
    result = wallet.spendCoins(total, {
      title: 'Regalo enviado en Batalla de Casas',
      giftName: gift.name,
      detail: `${gift.icon} ${gift.name} ×${selectedQuantity} → ${house.name}`,
      context: 'BATALLA DE CASAS',
      source: 'battle-house-gift',
      reference: house.name,
      recipientUid: `jemmo-battle-house-${house.id}`,
      recipientName: house.name,
      economicType: 'house-battle',
      houseId: house.id,
      houseName: house.name,
      idempotencyKey: `battle:${activeUid() || 'local'}:${requestId}`
    });
  } catch (error) {
    console.error('JEMMO Batalla: fallo al cobrar regalo', error);
    busy = false;
    updateSummary();
    setStatus('No se pudo completar el cobro. Tu saldo no se ha modificado.', 'error');
    return;
  }
  if (!result?.ok) {
    busy = false;
    if (result?.duplicate) {
      setStatus('Ese envío ya fue procesado. No se realizó un segundo cobro.', 'error');
    } else if (result?.blocked || result?.reason === 'self-gift') {
      setStatus('Este regalo no se puede enviar por seguridad.', 'error');
    } else {
      rechargeRequired = true;
      setStatus(`Saldo insuficiente. Faltan ${formatNumber(result?.missing || total)} JEMMOS.`, 'error');
    }
    updateSummary();
    return;
  }

  localPoints[house.id] = (Number(localPoints[house.id]) || 0) + total;
  saveLocalPoints();
  updateScoreUi();
  appendChatMessage(house, gift, selectedQuantity, total);
  window.dispatchEvent(new CustomEvent('jemmo-battle-gift-sent', { detail: { houseId: house.id, houseName: house.name, giftName: gift.name, quantity: selectedQuantity, total } }));
  const synced = await syncGiftToCloud({ operationId: result.operationId, house, gift, quantity: selectedQuantity, total });
  busy = false;
  setStatus(synced ? 'Regalo enviado. El marcador y el monedero ya están actualizados.' : 'Regalo enviado y guardado. Se sincronizará al recuperar conexión.', 'success');
  updateSummary();
  setTimeout(() => {
    closeSheet();
    resetSelection();
  }, 1250);
}

async function subscribeScores() {
  const services = await firebaseServices();
  if (!services) return;
  HOUSES.forEach(house => {
    try {
      services.onSnapshot(services.doc(services.db, 'batallas', 'oficial-prueba', 'casas', house.id), snapshot => {
        cloudPoints[house.id] = Number(snapshot.data()?.giftPoints) || 0;
        updateScoreUi();
      }, error => console.warn('JEMMO Batalla: marcador local activo', error?.code || error));
    } catch (error) {
      console.warn('JEMMO Batalla: marcador local activo', error?.code || error);
    }
  });
}

function bind() {
  $('#battleGiftOpen')?.addEventListener('click', () => openSheet());
  $$('[data-battle-house-choice]').forEach(button => button.addEventListener('click', () => selectHouse(button.dataset.battleHouseChoice, button)));
  $$('[data-battle-gift-choice]').forEach(button => button.addEventListener('click', () => selectGift(button.dataset.battleGiftChoice, button)));
  $$('[data-battle-qty]').forEach(button => button.addEventListener('click', () => selectQuantity(Number(button.dataset.battleQty) || 1, button)));
  $('#battleGiftClose')?.addEventListener('click', () => closeSheet());
  $('#battleGiftBackdrop')?.addEventListener('click', () => closeSheet());
  $('#battleGiftConfirm')?.addEventListener('click', confirmGift);

  $$('[data-battle-house]').forEach(card => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Enviar regalo a ${houseById(card.dataset.battleHouse)?.name || 'esta Casa'}`);
    const openFromCard = () => openSheet(card.dataset.battleHouse);
    card.addEventListener('click', openFromCard);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openFromCard();
      }
    });
  });

  window.addEventListener('keydown', event => { if (event.key === 'Escape' && sheetIsOpen()) closeSheet(); });
  window.addEventListener('popstate', event => {
    if (!sheetIsOpen()) return;
    closingFromHistory = true;
    hideSheet();
    closingFromHistory = false;
    event.stopImmediatePropagation();
  }, true);
  window.addEventListener('pagehide', () => {
    if (sheetIsOpen()) hideSheet();
  });
}

function boot() {
  if (!$('#battleGiftOpen')) return;
  buildSheet();
  bind();
  updateScoreUi();
  updateSummary();
  subscribeScores();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
