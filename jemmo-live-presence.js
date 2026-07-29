import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
const app=getApps()[0]||initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
const PRESENCE_COLLECTION='livePresences';
const HEARTBEAT_MS=20000;
const STALE_MS=90000;
const clean=(value,max=180)=>String(value??'').trim().slice(0,max);
const activeNow=data=>Boolean(data?.active===true&&data?.status==='live'&&data?.signalReady===true&&Date.now()-Number(data?.heartbeatAtMs||0)<=STALE_MS);
const liveRoute=(uid,name='')=>new URL(`live.html?mode=viewer&watch=${encodeURIComponent(uid)}&hostUid=${encodeURIComponent(uid)}&hostName=${encodeURIComponent(name||'Emisor')}`,location.href).href;
const profileRoute=uid=>new URL(`perfil-publico.html?uid=${encodeURIComponent(uid)}&view=quick`,location.href).href;

let currentUser=null;
let pendingStart=null;
let heartbeatTimer=0;
let broadcasting=false;
let lastStartDetail={};
let lastProfilePresence=null;
let lastHomeRows=[];

onAuthStateChanged(auth,user=>{
  currentUser=user||null;
  if(currentUser&&pendingStart){const detail=pendingStart;pendingStart=null;void publishStart(detail)}
});

async function readProfile(uid,user){
  const names=['users','perfilesPublicos','directorioMensajes'];
  const values=await Promise.all(names.map(async name=>{try{const snap=await getDoc(doc(db,name,uid));return snap.exists()?snap.data()||{}:{}}catch{return{}}}));
  const merged=Object.assign({},...values);
  const name=clean(merged.displayName||merged.name||merged.nombre||user?.displayName||user?.email?.split('@')[0]||'Usuario JEMMO',80);
  return{
    name,
    username:clean(merged.username||merged.userName||'',60),
    country:clean(merged.country||merged.pais||'',60),
    city:clean(merged.city||merged.ciudad||'',60),
    publicId:clean(merged.publicId||merged.jemmoId||'',40),
    verified:Boolean(merged.verified||merged.isVerified),
    level:Math.max(1,Number(merged.level||merged.nivel)||1),
    avatarData:clean(merged.avatarData||merged.photoURL||merged.photo||merged.avatar||user?.photoURL||'',900000),
    coverData:clean(merged.coverData||merged.coverURL||merged.cover||'',900000)
  };
}

async function publishStart(detail={}){
  if(!currentUser){pendingStart=detail;return}
  broadcasting=true;
  lastStartDetail=detail;
  const uid=currentUser.uid;
  const profile=await readProfile(uid,currentUser);
  const now=Date.now();
  const title=clean(detail.title||'Estoy en directo en JEMMO LIVE',100);
  const payload={
    uid,
    hostUid:uid,
    active:true,
    status:'live',
    name:profile.name,
    username:profile.username,
    country:profile.country,
    city:profile.city,
    publicId:profile.publicId,
    verified:profile.verified,
    level:profile.level,
    title,
    description:clean(detail.description||'',240),
    visibility:clean(detail.visibility||'public',30),
    roomUrl:liveRoute(uid,profile.name),
    profileUrl:profileRoute(uid),
    startedAt:serverTimestamp(),
    startedAtMs:now,
    heartbeatAt:serverTimestamp(),
    heartbeatAtMs:now,
    updatedAt:serverTimestamp(),
    signalReady:detail.signalReady===true,
    protocol:clean(detail.protocol||'jemmo-live-webrtc-v2',80),
    version:49
  };
  try{
    await setDoc(doc(db,PRESENCE_COLLECTION,uid),payload,{merge:true});
    clearInterval(heartbeatTimer);
    heartbeatTimer=setInterval(()=>void heartbeat(),HEARTBEAT_MS);
    window.dispatchEvent(new CustomEvent('jemmo-live-presence-published',{detail:payload}));
  }catch(error){
    broadcasting=false;
    console.warn('JEMMO LIVE: no se pudo publicar la presencia del LIVE.',error);
    window.dispatchEvent(new CustomEvent('jemmo-live-presence-error',{detail:{stage:'start'}}));
  }
}

async function heartbeat(){
  if(!broadcasting||!currentUser)return;
  const now=Date.now();
  try{
    await setDoc(doc(db,PRESENCE_COLLECTION,currentUser.uid),{
      active:true,status:'live',heartbeatAt:serverTimestamp(),heartbeatAtMs:now,updatedAt:serverTimestamp(),version:49
    },{merge:true});
  }catch(error){console.warn('JEMMO LIVE: no se pudo actualizar el latido de presencia.',error)}
}

async function publishEnd(reason='manual'){
  broadcasting=false;
  pendingStart=null;
  clearInterval(heartbeatTimer);
  heartbeatTimer=0;
  if(!currentUser)return;
  const now=Date.now();
  try{
    await setDoc(doc(db,PRESENCE_COLLECTION,currentUser.uid),{
      active:false,status:'ended',endReason:clean(reason,40),endedAt:serverTimestamp(),endedAtMs:now,heartbeatAt:serverTimestamp(),heartbeatAtMs:now,updatedAt:serverTimestamp(),version:49
    },{merge:true});
  }catch(error){console.warn('JEMMO LIVE: no se pudo cerrar la presencia.',error)}
}

window.addEventListener('jemmo-live-presence-start',event=>{void publishStart(event.detail||{})});
window.addEventListener('jemmo-live-presence-end',event=>{void publishEnd(event.detail?.reason||'manual')});
window.addEventListener('pagehide',()=>{if(broadcasting)void publishEnd('pagehide')});
window.addEventListener('jemmo-live-webrtc-state',event=>{
  if(!broadcasting||!currentUser)return;
  const detail=event.detail||{};
  if(detail.status==='host-ready'){
    void setDoc(doc(db,PRESENCE_COLLECTION,currentUser.uid),{signalReady:true,signalUpdatedAt:serverTimestamp(),signalUpdatedAtMs:Date.now(),protocol:'jemmo-live-webrtc-v2',version:49},{merge:true}).catch(()=>{});
  }else if(detail.status==='host-error'||detail.status==='host-listener-error'){
    void setDoc(doc(db,PRESENCE_COLLECTION,currentUser.uid),{signalReady:false,signalError:clean(detail.code||detail.status,80),signalUpdatedAt:serverTimestamp(),signalUpdatedAtMs:Date.now(),version:49},{merge:true}).catch(()=>{});
  }
});

function safeImage(value){
  const url=String(value||'').trim();
  return /^(https:\/\/|data:image\/)/i.test(url)?url:'';
}
function initials(name){return clean(name,80).split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()||'').join('')||'J'}
function profileFromPresence(data,profile){return{
  ...data,
  name:clean(profile?.name||profile?.displayName||profile?.nombre||data?.name||'Usuario JEMMO',80),
  avatarData:safeImage(profile?.avatarData||profile?.photoURL||profile?.photo||profile?.avatar||''),
  coverData:safeImage(profile?.coverData||profile?.coverURL||profile?.cover||''),
  verified:Boolean(profile?.verified||profile?.isVerified||data?.verified),
  country:clean(profile?.country||profile?.pais||data?.country||'',60),
  city:clean(profile?.city||profile?.ciudad||data?.city||'',60)
}}
async function enrichPresence(data){
  const uid=clean(data?.uid||data?.hostUid,160);
  if(!uid)return data;
  try{
    const [publicSnap,userSnap,directorySnap]=await Promise.all([
      getDoc(doc(db,'perfilesPublicos',uid)),getDoc(doc(db,'users',uid)),getDoc(doc(db,'directorioMensajes',uid))
    ]);
    const profile=Object.assign({},userSnap.exists()?userSnap.data():{},directorySnap.exists()?directorySnap.data():{},publicSnap.exists()?publicSnap.data():{});
    return profileFromPresence(data,profile);
  }catch{return data}
}

function renderHome(rows){
  const grid=document.getElementById('homeLiveGrid');
  if(!grid)return;
  const active=rows.filter(item=>activeNow(item)&&String(item.visibility||'public')==='public').sort((a,b)=>Number(b.startedAtMs||0)-Number(a.startedAtMs||0));
  grid.replaceChildren();
  if(!active.length){
    const empty=document.createElement('div');empty.className='home-live-empty';empty.innerHTML='<b>Ahora mismo no hay transmisiones activas.</b><span>Cuando una persona inicie LIVE aparecerá aquí automáticamente.</span>';grid.append(empty);return;
  }
  active.slice(0,12).forEach(item=>{
    const uid=clean(item.uid||item.hostUid,160),name=clean(item.name||'Usuario JEMMO',80);
    const card=document.createElement('a');card.className='live-card real-live';card.href=item.roomUrl||liveRoute(uid,name);card.setAttribute('aria-label',`Entrar al LIVE de ${name}`);
    const portrait=document.createElement('div');portrait.className='portrait';
    const image=safeImage(item.coverData||item.avatarData);
    if(image){const img=document.createElement('img');img.src=image;img.alt=`LIVE de ${name}`;portrait.append(img)}
    else{const fallback=document.createElement('b');fallback.className='live-initials';fallback.textContent=initials(name);portrait.append(fallback)}
    const badge=document.createElement('span');badge.textContent='LIVE';portrait.append(badge);
    const viewers=document.createElement('small');viewers.textContent='● EN DIRECTO';portrait.append(viewers);
    const copy=document.createElement('strong');copy.textContent=name;
    if(item.verified){const verified=document.createElement('em');verified.textContent=' ✓';copy.append(verified)}
    const topic=document.createElement('i');topic.className='live-topic';topic.textContent=clean(item.title||'En directo en JEMMO LIVE',90);copy.append(topic);
    card.append(portrait,copy);grid.append(card);
  });
}

const homeGrid=document.getElementById('homeLiveGrid');
if(homeGrid){
  const activeQuery=query(collection(db,PRESENCE_COLLECTION),where('active','==',true));
  onSnapshot(activeQuery,async snapshot=>{
    const token=Date.now();homeGrid.dataset.renderToken=String(token);
    const rows=await Promise.all(snapshot.docs.map(item=>enrichPresence(item.data()||{})));
    if(homeGrid.dataset.renderToken!==String(token))return;
    lastHomeRows=rows;renderHome(lastHomeRows);
  },error=>{
    console.warn('JEMMO LIVE: no se pudo consultar Personas en directo.',error);
    homeGrid.innerHTML='<div class="home-live-empty"><b>No se pudo consultar los LIVE.</b><span>Comprueba la conexión y vuelve a abrir Inicio.</span></div>';
  });
  setInterval(()=>renderHome(lastHomeRows),15000);
}

function profileTargetUid(){const params=new URLSearchParams(location.search);return clean(params.get('uid')||'',160)}
function renderProfilePresence(data){
  lastProfilePresence=data||null;
  const live=activeNow(data)&&String(data?.visibility||'public')==='public';
  const quick=document.getElementById('quickLiveAlert');
  const full=document.getElementById('fullLiveAlert');
  const presence=document.getElementById('presence');
  const label=document.getElementById('presenceLabel');
  [quick,full].filter(Boolean).forEach(alert=>{
    alert.hidden=!live;
    if(live){alert.href=data.roomUrl||liveRoute(data.uid||data.hostUid,data.name);const title=alert.querySelector('[data-live-title]');if(title)title.textContent=clean(data.title||'En directo en JEMMO LIVE',100)}
  });
  if(presence&&label){
    presence.classList.toggle('live',live);
    if(live){presence.classList.remove('offline');label.textContent='EN LIVE'}
    else{
      const online=presence.dataset.profileOnline==='1';presence.classList.toggle('offline',!online);label.textContent=online?'EN LÍNEA':'FUERA';
    }
  }
}
const targetUid=profileTargetUid();
if(targetUid&&(document.getElementById('quickLiveAlert')||document.getElementById('fullLiveAlert'))){
  onSnapshot(doc(db,PRESENCE_COLLECTION,targetUid),snapshot=>renderProfilePresence(snapshot.exists()?snapshot.data()||{}:null),error=>console.warn('JEMMO LIVE: no se pudo consultar el estado LIVE del perfil.',error));
  window.addEventListener('jemmo-public-profile-rendered',()=>renderProfilePresence(lastProfilePresence));
  setInterval(()=>renderProfilePresence(lastProfilePresence),15000);
}

window.JemmoLivePresence=Object.freeze({version:'49.0',isFresh:activeNow,liveRoute,profileRoute,getLastStart:()=>({...lastStartDetail})});
