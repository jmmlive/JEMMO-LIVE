/* JEMMO LIVE V1 · MASCOTA VIVA Y PECERA INMERSIVA · PRUEBA 63 */
(()=>{
  'use strict';
  if(window.__JEMMO_HOUSE_PET_63__)return;
  window.__JEMMO_HOUSE_PET_63__=true;

  const VERSION='63.0.0';
  const SCHEMA_VERSION=2;
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
    {level:1,min:0,next:120,name:'Alevín neón'},
    {level:2,min:120,next:320,name:'Explorador violeta'},
    {level:3,min:320,next:650,name:'Guardián de coral'},
    {level:4,min:650,next:1100,name:'Chicharro dorado'},
    {level:5,min:1100,next:null,name:'Leyenda JEMMO'}
  ];
  const gifts=[
    {key:'neon',icon:'spark',name:'Bocado neón',price:500,xp:20,food:22,mood:7},
    {key:'coral',icon:'gem',name:'Banquete coral',price:2000,xp:70,food:45,mood:18},
    {key:'gold',icon:'crown',name:'Tesoro dorado',price:5000,xp:180,food:74,mood:34}
  ];
  const actionRules={
    feed:{label:'ALIMENTAR',icon:'feed',cooldown:6*HOUR,xp:4,food:24,clean:0,mood:5},
    clean:{label:'LIMPIAR',icon:'clean',cooldown:12*HOUR,xp:6,food:0,clean:62,mood:6},
    play:{label:'JUGAR',icon:'play',cooldown:2*HOUR,xp:5,food:-3,clean:-1,mood:25}
  };

  const defaultState=()=>({
    schemaVersion:SCHEMA_VERSION,
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
    migratedFrom:'',
    migratedAt:0,
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
  let migrationPending=false;
  let svgCounter=0;
  let lastPointer={x:50,y:46};
  let resizeObserver=null;

  function normalizeState(raw){
    raw=raw&&typeof raw==='object'?raw:{};
    const sourceVersion=String(raw.version||'');
    const legacy=Number(raw.schemaVersion||0)<SCHEMA_VERSION||/test/i.test(sourceVersion)||/^42\./.test(sourceVersion);
    const actions=raw.lastActions&&typeof raw.lastActions==='object'?raw.lastActions:{};
    if(legacy&&Object.keys(raw).length){
      migrationPending=true;
      return{
        ...defaultState(),
        houseName:String(raw.houseName||house.name).slice(0,80),
        houseLevel:Math.max(1,Number(raw.houseLevel||raw.nivelCasa||raw.house_level)||1),
        migratedFrom:sourceVersion||'legacy',
        migratedAt:now(),
        updatedAt:Number(raw.updatedAt)||0
      };
    }
    return{
      ...defaultState(),
      ...raw,
      schemaVersion:SCHEMA_VERSION,
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
      migratedFrom:String(raw.migratedFrom||''),
      migratedAt:Number(raw.migratedAt)||0,
      updatedAt:Number(raw.updatedAt)||0,
      updatedBy:String(raw.updatedBy||uid())
    };
  }

  function decay(target){
    const current=now();
    const elapsed=Math.max(0,current-(Number(target.lastDecayAt)||current));
    const hours=elapsed/HOUR;
    if(hours<.25)return target;
    target.food=clamp(target.food-hours*.22);
    target.clean=clamp(target.clean-hours*.13);
    target.mood=clamp(target.mood-hours*.1-(target.food<25?hours*.16:0));
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

  function petMood(){
    if(state.food<25)return{key:'hungry',label:'TIENE HAMBRE',copy:'Aliméntalo para recuperar su energía.'};
    if(state.clean<25)return{key:'dirty',label:'AGUA TURBIA',copy:'Limpia la pecera para devolverle el brillo.'};
    if(state.mood<25)return{key:'sad',label:'NECESITA JUGAR',copy:'Juega con él para animarlo.'};
    if(state.food>80&&state.clean>80&&state.mood>80)return{key:'happy',label:'RADIANTE',copy:'Está feliz y cuidando la Casa.'};
    return{key:'calm',label:'TRANQUILO',copy:'Nada, explora y vigila su Casa.'};
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
    ]).then(([appMod,fs])=>{const app=appMod.getApps()[0]||appMod.initializeApp(firebaseConfig);return{fs,db:fs.getFirestore(app)}});
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
    if(h){state.houseLevel=Math.max(1,Number(h.level||h.nivel||h.houseLevel||h.nivelCasa)||state.houseLevel||1);state.houseName=String(h.name||h.nombre||h.houseName||state.houseName||house.name).slice(0,80)}
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
    decay(state);render();
    try{
      remote=await fireRead();
      if(remote){const normalized=normalizeState(remote);if(normalized.updatedAt>=state.updatedAt)state=normalized}
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
    if(migrationPending){
      migrationPending=false;
      await saveState({id:`migration_${house.id}_${SCHEMA_VERSION}`,type:'legacy_test_reset',houseId:house.id,userId:uid(),createdAt:now(),version:VERSION});
      showToast('Mascota renovada: progreso de pruebas reiniciado para comenzar correctamente.');
    }
  }

  async function persistLocal(){
    const clean=normalizeState(state);state=clean;
    try{await idbWrite(clean)}catch(error){console.warn('JEMMO mascota IndexedDB guardado',error)}
  }
  function queueSave(actionRecord=null){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveState(actionRecord),180)}
  async function saveState(actionRecord=null){
    state.updatedAt=now();state.updatedBy=uid();
    await persistLocal();
    syncLabel='Guardada en el dispositivo. Sincronizando…';syncTone='warn';renderSync();
    try{await fireWrite(normalizeState(state),actionRecord);syncLabel='Sincronizada con la Casa en Firebase.';syncTone=''}
    catch(error){console.warn('JEMMO mascota Firebase guardado',error);syncLabel='Guardada localmente. Firebase no confirmó el cambio todavía.';syncTone='warn'}
    renderSync();
  }

  function applyDailyVisit(){
    const bucket=Math.floor(now()/DAY);
    const lastBucket=Math.floor((Number(state.lastActions.visit)||0)/DAY);
    if(lastBucket===bucket)return;
    state.lastActions.visit=now();state.xp+=2;state.mood=clamp(state.mood+3);
    queueSave({id:`visit_${uid()}_${bucket}`,type:'visit',xp:2,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION});
  }

  function mascotSvg(compact=false){
    const p=`jhp${++svgCounter}`;
    if(compact)return `<svg aria-hidden="true" class="jhp-fish jhp-fish-compact" viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${p}MiniBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ed84ff"/><stop offset=".45" stop-color="#8123ef"/><stop offset="1" stop-color="#22003c"/></linearGradient><linearGradient id="${p}MiniGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a1"/><stop offset=".5" stop-color="#ffc33d"/><stop offset="1" stop-color="#a74f0a"/></linearGradient></defs><path d="M27 45 5 23c6 18 8 26 0 44l23-17" fill="url(#${p}MiniBody)" stroke="url(#${p}MiniGold)" stroke-width="4" stroke-linejoin="round"/><path d="M25 43C37 15 87 12 108 34c9 10 7 21-4 31-21 19-61 15-78-7-5-6-5-10-1-15Z" fill="url(#${p}MiniBody)" stroke="#d777ff" stroke-width="4"/><path d="m42 28 9-18 8 18" fill="url(#${p}MiniGold)" stroke="#ffe987" stroke-width="3"/><circle cx="86" cy="33" r="13" fill="#27dfff" stroke="url(#${p}MiniGold)" stroke-width="4"/><circle cx="82" cy="29" r="4" fill="#fff"/><path d="M93 49c10-6 18-5 24 1-4 10-13 17-25 19" fill="#d976db" stroke="#ffd6ff" stroke-width="3"/><text x="57" y="63" font-family="Arial Black,Arial,sans-serif" font-size="27" font-weight="900" fill="url(#${p}MiniGold)">J</text></svg>`;
    const label='aria-label="Chicharro oficial JEMMO LIVE" role="img"';
    return `<svg ${label} class="jhp-fish" viewBox="0 0 760 430" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${p}Body" x1=".08" y1=".06" x2=".92" y2=".9"><stop offset="0" stop-color="#ef8cff"/><stop offset=".2" stop-color="#b93cff"/><stop offset=".48" stop-color="#7118dc"/><stop offset=".78" stop-color="#2d075e"/><stop offset="1" stop-color="#110126"/></linearGradient>
        <radialGradient id="${p}Shine" cx="35%" cy="22%" r="68%"><stop offset="0" stop-color="#ffffff" stop-opacity=".68"/><stop offset=".18" stop-color="#ffb7ff" stop-opacity=".3"/><stop offset=".52" stop-color="#bb59ff" stop-opacity=".08"/><stop offset="1" stop-color="#18002f" stop-opacity="0"/></radialGradient>
        <linearGradient id="${p}Gold" x1=".1" y1=".05" x2=".9" y2=".95"><stop offset="0" stop-color="#fffbd0"/><stop offset=".2" stop-color="#ffe979"/><stop offset=".48" stop-color="#ffbd36"/><stop offset=".76" stop-color="#d97813"/><stop offset="1" stop-color="#733006"/></linearGradient>
        <linearGradient id="${p}Fin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8de9"/><stop offset=".5" stop-color="#8e29ff"/><stop offset="1" stop-color="#35076f"/></linearGradient>
        <radialGradient id="${p}Eye" cx="38%" cy="34%" r="65%"><stop offset="0" stop-color="#ffffff"/><stop offset=".24" stop-color="#bffcff"/><stop offset=".5" stop-color="#28dfff"/><stop offset=".78" stop-color="#1a72ed"/><stop offset="1" stop-color="#041b57"/></radialGradient>
        <linearGradient id="${p}Jaw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd7fa"/><stop offset=".42" stop-color="#e987e9"/><stop offset="1" stop-color="#8a2a98"/></linearGradient>
        <filter id="${p}Shadow" x="-35%" y="-45%" width="190%" height="210%"><feDropShadow dx="0" dy="16" stdDeviation="12" flood-color="#06000e" flood-opacity=".72"/><feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#aa31ff" flood-opacity=".55"/></filter>
        <filter id="${p}Glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g class="jhp-fish-facing" filter="url(#${p}Shadow)">
        <g class="jhp-tail">
          <path d="M153 191C95 126 46 112 18 92c14 61 37 100 76 126-39 28-63 72-78 132 41-24 91-35 146-25l34-67z" fill="url(#${p}Body)" stroke="url(#${p}Gold)" stroke-width="10" stroke-linejoin="round"/>
          <path d="M130 180c-35-31-68-49-96-61M129 258c-37 22-71 42-101 68" fill="none" stroke="#ff7bd8" stroke-width="9" stroke-linecap="round" opacity=".75"/>
        </g>
        <path d="M150 191C214 76 430 52 594 130c68 33 112 83 104 127-7 39-45 72-102 102-138 72-339 54-438-44-43-43-48-86-8-124z" fill="url(#${p}Body)" stroke="#7d25e7" stroke-width="9"/>
        <path d="M169 183c76-87 266-105 410-44-133-18-267 4-382 66-24 13-41 7-28-22z" fill="url(#${p}Shine)"/>
        <path class="jhp-dorsal" d="M225 119c24-54 57-82 96-96l15 88c-31-1-71 2-111 8z" fill="url(#${p}Gold)" stroke="#ffe886" stroke-width="7" stroke-linejoin="round"/>
        <path class="jhp-dorsal jhp-dorsal-2" d="M174 154c9-35 30-58 62-73l7 67z" fill="url(#${p}Gold)" stroke="#ffd568" stroke-width="6"/>
        <path class="jhp-fin jhp-fin-main" d="M350 266c58 19 102 62 95 111-50-13-96-43-127-94z" fill="url(#${p}Fin)" stroke="url(#${p}Gold)" stroke-width="8"/>
        <path class="jhp-fin jhp-fin-back" d="M484 309c43 13 73 40 75 75-40-9-70-31-91-62z" fill="url(#${p}Fin)" stroke="url(#${p}Gold)" stroke-width="7"/>
        <path d="M272 147c24 32 34 83 23 137" fill="none" stroke="url(#${p}Gold)" stroke-width="15" stroke-linecap="round"/>
        <path d="M290 147c17 30 23 64 18 93" fill="none" stroke="#fff1a7" stroke-width="4" stroke-linecap="round" opacity=".82"/>
        <path d="M603 184c42-4 81 12 112 47-39-6-75 6-106 38-16-26-19-57-6-85z" fill="#100019" stroke="#f3a9ff" stroke-width="6"/>
        <path d="M615 202c28 1 53 10 75 29-25-1-48 7-69 23" fill="none" stroke="#ff7bcf" stroke-width="5" stroke-linecap="round" opacity=".72"/>
        <path class="jhp-lower-jaw" d="M610 258c37-24 75-29 111-14-9 52-57 91-127 108-15-25-8-66 16-94z" fill="url(#${p}Jaw)" stroke="#ffd8ff" stroke-width="8"/>
        <path d="M633 262c22-10 44-11 64-4-15 13-34 21-57 25z" fill="#ff6da7" opacity=".88"/>
        <ellipse cx="559" cy="167" rx="66" ry="70" fill="#2a0757" stroke="url(#${p}Gold)" stroke-width="8"/>
        <circle class="jhp-eye" cx="559" cy="166" r="54" fill="url(#${p}Eye)" filter="url(#${p}Glow)"/>
        <circle cx="544" cy="147" r="15" fill="#fff" opacity=".96"/>
        <circle cx="574" cy="180" r="8" fill="#a9f8ff" opacity=".72"/>
        <path d="M490 125c38-24 82-29 120-13" fill="none" stroke="#ffb2ff" stroke-width="9" stroke-linecap="round" opacity=".48"/>
        <path class="jhp-side-fin" d="M345 207c57 1 94 23 107 64-45 11-89 2-124-29z" fill="url(#${p}Fin)" stroke="#d779ff" stroke-width="7"/>
        <path d="M356 221c27 4 50 14 70 29M350 235c24 5 43 14 58 26" fill="none" stroke="#ffb0f2" stroke-width="4" stroke-linecap="round" opacity=".55"/>
        <path d="M461 280c42 21 82 29 120 23" fill="none" stroke="#ff77d2" stroke-width="6" stroke-linecap="round" opacity=".42"/>
        <g class="jhp-mark"><text x="383" y="319" font-family="Arial Black,Arial,sans-serif" font-size="142" font-weight="900" fill="url(#${p}Gold)" stroke="#713108" stroke-width="6" paint-order="stroke">J</text></g>
        <path d="M210 315c78 51 239 65 363 10" fill="none" stroke="#ff83dc" stroke-width="5" stroke-linecap="round" opacity=".3"/>
      </g>
    </svg>`;
  }

  function iconSvg(type){
    const common='viewBox="0 0 48 48" aria-hidden="true"';
    if(type==='feed')return `<svg ${common}><path d="M13 20c6-8 16-10 24-5-1 10-8 18-19 19-5-4-7-9-5-14Z"/><path d="M31 13c1-4 4-6 8-7-1 4-3 7-7 9"/></svg>`;
    if(type==='clean')return `<svg ${common}><path d="M24 6c8 11 13 17 13 24a13 13 0 1 1-26 0c0-7 5-13 13-24Z"/><path d="M18 31c2 3 5 5 9 5"/></svg>`;
    if(type==='play')return `<svg ${common}><path d="m24 5 5 12 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1 5-12Z"/></svg>`;
    if(type==='spark')return `<svg ${common}><path d="M24 4c2 10 6 16 16 20-10 4-14 10-16 20-2-10-6-16-16-20 10-4 14-10 16-20Z"/></svg>`;
    if(type==='gem')return `<svg ${common}><path d="m24 5 15 12-15 26L9 17 24 5Z"/><path d="m9 17 15 5 15-5M24 5v38"/></svg>`;
    return `<svg ${common}><path d="m9 15 7 7 8-15 8 15 7-7-3 23H12L9 15Z"/><path d="M14 32h20"/></svg>`;
  }

  function createUi(){
    if(document.getElementById('jhp-overlay')){overlay=document.getElementById('jhp-overlay');launch=document.getElementById('jhp-launch');return}
    launch=document.createElement('button');
    launch.id='jhp-launch';launch.type='button';launch.hidden=!isHouseContext();launch.setAttribute('aria-label','Abrir mascota de la Casa');
    launch.innerHTML=`<span class="jhp-launch-fish">${mascotSvg(true)}</span><span>MASCOTA</span>`;
    const houseTop=document.getElementById('houseRoomInfo');
    if(document.body.classList.contains('jemmo-house-room')&&houseTop){launch.classList.add('jhp-launch-top');houseTop.append(launch)}else document.body.append(launch);

    overlay=document.createElement('section');
    overlay.id='jhp-overlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Mascota y pecera de la Casa');
    overlay.innerHTML=`<div class="jhp-shell" id="jhp-shell">
      <header class="jhp-header">
        <div class="jhp-brand-icon">${mascotSvg(true)}</div>
        <div class="jhp-heading"><span class="jhp-eyebrow">MASCOTA OFICIAL JEMMO LIVE</span><h2 class="jhp-title"><span id="jhp-house-name">${safeText(state.houseName)}</span></h2><p class="jhp-subtitle">Chicharro violeta · compañero vivo de la Casa</p></div>
        <button class="jhp-close" id="jhp-close" type="button" aria-label="Cerrar pecera">×</button>
      </header>
      <div class="jhp-aquarium" id="jhp-aquarium" data-level="1" data-mood="happy" aria-label="Pecera interactiva. Toca el agua para llamar al chicharro.">
        <div class="jhp-glass-shine"></div><div class="jhp-caustics"></div><div class="jhp-stars"></div>
        <div class="jhp-portal"><i></i><b>J</b></div>
        ${Array.from({length:18},(_,index)=>`<i class="jhp-bubble" style="--x:${4+(index*41)%92}%;--s:${5+(index*7)%16}px;--d:${8+(index%7)*1.25}s;--delay:-${(index*1.15).toFixed(2)}s;--drift:${-22+(index*11)%44}px"></i>`).join('')}
        <div class="jhp-reef jhp-reef-left"><i></i><i></i><i></i><i></i></div>
        <div class="jhp-reef jhp-reef-right"><i></i><i></i><i></i><i></i></div>
        <div class="jhp-floor"><span></span></div>
        <div class="jhp-hud"><span class="jhp-hud-chip"><small>NIVEL</small><b id="jhp-pet-level">1</b></span><span class="jhp-hud-chip wide"><small>ESTADO</small><b id="jhp-status">RADIANTE</b></span></div>
        <div class="jhp-fish-wrap" id="jhp-fish-wrap" data-dir="1">${mascotSvg(false)}</div>
        <div class="jhp-caption" id="jhp-caption">Nada, explora y vigila su Casa.</div>
      </div>
      <section class="jhp-progress-panel">
        <div class="jhp-progress-head"><div><span>EVOLUCIÓN</span><b id="jhp-level-name">Alevín neón</b></div><strong id="jhp-xp-label">0 XP · 120 PARA SUBIR</strong></div>
        <div class="jhp-xp-track"><div class="jhp-xp-fill" id="jhp-xp-fill"></div></div>
        <div class="jhp-needs">
          <div class="jhp-need food"><div class="jhp-need-head"><span>ALIMENTO</span><b id="jhp-food-label">100%</b></div><div class="jhp-need-track"><i id="jhp-food-fill"></i></div></div>
          <div class="jhp-need clean"><div class="jhp-need-head"><span>LIMPIEZA</span><b id="jhp-clean-label">100%</b></div><div class="jhp-need-track"><i id="jhp-clean-fill"></i></div></div>
          <div class="jhp-need mood"><div class="jhp-need-head"><span>ÁNIMO</span><b id="jhp-mood-label">100%</b></div><div class="jhp-need-track"><i id="jhp-mood-fill"></i></div></div>
        </div>
      </section>
      <div class="jhp-actions">
        ${Object.entries(actionRules).map(([key,rule])=>`<button class="jhp-action" type="button" data-jhp-action="${key}"><span class="jhp-action-icon">${iconSvg(rule.icon)}</span><b>${rule.label}</b><small data-jhp-countdown="${key}">DISPONIBLE</small></button>`).join('')}
      </div>
      <section class="jhp-paid">
        <div class="jhp-paid-head"><div class="jhp-paid-title"><span>IMPULSO DE EVOLUCIÓN</span><b>Alimentos especiales</b><p>Opcionales. Aumentan el XP y nunca sustituyen los cuidados gratuitos.</p></div><div class="jhp-wallet-balance" id="jhp-wallet-balance">SALDO · —</div></div>
        <div class="jhp-gifts">${gifts.map(gift=>`<button class="jhp-gift" type="button" data-jhp-gift="${gift.key}"><span class="jhp-gift-icon">${iconSvg(gift.icon)}</span><b>${gift.name}</b><small>${number(gift.price)} JEMMOS</small><em>+${gift.xp} XP</em></button>`).join('')}</div>
        <p class="jhp-paid-note">Toda compra solicita confirmación y bloquea cobros duplicados.</p>
      </section>
      <div class="jhp-sync" id="jhp-sync"><strong>GUARDADO:</strong> <span id="jhp-sync-text">${safeText(syncLabel)}</span></div>
    </div>
    <div class="jhp-confirm-backdrop" id="jhp-confirm-backdrop" hidden>
      <div class="jhp-confirm"><h3 id="jhp-confirm-title">Confirmar alimento</h3><p id="jhp-confirm-copy"></p><div class="jhp-confirm-summary"><div><small>COSTE</small><b id="jhp-confirm-cost">0 JEMMOS</b></div><div><small>EVOLUCIÓN</small><b id="jhp-confirm-xp">+0 XP</b></div></div><div class="jhp-confirm-actions"><button type="button" id="jhp-confirm-cancel">CANCELAR</button><button type="button" class="primary" id="jhp-confirm-pay">CONFIRMAR</button></div></div>
    </div>
    <div class="jhp-toast" id="jhp-toast" role="status" aria-live="polite"></div>`;
    document.body.append(overlay);

    launch.addEventListener('click',open);
    overlay.querySelector('#jhp-close').addEventListener('click',close);
    overlay.querySelector('#jhp-confirm-cancel').addEventListener('click',closeConfirm);
    overlay.querySelector('#jhp-confirm-pay').addEventListener('click',confirmPaidFeed);
    overlay.querySelector('#jhp-confirm-backdrop').addEventListener('click',event=>{if(event.target===event.currentTarget)closeConfirm()});
    overlay.addEventListener('click',event=>{const action=event.target.closest('[data-jhp-action]');if(action){doFreeAction(action.dataset.jhpAction);return}const gift=event.target.closest('[data-jhp-gift]');if(gift)openConfirm(gift.dataset.jhpGift)});
    const aquarium=overlay.querySelector('#jhp-aquarium');
    aquarium.addEventListener('pointerdown',event=>{dragging=true;aquarium.setPointerCapture?.(event.pointerId);moveFishToEvent(event,true)});
    aquarium.addEventListener('pointermove',event=>{if(dragging)moveFishToEvent(event,true)});
    aquarium.addEventListener('pointerup',event=>{dragging=false;aquarium.releasePointerCapture?.(event.pointerId);reactFish('touch');setCaption('Te ha visto. Sigue tu movimiento por la pecera.');scheduleAutoMove(2300)});
    aquarium.addEventListener('pointercancel',()=>{dragging=false;scheduleAutoMove(2300)});
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
    resizeObserver=new ResizeObserver(()=>moveFish(lastPointer.x,lastPointer.y,false));resizeObserver.observe(aquarium);
  }

  const el=id=>overlay?.querySelector(`#${id}`)||document.getElementById(id);
  function open(){
    createUi();bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';overlay.hidden=false;render();moveFish(50,46,false);scheduleAutoMove(900);clearInterval(countdownTimer);countdownTimer=setInterval(renderCountdowns,1000);el('jhp-close')?.focus({preventScroll:true});
  }
  function close(){if(!overlay)return;closeConfirm();overlay.hidden=true;document.body.style.overflow=bodyOverflow;clearTimeout(autoTimer);clearInterval(countdownTimer)}
  function showToast(message){const node=el('jhp-toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2700)}
  function setCaption(text){const caption=el('jhp-caption');if(caption)caption.textContent=text}

  function reactFish(type='touch'){
    const fish=el('jhp-fish-wrap'),aquarium=el('jhp-aquarium');if(!fish||!aquarium)return;
    ['is-touch','is-feed','is-clean','is-play','is-gift'].forEach(name=>fish.classList.remove(name));
    const className=`is-${type}`;void fish.offsetWidth;fish.classList.add(className);aquarium.classList.add('is-celebrating');
    setTimeout(()=>{fish.classList.remove(className);aquarium.classList.remove('is-celebrating')},type==='play'?1150:850);
  }

  function moveFish(percentX,percentY,fast=false){
    const aquarium=el('jhp-aquarium'),fish=el('jhp-fish-wrap');if(!aquarium||!fish)return;
    const x=clamp(percentX,31,69),y=clamp(percentY,34,61);
    const rect=aquarium.getBoundingClientRect();
    const dx=(x-50)/100*rect.width;
    const dy=(y-46)/100*rect.height;
    const direction=x>=lastPointer.x?1:-1;
    const tilt=clamp((y-lastPointer.y)*.28,-7,7);
    lastPointer={x,y};
    fish.style.setProperty('--fish-move-x',`${dx.toFixed(1)}px`);fish.style.setProperty('--fish-move-y',`${dy.toFixed(1)}px`);fish.style.setProperty('--fish-tilt',`${tilt.toFixed(1)}deg`);fish.dataset.dir=String(direction);fish.classList.toggle('jhp-fast',fast);
    if(fast)setTimeout(()=>fish.classList.remove('jhp-fast'),850);
  }
  function moveFishToEvent(event,fast=false){const aquarium=el('jhp-aquarium');if(!aquarium)return;const rect=aquarium.getBoundingClientRect();moveFish((event.clientX-rect.left)/rect.width*100,(event.clientY-rect.top)/rect.height*100,fast)}
  function scheduleAutoMove(delay=3200){
    clearTimeout(autoTimer);
    if(overlay?.hidden||dragging||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    autoTimer=setTimeout(()=>{const x=33+Math.random()*34,y=36+Math.random()*22;moveFish(x,y,false);const mood=petMood();setCaption([mood.copy,'Observa la actividad de la Casa.','Sigue los destellos violetas.','Nada con calma entre los portales JEMMO.'][Math.floor(Math.random()*4)]);scheduleAutoMove(3600+Math.random()*2200)},delay);
  }

  function remaining(action){return Math.max(0,(Number(state.lastActions[action])||0)+actionRules[action].cooldown-now())}
  function duration(ms){if(ms<=0)return'DISPONIBLE';const hours=Math.floor(ms/HOUR),minutes=Math.floor((ms%HOUR)/60000);if(hours>0)return`EN ${hours} H ${String(minutes).padStart(2,'0')} MIN`;if(minutes>0)return`EN ${minutes} MIN`;return'EN MENOS DE 1 MIN'}
  function renderCountdowns(){
    document.querySelectorAll('[data-jhp-countdown]').forEach(node=>{const action=node.dataset.jhpCountdown,ms=remaining(action),button=node.closest('.jhp-action');node.textContent=duration(ms);button.disabled=ms>0;button.classList.toggle('ready',ms<=0);button.classList.toggle('locked',ms>0)});
  }

  function doFreeAction(action){
    const rule=actionRules[action];if(!rule)return;
    if(remaining(action)>0){showToast(`${rule.label}: ${duration(remaining(action)).toLowerCase()}.`);return}
    const bucket=Math.floor(now()/rule.cooldown),actionId=`${action}_${uid()}_${bucket}`;
    state.lastActions[action]=now();state.xp+=rule.xp;state.food=clamp(state.food+rule.food);state.clean=clamp(state.clean+rule.clean);state.mood=clamp(state.mood+rule.mood);state.lastDecayAt=now();
    const messages={feed:'Ha comido y recuperado energía.',clean:'El agua vuelve a estar limpia y luminosa.',play:'Está jugando contigo y celebra alrededor del portal.'};
    setCaption(messages[action]);reactFish(action);render();queueSave({id:actionId,type:action,xp:rule.xp,free:true,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION});showToast(`${rule.label}: +${rule.xp} XP.`);
  }

  function walletState(){try{return window.JemmoWallet?.get?.()||null}catch{return null}}
  function renderWallet(){const wallet=walletState(),node=el('jhp-wallet-balance');if(node)node.textContent=wallet?`${number(wallet.jemmos)} JEMMOS`:'SALDO NO DISPONIBLE'}
  function openConfirm(key){
    const gift=gifts.find(item=>item.key===key);if(!gift)return;pendingGift=gift;
    el('jhp-confirm-title').textContent=gift.name;el('jhp-confirm-copy').textContent=`Alimentará a la mascota de ${state.houseName}, aumentará su evolución y descontará JEMMOS solo después de confirmar.`;el('jhp-confirm-cost').textContent=`${number(gift.price)} JEMMOS`;el('jhp-confirm-xp').textContent=`+${gift.xp} XP`;el('jhp-confirm-pay').disabled=false;el('jhp-confirm-pay').textContent='CONFIRMAR Y ALIMENTAR';el('jhp-confirm-backdrop').hidden=false;
  }
  function closeConfirm(){pendingGift=null;paymentLock=false;const node=el('jhp-confirm-backdrop');if(node)node.hidden=true}
  async function confirmPaidFeed(){
    if(!pendingGift||paymentLock)return;
    const gift=pendingGift;paymentLock=true;const button=el('jhp-confirm-pay');button.disabled=true;button.textContent='REGISTRANDO…';
    const operationId=`pet-feed:${house.id}:${uid()}:${gift.key}:${Math.floor(now()/2000)}`;
    const spent=window.JemmoWallet?.spendJemmos?.(gift.price,{title:'Alimento para mascota de Casa',detail:`${gift.name} · ${state.houseName} · +${gift.xp} XP`,itemId:`house-pet-feed:${house.id}:${gift.key}`,category:'house-pet',context:'Mascota / Pecera de Casa',source:'house-pet-feed',idempotencyKey:operationId});
    if(!spent?.ok){closeConfirm();if(spent?.duplicate)showToast('Doble toque bloqueado: este alimento ya se registró.');else{showToast(`Saldo insuficiente para ${gift.name}.`);window.JemmoWallet?.open?.('recharge')}return}
    state.xp+=gift.xp;state.food=clamp(state.food+gift.food);state.mood=clamp(state.mood+gift.mood);state.clean=clamp(state.clean+2);state.paidFeedCount+=1;state.paidFeedJemmos+=gift.price;state.lastDecayAt=now();
    const actionRecord={id:operationId.replace(/[^a-zA-Z0-9_-]/g,'_'),type:'paid_feed',giftKey:gift.key,giftName:gift.name,jemmos:gift.price,xp:gift.xp,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION};
    closeConfirm();reactFish('gift');setCaption(`${gift.name}: +${gift.xp} XP de evolución.`);render();await saveState(actionRecord);showToast(`${gift.name} enviado. +${gift.xp} XP.`);
  }

  async function addProgress(amount,options={}){
    const xp=Math.max(0,Number(amount)||0);if(!xp)return{ok:false,reason:'invalid_xp'};
    const key=String(options.idempotencyKey||options.key||'').slice(0,160);if(key&&state.externalKeys.includes(key))return{ok:false,duplicate:true,state:normalizeState(state)};
    if(key)state.externalKeys=[...state.externalKeys,key].slice(-200);
    state.xp+=xp;state.mood=clamp(state.mood+(Number(options.mood)||0));state.food=clamp(state.food+(Number(options.food)||0));state.clean=clamp(state.clean+(Number(options.clean)||0));state.lastDecayAt=now();
    render();await saveState({id:(key||makeId('external')).replace(/[^a-zA-Z0-9_-]/g,'_'),type:String(options.type||'external_progress'),xp,houseId:house.id,userId:uid(),createdAt:now(),version:VERSION});return{ok:true,state:normalizeState(state)};
  }

  function renderNeeds(){[['food',state.food],['clean',state.clean],['mood',state.mood]].forEach(([key,value])=>{const rounded=Math.round(clamp(value));const label=el(`jhp-${key}-label`),fill=el(`jhp-${key}-fill`);if(label)label.textContent=`${rounded}%`;if(fill)fill.style.width=`${rounded}%`})}
  function renderSync(){const box=el('jhp-sync'),text=el('jhp-sync-text');if(text)text.textContent=syncLabel;if(box)box.className=`jhp-sync ${syncTone||''}`.trim()}
  function render(){
    if(!overlay)return;decay(state);const info=levelInfo(),mood=petMood();const set=(id,value)=>{const node=el(id);if(node)node.textContent=value};
    set('jhp-house-name',state.houseName);set('jhp-pet-level',String(info.level));set('jhp-level-name',info.name);set('jhp-status',mood.label);set('jhp-xp-label',info.next?`${number(state.xp)} XP · ${number(info.remaining)} PARA SUBIR`:`${number(state.xp)} XP · NIVEL MÁXIMO`);
    const fill=el('jhp-xp-fill');if(fill)fill.style.width=`${info.progress}%`;const aquarium=el('jhp-aquarium');if(aquarium){aquarium.dataset.level=String(info.level);aquarium.dataset.mood=mood.key}
    renderNeeds();renderCountdowns();renderWallet();renderSync();
  }

  function install(){
    createUi();if(isHouseContext())launch.hidden=false;load();
    const observer=new MutationObserver(()=>{if(isHouseContext()&&launch)launch.hidden=false;const houseTop=document.getElementById('houseRoomInfo');if(launch&&houseTop&&document.body.classList.contains('jemmo-house-room')&&!launch.classList.contains('jhp-launch-top')){launch.classList.add('jhp-launch-top');houseTop.append(launch)}});observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true});
  }

  window.JemmoHousePet={version:VERSION,open,close,getState:()=>normalizeState(state),addProgress,refresh:load};
  window.addEventListener('jemmo-house-task-completed',event=>addProgress(Number(event.detail?.xp)||10,{type:'house_task',idempotencyKey:event.detail?.id||event.detail?.taskId||makeId('task'),mood:3}));
  window.addEventListener('jemmo-house-gift-received',event=>addProgress(Number(event.detail?.petXp)||0,{type:'gift_received',idempotencyKey:event.detail?.id||event.detail?.giftId||makeId('gift'),mood:2}));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
