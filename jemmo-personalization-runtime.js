/* JEMMO LIVE V1 · UNIVERSO EQUIPADO Y MODERACIÓN DE SALAS PRUEBA 20 */
import { loadPersonalization, getPersonalization, applyEquippedToRoot } from './jemmo-personalization.js';
let booted=false;
function apply(state=getPersonalization()){
  const equipped=applyEquippedToRoot(document.documentElement,state);
  document.documentElement.classList.add('jemmo-personalization-ready');
  window.dispatchEvent(new CustomEvent('jemmo-personalization-applied',{detail:{state,equipped}}));
  return equipped;
}
async function boot(){
  if(booted)return apply();
  booted=true;
  try{return apply(await loadPersonalization({cloud:true}))}
  catch(error){console.warn('[JEMMO personalización] No se pudo cargar el equipamiento.',error);return apply()}
}
window.addEventListener('jemmo-personalization-change',event=>apply(event.detail?.state));
window.addEventListener('pageshow',()=>void boot());
window.JemmoPersonalizationRuntime={boot,apply};
void boot();
