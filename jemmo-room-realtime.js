/* JEMMO LIVE V1 · AUDIO/VÍDEO BIDIRECCIONAL E INVITACIONES PRUEBA 10
   Señalización WebRTC y chat de prueba mediante Firestore. No es infraestructura de producción. */
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
  authDomain: 'jemmo-live.firebaseapp.com',
  projectId: 'jemmo-live',
  storageBucket: 'jemmo-live.firebasestorage.app',
  messagingSenderId: '355540892255',
  appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
};

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ROOM_COLLECTION = 'salasPruebaWebRTC';
const RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478', 'stun:global.stun.twilio.com:3478'] }
  ],
  iceCandidatePoolSize: 6
};

function clean(value, max = 80) {
  return String(value || '').trim().slice(0, max);
}

function roomCode(value) {
  return clean(value, 16).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
}

function serializeDescription(description) {
  return description ? { type: description.type, sdp: description.sdp } : null;
}

function safeCandidate(data) {
  if (!data || !data.candidate) return null;
  return new RTCIceCandidate({
    candidate: data.candidate,
    sdpMid: data.sdpMid ?? null,
    sdpMLineIndex: data.sdpMLineIndex ?? null,
    usernameFragment: data.usernameFragment ?? null
  });
}

function addLocalTracks(peer, stream) {
  if (!(stream instanceof MediaStream)) return;
  stream.getTracks().forEach(track => {
    track.enabled = true;
    try { if (track.kind === 'audio') track.contentHint = 'speech'; } catch {}
    const transceiver = peer.addTransceiver(track, { direction: 'sendrecv', streams: [stream] });
    try { transceiver.direction = 'sendrecv'; } catch {}
  });
}

function expectedRemoteMedia(stream, expectVideo) {
  if (!(stream instanceof MediaStream)) return false;
  const hasAudio = stream.getAudioTracks().some(track => track.readyState === 'live');
  const hasVideo = !expectVideo || stream.getVideoTracks().some(track => track.readyState === 'live');
  return hasAudio && hasVideo;
}

function waitForStable(peer, timeout = 5000) {
  if (peer.signalingState === 'stable') return Promise.resolve();
  return new Promise(resolve => {
    const timer = setTimeout(done, timeout);
    function done() {
      clearTimeout(timer);
      peer.removeEventListener('signalingstatechange', changed);
      resolve();
    }
    function changed() {
      if (peer.signalingState === 'stable' || peer.signalingState === 'closed') done();
    }
    peer.addEventListener('signalingstatechange', changed);
  });
}

function waitForUser(timeout = 12000) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve, reject) => {
    let stop = () => {};
    const timer = setTimeout(() => {
      stop();
      reject(new Error('La sesión de JEMMO no está disponible.'));
    }, timeout);
    stop = onAuthStateChanged(auth, user => {
      if (!user) return;
      clearTimeout(timer);
      stop();
      resolve(user);
    }, error => {
      clearTimeout(timer);
      stop();
      reject(error);
    });
  });
}

async function readProfile(user) {
  let data = {};
  try {
    const snapshot = await getDoc(doc(db, 'users', user.uid));
    if (snapshot.exists()) data = snapshot.data() || {};
  } catch (error) {
    console.warn('JEMMO Room profile:', error);
  }
  const rawPhoto = clean(data.photoURL || user.photoURL || data.avatar, 1200);
  const photo = /^https:\/\//i.test(rawPhoto) ? rawPhoto : '';
  return {
    uid: user.uid,
    name: clean(data.displayName || data.nombre || user.displayName || user.email?.split('@')[0] || 'Usuario JEMMO'),
    photo,
    verified: Boolean(data.isVerified || data.verified || data.verificationStatus === 'verified')
  };
}


function configureRoomChat({ roomRef, user, profile, unsubs, onMessage }) {
  const seen = new Set();
  const messagesRef = collection(roomRef, 'messages');
  unsubs.push(onSnapshot(messagesRef, snapshot => {
    const added = snapshot.docChanges()
      .filter(change => change.type === 'added' && !seen.has(change.doc.id))
      .map(change => {
        seen.add(change.doc.id);
        const data = change.doc.data() || {};
        return {
          id: change.doc.id,
          senderUid: clean(data.senderUid, 128),
          senderName: clean(data.senderName) || 'Usuario JEMMO',
          text: clean(data.text, 160),
          createdAtMs: Number(data.createdAtMs) || 0
        };
      })
      .filter(message => message.text)
      .sort((a, b) => a.createdAtMs - b.createdAtMs);
    added.forEach(message => onMessage?.({ ...message, own: message.senderUid === user.uid }));
  }, error => console.warn('JEMMO Room chat listener:', error)));

  return async text => {
    const value = clean(text, 160);
    if (!value) throw new Error('Escribe un mensaje.');
    await addDoc(messagesRef, {
      senderUid: user.uid,
      senderName: profile.name,
      text: value,
      createdAtMs: Date.now(),
      createdAt: serverTimestamp()
    });
  };
}

function makeSession({ role, roomId, roomRef, peer, remoteStream, unsubs, onStatus, sendChatMessage, renegotiate, requestRenegotiation, expectVideo }) {
  let closed = false;
  const close = async ({ endRoom = role === 'host' } = {}) => {
    if (closed) return;
    closed = true;
    unsubs.splice(0).forEach(stop => {
      try { stop(); } catch {}
    });
    try { peer.close(); } catch {}
    if (endRoom) {
      try {
        await updateDoc(roomRef, {
          status: 'ended',
          endedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.warn('JEMMO Room close:', error);
      }
    }
    onStatus?.({ state: 'closed', text: 'Sala desconectada' });
  };
  return {
    role,
    roomId,
    inviteUrl: new URL(`salas.html?join=${encodeURIComponent(roomId)}`, location.href).href,
    peer,
    remoteStream,
    hasExpectedRemoteMedia: () => expectedRemoteMedia(remoteStream, Boolean(expectVideo)),
    sendChatMessage,
    async replaceLocalStream(stream) {
      if (!(stream instanceof MediaStream)) return;
      let addedTrack = false;
      const byKind = new Map(stream.getTracks().map(track => [track.kind, track]));
      for (const track of stream.getTracks()) {
        track.enabled = true;
        try { if (track.kind === 'audio') track.contentHint = 'speech'; } catch {}
        const sender = peer.getSenders().find(item => item.track?.kind === track.kind);
        if (sender) {
          await sender.replaceTrack(track);
          const transceiver = peer.getTransceivers().find(item => item.sender === sender);
          if (transceiver) {
            try { transceiver.direction = 'sendrecv'; } catch {}
          }
        } else {
          peer.addTransceiver(track, { direction: 'sendrecv', streams: [stream] });
          addedTrack = true;
        }
      }
      for (const sender of peer.getSenders()) {
        const kind = sender.track?.kind;
        if (kind && !byKind.has(kind)) await sender.replaceTrack(null);
      }
      if (role === 'host') await renegotiate?.(addedTrack ? 'track-added' : 'media-restored');
      else await requestRenegotiation?.('guest-media-restored');
    },
    renegotiate: reason => role === 'host' ? renegotiate?.(reason || 'manual') : requestRenegotiation?.(reason || 'manual'),
    requestRenegotiation: reason => requestRenegotiation?.(reason || 'manual'),
    close
  };
}

function configurePeer({ peer, roomRef, ownCandidates, remoteCandidates, remoteStream, unsubs, onRemoteStream, onStatus }) {
  const seen = new Set();
  const pendingCandidates = [];
  peer.__jemmoFlushCandidates = async () => {
    while (pendingCandidates.length && peer.remoteDescription) {
      const candidate = pendingCandidates.shift();
      try { await peer.addIceCandidate(candidate); } catch (error) { console.warn('JEMMO Room ICE queued:', error); }
    }
  };
  peer.addEventListener('track', event => {
    const streams = event.streams || [];
    if (streams[0]) {
      streams[0].getTracks().forEach(track => {
        if (!remoteStream.getTracks().some(existing => existing.id === track.id)) remoteStream.addTrack(track);
      });
    } else if (event.track && !remoteStream.getTracks().some(existing => existing.id === event.track.id)) {
      remoteStream.addTrack(event.track);
    }
    onRemoteStream?.(remoteStream);
  });
  peer.addEventListener('icecandidate', event => {
    if (!event.candidate) return;
    addDoc(collection(roomRef, ownCandidates), event.candidate.toJSON()).catch(error => {
      console.warn('JEMMO Room ICE send:', error);
    });
  });
  peer.addEventListener('connectionstatechange', () => {
    const state = peer.connectionState;
    if (state === 'connected') onStatus?.({ state: 'connected', text: 'Conexión en tiempo real activa' });
    else if (state === 'connecting') onStatus?.({ state: 'connecting', text: 'Conectando audio y cámara…' });
    else if (['failed', 'disconnected'].includes(state)) onStatus?.({ state: 'warning', text: 'Conexión interrumpida' });
    else if (state === 'closed') onStatus?.({ state: 'closed', text: 'Sala desconectada' });
  });
  peer.addEventListener('iceconnectionstatechange', () => {
    const state = peer.iceConnectionState;
    if (state === 'checking') onStatus?.({ state: 'connecting', text: 'Comprobando la conexión…' });
    else if (['connected', 'completed'].includes(state)) onStatus?.({ state: 'connected', text: 'Audio conectado' });
    else if (state === 'failed') onStatus?.({ state: 'warning', text: 'La red bloqueó el audio directo' });
  });
  peer.addEventListener('icecandidateerror', event => {
    console.warn('JEMMO Room ICE candidate error:', event.errorText || event.errorCode || event);
  });
  unsubs.push(onSnapshot(collection(roomRef, remoteCandidates), snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type !== 'added' || seen.has(change.doc.id)) return;
      seen.add(change.doc.id);
      const candidate = safeCandidate(change.doc.data());
      if (!candidate) return;
      if (!peer.remoteDescription) pendingCandidates.push(candidate);
      else peer.addIceCandidate(candidate).catch(error => console.warn('JEMMO Room ICE receive:', error));
    });
  }, error => console.warn('JEMMO Room candidates:', error)));
}

async function getRoomPreview(code) {
  const id = roomCode(code);
  if (!id) throw new Error('Código de sala no válido.');
  const snapshot = await getDoc(doc(db, ROOM_COLLECTION, id));
  if (!snapshot.exists()) throw new Error('La invitación ya no existe.');
  const data = snapshot.data() || {};
  if (data.status === 'ended') throw new Error('Esta sala ya finalizó.');
  return {
    roomId: id,
    mode: data.mode === 'camera' ? 'camera' : 'audio',
    count: [4, 8, 12, 15, 25].includes(Number(data.count)) ? Number(data.count) : 4,
    title: clean(data.title, 60) || 'Sala de JEMMO',
    description: clean(data.description, 180),
    hostName: clean(data.hostName) || 'Anfitrión',
    hostPhoto: clean(data.hostPhoto, 1200),
    status: clean(data.status) || 'open'
  };
}

async function createHostSession(options = {}) {
  const user = await waitForUser();
  const profile = await readProfile(user);
  const id = randomCode();
  const roomRef = doc(db, ROOM_COLLECTION, id);
  const peer = new RTCPeerConnection(RTC_CONFIG);
  const remoteStream = new MediaStream();
  const unsubs = [];
  const localStream = options.localStream;
  if (!(localStream instanceof MediaStream)) throw new Error('No se pudo abrir el micrófono o la cámara.');
  addLocalTracks(peer, localStream);
  configurePeer({
    peer,
    roomRef,
    ownCandidates: 'hostCandidates',
    remoteCandidates: 'guestCandidates',
    remoteStream,
    unsubs,
    onRemoteStream: options.onRemoteStream,
    onStatus: options.onStatus
  });

  let offerRevision = 1;
  let answerRevisionApplied = 0;
  let guestRequestSeen = 0;
  let negotiationBusy = false;
  let repeatOfferSent = false;
  let pendingReason = '';

  async function publishOffer(reason = 'refresh') {
    if (peer.signalingState === 'closed') return;
    if (negotiationBusy) {
      pendingReason = reason;
      return;
    }
    negotiationBusy = true;
    try {
      await waitForStable(peer);
      if (peer.signalingState === 'closed') return;
      if (peer.signalingState !== 'stable') { pendingReason = reason; return; }
      peer.getTransceivers().forEach(transceiver => {
        if (transceiver.stopped) return;
        try { transceiver.direction = 'sendrecv'; } catch {}
      });
      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: options.mode === 'camera',
        iceRestart: reason === 'ice-restart'
      });
      await peer.setLocalDescription(offer);
      offerRevision += 1;
      await updateDoc(roomRef, {
        offer: serializeDescription(peer.localDescription),
        offerRevision,
        offerReason: clean(reason, 60),
        updatedAt: serverTimestamp()
      });
      options.onStatus?.({ state: 'connecting', text: 'Reactivando audio y cámara…' });
    } catch (error) {
      console.warn('JEMMO Room renegotiation:', error);
      options.onStatus?.({ state: 'warning', text: 'No se pudo reenviar tu audio y cámara' });
    } finally {
      negotiationBusy = false;
      if (pendingReason) {
        const next = pendingReason;
        pendingReason = '';
        setTimeout(() => publishOffer(next), 250);
      }
    }
  }

  async function refreshOutgoingMedia(reason) {
    if (typeof options.onOutgoingMediaNeeded === 'function') {
      try {
        const recovered = await options.onOutgoingMediaNeeded(reason);
        if (recovered !== false) return;
      } catch (error) {
        console.warn('JEMMO Room outgoing recovery:', error);
      }
    }
    await publishOffer(reason);
  }

  const initialOffer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: options.mode === 'camera' });
  await peer.setLocalDescription(initialOffer);
  await setDoc(roomRef, {
    version: 2,
    status: 'open',
    mode: options.mode === 'camera' ? 'camera' : 'audio',
    count: Number(options.count) || 4,
    title: clean(options.title, 60),
    description: clean(options.description, 180),
    hostUid: user.uid,
    hostName: profile.name,
    hostPhoto: profile.photo,
    hostVerified: profile.verified,
    offer: serializeDescription(peer.localDescription),
    offerRevision,
    answerRevision: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    inviteRequestId: clean(options.inviteRequestId, 128),
    invitedTargetUid: clean(options.invitedTargetUid, 128),
    expiresAtMs: Date.now() + 2 * 60 * 60 * 1000
  });
  if (clean(options.inviteRequestId, 128)) {
    try {
      await updateDoc(doc(db, 'invitacionesEmisor', clean(options.inviteRequestId, 128)), {
        status: 'room_ready',
        roomId: id,
        inviteUrl: new URL(`salas.html?join=${encodeURIComponent(id)}`, location.href).href,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('JEMMO paid invitation link:', error);
    }
  }

  unsubs.push(onSnapshot(roomRef, snapshot => {
    if (!snapshot.exists()) return;
    const data = snapshot.data() || {};
    if (data.status === 'ended') options.onStatus?.({ state: 'closed', text: 'La sala finalizó' });
    if (data.guestName) options.onRemoteProfile?.({ name: clean(data.guestName) || 'Ruth', photo: clean(data.guestPhoto, 1200), verified: Boolean(data.guestVerified) });

    const answerRevision = Math.max(1, Number(data.answerRevision) || (data.answer ? 1 : 0));
    if (data.answer && answerRevision > answerRevisionApplied) {
      answerRevisionApplied = answerRevision;
      Promise.resolve().then(async () => {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
          await peer.__jemmoFlushCandidates?.();
          if (!repeatOfferSent) {
            repeatOfferSent = true;
            setTimeout(() => refreshOutgoingMedia('confirmar-envio-anfitrion'), 900);
          }
        } catch (error) {
          answerRevisionApplied = Math.max(0, answerRevisionApplied - 1);
          console.warn('JEMMO Room answer:', error);
        }
      });
    }

    const guestRequest = Number(data.guestNeedsRenegotiationAt) || 0;
    if (guestRequest > guestRequestSeen) {
      guestRequestSeen = guestRequest;
      setTimeout(() => refreshOutgoingMedia('peticion-invitada'), 200);
    }
  }, error => console.warn('JEMMO Room host snapshot:', error)));

  const sendChatMessage = configureRoomChat({
    roomRef, user, profile, unsubs, onMessage: options.onMessage
  });
  options.onLocalProfile?.(profile);
  options.onStatus?.({ state: 'waiting', text: 'Esperando a Ruth' });
  return makeSession({
    role: 'host', roomId: id, roomRef, peer, remoteStream, unsubs,
    onStatus: options.onStatus, sendChatMessage,
    renegotiate: publishOffer,
    requestRenegotiation: null,
    expectVideo: options.mode === 'camera'
  });
}

async function joinGuestSession(code, options = {}) {
  const user = await waitForUser();
  const profile = await readProfile(user);
  const preview = await getRoomPreview(code);
  const roomRef = doc(db, ROOM_COLLECTION, preview.roomId);
  const snapshot = await getDoc(roomRef);
  const data = snapshot.data() || {};
  if (!data.offer) throw new Error('La sala todavía no está preparada para recibir personas.');
  if (data.hostUid === user.uid) throw new Error('Abre la sala desde el dispositivo anfitrión.');
  const peer = new RTCPeerConnection(RTC_CONFIG);
  const remoteStream = new MediaStream();
  const unsubs = [];
  const localStream = options.localStream;
  if (!(localStream instanceof MediaStream)) throw new Error('No se pudo abrir el micrófono o la cámara.');
  addLocalTracks(peer, localStream);
  configurePeer({
    peer,
    roomRef,
    ownCandidates: 'guestCandidates',
    remoteCandidates: 'hostCandidates',
    remoteStream,
    unsubs,
    onRemoteStream: options.onRemoteStream,
    onStatus: options.onStatus
  });

  let appliedOfferRevision = 0;
  let applyingOffer = false;
  let queuedOffer = null;
  async function applyOffer(offerData, revision) {
    if (!offerData || revision <= appliedOfferRevision) return;
    if (applyingOffer) {
      queuedOffer = { offerData, revision };
      return;
    }
    applyingOffer = true;
    try {
      await waitForStable(peer);
      if (peer.signalingState === 'closed') return;
      if (peer.signalingState !== 'stable') { queuedOffer = { offerData, revision }; return; }
      await peer.setRemoteDescription(new RTCSessionDescription(offerData));
      await peer.__jemmoFlushCandidates?.();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      appliedOfferRevision = revision;
      await updateDoc(roomRef, {
        answer: serializeDescription(peer.localDescription),
        answerRevision: revision,
        guestUid: user.uid,
        guestName: profile.name,
        guestPhoto: profile.photo,
        guestVerified: profile.verified,
        status: 'connected',
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('JEMMO Room apply offer:', error);
      options.onStatus?.({ state: 'warning', text: 'Reintentando recibir al anfitrión…' });
    } finally {
      applyingOffer = false;
      if (queuedOffer) {
        const next = queuedOffer;
        queuedOffer = null;
        setTimeout(() => applyOffer(next.offerData, next.revision), 180);
      }
    }
  }

  async function requestRenegotiation(reason = 'sin-medios-remotos') {
    try {
      await updateDoc(roomRef, {
        guestNeedsRenegotiationAt: Date.now(),
        guestNeedsRenegotiationReason: clean(reason, 80),
        updatedAt: serverTimestamp()
      });
      options.onStatus?.({ state: 'connecting', text: 'Solicitando audio y cámara de Jesús…' });
    } catch (error) {
      console.warn('JEMMO Room request renegotiation:', error);
    }
  }

  const initialRevision = Math.max(1, Number(data.offerRevision) || 1);
  await applyOffer(data.offer, initialRevision);
  if (clean(data.inviteRequestId, 128)) {
    try {
      await updateDoc(doc(db, 'invitacionesEmisor', clean(data.inviteRequestId, 128)), {
        status: 'accepted',
        acceptedByUid: user.uid,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('JEMMO paid invitation accepted:', error);
    }
  }

  unsubs.push(onSnapshot(roomRef, roomSnapshot => {
    if (!roomSnapshot.exists()) return;
    const room = roomSnapshot.data() || {};
    if (room.status === 'ended') options.onStatus?.({ state: 'closed', text: 'El anfitrión finalizó la sala' });
    const revision = Math.max(1, Number(room.offerRevision) || (room.offer ? 1 : 0));
    if (room.offer && revision > appliedOfferRevision) void applyOffer(room.offer, revision);
  }, error => console.warn('JEMMO Room guest snapshot:', error)));

  const verifyTimer = setTimeout(() => {
    if (!expectedRemoteMedia(remoteStream, options.mode === 'camera')) void requestRenegotiation('invitada-no-recibe-anfitrion');
  }, 5500);
  unsubs.push(() => clearTimeout(verifyTimer));

  const sendChatMessage = configureRoomChat({
    roomRef, user, profile, unsubs, onMessage: options.onMessage
  });
  options.onLocalProfile?.(profile);
  options.onRemoteProfile?.({ name: preview.hostName, photo: preview.hostPhoto, verified: Boolean(data.hostVerified) });
  options.onStatus?.({ state: 'connecting', text: 'Entrando en la sala…' });
  return makeSession({
    role: 'guest', roomId: preview.roomId, roomRef, peer, remoteStream, unsubs,
    onStatus: options.onStatus, sendChatMessage,
    renegotiate: null,
    requestRenegotiation,
    expectVideo: options.mode === 'camera'
  });
}

window.JemmoRoomRealtime = Object.freeze({
  version: '1.2.0-test',
  getRoomPreview,
  createHostSession,
  joinGuestSession
});
window.dispatchEvent(new CustomEvent('jemmo-room-realtime-ready'));
