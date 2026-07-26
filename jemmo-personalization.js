/* JEMMO LIVE V1 · INVENTARIO Y EQUIPAMIENTO PRUEBA 18 */
import { STARTER_ITEM_IDS, DEFAULT_EQUIPPED, itemById } from './jemmo-store-catalog.js';

const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
const DB_NAME='jemmo-personalization-v1';
const DB_VERSION=1;
const STORE='profiles';
const STATE_VERSION=1;
let memoryState=null;
let firebasePromise=null;

export function activeUid(){
  if(window.__jemmoAuthenticatedUid)return String(window.__jemmoAuthenticatedUid);
  try{return localStorage.getItem('jemmo_active_uid')||sessionStorage.getItem('jemmo_active_uid')||'guest';}catch{return 'guest';}
}
function key(uid=activeUid()){return `jemmo_personalization_v1_${uid||'guest'}`;}
function safeJson(raw,fallback=null){try{return JSON.parse(raw)||fallback}catch{return fallback}}
function localRead(uid=activeUid()){
  try{return safeJson(localStorage.getItem(key(uid)),null)}catch{return null}
}
function localWrite(uid,state){
  try{localStorage.setItem(key(uid),JSON.stringify(state));return true}catch{
    try{sessionStorage.setItem(key(uid),JSON.stringify(state));return true}catch{return false}
  }
}
function openDb(){
  if(!('indexedDB' in window))return Promise.resolve(null);
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'uid'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function idbRead(uid){
  const db=await openDb().catch(()=>null);if(!db)return null;
  return new Promise(resolve=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(uid);req.onsuccess=()=>resolve(req.result?.state||null);req.onerror=()=>resolve(null);});
}
async function idbWrite(uid,state){
  const db=await openDb().catch(()=>null);if(!db)return false;
  return new Promise(resolve=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({uid,state,updatedAt:state.updatedAt});tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);});
}
function starterInventory(now=Date.now()){
  return Object.fromEntries(STARTER_ITEM_IDS.map(id=>[id,{itemId:id,category:itemById(id)?.category||'',acquiredAt:now,source:'starter',price:0,simulation:true}]));
}
export function normalizeState(raw={},uid=activeUid()){
  const now=Date.now();
  const inventory={...starterInventory(now)};
  if(raw?.inventory&&typeof raw.inventory==='object'){
    Object.entries(raw.inventory).forEach(([id,value])=>{if(itemById(id)&&itemById(id).category!=='gifts')inventory[id]={itemId:id,category:itemById(id).category,acquiredAt:Number(value?.acquiredAt)||now,source:String(value?.source||'purchase'),price:Math.max(0,Number(value?.price)||0),simulation:true};});
  }
  const equipped={...DEFAULT_EQUIPPED};
  Object.keys(equipped).forEach(category=>{const selected=String(raw?.equipped?.[category]||equipped[category]);if(inventory[selected]&&itemById(selected)?.category===category)equipped[category]=selected;});
  const purchases=Array.isArray(raw?.purchases)?raw.purchases.filter(x=>x&&itemById(x.itemId)).slice(-150):[];
  const pending=raw?.pendingPurchase&&itemById(raw.pendingPurchase.itemId)?{...raw.pendingPurchase}:null;
  return {version:STATE_VERSION,uid,inventory,equipped,purchases,pendingPurchase:pending,updatedAt:Number(raw?.updatedAt)||now,simulation:true};
}
async function firebaseServices(){
  if(firebasePromise)return firebasePromise;
  firebasePromise=Promise.all([import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')]).then(([a,f])=>{const app=a.getApps()[0]||a.initializeApp(firebaseConfig);return{...f,db:f.getFirestore(app)}}).catch(()=>null);
  return firebasePromise;
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
  return ledger.find(entry=>entry?.idempotencyKey===idempotencyKey&&entry?.type==='store_purchase')||null;
}
async function reconcilePending(state){
  const pending=state.pendingPurchase;if(!pending)return state;
  const item=itemById(pending.itemId);if(!item){state.pendingPurchase=null;return state;}
  const ledger=walletHasPurchase(pending.idempotencyKey);
  if(ledger){
    state.inventory[item.id]={itemId:item.id,category:item.category,acquiredAt:Number(ledger.createdAt)||Date.now(),source:'purchase-recovered',price:item.price,simulation:true};
    state.purchases.push({id:ledger.id||pending.idempotencyKey,itemId:item.id,category:item.category,price:item.price,createdAt:Number(ledger.createdAt)||Date.now(),source:'recovered',simulation:true});
  }
  state.pendingPurchase=null;state.updatedAt=Date.now();
  return state;
}
export async function loadPersonalization({cloud=true}={}){
  const uid=activeUid();
  const [local,idb,remote]=await Promise.all([Promise.resolve(localRead(uid)),idbRead(uid),cloud?cloudRead(uid):Promise.resolve(null)]);
  const candidates=[local,idb,remote].filter(Boolean).sort((a,b)=>Number(b.updatedAtClient||b.updatedAt||0)-Number(a.updatedAtClient||a.updatedAt||0));
  let state=normalizeState(candidates[0]||{},uid);state=await reconcilePending(state);memoryState=state;await savePersonalization(state,{cloud:false});return state;
}
export function getPersonalization(){return memoryState||normalizeState({},activeUid());}
export async function savePersonalization(next,{cloud=true}={}){
  const state=normalizeState({...next,updatedAt:Date.now()},activeUid());memoryState=state;
  await Promise.all([Promise.resolve(localWrite(state.uid,state)),idbWrite(state.uid,state)]);
  if(cloud)cloudWrite(state.uid,state).catch(()=>false);
  window.dispatchEvent(new CustomEvent('jemmo-personalization-change',{detail:{state}}));
  return state;
}
export function ownsItem(itemId,state=getPersonalization()){return Boolean(state.inventory?.[itemId]);}
export function equippedItem(category,state=getPersonalization()){return itemById(state.equipped?.[category])||itemById(DEFAULT_EQUIPPED[category]);}
export async function beginPurchase(item){
  const state=getPersonalization();
  if(!item||item.category==='gifts')return{ok:false,reason:'not-inventory'};
  if(ownsItem(item.id,state))return{ok:true,alreadyOwned:true,state};
  const idempotencyKey=`store:${state.uid}:${item.id}`;
  state.pendingPurchase={itemId:item.id,idempotencyKey,price:item.price,createdAt:Date.now(),simulation:true};
  await savePersonalization(state,{cloud:false});
  return{ok:true,idempotencyKey,state};
}
export async function finishPurchase(item,operationId){
  const state=getPersonalization();
  state.inventory[item.id]={itemId:item.id,category:item.category,acquiredAt:Date.now(),source:'purchase',price:item.price,simulation:true};
  state.purchases.push({id:operationId||`purchase_${Date.now()}`,itemId:item.id,category:item.category,price:item.price,createdAt:Date.now(),source:'purchase',simulation:true});
  state.purchases=state.purchases.slice(-150);state.pendingPurchase=null;
  return savePersonalization(state,{cloud:true});
}
export async function cancelPendingPurchase(){const state=getPersonalization();state.pendingPurchase=null;return savePersonalization(state,{cloud:false});}
export async function equipItem(item){
  const state=getPersonalization();
  if(!item||item.category==='gifts'||!ownsItem(item.id,state))return{ok:false,state};
  state.equipped[item.category]=item.id;await savePersonalization(state,{cloud:true});return{ok:true,state};
}
export async function equipBase(category){
  const base=itemById(DEFAULT_EQUIPPED[category]);return equipItem(base);
}
export function inventoryItems(state=getPersonalization()){
  return Object.keys(state.inventory||{}).map(itemById).filter(Boolean).sort((a,b)=>a.category.localeCompare(b.category)||a.price-b.price);
}
export function applyEquippedToRoot(root=document.documentElement,state=getPersonalization()){
  const theme=equippedItem('themes',state),bubble=equippedItem('bubbles',state),avatar=equippedItem('avatarFrames',state),chair=equippedItem('chairFrames',state),entrance=equippedItem('entrances',state);
  root.dataset.jemmoTheme=theme?.id||'';root.dataset.jemmoBubble=bubble?.id||'';root.dataset.jemmoAvatarFrame=avatar?.id||'';root.dataset.jemmoChairFrame=chair?.id||'';root.dataset.jemmoEntrance=entrance?.id||'';
  return{theme,bubble,avatar,chair,entrance};
}
