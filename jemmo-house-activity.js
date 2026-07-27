/* JEMMO LIVE V1 · ACTIVIDAD EN LA CASA ACTUAL PRUEBA 33
   Registra tiempo LIVE y tiempo real sentado en Sala oficial con sesión, lease e idempotencia.
   Solo funciona para Emisoras formalmente asignadas a una Casa. */
(() => {
  'use strict';
  const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
  const path=location.pathname.toLowerCase(),params=new URLSearchParams(location.search);
  const activityType=path.endsWith('live.html')?'live':path.endsWith('salas.html')&&(params.get('houseRoom')==='1'||window.JemmoHouseRoomContext?.enabled===true)?'house_room':'';
  if(!activityType)return;

  const DAY_MS=86400000,LEASE_MS=90000,MAX_FLUSH_SECONDS=120;
  const requestedHouseId=String(
    window.JemmoHouseRoomContext?.id||
    document.documentElement.dataset.jemmoHouseId||
    params.get('house')||
    ''
  ).trim().slice(0,80);
  const targetId=activityType==='live'?'broadcastScreen':'roomView';
  const sessionId=`${activityType}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
  let services=null,user=null,profile={},member={},houseId='',taskConfig={totalTargetMinutes:60,liveTargetMinutes:0,houseRoomTargetMinutes:0};
  let running=false,starting=false,startedAt=0,sessionElapsedSeconds=0,flushTimer=0,observer=null,destroyed=false,cycleEndMs=0,leaseLost=false,eligible=false,membershipUnsub=null;

  const clean=(v,m=120)=>String(v||'').trim().slice(0,m);
  const normalize=v=>clean(v,40).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const num=v=>Math.max(0,Number(v)||0);
  function testRole(uid){try{return clean(JSON.parse(localStorage.getItem(`jemmo_role_lab_v1_${uid}`)||'null')?.mode,20)}catch{return''}}
  const emitterRoles=new Set(['emitter','emisor','emisora','host','streamer','creator','creador','creadora']);
  const managementRoles=new Set(['owner','propietario','superadmin','admin','administrador','agent','agente','agency']);
  const inactiveStatuses=new Set(['left','removed','inactive','expelled','salio','salida','eliminado','eliminada']);
  const isEmitterRole=value=>emitterRoles.has(normalize(value));
  const isManagementRole=value=>managementRoles.has(normalize(value));
  const memberActive=()=>!inactiveStatuses.has(normalize(member.status||profile.houseStatus||'active'));
  const profileMatchesHouse=()=>!clean(profile.houseId,80)||clean(profile.houseId,80)===houseId;
  function explicitHousePosition(){
    const memberPosition=member.housePosition||member.position||member.houseRole||member.house_role;
    if(clean(memberPosition,40))return memberPosition;
    return profileMatchesHouse()?(profile.housePosition||profile.houseRole||profile.house_role):'';
  }
  const authorityRole=()=>member.role||member.accountRole||(profileMatchesHouse()?(profile.role||profile.rol||profile.accountRole):'');
  const assignedAgentUid=()=>clean(
    member.assignedAgentUid||
    (member&&Object.keys(member).length?profile.assignedAgentUid:'')||
    '',
    160
  );
  const blockedByManagementRole=()=>isManagementRole(explicitHousePosition())||isManagementRole(authorityRole());
  function emitterEligible(taskData={}){
    if(!memberActive()||blockedByManagementRole())return false;
    if(isEmitterRole(explicitHousePosition()))return true;
    if(assignedAgentUid())return true;
    if(isEmitterRole(member.accountRole)||(profileMatchesHouse()&&isEmitterRole(profile.role||profile.rol||profile.accountRole)))return true;
    const taskAssigned=isEmitterRole(taskData.housePosition||taskData.position)||Boolean(clean(taskData.assignedAgentUid,160));
    return taskAssigned&&!['cancelled','removed','deleted'].includes(normalize(taskData.taskState));
  }
  async function migrateLegacyEmitter(){
    if(!services||!user||!houseId||(isEmitterRole(member.housePosition)&&assignedAgentUid()))return;
    try{
      const agentUid=assignedAgentUid();
      const memberPatch={housePosition:'emitter',migratedEmitterPositionAtClient:Date.now(),migratedEmitterPositionAt:services.serverTimestamp(),updatedAt:services.serverTimestamp()};
      const profilePatch={houseId,housePosition:'emitter',houseStatus:'active',houseUpdatedAt:services.serverTimestamp()};
      if(agentUid){memberPatch.assignedAgentUid=agentUid;profilePatch.assignedAgentUid=agentUid}
      await Promise.all([
        services.setDoc(services.doc(services.db,'casas',houseId,'miembros',user.uid),memberPatch,{merge:true}),
        services.setDoc(services.doc(services.db,'users',user.uid),profilePatch,{merge:true}),
        services.setDoc(services.doc(services.db,'casas',houseId,'tareas',user.uid),{uid:user.uid,housePosition:'emitter',assignedAgentUid:agentUid,assignmentVerifiedAtClient:Date.now(),assignmentVerifiedAt:services.serverTimestamp(),updatedAt:services.serverTimestamp()},{merge:true})
      ]);
      member.housePosition='emitter';if(agentUid)member.assignedAgentUid=agentUid;
    }catch(e){console.warn('JEMMO actividad Casa: migración Emisora',e?.code||e)}
  }

  async function getServices(){if(services)return services;const[a,b,f]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')]);const app=a.getApps()[0]||a.initializeApp(firebaseConfig);services={...f,auth:b.getAuth(app),db:f.getFirestore(app),onAuthStateChanged:b.onAuthStateChanged};return services}
  function waitUser(s,timeout=12000){if(s.auth.currentUser)return Promise.resolve(s.auth.currentUser);return new Promise((resolve,reject)=>{let stop=()=>{};const timer=setTimeout(()=>{stop();reject(new Error('Sesión no disponible.'))},timeout);stop=s.onAuthStateChanged(s.auth,current=>{if(!current)return;clearTimeout(timer);stop();resolve(current)},e=>{clearTimeout(timer);stop();reject(e)})})}
  function targetRunning(){
    const target=document.getElementById(targetId);
    if(!eligible||!target||document.hidden||!navigator.onLine)return false;
    if(activityType==='live')return !target.hidden&&getComputedStyle(target).display!=='none';
    const roomVisible=!target.classList.contains('jr-hidden')&&getComputedStyle(target).display!=='none';
    const seatState=window.JemmoHouseRoomControls?.getState?.();
    return roomVisible&&seatState?.houseSeatActive===true&&seatState?.sessionActive===true;
  }

  function cyclePayload(now,reason,current={}){return{uid:user.uid,displayName:clean(profile.displayName||user.displayName||user.email?.split('@')[0]||'Usuario JEMMO',48),publicId:clean(profile.publicId,48),accountRole:clean(profile.role||profile.rol||member.accountRole||'emisor',30),housePosition:'emitter',assignedAgentUid:assignedAgentUid(),taskState:'active',completionState:'in_progress',cycleDurationHours:24,cycleStartedAtClient:now,cycleEndsAtClient:now+DAY_MS,cycleKey:`24h-${now}`,cycleNumber:Math.max(1,Number(current.cycleNumber||0)+1),liveSeconds:0,houseRoomSeconds:0,totalTargetMinutes:60,dailyHours:1,hourlyRewardJems:2000,taskTierCode:'BASE',giftWindowDays:7,claimedHourSlots:[],claimedHours:0,hourlyClaims:{},rewardClaimed:false,rewardAmount:0,rewardTotalClaimed:0,reviewStatus:'pending',activatedReason:reason,activatedAtClient:Number(current.activatedAtClient||now),updatedAt:services.serverTimestamp()}}
  async function archiveAndReset(transaction,taskRef,current,now,reason){const oldStart=Number(current.cycleStartedAtClient||0);if(oldStart){const historyRef=services.doc(services.db,'casas',houseId,'historialTareas',`${user.uid}_${oldStart}`);transaction.set(historyRef,{...current,uid:user.uid,houseId,archivedAtClient:now,archivedAt:services.serverTimestamp(),archiveReason:reason},{merge:true})}const next=cyclePayload(now,reason,current);transaction.set(taskRef,next,{merge:true});cycleEndMs=next.cycleEndsAtClient;return next}

  async function ensureTaskCycle(reason='activity_entry'){
    const s=services||await getServices(),now=Date.now(),taskRef=s.doc(s.db,'casas',houseId,'tareas',user.uid);let result=null;
    await s.runTransaction(s.db,async transaction=>{const snap=await transaction.get(taskRef),current=snap.data()||{},end=Number(current.cycleEndsAtClient||0),active=clean(current.taskState,20)==='active'&&end>now;if(active){cycleEndMs=end;result=current;return}result=await archiveAndReset(transaction,taskRef,current,now,end&&end<=now?'automatic_24h_rollover':reason)});
    window.dispatchEvent(new CustomEvent('jemmo-house-task-cycle',{detail:{houseId,uid:user.uid,cycleEndsAtClient:cycleEndMs,reason}}));return result;
  }

  async function resolveMembership(){
    const s=await getServices();user=await waitUser(s);
    const userSnap=await s.getDoc(s.doc(s.db,'users',user.uid));profile=userSnap.data()||{};
    const membershipHouse=clean(profile.houseId,80);
    const liveRoomHouse=clean(window.JemmoHouseRoomContext?.id||document.documentElement.dataset.jemmoHouseId||requestedHouseId,80);
    houseId=activityType==='house_room'?(liveRoomHouse||membershipHouse):membershipHouse;
    if(!houseId)return false;
    const [memberSnap,configSnap,taskSnap]=await Promise.all([
      s.getDoc(s.doc(s.db,'casas',houseId,'miembros',user.uid)),
      s.getDoc(s.doc(s.db,'casas',houseId,'configuracion','tareas')),
      s.getDoc(s.doc(s.db,'casas',houseId,'tareas',user.uid))
    ]);
    member=memberSnap.data()||{};taskConfig={...taskConfig,...(configSnap.data()||{})};
    if(!memberSnap.exists()||!memberActive()){eligible=false;return false;}
    const taskData=taskSnap.data()||{};
    if(!emitterEligible(taskData)){eligible=false;return false;}
    eligible=true;
    if(!isEmitterRole(member.housePosition)||!assignedAgentUid())await migrateLegacyEmitter();
    window.JemmoWallet?.setMembership?.(user.uid,{hasHouse:true,houseId,houseName:profile.houseName||'',agentUid:member.assignedAgentUid||profile.assignedAgentUid||''});
    await ensureTaskCycle('emitter_activity_started');return true;
  }

  function refs(){const s=services;return{task:s.doc(s.db,'casas',houseId,'tareas',user.uid),lease:s.doc(s.db,'casas',houseId,'actividadActiva',`${user.uid}_${activityType}`),session:s.doc(s.db,'casas',houseId,'actividadSesiones',sessionId),presence:s.doc(s.db,'casas',houseId,'actividad',user.uid)}}

  async function claimLease(){
    const s=services,r=refs(),now=Date.now();
    await s.runTransaction(s.db,async transaction=>{
      transaction.set(r.lease,{uid:user.uid,houseId,type:activityType,sessionId,status:'active',startedAtClient:now,lastHeartbeatAtClient:now,leaseUntilClient:now+LEASE_MS,page:activityType==='live'?'live.html':'salas.html',updatedAt:s.serverTimestamp()},{merge:true});
      transaction.set(r.session,{sessionId,uid:user.uid,houseId,type:activityType,status:'active',startedAtClient:now,creditedSeconds:0,leaseId:`${user.uid}_${activityType}`,createdAt:s.serverTimestamp(),updatedAt:s.serverTimestamp()},{merge:true});
      transaction.set(r.presence,{uid:user.uid,displayName:clean(profile.displayName||user.displayName||'Usuario JEMMO',48),publicId:clean(profile.publicId,48),type:activityType,status:'active',sessionId,taskCycleEndsAtClient:cycleEndMs,page:activityType==='live'?'live.html':'salas.html',updatedAtClient:now,updatedAt:s.serverTimestamp()},{merge:true});
    });
  }

  async function flush(force=false){
    if((!running&&!force)||leaseLost)return;
    if(running&&startedAt){const now=Date.now();sessionElapsedSeconds+=Math.max(0,Math.floor((now-startedAt)/1000));startedAt=now}
    if(!services||!user||!houseId||!navigator.onLine)return;
    const s=services,r=refs(),now=Date.now();
    try{
      await s.runTransaction(s.db,async transaction=>{
        const [leaseSnap,sessionSnap,taskSnap]=await Promise.all([transaction.get(r.lease),transaction.get(r.session),transaction.get(r.task)]);
        const lease=leaseSnap.data()||{};
        if(lease.sessionId!==sessionId||clean(lease.status,20)!=='active'){leaseLost=true;return}
        let current=taskSnap.data()||{};
        if(clean(current.taskState,20)!=='active'||Number(current.cycleEndsAtClient||0)<=now)current=await archiveAndReset(transaction,r.task,current,now,'automatic_24h_rollover');
        cycleEndMs=Number(current.cycleEndsAtClient||now+DAY_MS);
        const credited=Math.max(0,Math.floor(Number(sessionSnap.data()?.creditedSeconds)||0));
        const desired=Math.max(credited,Math.floor(sessionElapsedSeconds));
        const delta=Math.min(MAX_FLUSH_SECONDS,Math.max(0,desired-credited));
        const nextCredited=credited+delta;
        const liveSeconds=Number(current.liveSeconds||0)+(activityType==='live'?delta:0);
        const roomSeconds=Number(current.houseRoomSeconds||0)+(activityType==='house_room'?delta:0);
        const totalTargetMinutes=num(current.totalTargetMinutes||taskConfig.totalTargetMinutes||60);
        const complete=liveSeconds+roomSeconds>=totalTargetMinutes*60;
        transaction.set(r.session,{creditedSeconds:nextCredited,lastFlushAtClient:now,lastFlushAt:s.serverTimestamp(),updatedAt:s.serverTimestamp()},{merge:true});
        transaction.set(r.lease,{lastHeartbeatAtClient:now,leaseUntilClient:now+LEASE_MS,creditedSeconds:nextCredited,updatedAt:s.serverTimestamp()},{merge:true});
        if(delta>0)transaction.set(r.task,{uid:user.uid,displayName:clean(profile.displayName||user.displayName||'Usuario JEMMO',48),publicId:clean(profile.publicId,48),accountRole:clean(profile.role||profile.rol||member.accountRole||'emisor',30),housePosition:'emitter',assignedAgentUid:assignedAgentUid(),taskState:'active',liveSeconds,houseRoomSeconds:roomSeconds,totalTargetMinutes,dailyHours:num(current.dailyHours||Math.max(1,Math.ceil(totalTargetMinutes/60))),hourlyRewardJems:num(current.hourlyRewardJems||2000),taskTierCode:clean(current.taskTierCode||'BASE',10),liveTargetMinutes:0,houseRoomTargetMinutes:0,completionState:complete?'completed':'in_progress',completedAtClient:complete?Number(current.completedAtClient||now):0,lastActivityType:activityType,lastActivitySessionId:sessionId,lastActivityAtClient:now,lastActivityAt:s.serverTimestamp(),updatedAt:s.serverTimestamp(),reviewStatus:clean(current.reviewStatus||'pending',20)},{merge:true});
        transaction.set(r.presence,{status:'active',sessionId,type:activityType,leaseUntilClient:now+LEASE_MS,updatedAtClient:now,updatedAt:s.serverTimestamp()},{merge:true});
      });
      if(leaseLost){running=false;clearInterval(flushTimer);flushTimer=0;window.dispatchEvent(new CustomEvent('jemmo-house-activity',{detail:{type:activityType,status:'replaced',houseId}}))}
    }catch(e){console.warn('JEMMO actividad Casa: no se pudo guardar',e?.code||e)}
  }

  async function start(){if(running||starting||destroyed||!houseId||leaseLost)return;starting=true;try{await ensureTaskCycle('activity_resumed');await claimLease();running=true;startedAt=Date.now();sessionElapsedSeconds=0;clearInterval(flushTimer);flushTimer=setInterval(()=>void flush(false),30000);window.dispatchEvent(new CustomEvent('jemmo-house-activity',{detail:{type:activityType,status:'active',houseId,sessionId,cycleEndsAtClient:cycleEndMs}}))}catch(e){console.warn('JEMMO actividad Casa: inicio',e?.code||e)}finally{starting=false}}

  async function stop(reason='stopped'){
    if(!running&&reason!=='closed')return;
    if(running)await flush(true);
    running=false;startedAt=0;clearInterval(flushTimer);flushTimer=0;
    if(!services||!user||!houseId)return;
    const s=services,r=refs(),now=Date.now();
    try{await s.runTransaction(s.db,async transaction=>{const leaseSnap=await transaction.get(r.lease);if(leaseSnap.data()?.sessionId===sessionId)transaction.set(r.lease,{status:reason,leaseUntilClient:now,lastHeartbeatAtClient:now,updatedAt:s.serverTimestamp()},{merge:true});transaction.set(r.session,{status:reason,endedAtClient:now,endedAt:s.serverTimestamp(),updatedAt:s.serverTimestamp()},{merge:true});transaction.set(r.presence,{status:reason,sessionId,updatedAtClient:now,updatedAt:s.serverTimestamp()},{merge:true})})}catch(e){console.warn('JEMMO actividad Casa: cierre',e?.code||e)}
    window.dispatchEvent(new CustomEvent('jemmo-house-activity',{detail:{type:activityType,status:reason,houseId,sessionId}}));
  }

  function sync(){if(targetRunning())void start();else void stop(document.hidden?'background':activityType==='house_room'?'listener':'inactive')}
  async function markTaskInactive(reason='membership_inactive'){
    if(!services||!user||!houseId)return;
    try{await services.setDoc(services.doc(services.db,'casas',houseId,'tareas',user.uid),{taskState:'inactive',completionState:'inactive',inactiveReason:reason,inactiveAtClient:Date.now(),inactiveAt:services.serverTimestamp(),updatedAt:services.serverTimestamp()},{merge:true})}catch(e){console.warn('JEMMO actividad Casa: desactivar tarea',e?.code||e)}
  }
  function watchMembership(){
    if(!services||!user||!houseId||membershipUnsub)return;
    membershipUnsub=services.onSnapshot(services.doc(services.db,'casas',houseId,'miembros',user.uid),snap=>{
      const next=snap.data()||{};member=next;
      const active=snap.exists()&&emitterEligible();
      if(!active){eligible=false;void stop('membership_inactive');void markTaskInactive('not_formal_house_emitter');return}
      const wasEligible=eligible;eligible=true;if(!wasEligible){void ensureTaskCycle('formal_emitter_assigned').then(sync)}
    },e=>console.warn('JEMMO actividad Casa: membresía',e?.code||e));
  }
  async function boot(){try{if(!await resolveMembership())return;watchMembership();const target=document.getElementById(targetId);if(!target)return;observer=new MutationObserver(sync);observer.observe(target,{attributes:true,attributeFilter:['hidden','class','style']});document.addEventListener('visibilitychange',sync);window.addEventListener('jemmo-house-seat-change',sync);window.addEventListener('offline',()=>void stop('offline'));window.addEventListener('online',sync);window.addEventListener('pagehide',()=>{destroyed=true;try{membershipUnsub?.()}catch{}membershipUnsub=null;void stop('closed')});setInterval(sync,2000);sync()}catch(e){console.warn('JEMMO actividad Casa:',e?.message||e)}}

  window.JemmoHouseActivity={getState:()=>({type:activityType,houseId,running,sessionId,sessionElapsedSeconds,cycleEndMs,leaseLost}),flush:()=>flush(true),ensureTaskCycle};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else void boot();
})();
