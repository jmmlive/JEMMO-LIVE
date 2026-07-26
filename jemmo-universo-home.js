/* JEMMO LIVE V1 · JEMMO UNIVERSO EN INICIO PRUEBA 19 */
import { PERSONALIZATION_CATALOG, GIFT_CATALOG, formatJemmos } from './jemmo-store-catalog.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const href=item=>`jemmo-universo.html?category=${encodeURIComponent(item.category)}&item=${encodeURIComponent(item.id)}`;
function renderPopular(){
  const host=$('homeUniversePopular');if(!host)return;
  const preferred=['theme-noche-chicharrera','bubble-brillo-malva','avatar-frame-pulso','chair-frame-neon','entrance-wave'];
  const items=preferred.map(id=>PERSONALIZATION_CATALOG.find(item=>item.id===id)).filter(Boolean);
  host.innerHTML=items.map(item=>`<a class="home-universe-item" href="${href(item)}"><span>${item.icon}</span><b>${esc(item.name)}</b><small>${formatJemmos(item.price)} JEMMOS</small></a>`).join('');
}
function renderGifts(){
  const host=$('homeUniverseGifts');if(!host)return;
  host.innerHTML=GIFT_CATALOG.slice(0,6).map(item=>`<a class="home-universe-gift" href="${href(item)}"><span>${item.icon}</span><b>${esc(item.name)}</b><small>${formatJemmos(item.price)} J</small></a>`).join('');
}
function renderBalance(){const node=$('homeUniverseBalance');if(node)node.textContent=`${formatJemmos(window.JemmoWallet?.get?.()?.jemmos||0)} JEMMOS`}
renderPopular();renderGifts();renderBalance();
window.addEventListener('jemmo-wallet-change',renderBalance);
window.addEventListener('pageshow',renderBalance);
