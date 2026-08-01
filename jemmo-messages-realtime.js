/* JEMMO LIVE V1 · PERFIL COMPLETO Y REGALOS EN MENSAJES PRUEBA 04
   Mensajería directa con conversación privada, perfiles públicos y regalos de prueba.
   La economía continúa siendo una simulación local hasta la autorización de producción.
*/
(() => {
  'use strict';

  if (window.__jemmoMessagesRealtime01) return;
  window.__jemmoMessagesRealtime01 = true;

  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
    authDomain: 'jemmo-live.firebaseapp.com',
    projectId: 'jemmo-live',
    storageBucket: 'jemmo-live.firebasestorage.app',
    messagingSenderId: '355540892255',
    appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
  };

  const VERSION = 'JEMMO LIVE V1 · PERFIL COMPLETO Y REGALOS EN MENSAJES PRUEBA 04';
  const $ = id => document.getElementById(id);
  const state = {
    sdk: null,
    auth: null,
    db: null,
    user: null,
    profile: null,
    conversations: [],
    currentConversationId: '',
    conversationStop: null,
    messagesStop: null,
    search: '',
    historyGuard: false,
    pendingConversationFromUrl: new URLSearchParams(location.search).get('chat') || '',
    autoOpenedFromUrl: false,
    ready: false,
    publicIdApi: null,
    currentPeer: null,
    blockedByMe: false,
    socialApi: null,
    followingProfiles: [],
    followingStop: null,
    pendingGiftFromUrl: new URLSearchParams(location.search).get('gift') === '1',
    giftUrlConsumed: false,
    giftBusy: false,
    giftSelection: 0,
    giftQuantity: 1,
    giftHistoryOpen: false,
    ignoreGiftPop: false
  };

  let toastTimer = 0;
  const MESSAGE_GIFT_SYSTEM = window.JemmoGiftCatalog;
  const MESSAGE_GIFT_CATALOG = Object.freeze([...(MESSAGE_GIFT_SYSTEM?.catalog || [
    { id:'rosa-jemmo', icon:'🌹', name:'Rosa JEMMO', cost:10 },
    { id:'leon-de-oro', icon:'🦁', name:'León de Oro', cost:1000 }
  ])]);
  const messageGiftQuantities = gift => MESSAGE_GIFT_SYSTEM?.quantitiesFor?.(gift?.cost || 10) || [1,10,20,100];


  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
  }

  function timestampMs(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    return Number(value) || 0;
  }

  function formatTime(value) {
    const milliseconds = timestampMs(value);
    if (!milliseconds) return 'Ahora';
    const date = new Date(milliseconds);
    const now = new Date();
    const sameDay = date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
    return sameDay
      ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  }

  function displayNameFromUser(user) {
    const emailName = String(user?.email || '').split('@')[0];
    return String(user?.displayName || emailName || 'Usuario JEMMO').trim();
  }

  function initials(name) {
    const words = String(name || 'J').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'J';
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  }

  function toast(message, duration = 2600) {
    const element = $('toast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), duration);
  }

  function ensureStyles() {
    if ($('jemmoRealtimeMessagesStyles')) return;
    const style = document.createElement('style');
    style.id = 'jemmoRealtimeMessagesStyles';
    style.textContent = `
      .jemmo-rt-status{margin:0 0 8px;padding:8px 11px;border:1px solid #643078;border-radius:13px;background:#120218;color:#d9cae0;font:800 10px/1.35 Inter,system-ui,sans-serif;display:flex;align-items:center;gap:8px}
      .jemmo-rt-status::before{content:"";width:9px;height:9px;border-radius:50%;background:#ffb02e;box-shadow:0 0 10px #ffb02e;flex:0 0 auto}
      .jemmo-rt-status.ok::before{background:#23df7c;box-shadow:0 0 10px #23df7c}
      .jemmo-rt-status.error{border-color:#a73b52;color:#ffd1d8;background:#25050d}.jemmo-rt-status.error::before{background:#ff3d5d;box-shadow:0 0 10px #ff3d5d}
      .jemmo-rt-new-backdrop{position:fixed;z-index:990;inset:0;background:#020003d9;backdrop-filter:blur(5px);display:grid;place-items:end center;padding:16px 10px calc(16px + env(safe-area-inset-bottom,0px))}
      .jemmo-rt-new-backdrop[hidden]{display:none!important}
      .jemmo-rt-new-sheet{width:min(100%,500px);border:1px solid #8333a0;border-radius:25px;background:linear-gradient(180deg,#280634,#0d0111);padding:16px;box-shadow:0 -20px 60px #000}
      .jemmo-rt-new-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.jemmo-rt-new-head strong{font-size:19px}.jemmo-rt-new-close{width:40px;height:40px;border:1px solid #69307b;border-radius:13px;background:#3a0d45;color:#fff;font-size:24px}
      .jemmo-rt-new-sheet p{margin:7px 0 12px;color:#c8b7cd;font-size:11px;line-height:1.45}.jemmo-rt-new-row{display:grid;grid-template-columns:minmax(0,1fr) 96px;gap:8px}
      .jemmo-rt-new-row input{height:49px;min-width:0;border:1px solid #67307b;border-radius:15px;background:#0e0113;color:#fff;padding:0 12px;outline:none}.jemmo-rt-new-row input:focus{border-color:#ffd34e;box-shadow:0 0 0 3px #ffd34e22}
      .jemmo-rt-new-row button{border:0;border-radius:15px;background:linear-gradient(135deg,#ffd34e,#ff9447,#a82cff);color:#24041b;font-weight:1000}
      .jemmo-rt-search-result{margin-top:10px;display:grid;gap:8px}.jemmo-rt-user{width:100%;min-height:58px;padding:9px 10px;border:1px solid #5d2771;border-radius:16px;background:#16021d;color:#fff;text-align:left;display:grid;grid-template-columns:43px minmax(0,1fr);gap:10px;align-items:center}.jemmo-rt-user i{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#8e2db2,#251039);font-style:normal;font-weight:1000}.jemmo-rt-user b,.jemmo-rt-user small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jemmo-rt-user small{color:#c6b5cc;margin-top:3px}
      .jemmo-rt-help{padding:12px;border:1px dashed #663078;border-radius:15px;color:#c7b6cd;font-size:11px;line-height:1.45;text-align:center}.jemmo-rt-help.error{border-color:#9c3c51;color:#ffcbd3}
      .chat-row.jemmo-real{cursor:pointer}.chat-row.jemmo-real:active{transform:scale(.992)}
      .bubble.pending{opacity:.65}.bubble.failed{border-color:#ff4966!important}.bubble .delivery{margin-left:5px;color:#aee8ff;font-size:8px}
      .jemmo-rt-user-card{display:grid;gap:8px}.jemmo-rt-user-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.jemmo-rt-user-actions button,.jemmo-rt-user-actions a{min-height:42px;border:0;border-radius:13px;display:grid;place-items:center;text-decoration:none;font-weight:950;font-size:11px}.jemmo-rt-profile-link{background:#2b0a36;color:#fff;border:1px solid #71328a!important}.jemmo-rt-message-link{background:linear-gradient(135deg,#ffd34e,#ff9447,#a82cff);color:#24041b}.jemmo-rt-avatar-img{width:100%;height:100%;object-fit:cover;border-radius:inherit}.chat-mini-avatar.jemmo-profile-open{cursor:pointer}.jemmo-rt-user small em{display:block;margin-top:2px;color:#9e8ba7;font-style:normal}
      .jemmo-rt-verified{display:inline-grid;place-items:center;width:15px;height:15px;margin-left:4px;border-radius:50%;background:#318af6;color:#fff;font:1000 9px/1 sans-serif;vertical-align:1px;box-shadow:0 0 8px #318af677}
      .bubble.jemmo-message-gift{min-width:190px;padding:0;overflow:hidden;border-color:#9b7426;background:linear-gradient(145deg,#3b2508,#1b0a20)}.bubble.jemmo-message-gift.mine{background:linear-gradient(145deg,#704315,#5d2385);border-color:#ffd34e}.jemmo-message-gift-card{padding:12px;display:grid;grid-template-columns:48px minmax(0,1fr);gap:10px;align-items:center}.jemmo-message-gift-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:#120116aa;border:1px solid #ffd34e77;font-size:28px}.jemmo-message-gift-copy b,.jemmo-message-gift-copy span{display:block}.jemmo-message-gift-copy b{color:#ffe699;font-size:13px}.jemmo-message-gift-copy span{margin-top:3px;color:#eaddeb;font-size:10px}.bubble.jemmo-message-gift time{padding:0 10px 8px}
      .jemmo-message-gift-backdrop{position:fixed;z-index:2147483500;inset:0;display:grid;place-items:end center;padding:10px;background:#020003d9;backdrop-filter:blur(5px)}.jemmo-message-gift-backdrop[hidden]{display:none!important}.jemmo-message-gift-sheet{width:min(100%,510px);max-height:88svh;display:grid;grid-template-rows:auto auto auto minmax(160px,1fr) auto;overflow:hidden;border:1px solid #a044ba;border-radius:25px;background:linear-gradient(180deg,#2a0735,#0b000e);box-shadow:0 -22px 70px #000}.jemmo-message-gift-head{padding:13px 14px 10px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #5c2470}.jemmo-message-gift-head div{min-width:0;flex:1}.jemmo-message-gift-head small,.jemmo-message-gift-head strong{display:block}.jemmo-message-gift-head small{color:#ffd34e;font-size:9px;font-weight:1000;letter-spacing:.08em}.jemmo-message-gift-head strong{margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jemmo-message-gift-close{width:40px;height:40px;border:1px solid #713087;border-radius:13px;background:#390d45;color:#fff;font-size:24px}.jemmo-message-gift-wallet{padding:9px 13px;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#120218}.jemmo-message-gift-wallet span{color:#cdbdd2;font-size:10px}.jemmo-message-gift-wallet b{color:#ffd34e}.jemmo-message-gift-wallet button{min-height:34px;border:1px solid #886621;border-radius:11px;background:#362207;color:#ffe489;font-weight:950;font-size:9px}.jemmo-message-gift-quantities{display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:7px;padding:9px 12px}.jemmo-message-gift-quantity{min-height:39px;border:1px solid #5e2872;border-radius:12px;background:#16021d;color:#fff;font-weight:1000}.jemmo-message-gift-quantity.active{border-color:#ffd34e;background:linear-gradient(135deg,#ffd34e,#ff9447);color:#28051c}.jemmo-message-gift-grid{min-height:0;overflow:auto;padding:0 10px 10px;display:grid;grid-template-columns:repeat(4,1fr);gap:7px;align-content:start;scrollbar-width:none}.jemmo-message-gift-grid::-webkit-scrollbar{display:none}.jemmo-message-gift-item{min-height:82px;padding:7px 4px;border:1px solid #552269;border-radius:14px;background:#14021b;color:#fff;display:grid;place-items:center;text-align:center}.jemmo-message-gift-item span,.jemmo-message-gift-item b,.jemmo-message-gift-item small{display:block}.jemmo-message-gift-item span{font-size:27px}.jemmo-message-gift-item b{margin-top:3px;font-size:8px;line-height:1.15}.jemmo-message-gift-item small{color:#bcaac2;font-size:7px}.jemmo-message-gift-item.active{border-color:#ffd34e;background:linear-gradient(145deg,#472d0a,#30113b);box-shadow:0 0 12px #ffd34e33}.jemmo-message-gift-footer{padding:10px 12px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid #5a226d;background:#0d0111}.jemmo-message-gift-summary{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px;color:#d9c8de;font-size:10px}.jemmo-message-gift-summary b{color:#ffd34e}.jemmo-message-gift-send{width:100%;min-height:51px;border:0;border-radius:16px;background:linear-gradient(90deg,#ffd34e,#ff9447,#b72cff);color:#26041c;font-weight:1000}.jemmo-message-gift-send:disabled{opacity:.55}
      @media(max-width:370px){.jemmo-message-gift-grid{grid-template-columns:repeat(3,1fr)}.jemmo-message-gift-sheet{max-height:92svh}}
    `;
    document.head.appendChild(style);
  }

  function ensureStatus() {
    let status = $('jemmoRealtimeStatus');
    if (status) return status;
    status = document.createElement('div');
    status.id = 'jemmoRealtimeStatus';
    status.className = 'jemmo-rt-status';
    status.textContent = 'Conectando Mensajes con JEMMO LIVE…';
    const onlineBlock = document.querySelector('.online-block');
    if (onlineBlock) onlineBlock.insertBefore(status, onlineBlock.firstChild);
    else document.querySelector('.topbar')?.appendChild(status);
    return status;
  }

  function setStatus(message, type = '') {
    const status = ensureStatus();
    status.textContent = message;
    status.className = `jemmo-rt-status${type ? ` ${type}` : ''}`;
  }

  function ensureNewConversationDialog() {
    let backdrop = $('jemmoRealtimeNewConversation');
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = 'jemmoRealtimeNewConversation';
    backdrop.className = 'jemmo-rt-new-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="jemmo-rt-new-sheet" role="dialog" aria-modal="true" aria-labelledby="jemmoRtNewTitle">
        <header class="jemmo-rt-new-head"><strong id="jemmoRtNewTitle">Nuevo mensaje</strong><button class="jemmo-rt-new-close" id="jemmoRtNewClose" type="button" aria-label="Cerrar">×</button></header>
        <p>Busca por ID JEMMO o nombre de usuario. El correo de acceso permanece privado.</p>
        <form class="jemmo-rt-new-row" id="jemmoRtSearchForm">
          <input id="jemmoRtUserSearch" type="search" inputmode="search" autocomplete="off" maxlength="80" placeholder="JEMMO-1000001 o @usuario">
          <button type="submit">BUSCAR</button>
        </form>
        <div class="jemmo-rt-search-result" id="jemmoRtSearchResult"><div class="jemmo-rt-help">Escribe su ID JEMMO o nombre de usuario.</div></div>
      </section>`;
    document.body.appendChild(backdrop);

    $('jemmoRtNewClose')?.addEventListener('click', closeNewConversation);
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) closeNewConversation();
    });
    $('jemmoRtSearchForm')?.addEventListener('submit', event => {
      event.preventDefault();
      searchUser();
    });
    return backdrop;
  }

  function openNewConversation() {
    const dialog = ensureNewConversationDialog();
    dialog.hidden = false;
    const input = $('jemmoRtUserSearch');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 30);
    }
    const result = $('jemmoRtSearchResult');
    if (result) result.innerHTML = '<div class="jemmo-rt-help">Escribe su ID JEMMO o nombre de usuario.</div>';
  }

  function closeNewConversation() {
    const dialog = $('jemmoRealtimeNewConversation');
    if (dialog) dialog.hidden = true;
  }

  function formatJemmos(value) {
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    return window.JemmoWallet?.formatNumber ? window.JemmoWallet.formatNumber(amount) : amount.toLocaleString('es-ES');
  }

  function currentGift() {
    return MESSAGE_GIFT_CATALOG[state.giftSelection] || MESSAGE_GIFT_CATALOG[0];
  }

  function giftDialogVisible() {
    const dialog = $('jemmoMessageGiftDialog');
    return Boolean(dialog && !dialog.hidden);
  }

  function updateGiftDialog() {
    const dialog = $('jemmoMessageGiftDialog');
    if (!dialog) return;
    const gift = currentGift();
    const allowedQuantities = messageGiftQuantities(gift);
    const quantity = allowedQuantities.includes(state.giftQuantity) ? state.giftQuantity : 1;
    state.giftQuantity = quantity;
    const total = gift.cost * quantity;
    const wallet = window.JemmoWallet?.get?.();
    const balance = Math.max(0, Number(wallet?.jemmos ?? wallet?.coins) || 0);
    const balanceNode = $('jemmoMessageGiftBalance');
    if (balanceNode) balanceNode.textContent = `${formatJemmos(balance)} JEMMOS`;
    const selectedNode = $('jemmoMessageGiftSelected');
    if (selectedNode) selectedNode.textContent = `${gift.icon} ${gift.name} ×${quantity}`;
    const totalNode = $('jemmoMessageGiftTotal');
    if (totalNode) totalNode.textContent = `${formatJemmos(total)} JEMMOS`;
    dialog.querySelectorAll('[data-message-gift-index]').forEach(button => button.classList.toggle('active', Number(button.dataset.messageGiftIndex) === state.giftSelection));
    const quantityBox = $('jemmoMessageGiftQuantities');
    if (quantityBox) quantityBox.innerHTML = allowedQuantities.map(value => `<button class="jemmo-message-gift-quantity${value === quantity ? ' active' : ''}" data-message-gift-quantity="${value}" type="button">×${value}</button>`).join('');
    const send = $('jemmoMessageGiftSend');
    if (send) {
      send.disabled = state.giftBusy || state.blockedByMe;
      send.textContent = state.giftBusy ? 'REGISTRANDO…' : `ENVIAR A ${String(state.currentPeer?.name || 'USUARIO').toLocaleUpperCase('es')}`;
    }
  }

  function ensureGiftDialog() {
    let backdrop = $('jemmoMessageGiftDialog');
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = 'jemmoMessageGiftDialog';
    backdrop.className = 'jemmo-message-gift-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="jemmo-message-gift-sheet" role="dialog" aria-modal="true" aria-labelledby="jemmoMessageGiftTitle">
        <header class="jemmo-message-gift-head"><div><small>REGALO PRIVADO · MÁXIMO 5.000.000</small><strong id="jemmoMessageGiftTitle">Enviar regalo</strong></div><button class="jemmo-message-gift-close" id="jemmoMessageGiftClose" type="button" aria-label="Cerrar">×</button></header>
        <div class="jemmo-message-gift-wallet"><span>Saldo: <b id="jemmoMessageGiftBalance">0 JEMMOS</b></span><button id="jemmoMessageGiftRecharge" type="button">RECARGAR</button></div>
        <div class="jemmo-message-gift-quantities" id="jemmoMessageGiftQuantities"></div>
        <div class="jemmo-message-gift-grid">${MESSAGE_GIFT_CATALOG.map((gift,index) => `<button class="jemmo-message-gift-item${index === 0 ? ' active' : ''}" data-message-gift-index="${index}" type="button"><span>${gift.icon}</span><b>${esc(gift.name)}</b><small>${formatJemmos(gift.cost)} J</small></button>`).join('')}</div>
        <footer class="jemmo-message-gift-footer"><div class="jemmo-message-gift-summary"><span id="jemmoMessageGiftSelected">🌹 Rosa JEMMO ×1</span><b id="jemmoMessageGiftTotal">10 JEMMOS</b></div><button class="jemmo-message-gift-send" id="jemmoMessageGiftSend" type="button">ENVIAR REGALO</button></footer>
      </section>`;
    document.body.appendChild(backdrop);
    $('jemmoMessageGiftClose')?.addEventListener('click', () => closeMessageGiftDialog({ useHistory: true }));
    $('jemmoMessageGiftRecharge')?.addEventListener('click', () => window.JemmoWallet?.openRecharge?.());
    $('jemmoMessageGiftSend')?.addEventListener('click', sendCurrentGift);
    backdrop.addEventListener('click', event => { if (event.target === backdrop) closeMessageGiftDialog({ useHistory: true }); });
    backdrop.querySelectorAll('[data-message-gift-index]').forEach(button => button.addEventListener('click', () => { state.giftSelection = Number(button.dataset.messageGiftIndex) || 0; state.giftQuantity = 1; updateGiftDialog(); }));
    $('jemmoMessageGiftQuantities')?.addEventListener('click', event => { const button = event.target.closest('[data-message-gift-quantity]'); if (!button) return; const quantity = Number(button.dataset.messageGiftQuantity) || 1; if (!messageGiftQuantities(currentGift()).includes(quantity)) return; state.giftQuantity = quantity; updateGiftDialog(); });
    return backdrop;
  }

  function openMessageGiftDialog() {
    if (!state.currentConversationId || !state.currentPeer) { toast('Abre una conversación para enviar un regalo.'); return; }
    if (state.blockedByMe) { toast('Desbloquea a esta persona antes de enviar regalos.'); return; }
    if (!window.JemmoWallet?.spendCoins) { toast('El monedero todavía se está preparando. Vuelve a intentarlo en unos segundos.'); return; }
    const dialog = ensureGiftDialog();
    $('jemmoMessageGiftTitle').textContent = `Regalo para ${state.currentPeer.name}`;
    dialog.hidden = false;
    updateGiftDialog();
    if (!history.state?.jemmoMessageGift) {
      history.pushState({ ...(history.state || {}), jemmoMessageGift: true }, '', location.href);
      state.giftHistoryOpen = true;
    }
  }

  function closeMessageGiftDialog({ useHistory = false } = {}) {
    const dialog = $('jemmoMessageGiftDialog');
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    state.giftBusy = false;
    updateGiftDialog();
    if (useHistory && history.state?.jemmoMessageGift) {
      state.ignoreGiftPop = true;
      history.back();
    }
  }

  async function sendCurrentGift() {
    if (state.giftBusy || !state.currentConversationId || !state.currentPeer || !state.user || !state.sdk) return;
    if (state.blockedByMe) { toast('Desbloquea a esta persona antes de enviar regalos.'); return; }
    if (String(state.currentPeer.uid || '') === String(state.user.uid || '')) { toast('No puedes enviarte regalos a ti mismo.'); return; }
    const gift = currentGift();
    const allowedQuantities = messageGiftQuantities(gift);
    const quantity = allowedQuantities.includes(state.giftQuantity) ? state.giftQuantity : 1;
    if (!allowedQuantities.includes(state.giftQuantity)) { state.giftQuantity = 1; updateGiftDialog(); toast('Cantidad ajustada a ×1 para proteger el límite de 5.000.000 JEMMOS.'); }
    const total = gift.cost * quantity;
    const walletApi = window.JemmoWallet;
    if (!walletApi?.spendCoins) { toast('El monedero todavía no está disponible.'); return; }
    const wallet = walletApi.get?.();
    const balance = Math.max(0, Number(wallet?.jemmos ?? wallet?.coins) || 0);
    if (balance < total) {
      toast(`Saldo insuficiente. Faltan ${formatJemmos(total - balance)} JEMMOS.`);
      walletApi.openRecharge?.();
      return;
    }
    const accepted = confirm(`¿Enviar ${gift.icon} ${gift.name} ×${quantity} a ${state.currentPeer.name} por ${formatJemmos(total)} JEMMOS?`);
    if (!accepted) return;
    state.giftBusy = true;
    updateGiftDialog();
    const idempotencyKey = `messages:${state.currentConversationId}:${state.user.uid}:${state.currentPeer.uid}:${gift.name}:${quantity}:${Math.floor(Date.now() / 5000)}`;
    const result = walletApi.spendCoins(total, {
      recipientUid: state.currentPeer.uid,
      recipientName: state.currentPeer.name,
      giftName: gift.name,
      title: 'Regalo enviado por Mensajes',
      detail: `${gift.icon} ${gift.name} ×${quantity} para ${state.currentPeer.name}`,
      context: 'MENSAJES',
      source: 'message-gift',
      reference: state.currentConversationId,
      idempotencyKey
    });
    if (!result.ok) {
      state.giftBusy = false;
      updateGiftDialog();
      if (result.blocked || result.reason === 'self-gift') toast('No puedes enviarte regalos a ti mismo.');
      else if (result.duplicate) toast('Doble toque bloqueado: este regalo ya se registró.');
      else { toast(`Saldo insuficiente. Faltan ${formatJemmos(result.missing)} JEMMOS.`); walletApi.openRecharge?.(); }
      return;
    }

    const conversation = state.conversations.find(item => item.id === state.currentConversationId);
    if (!conversation) { state.giftBusy = false; updateGiftDialog(); toast('No se encontró la conversación.'); return; }
    const { doc, collection, writeBatch, serverTimestamp, increment, FieldPath } = state.sdk.firestore;
    const conversationReference = doc(state.db, 'conversaciones', state.currentConversationId);
    const messageReference = doc(collection(conversationReference, 'mensajes'));
    const participants = Array.isArray(conversation.data?.participants) ? conversation.data.participants : [];
    const recipientUids = participants.filter(uid => uid !== state.user.uid);
    const preview = `🎁 ${gift.name} ×${quantity}`;
    try {
      const batch = writeBatch(state.db);
      batch.set(messageReference, {
        senderId: state.user.uid,
        recipientId: state.currentPeer.uid,
        type: 'gift',
        text: preview,
        gift: { icon: gift.icon, name: gift.name, unitCost: gift.cost, quantity, total, operationId: result.operationId },
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now(),
        version: 4
      });
      const updateFields = [
        'lastMessage', preview,
        'lastMessageAt', serverTimestamp(),
        'lastSenderId', state.user.uid,
        'updatedAt', serverTimestamp(),
        new FieldPath('unreadBy', state.user.uid), 0,
        'version', 4
      ];
      recipientUids.forEach(uid => updateFields.push(new FieldPath('unreadBy', uid), increment(1)));
      batch.update(conversationReference, ...updateFields);
      await batch.commit();
      closeMessageGiftDialog({ useHistory: true });
      toast(`${gift.name} ×${quantity} enviado a ${state.currentPeer.name}.`);
    } catch (error) {
      console.warn('[JEMMO regalos Mensajes] No se pudo registrar la conversación.', error);
      try { walletApi.addCoins?.(total, { type: 'gift-refund', title: 'Devolución de regalo no entregado', detail: `${gift.name} ×${quantity}`, source: 'message-gift-refund' }); } catch {}
      state.giftBusy = false;
      updateGiftDialog();
      toast('El regalo no llegó a la conversación. Los JEMMOS se devolvieron.', 5200);
    }
  }

  function peerData(conversation) {
    const data = conversation?.data || {};
    const participants = Array.isArray(data.participants) ? data.participants : [];
    const peerUid = participants.find(uid => uid !== state.user?.uid) || state.user?.uid || '';
    const profile = data.participantProfiles?.[peerUid] || {};
    const fallback = peerUid === state.user?.uid ? state.profile : null;
    const name = String(profile.name || profile.displayName || fallback?.name || 'Usuario JEMMO');
    return {
      uid: peerUid,
      name,
      publicId: String(profile.publicId || profile.profileId || fallback?.publicId || ''),
      username: String(profile.username || fallback?.username || ''),
      avatarData: String(profile.avatarData || fallback?.avatarData || ''),
      country: String(profile.country || fallback?.country || ''),
      city: String(profile.city || fallback?.city || ''),
      bio: String(profile.bio || fallback?.bio || ''),
      verified: Boolean(profile.verified || fallback?.verified || ['ruth','ru'].includes(name.trim().toLocaleLowerCase('es')) || String(profile.username || fallback?.username || '').replace(/^@/, '').toLocaleLowerCase('es') === 'ruth'),
      initial: initials(name),
      type: String(data.type || 'direct')
    };
  }

  function conversationUnread(conversation) {
    return Math.max(0, Number(conversation?.data?.unreadBy?.[state.user?.uid]) || 0);
  }

  function renderOnlinePeople() {
    const onlineList = $('onlineList');
    const headStrong = document.querySelector('.online-block .section-head strong');
    const headSpan = document.querySelector('.online-block .section-head span');
    if (headStrong) headStrong.textContent = 'Personas que sigues';
    if (headSpan) headSpan.textContent = 'Perfiles reales de tu comunidad';
    if (!onlineList) return;

    onlineList.innerHTML = '';
    const profiles = state.followingProfiles || [];
    profiles.slice(0, 10).forEach(profile => {
      const button = document.createElement('button');
      button.className = 'btn online-person';
      button.type = 'button';
      const avatar = profile.avatarData
        ? `<img class="jemmo-rt-avatar-img" src="${esc(profile.avatarData)}" alt="">`
        : esc(initials(profile.name));
      const dot = profile.uid === state.socialApi?.CHILI_UID ? '<span class="online-dot"></span>' : '';
      button.innerHTML = `<span class="avatar-wrap"><span class="avatar" style="--a1:#6f2290;--a2:#190322">${avatar}</span>${dot}</span><b>${esc(profile.name)}</b>`;
      button.addEventListener('click', () => {
        if (profile.uid === state.socialApi?.CHILI_UID) location.href = 'chili-ia.html';
        else location.href = `perfil-publico.html?uid=${encodeURIComponent(profile.uid)}`;
      });
      onlineList.appendChild(button);
    });

    if (!profiles.length) {
      onlineList.innerHTML = '<div class="jemmo-rt-help" style="width:100%">Todavía no sigues a nadie. Abre un perfil y pulsa SEGUIR, o comienza siguiendo a Chili IA.</div>';
    }
  }

  function conversationRow(conversation) {
    const data = conversation.data || {};
    const peer = peerData(conversation);
    const unread = conversationUnread(conversation);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-row jemmo-real';
    button.dataset.conversationId = conversation.id;
    const avatar = peer.avatarData
      ? `<img class="jemmo-rt-avatar-img" src="${esc(peer.avatarData)}" alt="">`
      : esc(peer.initial);
    button.innerHTML = `
      <span class="row-avatar round" style="--a1:#75239a;--a2:#190322;--accent:#a943ff">${avatar}</span>
      <span class="row-copy"><span class="row-name"><strong>${esc(peer.name)}${peer.verified ? ' <i class="jemmo-rt-verified" aria-label="Cuenta verificada">✓</i>' : ''}</strong></span><p>${esc(data.lastSenderId === state.user.uid && data.lastMessage ? `Tú: ${data.lastMessage}` : (data.lastMessage || 'Conversación creada.'))}</p></span>
      <span class="row-side"><time>${esc(formatTime(data.lastMessageAt || data.updatedAt || data.createdAt))}</time>${unread ? `<span class="unread">${unread > 99 ? '99+' : unread}</span>` : ''}</span>`;
    button.addEventListener('click', () => openConversation(conversation.id));
    return button;
  }

  function renderConversations() {
    const pinnedList = $('pinnedList');
    const allList = $('allChatsList');
    if (!pinnedList || !allList) return;

    pinnedList.innerHTML = '<div class="empty"><b>Mensajería real activa</b>Las conversaciones nuevas aparecen debajo y se actualizan al instante.</div>';
    allList.innerHTML = '';

    const filter = state.search.trim().toLocaleLowerCase('es');
    const visible = state.conversations.filter(conversation => {
      if (!filter) return true;
      const peer = peerData(conversation);
      const data = conversation.data || {};
      return `${peer.name} ${peer.username} ${peer.publicId} ${data.lastMessage || ''}`.toLocaleLowerCase('es').includes(filter);
    });

    if (!visible.length) {
      allList.innerHTML = `<div class="empty"><b>${state.search ? 'Sin resultados' : 'No hay conversaciones todavía'}</b>${state.search ? 'Prueba con otra ID o nombre de usuario.' : 'Pulsa ＋ y busca a una persona por su ID JEMMO o nombre de usuario.'}</div>`;
    } else {
      visible.forEach(conversation => allList.appendChild(conversationRow(conversation)));
    }

    renderOnlinePeople();
  }

  function renderMessages(messageDocuments) {
    const area = $('messagesArea');
    if (!area) return;
    area.innerHTML = '<div class="day">CONVERSACIÓN PRIVADA · JEMMO LIVE · PRUEBA</div>';

    if (!messageDocuments.length) {
      const empty = document.createElement('div');
      empty.className = 'bubble system';
      empty.textContent = 'No hay mensajes todavía. Escribe el primero.';
      area.appendChild(empty);
    }

    for (const messageDocument of messageDocuments) {
      const data = messageDocument.data || {};
      const bubble = document.createElement('div');
      const mine = data.senderId === state.user.uid;
      bubble.className = `bubble ${mine ? 'mine' : 'theirs'}`;
      const time = formatTime(data.createdAt || data.clientCreatedAt);
      if (data.type === 'gift' && data.gift) {
        const gift = data.gift || {};
        bubble.classList.add('jemmo-message-gift');
        const direction = mine ? `Para ${state.currentPeer?.name || 'usuario'}` : `Regalo recibido`;
        bubble.innerHTML = `<div class="jemmo-message-gift-card"><span class="jemmo-message-gift-icon">${esc(gift.icon || '🎁')}</span><span class="jemmo-message-gift-copy"><b>${esc(gift.name || 'Regalo')} ×${Math.max(1, Number(gift.quantity) || 1)}</b><span>${esc(direction)} · ${formatJemmos(gift.total || 0)} JEMMOS</span></span></div><time>${esc(time)}${mine ? '<span class="delivery">✓</span>' : ''}</time>`;
      } else {
        bubble.innerHTML = `${esc(data.text || '')}<time>${esc(time)}${mine ? '<span class="delivery">✓</span>' : ''}</time>`;
      }
      area.appendChild(bubble);
    }

    requestAnimationFrame(() => { area.scrollTop = area.scrollHeight; });
  }

  async function markConversationRead(conversationId) {
    if (!conversationId || !state.user || !state.sdk) return;
    const { doc, updateDoc, FieldPath } = state.sdk.firestore;
    try {
      await updateDoc(
        doc(state.db, 'conversaciones', conversationId),
        new FieldPath('unreadBy', state.user.uid), 0,
        'lastReadAt', state.sdk.firestore.serverTimestamp()
      );
    } catch (error) {
      if (error?.code !== 'not-found') console.warn('[JEMMO mensajes] No se pudo marcar como leído.', error);
    }
  }

  async function openConversation(conversationId) {
    const conversation = state.conversations.find(item => item.id === conversationId);
    if (!conversation || !state.user || !state.sdk) return;

    if (state.messagesStop) {
      state.messagesStop();
      state.messagesStop = null;
    }

    state.currentConversationId = conversationId;
    const peer = peerData(conversation);
    state.currentPeer = peer;
    const inbox = $('inboxView');
    const chatView = $('chatView');
    if (inbox) inbox.classList.add('hidden');
    if (chatView) chatView.classList.remove('hidden');
    if ($('chatName')) $('chatName').innerHTML = `${esc(peer.name)}${peer.verified ? ' <i class="jemmo-rt-verified" aria-label="Cuenta verificada">✓</i>' : ''}`;
    if ($('chatStatus')) {
      $('chatStatus').textContent = peer.publicId || (peer.username ? `@${peer.username}` : 'Conversación JEMMO');
      $('chatStatus').classList.remove('online');
    }
    if ($('chatAvatar')) {
      const avatar = $('chatAvatar');
      avatar.classList.add('jemmo-profile-open');
      avatar.innerHTML = peer.avatarData
        ? `<img class="jemmo-rt-avatar-img" src="${esc(peer.avatarData)}" alt="">`
        : esc(peer.initial);
      avatar.onclick = () => { location.href = `perfil-publico.html?uid=${encodeURIComponent(peer.uid)}`; };
      avatar.setAttribute('aria-label', `Abrir perfil de ${peer.name}`);
      avatar.setAttribute('role', 'button');
    }
    renderMessages([]);

    if (!history.state?.jemmoRealtimeConversation || history.state.jemmoRealtimeConversation !== conversationId) {
      history.pushState({ ...(history.state || {}), jemmoRealtimeConversation: conversationId }, '', location.href);
      state.historyGuard = true;
    }

    await refreshBlockState(peer.uid);
    await markConversationRead(conversationId);

    const { collection, query, orderBy, limit, onSnapshot, doc } = state.sdk.firestore;
    const conversationReference = doc(state.db, 'conversaciones', conversationId);
    const messagesQuery = query(
      collection(conversationReference, 'mensajes'),
      orderBy('createdAt', 'asc'),
      limit(250)
    );

    state.messagesStop = onSnapshot(messagesQuery, snapshot => {
      const messages = snapshot.docs.map(documentSnapshot => ({
        id: documentSnapshot.id,
        data: documentSnapshot.data()
      }));
      renderMessages(messages);
      updateComposerState();
      markConversationRead(conversationId);
    }, error => {
      console.warn('[JEMMO mensajes] No se pudo abrir la conversación.', error);
      renderMessages([]);
      toast(firebaseErrorMessage(error), 5200);
    });

    setTimeout(() => $('messageInput')?.focus(), 60);
    if (state.pendingGiftFromUrl && !state.giftUrlConsumed) {
      state.giftUrlConsumed = true;
      setTimeout(openMessageGiftDialog, 260);
    }
  }

  function closeConversation({ useHistory = false } = {}) {
    if (giftDialogVisible()) closeMessageGiftDialog({ useHistory: false });
    if (state.messagesStop) {
      state.messagesStop();
      state.messagesStop = null;
    }
    state.currentConversationId = '';
    state.currentPeer = null;
    state.blockedByMe = false;
    updateComposerState();
    const inbox = $('inboxView');
    const chatView = $('chatView');
    if (chatView) chatView.classList.add('hidden');
    if (inbox) inbox.classList.remove('hidden');
    renderConversations();

    if (useHistory && history.state?.jemmoRealtimeConversation) {
      state.historyGuard = false;
      history.back();
    }
  }

  async function sendCurrentMessage() {
    const input = $('messageInput');
    const text = String(input?.value || '').trim();
    if (!text || !state.currentConversationId || !state.user || !state.sdk) return;
    if (state.blockedByMe) { toast('Desbloquea a esta persona antes de enviar mensajes.'); return; }
    if (text.length > 1000) {
      toast('El mensaje supera el máximo de 1.000 caracteres.');
      return;
    }

    const conversation = state.conversations.find(item => item.id === state.currentConversationId);
    if (!conversation) {
      toast('No se encontró la conversación. Vuelve a abrirla.');
      return;
    }

    input.disabled = true;
    const { doc, collection, writeBatch, serverTimestamp, increment, FieldPath } = state.sdk.firestore;
    const conversationReference = doc(state.db, 'conversaciones', state.currentConversationId);
    const messageReference = doc(collection(conversationReference, 'mensajes'));
    const participants = Array.isArray(conversation.data?.participants) ? conversation.data.participants : [];
    const recipientUids = participants.filter(uid => uid !== state.user.uid);

    try {
      const batch = writeBatch(state.db);
      batch.set(messageReference, {
        senderId: state.user.uid,
        text,
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now(),
        version: 4
      });

      const updateFields = [
        'lastMessage', text,
        'lastMessageAt', serverTimestamp(),
        'lastSenderId', state.user.uid,
        'updatedAt', serverTimestamp(),
        new FieldPath('unreadBy', state.user.uid), 0
      ];
      recipientUids.forEach(uid => {
        updateFields.push(new FieldPath('unreadBy', uid), increment(1));
      });
      batch.update(conversationReference, ...updateFields);
      await batch.commit();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (error) {
      console.warn('[JEMMO mensajes] Error al enviar.', error);
      toast(firebaseErrorMessage(error), 5200);
    } finally {
      input.disabled = false;
      updateComposerState();
      if (!state.blockedByMe) input.focus();
    }
  }

  async function markAllRead() {
    if (!state.user || !state.sdk || !state.conversations.length) {
      toast('No hay mensajes pendientes.');
      return;
    }

    const { doc, writeBatch, FieldPath, serverTimestamp } = state.sdk.firestore;
    try {
      const batch = writeBatch(state.db);
      state.conversations.forEach(conversation => {
        batch.update(
          doc(state.db, 'conversaciones', conversation.id),
          new FieldPath('unreadBy', state.user.uid), 0,
          'lastReadAt', serverTimestamp()
        );
      });
      await batch.commit();
      toast('Todos los mensajes quedaron marcados como leídos.');
    } catch (error) {
      toast(firebaseErrorMessage(error), 5200);
    }
  }

  async function searchUser() {
    const result = $('jemmoRtSearchResult');
    const raw = String($('jemmoRtUserSearch')?.value || '').trim();
    if (!result) return;
    if (!raw) {
      result.innerHTML = '<div class="jemmo-rt-help error">Escribe una ID JEMMO o nombre de usuario.</div>';
      return;
    }
    if (!state.user || !state.sdk) {
      result.innerHTML = '<div class="jemmo-rt-help error">La sesión todavía no está disponible.</div>';
      return;
    }

    result.innerHTML = '<div class="jemmo-rt-help">Buscando perfil en JEMMO LIVE…</div>';
    const { doc, getDoc, collection, query, where, limit, getDocs } = state.sdk.firestore;

    async function firstMatch(collectionName, field, value) {
      const matches = await getDocs(query(
        collection(state.db, collectionName),
        where(field, '==', value),
        limit(2)
      ));
      return matches.docs[0] || null;
    }

    try {
      const lower = raw.toLocaleLowerCase('es');
      const normalizedPublicId = state.publicIdApi?.normalizePublicId(raw) || '';
      const username = lower.replace(/^@+/, '');
      let targetSnapshot = null;

      if (normalizedPublicId) {
        targetSnapshot = await firstMatch('directorioMensajes', 'publicIdLower', normalizedPublicId.toLocaleLowerCase('es'));
      }
      if (!targetSnapshot && username) {
        targetSnapshot = await firstMatch('directorioMensajes', 'usernameLower', username)
          || await firstMatch('directorioMensajes', 'displayNameLower', lower)
          || await firstMatch('directorioMensajes', 'nameLower', lower);
      }

      if (!targetSnapshot) {
        result.innerHTML = '<div class="jemmo-rt-help error">No aparece ese perfil. Comprueba la ID JEMMO o el nombre de usuario.</div>';
        return;
      }
      if (targetSnapshot.id === state.user.uid) {
        result.innerHTML = '<div class="jemmo-rt-help error">No puedes iniciar una conversación contigo mismo.</div>';
        return;
      }

      const target = normalizedUserProfile(targetSnapshot.id, targetSnapshot.data() || {});
      result.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'jemmo-rt-user-card';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jemmo-rt-user';
      const avatar = target.avatarData
        ? `<img class="jemmo-rt-avatar-img" src="${esc(target.avatarData)}" alt="">`
        : esc(initials(target.name));
      const usernameText = target.username ? `@${target.username}` : target.publicId;
      const place = [target.country, target.city].filter(Boolean).join(' · ');
      button.innerHTML = `<i>${avatar}</i><span><b>${esc(target.name)}</b><small>${esc(usernameText || target.publicId)}${target.publicId && usernameText !== target.publicId ? `<em>${esc(target.publicId)}</em>` : ''}${place ? `<em>${esc(place)}</em>` : ''}</small></span>`;
      button.addEventListener('click', () => { location.href = `perfil-publico.html?uid=${encodeURIComponent(target.uid)}`; });
      card.appendChild(button);

      const actions = document.createElement('div');
      actions.className = 'jemmo-rt-user-actions';
      const profileLink = document.createElement('a');
      profileLink.className = 'jemmo-rt-profile-link';
      profileLink.href = `perfil-publico.html?uid=${encodeURIComponent(target.uid)}`;
      profileLink.textContent = 'VER PERFIL';
      const messageButton = document.createElement('button');
      messageButton.type = 'button';
      messageButton.className = 'jemmo-rt-message-link';
      messageButton.textContent = 'MENSAJE';
      messageButton.addEventListener('click', async () => {
        messageButton.disabled = true;
        try {
          const conversationId = await ensureDirectConversation(target);
          closeNewConversation();
          await waitForConversation(conversationId);
          openConversation(conversationId);
        } catch (error) {
          console.warn('[JEMMO mensajes] No se pudo crear la conversación.', error);
          result.innerHTML = `<div class="jemmo-rt-help error">${esc(firebaseErrorMessage(error))}</div>`;
        } finally {
          messageButton.disabled = false;
        }
      });
      actions.append(profileLink, messageButton);
      card.append(actions);
      result.appendChild(card);
    } catch (error) {
      console.warn('[JEMMO mensajes] Error al buscar usuario.', error);
      result.innerHTML = `<div class="jemmo-rt-help error">${esc(firebaseErrorMessage(error))}</div>`;
    }
  }

  function normalizedUserProfile(uid, data) {
    const name = String(data.displayName || data.nombre || data.name || 'Usuario JEMMO').trim();
    return {
      uid,
      name,
      publicId: String(data.publicId || data.profileId || '').trim(),
      username: String(data.username || '').trim(),
      bio: String(data.bio || '').trim(),
      country: String(data.country || '').trim(),
      city: String(data.city || '').trim(),
      avatarData: String(data.avatarData || ''),
      coverData: String(data.coverData || ''),
      verified: Boolean(data.verified || data.isVerified || ['ruth','ru'].includes(name.toLocaleLowerCase('es')) || String(data.username || '').replace(/^@/, '').toLocaleLowerCase('es') === 'ruth'),
      level: Math.max(1, Number(data.level) || 1)
    };
  }

  async function ensureCurrentUserDocument() {
    const { doc, getDoc, setDoc, updateDoc, serverTimestamp, FieldPath } = state.sdk.firestore;
    let cloudData = {};
    try {
      const snapshot = await getDoc(doc(state.db, 'users', state.user.uid));
      if (snapshot.exists()) cloudData = snapshot.data() || {};
    } catch (error) {
      console.warn('[JEMMO mensajes] No se pudo leer el perfil principal.', error);
    }

    let localData = {};
    try {
      localData = JSON.parse(localStorage.getItem(`jemmo_profile_v1_${state.user.uid}`) || '{}') || {};
    } catch {}

    const assigned = await state.publicIdApi.ensurePublicId(state.user, state.db);
    const profile = normalizedUserProfile(state.user.uid, {
      ...cloudData,
      displayName: localData.name || cloudData.displayName || state.user.displayName,
      username: localData.username || cloudData.username,
      bio: localData.bio || cloudData.bio,
      country: localData.country || cloudData.country,
      city: localData.city || cloudData.city,
      publicId: assigned.publicId,
      avatarData: cloudData.avatarData,
      coverData: cloudData.coverData,
      verified: localData.verified ?? cloudData.verified,
      level: localData.level || cloudData.level
    });
    profile.publicId = assigned.publicId;
    state.profile = profile;

    await Promise.all([
      setDoc(doc(state.db, 'users', state.user.uid), {
        uid: state.user.uid,
        email: String(state.user.email || ''),
        emailLower: String(state.user.email || '').toLocaleLowerCase('es'),
        publicId: profile.publicId,
        publicIdLower: profile.publicId.toLocaleLowerCase('es'),
        publicIdNumber: assigned.publicIdNumber,
        profileId: profile.publicId,
        displayName: profile.name,
        displayNameLower: profile.name.toLocaleLowerCase('es'),
        name: profile.name,
        nameLower: profile.name.toLocaleLowerCase('es'),
        username: profile.username,
        usernameLower: profile.username.toLocaleLowerCase('es'),
        bio: profile.bio,
        country: profile.country,
        city: profile.city,
        publicProfileEnabled: true,
        messagesEnabled: true,
        messagesVersion: 4,
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(state.db, 'directorioMensajes', state.user.uid), {
        uid: state.user.uid,
        email: state.sdk.firestore.deleteField(),
        emailLower: state.sdk.firestore.deleteField(),
        publicId: profile.publicId,
        publicIdLower: profile.publicId.toLocaleLowerCase('es'),
        publicIdNumber: assigned.publicIdNumber,
        profileId: profile.publicId,
        nombre: profile.name,
        displayName: profile.name,
        displayNameLower: profile.name.toLocaleLowerCase('es'),
        name: profile.name,
        nameLower: profile.name.toLocaleLowerCase('es'),
        username: profile.username,
        usernameLower: profile.username.toLocaleLowerCase('es'),
        bio: profile.bio,
        country: profile.country,
        city: profile.city,
        avatarData: profile.avatarData,
        coverData: profile.coverData,
        publicProfileEnabled: true,
        messagesEnabled: true,
        messagesVersion: 4,
        ultimaActividad: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    ]);
  }

  async function ensureDirectConversation(target) {
    const { doc, getDoc, setDoc, updateDoc, serverTimestamp, FieldPath } = state.sdk.firestore;
    const ownBlockRef = doc(state.db, 'bloqueos', `${state.user.uid}__${target.uid}`);
    const ownBlock = await getDoc(ownBlockRef);
    if (ownBlock.exists() && ownBlock.data()?.active !== false) throw new Error('jemmo-user-blocked-by-me');
    const participants = [state.user.uid, target.uid].sort();
    const conversationId = participants.join('__');
    const reference = doc(state.db, 'conversaciones', conversationId);
    const snapshot = await getDoc(reference);
    const participantProfiles = {
      [state.user.uid]: {
        name: state.profile.name,
        publicId: state.profile.publicId,
        username: state.profile.username || '',
        avatarData: state.profile.avatarData || '',
        country: state.profile.country || '',
        city: state.profile.city || '',
        bio: state.profile.bio || ''
      },
      [target.uid]: {
        name: target.name,
        publicId: target.publicId,
        username: target.username || '',
        avatarData: target.avatarData || '',
        country: target.country || '',
        city: target.city || '',
        bio: target.bio || ''
      }
    };

    if (!snapshot.exists()) {
      await setDoc(reference, {
        type: 'direct',
        participants,
        participantProfiles,
        unreadBy: {
          [state.user.uid]: 0,
          [target.uid]: 0
        },
        lastMessage: '',
        lastSenderId: '',
        createdBy: state.user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 4
      });
    } else {
      await updateDoc(
        reference,
        new FieldPath('participantProfiles', state.user.uid), participantProfiles[state.user.uid],
        'updatedAt', serverTimestamp(),
        'version', 4
      );
    }
    return conversationId;
  }

  function waitForConversation(conversationId, timeoutMs = 4500) {
    if (state.conversations.some(item => item.id === conversationId)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (state.conversations.some(item => item.id === conversationId)) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(timer);
          reject(new Error('La conversación se creó, pero todavía no llegó a la bandeja. Vuelve a pulsar Mensajes.'));
        }
      }, 100);
    });
  }


  function blockDocumentId(ownerUid, targetUid) {
    return `${ownerUid}__${targetUid}`;
  }

  function updateComposerState() {
    const input = $('messageInput');
    const submit = $('messageForm')?.querySelector('button[type="submit"]');
    if (input) {
      input.disabled = Boolean(state.blockedByMe);
      input.placeholder = state.blockedByMe ? 'Usuario bloqueado' : 'Escribe un mensaje…';
    }
    if (submit) submit.disabled = Boolean(state.blockedByMe);
    const giftButton = $('messageGiftButton');
    if (giftButton) giftButton.disabled = Boolean(state.blockedByMe || !state.currentConversationId);
    const area = $('messagesArea');
    area?.querySelector('.jemmo-blocked-note')?.remove();
    if (state.blockedByMe && area) {
      const note = document.createElement('div');
      note.className = 'jemmo-blocked-note';
      note.textContent = 'Has bloqueado a esta persona. No podéis intercambiar mensajes mientras el bloqueo siga activo.';
      area.appendChild(note);
    }
  }

  async function refreshBlockState(targetUid) {
    if (!state.user || !state.sdk || !targetUid) return false;
    const { doc, getDoc } = state.sdk.firestore;
    try {
      const snapshot = await getDoc(doc(state.db, 'bloqueos', blockDocumentId(state.user.uid, targetUid)));
      state.blockedByMe = snapshot.exists() && snapshot.data()?.active !== false;
    } catch (error) {
      console.warn('[JEMMO seguridad] No se pudo consultar el bloqueo.', error);
      state.blockedByMe = false;
    }
    updateComposerState();
    return state.blockedByMe;
  }

  function closeSecurityDialog() {
    const dialog = $('jemmoSecurityDialog');
    if (dialog) dialog.hidden = true;
  }

  async function toggleCurrentBlock() {
    const peer = state.currentPeer;
    if (!peer || !state.user || !state.sdk) return;
    const { doc, setDoc, deleteDoc, serverTimestamp } = state.sdk.firestore;
    const reference = doc(state.db, 'bloqueos', blockDocumentId(state.user.uid, peer.uid));
    try {
      if (state.blockedByMe) {
        await deleteDoc(reference);
        state.blockedByMe = false;
        toast(`${peer.name} ha sido desbloqueado.`);
      } else {
        const accepted = confirm(`¿Bloquear a ${peer.name}? No podréis enviaros mensajes hasta que lo desbloquees.`);
        if (!accepted) return;
        await setDoc(reference, {
          ownerUid: state.user.uid,
          blockedUid: peer.uid,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          version: 1
        });
        state.blockedByMe = true;
        toast(`${peer.name} ha sido bloqueado.`);
      }
      updateComposerState();
      closeSecurityDialog();
    } catch (error) {
      toast(firebaseErrorMessage(error), 5200);
    }
  }

  async function reportCurrentPeer(reason) {
    const peer = state.currentPeer;
    if (!peer || !state.user || !state.sdk) return;
    const { collection, addDoc, serverTimestamp } = state.sdk.firestore;
    try {
      await addDoc(collection(state.db, 'denuncias'), {
        reporterUid: state.user.uid,
        targetUid: peer.uid,
        conversationId: state.currentConversationId || '',
        reason: String(reason || 'otro').slice(0, 40),
        status: 'pending',
        createdAt: serverTimestamp(),
        version: 1
      });
      toast('Denuncia enviada para revisión.');
      closeSecurityDialog();
    } catch (error) {
      toast(firebaseErrorMessage(error), 5200);
    }
  }

  function openSecurityDialog() {
    const peer = state.currentPeer;
    if (!peer) {
      toast('Abre una conversación para ver sus opciones.');
      return;
    }
    let backdrop = $('jemmoSecurityDialog');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'jemmoSecurityDialog';
      backdrop.className = 'jemmo-security-backdrop';
      backdrop.hidden = true;
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', event => { if (event.target === backdrop) closeSecurityDialog(); });
    }
    backdrop.innerHTML = `
      <section class="jemmo-security-sheet" role="dialog" aria-modal="true">
        <h3>Seguridad de ${esc(peer.name)}</h3>
        <p>${esc(peer.publicId || (peer.username ? `@${peer.username}` : 'Perfil JEMMO'))}</p>
        <div class="jemmo-security-grid">
          <a href="perfil-publico.html?uid=${encodeURIComponent(peer.uid)}">VER PERFIL</a>
          <button class="gold" id="jemmoCopyPeerId" type="button">COPIAR ID JEMMO</button>
          <button class="${state.blockedByMe ? '' : 'danger'}" id="jemmoToggleBlock" type="button">${state.blockedByMe ? 'DESBLOQUEAR USUARIO' : 'BLOQUEAR USUARIO'}</button>
          <p style="margin:5px 0 0">Denunciar cuenta o conversación:</p>
          <div class="jemmo-security-reasons">
            <button type="button" data-report-reason="spam">SPAM</button>
            <button type="button" data-report-reason="acoso">ACOSO</button>
            <button type="button" data-report-reason="suplantacion">SUPLANTACIÓN</button>
            <button type="button" data-report-reason="menor">POSIBLE MENOR</button>
          </div>
        </div>
        <button class="jemmo-security-close" id="jemmoSecurityClose" type="button">CERRAR</button>
      </section>`;
    backdrop.hidden = false;
    $('jemmoSecurityClose')?.addEventListener('click', closeSecurityDialog);
    $('jemmoToggleBlock')?.addEventListener('click', toggleCurrentBlock);
    $('jemmoCopyPeerId')?.addEventListener('click', () => {
      if (peer.publicId) state.publicIdApi.copyPublicId(peer.publicId);
      else toast('Este perfil todavía no tiene una ID JEMMO disponible.');
    });
    backdrop.querySelectorAll('[data-report-reason]').forEach(button => {
      button.addEventListener('click', () => reportCurrentPeer(button.dataset.reportReason));
    });
  }

  function firebaseErrorMessage(error) {
    const code = String(error?.code || '');
    if (String(error?.message || '').includes('jemmo-user-blocked-by-me')) return 'Has bloqueado a esta persona. Desbloquéala para iniciar o continuar la conversación.';
    if (code.includes('permission-denied')) return 'La operación fue bloqueada por seguridad. Puede existir un bloqueo entre las cuentas.';
    if (code.includes('unavailable')) return 'No hay conexión con JEMMO LIVE. Comprueba Internet y vuelve a intentarlo.';
    if (code.includes('unauthenticated')) return 'La sesión caducó. Cierra y vuelve a iniciar sesión.';
    if (code.includes('failed-precondition')) return 'Mensajes necesita terminar su configuración. Vuelve a intentarlo más tarde.';
    return String(error?.message || 'No se pudo completar la operación de Mensajes.');
  }

  function bindCapture(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      handler(event);
    }, true);
  }

  function bindInterface() {
    ensureGiftDialog();
    bindCapture($('createGroupButton'), 'click', openNewConversation);
    bindCapture($('messageForm'), 'submit', sendCurrentMessage);
    bindCapture($('chatBack'), 'click', () => closeConversation({ useHistory: true }));
    bindCapture($('markAllRead'), 'click', markAllRead);
    bindCapture($('chatOptions'), 'click', openSecurityDialog);
    bindCapture($('attachButton'), 'click', () => toast('Fotos, audio y archivos se habilitarán cuando se active el almacenamiento multimedia.'));
    bindCapture($('messageGiftButton'), 'click', openMessageGiftDialog);
    bindCapture($('managePinned'), 'click', () => toast('Las conversaciones ancladas se habilitarán en la próxima prueba.'));

    const searchInput = $('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', event => {
        event.stopImmediatePropagation();
        state.search = String(event.target.value || '');
        renderConversations();
      }, true);
    }
    bindCapture($('clearSearch'), 'click', () => {
      if (searchInput) searchInput.value = '';
      state.search = '';
      renderConversations();
      searchInput?.focus();
    });

    window.addEventListener('popstate', () => {
      if (state.ignoreGiftPop) { state.ignoreGiftPop = false; return; }
      if (giftDialogVisible()) { closeMessageGiftDialog({ useHistory: false }); return; }
      if (state.currentConversationId) closeConversation({ useHistory: false });
    });
  }

  function listenFollowingPeople() {
    if (!state.socialApi || !state.user) return;
    if (state.followingStop) state.followingStop();
    state.followingStop = state.socialApi.subscribeFollowing(state.user.uid, result => {
      state.followingProfiles = result.profiles || [];
      renderOnlinePeople();
    }, error => {
      console.warn('[JEMMO social] No se pudo leer la lista de seguidos.', error);
      state.followingProfiles = [];
      renderOnlinePeople();
    });
  }

  function listenConversations() {
    if (state.conversationStop) state.conversationStop();
    const { collection, query, where, onSnapshot } = state.sdk.firestore;
    const conversationsQuery = query(
      collection(state.db, 'conversaciones'),
      where('participants', 'array-contains', state.user.uid)
    );

    state.conversationStop = onSnapshot(conversationsQuery, snapshot => {
      state.conversations = snapshot.docs.map(documentSnapshot => ({
        id: documentSnapshot.id,
        data: documentSnapshot.data()
      })).sort((a, b) => timestampMs(b.data.lastMessageAt || b.data.updatedAt || b.data.createdAt)
        - timestampMs(a.data.lastMessageAt || a.data.updatedAt || a.data.createdAt));

      state.ready = true;
      setStatus(`Mensajes activos · ${state.profile.publicId || state.profile.name}`, 'ok');
      renderConversations();

      if (state.pendingConversationFromUrl && !state.autoOpenedFromUrl) {
        const requested = state.conversations.find(item => item.id === state.pendingConversationFromUrl);
        if (requested) {
          state.autoOpenedFromUrl = true;
          setTimeout(() => openConversation(requested.id), 60);
        }
      }

      if (state.currentConversationId) {
        const current = state.conversations.find(item => item.id === state.currentConversationId);
        if (current) {
          const peer = peerData(current);
          if ($('chatName')) $('chatName').innerHTML = `${esc(peer.name)}${peer.verified ? ' <i class="jemmo-rt-verified" aria-label="Cuenta verificada">✓</i>' : ''}`;
        }
      }
    }, error => {
      console.warn('[JEMMO mensajes] No se pudo leer la bandeja.', error);
      state.ready = false;
      setStatus(firebaseErrorMessage(error), 'error');
      const allList = $('allChatsList');
      if (allList) allList.innerHTML = `<div class="empty"><b>Mensajes sin conexión</b>${esc(firebaseErrorMessage(error))}</div>`;
    });
  }

  async function connectUser(user) {
    state.user = user;
    setStatus('Preparando tu bandeja de Mensajes…');
    try {
      await ensureCurrentUserDocument();
      listenConversations();
      listenFollowingPeople();
    } catch (error) {
      console.warn('[JEMMO mensajes] No se pudo preparar el usuario.', error);
      setStatus(firebaseErrorMessage(error), 'error');
      const allList = $('allChatsList');
      if (allList) allList.innerHTML = `<div class="empty"><b>Mensajes todavía no están disponibles</b>${esc(firebaseErrorMessage(error))}</div>`;
    }
  }

  async function start() {
    ensureStyles();
    ensureStatus();
    ensureNewConversationDialog();
    bindInterface();

    const pinnedList = $('pinnedList');
    const allList = $('allChatsList');
    if (pinnedList) pinnedList.innerHTML = '<div class="empty"><b>Conectando…</b>Preparando conversaciones reales.</div>';
    if (allList) allList.innerHTML = '<div class="empty"><b>Espera un momento</b>Verificando tu sesión de JEMMO LIVE.</div>';

    try {
      const [appSdk, authSdk, firestoreSdk, publicIdApi, socialApi] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js'),
        import('./jemmo-public-id.js'),
        import('./jemmo-social.js')
      ]);
      const app = appSdk.getApps()[0] || appSdk.initializeApp(FIREBASE_CONFIG);
      state.sdk = { app: appSdk, auth: authSdk, firestore: firestoreSdk };
      state.publicIdApi = publicIdApi;
      state.socialApi = socialApi;
      state.auth = authSdk.getAuth(app);
      state.db = firestoreSdk.getFirestore(app);

      authSdk.onAuthStateChanged(state.auth, user => {
        if (state.conversationStop) {
          state.conversationStop();
          state.conversationStop = null;
        }
        if (state.messagesStop) {
          state.messagesStop();
          state.messagesStop = null;
        }
        if (state.followingStop) {
          state.followingStop();
          state.followingStop = null;
        }
        state.user = null;
        state.profile = null;
        state.conversations = [];
        state.currentConversationId = '';
        state.followingProfiles = [];
        state.giftBusy = false;
        if (giftDialogVisible()) closeMessageGiftDialog({ useHistory: false });

        if (!user) {
          setStatus('No existe una sesión activa.', 'error');
          if (allList) allList.innerHTML = '<div class="empty"><b>Sesión no disponible</b>Vuelve a iniciar sesión para utilizar Mensajes.</div>';
          return;
        }
        connectUser(user);
      });
    } catch (error) {
      console.warn('[JEMMO mensajes] Error de inicialización.', error);
      setStatus('No se pudo cargar Mensajes. Comprueba la conexión.', 'error');
      if (allList) allList.innerHTML = '<div class="empty"><b>Mensajes no disponibles</b>Comprueba Internet y vuelve a abrir Mensajes.</div>';
    }

    document.documentElement.dataset.jemmoMessagesEngine = VERSION;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
