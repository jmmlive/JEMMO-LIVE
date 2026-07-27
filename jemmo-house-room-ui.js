/* JEMMO LIVE V1 · IDENTIDAD DE SALA Y TAREA ÚNICA PRUEBA 33
   La cabecera pertenece a la Casa y usa la identidad configurada por sus responsables. */
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const params=new URLSearchParams(location.search);
if(params.get('houseRoom')==='1'||window.JemmoHouseRoomContext?.enabled===true){
  const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
  const app=getApps()[0]||initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
  const houseId=String(
    window.JemmoHouseRoomContext?.id||
    document.documentElement.dataset.jemmoHouseId||
    params.get('house')||
    ''
  ).trim().slice(0,80);
  const $=id=>document.getElementById(id);
  const number=v=>Math.max(0,Number(v)||0);
  const fmt=v=>Math.round(number(v)).toLocaleString('es-ES');
  const clean=(v,m=100)=>String(v||'').trim().slice(0,m);
  const millis=v=>v?.toMillis?.()||(v?.seconds?Number(v.seconds)*1000:Number(v||0));
  const date=v=>{const ms=millis(v);if(!ms)return'';try{return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(ms))}catch{return''}};
  const duration=ms=>{const total=Math.max(0,Math.ceil(number(ms)/1000)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`};
  let user=null,task={},house={},roomConfig={},timer=0;
  document.body.classList.add('jemmo-house-room');

  function waitUser(timeout=12000){if(auth.currentUser)return Promise.resolve(auth.currentUser);return new Promise((resolve,reject)=>{let stop=()=>{};const t=setTimeout(()=>{stop();reject(new Error('Sesión no disponible.'))},timeout);stop=onAuthStateChanged(auth,u=>{if(!u)return;clearTimeout(t);stop();resolve(u)},e=>{clearTimeout(t);stop();reject(e)})})}
  function renderHouse(){
    const houseName=clean(house.name||params.get('houseName')||'Casa JEMMO',60);
    const name=clean(roomConfig.title||`Sala 24/7 de ${houseName}`,60);
    if($('roomTitleLabel'))$('roomTitleLabel').textContent=name;
    if($('roomCapacityLabel'))$('roomCapacityLabel').textContent='20 sillas · Sala 24/7 · solo audio';
    const image=clean(roomConfig.roomPhotoData||roomConfig.roomPhoto||roomConfig.image||house.logo||house.photo||house.cover||house.avatar,260000);
    if(image&&$('roomAvatar'))$('roomAvatar').src=image;
    const createdMs=millis(house.createdAt||house.approvedAt||house.createdAtClient);
    const days=createdMs?Math.max(0,Math.floor((Date.now()-createdMs)/86400000)):null;
    if($('houseRoomCreated'))$('houseRoomCreated').textContent=createdMs?`Creada el ${date(createdMs)} · ${days} día${days===1?'':'s'} de historia`:'Fecha de creación pendiente';
    if($('houseRoomMembers'))$('houseRoomMembers').textContent=fmt(house.memberCount??house.members);
    if($('houseRoomPoints'))$('houseRoomPoints').textContent=fmt(house.score??house.points);
    if($('houseRoomRank'))$('houseRoomRank').textContent=number(house.rank)?`#${fmt(house.rank)}`:'—';
    const medals=$('houseRoomMedals');
    if(medals){
      const real=Array.isArray(house.medals)?house.medals.slice(0,4):[];
      const count=number(house.medalCount);
      medals.innerHTML=real.length?real.map(item=>`<span class="jr-house-medal" title="${clean(item?.name||item,50)}">${clean(item?.icon||item,3)||'🏅'}</span>`).join(''):count?`<span class="jr-house-medal">🏅 ${fmt(count)}</span>`:'<span class="jr-house-medal empty">SIN MEDALLAS</span>';
    }
    renderBattle();
  }
  function renderBattle(){
    const strip=$('houseBattleStrip');if(!strip)return;
    const active=house.battleActive===true||clean(house.battleStatus,20)==='active';
    strip.classList.toggle('active',active);
    if(!active)return;
    if($('houseBattleOpponent'))$('houseBattleOpponent').textContent=`${clean(house.name,40)||'Mi Casa'} vs ${clean(house.battleOpponentName,40)||'Casa rival'}`;
    if($('houseBattleScore'))$('houseBattleScore').textContent=`${fmt(house.battleScore)} · ${fmt(house.battleOpponentScore)}`;
  }
  function renderTask(){
    // La tarjeta pertenece exclusivamente al módulo de tareas remuneradas.
    // Este módulo no vuelve a escribir PENDIENTE encima de la tarea real.
    if(window.__JEMMO_TASK_UI_OWNER__||window.JemmoHostTaskRewards)return;
    const box=$('houseTaskClock'),count=$('houseTaskCountdown'),mini=$('houseTaskProgressMini');if(!box||!count||!mini)return;
    const end=number(task.cycleEndsAtClient),active=clean(task.taskState,20)==='active'&&end>Date.now();
    box.classList.toggle('waiting',!active);
    if(!active){count.textContent=task.taskState==='expired'?'CICLO VENCIDO':'PENDIENTE';mini.textContent='Se activa al ingresar como Emisor/a';return}
    const hours=Math.max(1,number(task.dailyHours||Math.ceil(number(task.totalTargetMinutes||60)/60)));
    const paid=Array.isArray(task.claimedHourSlots)?task.claimedHourSlots.filter(slot=>number(slot)<=hours).length:0;
    count.textContent=`${fmt(task.hourlyRewardJems||2000)} JEMS/HORA`;
    mini.textContent=`${paid}/${hours} horas cobradas · Nivel ${clean(task.taskTierCode||'BASE',10)}`;
  }
  async function boot(){
    try{
      if(!houseId)return;
      user=await waitUser();
      onSnapshot(doc(db,'casas',houseId),snap=>{house=snap.data()||{};renderHouse()},e=>console.warn('JEMMO Sala Casa: datos',e?.code||e));
      onSnapshot(doc(db,'casas',houseId,'configuracion','sala'),snap=>{roomConfig=snap.data()||{};renderHouse()},e=>console.warn('JEMMO Sala Casa: identidad',e?.code||e));
      onSnapshot(doc(db,'casas',houseId,'tareas',user.uid),snap=>{task=snap.data()||{};renderTask()},e=>console.warn('JEMMO Sala Casa: tarea',e?.code||e));
      clearInterval(timer);timer=setInterval(renderTask,1000);renderTask();
    }catch(e){console.warn('JEMMO Sala Casa móvil:',e?.message||e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else void boot();
}
