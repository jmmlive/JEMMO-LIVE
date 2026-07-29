/* JEMMO LIVE V1 · CHAT FIRESTORE Y ESTADO DE SALA · PRUEBA 54 */
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
const app=getApps()[0]||initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

const VERSION=54;
const SIGNAL_COLLECTION='liveSignals';
const CHAT_LIMIT=80;
const MAX_CHAT_LENGTH=300;
const clean=(value,max=180)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const params=new URLSearchParams(location.search);
const routeHostUid=clean(params.get('hostUid')||params.get('watch')||'',180);
const viewerRoute=Boolean(routeHostUid&&(params.get('mode')==='viewer'||params.has('watch')));

let currentUser=null;
let identity={uid:'',name:'Usuario JEMMO'};
let activeHostUid=viewerRoute?routeHostUid:'';
let activeRoomSessionId='';
let activeRoomData=null;
let roomUnsubscribe=null;
let chatUnsubscribe=null;
let roomBoundFor='';
let chatBoundFor='';
let authReadyResolve=null;
const authReady=new Promise(resolve=>{authReadyResolve=resolve});

const ui={
  chat:()=>document.getElementById('chatLayer'),
  input:()=>document.getElementById('chatInput'),
  form:()=>document.getElementById('chatForm'),
  hostName:()=>document.querySelector('.jl-host b')
};

function event(name,detail={}){
  window.dispatchEvent(new CustomEvent(name,{detail:{version:VERSION,viewer:viewerRoute,hostUid:activeHostUid,roomSessionId:activeRoomSessionId,...detail}}));
}

function randomId(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID().replaceAll('-','');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,16)}`;
}

function currentRoomRef(){
  return activeHostUid?doc(db,SIGNAL_COLLECTION,activeHostUid):null;
}

function currentChatCollection(){
  const roomRef=currentRoomRef();
  return roomRef?collection(roomRef,'chat'):null;
}

function renderSystemLine(text){
  const layer=ui.chat();
  if(!layer)return;
  const line=document.createElement('div');
  line.className='jl-chat-line';
  line.dataset.liveSyncSystem='1';
  line.textContent=text;
  layer.append(line);
}

function senderLabel(data){
  if(data.type==='system')return 'Sistema';
  return clean(data.senderName||'Usuario JEMMO',80);
}

function renderChatSnapshot(snapshot){
  const layer=ui.chat();
  if(!layer||!activeRoomSessionId)return;
  const docs=snapshot.docs
    .map(item=>({id:item.id,...(item.data()||{})}))
    .filter(item=>clean(item.roomSessionId,180)===activeRoomSessionId)
    .sort((a,b)=>Number(a.createdAtMs||0)-Number(b.createdAtMs||0));

  layer.replaceChildren();
  if(!docs.length){
    const hostName=clean(ui.hostName()?.textContent||params.get('hostName')||'JEMMO',80);
    renderSystemLine(viewerRoute?`Sistema: has entrado al LIVE de ${hostName}.`:'Sistema: Tu LIVE ha comenzado.');
    return;
  }

  for(const data of docs){
    const line=document.createElement('div');
    const own=Boolean(currentUser&&clean(data.senderUid,180)===currentUser.uid);
    line.className=`jl-chat-line${own?' jemmo-own':''}`;
    line.dataset.liveMessageId=data.id;
    const text=clean(data.text,MAX_CHAT_LENGTH);
    line.textContent=data.type==='system'?`Sistema: ${text}`:`${senderLabel(data)}: ${text}`;
    layer.append(line);
  }
  while(layer.children.length>25)layer.firstElementChild?.remove();
}

function applyCommentsState(data={}){
  const enabled=data.commentsEnabled!==false;
  const input=ui.input();
  const form=ui.form();
  if(!input||!form)return;
  if(viewerRoute){
    input.disabled=!enabled;
    form.querySelector('button')?.toggleAttribute('disabled',!enabled);
    input.placeholder=enabled?'Escribe un mensaje…':'Chat cerrado por el anfitrión';
    form.closest('.jl-chatbar')?.classList.toggle('chat-closed',!enabled);
  }
}

function stopChatWatch(){
  chatUnsubscribe?.();
  chatUnsubscribe=null;
  chatBoundFor='';
}

function watchChat(){
  if(!activeHostUid||!activeRoomSessionId)return;
  const key=`${activeHostUid}:${activeRoomSessionId}`;
  if(chatBoundFor===key)return;
  stopChatWatch();
  chatBoundFor=key;
  const chatCollection=currentChatCollection();
  if(!chatCollection)return;
  const chatQuery=query(chatCollection,orderBy('createdAtMs','desc'),limit(CHAT_LIMIT));
  chatUnsubscribe=onSnapshot(chatQuery,renderChatSnapshot,error=>{
    console.error('JEMMO LIVE chat: no se pudo leer el chat sincronizado.',error);
    event('jemmo-live-chat-error',{operation:'read',code:String(error?.code||''),message:clean(error?.message,240)});
  });
}

function applyRoomSnapshot(snapshot){
  if(!snapshot.exists())return;
  const data=snapshot.data()||{};
  activeRoomData=data;
  const nextSession=clean(data.roomSessionId,180);
  if(nextSession&&nextSession!==activeRoomSessionId){
    activeRoomSessionId=nextSession;
    watchChat();
  }
  applyCommentsState(data);
}

function watchRoom(hostUid){
  const uid=clean(hostUid,180);
  if(!uid)return;
  activeHostUid=uid;
  if(roomBoundFor===uid)return;
  roomUnsubscribe?.();
  roomBoundFor=uid;
  roomUnsubscribe=onSnapshot(doc(db,SIGNAL_COLLECTION,uid),applyRoomSnapshot,error=>{
    console.error('JEMMO LIVE chat: no se pudo vigilar la sala.',error);
    event('jemmo-live-chat-error',{operation:'room-read',code:String(error?.code||''),message:clean(error?.message,240)});
  });
}

async function resolveIdentity(user){
  const baseName=clean(user?.displayName||user?.email?.split('@')[0]||'Usuario JEMMO',80);
  identity={uid:user?.uid||'',name:baseName};
  if(!user?.uid)return identity;
  try{
    const snap=await getDoc(doc(db,'users',user.uid));
    if(snap.exists()){
      const data=snap.data()||{};
      identity.name=clean(data.name||data.nombre||data.displayName||data.username||baseName,80)||baseName;
    }
  }catch(error){
    console.warn('JEMMO LIVE chat: no se pudo completar el nombre del usuario.',error);
  }
  return identity;
}

async function ensureRoom(){
  if(!currentUser){
    await Promise.race([authReady,new Promise(resolve=>setTimeout(resolve,6000))]);
  }
  if(!currentUser)throw Object.assign(new Error('La sesión Firebase no está activa.'),{code:'auth-required'});
  if(!activeHostUid)activeHostUid=viewerRoute?routeHostUid:currentUser.uid;
  const roomRef=currentRoomRef();
  if(!roomRef)throw Object.assign(new Error('No se pudo identificar la sala LIVE.'),{code:'room-missing'});
  if(!activeRoomSessionId){
    const snap=await getDoc(roomRef);
    if(!snap.exists())throw Object.assign(new Error('La sala LIVE todavía no está disponible.'),{code:'room-not-ready'});
    applyRoomSnapshot(snap);
  }
  if(!activeRoomSessionId)throw Object.assign(new Error('La sesión de sala todavía no está preparada.'),{code:'session-not-ready'});
  return roomRef;
}

async function sendChat(text,{type='chat'}={}){
  const message=clean(text,MAX_CHAT_LENGTH);
  if(!message)return{ok:false,reason:'empty'};
  const allowedTypes=new Set(['chat','sticker','gift','system']);
  const safeType=allowedTypes.has(type)?type:'chat';
  try{
    await ensureRoom();
    if(viewerRoute&&activeRoomData?.commentsEnabled===false){
      return{ok:false,reason:'chat-closed'};
    }
    await resolveIdentity(currentUser);
    const id=`${Date.now().toString(36)}_${clean(currentUser.uid,40)}_${randomId().slice(0,12)}`;
    const ref=doc(currentChatCollection(),id);
    await setDoc(ref,{
      hostUid:activeHostUid,
      roomSessionId:activeRoomSessionId,
      senderUid:currentUser.uid,
      senderName:identity.name,
      senderRole:viewerRoute?'viewer':'host',
      type:safeType,
      text:message,
      createdAt:serverTimestamp(),
      createdAtMs:Date.now(),
      version:VERSION
    });
    return{ok:true,id};
  }catch(error){
    console.error('JEMMO LIVE chat: no se pudo enviar el mensaje.',error);
    event('jemmo-live-chat-error',{operation:'write',code:String(error?.code||''),message:clean(error?.message,240)});
    return{ok:false,reason:String(error?.code||'write-error'),message:clean(error?.message,240)};
  }
}

async function setCommentsEnabled(enabled){
  if(viewerRoute)return{ok:false,reason:'host-only'};
  try{
    const roomRef=await ensureRoom();
    await setDoc(roomRef,{commentsEnabled:Boolean(enabled),commentsUpdatedAt:serverTimestamp(),commentsUpdatedAtMs:Date.now(),version:VERSION},{merge:true});
    return{ok:true};
  }catch(error){
    event('jemmo-live-chat-error',{operation:'comments-write',code:String(error?.code||''),message:clean(error?.message,240)});
    return{ok:false,reason:String(error?.code||'write-error')};
  }
}

window.addEventListener('jemmo-live-webrtc-state',eventDetail=>{
  const detail=eventDetail.detail||{};
  const hostUid=clean(detail.hostUid||'',180)||(viewerRoute?routeHostUid:currentUser?.uid||'');
  if(hostUid)watchRoom(hostUid);
  const session=clean(detail.roomSessionId||'',180);
  if(session&&session!==activeRoomSessionId){activeRoomSessionId=session;watchChat()}
});

window.addEventListener('pagehide',()=>{roomUnsubscribe?.();stopChatWatch()});

onAuthStateChanged(auth,async user=>{
  currentUser=user||null;
  if(authReadyResolve){authReadyResolve(currentUser);authReadyResolve=null}
  if(!currentUser)return;
  await resolveIdentity(currentUser);
  watchRoom(viewerRoute?routeHostUid:currentUser.uid);
});

window.JemmoLiveRoomSync=Object.freeze({
  version:`${VERSION}.0`,
  viewerRoute,
  sendChat,
  setCommentsEnabled,
  getState:()=>({hostUid:activeHostUid,roomSessionId:activeRoomSessionId,userUid:currentUser?.uid||'',commentsEnabled:activeRoomData?.commentsEnabled!==false,chatBound:Boolean(chatUnsubscribe)})
});
