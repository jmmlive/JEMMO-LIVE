import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
const app=getApps()[0]||initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

const params=new URLSearchParams(location.search);
const routeHostUid=String(params.get('hostUid')||params.get('watch')||'').trim();
const viewerRoute=Boolean(routeHostUid&&(params.get('mode')==='viewer'||params.has('watch')));
const SIGNAL_COLLECTION='liveSignals';
const PRESENCE_COLLECTION='livePresences';
const STALE_MS=90000;
const AUTO_RETRY_LIMIT=3;
const clean=(value,max=180)=>String(value??'').trim().slice(0,max);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function configuredRtc(){
  const supplied=window.JEMMO_RTC_CONFIG;
  if(supplied&&typeof supplied==='object'&&Array.isArray(supplied.iceServers))return supplied;
  return{
    iceServers:[
      {urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']}
    ],
    iceCandidatePoolSize:10,
    bundlePolicy:'max-bundle'
  };
}

const rtcConfig=configuredRtc();
let currentUser=null;
let pendingHostStart=null;
let hostState=null;
let viewerState=null;
let presenceUnsubscribe=null;
let roomUnsubscribe=null;
let reconnectTimer=0;
let automaticAttempts=0;

const ui={
  prep:()=>document.getElementById('prepScreen'),
  broadcast:()=>document.getElementById('broadcastScreen'),
  video:()=>document.getElementById('broadcastVideo'),
  pip:()=>document.getElementById('broadcastPip'),
  nav:()=>document.getElementById('bottomNav'),
  hostName:()=>document.querySelector('.jl-host b'),
  hostAvatar:()=>document.getElementById('hostAvatar'),
  liveTimer:()=>document.getElementById('liveTimer'),
  chat:()=>document.getElementById('chatLayer'),
  end:()=>document.getElementById('endLive'),
  connection:()=>document.getElementById('viewerConnection'),
  title:()=>document.getElementById('viewerConnectionTitle'),
  text:()=>document.getElementById('viewerConnectionText'),
  reconnect:()=>document.getElementById('viewerReconnect'),
  reconnectQuick:()=>document.getElementById('viewerReconnectQuick'),
  play:()=>document.getElementById('viewerPlay')
};

function dispatchState(status,detail={}){
  window.dispatchEvent(new CustomEvent('jemmo-live-webrtc-state',{detail:{status,viewer:viewerRoute,hostUid:routeHostUid,...detail}}));
}

function showViewerShell(){
  if(!viewerRoute)return;
  document.documentElement.classList.add('jemmo-viewer-route');
  document.body?.classList.add('viewer-mode','live-running');
  const prep=ui.prep();if(prep)prep.hidden=true;
  const screen=ui.broadcast();if(screen)screen.hidden=false;
  const pip=ui.pip();if(pip)pip.hidden=true;
  const nav=ui.nav();if(nav){nav.hidden=true;nav.classList.add('live-mode');nav.setAttribute('aria-hidden','true')}
  const end=ui.end();if(end)end.innerHTML='SALIR <span>×</span>';
  const connection=ui.connection();if(connection)connection.hidden=false;
  const title=ui.title();if(title)title.textContent='Conectando con el LIVE…';
  const text=ui.text();if(text)text.textContent='Buscando el audio y el vídeo del emisor.';
  const reconnect=ui.reconnect();if(reconnect)reconnect.hidden=true;
  const reconnectQuick=ui.reconnectQuick();if(reconnectQuick)reconnectQuick.hidden=false;
  const play=ui.play();if(play)play.hidden=true;
}

function setViewerStatus(status,message='',options={}){
  if(!viewerRoute)return;
  showViewerShell();
  const box=ui.connection();
  const title=ui.title();
  const text=ui.text();
  const reconnect=ui.reconnect();
  const play=ui.play();
  if(box){box.hidden=Boolean(options.hideBox);box.dataset.state=status}
  if(title)title.textContent=message||({checking:'Comprobando el LIVE…',connecting:'Conectando audio y vídeo…',connected:'Conectado al LIVE',ended:'El LIVE ha finalizado',error:'No se pudo conectar'}[status]||'Conectando…');
  if(text)text.textContent=options.detail||'';
  if(reconnect)reconnect.hidden=!options.reconnect;
  if(play)play.hidden=!options.play;
  dispatchState(status,{message,detail:options.detail||''});
}

function freshPresence(data){
  return Boolean(data?.active===true&&data?.status==='live'&&Date.now()-Number(data?.heartbeatAtMs||0)<=STALE_MS);
}

function safeImage(value){
  const url=String(value||'').trim();
  return /^(https:\/\/|data:image\/)/i.test(url)?url:'';
}

function renderHostIdentity(data={}){
  const name=clean(data.name||params.get('hostName')||'Emisor JEMMO',80);
  const title=clean(data.title||'En directo en JEMMO LIVE',100);
  const hostName=ui.hostName();if(hostName)hostName.textContent=name;
  const avatar=ui.hostAvatar();
  const image=safeImage(data.avatarData||data.photoURL||data.photo||data.avatar);
  if(avatar){avatar.alt=name;if(image){avatar.src=image;avatar.style.visibility='visible'}}
  const timer=ui.liveTimer();if(timer)timer.textContent=title;
  document.title=`${name} está en LIVE · JEMMO LIVE`;
  const chat=ui.chat();
  if(chat&&!chat.dataset.viewerReady){
    chat.dataset.viewerReady='1';
    chat.replaceChildren();
    const line=document.createElement('div');line.className='jl-chat-line';line.textContent=`Sistema: has entrado al LIVE de ${name}.`;chat.append(line);
  }
}

function serializeDescription(description){
  return description?{type:description.type,sdp:description.sdp}:null;
}
function serializeCandidate(candidate){
  if(!candidate)return null;
  return candidate.toJSON?candidate.toJSON():{
    candidate:candidate.candidate,
    sdpMid:candidate.sdpMid,
    sdpMLineIndex:candidate.sdpMLineIndex,
    usernameFragment:candidate.usernameFragment||null
  };
}
function randomId(){
  if(crypto?.randomUUID)return crypto.randomUUID().replaceAll('-','');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,12)}`;
}
function sessionId(uid){return `${clean(uid,80)}_${randomId()}`}

function createPeer(){
  const pc=new RTCPeerConnection(rtcConfig);
  pc.addEventListener('icecandidateerror',event=>console.warn('JEMMO WebRTC ICE:',event.errorText||event.errorCode||'error'));
  return pc;
}

async function addCandidateSafely(pc,data,queue){
  if(!data?.candidate)return;
  if(!pc.remoteDescription){queue.push(data);return}
  try{await pc.addIceCandidate(data)}catch(error){console.warn('JEMMO WebRTC: candidato ICE descartado.',error)}
}
async function flushCandidates(pc,queue){
  while(queue.length){
    const candidate=queue.shift();
    try{await pc.addIceCandidate(candidate)}catch(error){console.warn('JEMMO WebRTC: no se pudo añadir un candidato pendiente.',error)}
  }
}

function currentTracks(stream){
  return{
    audio:stream?.getAudioTracks?.().find(track=>track.readyState==='live')||null,
    video:stream?.getVideoTracks?.().find(track=>track.readyState==='live')||null
  };
}

async function attachHostTracks(pc,stream){
  const tracks=currentTracks(stream);
  for(const transceiver of pc.getTransceivers()){
    const kind=transceiver.receiver?.track?.kind||transceiver.sender?.track?.kind;
    if(kind!=='audio'&&kind!=='video')continue;
    const track=tracks[kind]||null;
    try{await transceiver.sender.replaceTrack(track)}catch(error){console.warn(`JEMMO WebRTC: no se pudo asignar ${kind}.`,error)}
    try{transceiver.direction='sendonly'}catch{}
  }
}

async function replaceHostTracks(stream){
  if(!hostState)return;
  hostState.stream=stream||null;
  await Promise.all([...hostState.sessions.values()].map(async session=>{
    if(session.pc.connectionState==='closed')return;
    await attachHostTracks(session.pc,hostState.stream);
  }));
}

function closeHostSession(id,reason='closed'){
  const session=hostState?.sessions.get(id);
  if(!session)return;
  session.unsubCandidates?.();
  try{session.pc.close()}catch{}
  hostState.sessions.delete(id);
  void setDoc(session.ref,{status:reason,updatedAt:serverTimestamp(),updatedAtMs:Date.now()},{merge:true}).catch(()=>{});
}

async function answerViewer(viewerSnapshot){
  if(!hostState||!viewerSnapshot.exists())return;
  const id=viewerSnapshot.id;
  const data=viewerSnapshot.data()||{};
  if(!data.offer||hostState.sessions.has(id)||['ended','closed','rejected'].includes(data.status))return;
  if(Number(data.createdAtMs||0)<Number(hostState.startedAtMs||0)-5000)return;
  const viewerRef=viewerSnapshot.ref;
  const pc=createPeer();
  const queued=[];
  const seenCandidates=new Set();
  const session={id,ref:viewerRef,pc,queued,unsubCandidates:null};
  hostState.sessions.set(id,session);
  pc.addEventListener('icecandidate',event=>{
    const candidate=serializeCandidate(event.candidate);
    if(!candidate)return;
    void addDoc(collection(viewerRef,'hostCandidates'),{...candidate,createdAt:serverTimestamp(),createdAtMs:Date.now()}).catch(error=>console.warn('JEMMO WebRTC: no se publicó ICE del emisor.',error));
  });
  pc.addEventListener('connectionstatechange',()=>{
    const state=pc.connectionState;
    if(state==='connected')void setDoc(viewerRef,{status:'connected',connectedAt:serverTimestamp(),connectedAtMs:Date.now()},{merge:true}).catch(()=>{});
    if(state==='failed'||state==='closed')closeHostSession(id,state);
    if(state==='disconnected')setTimeout(()=>{if(pc.connectionState==='disconnected')closeHostSession(id,'disconnected')},12000);
  });
  session.unsubCandidates=onSnapshot(collection(viewerRef,'viewerCandidates'),snapshot=>{
    snapshot.docChanges().forEach(change=>{
      if(change.type!=='added'||seenCandidates.has(change.doc.id))return;
      seenCandidates.add(change.doc.id);
      void addCandidateSafely(pc,change.doc.data(),queued);
    });
  },error=>console.warn('JEMMO WebRTC: no se pudieron leer candidatos del espectador.',error));
  try{
    await pc.setRemoteDescription(data.offer);
    await flushCandidates(pc,queued);
    await attachHostTracks(pc,hostState.stream);
    const answer=await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await setDoc(viewerRef,{
      answer:serializeDescription(pc.localDescription),
      status:'answered',
      hostUid:hostState.uid,
      answeredAt:serverTimestamp(),
      answeredAtMs:Date.now(),
      version:47
    },{merge:true});
  }catch(error){
    console.error('JEMMO WebRTC: error al responder al espectador.',error);
    closeHostSession(id,'answer-error');
  }
}

async function startHost(detail={}){
  if(!currentUser){pendingHostStart=detail;return}
  if(!window.RTCPeerConnection){console.error('JEMMO WebRTC no está disponible en este navegador.');return}
  await stopHost('restart');
  const uid=currentUser.uid;
  const roomRef=doc(db,SIGNAL_COLLECTION,uid);
  hostState={uid,roomRef,stream:detail.stream||null,sessions:new Map(),unsubViewers:null,heartbeat:0,startedAtMs:Date.now()};
  await setDoc(roomRef,{
    hostUid:uid,
    active:true,
    status:'live',
    startedAt:serverTimestamp(),
    startedAtMs:hostState.startedAtMs,
    heartbeatAt:serverTimestamp(),
    heartbeatAtMs:Date.now(),
    version:47
  },{merge:true});
  hostState.unsubViewers=onSnapshot(collection(roomRef,'viewers'),snapshot=>{
    snapshot.docChanges().forEach(change=>{
      if(change.type==='removed'){closeHostSession(change.doc.id,'removed');return}
      void answerViewer(change.doc);
    });
  },error=>console.error('JEMMO WebRTC: no se pudieron escuchar espectadores.',error));
  hostState.heartbeat=setInterval(()=>{
    if(!hostState)return;
    void setDoc(roomRef,{active:true,status:'live',heartbeatAt:serverTimestamp(),heartbeatAtMs:Date.now(),version:47},{merge:true}).catch(()=>{});
  },20000);
  dispatchState('host-ready',{hostUid:uid});
}

async function stopHost(reason='manual'){
  const state=hostState;
  hostState=null;
  if(!state)return;
  clearInterval(state.heartbeat);
  state.unsubViewers?.();
  for(const id of [...state.sessions.keys()]){
    const session=state.sessions.get(id);
    session?.unsubCandidates?.();
    try{session?.pc.close()}catch{}
    void setDoc(session.ref,{status:'ended',endReason:reason,endedAt:serverTimestamp(),endedAtMs:Date.now()},{merge:true}).catch(()=>{});
  }
  await setDoc(state.roomRef,{active:false,status:'ended',endReason:reason,endedAt:serverTimestamp(),endedAtMs:Date.now(),heartbeatAtMs:Date.now(),version:47},{merge:true}).catch(()=>{});
}

function closeViewerPeer(reason='closed',mark=true){
  clearTimeout(reconnectTimer);reconnectTimer=0;
  const state=viewerState;
  viewerState=null;
  if(!state)return;
  state.unsubDoc?.();
  state.unsubCandidates?.();
  try{state.pc.close()}catch{}
  const video=ui.video();
  if(video){video.pause();video.srcObject=null;video.muted=true}
  if(mark)void setDoc(state.viewerRef,{status:reason,updatedAt:serverTimestamp(),updatedAtMs:Date.now()},{merge:true}).catch(()=>{});
}

async function tryPlayRemote({fromGesture=false}={}){
  const video=ui.video();
  if(!video||!video.srcObject)return false;
  video.playsInline=true;
  video.volume=1;
  video.muted=false;
  try{
    await video.play();
    if(!video.muted){setViewerStatus('connected','Conectado al LIVE',{hideBox:true});return true}
  }catch{}
  if(!fromGesture){
    video.muted=true;
    try{await video.play()}catch{}
  }
  setViewerStatus('connected','Vídeo conectado',{detail:'Android necesita una pulsación para activar el sonido.',play:true,reconnect:true});
  return false;
}

async function validatePresence(){
  const snap=await getDoc(doc(db,PRESENCE_COLLECTION,routeHostUid));
  if(!snap.exists())throw new Error('Esta transmisión ya no está disponible.');
  const data=snap.data()||{};
  if(!freshPresence(data))throw new Error('El LIVE ha finalizado o perdió la conexión.');
  renderHostIdentity(data);
  return data;
}

async function startViewer({manual=false}={}){
  if(!viewerRoute||!currentUser)return;
  if(!window.RTCPeerConnection){setViewerStatus('error','Este móvil no admite WebRTC',{detail:'Actualiza Chrome o abre JEMMO LIVE en un navegador compatible.'});return}
  if(manual)automaticAttempts=0;
  closeViewerPeer('reconnecting');
  setViewerStatus('checking','Comprobando el LIVE…',{detail:'Verificando que Ruth continúa transmitiendo.'});
  let presence;
  try{presence=await validatePresence()}catch(error){setViewerStatus('ended',error.message,{reconnect:true});return}
  setViewerStatus('connecting',`Entrando al LIVE de ${clean(presence.name||params.get('hostName')||'Ruth',80)}…`,{detail:'Recibiendo cámara y micrófono. No se activará tu cámara.'});
  const pc=createPeer();
  const id=sessionId(currentUser.uid);
  const roomRef=doc(db,SIGNAL_COLLECTION,routeHostUid);
  const viewerRef=doc(collection(roomRef,'viewers'),id);
  const remoteStream=new MediaStream();
  const queued=[];
  const seenCandidates=new Set();
  const state={id,roomRef,viewerRef,pc,remoteStream,queued,unsubDoc:null,unsubCandidates:null,receivedAudio:false,receivedVideo:false,connected:false};
  viewerState=state;
  pc.addTransceiver('audio',{direction:'recvonly'});
  pc.addTransceiver('video',{direction:'recvonly'});
  pc.addEventListener('track',event=>{
    if(viewerState!==state)return;
    const track=event.track;
    if(!remoteStream.getTracks().some(item=>item.id===track.id))remoteStream.addTrack(track);
    state.receivedAudio=state.receivedAudio||track.kind==='audio';
    state.receivedVideo=state.receivedVideo||track.kind==='video';
    const video=ui.video();
    if(video&&video.srcObject!==remoteStream){video.srcObject=remoteStream;video.muted=true;video.playsInline=true}
    track.addEventListener('ended',()=>{
      if(viewerState!==state)return;
      if(track.kind==='audio')state.receivedAudio=false;
      if(track.kind==='video')state.receivedVideo=false;
      if(!state.receivedAudio&&!state.receivedVideo)scheduleReconnect('Las pistas del LIVE se interrumpieron.');
    },{once:true});
    void tryPlayRemote();
  });
  pc.addEventListener('icecandidate',event=>{
    const candidate=serializeCandidate(event.candidate);
    if(!candidate)return;
    void addDoc(collection(viewerRef,'viewerCandidates'),{...candidate,createdAt:serverTimestamp(),createdAtMs:Date.now()}).catch(error=>console.warn('JEMMO WebRTC: no se publicó ICE del espectador.',error));
  });
  pc.addEventListener('connectionstatechange',()=>{
    if(viewerState!==state)return;
    const connection=pc.connectionState;
    if(connection==='connected'){
      state.connected=true;automaticAttempts=0;
      setViewerStatus('connected','Conectado al LIVE',{hideBox:!ui.play()||ui.play().hidden});
      void tryPlayRemote();
    }
    if(connection==='failed')scheduleReconnect('La conexión de audio y vídeo falló.');
    if(connection==='disconnected')reconnectTimer=setTimeout(()=>{if(viewerState===state&&pc.connectionState==='disconnected')scheduleReconnect('Se perdió temporalmente la conexión.')},8000);
    if(connection==='closed'&&viewerState===state)scheduleReconnect('La conexión se cerró.');
  });
  state.unsubDoc=onSnapshot(viewerRef,async snapshot=>{
    if(viewerState!==state||!snapshot.exists())return;
    const data=snapshot.data()||{};
    if(data.answer&&!pc.currentRemoteDescription){
      try{await pc.setRemoteDescription(data.answer);await flushCandidates(pc,queued)}catch(error){console.error('JEMMO WebRTC: respuesta inválida.',error);scheduleReconnect('No se pudo completar la negociación.')}
    }
    if(data.status==='ended')setViewerStatus('ended','El emisor finalizó el LIVE',{detail:'Puedes volver a Inicio.',reconnect:false});
  },error=>{console.warn('JEMMO WebRTC: no se pudo leer la respuesta.',error);scheduleReconnect('No se pudo leer la respuesta del emisor.')});
  state.unsubCandidates=onSnapshot(collection(viewerRef,'hostCandidates'),snapshot=>{
    snapshot.docChanges().forEach(change=>{
      if(change.type!=='added'||seenCandidates.has(change.doc.id))return;
      seenCandidates.add(change.doc.id);
      void addCandidateSafely(pc,change.doc.data(),queued);
    });
  },error=>console.warn('JEMMO WebRTC: no se pudieron leer candidatos del emisor.',error));
  try{
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    await setDoc(viewerRef,{
      viewerUid:currentUser.uid,
      hostUid:routeHostUid,
      offer:serializeDescription(pc.localDescription),
      status:'requesting',
      createdAt:serverTimestamp(),
      createdAtMs:Date.now(),
      updatedAt:serverTimestamp(),
      updatedAtMs:Date.now(),
      userAgent:clean(navigator.userAgent,240),
      version:47
    });
  }catch(error){
    console.error('JEMMO WebRTC: no se pudo crear la solicitud.',error);
    closeViewerPeer('offer-error');
    setViewerStatus('error','No se pudo iniciar la conexión',{detail:error.message||'Error al preparar audio y vídeo.',reconnect:true});
    return;
  }
  reconnectTimer=setTimeout(()=>{
    if(viewerState===state&&!state.receivedAudio&&!state.receivedVideo)scheduleReconnect('El emisor todavía no ha enviado audio ni vídeo.');
  },18000);
}

function scheduleReconnect(reason){
  if(!viewerRoute)return;
  clearTimeout(reconnectTimer);
  if(automaticAttempts>=AUTO_RETRY_LIMIT){
    closeViewerPeer('failed');
    setViewerStatus('error','No se pudo recuperar el LIVE',{detail:`${reason} Pulsa RECONECTAR AUDIO Y VÍDEO. Si vuelve a fallar, la red necesita un servidor TURN.`,reconnect:true});
    return;
  }
  automaticAttempts++;
  closeViewerPeer('retrying');
  setViewerStatus('connecting',`Reconectando audio y vídeo (${automaticAttempts}/${AUTO_RETRY_LIMIT})…`,{detail:reason,reconnect:true});
  reconnectTimer=setTimeout(()=>void startViewer(),1200*automaticAttempts);
}

function watchPresence(){
  if(!viewerRoute)return;
  presenceUnsubscribe?.();
  presenceUnsubscribe=onSnapshot(doc(db,PRESENCE_COLLECTION,routeHostUid),snapshot=>{
    if(!snapshot.exists())return;
    const data=snapshot.data()||{};
    renderHostIdentity(data);
    if(!freshPresence(data)){
      closeViewerPeer('ended');
      setViewerStatus('ended','El LIVE ha finalizado',{detail:'Ruth dejó de transmitir. Vuelve a Inicio para ver otros directos.'});
    }
  },error=>console.warn('JEMMO WebRTC: no se pudo vigilar la presencia.',error));
}

function leaveViewer({navigate=false}={}){
  if(!viewerRoute)return;
  closeViewerPeer('left');
  presenceUnsubscribe?.();presenceUnsubscribe=null;
  roomUnsubscribe?.();roomUnsubscribe=null;
  dispatchState('viewer-left');
  if(navigate){
    if(history.length>1)history.back();else location.assign('inicio.html');
  }
}

function bindViewerUi(){
  if(!viewerRoute)return;
  showViewerShell();
  ui.reconnect()?.addEventListener('click',()=>void startViewer({manual:true}));
  ui.reconnectQuick()?.addEventListener('click',()=>void startViewer({manual:true}));
  ui.play()?.addEventListener('click',()=>void tryPlayRemote({fromGesture:true}));
  ui.video()?.addEventListener('click',()=>{if(ui.video()?.muted)void tryPlayRemote({fromGesture:true})});
}

window.addEventListener('jemmo-live-webrtc-host-start',event=>void startHost(event.detail||{}));
window.addEventListener('jemmo-live-webrtc-host-stream',event=>void replaceHostTracks(event.detail?.stream||null));
window.addEventListener('jemmo-live-webrtc-host-end',event=>void stopHost(event.detail?.reason||'manual'));
window.addEventListener('pagehide',()=>{
  if(viewerRoute)leaveViewer();
  else if(hostState)void stopHost('pagehide');
});

onAuthStateChanged(auth,user=>{
  currentUser=user||null;
  if(currentUser&&pendingHostStart){const detail=pendingHostStart;pendingHostStart=null;void startHost(detail)}
  if(currentUser&&viewerRoute){watchPresence();void startViewer()}
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindViewerUi,{once:true});else bindViewerUi();

window.JemmoLiveRTC=Object.freeze({
  version:'47.0',
  viewerRoute,
  hostUid:routeHostUid,
  reconnect:()=>startViewer({manual:true}),
  play:()=>tryPlayRemote({fromGesture:true}),
  leave:leaveViewer,
  getState:()=>({viewer:Boolean(viewerState),host:Boolean(hostState),connection:viewerState?.pc?.connectionState||null})
});
