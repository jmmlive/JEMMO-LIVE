/* JEMMO LIVE V1 · JEMMO UNIVERSO UI PRUEBA 18 */
import { CATEGORY_META, PERSONALIZATION_CATALOG, GIFT_CATALOG, ALL_CATALOG_ITEMS, itemById, itemsForCategory, formatJemmos } from './jemmo-store-catalog.js';
import { loadPersonalization, getPersonalization, ownsItem, equippedItem, beginPurchase, finishPurchase, cancelPendingPurchase, equipItem, equipBase, inventoryItems, applyEquippedToRoot } from './jemmo-personalization.js';

const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
let activeCategory='popular';let selectedItem=null;let busy=false;
const formatDate=value=>{try{return new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))}catch{return''}};
const escapeHtml=value=>String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
function toast(text){const node=$('#storeToast');node.textContent=text;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),2600)}
function balance(){return Math.max(0,Number(window.JemmoWallet?.get?.()?.jemmos)||0)}
function renderBalance(){const value=formatJemmos(balance());$$('[data-store-balance]').forEach(n=>n.textContent=value)}
function itemStatus(item,state=getPersonalization()){
  if(item.category==='gifts')return{label:'SE USA EN LIVE/SALAS',className:'gift'};
  if(state.equipped?.[item.category]===item.id)return{label:'EQUIPADO',className:'equipped'};
  if(ownsItem(item.id,state))return{label:'EN INVENTARIO',className:'owned'};
  if(item.price===0)return{label:'GRATIS',className:'free'};
  return{label:`${formatJemmos(item.price)} JEMMOS`,className:'price'};
}
function visualStyle(item){
  if(item.category==='themes')return`background:${item.preview.background}`;
  if(item.category==='bubbles')return`background:${item.preview.bubble};border-color:${item.preview.border};color:${item.preview.text}`;
  if(item.category==='avatarFrames')return`box-shadow:${item.preview.frame};border-radius:${item.preview.radius}`;
  if(item.category==='chairFrames')return`border:${item.preview.frame};box-shadow:${item.preview.glow}`;
  return'';
}
function itemVisual(item){
  if(item.category==='themes')return`<span class="store-item-scene" style="${visualStyle(item)}"><i>✦</i><b>JEMMO</b></span>`;
  if(item.category==='bubbles')return`<span class="store-item-bubble" style="${visualStyle(item)}">Hola JEMMO</span>`;
  if(item.category==='avatarFrames')return`<span class="store-item-avatar" style="${visualStyle(item)}">J</span>`;
  if(item.category==='chairFrames')return`<span class="store-item-chair" style="${visualStyle(item)}"><i>J</i><small>SILLA</small></span>`;
  if(item.category==='entrances')return`<span class="store-item-entry ${item.preview.effect}"><i>${item.icon}</i><small>${escapeHtml(item.preview.label)}</small></span>`;
  return`<span class="store-item-gift"><i>${item.icon}</i><small>${item.animation||''}</small></span>`;
}
function card(item){const status=itemStatus(item);return`<button class="store-item-card" type="button" data-item-id="${item.id}"><span class="store-tier">${item.tier}</span>${itemVisual(item)}<span class="store-item-copy"><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.description)}</small></span><span class="store-item-status ${status.className}">${status.label}</span></button>`}
function itemsForActive(){if(activeCategory==='inventory')return inventoryItems();return itemsForCategory(activeCategory)}
function renderGrid(){
  const list=itemsForActive();const q=($('#storeSearch')?.value||'').trim().toLocaleLowerCase('es');const filtered=q?list.filter(i=>`${i.name} ${i.description} ${i.tier}`.toLocaleLowerCase('es').includes(q)):list;
  $('#storeGrid').innerHTML=filtered.map(card).join('')||'<div class="store-empty"><b>No hay resultados</b><span>Prueba otra búsqueda o categoría.</span></div>';
  $('#storeCategoryTitle').textContent=CATEGORY_META[activeCategory].label;
  $('#storeCategoryCopy').textContent=CATEGORY_META[activeCategory].description;
  $('#storeCount').textContent=`${filtered.length} elementos`;
}
function renderTabs(){
  $('#storeTabs').innerHTML=Object.entries(CATEGORY_META).map(([id,meta])=>`<button type="button" data-category="${id}" class="${id===activeCategory?'active':''}"><span>${meta.icon}</span>${meta.label}</button>`).join('');
}
function previewState(item=selectedItem){
  const state=getPersonalization();const theme=item?.category==='themes'?item:equippedItem('themes',state);const bubble=item?.category==='bubbles'?item:equippedItem('bubbles',state);const avatar=item?.category==='avatarFrames'?item:equippedItem('avatarFrames',state);const chair=item?.category==='chairFrames'?item:equippedItem('chairFrames',state);const entrance=item?.category==='entrances'?item:equippedItem('entrances',state);
  const scene=$('#storePreviewScene');scene.style.background=theme?.preview?.background||'';scene.style.setProperty('--preview-accent',theme?.preview?.accent||'#d84dff');
  const av=$('#storePreviewAvatar');av.style.boxShadow=avatar?.preview?.frame||'';av.style.borderRadius=avatar?.preview?.radius||'50%';
  const seat=$('#storePreviewSeat');seat.style.border=chair?.preview?.frame||'';seat.style.boxShadow=chair?.preview?.glow||'';
  const msg=$('#storePreviewBubble');msg.style.background=bubble?.preview?.bubble||'';msg.style.borderColor=bubble?.preview?.border||'';msg.style.color=bubble?.preview?.text||'';
  const entry=$('#storePreviewEntry');entry.className=`store-preview-entry ${entrance?.preview?.effect||'base'}`;entry.textContent=entrance?.preview?.label||'Jesús entró en la sala';
  $('#storePreviewTheme').textContent=theme?.name||'JEMMO Base';
}
function renderInventorySummary(){const state=getPersonalization();$('#inventoryCount').textContent=String(Object.keys(state.inventory).length);$('#equippedCount').textContent=String(Object.keys(state.equipped).length);$('#purchaseCount').textContent=String(state.purchases.length);}
function renderAll(){renderBalance();renderTabs();renderGrid();renderInventorySummary();previewState();applyEquippedToRoot();}
function openDetail(item){
  selectedItem=item;previewState(item);const status=itemStatus(item);$('#detailVisual').innerHTML=itemVisual(item);$('#detailTier').textContent=item.tier;$('#detailTitle').textContent=item.name;$('#detailDescription').textContent=item.description;
  $('#detailMeta').innerHTML=item.category==='gifts'?`<span>PRECIO <b>${formatJemmos(item.price)} JEMMOS</b></span><span>ANIMACIÓN <b>${item.animation}</b></span><span>SONIDO <b>${item.sound?'SÍ':'NO'}</b></span>`:`<span>PRECIO <b>${item.price?formatJemmos(item.price)+' JEMMOS':'GRATIS'}</b></span><span>DURACIÓN <b>${item.durationLabel}</b></span><span>ESTADO <b>${status.label}</b></span>`;
  configureDetailActions(item);$('#storeDetail').hidden=false;document.body.classList.add('store-modal-open');
}
function closeDetail(){selectedItem=null;$('#storeDetail').hidden=true;document.body.classList.remove('store-modal-open');previewState();}
function configureDetailActions(item){
  const state=getPersonalization();const owned=ownsItem(item.id,state);const equipped=state.equipped?.[item.category]===item.id;const buy=$('#detailBuy'),equip=$('#detailEquip'),remove=$('#detailRemove'),recharge=$('#detailRecharge');
  buy.hidden=item.category==='gifts'||owned||item.price===0;buy.textContent=`COMPRAR · ${formatJemmos(item.price)} JEMMOS`;
  if(item.category!=='gifts'){const meta=$$('#detailMeta span b');if(meta[2])meta[2].textContent=status.label;}
  equip.hidden=item.category==='gifts'||!owned||equipped;equip.textContent='EQUIPAR AHORA';
  remove.hidden=item.category==='gifts'||!equipped||item.starter;remove.textContent='VOLVER AL MODELO BASE';
  recharge.hidden=item.category==='gifts'||owned||item.price===0||balance()>=item.price;
  $('#detailGiftNote').hidden=item.category!=='gifts';
}
async function purchaseSelected(){
  const item=selectedItem;if(!item||busy)return;if(ownsItem(item.id)){toast('Ese objeto ya está en tu inventario.');configureDetailActions(item);return}
  if(balance()<item.price){toast(`Faltan ${formatJemmos(item.price-balance())} JEMMOS.`);window.JemmoWallet?.openRecharge?.();return}
  if(!window.JemmoWallet?.spendJemmos){toast('Actualiza el monedero para comprar objetos.');return}
  if(!confirm(`¿Comprar ${item.name} por ${formatJemmos(item.price)} JEMMOS?\n\nMODO DE PRUEBAS · SIN COBROS REALES`))return;
  busy=true;$('#detailBuy').disabled=true;
  try{
    const pending=await beginPurchase(item);if(!pending.ok){toast('No se pudo preparar la compra.');return}
    const result=window.JemmoWallet.spendJemmos(item.price,{title:`Compra · ${item.name}`,detail:`JEMMO Universo · ${item.category}`,source:'jemmo-store',context:'JEMMO Universo',itemId:item.id,category:item.category,idempotencyKey:pending.idempotencyKey});
    if(!result.ok){await cancelPendingPurchase();if(result.duplicate){await finishPurchase(item,result.operationId);toast('Compra recuperada sin cobro duplicado.')}else{toast(`Saldo insuficiente. Faltan ${formatJemmos(result.missing||0)} JEMMOS.`)}return}
    await finishPurchase(item,result.operationId);toast(`${item.name} añadido al inventario.`);renderAll();configureDetailActions(item);
  }catch(error){console.error('JEMMO store purchase',error);toast('No se pudo completar la compra. No vuelvas a pulsar hasta revisar el saldo.')}finally{busy=false;$('#detailBuy').disabled=false}
}
async function equipSelected(){const item=selectedItem;if(!item||busy)return;busy=true;try{const result=await equipItem(item);if(!result.ok){toast('Primero debes adquirir este objeto.');return}toast(`${item.name} equipado.`);renderAll();configureDetailActions(item)}finally{busy=false}}
async function removeSelected(){const item=selectedItem;if(!item||busy)return;busy=true;try{await equipBase(item.category);toast('Se restauró el modelo base de esta categoría.');renderAll();configureDetailActions(item)}finally{busy=false}}
function bind(){
  $('#storeTabs').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;activeCategory=b.dataset.category;renderTabs();renderGrid()});
  $('#storeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-item-id]');if(!b)return;const item=itemById(b.dataset.itemId);if(item)openDetail(item)});
  $('#storeSearch').addEventListener('input',renderGrid);$('#storeDetailClose').addEventListener('click',closeDetail);$('#storeDetailBackdrop').addEventListener('click',closeDetail);
  $('#detailBuy').addEventListener('click',purchaseSelected);$('#detailEquip').addEventListener('click',equipSelected);$('#detailRemove').addEventListener('click',removeSelected);$('#detailRecharge').addEventListener('click',()=>window.JemmoWallet?.openRecharge?.());
  $('#storeWallet')?.addEventListener('click',()=>window.JemmoWallet?.open?.('summary'));$('#storeRecharge')?.addEventListener('click',()=>window.JemmoWallet?.openRecharge?.());
  window.addEventListener('jemmo-wallet-change',()=>{renderBalance();if(selectedItem)configureDetailActions(selectedItem)});window.addEventListener('jemmo-personalization-change',()=>renderAll());
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#storeDetail').hidden)closeDetail()});
}
async function boot(){
  bind();await loadPersonalization({cloud:true});renderAll();document.documentElement.classList.remove('jemmo-auth-pending');
  const pending=getPersonalization().pendingPurchase;if(pending)toast('Se revisó una compra pendiente anterior.');
}
boot().catch(error=>{console.error('JEMMO Universo boot',error);document.documentElement.classList.remove('jemmo-auth-pending');toast('JEMMO Universo está disponible en modo local.')});
