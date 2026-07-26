/* JEMMO LIVE V1 · INVENTARIO TEMPORAL Y EQUIPAMIENTO GLOBAL PRUEBA 20 */
import { STARTER_ITEM_IDS, DEFAULT_EQUIPPED, itemById } from './jemmo-store-catalog.js';

const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
const DB_NAME='jemmo-personalization-v1';
const DB_VERSION=1;
const STORE='profiles';
const STATE_VERSION=2;
const DAY_MS=24*60*60*1000;
let memoryState=null;
let firebasePromise=null;

export function activeUid(){
  if(window.__jemmoAuthenticatedUid)return String(window.__jemmoAuthenticatedUid);
  try{return localStorage.getItem('jemmo_active_uid')||sessionStorage.getItem('jemmo_active_uid')||'guest';}catch{return'guest'}
}
function key(uid=activeUid()){return`jemmo_personalization_v1_${uid||'guest'}`}
function safeJson(raw,fallback=null){try{return JSON.parse(raw)||fallback}catch{return fallback}}
function localRead(uid=activeUid()){
  try{const local=safeJson(localStorage.getItem(key(uid)),null);if(local)return local}catch{}
  try{return safeJson(sessionStorage.getItem(key(uid)),null)}catch{return null}
}
function localWrite(uid,state){
  try{localStorage.setItem(key(uid),JSON.stringify(state));return true}catch{
    try{sessionStorage.setItem(key(uid),JSON.stringify(state));return true}catch{return false}
  }
}
function openDb(){
  if(!window.indexedDB)return Promise.resolve(null);
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'uid'})};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  })
}
async function idbRead(uid){
  const db=await openDb().catch(()=>null);if(!db)return null;
  return new Promise(resolve=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(uid);req.onsuccess=()=>resolve(req.result?.state||null);req.onerror=()=>resolve(null)})
}
async function idbWrite(uid,state){
  const db=await openDb().catch(()=>null);if(!db)return false;
  return new Promise(resolve=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({uid,state,updatedAt:state.updatedAt});tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false)})
}
function expiryFor(item,acquiredAt){
  const days=Math.max(0,Number(item?.durationDays)||0);
  return days?acquiredAt+days*DAY_MS:0
}
function normalizedEntry(item,value={},now=Date.now()){
  const acquiredAt=Math.max(1,Number(value?.acquiredAt)||now);
  const expiresAt=item?.starter?0:Math.max(0,Number(value?.expiresAt)||expiryFor(item,acquiredAt));
  return{itemId:item.id,category:item.category,acquiredAt,expiresAt,source:String(value?.source||'purchase'),price:Math.max(0,Number(value?.price??item.price)||0),simulation:true}
}
function starterInventory(now=Date.now()){
  return Object.fromEntries(STARTER_ITEM_IDS.map(id=>{const item=itemById(id);return[id,normalizedEntry(item,{acquiredAt:now,source:'starter',price:0,expiresAt:0},now)]}))
}
export function inventoryEntry(itemId,state=getPersonalization()){return state?.inventory?.[itemId]||null}
export function isItemActive(itemId,state=getPersonalization(),now=Date.now()){
  const item=itemById(itemId),entry=inventoryEntry(itemId,state);
  if(!item||!entry)return false;
  return item.starter||!entry.expiresAt||Number(entry.expiresAt)>now
}
export function itemExpiryStatus(itemId,state=getPersonalization(),now=Date.now()){
  const item=itemById(itemId),entry=inventoryEntry(itemId,state);
  if(!item||!entry)return{owned:false,active:false,expired:false,expiresAt:0,remainingDays:0};
  const expiresAt=Math.max(0,Number(entry.expiresAt)||0);
  const active=item.starter||!expiresAt||expiresAt>now;
  return{owned:true,active,expired:!active,expiresAt,remainingDays:active&&expiresAt?Math.max(1,Math.ceil((expiresAt-now)/DAY_MS)):0}
}
export function normalizeState(raw={},uid=activeUid()){
  const now=Date.now();
  const inventory={...starterInventory(now)};
  if(raw?.inventory&&typeof raw.inventory==='object'){
    Object.entries(raw.inventory).forEach(([id,value])=>{const item=itemById(id);if(item)inventory[id]=normalizedEntry(item,value,now)})
  }
  const equipped={...DEFAULT_EQUIPPED};
  Object.keys(equipped).forEach(category=>{
    const selected=String(raw?.equipped?.[category]||equipped[category]);
    if(itemById(selected)?.category===category&&isItemActive(selected,{inventory},now))equipped[category]=selected
  });
  const purchases=Array.isArray(raw?.purchases)?raw.purchases.filter(x=>x&&itemById(x.itemId)).slice(-150):[];
  const pending=raw?.pendingPurchase&&itemById(raw.pendingPurchase.itemId)?{...raw.pendingPurchase}:null;
  return{version:STATE_VERSION,uid,inventory,equipped,purchases,pendingPurchase:pending,updatedAt:Number(raw?.updatedAtClient||raw?.updatedAt)||now,updatedAtClient:Number(raw?.updatedAtClient)||now,simulation:true}
}
async function firebaseServices(){
  if(firebasePromise)return firebasePromise;
  firebasePromise=Promise.all([import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')]).then(([a,f])=>{const app=a.getApps()[0]||a.initializeApp(firebaseConfig);return{...f,db:f.getFirestore(app)}}).catch(()=>null);
  return firebasePromise
}
async function cloudRead(uid){
  if(!uid||uid==='guest'||!navigator.onLine)return null;
  const svc=await firebaseServices();if(!svc)return null;
  try{const snap=await svc.getDoc(svc.doc(svc.db,'users',uid,'personalizacion','estado'));return snap.exists()?snap.data():null}catch{return null}
}
async function cloudWrite(uid,state){
  if(!uid||uid==='guest'||!navigator.onLine)return false;
  const svc=await firebaseServices();if(!svc)return false;
  try{await svc.setDoc(svc.doc(svc.db,'users',uid,'personalizacion','estado'),{...state,updatedAt:svc.serverTimestamp(),updatedAtClient:Date.now(),simulation:true},{merge:true});return true}catch{return false}
}
function walletHasPurchase(idempotencyKey){
  const ledger=window.JemmoWallet?.get?.()?.ledger||[];
  return ledger.find(entry=>entry?.idempotencyKey===idempotencyKey&&entry?.type==='store_purchase')||null
}
function addPurchasedItem(state,item,createdAt,source='purchase'){
  const acquiredAt=Math.max(1,Number(createdAt)||Date.now());
  state.inventory[item.id]=normalizedEntry(item,{acquiredAt,expiresAt:expiryFor(item,acquiredAt),source,price:item.price},acquiredAt)
}
async function reconcilePending(state){
  const pending=state.pendingPurchase;if(!pending)return state;
  const item=itemById(pending.itemId);if(!item){state.pendingPurchase=null;return state}
  const ledger=walletHasPurchase(pending.idempotencyKey);
  if(ledger){
    const createdAt=Number(ledger.createdAt)||Date.now();
    addPurchasedItem(state,item,createdAt,'purchase-recovered');
    state.purchases.push({id:ledger.id||pending.idempotencyKey,itemId:item.id,category:item.category,price:item.price,createdAt,expiresAt:state.inventory[item.id].expiresAt,source:'recovered',simulation:true})
  }
  state.pendingPurchase=null;state.updatedAt=Date.now();state.updatedAtClient=state.updatedAt;
  return state
}
export async function loadPersonalization({cloud=true}={}){
  const uid=activeUid();
  const [local,idb,remote]=await Promise.all([Promise.resolve(localRead(uid)),idbRead(uid),cloud?cloudRead(uid):Promise.resolve(null)]);
  const candidates=[local,idb,remote].filter(Boolean).sort((a,b)=>Number(b.updatedAtClient||b.updatedAt||0)-Number(a.updatedAtClient||a.updatedAt||0));
  let state=normalizeState(candidates[0]||{},uid);state=await reconcilePending(state);memoryState=state;await savePersonalization(state,{cloud:false});return state
}
export function getPersonalization(){return memoryState||normalizeState({},activeUid())}
export async function savePersonalization(next,{cloud=true}={}){
  const now=Date.now();
  const state=normalizeState({...next,updatedAt:now,updatedAtClient:now},activeUid());memoryState=state;
  await Promise.all([Promise.resolve(localWrite(state.uid,state)),idbWrite(state.uid,state)]);
  if(cloud)cloudWrite(state.uid,state).catch(()=>false);
  window.dispatchEvent(new CustomEvent('jemmo-personalization-change',{detail:{state}}));
  return state
}
export function ownsItem(itemId,state=getPersonalization()){return isItemActive(itemId,state)}
export function equippedItem(category,state=getPersonalization()){
  const selected=state.equipped?.[category];
  return isItemActive(selected,state)?itemById(selected):itemById(DEFAULT_EQUIPPED[category])
}
export async function beginPurchase(item){
  const state=getPersonalization();
  if(!item)return{ok:false,reason:'not-inventory'};
  if(ownsItem(item.id,state))return{ok:true,alreadyOwned:true,state};
  const idempotencyKey=`store:${state.uid}:${item.id}:${Date.now()}`;
  state.pendingPurchase={itemId:item.id,idempotencyKey,price:item.price,createdAt:Date.now(),simulation:true};
  await savePersonalization(state,{cloud:false});
  return{ok:true,idempotencyKey,state}
}
export async function finishPurchase(item,operationId){
  const state=getPersonalization(),createdAt=Date.now();
  addPurchasedItem(state,item,createdAt,'purchase');
  state.purchases.push({id:operationId||`purchase_${createdAt}`,itemId:item.id,category:item.category,price:item.price,createdAt,expiresAt:state.inventory[item.id].expiresAt,source:'purchase',simulation:true});
  state.purchases=state.purchases.slice(-150);state.pendingPurchase=null;
  return savePersonalization(state,{cloud:true})
}
export async function cancelPendingPurchase(){const state=getPersonalization();state.pendingPurchase=null;return savePersonalization(state,{cloud:false})}
export async function equipItem(item){
  const state=getPersonalization();
  if(!item||!ownsItem(item.id,state))return{ok:false,state};
  state.equipped[item.category]=item.id;await savePersonalization(state,{cloud:true});return{ok:true,state}
}
export async function equipBase(category){const base=itemById(DEFAULT_EQUIPPED[category]);return equipItem(base)}
export function inventoryItems(state=getPersonalization()){
  return Object.keys(state.inventory||{}).map(itemById).filter(Boolean).sort((a,b)=>a.category.localeCompare(b.category)||a.price-b.price)
}
export function applyEquippedToRoot(root=document.documentElement,state=getPersonalization()){
  const theme=equippedItem('themes',state),bubble=equippedItem('bubbles',state),avatar=equippedItem('avatarFrames',state),chair=equippedItem('chairFrames',state),entrance=equippedItem('entrances',state);
  root.dataset.jemmoTheme=theme?.id||'';root.dataset.jemmoBubble=bubble?.id||'';root.dataset.jemmoAvatarFrame=avatar?.id||'';root.dataset.jemmoChairFrame=chair?.id||'';root.dataset.jemmoEntrance=entrance?.id||'';
  root.style.setProperty('--jemmo-equipped-theme-bg',theme?.preview?.background||'linear-gradient(155deg,#15031d 0%,#09000e 58%,#020003 100%)');
  root.style.setProperty('--jemmo-equipped-theme-accent',theme?.preview?.accent||'#c94cff');
  root.style.setProperty('--jemmo-equipped-avatar-shadow',avatar?.preview?.frame||'0 0 0 3px #7c2f92,0 0 15px #9a37ba55');
  root.style.setProperty('--jemmo-equipped-chair-border',chair?.preview?.frame||'1px solid #6b2b7a');
  root.style.setProperty('--jemmo-equipped-chair-shadow',chair?.preview?.glow||'0 0 12px #a637c733');
  root.style.setProperty('--jemmo-equipped-bubble-bg',bubble?.preview?.bubble||'linear-gradient(135deg,#26102e,#130519)');
  root.style.setProperty('--jemmo-equipped-bubble-border',bubble?.preview?.border||'#7b348e');
  root.style.setProperty('--jemmo-equipped-bubble-text',bubble?.preview?.text||'#ffffff');
  return{theme,bubble,avatar,chair,entrance}
}
