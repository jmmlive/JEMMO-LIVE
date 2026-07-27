(()=>{
  'use strict';
  if(window.__JEMMO_HOUSE_PET_39__)return;
  window.__JEMMO_HOUSE_PET_39__=true;

  const VERSION='39.0.0-test';
  const MAX_LEVEL=5;
  const LEVELS=[0,100,260,520,900,1400];
  const ACTIONS={
    feed:{label:'ALIMENTAR',icon:'◉',xp:12,cooldown:24*60*60*1000,boost:{hunger:36,mood:5}},
    clean:{label:'LIMPIAR',icon:'✦',xp:14,cooldown:24*60*60*1000,boost:{cleanliness:42,mood:4}},
    play:{label:'JUGAR',icon:'◆',xp:8,cooldown:4*60*60*1000,boost:{mood:24,hunger:-4}}
  };
  const state={houseId:'',houseName:'Casa JEMMO',houseLevel:1,pet:null,uid:'guest',firebase:null,unsub:[],open:false,cloud:false};
  const now=()=>Date.now();
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
  const safeJson=value=>{try{return JSON.parse(value)}catch{return null}};
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const normalizeId=value=>String(value||'').trim().replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
  const getStorage=(key)=>{try{return localStorage.getItem(key)||sessionStorage.getItem(key)||''}catch{return''}};
  const setStorage=(key,value)=>{try{localStorage.setItem(key,value);return true}catch{try{sessionStorage.setItem(key,value);return true}catch{return false}}};
  const defaultPet=()=>({
    schemaVersion:1,petType:'jemmo_chicharro',aquariumLevel:1,experience:0,mood:88,hunger:82,cleanliness:90,
    totalInteractions:0,activeDecoration:'starter',unlockedDecorations:['starter'],cooldowns:{},lastVisitAt:0,createdAtClient:now(),updatedAtClient:now()
  });
  const normalizePet=raw=>{
    const pet={...defaultPet(),...(raw&&typeof raw==='object'?raw:{})};
    pet.experience=Math.max(0,Number(pet.experience)||0);
    pet.aquariumLevel=Math.max(1,Math.min(MAX_LEVEL,Number(pet.aquariumLevel)||levelFromXp(pet.experience)));
    pet.mood=clamp(pet.mood);pet.hunger=clamp(pet.hunger);pet.cleanliness=clamp(pet.cleanliness);
    pet.totalInteractions=Math.max(0,Number(pet.totalInteractions)||0);
    pet.cooldowns=pet.cooldowns&&typeof pet.cooldowns==='object'?pet.cooldowns:{};
    pet.unlockedDecorations=Array.isArray(pet.unlockedDecorations)?pet.unlockedDecorations:['starter'];
    return pet;
  };
  function levelFromXp(xp){let level=1;for(let i=1;i<LEVELS.length;i++)if(xp>=LEVELS[i])level=i+1;return Math.min(MAX_LEVEL,level)}
  function levelProgress(pet){const level=pet.aquariumLevel;const start=LEVELS[level-1]||0;const end=LEVELS[level]||LEVELS[LEVELS.length-1];return level>=MAX_LEVEL?100:clamp(((pet.experience-start)/(end-start))*100)}
  function fishSvg(id='main'){
    const gid=`jhpFish${String(id).replace(/\W/g,'')}`;
    return `<svg viewBox="0 0 220 145" aria-hidden="true" focusable="false">
      <defs><linearGradient id="${gid}Body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f58aff"/><stop offset=".42" stop-color="#9b2cff"/><stop offset="1" stop-color="#4a0d88"/></linearGradient><linearGradient id="${gid}Fin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd85a"/><stop offset="1" stop-color="#e28c21"/></linearGradient><radialGradient id="${gid}Eye"><stop stop-color="#ecffff"/><stop offset=".45" stop-color="#40ddff"/><stop offset=".7" stop-color="#1464d4"/><stop offset="1" stop-color="#03040b"/></radialGradient></defs>
      <path d="M38 72C12 45 7 36 5 31c27 0 49 7 62 22C77 35 85 25 95 19c4 11 5 21 4 29 38-17 83-5 104 24-18 33-63 48-105 28 0 10-3 20-8 28-10-7-18-18-23-32-14 13-35 20-62 18 6-15 16-30 33-42z" fill="url(#${gid}Body)" stroke="#d977ff" stroke-width="4" stroke-linejoin="round"/>
      <path d="M46 69C25 56 15 48 6 33c25 2 42 11 53 25M46 76C25 87 15 96 6 112c24-1 43-8 54-24" fill="none" stroke="url(#${gid}Fin)" stroke-width="5" stroke-linecap="round"/>
      <path d="M94 47c-3-11-1-21 3-30 13 8 22 18 26 29M96 101c-1 10-5 19-11 26-10-8-17-19-20-31" fill="url(#${gid}Fin)" opacity=".95" stroke="#ffe78f" stroke-width="2"/>
      <ellipse cx="168" cy="62" rx="13" ry="14" fill="url(#${gid}Eye)" stroke="#d9fbff" stroke-width="3"/><circle cx="172" cy="58" r="3" fill="#fff"/>
      <path d="M189 84c-11 8-24 8-34 1" fill="none" stroke="#32104f" stroke-width="5" stroke-linecap="round"/>
      <path d="M123 55c-16 9-20 27-8 40" fill="none" stroke="#f4bfff" stroke-width="4" stroke-linecap="round" opacity=".75"/>
      <text x="118" y="88" text-anchor="middle" font-family="Georgia,serif" font-size="39" font-weight="900" font-style="italic" fill="#ffd75a" stroke="#7d4800" stroke-width="2">J</text>
      <path d="M148 107c8 12 19 17 31 13-6-9-15-16-27-21" fill="url(#${gid}Fin)" stroke="#ffe78f" stroke-width="2"/>
    </svg>`;
  }
  function detectHouseContext(){
    const p=new URLSearchParams(location.search);
    let id=normalizeId(p.get('house')||p.get('houseId')||p.get('casa'));
    let name=p.get('houseName')||p.get('casaNombre')||'';
    const explicit=p.get('houseRoom')==='1'||p.get('direct')==='1';
    const candidates=['jemmo_house_room_context','jemmo_current_house','jemmo_my_house','jemmo_house_context','jemmo_active_house'];
    for(const key of candidates){
      const raw=getStorage(key);const data=safeJson(raw);
      if(!id&&data)id=normalizeId(data.houseId||data.id||data.house);
      if(!name&&data)name=data.houseName||data.name||data.nombre||'';
      if(!id&&raw&&!data&&/^[\w-]{1,80}$/.test(raw))id=normalizeId(raw);
    }
    if(!id){
      try{
        for(let i=0;i<localStorage.length;i++){
          const key=localStorage.key(i)||'';if(!/house|casa/i.test(key))continue;
          const data=safeJson(localStorage.getItem(key));if(!data||typeof data!=='object')continue;
          const candidate=normalizeId(data.houseId||data.house||data.casaId||data.id);
          if(candidate&&(data.houseRoom||data.isHouseRoom||data.roomType==='house'||/casa/i.test(data.type||''))){id=candidate;name=name||data.houseName||data.name||data.nombre||'';break}
        }
      }catch{}
    }
    const bodyText=(document.querySelector('.jr-room-meta')?.textContent||document.title||'').toLowerCase();
    const domHouse=!!document.querySelector('[data-house-room],.jemmo-house-room,.jemmo-house-task,.house-room-task,[id*="houseTask" i],[class*="house-room" i]')||bodyText.includes('sala 24/7')||bodyText.includes('casa padre');
    const onHousePage=/casa-demo\.html$/i.test(location.pathname)||/\/casas?\//i.test(location.pathname);
    return {id:id||'padre',name:String(name||'').trim()||'Casa JEMMO',isHouseRoom:explicit||domHouse||onHousePage,onHousePage};
  }
  function userId(){return normalizeId(window.firebase?.auth?.().currentUser?.uid||getStorage('jemmo_active_uid')||getStorage('jemmo_uid')||'guest')||'guest'}

  const IDB={
    db:null,
    async open(){if(this.db)return this.db;return new Promise((resolve,reject)=>{const req=indexedDB.open('jemmo-house-pet-v1',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('pets'))req.result.createObjectStore('pets')};req.onsuccess=()=>{this.db=req.result;resolve(this.db)};req.onerror=()=>reject(req.error)})},
    async get(key){try{const db=await this.open();return await new Promise((resolve,reject)=>{const tx=db.transaction('pets','readonly');const r=tx.objectStore('pets').get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}catch{return safeJson(getStorage(`jemmo_house_pet_v1_${key}`))}},
    async set(key,value){try{const db=await this.open();await new Promise((resolve,reject)=>{const tx=db.transaction('pets','readwrite');tx.objectStore('pets').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});return true}catch{return setStorage(`jemmo_house_pet_v1_${key}`,JSON.stringify(value))}}
  };

  async function firebaseContext(){
    if(state.firebase!==null)return state.firebase;
    try{
      const imports=Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
      ]);
      const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('firebase-timeout')),1200));
      const [appMod,authMod,fs]=await Promise.race([imports,timeout]);
      const apps=appMod.getApps();if(!apps.length){state.firebase=false;return false}
      const app=apps[0];const auth=authMod.getAuth(app);const db=fs.getFirestore(app);
      state.uid=normalizeId(auth.currentUser?.uid||state.uid)||'guest';
      state.firebase={app,auth,db,fs};return state.firebase;
    }catch(error){console.info('JEMMO Mascota: Firebase no disponible, se usa respaldo local.',error?.message||error);state.firebase=false;return false}
  }
  async function loadLocal(){state.pet=normalizePet(await IDB.get(state.houseId)||defaultPet());degradePet();await IDB.set(state.houseId,state.pet)}
  function degradePet(){
    if(!state.pet)return;const elapsed=Math.max(0,now()-(Number(state.pet.updatedAtClient)||now()));const hours=elapsed/3600000;
    state.pet.hunger=clamp(state.pet.hunger-hours*.45);state.pet.cleanliness=clamp(state.pet.cleanliness-hours*.22);state.pet.mood=clamp(state.pet.mood-hours*.12);state.pet.updatedAtClient=now();
  }
  async function connectCloud(){
    const fb=await firebaseContext();if(!fb)return setSync('local','Respaldo activo en este móvil. Firebase se conectará automáticamente cuando la sesión esté disponible.');
    const {fs,db}=fb;const houseRef=fs.doc(db,'casas',state.houseId);const petRef=fs.doc(db,'casas',state.houseId,'mascota','actual');
    state.unsub.forEach(fn=>{try{fn()}catch{}});state.unsub=[];
    state.unsub.push(fs.onSnapshot(houseRef,snap=>{if(!snap.exists())return;const data=snap.data()||{};state.houseName=data.name||data.nombre||data.houseName||state.houseName;state.houseLevel=Math.max(1,Number(data.level||data.houseLevel||data.nivel||data.rankLevel)||1);renderText()},()=>{}));
    state.unsub.push(fs.onSnapshot(petRef,async snap=>{
      if(!snap.exists()){
        try{await fs.setDoc(petRef,{...state.pet,updatedAtServer:fs.serverTimestamp()},{merge:true});state.cloud=true;setSync('cloud','Sincronizada con la Casa en Firebase.')}catch(error){state.cloud=false;setSync('local','Guardada en este móvil; Firebase todavía no permitió crear la mascota.')}
        return;
      }
      state.pet=normalizePet({...state.pet,...snap.data()});degradePet();await IDB.set(state.houseId,state.pet);state.cloud=true;renderAll();setSync('cloud','Sincronizada con la Casa en Firebase.');
    },error=>{state.cloud=false;setSync('local',`Respaldo local activo. ${error?.code==='permission-denied'?'Las reglas de prueba no permiten sincronizar todavía.':'Firebase no está disponible ahora.'}`)}));
  }
  async function saveLocal(){state.pet.updatedAtClient=now();await IDB.set(state.houseId,state.pet);renderAll()}
  function actionRemaining(type){const last=Number(state.pet?.cooldowns?.[`${state.uid}:${type}`])||0;return Math.max(0,(ACTIONS[type]?.cooldown||0)-(now()-last))}
  function duration(ms){if(ms<=0)return'DISPONIBLE';const h=Math.floor(ms/3600000),m=Math.ceil((ms%3600000)/60000);return h?`${h}H ${m}M`:`${m} MIN`}
  function applyActionToPet(type,base=state.pet){
    const action=ACTIONS[type];const pet=normalizePet({...base,cooldowns:{...(base.cooldowns||{})}});const oldLevel=pet.aquariumLevel;
    pet.experience+=action.xp;pet.totalInteractions+=1;pet.cooldowns[`${state.uid}:${type}`]=now();
    Object.entries(action.boost).forEach(([key,value])=>pet[key]=clamp((Number(pet[key])||0)+value));
    pet.aquariumLevel=levelFromXp(pet.experience);if(pet.aquariumLevel>=3&&!pet.unlockedDecorations.includes('castle'))pet.unlockedDecorations.push('castle');
    pet.updatedAtClient=now();return {pet,levelUp:pet.aquariumLevel>oldLevel};
  }
  async function performAction(type,{silent=false}={}){
    if(!ACTIONS[type]||!state.pet)return false;const remaining=actionRemaining(type);if(remaining&&!silent){toast(`${ACTIONS[type].label}: vuelve dentro de ${duration(remaining).toLowerCase()}.`);return false}
    const fb=await firebaseContext();
    if(fb&&state.uid!=='guest'){
      const {fs,db}=fb;const petRef=fs.doc(db,'casas',state.houseId,'mascota','actual');const bucket=Math.floor(now()/ACTIONS[type].cooldown);const actionId=`${state.uid}_${type}_${bucket}`;const actionRef=fs.doc(db,'casas',state.houseId,'mascotaAcciones',actionId);
      try{
        let result;
        await fs.runTransaction(db,async tx=>{
          const [aSnap,pSnap]=await Promise.all([tx.get(actionRef),tx.get(petRef)]);if(aSnap.exists())throw Object.assign(new Error('cooldown'),{code:'jemmo/cooldown'});
          result=applyActionToPet(type,pSnap.exists()?pSnap.data():state.pet);
          tx.set(petRef,{...result.pet,updatedAtServer:fs.serverTimestamp()},{merge:true});tx.set(actionRef,{uid:state.uid,type,xp:ACTIONS[type].xp,createdAtClient:now(),createdAt:fs.serverTimestamp(),schemaVersion:1});
        });
        state.pet=result.pet;state.cloud=true;await IDB.set(state.houseId,state.pet);afterAction(type,result.levelUp,silent);setSync('cloud','Acción sincronizada con la Casa en Firebase.');return true;
      }catch(error){if(error?.code==='jemmo/cooldown'){toast('Esa acción ya se realizó en este periodo.');return false}console.warn('JEMMO Mascota: acción local por fallo de Firebase.',error?.code||error)}
    }
    const result=applyActionToPet(type,state.pet);state.pet=result.pet;await saveLocal();afterAction(type,result.levelUp,silent);setSync('local','Acción guardada en este móvil. Se sincronizará cuando Firebase esté disponible.');return true;
  }
  function afterAction(type,levelUp,silent){renderAll();if(!silent){animateFish();toast(levelUp?`¡La pecera subió al nivel ${state.pet.aquariumLevel}!`:`${ACTIONS[type].label} completado · +${ACTIONS[type].xp} XP`)}
  }
  async function recordVisit(){
    if(!state.pet)return;const key=`${state.uid}:visit`;const last=Number(state.pet.cooldowns?.[key])||0;if(now()-last<24*60*60*1000)return;
    state.pet.cooldowns={...state.pet.cooldowns,[key]:now()};state.pet.experience+=5;state.pet.aquariumLevel=levelFromXp(state.pet.experience);state.pet.lastVisitAt=now();await saveLocal();
    window.dispatchEvent(new CustomEvent('jemmo-house-pet-progress',{detail:{houseId:state.houseId,source:'daily_house_room_visit',points:5}}));
  }
  async function addProgress({points=0,source='external',idempotencyKey=''}={}){
    points=Math.max(0,Math.min(500,Number(points)||0));if(!points||!state.pet)return{ok:false};const key=idempotencyKey?`external:${idempotencyKey}`:'';if(key&&state.pet.cooldowns[key])return{ok:false,duplicate:true};
    state.pet.experience+=points;state.pet.aquariumLevel=levelFromXp(state.pet.experience);if(key)state.pet.cooldowns[key]=now();await saveLocal();
    return{ok:true,level:state.pet.aquariumLevel,source};
  }

  function aquariumHtml(){
    const bubbles=Array.from({length:18},(_,i)=>`<i class="jhp-bubble" style="--x:${4+(i*17)%91}%;--s:${5+(i%5)*3}px;--d:${6+(i%7)*1.15}s;--delay:-${(i*1.37)%9}s"></i>`).join('');
    return `<div class="jhp-aquarium" id="jhpAquarium" role="img" aria-label="Pecera interactiva de la Casa">
      <div class="jhp-lightbeam b1"></div><div class="jhp-lightbeam b2"></div><div class="jhp-lightbeam b3"></div><div class="jhp-waterline"></div>${bubbles}
      <div class="jhp-plant p1"><i></i><i></i><i></i><i></i></div><div class="jhp-plant p2"><i></i><i></i><i></i><i></i></div>
      <div class="jhp-coral"><span></span><span></span><span></span></div><div class="jhp-castle" id="jhpCastle"><div class="c1"></div><div class="c2"></div><div class="c3"></div><i class="door"></i></div>
      <div class="jhp-floor"></div><div class="jhp-pebbles"></div>
      <button class="jhp-fish" id="jhpFish" type="button" aria-label="Jugar con el chicharro oficial">${fishSvg('modal')}</button>
      <div class="jhp-status"><span id="jhpFishStatus">Tu chicharro está explorando la pecera.</span></div>
    </div>`;
  }
  function modalHtml(){return `<div class="jhp-modal" id="jhpModal" hidden><section class="jhp-sheet" role="dialog" aria-modal="true" aria-labelledby="jhpTitle">
    <header class="jhp-head"><div class="jhp-head__badge">${fishSvg('badge')}</div><div class="jhp-head__title"><small>MASCOTA OFICIAL JEMMO LIVE</small><strong id="jhpTitle">PECERA DE LA CASA</strong><span id="jhpHeadStatus">Chicharro violeta neón · Modo de pruebas</span></div><button class="jhp-close" id="jhpClose" type="button" aria-label="Cerrar">×</button></header>
    <div class="jhp-scroll"><div class="jhp-level-grid"><div class="jhp-level-card"><small>NIVEL DE LA CASA</small><b><em id="jhpHouseLevel">1</em></b><span id="jhpHouseName">Casa JEMMO</span></div><div class="jhp-level-card"><small>NIVEL DE PECERA</small><b>NIVEL <em id="jhpPetLevel">1</em></b><span id="jhpPetStage">Pecera inicial</span></div></div>
    ${aquariumHtml()}
    <div class="jhp-progress"><div class="jhp-progress__top"><b>EVOLUCIÓN DE LA MASCOTA</b><span id="jhpXpText">0 XP</span></div><div class="jhp-bar"><i id="jhpXpBar"></i></div>
      <div class="jhp-meters"><div class="jhp-meter"><div class="jhp-meter__head"><span>ALIMENTO</span><b id="jhpHungerText">82%</b></div><div class="jhp-mini"><i id="jhpHungerBar"></i></div></div><div class="jhp-meter"><div class="jhp-meter__head"><span>LIMPIEZA</span><b id="jhpCleanText">90%</b></div><div class="jhp-mini"><i id="jhpCleanBar"></i></div></div><div class="jhp-meter"><div class="jhp-meter__head"><span>ÁNIMO</span><b id="jhpMoodText">88%</b></div><div class="jhp-mini"><i id="jhpMoodBar"></i></div></div></div>
    </div>
    <div class="jhp-actions"><button class="jhp-action" data-jhp-action="feed" type="button"><span>◉</span><b>ALIMENTAR</b><small>GRATIS · DIARIO</small></button><button class="jhp-action" data-jhp-action="clean" type="button"><span>✦</span><b>LIMPIAR</b><small>GRATIS · DIARIO</small></button><button class="jhp-action" data-jhp-action="play" type="button"><span>◆</span><b>JUGAR</b><small>CADA 4 HORAS</small></button></div>
    <div class="jhp-sync" id="jhpSync" data-state="local"><strong>GUARDADO:</strong> preparando respaldo de la pecera.</div></div>
  </section></div><div class="jhp-toast" id="jhpToast"></div>`}
  function mountModal(){if(document.getElementById('jhpModal'))return;document.body.insertAdjacentHTML('beforeend',modalHtml());bindModal()}
  function bindModal(){
    const modal=document.getElementById('jhpModal');document.getElementById('jhpClose')?.addEventListener('click',closeModal);modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});
    document.querySelectorAll('[data-jhp-action]').forEach(btn=>btn.addEventListener('click',()=>performAction(btn.dataset.jhpAction)));
    const aquarium=document.getElementById('jhpAquarium'),fish=document.getElementById('jhpFish');fish?.addEventListener('click',e=>{e.stopPropagation();animateFish();state.pet.mood=clamp(state.pet.mood+2);state.pet.totalInteractions+=1;saveLocal();toast('El chicharro se acercó al cristal.')});
    aquarium?.addEventListener('pointerdown',e=>{if(e.target.closest('.jhp-action'))return;moveFish(e.clientX,e.clientY);spark(e.clientX,e.clientY)});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open)closeModal()});
  }
  function mountLauncher(){
    const ctx=detectHouseContext();if(!ctx.isHouseRoom)return false;state.houseId=ctx.id;state.houseName=ctx.name;
    const room=document.querySelector('.jr-room:not(.jr-hidden),.jr-stage');
    if(room&&!document.getElementById('jhpRoomLauncher')){
      const stage=document.querySelector('.jr-stage')||room;stage.style.position=stage.style.position||'relative';stage.insertAdjacentHTML('beforeend',`<button class="jhp-room-launcher" id="jhpRoomLauncher" type="button"><span class="jhp-room-launcher__fish">${fishSvg('launcher')}</span><span class="jhp-room-launcher__text"><b>MASCOTA</b><small id="jhpLauncherText">CASA NIVEL 1 · PECERA NIVEL 1</small></span></button>`);document.getElementById('jhpRoomLauncher').addEventListener('click',openModal);return true;
    }
    if(ctx.onHousePage&&!document.getElementById('jhpHouseLauncher')){document.body.insertAdjacentHTML('beforeend',`<button class="jhp-house-launcher" id="jhpHouseLauncher" type="button">${fishSvg('house')}<span><b>MASCOTA DE LA CASA</b><small id="jhpHouseLauncherText">PECERA NIVEL 1</small></span></button>`);document.getElementById('jhpHouseLauncher').addEventListener('click',openModal);return true}
    return false;
  }
  async function openModal(){mountModal();state.open=true;document.getElementById('jhpModal').hidden=false;document.documentElement.style.overflow='hidden';renderAll();await connectCloud()}
  function closeModal(){state.open=false;const modal=document.getElementById('jhpModal');if(modal)modal.hidden=true;document.documentElement.style.overflow=''}
  function setText(id,text){const el=document.getElementById(id);if(el)el.textContent=text}
  function setWidth(id,value){const el=document.getElementById(id);if(el)el.style.width=`${clamp(value)}%`}
  function renderText(){
    setText('jhpHouseName',state.houseName);setText('jhpHouseLevel',state.houseLevel);setText('jhpPetLevel',state.pet?.aquariumLevel||1);setText('jhpTitle',`PECERA · ${state.houseName}`);
    const stage=['Pecera inicial','Jardín violeta','Reino coral','Santuario dorado','Océano legendario'][Math.max(0,(state.pet?.aquariumLevel||1)-1)];setText('jhpPetStage',stage);
    setText('jhpLauncherText',`CASA NIVEL ${state.houseLevel} · PECERA NIVEL ${state.pet?.aquariumLevel||1}`);setText('jhpHouseLauncherText',`PECERA NIVEL ${state.pet?.aquariumLevel||1}`)
  }
  function renderAll(){if(!state.pet)return;renderText();const pet=state.pet;setText('jhpXpText',pet.aquariumLevel>=MAX_LEVEL?`${pet.experience} XP · MÁXIMO`:`${pet.experience} XP · ${LEVELS[pet.aquariumLevel]-pet.experience} PARA SUBIR`);setWidth('jhpXpBar',levelProgress(pet));
    [['Hunger',pet.hunger],['Clean',pet.cleanliness],['Mood',pet.mood]].forEach(([name,value])=>{setText(`jhp${name}Text`,`${Math.round(value)}%`);setWidth(`jhp${name}Bar`,value)});
    const status=pet.hunger<25?'Tu chicharro tiene hambre.':pet.cleanliness<30?'El agua necesita una limpieza.':pet.mood<35?'La mascota necesita juego y compañía.':pet.aquariumLevel>=5?'El chicharro legendario protege la Casa.':'Tu chicharro está feliz y reconoce a los miembros de la Casa.';setText('jhpFishStatus',status);
    const fish=document.getElementById('jhpFish');fish?.classList.toggle('jhp-hungry',pet.hunger<25);const castle=document.getElementById('jhpCastle');if(castle)castle.style.setProperty('--castle-opacity',pet.aquariumLevel>=3?'1':'.25');
    document.querySelectorAll('[data-jhp-action]').forEach(btn=>{const type=btn.dataset.jhpAction,rem=actionRemaining(type);btn.disabled=rem>0;const small=btn.querySelector('small');if(small)small.textContent=rem?duration(rem):(type==='play'?'DISPONIBLE':'GRATIS · DISPONIBLE')})
  }
  function setSync(kind,text){const el=document.getElementById('jhpSync');if(!el)return;el.dataset.state=kind;el.innerHTML=`<strong>GUARDADO:</strong> ${escapeHtml(text)}`}
  let toastTimer;function toast(text){const el=document.getElementById('jhpToast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
  function animateFish(){const fish=document.getElementById('jhpFish');if(!fish)return;fish.classList.remove('jhp-celebrate');void fish.offsetWidth;fish.classList.add('jhp-celebrate');setTimeout(()=>fish.classList.remove('jhp-celebrate'),1400)}
  function moveFish(clientX,clientY){const aq=document.getElementById('jhpAquarium'),fish=document.getElementById('jhpFish');if(!aq||!fish)return;const r=aq.getBoundingClientRect();const x=clamp(((clientX-r.left)/r.width)*100,18,82),y=clamp(((clientY-r.top)/r.height)*100,20,70);const current=parseFloat(fish.style.left)||50;fish.style.setProperty('--fish-dir',x<current?'-1':'1');fish.style.left=`${x}%`;fish.style.top=`${y}%`;setText('jhpFishStatus','El chicharro siguió tu movimiento.');setTimeout(()=>setText('jhpFishStatus','Tu chicharro está explorando la pecera.'),2200)}
  function spark(clientX,clientY){const aq=document.getElementById('jhpAquarium');if(!aq)return;const r=aq.getBoundingClientRect(),el=document.createElement('i');el.className='jhp-touch-spark';el.style.left=`${clientX-r.left-6}px`;el.style.top=`${clientY-r.top-6}px`;aq.appendChild(el);setTimeout(()=>el.remove(),850)}

  async function init(){
    const ctx=detectHouseContext();if(!ctx.isHouseRoom)return;state.houseId=ctx.id;state.houseName=ctx.name;state.uid=userId();mountModal();await loadLocal();mountLauncher();renderAll();recordVisit();
    const observer=new MutationObserver(()=>{if(!document.getElementById('jhpRoomLauncher')&&!document.getElementById('jhpHouseLauncher'))mountLauncher()});observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});setTimeout(()=>observer.disconnect(),90000);
    setTimeout(connectCloud,1200);
    window.addEventListener('jemmo-house-task-completed',e=>addProgress({points:25,source:'task',idempotencyKey:e.detail?.taskId||`task-${Date.now()}`}));
    window.addEventListener('jemmo-house-gift-received',e=>addProgress({points:Math.min(50,Math.max(1,Math.floor((Number(e.detail?.amount)||1)/100))),source:'gift',idempotencyKey:e.detail?.operationId||''}));
  }
  window.JemmoHousePet={version:VERSION,open:openModal,close:closeModal,addProgress,getState:()=>state.pet?JSON.parse(JSON.stringify(state.pet)):null};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
