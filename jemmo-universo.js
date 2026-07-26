/* JEMMO LIVE V1 · JEMMO UNIVERSO COMPLEMENTOS TEMPORALES PRUEBA 20 */
import { CATEGORY_META, itemById, itemsForCategory, formatJemmos } from './jemmo-store-catalog.js';
import { loadPersonalization, getPersonalization, ownsItem, equippedItem, beginPurchase, finishPurchase, cancelPendingPurchase, equipItem, equipBase, inventoryItems, applyEquippedToRoot, itemExpiryStatus } from './jemmo-personalization.js';

const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const storeParams=new URLSearchParams(location.search);
let activeCategory=Object.hasOwn(CATEGORY_META,storeParams.get('category'))?storeParams.get('category'):'popular';let selectedItem=null;let busy=false;
const formatDate=value=>{try{return new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return''}};
const escapeHtml=value=>String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
function toast(text){const node=$('#storeToast');node.textContent=text;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),2800)}
function balance(){return Math.max(0,Number(window.JemmoWallet?.get?.()?.jemmos)||0)}
function renderBalance(){const value=formatJemmos(balance());$$('[data-store-balance]').forEach(n=>n.textContent=value)}
function itemStatus(item,state=getPersonalization()){
  const expiry=itemExpiryStatus(item.id,state);
  if(state.equipped?.[item.category]===item.id&&expiry.active)return{label:'EQUIPADO',className:'equipped'};
  if(expiry.expired)return{label:'CADUCADO · RENOVAR',className:'expired'};
  if(expiry.active&&!item.starter)return{label:`ACTIVO · ${expiry.remainingDays} DÍAS`,className:'owned'};
  if(expiry.active)return{label:'EN INVENTARIO',className:'owned'};
  if(item.price===0)return{label:'GRATIS',className:'free'};
  return{label:`${formatJemmos(item.price)} JEMMOS`,className:'price'}
}
function visualStyle(item){
  if(item.category==='themes')return`background:${item.preview.background}`;
  if(item.category==='bubbles')return`background:${item.preview.bubble};border-color:${item.preview.border};color:${item.preview.text}`;
  if(item.category==='avatarFrames')return`box-shadow:${item.preview.frame};border-radius:${item.preview.radius}`;
  if(item.category==='chairFrames')return`border:${item.preview.frame};box-shadow:${item.preview.glow}`;
  return''
}
function itemVisual(item){
  if(item.category==='themes')return`<span class="store-item-scene" style="${visualStyle(item)}"><i>✦</i><b>JEMMO</b></span>`;
  if(item.category==='bubbles')return`<span class="store-item-bubble" style="${visualStyle(item)}">Hola JEMMO</span>`;
  if(item.category==='avatarFrames')return`<span class="store-item-avatar" style="${visualStyle(item)}">J</span>`;
  if(item.category==='chairFrames')return`<span class="store-item-chair" style="${visualStyle(item)}"><i>J</i><small>SILLA</small></span>`;
  return`<span class="store-item-entry ${item.preview.effect}"><i>${item.icon}</i><small>${escapeHtml(item.preview.label)}</small></span>`
}
function card(item){const status=itemStatus(item);return`<button class="store-item-card" type="button" data-item-id="${item.id}"><span class="store-tier">${item.tier}</span>${itemVisual(item)}<span class="store-item-copy"><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.description)}</small></span><span class="store-item-status ${status.className}">${status.label}</span></button>`}
function itemsForActive(){if(activeCategory==='inventory')return inventoryItems();return itemsForCategory(activeCategory)}
function renderGrid(){
  const list=itemsForActive();const q=($('#storeSearch')?.value||'').trim().toLocaleLowerCase('es');const filtered=q?list.filter(i=>`${i.name} ${i.description} ${i.tier}`.toLocaleLowerCase('es').includes(q)):list;
  $('#storeGrid').innerHTML=filtered.map(card).join('')||'<div class="store-empty"><b>No hay resultados</b><span>Prueba otra búsqueda o categoría.</span></div>';
  const meta=CATEGORY_META[activeCategory];$('#storeCategoryTitle').textContent=meta.label;$('#storeCategoryCopy').textContent=meta.description;$('#storeCount').textContent=`${filtered.length} elementos`
}
function renderTabs(){$('#storeTabs').innerHTML=Object.entries(CATEGORY_META).map(([id,meta])=>`<button type="button" data-category="${id}" class="${id===activeCategory?'active':''}"><span>${meta.icon}</span>${meta.label}</button>`).join('')}
function previewState(item=selectedItem){
  const state=getPersonalization();const theme=item?.category==='themes'?item:equippedItem('themes',state);const bubble=item?.category==='bubbles'?item:equippedItem('bubbles',state);const avatar=item?.category==='avatarFrames'?item:equippedItem('avatarFrames',state);const chair=item?.category==='chairFrames'?item:equippedItem('chairFrames',state);const entrance=item?.category==='entrances'?item:equippedItem('entrances',state);
  const scene=$('#storePreviewScene');scene.style.background=theme?.preview?.background||'';scene.style.setProperty('--preview-accent',theme?.preview?.accent||'#d84dff');
  const av=$('#storePreviewAvatar');av.style.boxShadow=avatar?.preview?.frame||'';av.style.borderRadius=avatar?.preview?.radius||'50%';
  const seat=$('#storePreviewSeat');seat.style.border=chair?.preview?.frame||'';seat.style.boxShadow=chair?.preview?.glow||'';
  const msg=$('#storePreviewBubble');msg.style.background=bubble?.preview?.bubble||'';msg.style.borderColor=bubble?.preview?.border||'';msg.style.color=bubble?.preview?.text||'';
  const entry=$('#storePreviewEntry');entry.className=`store-preview-entry ${entrance?.preview?.effect||'base'}`;entry.textContent=entrance?.preview?.label||'Jesús entró en la sala';
  $('#storePreviewTheme').textContent=theme?.name||'JEMMO Base'
}
function renderInventorySummary(){const state=getPersonalization();const active=Object.keys(state.inventory).filter(id=>ownsItem(id,state));$('#inventoryCount').textContent=String(active.length);$('#equippedCount').textContent=String(Object.keys(state.equipped).length);$('#purchaseCount').textContent=String(state.purchases.length)}
function renderAll(){renderBalance();renderTabs();renderGrid();renderInventorySummary();previewState();applyEquippedToRoot()}
function openDetail(item){
  selectedItem=item;previewState(item);const status=itemStatus(item),expiry=itemExpiryStatus(item.id);$('#detailVisual').innerHTML=itemVisual(item);$('#detailTier').textContent=item.tier;$('#detailTitle').textContent=item.name;$('#detailDescription').textContent=item.description;
  const duration=item.durationDays?item.durationLabel:'PERMANENTE';
  const expiryCopy=expiry.expired?`Caducó ${formatDate(expiry.expiresAt)}`:expiry.expiresAt?`Hasta ${formatDate(expiry.expiresAt)}`:status.label;
  $('#detailMeta').innerHTML=`<span>PRECIO <b>${item.price?formatJemmos(item.price)+' JEMMOS':'GRATIS'}</b></span><span>DURACIÓN <b>${duration}</b></span><span>ESTADO <b>${expiryCopy}</b></span>`;
  configureDetailActions(item);$('#storeDetail').hidden=false;document.body.classList.add('store-modal-open')
}
function closeDetail(){selectedItem=null;$('#storeDetail').hidden=true;document.body.classList.remove('store-modal-open');previewState()}
function configureDetailActions(item){
  const state=getPersonalization();const active=ownsItem(item.id,state);const equipped=state.equipped?.[item.category]===item.id&&active;const buy=$('#detailBuy'),equip=$('#detailEquip'),remove=$('#detailRemove'),recharge=$('#detailRecharge');
  buy.hidden=active||item.price===0;buy.textContent=active?'ACTIVO':`${itemExpiryStatus(item.id,state).expired?'RENOVAR':'COMPRAR'} · ${formatJemmos(item.price)} JEMMOS`;
  equip.hidden=!active||equipped;equip.textContent='EQUIPAR AHORA';
  remove.hidden=!equipped||item.starter;remove.textContent='VOLVER AL MODELO BASE';
  recharge.hidden=active||item.price===0||balance()>=item.price
}
async function purchaseSelected(){
  const item=selectedItem;if(!item||busy)return;if(ownsItem(item.id)){toast('Ese complemento todavía está activo.');configureDetailActions(item);return}
  if(balance()<item.price){toast(`Faltan ${formatJemmos(item.price-balance())} JEMMOS.`);window.JemmoWallet?.openRecharge?.();return}
  if(!window.JemmoWallet?.spendJemmos){toast('Actualiza el monedero para adquirir complementos.');return}
  if(!confirm(`¿Adquirir ${item.name} por ${formatJemmos(item.price)} JEMMOS?\n\nDuración: ${item.durationLabel}.\nMODO DE PRUEBAS · SIN COBROS REALES`))return;
  busy=true;$('#detailBuy').disabled=true;
  try{
    const pending=await beginPurchase(item);if(!pending.ok){toast('No se pudo preparar la adquisición.');return}
    const result=window.JemmoWallet.spendJemmos(item.price,{title:`Complemento · ${item.name}`,detail:`JEMMO Universo · ${item.durationLabel}`,source:'jemmo-store',context:'JEMMO Universo',itemId:item.id,category:item.category,idempotencyKey:pending.idempotencyKey});
    if(!result.ok){await cancelPendingPurchase();if(result.duplicate){await finishPurchase(item,result.operationId);toast('Adquisición recuperada sin cobro duplicado.')}else{toast(`Saldo insuficiente. Faltan ${formatJemmos(result.missing||0)} JEMMOS.`)}return}
    await finishPurchase(item,result.operationId);toast(`${item.name} activo durante ${item.durationLabel.toLowerCase()}.`);renderAll();configureDetailActions(item)
  }catch(error){console.error('JEMMO store purchase',error);toast('No se pudo completar la adquisición. Revisa el saldo antes de volver a pulsar.')}finally{busy=false;$('#detailBuy').disabled=false}
}
async function equipSelected(){const item=selectedItem;if(!item||busy)return;busy=true;try{const result=await equipItem(item);if(!result.ok){toast('Este complemento no está activo. Adquiérelo o renueva su duración.');return}toast(`${item.name} equipado en JEMMO.`);renderAll();configureDetailActions(item)}finally{busy=false}}
async function removeSelected(){const item=selectedItem;if(!item||busy)return;busy=true;try{await equipBase(item.category);toast('Se restauró el modelo base de esta categoría.');renderAll();configureDetailActions(item)}finally{busy=false}}
function bind(){
  $('#storeTabs').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;activeCategory=b.dataset.category;renderTabs();renderGrid()});
  $('#storeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-item-id]');if(!b)return;const item=itemById(b.dataset.itemId);if(item)openDetail(item)});
  $('#storeSearch').addEventListener('input',renderGrid);$('#storeDetailClose').addEventListener('click',closeDetail);$('#storeDetailBackdrop').addEventListener('click',closeDetail);
  $('#detailBuy').addEventListener('click',purchaseSelected);$('#detailEquip').addEventListener('click',equipSelected);$('#detailRemove').addEventListener('click',removeSelected);$('#detailRecharge').addEventListener('click',()=>window.JemmoWallet?.openRecharge?.());
  $('#storeWallet')?.addEventListener('click',()=>window.JemmoWallet?.open?.('summary'));
  window.addEventListener('jemmo-wallet-change',()=>{renderBalance();if(selectedItem)configureDetailActions(selectedItem)});window.addEventListener('jemmo-personalization-change',()=>renderAll());
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#storeDetail').hidden)closeDetail()})
}
async function boot(){
  bind();await loadPersonalization({cloud:true});renderAll();document.documentElement.classList.remove('jemmo-auth-pending');
  const requestedItem=storeParams.get('item');if(requestedItem){const item=itemById(requestedItem);if(item)openDetail(item)}
  const pending=getPersonalization().pendingPurchase;if(pending)toast('Se revisó una adquisición pendiente anterior.')
}
boot().catch(error=>{console.error('JEMMO Universo boot',error);document.documentElement.classList.remove('jemmo-auth-pending');toast('JEMMO Universo está disponible en modo local.')});
