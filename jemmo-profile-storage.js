/* JEMMO LIVE V1 · PERFIL DURADERO PRUEBA 19 */
(() => {
  'use strict';
  if (window.JemmoProfileStorage?.version) return;
  const VERSION='2.0.0';
  const PREFIX='jemmo_profile_durable_v2:';
  const DB_NAME='jemmo-profile-state-v2';
  const DB_VERSION=1;
  const STORE='profiles';
  const memory=new Map();
  let dbPromise=null;
  const clone=value=>{try{return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value))}catch{return{}}};
  const parse=raw=>{try{const value=JSON.parse(raw||'null');return value&&typeof value==='object'?value:null}catch{return null}};
  const get=(storage,key)=>{try{return storage.getItem(key)}catch{return null}};
  const set=(storage,key,value)=>{try{storage.setItem(key,value);return true}catch{return false}};
  const stamp=value=>Math.max(0,Number(value?.updatedAt)||Number(value?.profileUpdatedAtClient)||0);
  const record=(uid,value,forced=0)=>{
    if(!value||typeof value!=='object')return null;
    if(value.data&&typeof value.data==='object')return{uid,data:value.data,updatedAt:Math.max(stamp(value.data),Number(value.updatedAt)||forced)};
    return{uid,data:value,updatedAt:Math.max(stamp(value),forced)};
  };
  const syncCandidates=uid=>{
    const list=[];
    const mem=memory.get(uid);if(mem)list.push(mem);
    [localStorage,sessionStorage].forEach(storage=>{
      const durable=record(uid,parse(get(storage,PREFIX+uid)));if(durable)list.push(durable);
      const legacy=record(uid,parse(get(storage,`jemmo_profile_v1_${uid}`)));if(legacy)list.push(legacy);
    });
    return list;
  };
  function openDb(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!window.indexedDB){reject(new Error('indexeddb-unavailable'));return}
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'uid'})};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('indexeddb-open-failed'));
    });
    return dbPromise;
  }
  async function idbRead(uid){
    const db=await openDb();
    return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(uid);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||new Error('indexeddb-read-failed'))});
  }
  async function idbWrite(value){
    const db=await openDb();
    return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||new Error('indexeddb-write-failed'));tx.onabort=()=>reject(tx.error||new Error('indexeddb-write-aborted'))});
  }
  function latest(list){return list.filter(Boolean).sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0))[0]||null}
  function peek(uid){uid=String(uid||'').trim();if(!uid)return{};const found=latest(syncCandidates(uid));if(found){memory.set(uid,found);return clone(found.data)}return{}}
  async function load(uid){
    uid=String(uid||'').trim();if(!uid)return{};
    const list=syncCandidates(uid);
    try{const durable=record(uid,await idbRead(uid));if(durable)list.push(durable)}catch(error){console.warn('[JEMMO perfil] IndexedDB no disponible para lectura.',error)}
    const found=latest(list);if(!found)return{};
    memory.set(uid,found);
    const serialized=JSON.stringify(found);
    set(sessionStorage,PREFIX+uid,serialized);set(localStorage,PREFIX+uid,serialized);
    set(sessionStorage,`jemmo_profile_v1_${uid}`,JSON.stringify(found.data));set(localStorage,`jemmo_profile_v1_${uid}`,JSON.stringify(found.data));
    idbWrite(found).catch(()=>{});
    return clone(found.data);
  }
  async function save(uid,data){
    uid=String(uid||'').trim();if(!uid||!data||typeof data!=='object')return{ok:false,reason:'invalid'};
    const clean=clone(data);clean.updatedAt=Math.max(Date.now(),Number(clean.updatedAt)||0);
    const value={uid,data:clean,updatedAt:clean.updatedAt};memory.set(uid,value);
    const durableJson=JSON.stringify(value),legacyJson=JSON.stringify(clean);
    const localSaved=set(localStorage,PREFIX+uid,durableJson)||set(localStorage,`jemmo_profile_v1_${uid}`,legacyJson);
    const sessionSaved=set(sessionStorage,PREFIX+uid,durableJson)||set(sessionStorage,`jemmo_profile_v1_${uid}`,legacyJson);
    let indexedDbSaved=false;
    try{await idbWrite(value);indexedDbSaved=true}catch(error){console.warn('[JEMMO perfil] No se pudo guardar en IndexedDB.',error)}
    // Compatibilidad: intenta actualizar también la clave histórica sin depender de ella.
    set(localStorage,`jemmo_profile_v1_${uid}`,legacyJson);set(sessionStorage,`jemmo_profile_v1_${uid}`,legacyJson);
    const ok=localSaved||sessionSaved||indexedDbSaved;
    if(ok)window.dispatchEvent(new CustomEvent('jemmo-profile-storage-change',{detail:{uid,profile:clone(clean)}}));
    return{ok,localSaved,sessionSaved,indexedDbSaved,profile:clean};
  }
  window.JemmoProfileStorage=Object.freeze({version:VERSION,peek,load,save});
})();
