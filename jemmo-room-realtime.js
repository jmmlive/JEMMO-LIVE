/* JEMMO LIVE V1 · PRUEBA REAL AUDIO/CÁMARA CON RUTH 08
   Señalización WebRTC de prueba mediante Firestore. No es infraestructura de producción. */
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
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
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

function makeSession({ role, roomId, roomRef, peer, remoteStream, unsubs, onStatus }) {
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
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
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
  const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: options.mode === 'camera' });
  await peer.setLocalDescription(offer);
  await setDoc(roomRef, {
    version: 1,
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAtMs: Date.now() + 2 * 60 * 60 * 1000
  });
  let answerApplied = false;
  unsubs.push(onSnapshot(roomRef, snapshot => {
    if (!snapshot.exists()) return;
    const data = snapshot.data() || {};
    if (data.status === 'ended') options.onStatus?.({ state: 'closed', text: 'La sala finalizó' });
    if (data.guestName) options.onRemoteProfile?.({ name: clean(data.guestName) || 'Ruth', photo: clean(data.guestPhoto, 1200), verified: Boolean(data.guestVerified) });
    if (!answerApplied && data.answer && !peer.currentRemoteDescription) {
      answerApplied = true;
      peer.setRemoteDescription(new RTCSessionDescription(data.answer)).then(() => peer.__jemmoFlushCandidates?.()).catch(error => {
        answerApplied = false;
        console.warn('JEMMO Room answer:', error);
      });
    }
  }, error => console.warn('JEMMO Room host snapshot:', error)));
  options.onLocalProfile?.(profile);
  options.onStatus?.({ state: 'waiting', text: 'Esperando a Ruth' });
  return makeSession({ role: 'host', roomId: id, roomRef, peer, remoteStream, unsubs, onStatus: options.onStatus });
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
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
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
  await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
  await peer.__jemmoFlushCandidates?.();
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  await updateDoc(roomRef, {
    answer: serializeDescription(peer.localDescription),
    guestUid: user.uid,
    guestName: profile.name,
    guestPhoto: profile.photo,
    guestVerified: profile.verified,
    status: 'connected',
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  unsubs.push(onSnapshot(roomRef, roomSnapshot => {
    if (!roomSnapshot.exists()) return;
    const room = roomSnapshot.data() || {};
    if (room.status === 'ended') options.onStatus?.({ state: 'closed', text: 'El anfitrión finalizó la sala' });
  }, error => console.warn('JEMMO Room guest snapshot:', error)));
  options.onLocalProfile?.(profile);
  options.onRemoteProfile?.({ name: preview.hostName, photo: preview.hostPhoto, verified: Boolean(data.hostVerified) });
  options.onStatus?.({ state: 'connecting', text: 'Entrando en la sala…' });
  return makeSession({ role: 'guest', roomId: preview.roomId, roomRef, peer, remoteStream, unsubs, onStatus: options.onStatus });
}

window.JemmoRoomRealtime = Object.freeze({
  version: '1.0.0-test',
  getRoomPreview,
  createHostSession,
  joinGuestSession
});
window.dispatchEvent(new CustomEvent('jemmo-room-realtime-ready'));
