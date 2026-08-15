/* JEMMO LIVE V1 · MI CASA · ACCESO DIRECTO A CASA PREMIUM RELEASE 67
   Sincroniza la membresía real del perfil y separa el acceso de miembros del panel de agentes. */
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
const app=getApps()[0]||initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const clean=(value,max=180)=>String(value||'').trim().slice(0,max);
const lower=value=>clean(value,40).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const safeImage=value=>{const url=clean(value,1200);return /^(https:\/\/|data:image\/|blob:)/i.test(url)?url:''};
const activeStatus=value=>!['left','removed','rejected','cancelled','inactive'].includes(lower(value||'active'));
let stopHouse=()=>{},stopRoom=()=>{},currentMembership=null,currentHouse={},currentRoom={};

function roleLabel(data={}){
  const position=lower(data.housePosition||data.position),role=lower(data.houseRole||data.role);
  if(position==='emitter'||['emisor','emisora','host','streamer','creator','creador','creadora'].includes(position))return'EMISOR/A DE LA CASA';
  if(position==='agent'||role==='agent'||role==='agente')return'AGENTE DE LA CASA';
  if(role==='owner'||role==='propietario')return'PROPIETARIO/A';
  if(role==='admin'||role==='administrador')return'ADMINISTRACIÓN';
  return'MIEMBRO DE LA CASA';
}
function canManage(data={}){
  const position=lower(data.housePosition||data.position),role=lower(data.houseRole||data.role);
  return position==='agent'||['owner','admin','agent','propietario','administrador','agente'].includes(role);
}
function houseRoomUrl(){
  const houseId=clean(currentMembership?.houseId,80);if(!houseId)return'salas.html';
  const houseName=clean(currentHouse.name||currentMembership.houseName||'Mi Casa',60);
  const capacity=Math.min(25,Math.max(4,Number(currentRoom.capacity)||20));
  const title=clean(currentRoom.title||`Sala 24/7 de ${houseName}`,90);
  const url=new URL('salas.html',location.href);
  url.searchParams.set('houseRoom','1');url.searchParams.set('direct','1');url.searchParams.set('house',houseId);url.searchParams.set('houseName',houseName);
  url.searchParams.set('mode','audio');url.searchParams.set('count',String(capacity));url.searchParams.set('title',title);
  url.searchParams.set('description','Audio Room oficial de la Casa para miembros, emisores, tareas y comunidad.');
  return url.href;
}
function houseViewUrl(){
  const houseId=clean(currentMembership?.houseId,80);const url=new URL('casas.html',location.href);
  url.searchParams.set('miCasa','1');
  if(houseId)url.searchParams.set('casa',houseId);
  return url.href;
}
function setIcon(image=''){
  const img=$('houseImage'),fallback=$('houseFallback'),icon=$('houseIcon');if(!img||!fallback||!icon)return;
  const source=safeImage(image);if(source){img.src=source;img.hidden=false;fallback.hidden=true;icon.classList.add('has-image')}else{img.removeAttribute('src');img.hidden=true;fallback.hidden=false;icon.classList.remove('has-image')}
}
function setActions(active){
  const room=$('houseRoomButton'),view=$('houseProfileButton'),explore=$('houseExploreButton');if(!room||!view||!explore)return;
  if(!active){room.hidden=true;view.hidden=true;explore.hidden=false;explore.textContent='EXPLORAR CASAS';explore.onclick=()=>{location.href='casas.html#explorar'};return}
  room.hidden=false;view.hidden=false;explore.hidden=false;
  room.textContent='ENTRAR A AUDIO ROOM DE MI CASA';room.onclick=()=>{location.href=houseRoomUrl()};
  view.textContent=canManage(currentMembership)?'ENTRAR A MI CASA':'VER MI CASA';view.onclick=()=>{location.href=houseViewUrl()};
  explore.textContent='OTRAS CASAS';explore.onclick=()=>{location.href='casas.html#explorar'};
}
function render(){
  const name=$('houseName'),text=$('houseText'),card=$('myHouseCard');if(!name||!text)return;
  const active=Boolean(currentMembership?.houseId)&&activeStatus(currentMembership?.houseStatus||currentMembership?.status);
  card?.classList.toggle('has-house',active);card?.classList.toggle('loading',false);
  if(!active){name.textContent='Todavía no perteneces a una Casa';text.textContent='Explora comunidades y solicita unirte cuando estés preparado.';setIcon('');setActions(false);return}
  const houseName=clean(currentHouse.name||currentMembership.houseName||'Mi Casa',60);
  const role=roleLabel(currentMembership);name.textContent=houseName;text.textContent=`${role} · Sala oficial de audio abierta 24/7.`;
  setIcon(currentHouse.logo||currentHouse.photo||currentHouse.cover||currentHouse.avatar);setActions(true);
  try{localStorage.setItem('jemmo_house_id',clean(currentMembership.houseId,80));localStorage.setItem('jemmo_house_name',houseName);localStorage.setItem('jemmo_house_role',role)}catch{}
  window.dispatchEvent(new CustomEvent('jemmo-my-house-ready',{detail:{...currentMembership,houseName,roomUrl:houseRoomUrl()}}));
}
function subscribeHouse(membership){
  stopHouse();stopRoom();stopHouse=()=>{};stopRoom=()=>{};currentHouse={};currentRoom={};
  const houseId=clean(membership?.houseId,80);if(!houseId){render();return}
  render();
  stopHouse=onSnapshot(doc(db,'casas',houseId),snapshot=>{currentHouse=snapshot.data()||{};render()},error=>{console.warn('JEMMO Mi Casa: ficha',error?.code||error);render()});
  stopRoom=onSnapshot(doc(db,'casas',houseId,'configuracion','sala'),snapshot=>{currentRoom=snapshot.data()||{};render()},error=>{console.warn('JEMMO Mi Casa: sala',error?.code||error);render()});
}
function boot(user){
  const card=$('myHouseCard');card?.classList.add('loading');
  onSnapshot(doc(db,'users',user.uid),snapshot=>{
    const data=snapshot.data()||{};const houseId=clean(data.houseId,80);
    const next=houseId&&activeStatus(data.houseStatus)?{uid:user.uid,houseId,houseName:clean(data.houseName,60),houseRole:clean(data.houseRole||'member',30),housePosition:clean(data.housePosition||'',30),houseStatus:clean(data.houseStatus||'active',30),assignedAgentUid:clean(data.assignedAgentUid,160)}:null;
    const changed=clean(currentMembership?.houseId,80)!==clean(next?.houseId,80);currentMembership=next;if(changed)subscribeHouse(next);else render();
  },error=>{console.warn('JEMMO Mi Casa: membresía',error?.code||error);card?.classList.remove('loading');render()});
}
onAuthStateChanged(auth,user=>{if(user)boot(user)});
addEventListener('pagehide',()=>{stopHouse();stopRoom()},{once:true});
