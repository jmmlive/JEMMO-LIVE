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
    <div class="battle-gift-head"><small>BATALLA OFICIAL</small><h2 id="battleGiftTitle">Apoya con regalos</h2><p>Selecciona la Casa, el regalo y la cantidad antes de confirmar el coste.</p></div>
    <div class="battle-gift-step"><strong>1. CASA DESTINATARIA</strong><div class="battle-house-options">${HOUSES.map(house => `<button class="battle-choice" type="button" data-battle-house-choice="${house.id}"><span>${house.emblem}</span><b>${house.name}</b><small>${formatNumber(totalScore(house))} puntos</small></button>`).join('')}</div></div>
    <div class="battle-gift-step"><strong>2. REGALO</strong><div class="battle-gift-options">${GIFTS.map(gift => `<button class="battle-choice" type="button" data-battle-gift-choice="${gift.id}"><span>${gift.icon}</span><b>${gift.name}</b><small>${formatNumber(gift.price)} JEMMOS</small></button>`).join('')}</div></div>
    <div class="battle-gift-step"><strong>3. CANTIDAD</strong><div class="battle-qty-options">${QUANTITIES.map(quantity => `<button class="battle-choice ${quantity === 1 ? 'active' : ''}" type="button" data-battle-qty="${quantity}">×${quantity}</button>`).join('')}</div></div>
    <div class="battle-gift-summary"><div><small>DESTINO Y REGALO</small><b id="battleGiftDestination">Selecciona una Casa y un regalo</b></div><div class="battle-gift-cost"><small>COSTE TOTAL</small><b id="battleGiftCost">0 JEMMOS</b></div></div>
    <button class="battle-gift-confirm" id="battleGiftConfirm" type="button" disabled>CONFIRMAR ENVÍO</button>
    <p class="battle-gift-status" id="battleGiftStatus" role="status"></p>`;
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

function updateSummary() {
  const house = houseById(selectedHouse);
  const gift = giftById(selectedGift);
  const total = gift ? gift.price * selectedQuantity : 0;
  const destination = $('#battleGiftDestination');
  const cost = $('#battleGiftCost');
  const confirm = $('#battleGiftConfirm');
  if (destination) destination.textContent = house && gift ? `${gift.icon} ${gift.name} ×${selectedQuantity} → ${house.name}` : 'Selecciona una Casa y un regalo';
  if (cost) cost.textContent = `${formatNumber(total)} JEMMOS`;
  if (confirm) {
    confirm.disabled = busy || !house || !gift;
    confirm.textContent = rechargeRequired ? 'RECARGAR JEMMOS' : busy ? 'ENVIANDO…' : 'CONFIRMAR ENVÍO';
  }
}

function setStatus(message = '', tone = '') {
  const status = $('#battleGiftStatus');
  if (!status) return;
  status.textContent = message;
  status.className = `battle-gift-status${tone ? ` ${tone}` : ''}`;
}

function openSheet() {
  buildSheet();
  const sheet = $('#battleGiftSheet');
  const backdrop = $('#battleGiftBackdrop');
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  if (backdrop) backdrop.hidden = false;
  sheet?.classList.add('open');
  sheet?.setAttribute('aria-hidden', 'false');
  setStatus('');
  updateSummary();
  setTimeout(() => $('[data-battle-house-choice]')?.focus(), 60);
}

function closeSheet() {
  const sheet = $('#battleGiftSheet');
  const backdrop = $('#battleGiftBackdrop');
  sheet?.classList.remove('open');
  sheet?.setAttribute('aria-hidden', 'true');
  if (backdrop) backdrop.hidden = true;
  document.body.style.overflow = previousBodyOverflow;
}

function resetSelection() {
  selectedHouse = '';
  selectedGift = '';
  selectedQuantity = 1;
  rechargeRequired = false;
  $$('[data-battle-house-choice],[data-battle-gift-choice]').forEach(button => button.classList.remove('active'));
  $$('[data-battle-qty]').forEach(button => button.classList.toggle('active', Number(button.dataset.battleQty) === 1));
  updateSummary();
}

function selectHouse(id, button) {
  selectedHouse = id;
  rechargeRequired = false;
  $$('[data-battle-house-choice]').forEach(item => item.classList.toggle('active', item === button));
  setStatus('');
  updateSummary();
}
function selectGift(id, button) {
  selectedGift = id;
  rechargeRequired = false;
  $$('[data-battle-gift-choice]').forEach(item => item.classList.toggle('active', item === button));
  setStatus('');
  updateSummary();
}
function selectQuantity(quantity, button) {
  selectedQuantity = quantity;
  rechargeRequired = false;
  $$('[data-battle-qty]').forEach(item => item.classList.toggle('active', item === button));
  setStatus('');
  updateSummary();
}

function appendChatMessage(house, gift, quantity, total) {
  const messages = $('#battleChatMessages');
  if (!messages) return;
  const row = document.createElement('p');
  row.className = 'chat-own';
  const name = document.createElement('b');
  name.textContent = '🎁 Tú ';
  const message = document.createTextNode(`enviaste ${gift.name} ×${quantity} a ${house.name} · ${formatNumber(total)} JEMMOS `);
  const time = document.createElement('time');
  time.textContent = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  row.append(name, message, time);
  messages.append(row);
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

async function confirmGift() {
  if (rechargeRequired) {
    closeSheet();
    window.JemmoWallet?.openRecharge?.();
    return;
  }
  if (busy) return;
  const house = houseById(selectedHouse);
  const gift = giftById(selectedGift);
  if (!house || !gift) return;
  const total = gift.price * selectedQuantity;
  const wallet = window.JemmoWallet;
  if (!wallet?.spendCoins) {
    setStatus('El monedero todavía no está listo. Vuelve a intentarlo.', 'error');
    return;
  }
  busy = true;
  updateSummary();
  setStatus('Comprobando saldo y registrando el regalo…');
  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const result = wallet.spendCoins(total, {
    title: 'Regalo enviado en Batalla de Casas',
    giftName: gift.name,
    detail: `${gift.icon} ${gift.name} ×${selectedQuantity} → ${house.name}`,
    context: 'BATALLA DE CASAS',
    source: 'battle-house-gift',
    reference: house.name,
    recipientUid: `jemmo-battle-house-${house.id}`,
    economicType: 'house-battle',
    houseId: house.id,
    houseName: house.name,
    idempotencyKey: `battle:${activeUid()}:${requestId}`
  });
  if (!result?.ok) {
    busy = false;
    if (result?.duplicate) {
      setStatus('Ese envío ya fue procesado. No se realizó un segundo cobro.', 'error');
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
  const synced = await syncGiftToCloud({ operationId: result.operationId, house, gift, quantity: selectedQuantity, total });
  busy = false;
  setStatus(synced ? 'Regalo enviado, cobro único registrado y puntos sincronizados.' : 'Regalo enviado y guardado. La sincronización continuará al recuperar conexión.', 'success');
  updateSummary();
  setTimeout(() => {
    closeSheet();
    resetSelection();
  }, 1150);
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
  $('#battleGiftOpen')?.addEventListener('click', openSheet);
  document.addEventListener('click', event => {
    const house = event.target.closest('[data-battle-house-choice]');
    if (house) { selectHouse(house.dataset.battleHouseChoice, house); return; }
    const gift = event.target.closest('[data-battle-gift-choice]');
    if (gift) { selectGift(gift.dataset.battleGiftChoice, gift); return; }
    const quantity = event.target.closest('[data-battle-qty]');
    if (quantity) selectQuantity(Number(quantity.dataset.battleQty) || 1, quantity);
  });
  $('#battleGiftClose')?.addEventListener('click', closeSheet);
  $('#battleGiftBackdrop')?.addEventListener('click', closeSheet);
  $('#battleGiftConfirm')?.addEventListener('click', confirmGift);
  window.addEventListener('keydown', event => { if (event.key === 'Escape') closeSheet(); });
}

function boot() {
  if (!$('#battleGiftOpen')) return;
  buildSheet();
  bind();
  updateScoreUi();
  subscribeScores();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
