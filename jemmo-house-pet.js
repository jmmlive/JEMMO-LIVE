/* JEMMO LIVE · MASCOTA VIVA 2.5D Y SANTUARIO ACUÁTICO · PRUEBA 64 */
(()=>{
  'use strict';
  if(window.__JEMMO_HOUSE_PET_64__)return;
  window.__JEMMO_HOUSE_PET_64__=true;

  const VERSION='64.0.0';
  const DB_NAME='jemmo-house-pet-v1';
  const DB_STORE='states';
  const HOUR=60*60*1000;
  const params=new URLSearchParams(location.search);
  const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Number(value)||0));
  const formatNumber=value=>new Intl.NumberFormat('es-ES').format(Math.max(0,Math.round(Number(value)||0)));
  const now=()=>Date.now();
  const localGet=key=>{try{return localStorage.getItem(key)||''}catch{return''}};
  const sessionGet=key=>{try{return sessionStorage.getItem(key)||''}catch{return''}};
  const localSet=(key,value)=>{try{localStorage.setItem(key,value);return true}catch{return false}};
  const uid=()=>String(window.JemmoSession?.uid||localGet('jemmo_active_uid')||sessionGet('jemmo_active_uid')||'local-user');
  const safeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const makeId=(prefix='jhp')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;

  const resolveHouse=()=>{
    const id=String(params.get('house')||params.get('houseId')||params.get('casa')||localGet('jemmo_house_id')||localGet('jemmo_active_house_id')||'padre').trim()||'padre';
    const rawName=String(params.get('houseName')||params.get('casaNombre')||localGet('jemmo_house_name')||'Casa Padre JEMMO').trim();
    return{id:id.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)||'padre',name:rawName.slice(0,80)||'Casa Padre JEMMO'};
  };
  const house=resolveHouse();
  const isHouseContext=()=>params.get('houseRoom')==='1'||params.get('salaCasa')==='1'||params.has('house')||params.has('houseId')||params.has('casa')||document.body?.dataset?.houseRoom==='1';

  const levels=[
    {level:1,min:0,next:120,name:'Compañero recién llegado'},
    {level:2,min:120,next:340,name:'Explorador violeta'},
    {level:3,min:340,next:700,name:'Guardián del arrecife'},
    {level:4,min:700,next:1250,name:'Chicharro estelar'},
    {level:5,min:1250,next:null,name:'Leyenda JEMMO'}
  ];
  const gifts=[
    {key:'neon',name:'Bocado neón',price:500,xp:20,food:20,mood:7,icon:'spark'},
    {key:'coral',name:'Banquete coral',price:2000,xp:70,food:42,mood:16,icon:'diamond'},
    {key:'gold',name:'Tesoro dorado',price:5000,xp:180,food:72,mood:32,icon:'crown'}
  ];
  const actionRules={
    feed:{label:'ALIMENTAR',cooldown:6*HOUR,xp:4,food:24,clean:0,mood:5,icon:'feed'},
    clean:{label:'LIMPIAR',cooldown:12*HOUR,xp:8,food:0,clean:70,mood:5,icon:'clean'},
    play:{label:'JUGAR',cooldown:2*HOUR,xp:5,food:-4,clean:-2,mood:25,icon:'play'}
  };

  const defaultState=()=>({
    version:VERSION,houseId:house.id,houseName:house.name,houseLevel:1,xp:0,food:100,clean:100,mood:100,
    lastDecayAt:now(),lastActions:{feed:0,clean:0,play:0,visit:0},paidFeedCount:0,paidFeedJemmos:0,
    externalKeys:[],updatedAt:0,updatedBy:uid(),migration64:true
  });

  let state=defaultState();
  let overlay=null,launch=null,renderer=null;
  let toastTimer=0,countdownTimer=0,saveTimer=0,bodyOverflow='';
  let syncLabel='Guardado local preparado.',syncTone='warn',pendingGift=null,paymentLock=false;

  function isLegacy(raw){
    const version=String(raw?.version||'');
    return !version.startsWith('64.');
  }
  function normalizeState(raw){
    raw=raw&&typeof raw==='object'?raw:{};
    if(isLegacy(raw)){
      return{
        ...defaultState(),
        houseName:String(raw.houseName||house.name).slice(0,80),
        houseLevel:Math.max(1,Number(raw.houseLevel||raw.nivelCasa||raw.house_level)||1),
        updatedAt:Math.max(now(),Number(raw.updatedAt)||0),
        updatedBy:uid(),
        migratedFrom:String(raw.version||'legacy')
      };
    }
    const actions=raw.lastActions&&typeof raw.lastActions==='object'?raw.lastActions:{};
    return{
      ...defaultState(),...raw,version:VERSION,houseId:house.id,
      houseName:String(raw.houseName||house.name).slice(0,80),
      houseLevel:Math.max(1,Number(raw.houseLevel||raw.nivelCasa||raw.house_level)||1),
      xp:Math.max(0,Number(raw.xp)||0),food:clamp(raw.food??100),clean:clamp(raw.clean??100),mood:clamp(raw.mood??100),
      lastDecayAt:Number(raw.lastDecayAt)||now(),
      lastActions:{feed:Number(actions.feed)||0,clean:Number(actions.clean)||0,play:Number(actions.play)||0,visit:Number(actions.visit)||0},
      paidFeedCount:Math.max(0,Number(raw.paidFeedCount)||0),paidFeedJemmos:Math.max(0,Number(raw.paidFeedJemmos)||0),
      externalKeys:Array.isArray(raw.externalKeys)?raw.externalKeys.slice(-200):[],updatedAt:Number(raw.updatedAt)||0,updatedBy:String(raw.updatedBy||uid()),migration64:true
    };
  }
  function decay(target){
    const current=now(),elapsed=Math.max(0,current-(Number(target.lastDecayAt)||current)),hours=elapsed/HOUR;
    if(hours<.25)return target;
    target.food=clamp(target.food-hours*.26);target.clean=clamp(target.clean-hours*.15);target.mood=clamp(target.mood-hours*.11-(target.food<25?hours*.2:0));target.lastDecayAt=current;
    return target;
  }
  function levelInfo(xp=state.xp){
    let current=levels[0];for(const item of levels)if(xp>=item.min)current=item;
    const span=current.next?current.next-current.min:1;
    return{...current,progress:current.next?clamp((xp-current.min)/span*100):100,remaining:current.next?Math.max(0,current.next-xp):0};
  }
  function petStatus(){
    const average=(state.food+state.clean+state.mood)/3;
    if(average>=85)return{label:'RADIANTE',tone:'radiant'};
    if(average>=65)return{label:'FELIZ',tone:'happy'};
    if(average>=45)return{label:'TRANQUILO',tone:'calm'};
    if(average>=25)return{label:'NECESITA CUIDADOS',tone:'warn'};
    return{label:'MUY BAJO',tone:'danger'};
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB'in window)){reject(new Error('IndexedDB no disponible'));return}
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE)};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('No se pudo abrir IndexedDB'));
    });
  }
  async function idbRead(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly'),req=tx.objectStore(DB_STORE).get(house.id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()})}
  async function idbWrite(value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,house.id);tx.oncomplete=()=>{db.close();resolve(value)};tx.onerror=()=>{db.close();reject(tx.error)}})}

  const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
  let firebasePromise=null;
  function firebase(){
    if(firebasePromise)return firebasePromise;
    firebasePromise=Promise.all([import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')]).then(([appMod,fs])=>({fs,db:fs.getFirestore(appMod.getApps()[0]||appMod.initializeApp(firebaseConfig))}));
    return firebasePromise;
  }
  async function fireRead(){
    const{fs,db}=await firebase();const[petSnap,houseSnap]=await Promise.all([fs.getDoc(fs.doc(db,'casas',house.id,'mascota','actual')),fs.getDoc(fs.doc(db,'casas',house.id))]);
    let result=petSnap.exists()?petSnap.data():null;const h=houseSnap.exists()?houseSnap.data():null;
    if(h){
      const houseLevel=Math.max(1,Number(h.level||h.nivel||h.houseLevel||h.nivelCasa)||state.houseLevel||1);
      const houseName=String(h.name||h.nombre||h.houseName||state.houseName||house.name).slice(0,80);
      state.houseLevel=houseLevel;state.houseName=houseName;
      if(result)result={...result,houseLevel,houseName};
    }
    return result;
  }
  async function fireWrite(value,actionRecord=null){
    const{fs,db}=await firebase();const writes=[fs.setDoc(fs.doc(db,'casas',house.id,'mascota','actual'),value,{merge:true})];
    if(actionRecord?.id)writes.push(fs.setDoc(fs.doc(db,'casas',house.id,'mascotaAcciones',actionRecord.id),actionRecord,{merge:true}));await Promise.all(writes);
  }
  async function persistLocal(){state=normalizeState(state);try{await idbWrite(state)}catch(error){console.warn('JEMMO mascota: guardado local',error)}}
  function queueSave(actionRecord=null){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveState(actionRecord),180)}
  async function saveState(actionRecord=null){
    state.updatedAt=now();state.updatedBy=uid();await persistLocal();syncLabel='Guardada en el dispositivo. Sincronizando…';syncTone='warn';renderSync();
    try{await fireWrite(normalizeState(state),actionRecord);syncLabel='Sincronizada con la Casa en Firebase.';syncTone=''}catch(error){console.warn('JEMMO mascota: Firebase',error);syncLabel='Guardada localmente. Firebase se reintentará.';syncTone='warn'}renderSync();
  }
  async function load(){
    let local=null,remote=null;
    try{local=await idbRead()}catch(error){console.warn('JEMMO mascota: lectura local',error)}
    if(local)state=normalizeState(local);decay(state);render();
    try{remote=await fireRead();if(remote){const normalized=normalizeState(remote);if(normalized.updatedAt>=state.updatedAt)state=normalized}decay(state);syncLabel='Sincronizada con la Casa en Firebase.';syncTone='';await saveState()}
    catch(error){console.warn('JEMMO mascota: lectura Firebase',error);syncLabel='Funciona con respaldo local. Firebase se reintentará.';syncTone='warn';await persistLocal()}
    render();
  }

  function iconSvg(name){
    const common='viewBox="0 0 48 48" aria-hidden="true"';
    if(name==='feed')return`<svg ${common}><path d="M12 29c8-13 19-17 27-12-1 12-11 21-25 19"/><path d="M12 29 6 23m6 6-7 5m23-17 5-8"/></svg>`;
    if(name==='clean')return`<svg ${common}><path d="M24 5S11 20 11 30a13 13 0 0 0 26 0C37 20 24 5 24 5Z"/><path d="M18 33c2 3 6 4 9 2"/></svg>`;
    if(name==='play')return`<svg ${common}><path d="m24 5 5.4 11 12.1 1.8-8.8 8.5 2.1 12L24 32.7 13.2 38.3l2.1-12-8.8-8.5L18.6 16 24 5Z"/></svg>`;
    if(name==='diamond')return`<svg ${common}><path d="M8 18 16 7h16l8 11-16 23L8 18Z"/><path d="m8 18 16 4 16-4M16 7l8 15 8-15M24 22v19"/></svg>`;
    if(name==='crown')return`<svg ${common}><path d="m7 14 9 9 8-14 8 14 9-9-3 25H10L7 14Z"/><path d="M11 33h26"/></svg>`;
    return`<svg ${common}><path d="m24 5 3.8 11.2L39 20l-11.2 3.8L24 35l-3.8-11.2L9 20l11.2-3.8L24 5Z"/></svg>`;
  }
  function createUi(){
    if(document.getElementById('jhp-overlay')){overlay=document.getElementById('jhp-overlay');launch=document.getElementById('jhp-launch');return}
    launch=document.createElement('button');launch.id='jhp-launch';launch.type='button';launch.hidden=!isHouseContext();launch.setAttribute('aria-label','Abrir mascota de la Casa');launch.innerHTML='<span class="jhp-launch-mark">J</span><span>MASCOTA</span>';
    const houseTop=document.getElementById('houseRoomInfo');
    if(document.body.classList.contains('jemmo-house-room')&&houseTop){launch.classList.add('jhp-launch-top');houseTop.append(launch)}else document.body.append(launch);

    overlay=document.createElement('section');overlay.id='jhp-overlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Santuario de la mascota JEMMO');
    overlay.innerHTML=`<div class="jhp-shell">
      <header class="jhp-header">
        <div class="jhp-brand-mark">J</div>
        <div class="jhp-heading"><span>MASCOTA OFICIAL JEMMO LIVE</span><h2>CHICHARRO JEMMO</h2><p id="jhp-house-name">${safeText(state.houseName)}</p></div>
        <button class="jhp-close" id="jhp-close" type="button" aria-label="Cerrar">×</button>
      </header>

      <section class="jhp-sanctuary" id="jhp-sanctuary">
        <canvas id="jhp-canvas" aria-label="Mascota JEMMO nadando en su santuario. Toca el agua para interactuar."></canvas>
        <div class="jhp-scene-top"><span class="jhp-level-badge" id="jhp-level-badge">NIVEL 1</span><span class="jhp-status-badge" id="jhp-status-badge">RADIANTE</span></div>
        <div class="jhp-caption"><strong id="jhp-caption">Toca el agua: tu chicharro te seguirá.</strong><small>Vive, reacciona y evoluciona con los cuidados de la Casa.</small></div>
      </section>

      <section class="jhp-progress-panel">
        <div class="jhp-progress-head"><div><span>EVOLUCIÓN</span><b id="jhp-level-name">Compañero recién llegado</b></div><strong id="jhp-xp-label">0 / 120 XP</strong></div>
        <div class="jhp-xp-track"><i id="jhp-xp-fill"></i></div>
        <div class="jhp-needs">
          <div class="jhp-need food"><div><span>ALIMENTO</span><b id="jhp-food-label">100%</b></div><i><em id="jhp-food-fill"></em></i></div>
          <div class="jhp-need clean"><div><span>LIMPIEZA</span><b id="jhp-clean-label">100%</b></div><i><em id="jhp-clean-fill"></em></i></div>
          <div class="jhp-need mood"><div><span>ÁNIMO</span><b id="jhp-mood-label">100%</b></div><i><em id="jhp-mood-fill"></em></i></div>
        </div>
      </section>

      <div class="jhp-actions">${Object.entries(actionRules).map(([key,rule])=>`<button class="jhp-action" type="button" data-jhp-action="${key}"><span>${iconSvg(rule.icon)}</span><b>${rule.label}</b><small data-jhp-countdown="${key}">DISPONIBLE AHORA</small></button>`).join('')}</div>

      <section class="jhp-paid">
        <div class="jhp-paid-copy"><span>IMPULSO DE EVOLUCIÓN</span><h3>Alimentos especiales</h3><p>Opcionales. Dan XP adicional sin sustituir los cuidados gratuitos.</p></div>
        <div class="jhp-gifts">${gifts.map(gift=>`<button class="jhp-gift" type="button" data-jhp-gift="${gift.key}"><span>${iconSvg(gift.icon)}</span><b>${gift.name}</b><small>${formatNumber(gift.price)} JEMMOS</small><em>+${gift.xp} XP</em></button>`).join('')}</div>
        <p class="jhp-paid-note">Cada compra requiere confirmación y bloquea cobros duplicados.</p>
      </section>

      <div class="jhp-sync" id="jhp-sync"><strong>GUARDADO:</strong> <span id="jhp-sync-text">${safeText(syncLabel)}</span></div>
    </div>
    <div class="jhp-confirm-backdrop" id="jhp-confirm-backdrop" hidden><div class="jhp-confirm"><span class="jhp-confirm-label">CONFIRMACIÓN SEGURA</span><h3 id="jhp-confirm-title">Confirmar alimento</h3><p id="jhp-confirm-copy"></p><div class="jhp-confirm-summary"><div><small>COSTE</small><b id="jhp-confirm-cost">0 JEMMOS</b></div><div><small>PROGRESO</small><b id="jhp-confirm-xp">+0 XP</b></div></div><div class="jhp-confirm-actions"><button type="button" id="jhp-confirm-cancel">CANCELAR</button><button type="button" class="primary" id="jhp-confirm-pay">CONFIRMAR</button></div></div></div>
    <div class="jhp-toast" id="jhp-toast" role="status"></div>`;
    document.body.append(overlay);bindUi();
  }

  const el=id=>document.getElementById(id);
  function bindUi(){
    launch?.addEventListener('click',open);el('jhp-close')?.addEventListener('click',close);el('jhp-confirm-cancel')?.addEventListener('click',closeConfirm);el('jhp-confirm-pay')?.addEventListener('click',confirmPaidFeed);
    el('jhp-confirm-backdrop')?.addEventListener('click',event=>{if(event.target===event.currentTarget)closeConfirm()});
    document.querySelectorAll('[data-jhp-action]').forEach(button=>button.addEventListener('click',()=>doFreeAction(button.dataset.jhpAction)));
    document.querySelectorAll('[data-jhp-gift]').forEach(button=>button.addEventListener('click',()=>openConfirm(button.dataset.jhpGift)));
    const canvas=el('jhp-canvas');
    if(window.JemmoMascotRenderer&&canvas){renderer=new window.JemmoMascotRenderer(canvas,{onInteraction:()=>setCaption('Te ha visto. Mueve el dedo por el agua.')});renderer.setStatus({...state,level:levelInfo().level})}
    window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!overlay?.hidden){if(!el('jhp-confirm-backdrop')?.hidden)closeConfirm();else close()}});
  }
  function open(){createUi();bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';overlay.hidden=false;render();renderer?.resize?.();renderer?.start();clearInterval(countdownTimer);countdownTimer=setInterval(renderCountdowns,1000);el('jhp-close')?.focus({preventScroll:true})}
  function close(){if(!overlay)return;closeConfirm();renderer?.stop();overlay.hidden=true;document.body.style.overflow=bodyOverflow;clearInterval(countdownTimer)}
  function setCaption(text){const node=el('jhp-caption');if(node)node.textContent=text}
  function showToast(message){const node=el('jhp-toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2600)}

  function remaining(action){return Math.max(0,(Number(state.lastActions[action])||0)+actionRules[action].cooldown-now())}
  function duration(ms){if(ms<=0)return'DISPONIBLE AHORA';const hours=Math.floor(ms/HOUR),minutes=Math.floor((ms%HOUR)/60000),seconds=Math.floor((ms%60000)/1000);if(hours>0)return`EN ${hours} H ${String(minutes).padStart(2,'0')} MIN`;if(minutes>0)return`EN ${minutes} MIN ${String(seconds).padStart(2,'0')} S`;return`EN ${seconds} S`}
  function renderCountdowns(){document.querySelectorAll('[data-jhp-countdown]').forEach(node=>{const action=node.dataset.jhpCountdown,ms=remaining(action),button=node.closest('.jhp-action');node.textContent=duration(ms);button.disabled=ms>0;button.classList.toggle('ready',ms<=0)})}
  function doFreeAction(action){
    const rule=actionRules[action];if(!rule)return;if(remaining(action)>0){showToast(`${rule.label}: ${duration(remaining(action)).toLowerCase()}.`);return}
    const bucket=Math.floor(now()/rule.cooldown),actionId=`${action}_${uid()}_${bucket}`;state.lastActions[action]=now();state.xp+=rule.xp;state.food=clamp(state.food+rule.food);state.clean=clamp(state.clean+rule.clean);state.mood=clamp(state.mood+rule.mood);state.lastDecayAt=now();
    const copy={feed:'Ha comido y viene a saludarte.',clean:'El agua vuelve a brillar.',play:'Está jugando contigo.'};setCaption(copy[action]);renderer?.trigger(action);render();queueSave({id:actionId,type:action,xp:rule.xp,free:true,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION});showToast(`${rule.label}: +${rule.xp} XP.`)
  }

  function openConfirm(key){const gift=gifts.find(item=>item.key===key);if(!gift)return;pendingGift=gift;el('jhp-confirm-title').textContent=gift.name;el('jhp-confirm-copy').textContent=`Alimentará al chicharro de ${state.houseName} y aumentará su evolución.`;el('jhp-confirm-cost').textContent=`${formatNumber(gift.price)} JEMMOS`;el('jhp-confirm-xp').textContent=`+${gift.xp} XP`;el('jhp-confirm-pay').disabled=false;el('jhp-confirm-pay').textContent='CONFIRMAR';el('jhp-confirm-backdrop').hidden=false}
  function closeConfirm(){pendingGift=null;paymentLock=false;const node=el('jhp-confirm-backdrop');if(node)node.hidden=true}
  async function confirmPaidFeed(){
    if(!pendingGift||paymentLock)return;const gift=pendingGift;paymentLock=true;const button=el('jhp-confirm-pay');button.disabled=true;button.textContent='REGISTRANDO…';const operationId=`pet-feed:${house.id}:${uid()}:${gift.key}:${Math.floor(now()/2000)}`;
    const spent=window.JemmoWallet?.spendJemmos?.(gift.price,{title:'Alimento para mascota de Casa',detail:`${gift.name} · ${state.houseName} · +${gift.xp} XP`,itemId:`house-pet-feed:${house.id}:${gift.key}`,category:'house-pet',context:'Mascota de Casa',source:'house-pet-feed',idempotencyKey:operationId});
    if(!spent?.ok){closeConfirm();if(spent?.duplicate)showToast('Doble toque bloqueado: ya se registró.');else{showToast(`Saldo insuficiente para ${gift.name}.`);window.JemmoWallet?.open?.('recharge')}return}
    state.xp+=gift.xp;state.food=clamp(state.food+gift.food);state.mood=clamp(state.mood+gift.mood);state.clean=clamp(state.clean+2);state.paidFeedCount+=1;state.paidFeedJemmos+=gift.price;state.lastDecayAt=now();
    const actionRecord={id:operationId.replace(/[^a-zA-Z0-9_-]/g,'_'),type:'paid_feed',giftKey:gift.key,giftName:gift.name,jemmos:gift.price,xp:gift.xp,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION};
    closeConfirm();renderer?.trigger('gift');setCaption(`${gift.name}: celebración de evolución.`);render();await saveState(actionRecord);showToast(`${gift.name}: +${gift.xp} XP.`)
  }

  async function addProgress(amount,options={}){const xp=Math.max(0,Number(amount)||0);if(!xp)return{ok:false,reason:'invalid_xp'};const key=String(options.idempotencyKey||options.key||'').slice(0,160);if(key&&state.externalKeys.includes(key))return{ok:false,duplicate:true,state:normalizeState(state)};if(key)state.externalKeys=[...state.externalKeys,key].slice(-200);state.xp+=xp;state.mood=clamp(state.mood+(Number(options.mood)||0));state.food=clamp(state.food+(Number(options.food)||0));state.clean=clamp(state.clean+(Number(options.clean)||0));state.lastDecayAt=now();renderer?.trigger('gift');render();await saveState({id:(key||makeId('external')).replace(/[^a-zA-Z0-9_-]/g,'_'),type:String(options.type||'external_progress'),xp,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION});return{ok:true,state:normalizeState(state)}}
  async function resetForTesting(){state=defaultState();await saveState({id:makeId('reset64'),type:'owner_test_reset',houseId:house.id,userId:uid(),createdAt:now(),version:VERSION});render();renderer?.trigger('clean');return normalizeState(state)}

  function renderSync(){const box=el('jhp-sync'),text=el('jhp-sync-text');if(text)text.textContent=syncLabel;if(box)box.className=`jhp-sync ${syncTone||''}`.trim()}
  function render(){
    if(!overlay)return;decay(state);const info=levelInfo(),status=petStatus();
    const set=(id,value)=>{const node=el(id);if(node)node.textContent=value};set('jhp-house-name',state.houseName);set('jhp-level-badge',`NIVEL ${info.level}`);set('jhp-status-badge',status.label);set('jhp-level-name',info.name);set('jhp-xp-label',info.next?`${formatNumber(state.xp)} / ${formatNumber(info.next)} XP`:`${formatNumber(state.xp)} XP · MÁXIMO`);
    const statusNode=el('jhp-status-badge');if(statusNode)statusNode.dataset.tone=status.tone;const fill=el('jhp-xp-fill');if(fill)fill.style.width=`${info.progress}%`;
    [['food',state.food],['clean',state.clean],['mood',state.mood]].forEach(([key,value])=>{const rounded=Math.round(clamp(value));set(`jhp-${key}-label`,`${rounded}%`);const bar=el(`jhp-${key}-fill`);if(bar)bar.style.width=`${rounded}%`});
    renderer?.setStatus({level:info.level,food:state.food,clean:state.clean,mood:state.mood});renderCountdowns();renderSync();
  }
  function install(){
    createUi();if(isHouseContext())launch.hidden=false;load();
    const observer=new MutationObserver(()=>{if(isHouseContext()&&launch)launch.hidden=false;const houseTop=document.getElementById('houseRoomInfo');if(launch&&houseTop&&document.body.classList.contains('jemmo-house-room')&&!launch.classList.contains('jhp-launch-top')){launch.classList.add('jhp-launch-top');houseTop.append(launch)}});observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true});
  }

  window.JemmoHousePet={version:VERSION,open,close,getState:()=>normalizeState(state),addProgress,refresh:load,resetForTesting};
  window.addEventListener('jemmo-house-task-completed',event=>addProgress(Number(event.detail?.xp)||10,{type:'house_task',idempotencyKey:event.detail?.id||event.detail?.taskId||makeId('task'),mood:3}));
  window.addEventListener('jemmo-house-gift-received',event=>addProgress(Number(event.detail?.petXp)||0,{type:'gift_received',idempotencyKey:event.detail?.id||event.detail?.giftId||makeId('gift'),mood:2}));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
