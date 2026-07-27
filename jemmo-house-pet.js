/* JEMMO LIVE V1 · PECERA FUTURISTA Y ALIMENTACIÓN DUAL · PRUEBA 41 */
(()=>{
  'use strict';
  if(window.__JEMMO_HOUSE_PET_41__)return;
  window.__JEMMO_HOUSE_PET_41__=true;

  const VERSION='41.0.0-test';
  const DB_NAME='jemmo-house-pet-v1';
  const DB_STORE='states';
  const DAY=24*60*60*1000;
  const HOUR=60*60*1000;
  const params=new URLSearchParams(location.search);
  const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Number(value)||0));
  const number=value=>new Intl.NumberFormat('es-ES').format(Math.max(0,Math.round(Number(value)||0)));
  const now=()=>Date.now();
  const localGet=key=>{try{return window.localStorage?.getItem?.(key)||''}catch{return''}};
  const sessionGet=key=>{try{return window.sessionStorage?.getItem?.(key)||''}catch{return''}};
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
    {level:1,min:0,next:100,name:'Pecera inicial'},
    {level:2,min:100,next:260,name:'Jardín violeta'},
    {level:3,min:260,next:520,name:'Reino coral y castillo'},
    {level:4,min:520,next:900,name:'Santuario dorado'},
    {level:5,min:900,next:null,name:'Océano legendario'}
  ];
  const gifts=[
    {key:'neon',icon:'✦',name:'Bocado neón',price:500,xp:20,food:20,mood:6},
    {key:'coral',icon:'◆',name:'Banquete coral',price:2000,xp:70,food:42,mood:16},
    {key:'gold',icon:'♛',name:'Tesoro dorado',price:5000,xp:180,food:72,mood:32}
  ];
  const actionRules={
    feed:{label:'ALIMENTAR',icon:'◉',cooldown:DAY,xp:4,food:24,clean:0,mood:5},
    clean:{label:'LIMPIAR',icon:'✦',cooldown:DAY,xp:8,food:0,clean:70,mood:5},
    play:{label:'JUGAR',icon:'◆',cooldown:4*HOUR,xp:5,food:-4,clean:-2,mood:25}
  };

  const defaultState=()=>({
    version:VERSION,
    houseId:house.id,
    houseName:house.name,
    houseLevel:1,
    xp:0,
    food:100,
    clean:100,
    mood:100,
    lastDecayAt:now(),
    lastActions:{feed:0,clean:0,play:0,visit:0},
    paidFeedCount:0,
    paidFeedJemmos:0,
    externalKeys:[],
    updatedAt:0,
    updatedBy:uid()
  });
  let state=defaultState();
  let overlay=null;
  let launch=null;
  let toastTimer=0;
  let autoTimer=0;
  let countdownTimer=0;
  let saveTimer=0;
  let bodyOverflow='';
  let syncLabel='Respaldo local preparado.';
  let syncTone='warn';
  let pendingGift=null;
  let paymentLock=false;
  let dragging=false;
  let lastPointer={x:50,y:50};

  function normalizeState(raw){
    raw=raw&&typeof raw==='object'?raw:{};
    const actions=raw.lastActions&&typeof raw.lastActions==='object'?raw.lastActions:{};
    return{
      ...defaultState(),
      ...raw,
      version:VERSION,
      houseId:house.id,
      houseName:String(raw.houseName||house.name).slice(0,80),
      houseLevel:Math.max(1,Number(raw.houseLevel||raw.nivelCasa||raw.house_level)||1),
      xp:Math.max(0,Number(raw.xp||raw.experience||raw.experiencia)||0),
      food:clamp(raw.food??raw.alimento??raw.hunger??100),
      clean:clamp(raw.clean??raw.cleanliness??raw.limpieza??100),
      mood:clamp(raw.mood??raw.animo??raw.happiness??100),
      lastDecayAt:Number(raw.lastDecayAt||raw.lastUpdateAt||raw.updatedAt)||now(),
      lastActions:{
        feed:Number(actions.feed||raw.lastFeedAt||raw.lastFedAt||0),
        clean:Number(actions.clean||raw.lastCleanAt||0),
        play:Number(actions.play||raw.lastPlayAt||0),
        visit:Number(actions.visit||raw.lastVisitAt||0)
      },
      paidFeedCount:Math.max(0,Number(raw.paidFeedCount)||0),
      paidFeedJemmos:Math.max(0,Number(raw.paidFeedJemmos)||0),
      externalKeys:Array.isArray(raw.externalKeys)?raw.externalKeys.slice(-200):[],
      updatedAt:Number(raw.updatedAt)||0,
      updatedBy:String(raw.updatedBy||uid())
    };
  }

  function decay(target){
    const current=now();
    const elapsed=Math.max(0,current-(Number(target.lastDecayAt)||current));
    const hours=elapsed/HOUR;
    if(hours<.25)return target;
    target.food=clamp(target.food-hours*.28);
    target.clean=clamp(target.clean-hours*.17);
    target.mood=clamp(target.mood-hours*.12-(target.food<25?hours*.18:0));
    target.lastDecayAt=current;
    return target;
  }

  function levelInfo(xp=state.xp){
    let current=levels[0];
    for(const item of levels)if(xp>=item.min)current=item;
    const span=current.next?current.next-current.min:1;
    const progress=current.next?clamp((xp-current.min)/span*100):100;
    return{...current,progress,remaining:current.next?Math.max(0,current.next-xp):0};
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB'in window)){reject(new Error('IndexedDB no disponible'));return}
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE)};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('No se pudo abrir IndexedDB'));
    });
  }
  async function idbRead(){
    const db=await openDb();
    return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(house.id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()});
  }
  async function idbWrite(value){
    const db=await openDb();
    return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,house.id);tx.oncomplete=()=>{db.close();resolve(value)};tx.onerror=()=>{db.close();reject(tx.error)}});
  }

  const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
  let firebasePromise=null;
  function firebase(){
    if(firebasePromise)return firebasePromise;
    firebasePromise=Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
    ]).then(([appMod,fs])=>{
      const app=appMod.getApps()[0]||appMod.initializeApp(firebaseConfig);
      return{fs,db:fs.getFirestore(app)};
    });
    return firebasePromise;
  }

  async function fireRead(){
    const{fs,db}=await firebase();
    const [petSnap,houseSnap]=await Promise.all([
      fs.getDoc(fs.doc(db,'casas',house.id,'mascota','actual')),
      fs.getDoc(fs.doc(db,'casas',house.id))
    ]);
    const result=petSnap.exists()?petSnap.data():null;
    const h=houseSnap.exists()?houseSnap.data():null;
    if(h){
      state.houseLevel=Math.max(1,Number(h.level||h.nivel||h.houseLevel||h.nivelCasa)||state.houseLevel||1);
      state.houseName=String(h.name||h.nombre||h.houseName||state.houseName||house.name).slice(0,80);
    }
    return result;
  }
  async function fireWrite(value,actionRecord=null){
    const{fs,db}=await firebase();
    const writes=[fs.setDoc(fs.doc(db,'casas',house.id,'mascota','actual'),value,{merge:true})];
    if(actionRecord?.id)writes.push(fs.setDoc(fs.doc(db,'casas',house.id,'mascotaAcciones',actionRecord.id),actionRecord,{merge:true}));
    await Promise.all(writes);
  }

  async function load(){
    let local=null,remote=null;
    try{local=await idbRead()}catch(error){console.warn('JEMMO mascota IndexedDB lectura',error)}
    if(local)state=normalizeState(local);
    decay(state);
    render();
    try{
      remote=await fireRead();
      if(remote){
        const normalized=normalizeState(remote);
        if(normalized.updatedAt>=state.updatedAt)state=normalized;
      }
      decay(state);
      syncLabel='Sincronizada con la Casa en Firebase.';
      syncTone='';
      await persistLocal();
    }catch(error){
      console.warn('JEMMO mascota Firebase lectura',error);
      syncLabel='Funciona con respaldo local. Firebase se reintentará automáticamente.';
      syncTone='warn';
    }
    applyDailyVisit();
    render();
  }

  async function persistLocal(){
    const clean=normalizeState(state);
    state=clean;
    try{await idbWrite(clean)}catch(error){console.warn('JEMMO mascota IndexedDB guardado',error)}
  }
  function queueSave(actionRecord=null){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>saveState(actionRecord),180);
  }
  async function saveState(actionRecord=null){
    state.updatedAt=now();
    state.updatedBy=uid();
    await persistLocal();
    syncLabel='Guardada en el dispositivo. Sincronizando con Firebase…';
    syncTone='warn';
    renderSync();
    try{
      await fireWrite(normalizeState(state),actionRecord);
      syncLabel='Sincronizada con la Casa en Firebase.';
      syncTone='';
    }catch(error){
      console.warn('JEMMO mascota Firebase guardado',error);
      syncLabel='Guardada localmente. Firebase no confirmó el cambio todavía.';
      syncTone='warn';
    }
    renderSync();
  }

  function applyDailyVisit(){
    const last=Number(state.lastActions.visit)||0;
    if(now()-last<DAY)return;
    const bucket=Math.floor(now()/DAY);
    state.lastActions.visit=now();
    state.xp+=3;
    state.mood=clamp(state.mood+3);
    queueSave({id:`visit_${uid()}_${bucket}`,type:'visit',xp:3,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION});
  }

  function fishSvg(compact=false){
    const label=compact?'':'aria-label="Chicharro oficial JEMMO LIVE" role="img"';
    return `<svg ${label} class="jhp-fish" viewBox="0 0 620 330" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jhpBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e66cff"/><stop offset=".36" stop-color="#a328ff"/><stop offset=".72" stop-color="#6a1fe8"/><stop offset="1" stop-color="#4311a4"/></linearGradient>
        <radialGradient id="jhpBodyHi" cx="35%" cy="25%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".32" stop-color="#ff9cff" stop-opacity=".18"/><stop offset="1" stop-color="#32106d" stop-opacity="0"/></radialGradient>
        <linearGradient id="jhpGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a2"/><stop offset=".3" stop-color="#ffd65a"/><stop offset=".7" stop-color="#ef9f26"/><stop offset="1" stop-color="#9b4a12"/></linearGradient>
        <radialGradient id="jhpEye" cx="38%" cy="32%" r="65%"><stop offset="0" stop-color="#fff"/><stop offset=".23" stop-color="#a9fbff"/><stop offset=".5" stop-color="#1fe5ff"/><stop offset=".78" stop-color="#1575e8"/><stop offset="1" stop-color="#062361"/></radialGradient>
        <filter id="jhpGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="jhpShadow" x="-30%" y="-40%" width="170%" height="190%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#080010" flood-opacity=".65"/></filter>
      </defs>
      <g filter="url(#jhpShadow)">
        <g class="jhp-tail">
          <path d="M473 155 C535 91 590 92 603 76 C592 126 574 157 548 176 C574 197 594 229 604 277 C578 256 527 253 472 198 Z" fill="url(#jhpBody)" stroke="url(#jhpGold)" stroke-width="9" stroke-linejoin="round"/>
          <path d="M489 159 C531 129 556 120 581 109" fill="none" stroke="#ff69d2" stroke-width="8" stroke-linecap="round" opacity=".72"/>
          <path d="M491 196 C532 218 558 228 581 244" fill="none" stroke="#ff69d2" stroke-width="8" stroke-linecap="round" opacity=".58"/>
        </g>
        <path d="M147 83 C239 30 411 53 492 153 C510 175 510 194 490 211 C396 291 235 286 139 233 C88 205 68 159 88 124 C101 102 120 91 147 83 Z" fill="url(#jhpBody)" stroke="#6d0fc4" stroke-width="7"/>
        <path d="M143 88 C237 44 397 65 473 154 C381 122 254 116 135 147 C113 153 97 146 91 133 C100 108 117 96 143 88 Z" fill="url(#jhpBodyHi)"/>
        <path d="M154 88 C175 48 202 27 230 18 L255 79" fill="url(#jhpGold)" stroke="#ffdc70" stroke-width="5" stroke-linejoin="round"/>
        <path class="jhp-fin" d="M305 228 C350 258 371 294 349 315 C316 292 287 267 270 234 Z" fill="url(#jhpGold)" stroke="#ffd864" stroke-width="5"/>
        <path d="M429 220 C458 241 466 265 452 284 C427 265 411 244 402 222 Z" fill="url(#jhpGold)" stroke="#ffd864" stroke-width="5"/>
        <path d="M115 189 C88 197 63 190 40 166 C69 165 83 149 95 126" fill="#db5bdf" stroke="#f4a1ff" stroke-width="5" stroke-linecap="round"/>
        <path d="M119 220 C94 238 68 235 44 219 C78 211 90 196 102 174" fill="#ff61c5" opacity=".9"/>
        <path d="M256 111 C275 130 283 164 277 208" fill="none" stroke="url(#jhpGold)" stroke-width="13" stroke-linecap="round"/>
        <path d="M277 110 C292 130 300 157 296 184" fill="none" stroke="#ffed9c" stroke-width="4" stroke-linecap="round" opacity=".8"/>
        <ellipse cx="151" cy="131" rx="39" ry="42" fill="#19063e" stroke="#ffdc69" stroke-width="6"/>
        <circle class="jhp-eye-glow" cx="151" cy="130" r="30" fill="url(#jhpEye)" filter="url(#jhpGlow)"/>
        <circle cx="141" cy="119" r="8" fill="#fff" opacity=".92"/>
        <path d="M87 167 C107 178 125 177 139 165" fill="none" stroke="#330846" stroke-width="8" stroke-linecap="round"/>
        <path d="M91 174 C108 181 122 180 134 173" fill="none" stroke="#ff77cc" stroke-width="4" stroke-linecap="round"/>
        <path d="M357 103 C403 83 441 86 467 92" fill="none" stroke="url(#jhpGold)" stroke-width="12" stroke-linecap="round"/>
        <path d="M358 111 C398 99 430 99 456 102" fill="none" stroke="#ff66c9" stroke-width="5" stroke-linecap="round"/>
        <text x="327" y="208" font-family="Arial Black,Arial,sans-serif" font-size="106" font-weight="900" fill="url(#jhpGold)" stroke="#7c3f0f" stroke-width="4" paint-order="stroke">J</text>
        <path d="M185 242 C249 268 360 268 430 235" fill="none" stroke="#ff75cf" stroke-width="5" stroke-linecap="round" opacity=".34"/>
      </g>
    </svg>`;
  }

  function createUi(){
    if(document.getElementById('jhp-overlay')){overlay=document.getElementById('jhp-overlay');launch=document.getElementById('jhp-launch');return}
    launch=document.createElement('button');
    launch.id='jhp-launch';launch.type='button';launch.hidden=!isHouseContext();launch.setAttribute('aria-label','Abrir mascota de la Casa');
    launch.innerHTML=`<span class="jhp-launch-fish">${fishSvg(true)}</span><span>MASCOTA</span>`;
    document.body.append(launch);

    overlay=document.createElement('section');
    overlay.id='jhp-overlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Pecera de la Casa');
    overlay.innerHTML=`<div class="jhp-shell" id="jhp-shell">
      <header class="jhp-header">
        <div class="jhp-brand-icon">${fishSvg(true)}</div>
        <div class="jhp-heading"><span class="jhp-eyebrow">MASCOTA OFICIAL JEMMO LIVE</span><h2 class="jhp-title">PECERA · <span id="jhp-house-name">${safeText(state.houseName)}</span></h2><p class="jhp-subtitle">Chicharro violeta neón · Modo de pruebas</p></div>
        <button class="jhp-close" id="jhp-close" type="button" aria-label="Cerrar pecera">×</button>
      </header>
      <div class="jhp-summary">
        <article class="jhp-card"><small>NIVEL DE LA CASA</small><strong class="jhp-gold" id="jhp-house-level">1</strong><span id="jhp-house-card-name">${safeText(state.houseName)}</span></article>
        <article class="jhp-card"><small>NIVEL DE PECERA</small><strong id="jhp-pet-level">NIVEL 1</strong><span id="jhp-level-name">Pecera inicial</span></article>
      </div>
      <div class="jhp-aquarium" id="jhp-aquarium" data-level="1" aria-label="Pecera interactiva. Toca el agua para mover al pez.">
        <div class="jhp-waterline"></div><div class="jhp-aurora"></div>
        ${Array.from({length:15},(_,index)=>`<i class="jhp-bubble" style="--x:${4+(index*37)%91}%;--s:${7+(index*5)%19}px;--d:${7+(index%6)*1.45}s;--delay:-${(index*1.3).toFixed(1)}s;--drift:${-24+(index*13)%48}px"></i>`).join('')}
        <div class="jhp-plant left"></div><div class="jhp-plant right"></div>
        <div class="jhp-coral"><i></i><i></i><i></i><i></i></div>
        <div class="jhp-castle"><span></span><span></span><span></span></div><div class="jhp-shrine"></div>
        <div class="jhp-fish-wrap" id="jhp-fish-wrap">${fishSvg(false)}</div>
        <div class="jhp-caption" id="jhp-caption">Tu chicharro está explorando la pecera.</div>
      </div>
      <section class="jhp-progress-panel">
        <div class="jhp-progress-head"><b>EVOLUCIÓN DE LA MASCOTA</b><span id="jhp-xp-label">0 XP · 100 PARA SUBIR</span></div>
        <div class="jhp-xp-track"><div class="jhp-xp-fill" id="jhp-xp-fill"></div></div>
        <div class="jhp-needs">
          <div class="jhp-need food"><div class="jhp-need-head"><span>ALIMENTO</span><b id="jhp-food-label">100%</b></div><div class="jhp-need-track"><i id="jhp-food-fill"></i></div></div>
          <div class="jhp-need clean"><div class="jhp-need-head"><span>LIMPIEZA</span><b id="jhp-clean-label">100%</b></div><div class="jhp-need-track"><i id="jhp-clean-fill"></i></div></div>
          <div class="jhp-need mood"><div class="jhp-need-head"><span>ÁNIMO</span><b id="jhp-mood-label">100%</b></div><div class="jhp-need-track"><i id="jhp-mood-fill"></i></div></div>
        </div>
      </section>
      <div class="jhp-actions">
        ${Object.entries(actionRules).map(([key,rule])=>`<button class="jhp-action" type="button" data-jhp-action="${key}"><span class="jhp-action-icon">${rule.icon}</span><b>${rule.label}</b><small data-jhp-countdown="${key}">DISPONIBLE</small></button>`).join('')}
      </div>
      <section class="jhp-paid">
        <div class="jhp-paid-head"><div class="jhp-paid-title"><b>ALIMENTACIÓN CON REGALOS</b><span>La comida gratuita sube lentamente. Los regalos con JEMMOS aceleran el XP.</span></div><div class="jhp-wallet-balance" id="jhp-wallet-balance">SALDO · —</div></div>
        <div class="jhp-gifts">${gifts.map(gift=>`<button class="jhp-gift" type="button" data-jhp-gift="${gift.key}"><span>${gift.icon}</span><b>${gift.name}</b><small>${number(gift.price)} JEMMOS</small><em>+${gift.xp} XP</em></button>`).join('')}</div>
        <p class="jhp-paid-note">Cada compra pide confirmación, bloquea el doble toque y se registra con un identificador único. Economía todavía en modo de pruebas.</p>
      </section>
      <div class="jhp-sync" id="jhp-sync"><strong>GUARDADO:</strong> <span id="jhp-sync-text">${safeText(syncLabel)}</span></div>
    </div>
    <div class="jhp-confirm-backdrop" id="jhp-confirm-backdrop" hidden>
      <div class="jhp-confirm"><h3 id="jhp-confirm-title">Confirmar alimento</h3><p id="jhp-confirm-copy"></p><div class="jhp-confirm-summary"><div><small>COSTE</small><b id="jhp-confirm-cost">0 JEMMOS</b></div><div><small>PROGRESO</small><b id="jhp-confirm-xp">+0 XP</b></div></div><div class="jhp-confirm-actions"><button type="button" id="jhp-confirm-cancel">CANCELAR</button><button type="button" class="primary" id="jhp-confirm-pay">CONFIRMAR Y ALIMENTAR</button></div></div>
    </div>
    <div class="jhp-toast" id="jhp-toast" role="status"></div>`;
    document.body.append(overlay);
    bindUi();
  }

  const el=id=>document.getElementById(id);
  function bindUi(){
    launch?.addEventListener('click',open);
    el('jhp-close')?.addEventListener('click',close);
    el('jhp-confirm-cancel')?.addEventListener('click',closeConfirm);
    el('jhp-confirm-backdrop')?.addEventListener('click',event=>{if(event.target===event.currentTarget)closeConfirm()});
    el('jhp-confirm-pay')?.addEventListener('click',confirmPaidFeed);
    document.querySelectorAll('[data-jhp-action]').forEach(button=>button.addEventListener('click',()=>doFreeAction(button.dataset.jhpAction)));
    document.querySelectorAll('[data-jhp-gift]').forEach(button=>button.addEventListener('click',()=>openConfirm(button.dataset.jhpGift)));
    const aquarium=el('jhp-aquarium'),fish=el('jhp-fish-wrap');
    aquarium?.addEventListener('pointerdown',event=>{
      if(event.target.closest('#jhp-fish-wrap'))return;
      dragging=true;aquarium.setPointerCapture?.(event.pointerId);moveFishToEvent(event,true);
    });
    aquarium?.addEventListener('pointermove',event=>{if(dragging)moveFishToEvent(event,true)});
    aquarium?.addEventListener('pointerup',event=>{dragging=false;aquarium.releasePointerCapture?.(event.pointerId);scheduleAutoMove(2200)});
    aquarium?.addEventListener('pointercancel',()=>{dragging=false;scheduleAutoMove(2200)});
    fish?.addEventListener('pointerdown',event=>{event.stopPropagation();reactFish();state.mood=clamp(state.mood+.4);renderNeeds();showToast('El chicharro te ha reconocido.');scheduleAutoMove(1600)});
    window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!overlay?.hidden){if(!el('jhp-confirm-backdrop')?.hidden)closeConfirm();else close()}});
    window.addEventListener('jemmo-wallet-change',renderWallet);
  }

  function open(){
    createUi();
    bodyOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    overlay.hidden=false;
    render();
    scheduleAutoMove(400);
    clearInterval(countdownTimer);countdownTimer=setInterval(renderCountdowns,1000);
    el('jhp-close')?.focus({preventScroll:true});
  }
  function close(){
    if(!overlay)return;
    closeConfirm();overlay.hidden=true;document.body.style.overflow=bodyOverflow;clearTimeout(autoTimer);clearInterval(countdownTimer);
  }

  function showToast(message){
    const node=el('jhp-toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2600);
  }
  function reactFish(){const fish=el('jhp-fish-wrap');if(!fish)return;fish.classList.remove('jhp-react');void fish.offsetWidth;fish.classList.add('jhp-react');setTimeout(()=>fish.classList.remove('jhp-react'),700)}
  function setCaption(text){const caption=el('jhp-caption');if(caption)caption.textContent=text}

  function moveFish(percentX,percentY,fast=false){
    const aquarium=el('jhp-aquarium'),fish=el('jhp-fish-wrap');if(!aquarium||!fish)return;
    const x=clamp(percentX,15,84),y=clamp(percentY,21,76);
    const direction=x>=lastPointer.x?1:-1;
    const tilt=clamp((y-lastPointer.y)*.18,-7,7);
    lastPointer={x,y};
    aquarium.style.setProperty('--fish-x',`${x}%`);aquarium.style.setProperty('--fish-y',`${y}%`);aquarium.style.setProperty('--fish-dir',direction);aquarium.style.setProperty('--fish-tilt',`${tilt}deg`);
    fish.classList.toggle('jhp-fast',fast);
    if(fast)setTimeout(()=>fish.classList.remove('jhp-fast'),900);
  }
  function moveFishToEvent(event,fast=false){
    const aquarium=el('jhp-aquarium');if(!aquarium)return;const rect=aquarium.getBoundingClientRect();moveFish((event.clientX-rect.left)/rect.width*100,(event.clientY-rect.top)/rect.height*100,fast);setCaption('Tu chicharro te sigue por la pecera.');
  }
  function scheduleAutoMove(delay=3200){
    clearTimeout(autoTimer);
    if(overlay?.hidden||dragging||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    autoTimer=setTimeout(()=>{
      const x=17+Math.random()*65,y=24+Math.random()*46;moveFish(x,y,false);setCaption(['Tu chicharro está explorando la pecera.','Nada tranquilo y vigila su Casa.','Busca destellos entre las plantas.','La mascota evoluciona con cada cuidado.'][Math.floor(Math.random()*4)]);scheduleAutoMove(3900+Math.random()*2600);
    },delay);
  }

  function remaining(action){return Math.max(0,(Number(state.lastActions[action])||0)+actionRules[action].cooldown-now())}
  function duration(ms){
    if(ms<=0)return'DISPONIBLE';
    const hours=Math.floor(ms/HOUR),minutes=Math.floor((ms%HOUR)/60000),seconds=Math.floor((ms%60000)/1000);
    if(hours>0)return`${hours}H ${String(minutes).padStart(2,'0')}M`;
    if(minutes>0)return`${minutes}M ${String(seconds).padStart(2,'0')}S`;
    return`${seconds}S`;
  }
  function renderCountdowns(){
    document.querySelectorAll('[data-jhp-countdown]').forEach(node=>{
      const action=node.dataset.jhpCountdown,ms=remaining(action),button=node.closest('.jhp-action');node.textContent=duration(ms);button.disabled=ms>0;button.classList.toggle('ready',ms<=0);
    });
  }

  function doFreeAction(action){
    const rule=actionRules[action];if(!rule)return;
    if(remaining(action)>0){showToast(`${rule.label}: espera ${duration(remaining(action))}.`);return}
    const bucket=Math.floor(now()/rule.cooldown),actionId=`${action}_${uid()}_${bucket}`;
    state.lastActions[action]=now();state.xp+=rule.xp;state.food=clamp(state.food+rule.food);state.clean=clamp(state.clean+rule.clean);state.mood=clamp(state.mood+rule.mood);state.lastDecayAt=now();
    setCaption(action==='feed'?'El chicharro ha recibido su comida gratuita.':action==='clean'?'El agua vuelve a estar limpia y brillante.':'Tu chicharro está jugando contigo.');
    reactFish();render();queueSave({id:actionId,type:action,xp:rule.xp,free:true,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION});showToast(`${rule.label}: +${rule.xp} XP. Progreso lento y gratuito.`);
  }

  function walletState(){
    try{return window.JemmoWallet?.get?.()||null}catch{return null}
  }
  function renderWallet(){const wallet=walletState(),node=el('jhp-wallet-balance');if(node)node.textContent=`SALDO · ${wallet?number(wallet.jemmos):'—'} JEMMOS`}
  function openConfirm(key){
    const gift=gifts.find(item=>item.key===key);if(!gift)return;pendingGift=gift;
    el('jhp-confirm-title').textContent=gift.name;el('jhp-confirm-copy').textContent=`Este regalo alimentará a la mascota de ${state.houseName}, aumentará el XP más rápido y descontará JEMMOS del monedero tras confirmar.`;el('jhp-confirm-cost').textContent=`${number(gift.price)} JEMMOS`;el('jhp-confirm-xp').textContent=`+${gift.xp} XP`;el('jhp-confirm-pay').disabled=false;el('jhp-confirm-pay').textContent='CONFIRMAR Y ALIMENTAR';el('jhp-confirm-backdrop').hidden=false;
  }
  function closeConfirm(){pendingGift=null;paymentLock=false;const node=el('jhp-confirm-backdrop');if(node)node.hidden=true}
  async function confirmPaidFeed(){
    if(!pendingGift||paymentLock)return;
    const gift=pendingGift;paymentLock=true;const button=el('jhp-confirm-pay');button.disabled=true;button.textContent='REGISTRANDO…';
    const operationId=`pet-feed:${house.id}:${uid()}:${gift.key}:${Math.floor(now()/2000)}`;
    const spent=window.JemmoWallet?.spendCoins?.(gift.price,{title:'Alimento para mascota de Casa',giftName:gift.name,detail:`${gift.name} · ${state.houseName} · +${gift.xp} XP`,context:'Mascota / Pecera de Casa',source:'house-pet-feed',idempotencyKey:operationId});
    if(!spent?.ok){
      closeConfirm();
      if(spent?.duplicate)showToast('Doble toque bloqueado: este alimento ya se registró.');
      else{showToast(`Saldo insuficiente para ${gift.name}.`);window.JemmoWallet?.open?.('recharge')}
      return;
    }
    state.xp+=gift.xp;state.food=clamp(state.food+gift.food);state.mood=clamp(state.mood+gift.mood);state.clean=clamp(state.clean+2);state.paidFeedCount+=1;state.paidFeedJemmos+=gift.price;state.lastDecayAt=now();
    const actionRecord={id:operationId.replace(/[^a-zA-Z0-9_-]/g,'_'),type:'paid_feed',giftKey:gift.key,giftName:gift.name,jemmos:gift.price,xp:gift.xp,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION};
    closeConfirm();reactFish();setCaption(`${gift.name}: la mascota ha ganado ${gift.xp} XP.`);render();await saveState(actionRecord);showToast(`${gift.name} enviado. +${gift.xp} XP y ${number(gift.price)} JEMMOS descontados.`);
  }

  async function addProgress(amount,options={}){
    const xp=Math.max(0,Number(amount)||0);if(!xp)return{ok:false,reason:'invalid_xp'};
    const key=String(options.idempotencyKey||options.key||'').slice(0,160);
    if(key&&state.externalKeys.includes(key))return{ok:false,duplicate:true,state:normalizeState(state)};
    if(key)state.externalKeys=[...state.externalKeys,key].slice(-200);
    state.xp+=xp;state.mood=clamp(state.mood+(Number(options.mood)||0));state.food=clamp(state.food+(Number(options.food)||0));state.clean=clamp(state.clean+(Number(options.clean)||0));state.lastDecayAt=now();
    render();await saveState({id:(key||makeId('external')).replace(/[^a-zA-Z0-9_-]/g,'_'),type:String(options.type||'external_progress'),xp,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION});return{ok:true,state:normalizeState(state)};
  }

  function renderNeeds(){
    const map=[['food',state.food],['clean',state.clean],['mood',state.mood]];
    map.forEach(([key,value])=>{const rounded=Math.round(clamp(value));const label=el(`jhp-${key}-label`),fill=el(`jhp-${key}-fill`);if(label)label.textContent=`${rounded}%`;if(fill)fill.style.width=`${rounded}%`});
  }
  function renderSync(){const box=el('jhp-sync'),text=el('jhp-sync-text');if(text)text.textContent=syncLabel;if(box)box.className=`jhp-sync ${syncTone||''}`.trim()}
  function render(){
    if(!overlay)return;
    decay(state);
    const info=levelInfo();
    const set=(id,value)=>{const node=el(id);if(node)node.textContent=value};
    set('jhp-house-name',state.houseName);set('jhp-house-card-name',state.houseName);set('jhp-house-level',number(state.houseLevel));set('jhp-pet-level',`NIVEL ${info.level}`);set('jhp-level-name',info.name);set('jhp-xp-label',info.next?`${number(state.xp)} XP · ${number(info.remaining)} PARA SUBIR`:`${number(state.xp)} XP · NIVEL MÁXIMO`);
    const fill=el('jhp-xp-fill');if(fill)fill.style.width=`${info.progress}%`;const aquarium=el('jhp-aquarium');if(aquarium)aquarium.dataset.level=String(info.level);
    renderNeeds();renderCountdowns();renderWallet();renderSync();
  }

  function install(){
    createUi();
    if(isHouseContext())launch.hidden=false;
    load();
    const observer=new MutationObserver(()=>{if(isHouseContext()&&launch)launch.hidden=false});observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true});
  }

  window.JemmoHousePet={version:VERSION,open,close,getState:()=>normalizeState(state),addProgress,refresh:load};
  window.addEventListener('jemmo-house-task-completed',event=>addProgress(Number(event.detail?.xp)||10,{type:'house_task',idempotencyKey:event.detail?.id||event.detail?.taskId||makeId('task'),mood:3}));
  window.addEventListener('jemmo-house-gift-received',event=>addProgress(Number(event.detail?.petXp)||0,{type:'gift_received',idempotencyKey:event.detail?.id||event.detail?.giftId||makeId('gift'),mood:2}));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
