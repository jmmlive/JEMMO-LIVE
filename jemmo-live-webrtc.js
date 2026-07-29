import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
const app=getApps()[0]||initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

const VERSION=52;
const PROTOCOL='jemmo-live-webrtc-v3';
const SIGNAL_COLLECTION='liveSignals';
const PRESENCE_COLLECTION='livePresences';
const PRESENCE_STALE_MS=180000;
const ROOM_STALE_MS=120000;
const ICE_GATHER_TIMEOUT_MS=8500;
const ANSWER_TIMEOUT_MS=16000;
const CONNECT_TIMEOUT_MS=28000;
const MEDIA_TIMEOUT_MS=12000;
const AUTO_RETRY_LIMIT=4;
const DEFAULT_MAX_P2P_VIEWERS=8;
const FIRESTORE_READ_TIMEOUT_MS=10000;
const FIRESTORE_WRITE_TIMEOUT_MS=12000;
const clean=(value,max=180)=>String(value??'').trim().slice(0,max);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function withTimeout(promise,timeoutMs,code,message){
  let timer=0;
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(Object.assign(new Error(message),{code})),timeoutMs);
  });
  return Promise.race([Promise.resolve(promise),timeout]).finally(()=>clearTimeout(timer));
}

function isTimeoutError(error){
  return firestoreCode(error).includes('timeout');
}

function firestoreFailureDetail(error,action){
  if(isPermissionError(error))return permissionMessage(action);
  if(isTimeoutError(error))return `Firestore no respondió a tiempo al ${action}. Comprueba la conexión de ambos móviles y vuelve a intentarlo.`;
  return clean(error?.message||`No se pudo ${action}.`,260);
}

const params=new URLSearchParams(location.search);
const routeHostUid=clean(params.get('hostUid')||params.get('watch')||'',180);
const viewerRoute=Boolean(routeHostUid&&(params.get('mode')==='viewer'||params.has('watch')));

function defaultRtcConfig(){
  return{
    iceServers:[
      {urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']}
    ],
    iceCandidatePoolSize:10,
    bundlePolicy:'max-bundle',
    rtcpMuxPolicy:'require'
  };
}

function configuredRtc(){
  const base=defaultRtcConfig();
  const supplied=window.JEMMO_RTC_CONFIG;
  if(!supplied||typeof supplied!=='object')return base;
  const iceServers=Array.isArray(supplied.iceServers)&&supplied.iceServers.length?supplied.iceServers:base.iceServers;
  return{
    ...base,
    ...supplied,
    iceServers,
    iceCandidatePoolSize:Number.isFinite(Number(supplied.iceCandidatePoolSize))?Math.max(0,Math.min(32,Number(supplied.iceCandidatePoolSize))):base.iceCandidatePoolSize
  };
}

let rtcConfig=configuredRtc();
let rtcServerUrls=[];
let turnConfigured=false;
let rtcCredentialsPromise=null;
function refreshRtcConfiguration(){
  rtcConfig=configuredRtc();
  rtcServerUrls=rtcConfig.iceServers.flatMap(server=>Array.isArray(server?.urls)?server.urls:[server?.urls]).filter(Boolean).map(String);
  turnConfigured=rtcServerUrls.some(url=>/^turns?:/i.test(url));
}
refreshRtcConfiguration();
const maxP2PViewers=Math.max(1,Math.min(20,Number(window.JEMMO_RTC_MAX_P2P_VIEWERS)||DEFAULT_MAX_P2P_VIEWERS));

let currentUser=null;
let pendingHostStart=null;
let hostState=null;
let viewerState=null;
let presenceUnsubscribe=null;
let roomUnsubscribe=null;
let reconnectTimer=0;
let automaticAttempts=0;
let networkListenersBound=false;
let activePresenceSeen=false;
let activeRoomSeen=false;
let authReadyResolve=null;
const authReady=new Promise(resolve=>{authReadyResolve=resolve});
let hostStartPromise=null;
let viewerStartPromise=null;

const ui={
  prep:()=>document.getElementById('prepScreen'),
  broadcast:()=>document.getElementById('broadcastScreen'),
  video:()=>document.getElementById('broadcastVideo'),
  backdrop:()=>document.getElementById('broadcastBackdrop'),
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
  window.dispatchEvent(new CustomEvent('jemmo-live-webrtc-state',{detail:{status,viewer:viewerRoute,hostUid:routeHostUid,version:VERSION,turnConfigured,...detail}}));
}

function diagnosticDetail(state,extra={}){
  return{
    sessionId:state?.id||'',
    connectionState:state?.pc?.connectionState||'',
    iceConnectionState:state?.pc?.iceConnectionState||'',
    iceGatheringState:state?.pc?.iceGatheringState||'',
    signalingState:state?.pc?.signalingState||'',
    answerReceived:Boolean(state?.answerReceived),
    receivedAudio:Boolean(state?.receivedAudio),
    receivedVideo:Boolean(state?.receivedVideo),
    inboundBytes:Number(state?.lastInboundBytes||0),
    ...extra
  };
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
  const reconnectQuick=ui.reconnectQuick();if(reconnectQuick)reconnectQuick.hidden=false;
}

function setViewerStatus(status,message='',options={}){
  if(!viewerRoute)return;
  showViewerShell();
  const box=ui.connection();
  const title=ui.title();
  const text=ui.text();
  const reconnect=ui.reconnect();
  const quick=ui.reconnectQuick();
  const play=ui.play();
  if(box){box.hidden=Boolean(options.hideBox);box.dataset.state=status}
  if(title)title.textContent=message||({checking:'Comprobando el LIVE…',signaling:'Preparando conexión segura…',connecting:'Conectando audio y vídeo…',connected:'Conectado al LIVE',ended:'El LIVE ha finalizado',offline:'Sin conexión a Internet',error:'No se pudo conectar'}[status]||'Conectando…');
  if(text)text.textContent=options.detail||'';
  if(reconnect)reconnect.hidden=!options.reconnect;
  if(quick)quick.hidden=options.quick===false;
  if(play)play.hidden=!options.play;
  dispatchState(status,{message,detail:options.detail||'',code:options.code||'',...(viewerState?diagnosticDetail(viewerState):{})});
}

function heartbeatMs(data){
  const serverValue=Number(data?.heartbeatAt?.toMillis?.()||0);
  return serverValue||Number(data?.heartbeatAtMs||0);
}

function freshLiveRecord(data,maxAge){
  if(data?.active!==true||data?.status!=='live')return false;
  const stamp=heartbeatMs(data);
  if(!stamp)return true;
  const age=Date.now()-stamp;
  return age<=maxAge&&age>-10*60*1000;
}

function freshPresence(data){
  return freshLiveRecord(data,PRESENCE_STALE_MS);
}

function freshRoom(data){
  return freshLiveRecord(data,ROOM_STALE_MS);
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
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID().replaceAll('-','');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,14)}`;
}

function sessionId(uid){
  return `${clean(uid,80)}_${Date.now().toString(36)}_${randomId().slice(0,18)}`;
}

function candidateSummary(sdp=''){
  const types={host:0,srflx:0,relay:0,prflx:0,unknown:0};
  const lines=String(sdp||'').split(/\r?\n/).filter(line=>line.startsWith('a=candidate:'));
  for(const line of lines){
    const match=line.match(/\styp\s(host|srflx|relay|prflx)(?:\s|$)/i);
    const type=match?.[1]?.toLowerCase()||'unknown';
    types[type]=(types[type]||0)+1;
  }
  return{total:lines.length,...types,hasRelay:types.relay>0};
}

function firestoreCode(error){
  return clean(error?.code||error?.name||'',80).toLowerCase();
}

function isPermissionError(error){
  const code=firestoreCode(error);
  return code.includes('permission-denied')||code.includes('permission_denied');
}

function permissionMessage(action='usar la señalización'){
  return `Firestore bloqueó ${action}. Debes añadir el bloque FIRESTORE_REGLAS_WEBRTC_PRUEBA_52 a las reglas actuales y publicarlas.`;
}


async function ensureRtcCredentials(){
  const endpoint=clean(window.JEMMO_RTC_CREDENTIALS_ENDPOINT||'',600);
  if(!endpoint||turnConfigured)return turnConfigured;
  if(rtcCredentialsPromise)return rtcCredentialsPromise;
  rtcCredentialsPromise=(async()=>{
    try{
      const token=await currentUser?.getIdToken?.();
      const response=await fetch(endpoint,{
        method:'GET',
        headers:token?{Authorization:`Bearer ${token}`}:{},
        cache:'no-store',
        credentials:'same-origin'
      });
      if(!response.ok)throw new Error(`TURN credentials HTTP ${response.status}`);
      const payload=await response.json();
      const iceServers=Array.isArray(payload?.iceServers)?payload.iceServers:(Array.isArray(payload)?payload:null);
      if(!iceServers?.length)throw new Error('La respuesta TURN no contiene iceServers.');
      window.JEMMO_RTC_CONFIG={...(window.JEMMO_RTC_CONFIG||{}),iceServers};
      refreshRtcConfiguration();
      dispatchState('rtc-credentials-loaded',{turnConfigured,serverCount:iceServers.length});
      return turnConfigured;
    }catch(error){
      console.warn('JEMMO WebRTC: no se pudieron obtener credenciales TURN temporales.',error);
      dispatchState('rtc-credentials-error',{error:clean(error?.message,240)});
      return false;
    }
  })();
  return rtcCredentialsPromise;
}

function createPeer(role='peer'){
  const pc=new RTCPeerConnection(rtcConfig);
  pc.__jemmoRole=role;
  pc.addEventListener('icecandidateerror',event=>{
    console.warn(`JEMMO WebRTC ${role} ICE:`,event.errorText||event.errorCode||event);
    dispatchState('ice-candidate-error',{role,errorCode:event.errorCode||'',errorText:event.errorText||''});
  });
  return pc;
}

function waitForIceGatheringComplete(pc,timeoutMs=ICE_GATHER_TIMEOUT_MS){
  if(pc.iceGatheringState==='complete')return Promise.resolve({complete:true,timedOut:false});
  return new Promise(resolve=>{
    let done=false;
    const finish=(complete,timedOut)=>{
      if(done)return;done=true;
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange',onChange);
      resolve({complete,timedOut});
    };
    const onChange=()=>{if(pc.iceGatheringState==='complete')finish(true,false)};
    const timer=setTimeout(()=>finish(pc.iceGatheringState==='complete',true),timeoutMs);
    pc.addEventListener('icegatheringstatechange',onChange);
  });
}

async function addCandidateSafely(pc,data,queue){
  if(!data?.candidate||pc.signalingState==='closed')return;
  const candidate=new RTCIceCandidate({
    candidate:data.candidate,
    sdpMid:data.sdpMid??null,
    sdpMLineIndex:Number.isInteger(data.sdpMLineIndex)?data.sdpMLineIndex:null,
    usernameFragment:data.usernameFragment??null
  });
  if(!pc.remoteDescription){queue.push(candidate);return}
  try{await pc.addIceCandidate(candidate)}catch(error){console.warn('JEMMO WebRTC: candidato ICE descartado.',error)}
}

async function flushCandidates(pc,queue){
  while(queue.length&&pc.signalingState!=='closed'){
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

function adaptiveBitrate(kind){
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const type=String(connection?.effectiveType||'').toLowerCase();
  const saveData=Boolean(connection?.saveData);
  if(kind==='audio'){
    const requested=Math.max(24000,Number(window.JEMMO_RTC_AUDIO_BITRATE)||48000);
    return Math.min(requested,(type==='slow-2g'||type==='2g')?28000:type==='3g'||saveData?36000:requested);
  }
  const requested=Math.max(180000,Number(window.JEMMO_RTC_VIDEO_BITRATE)||650000);
  const ceiling=(type==='slow-2g'||type==='2g')?180000:type==='3g'?360000:saveData?300000:requested;
  return Math.min(requested,ceiling);
}

async function configureSender(sender,kind){
  if(!sender)return;
  try{
    const parameters=sender.getParameters();
    parameters.encodings=parameters.encodings?.length?parameters.encodings:[{}];
    if(kind==='video'){
      parameters.encodings[0].maxBitrate=adaptiveBitrate('video');
      parameters.encodings[0].maxFramerate=Math.max(12,Math.min(30,Number(window.JEMMO_RTC_VIDEO_FPS)||24));
      parameters.degradationPreference='balanced';
    }else if(kind==='audio'){
      parameters.encodings[0].maxBitrate=adaptiveBitrate('audio');
    }
    await sender.setParameters(parameters);
  }catch(error){
    console.warn(`JEMMO WebRTC: no se pudieron ajustar parámetros ${kind}.`,error);
  }
}

async function attachHostTracks(pc,stream){
  const tracks=currentTracks(stream);
  const assigned=new Set();
  for(const transceiver of pc.getTransceivers()){
    if(transceiver.stopped)continue;
    const kind=transceiver.receiver?.track?.kind||transceiver.sender?.track?.kind;
    if(kind!=='audio'&&kind!=='video')continue;
    const track=tracks[kind]||null;
    if(track){
      try{track.contentHint=kind==='video'?'motion':'speech'}catch{}
    }
    try{await transceiver.sender.replaceTrack(track)}catch(error){console.warn(`JEMMO WebRTC: no se pudo asignar ${kind}.`,error)}
    try{transceiver.direction='sendonly'}catch{}
    await configureSender(transceiver.sender,kind);
    assigned.add(kind);
  }
  return{audio:Boolean(tracks.audio&&assigned.has('audio')),video:Boolean(tracks.video&&assigned.has('video'))};
}

async function replaceHostTracks(stream){
  if(!hostState)return;
  hostState.stream=stream instanceof MediaStream?stream:null;
  hostState.media=currentTracks(hostState.stream);
  await Promise.all([...hostState.sessions.values()].map(async session=>{
    if(session.pc.signalingState==='closed')return;
    await attachHostTracks(session.pc,hostState.stream);
  }));
  await setDoc(hostState.roomRef,{
    streamReady:Boolean(hostState.media.video),
    audioReady:Boolean(hostState.media.audio),
    videoReady:Boolean(hostState.media.video),
    mediaUpdatedAt:serverTimestamp(),
    mediaUpdatedAtMs:Date.now(),
    version:VERSION
  },{merge:true}).catch(error=>console.warn('JEMMO WebRTC: no se actualizó el estado multimedia.',error));
}

function clearSessionTimers(session){
  if(!session)return;
  for(const timer of session.timers||[])clearTimeout(timer);
  session.timers=[];
  if(session.statsTimer)clearInterval(session.statsTimer);
  session.statsTimer=0;
}

function closeHostSession(id,reason='closed',{mark=true}={}){
  const session=hostState?.sessions.get(id);
  if(!session)return;
  clearSessionTimers(session);
  session.unsubCandidates?.();
  try{session.pc.close()}catch{}
  hostState.sessions.delete(id);
  if(mark)void setDoc(session.ref,{status:reason,updatedAt:serverTimestamp(),updatedAtMs:Date.now(),version:VERSION},{merge:true}).catch(()=>{});
}

async function publishIceCandidate(parentRef,subcollection,candidate,owner){
  try{
    await addDoc(collection(parentRef,subcollection),{
      ...candidate,
      ownerUid:owner,
      createdAt:serverTimestamp(),
      createdAtMs:Date.now(),
      version:VERSION
    });
    return true;
  }catch(error){
    console.warn(`JEMMO WebRTC: no se publicó ICE en ${subcollection}.`,error);
    dispatchState('ice-publish-error',{collection:subcollection,permissionDenied:isPermissionError(error),error:clean(error?.message,220)});
    return false;
  }
}

async function answerViewer(viewerSnapshot){
  if(!hostState||!viewerSnapshot.exists())return;
  const id=viewerSnapshot.id;
  const data=viewerSnapshot.data()||{};
  const offerRevision=Math.max(0,Number(data.offerRevision)||0);
  if(!data.offer||offerRevision<1||data.status!=='requesting')return;
  if(clean(data.hostUid,180)!==hostState.uid)return;
  if(clean(data.roomSessionId,180)!==hostState.roomSessionId)return;
  if(!clean(data.viewerUid,180))return;

  const existing=hostState.sessions.get(id);
  if(existing&&existing.offerRevision>=offerRevision)return;
  if(existing)closeHostSession(id,'superseded');
  if(hostState.sessions.size>=maxP2PViewers){
    await setDoc(viewerSnapshot.ref,{status:'capacity',capacity:maxP2PViewers,updatedAt:serverTimestamp(),updatedAtMs:Date.now(),version:VERSION},{merge:true}).catch(()=>{});
    return;
  }

  const viewerRef=viewerSnapshot.ref;
  const pc=createPeer('host');
  const queued=[];
  const seenCandidates=new Set();
  const session={id,ref:viewerRef,pc,queued,unsubCandidates:null,timers:[],statsTimer:0,offerRevision,connected:false};
  hostState.sessions.set(id,session);

  pc.addEventListener('icecandidate',event=>{
    if(hostState?.sessions.get(id)!==session)return;
    const candidate=serializeCandidate(event.candidate);
    if(candidate)void publishIceCandidate(viewerRef,'hostCandidates',candidate,hostState?.uid||'');
  });
  pc.addEventListener('connectionstatechange',()=>{
    const state=pc.connectionState;
    if(state==='connected'){
      session.connected=true;
      void setDoc(viewerRef,{status:'connected',connectedAt:serverTimestamp(),connectedAtMs:Date.now(),version:VERSION},{merge:true}).catch(()=>{});
    }
    if(state==='failed'||state==='closed')closeHostSession(id,state);
    if(state==='disconnected'){
      const timer=setTimeout(()=>{if(pc.connectionState==='disconnected')closeHostSession(id,'disconnected')},15000);
      session.timers.push(timer);
    }
  });
  pc.addEventListener('iceconnectionstatechange',()=>{
    if(pc.iceConnectionState==='failed')closeHostSession(id,'ice-failed');
  });
  session.unsubCandidates=onSnapshot(collection(viewerRef,'viewerCandidates'),snapshot=>{
    snapshot.docChanges().forEach(change=>{
      if(change.type!=='added'||seenCandidates.has(change.doc.id))return;
      seenCandidates.add(change.doc.id);
      void addCandidateSafely(pc,change.doc.data(),queued);
    });
  },error=>{
    console.warn('JEMMO WebRTC: no se pudieron leer candidatos del espectador.',error);
    dispatchState('host-candidate-read-error',{permissionDenied:isPermissionError(error),error:clean(error?.message,220)});
  });

  try{
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    await flushCandidates(pc,queued);
    const media=await attachHostTracks(pc,hostState.stream);
    if(!media.video){
      await setDoc(viewerRef,{status:'host-media-missing',media:{audio:media.audio,video:media.video},updatedAt:serverTimestamp(),updatedAtMs:Date.now(),version:VERSION},{merge:true});
      closeHostSession(id,'host-media-missing',{mark:false});
      return;
    }
    const answer=await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const gathering=await waitForIceGatheringComplete(pc);
    const fullAnswer=serializeDescription(pc.localDescription);
    const summary=candidateSummary(fullAnswer?.sdp);
    await withTimeout(setDoc(viewerRef,{
      answer:fullAnswer,
      answerRevision:offerRevision,
      answerIceComplete:gathering.complete,
      answerIceTimedOut:gathering.timedOut,
      answerCandidates:summary,
      status:'answered',
      hostUid:hostState.uid,
      media:{audio:media.audio,video:media.video},
      answeredAt:serverTimestamp(),
      answeredAtMs:Date.now(),
      updatedAt:serverTimestamp(),
      updatedAtMs:Date.now(),
      protocol:PROTOCOL,
      version:VERSION
    },{merge:true}),FIRESTORE_WRITE_TIMEOUT_MS,'firestore-answer-timeout','Firestore no confirmó la respuesta del anfitrión.');
    const timeout=setTimeout(()=>{
      if(hostState?.sessions.get(id)===session&&!session.connected)closeHostSession(id,'host-connect-timeout');
    },CONNECT_TIMEOUT_MS+8000);
    session.timers.push(timeout);
  }catch(error){
    console.error('JEMMO WebRTC: error al responder al espectador.',error);
    const denied=isPermissionError(error);
    await setDoc(viewerRef,{status:denied?'permission-error':'answer-error',errorCode:firestoreCode(error),errorMessage:clean(error?.message,260),updatedAt:serverTimestamp(),updatedAtMs:Date.now(),version:VERSION},{merge:true}).catch(()=>{});
    closeHostSession(id,denied?'permission-error':'answer-error',{mark:false});
    dispatchState('host-answer-error',{permissionDenied:denied,error:clean(error?.message,260)});
  }
}

async function startHostInternal(detail={}){
  if(viewerRoute)return false;
  if(!currentUser){
    pendingHostStart=detail;
    await Promise.race([authReady,wait(8000)]);
    if(!currentUser){
      dispatchState('host-error',{code:'auth-not-ready',message:'La sesión de usuario no está preparada. Vuelve a iniciar sesión antes de transmitir.'});
      return false;
    }
  }
  if(!window.RTCPeerConnection){dispatchState('host-error',{code:'webrtc-unsupported',message:'Este navegador no admite WebRTC.'});return false}
  await ensureRtcCredentials();
  const stream=detail.stream instanceof MediaStream?detail.stream:(window.__jemmoLiveHostStream instanceof MediaStream?window.__jemmoLiveHostStream:null);
  const media=currentTracks(stream);
  if(!media.video){
    pendingHostStart=detail;
    dispatchState('host-error',{code:'video-missing',message:'El LIVE no tiene una pista de cámara activa.'});
    return false;
  }

  if(hostState?.uid===currentUser.uid){
    await replaceHostTracks(stream);
    return true;
  }
  await stopHost('restart',{markEnded:false});

  const uid=currentUser.uid;
  const roomRef=doc(db,SIGNAL_COLLECTION,uid);
  const roomSessionId=randomId();
  const startedAtMs=Date.now();
  const state={uid,roomRef,roomSessionId,stream,media,sessions:new Map(),unsubViewers:null,heartbeat:0,startedAtMs};
  hostState=state;
  window.__jemmoLiveHostIntent={...(window.__jemmoLiveHostIntent||{}),...detail,active:true,stream};
  window.__jemmoLiveHostStream=stream;

  try{
    await withTimeout(setDoc(roomRef,{
      hostUid:uid,
      roomSessionId,
      active:true,
      status:'live',
      protocol:PROTOCOL,
      transport:'p2p',
      maxP2PViewers,
      turnConfigured,
      streamReady:Boolean(media.video),
      audioReady:Boolean(media.audio),
      videoReady:Boolean(media.video),
      startedAt:serverTimestamp(),
      startedAtMs,
      heartbeatAt:serverTimestamp(),
      heartbeatAtMs:Date.now(),
      userAgent:clean(navigator.userAgent,240),
      version:VERSION
    },{merge:true}),FIRESTORE_WRITE_TIMEOUT_MS,'firestore-room-timeout','Firestore no confirmó la creación de la sala LIVE.');
  }catch(error){
    hostState=null;
    const denied=isPermissionError(error);
    dispatchState('host-error',{code:denied?'firestore-permission':isTimeoutError(error)?'firestore-timeout':'room-write',message:firestoreFailureDetail(error,'crear la sala LIVE'),permissionDenied:denied});
    return false;
  }

  try{
    const viewersQuery=query(
      collection(roomRef,'viewers'),
      where('roomSessionId','==',roomSessionId),
      limit(60)
    );
    state.unsubViewers=onSnapshot(viewersQuery,snapshot=>{
      snapshot.docChanges().forEach(change=>{
        if(change.type==='removed'){closeHostSession(change.doc.id,'removed',{mark:false});return}
        void answerViewer(change.doc);
      });
    },error=>{
      console.error('JEMMO WebRTC: no se pudieron escuchar espectadores.',error);
      dispatchState('host-listener-error',{code:isPermissionError(error)?'firestore-permission':'viewer-listener',message:isPermissionError(error)?permissionMessage('leer las solicitudes de espectadores'):clean(error?.message,260),permissionDenied:isPermissionError(error)});
    });
  }catch(error){
    console.error('JEMMO WebRTC: consulta de espectadores no disponible.',error);
    dispatchState('host-listener-error',{code:'viewer-query',message:clean(error?.message,260)});
  }

  state.heartbeat=setInterval(()=>{
    if(hostState!==state)return;
    const latest=currentTracks(state.stream);
    state.media=latest;
    void setDoc(roomRef,{
      active:true,status:'live',heartbeatAt:serverTimestamp(),heartbeatAtMs:Date.now(),
      streamReady:Boolean(latest.video),audioReady:Boolean(latest.audio),videoReady:Boolean(latest.video),
      activePeerConnections:state.sessions.size,turnConfigured,protocol:PROTOCOL,version:VERSION
    },{merge:true}).catch(error=>dispatchState('host-heartbeat-error',{error:clean(error?.message,220),permissionDenied:isPermissionError(error)}));
  },15000);
  pendingHostStart=null;
  dispatchState('host-ready',{hostUid:uid,roomSessionId,audioReady:Boolean(media.audio),videoReady:Boolean(media.video),maxP2PViewers});
  return true;
}


function startHost(detail={}){
  if(hostStartPromise)return hostStartPromise;
  hostStartPromise=startHostInternal(detail).finally(()=>{hostStartPromise=null});
  return hostStartPromise;
}

async function stopHost(reason='manual',{markEnded=true}={}){
  const state=hostState;
  hostState=null;
  pendingHostStart=null;
  if(!state)return;
  clearInterval(state.heartbeat);
  state.unsubViewers?.();
  for(const id of [...state.sessions.keys()]){
    const session=state.sessions.get(id);
    clearSessionTimers(session);
    session?.unsubCandidates?.();
    try{session?.pc.close()}catch{}
    if(markEnded)void setDoc(session.ref,{status:'ended',endReason:reason,endedAt:serverTimestamp(),endedAtMs:Date.now(),version:VERSION},{merge:true}).catch(()=>{});
  }
  state.sessions.clear();
  if(markEnded){
    await setDoc(state.roomRef,{active:false,status:'ended',endReason:reason,endedAt:serverTimestamp(),endedAtMs:Date.now(),heartbeatAtMs:Date.now(),activePeerConnections:0,version:VERSION},{merge:true}).catch(()=>{});
  }
  if(window.__jemmoLiveHostIntent)window.__jemmoLiveHostIntent.active=false;
  window.__jemmoLiveHostStream=null;
  dispatchState('host-stopped',{reason});
}

function closeViewerPeer(reason='closed',{mark=true,clearMedia=true}={}){
  clearTimeout(reconnectTimer);reconnectTimer=0;
  const state=viewerState;
  viewerState=null;
  if(!state)return;
  clearSessionTimers(state);
  state.unsubDoc?.();
  state.unsubCandidates?.();
  try{state.pc.close()}catch{}
  if(clearMedia){
    const video=ui.video();
    const backdrop=ui.backdrop();
    if(video){video.pause();video.srcObject=null;video.muted=true}
    if(backdrop){backdrop.pause();backdrop.srcObject=null;backdrop.muted=true}
  }
  if(mark)void setDoc(state.viewerRef,{status:reason,updatedAt:serverTimestamp(),updatedAtMs:Date.now(),version:VERSION},{merge:true}).catch(()=>{});
}

async function tryPlayRemote({fromGesture=false}={}){
  const video=ui.video();
  if(!video||!video.srcObject)return false;
  video.autoplay=true;
  video.playsInline=true;
  video.volume=1;
  if(fromGesture)video.muted=false;
  try{
    await video.play();
    if(!video.muted){setViewerStatus('connected','Conectado al LIVE',{hideBox:true,quick:true});return true}
  }catch(error){
    console.warn('JEMMO WebRTC: reproducción con sonido bloqueada.',error);
  }
  video.muted=true;
  try{await video.play()}catch{}
  setViewerStatus('connected','Vídeo conectado',{detail:'Toca el botón para activar el sonido en Android.',play:true,reconnect:true,quick:true});
  return false;
}

async function waitForRoomReady(roomRef,timeoutMs=9000){
  const started=Date.now();
  let last=null;
  while(Date.now()-started<timeoutMs){
    let snap;
    try{snap=await withTimeout(getDoc(roomRef),4000,'firestore-room-read-timeout','Firestore no respondió al comprobar la sala.')}catch{await wait(700);continue}
    if(snap.exists()){
      last=snap.data()||{};
      if(freshRoom(last)&&last.streamReady)return last;
    }
    await wait(700);
  }
  return last;
}

async function validatePresenceAndRoom(){
  const presenceRef=doc(db,PRESENCE_COLLECTION,routeHostUid);
  const roomRef=doc(db,SIGNAL_COLLECTION,routeHostUid);
  const [presenceSnap,roomSnap]=await withTimeout(Promise.all([getDoc(presenceRef),getDoc(roomRef)]),FIRESTORE_READ_TIMEOUT_MS,'firestore-read-timeout','Firestore no respondió al comprobar el LIVE.');
  if(!presenceSnap.exists())throw Object.assign(new Error('Esta transmisión ya no está disponible.'),{code:'presence-missing'});
  const presence=presenceSnap.data()||{};
  if(!freshPresence(presence))throw Object.assign(new Error('El LIVE ha finalizado o perdió la conexión.'),{code:'presence-stale'});
  renderHostIdentity(presence);
  let room=roomSnap.exists()?roomSnap.data()||{}:null;
  if(!freshRoom(room)||!room?.streamReady)room=await waitForRoomReady(roomRef);
  if(!freshRoom(room))throw Object.assign(new Error('El emisor está visible como EN LIVE, pero su sala de señalización no está activa. Ambos móviles deben usar la PRUEBA 52.'),{code:'room-not-ready'});
  if(clean(room.hostUid,180)!==routeHostUid)throw Object.assign(new Error('La sala LIVE no coincide con el UID real del emisor.'),{code:'host-uid-mismatch'});
  if(clean(room.protocol,80)!==PROTOCOL||!clean(room.roomSessionId,180))throw Object.assign(new Error('El emisor usa una versión antigua de la conexión LIVE. Debe actualizar a PRUEBA 52 y reiniciar el directo.'),{code:'protocol-mismatch'});
  if(!room.streamReady)throw Object.assign(new Error('El emisor inició el LIVE sin una pista de cámara disponible.'),{code:'host-media-missing'});
  return{presence,room,roomRef};
}

async function inboundBytes(pc){
  let total=0;
  const stats=await pc.getStats();
  stats.forEach(report=>{
    if(report.type==='inbound-rtp'&&!report.isRemote&&report.kind!=='data'&&!report.mediaType?.includes('data'))total+=Number(report.bytesReceived||0);
  });
  return total;
}

function startViewerStats(state){
  clearInterval(state.statsTimer);
  let lastProgressAt=Date.now();
  let previous=0;
  state.statsTimer=setInterval(async()=>{
    if(viewerState!==state||state.pc.signalingState==='closed')return;
    try{
      const bytes=await inboundBytes(state.pc);
      state.lastInboundBytes=bytes;
      if(bytes>previous){previous=bytes;lastProgressAt=Date.now();state.mediaFlowing=true}
      if(state.connected&&Date.now()-lastProgressAt>MEDIA_TIMEOUT_MS){
        scheduleReconnect('La conexión se abrió, pero no llegaron datos de audio ni vídeo.',{code:'no-inbound-media'});
      }
    }catch{}
  },3000);
}

function explainIceFailure(state){
  const local=state?.localCandidateSummary||{};
  const remote=state?.remoteCandidateSummary||{};
  const relay=Boolean(local.hasRelay||remote.hasRelay||turnConfigured);
  if(!relay)return 'La red móvil no permitió una ruta directa. Falta configurar un servidor TURN propio para garantizar la conexión.';
  return 'La negociación ICE falló incluso con las rutas disponibles. Comprueba la cobertura y vuelve a conectar.';
}

async function startViewerInternal({manual=false}={}){
  if(!viewerRoute||!currentUser)return false;
  if(!window.RTCPeerConnection){setViewerStatus('error','Este móvil no admite WebRTC',{detail:'Actualiza Chrome o abre JEMMO LIVE en un navegador compatible.',code:'webrtc-unsupported'});return false}
  if(!navigator.onLine){setViewerStatus('offline','Sin conexión a Internet',{detail:'Cuando vuelva la red, JEMMO intentará entrar de nuevo.',reconnect:true,code:'offline'});return false}
  await ensureRtcCredentials();
  if(manual)automaticAttempts=0;
  closeViewerPeer('reconnecting');
  setViewerStatus('checking','Comprobando el LIVE…',{detail:'Verificando presencia, señalización y cámara del emisor.',quick:true});

  let validated;
  try{
    validated=await validatePresenceAndRoom();
  }catch(error){
    const denied=isPermissionError(error);
    const code=clean(error?.code||'validation',80);
    const terminal=['presence-missing','presence-stale'].includes(code);
    const title=denied?'Firestore bloqueó la conexión':isTimeoutError(error)?'Firestore no respondió':error.message;
    const detail=denied?permissionMessage('leer la presencia o la sala LIVE'):isTimeoutError(error)?firestoreFailureDetail(error,'comprobar el LIVE'):'Pulsa RECONECTAR si el emisor sigue transmitiendo.';
    setViewerStatus(terminal?'ended':'error',title,{detail,reconnect:true,code:denied?'firestore-permission':isTimeoutError(error)?'firestore-timeout':code});
    return false;
  }

  activePresenceSeen=true;
  activeRoomSeen=true;
  const hostName=clean(validated.presence.name||params.get('hostName')||'Emisor JEMMO',80);
  setViewerStatus('signaling',`Entrando al LIVE de ${hostName}…`,{detail:'Creando la sesión antes de recopilar ICE. Tu cámara y tu micrófono no se activarán.',quick:true});

  const pc=createPeer('viewer');
  const id=sessionId(currentUser.uid);
  const roomRef=validated.roomRef;
  const viewerRef=doc(collection(roomRef,'viewers'),id);
  const remoteStream=new MediaStream();
  const queued=[];
  const seenCandidates=new Set();
  const roomSessionId=clean(validated.room.roomSessionId,180);
  const state={
    id,roomRef,viewerRef,roomSessionId,pc,remoteStream,queued,unsubDoc:null,unsubCandidates:null,timers:[],statsTimer:0,
    receivedAudio:false,receivedVideo:false,connected:false,answerReceived:false,mediaFlowing:false,lastInboundBytes:0,
    localCandidateSummary:null,remoteCandidateSummary:null,createdAtMs:Date.now(),offerRevision:1
  };
  viewerState=state;

  try{
    await withTimeout(setDoc(viewerRef,{
      viewerUid:currentUser.uid,
      hostUid:routeHostUid,
      roomSessionId,
      status:'initializing',
      offerRevision:0,
      answerRevision:0,
      createdAt:serverTimestamp(),
      createdAtMs:state.createdAtMs,
      updatedAt:serverTimestamp(),
      updatedAtMs:Date.now(),
      userAgent:clean(navigator.userAgent,240),
      protocol:PROTOCOL,
      turnConfigured,
      version:VERSION
    }),FIRESTORE_WRITE_TIMEOUT_MS,'firestore-session-timeout','Firestore no confirmó la sesión del espectador.');
  }catch(error){
    closeViewerPeer('session-create-error',{mark:false});
    const denied=isPermissionError(error);
    setViewerStatus('error','No se pudo crear la sesión del espectador',{detail:firestoreFailureDetail(error,'crear la sesión del espectador'),reconnect:true,code:denied?'firestore-permission':isTimeoutError(error)?'firestore-timeout':'session-create'});
    return false;
  }

  pc.addTransceiver('audio',{direction:'recvonly'});
  pc.addTransceiver('video',{direction:'recvonly'});
  pc.addEventListener('track',event=>{
    if(viewerState!==state)return;
    const track=event.track;
    if(!remoteStream.getTracks().some(item=>item.id===track.id))remoteStream.addTrack(track);
    if(track.kind==='audio')state.receivedAudio=true;
    if(track.kind==='video')state.receivedVideo=true;
    const video=ui.video();
    const backdrop=ui.backdrop();
    if(video&&video.srcObject!==remoteStream){
      video.srcObject=remoteStream;
      video.autoplay=true;
      video.muted=true;
      video.playsInline=true;
    }
    if(backdrop&&backdrop.srcObject!==remoteStream){
      backdrop.srcObject=remoteStream;
      backdrop.autoplay=true;
      backdrop.muted=true;
      backdrop.playsInline=true;
      void backdrop.play().catch(()=>{});
    }
    track.addEventListener('unmute',()=>{state.mediaFlowing=true;void tryPlayRemote()});
    track.addEventListener('mute',()=>dispatchState('remote-track-muted',{kind:track.kind,...diagnosticDetail(state)}));
    track.addEventListener('ended',()=>{
      if(viewerState!==state)return;
      if(track.kind==='audio')state.receivedAudio=false;
      if(track.kind==='video')state.receivedVideo=false;
      if(!state.receivedAudio&&!state.receivedVideo)scheduleReconnect('Las pistas del LIVE se interrumpieron.',{code:'tracks-ended'});
    },{once:true});
    void tryPlayRemote();
  });
  pc.addEventListener('icecandidate',event=>{
    if(viewerState!==state)return;
    const candidate=serializeCandidate(event.candidate);
    if(candidate)void publishIceCandidate(viewerRef,'viewerCandidates',candidate,currentUser?.uid||'');
  });
  pc.addEventListener('connectionstatechange',()=>{
    if(viewerState!==state)return;
    const connection=pc.connectionState;
    dispatchState('viewer-connection-state',diagnosticDetail(state));
    if(connection==='connected'){
      state.connected=true;automaticAttempts=0;
      setViewerStatus('connected','Conectado al LIVE',{detail:state.receivedVideo?'Recibiendo la transmisión.':'Conexión abierta; esperando la pista de vídeo.',hideBox:false,quick:true});
      startViewerStats(state);
      void tryPlayRemote();
    }
    if(connection==='failed')scheduleReconnect(explainIceFailure(state),{code:'connection-failed'});
    if(connection==='disconnected'){
      const timer=setTimeout(()=>{if(viewerState===state&&pc.connectionState==='disconnected')scheduleReconnect('Se perdió temporalmente la conexión.',{code:'connection-disconnected'})},10000);
      state.timers.push(timer);
    }
  });
  pc.addEventListener('iceconnectionstatechange',()=>{
    if(viewerState!==state)return;
    const ice=pc.iceConnectionState;
    if(ice==='checking')setViewerStatus('connecting','Comprobando la ruta de red…',{detail:turnConfigured?'Probando conexión directa y retransmisión TURN.':'Probando conexión directa STUN. TURN todavía no está configurado.',quick:true});
    if(ice==='failed')scheduleReconnect(explainIceFailure(state),{code:'ice-failed'});
  });

  state.unsubDoc=onSnapshot(viewerRef,async snapshot=>{
    if(viewerState!==state||!snapshot.exists())return;
    const data=snapshot.data()||{};
    if(data.answer&&Number(data.answerRevision||0)>=state.offerRevision&&!state.answerReceived){
      state.answerReceived=true;
      state.remoteCandidateSummary=data.answerCandidates||candidateSummary(data.answer?.sdp);
      try{
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        await flushCandidates(pc,queued);
        setViewerStatus('connecting','Respuesta recibida',{detail:'Negociando audio, vídeo y ruta ICE.',quick:true});
      }catch(error){
        console.error('JEMMO WebRTC: respuesta inválida.',error);
        scheduleReconnect('La respuesta WebRTC del emisor no se pudo aplicar.',{code:'remote-answer-invalid'});
      }
    }
    if(data.status==='capacity'){
      closeViewerPeer('capacity',{mark:false});
      setViewerStatus('error','El LIVE alcanzó el límite P2P de prueba',{detail:`Esta versión directa admite ${Number(data.capacity)||maxP2PViewers} espectadores simultáneos por móvil. Para miles de espectadores JEMMO necesita un servidor SFU de producción.`,reconnect:true,code:'capacity'});
    }
    if(data.status==='host-media-missing'){
      closeViewerPeer('host-media-missing',{mark:false});
      setViewerStatus('error','El emisor no está enviando cámara',{detail:'Debe volver a activar la cámara y reiniciar el LIVE.',reconnect:true,code:'host-media-missing'});
    }
    if(data.status==='permission-error'){
      closeViewerPeer('permission-error',{mark:false});
      setViewerStatus('error','Firestore bloqueó la respuesta del emisor',{detail:permissionMessage('publicar la respuesta del anfitrión'),reconnect:true,code:'firestore-permission'});
    }
    if(data.status==='answer-error'){
      closeViewerPeer('answer-error',{mark:false});
      setViewerStatus('error','El emisor no pudo responder',{detail:clean(data.errorMessage||'Error al preparar la respuesta WebRTC.',260),reconnect:true,code:'answer-error'});
    }
    if(data.status==='ended'){
      closeViewerPeer('ended',{mark:false});
      setViewerStatus('ended','El emisor finalizó el LIVE',{detail:'Puedes volver a Inicio.',reconnect:false,quick:false,code:'ended'});
    }
  },error=>{
    console.warn('JEMMO WebRTC: no se pudo leer la respuesta.',error);
    const denied=isPermissionError(error);
    scheduleReconnect(denied?permissionMessage('leer la respuesta del emisor'):'No se pudo leer la respuesta del emisor.',{code:denied?'firestore-permission':'answer-listener'});
  });

  state.unsubCandidates=onSnapshot(collection(viewerRef,'hostCandidates'),snapshot=>{
    snapshot.docChanges().forEach(change=>{
      if(change.type!=='added'||seenCandidates.has(change.doc.id))return;
      seenCandidates.add(change.doc.id);
      void addCandidateSafely(pc,change.doc.data(),queued);
    });
  },error=>{
    console.warn('JEMMO WebRTC: no se pudieron leer candidatos del emisor.',error);
    dispatchState('viewer-candidate-read-error',{permissionDenied:isPermissionError(error),error:clean(error?.message,220)});
  });

  try{
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    const gathering=await waitForIceGatheringComplete(pc);
    const fullOffer=serializeDescription(pc.localDescription);
    state.localCandidateSummary=candidateSummary(fullOffer?.sdp);
    await withTimeout(setDoc(viewerRef,{
      offer:fullOffer,
      offerRevision:state.offerRevision,
      offerIceComplete:gathering.complete,
      offerIceTimedOut:gathering.timedOut,
      offerCandidates:state.localCandidateSummary,
      status:'requesting',
      requestedAt:serverTimestamp(),
      requestedAtMs:Date.now(),
      updatedAt:serverTimestamp(),
      updatedAtMs:Date.now(),
      protocol:PROTOCOL,
      version:VERSION
    },{merge:true}),FIRESTORE_WRITE_TIMEOUT_MS,'firestore-offer-timeout','Firestore no confirmó la oferta del espectador.');
  }catch(error){
    console.error('JEMMO WebRTC: no se pudo crear la oferta.',error);
    closeViewerPeer('offer-error');
    const denied=isPermissionError(error);
    setViewerStatus('error','No se pudo iniciar la conexión',{detail:firestoreFailureDetail(error,'publicar la oferta del espectador'),reconnect:true,code:denied?'firestore-permission':isTimeoutError(error)?'firestore-timeout':'offer-error'});
    return false;
  }

  const answerTimer=setTimeout(async()=>{
    if(viewerState!==state||state.answerReceived)return;
    let room=null;
    try{const snap=await withTimeout(getDoc(roomRef),4000,'firestore-room-read-timeout','Firestore no respondió al revisar la sala.');room=snap.exists()?snap.data()||{}:null}catch{}
    if(!freshRoom(room))scheduleReconnect('La sala de señalización del emisor dejó de responder.',{code:'room-stale'});
    else scheduleReconnect('El emisor está en LIVE, pero no recibió o no pudo responder la solicitud. Revisa las reglas Firestore PRUEBA 52 y confirma que ambos móviles estén actualizados.',{code:'answer-timeout'});
  },ANSWER_TIMEOUT_MS);
  state.timers.push(answerTimer);

  const connectTimer=setTimeout(()=>{
    if(viewerState===state&&!state.connected)scheduleReconnect(explainIceFailure(state),{code:'connect-timeout'});
  },CONNECT_TIMEOUT_MS);
  state.timers.push(connectTimer);
  return true;
}

function startViewer(options={}){
  if(viewerStartPromise)return viewerStartPromise;
  viewerStartPromise=startViewerInternal(options).finally(()=>{viewerStartPromise=null});
  return viewerStartPromise;
}

function scheduleReconnect(reason,{code='retry'}={}){
  if(!viewerRoute)return;
  clearTimeout(reconnectTimer);
  if(!navigator.onLine){
    closeViewerPeer('offline');
    setViewerStatus('offline','Sin conexión a Internet',{detail:'JEMMO volverá a intentarlo cuando se recupere la red.',reconnect:true,code:'offline'});
    return;
  }
  if(automaticAttempts>=AUTO_RETRY_LIMIT){
    const detail=code.includes('permission')?reason:`${reason} Pulsa RECONECTAR AUDIO Y VÍDEO. ${turnConfigured?'TURN está configurado; comprueba la cobertura.':'Para redes móviles restrictivas debes configurar TURN propio.'}`;
    closeViewerPeer('failed');
    setViewerStatus('error','No se pudo recuperar el LIVE',{detail,reconnect:true,code});
    return;
  }
  automaticAttempts++;
  closeViewerPeer('retrying');
  setViewerStatus('connecting',`Reconectando audio y vídeo (${automaticAttempts}/${AUTO_RETRY_LIMIT})…`,{detail:reason,reconnect:true,code});
  reconnectTimer=setTimeout(()=>void startViewer(),Math.min(6000,1200*automaticAttempts));
}

function watchPresence(){
  if(!viewerRoute)return;
  presenceUnsubscribe?.();
  presenceUnsubscribe=onSnapshot(doc(db,PRESENCE_COLLECTION,routeHostUid),snapshot=>{
    if(!snapshot.exists())return;
    const data=snapshot.data()||{};
    renderHostIdentity(data);
    if(freshPresence(data)){activePresenceSeen=true;return}
    if(activePresenceSeen){
      closeViewerPeer('ended');
      setViewerStatus('ended','El LIVE ha finalizado',{detail:'El emisor dejó de transmitir. Vuelve a Inicio para ver otros directos.',quick:false,code:'presence-ended'});
    }
  },error=>{
    console.warn('JEMMO WebRTC: no se pudo vigilar la presencia.',error);
    if(isPermissionError(error))setViewerStatus('error','Firestore bloqueó la presencia LIVE',{detail:permissionMessage('leer la presencia del emisor'),reconnect:true,code:'firestore-permission'});
  });
}

function watchRoom(){
  if(!viewerRoute)return;
  roomUnsubscribe?.();
  roomUnsubscribe=onSnapshot(doc(db,SIGNAL_COLLECTION,routeHostUid),snapshot=>{
    if(!snapshot.exists())return;
    const data=snapshot.data()||{};
    if(freshRoom(data)){activeRoomSeen=true;return}
    if(activeRoomSeen&&(data.status==='ended'||data.active===false)){
      closeViewerPeer('ended');
      setViewerStatus('ended','El LIVE ha finalizado',{detail:'La sala del emisor se cerró.',quick:false,code:'room-ended'});
    }
  },error=>{
    console.warn('JEMMO WebRTC: no se pudo vigilar la sala.',error);
    if(isPermissionError(error))setViewerStatus('error','Firestore bloqueó la sala LIVE',{detail:permissionMessage('leer la sala de señalización'),reconnect:true,code:'firestore-permission'});
  });
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

function bindNetworkListeners(){
  if(networkListenersBound)return;
  networkListenersBound=true;
  addEventListener('offline',()=>{
    if(viewerRoute){closeViewerPeer('offline');setViewerStatus('offline','Sin conexión a Internet',{detail:'Esperando que vuelva la red.',reconnect:true,code:'offline'})}
  });
  addEventListener('online',()=>{
    if(viewerRoute)void startViewer({manual:true});
    else if(hostState)void setDoc(hostState.roomRef,{heartbeatAt:serverTimestamp(),heartbeatAtMs:Date.now(),status:'live',active:true,version:VERSION},{merge:true}).catch(()=>{});
  });
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  connection?.addEventListener?.('change',()=>{
    if(viewerRoute&&viewerState&&['failed','disconnected'].includes(viewerState.pc.connectionState))scheduleReconnect('La red móvil cambió. Renovando la conexión ICE.',{code:'network-change'});
    if(!viewerRoute&&hostState){
      for(const session of hostState.sessions.values()){
        for(const sender of session.pc.getSenders())if(sender.track)void configureSender(sender,sender.track.kind);
      }
      dispatchState('host-network-profile-updated',{effectiveType:clean(connection.effectiveType,20),saveData:Boolean(connection.saveData)});
    }
  });
}

window.addEventListener('jemmo-live-webrtc-host-start',event=>{
  const detail=event.detail||{};
  window.__jemmoLiveHostIntent={...detail,active:true};
  window.__jemmoLiveHostStream=detail.stream||null;
  void startHost(detail);
});
window.addEventListener('jemmo-live-webrtc-host-stream',event=>{
  const stream=event.detail?.stream||null;
  window.__jemmoLiveHostStream=stream;
  if(window.__jemmoLiveHostIntent)window.__jemmoLiveHostIntent.stream=stream;
  void replaceHostTracks(stream);
});
window.addEventListener('jemmo-live-webrtc-host-end',event=>{
  if(window.__jemmoLiveHostIntent)window.__jemmoLiveHostIntent.active=false;
  void stopHost(event.detail?.reason||'manual');
});
window.addEventListener('pagehide',()=>{
  if(viewerRoute)leaveViewer();
  else if(hostState)void stopHost('pagehide');
});

onAuthStateChanged(auth,user=>{
  currentUser=user||null;
  if(authReadyResolve){authReadyResolve(currentUser);authReadyResolve=null}
  bindNetworkListeners();
  if(!currentUser){
    if(viewerRoute)setViewerStatus('error','La sesión de Firebase no está activa',{detail:'Vuelve a iniciar sesión con tu cuenta real antes de entrar al LIVE. El UID guardado localmente no sustituye Firebase Authentication.',reconnect:false,quick:false,code:'auth-required'});
    return;
  }
  const intent=pendingHostStart||window.__jemmoLiveHostIntent;
  if(!viewerRoute&&intent?.active){pendingHostStart=null;void startHost({...intent,stream:intent.stream||window.__jemmoLiveHostStream||null})}
  if(viewerRoute){watchPresence();watchRoom();void startViewer()}
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindViewerUi,{once:true});else bindViewerUi();

window.JemmoLiveRTC=Object.freeze({
  version:`${VERSION}.0`,
  protocol:PROTOCOL,
  viewerRoute,
  hostUid:routeHostUid,
  turnConfigured,
  maxP2PViewers,
  startHost,
  stopHost,
  replaceHostTracks,
  reconnect:()=>startViewer({manual:true}),
  play:()=>tryPlayRemote({fromGesture:true}),
  leave:leaveViewer,
  getState:()=>({
    viewer:Boolean(viewerState),
    host:Boolean(hostState),
    connection:viewerState?.pc?.connectionState||null,
    ice:viewerState?.pc?.iceConnectionState||null,
    signaling:viewerState?.pc?.signalingState||null,
    sessionId:viewerState?.id||null,
    hostSessions:hostState?.sessions.size||0,
    roomSessionId:viewerState?.roomSessionId||hostState?.roomSessionId||null,
    turnConfigured
  })
});
