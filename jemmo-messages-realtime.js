/* JEMMO LIVE V1 · ID PÚBLICA Y SEGURIDAD PRUEBA 08
   Mensajería directa con Firebase Authentication + Cloud Firestore.
   Mantiene la interfaz visual existente y sustituye únicamente el motor local de Mensajes.
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

  const VERSION = 'JEMMO LIVE V1 · ID PÚBLICA Y SEGURIDAD PRUEBA 08';
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
    blockedByMe: false
  };

  let toastTimer = 0;

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
    `;
    document.head.appendChild(style);
  }

  function ensureStatus() {
    let status = $('jemmoRealtimeStatus');
    if (status) return status;
    status = document.createElement('div');
    status.id = 'jemmoRealtimeStatus';
    status.className = 'jemmo-rt-status';
    status.textContent = 'Conectando Mensajes con Firebase…';
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
      verified: Boolean(profile.verified || fallback?.verified),
      initial: initials(name),
      type: String(data.type || 'direct')
    };
  }

  function conversationUnread(conversation) {
    return Math.max(0, Number(conversation?.data?.unreadBy?.[state.user?.uid]) || 0);
  }

  function renderOnlinePeople(conversations) {
    const onlineList = $('onlineList');
    const headStrong = document.querySelector('.online-block .section-head strong');
    const headSpan = document.querySelector('.online-block .section-head span');
    if (headStrong) headStrong.textContent = 'Conversaciones recientes';
    if (headSpan) headSpan.textContent = 'Perfiles y mensajes desde Firebase';
    if (!onlineList) return;

    onlineList.innerHTML = '';
    conversations.slice(0, 8).forEach(conversation => {
      const peer = peerData(conversation);
      const button = document.createElement('button');
      button.className = 'btn online-person';
      button.type = 'button';
      const avatar = peer.avatarData
        ? `<img class="jemmo-rt-avatar-img" src="${esc(peer.avatarData)}" alt="">`
        : esc(peer.initial);
      button.innerHTML = `<span class="avatar-wrap"><span class="avatar" style="--a1:#6f2290;--a2:#190322">${avatar}</span></span><b>${esc(peer.name)}</b>`;
      button.addEventListener('click', () => openConversation(conversation.id));
      onlineList.appendChild(button);
    });

    if (!conversations.length) {
      onlineList.innerHTML = '<div class="jemmo-rt-help" style="width:100%">Pulsa ＋ para buscar un perfil real e iniciar una conversación.</div>';
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
      <span class="row-copy"><span class="row-name"><strong>${esc(peer.name)}</strong></span><p>${esc(data.lastSenderId === state.user.uid && data.lastMessage ? `Tú: ${data.lastMessage}` : (data.lastMessage || 'Conversación creada.'))}</p></span>
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

    renderOnlinePeople(state.conversations);
  }

  function renderMessages(messageDocuments) {
    const area = $('messagesArea');
    if (!area) return;
    area.innerHTML = '<div class="day">MENSAJES EN TIEMPO REAL · FIREBASE · PRUEBA</div>';

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
      bubble.innerHTML = `${esc(data.text || '')}<time>${esc(time)}${mine ? '<span class="delivery">✓</span>' : ''}</time>`;
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
    if ($('chatName')) $('chatName').textContent = peer.name;
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
  }

  function closeConversation({ useHistory = false } = {}) {
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
        version: 3
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

    result.innerHTML = '<div class="jemmo-rt-help">Buscando perfil en Firebase…</div>';
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
        result.innerHTML = '<div class="jemmo-rt-help error">No aparece ese perfil. Comprueba la ID JEMMO o el nombre de usuario. La otra persona debe haber iniciado sesión con PRUEBA 08.</div>';
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
      verified: Boolean(data.verified),
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
        messagesVersion: 3,
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
        verified: profile.verified,
        level: profile.level,
        publicProfileEnabled: true,
        messagesEnabled: true,
        messagesVersion: 3,
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
        version: 3
      });
    } else {
      await updateDoc(
        reference,
        new FieldPath('participantProfiles', state.user.uid), participantProfiles[state.user.uid],
        'updatedAt', serverTimestamp(),
        'version', 3
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
    if (code.includes('permission-denied')) return 'La operación fue bloqueada por seguridad. Puede existir un bloqueo entre las cuentas o faltar publicar las reglas de PRUEBA 08.';
    if (code.includes('unavailable')) return 'No hay conexión con Firebase. Comprueba Internet y vuelve a intentarlo.';
    if (code.includes('unauthenticated')) return 'La sesión caducó. Cierra y vuelve a iniciar sesión.';
    if (code.includes('failed-precondition')) return 'Firestore necesita terminar su configuración. Revisa las reglas y los índices indicados.';
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
    bindCapture($('createGroupButton'), 'click', openNewConversation);
    bindCapture($('messageForm'), 'submit', sendCurrentMessage);
    bindCapture($('chatBack'), 'click', () => closeConversation({ useHistory: true }));
    bindCapture($('markAllRead'), 'click', markAllRead);
    bindCapture($('chatOptions'), 'click', openSecurityDialog);
    bindCapture($('attachButton'), 'click', () => toast('Fotos, audio y archivos se habilitarán después de configurar Firebase Storage.'));
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
      if (state.currentConversationId) closeConversation({ useHistory: false });
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
      setStatus(`Mensajes conectados · ${state.profile.publicId || state.profile.name}`, 'ok');
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
          if ($('chatName')) $('chatName').textContent = peer.name;
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
    } catch (error) {
      console.warn('[JEMMO mensajes] No se pudo preparar el usuario.', error);
      setStatus(firebaseErrorMessage(error), 'error');
      const allList = $('allChatsList');
      if (allList) allList.innerHTML = `<div class="empty"><b>Falta activar Mensajes en Firebase</b>${esc(firebaseErrorMessage(error))}</div>`;
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
      const [appSdk, authSdk, firestoreSdk, publicIdApi] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js'),
        import('./jemmo-public-id.js')
      ]);
      const app = appSdk.getApps()[0] || appSdk.initializeApp(FIREBASE_CONFIG);
      state.sdk = { app: appSdk, auth: authSdk, firestore: firestoreSdk };
      state.publicIdApi = publicIdApi;
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
        state.user = null;
        state.profile = null;
        state.conversations = [];
        state.currentConversationId = '';

        if (!user) {
          setStatus('No existe una sesión Firebase activa.', 'error');
          if (allList) allList.innerHTML = '<div class="empty"><b>Sesión no disponible</b>Vuelve a iniciar sesión para utilizar Mensajes.</div>';
          return;
        }
        connectUser(user);
      });
    } catch (error) {
      console.warn('[JEMMO mensajes] Error de inicialización.', error);
      setStatus('No se pudo cargar Firebase para Mensajes. Comprueba la conexión.', 'error');
      if (allList) allList.innerHTML = '<div class="empty"><b>Firebase no disponible</b>Comprueba Internet y vuelve a abrir Mensajes.</div>';
    }

    document.documentElement.dataset.jemmoMessagesEngine = VERSION;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
