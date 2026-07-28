(()=>{
  'use strict';
  if(window.__JEMMO_PWA_REGISTER_45__)return;
  window.__JEMMO_PWA_REGISTER_45__=true;
  const RELEASE='pwa-official-center-financial-security-45';
  let installPrompt=null;
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const storage={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch{try{sessionStorage.setItem(k,v);return true}catch{return false}}}};
  function showInstallHelp(message){
    const existing=document.getElementById('jemmoInstallHelp45');existing?.remove();
    const el=document.createElement('div');el.id='jemmoInstallHelp45';el.style.cssText='position:fixed;z-index:50000;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(92vw,440px);padding:12px 14px;border:1px solid #b946e8;border-radius:15px;background:#17021eee;color:#fff;font:700 12px/1.4 system-ui;box-shadow:0 12px 36px #000c;text-align:center';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),4200)
  }
  function bindInstallButtons(){document.querySelectorAll('[data-install-jemmo]').forEach(button=>{button.hidden=false;button.disabled=false;if(isStandalone())button.textContent='✓ JEMMO LIVE YA ESTÁ INSTALADA';else if(installPrompt)button.textContent='⬇ INSTALAR JEMMO LIVE';else button.textContent='📲 CÓMO INSTALAR JEMMO LIVE'})}
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;bindInstallButtons();window.dispatchEvent(new Event('jemmo-install-ready'))});
  document.addEventListener('click',async event=>{const button=event.target.closest('[data-install-jemmo]');if(!button)return;event.preventDefault();if(isStandalone())return showInstallHelp('La aplicación ya está abierta en modo instalado.');if(!window.isSecureContext||location.protocol==='file:')return showInstallHelp('JEMMO LIVE debe estar publicada mediante HTTPS para instalarse.');if(!installPrompt)return showInstallHelp('Abre el menú de Chrome y toca “Instalar aplicación” o “Añadir a pantalla de inicio”.');button.disabled=true;try{await installPrompt.prompt();await installPrompt.userChoice}finally{installPrompt=null;bindInstallButtons()}});
  window.addEventListener('appinstalled',()=>{installPrompt=null;bindInstallButtons()});
  function loadHousePet(){
    const path=location.pathname.toLowerCase();const search=location.search.toLowerCase();const relevant=path.endsWith('/salas.html')||path.endsWith('salas.html')||path.endsWith('/casa-demo.html')||path.endsWith('casa-demo.html')||search.includes('houseroom=1')||search.includes('house=');if(!relevant)return;
    if(!document.querySelector('link[data-jemmo-house-pet]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./jemmo-house-pet.css?v=45';link.dataset.jemmoHousePet='45';document.head.appendChild(link)}
    if(!document.querySelector('script[data-jemmo-house-pet]')){const script=document.createElement('script');script.src='./jemmo-house-pet.js?v=45';script.defer=true;script.dataset.jemmoHousePet='45';script.onerror=()=>console.warn('JEMMO Mascota: no se pudo cargar el módulo.');document.head.appendChild(script)}
  }
  if('serviceWorker'in navigator&&location.protocol!=='file:'){
    window.addEventListener('load',async()=>{try{const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});registration.update().catch(()=>{});if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)worker.postMessage({type:'SKIP_WAITING'})})})}catch(error){console.error('JEMMO service worker:',error)}});
    navigator.serviceWorker.addEventListener('controllerchange',()=>{const key=`jemmo_sw_reload_${RELEASE}`;if(storage.get(key))return;storage.set(key,'1');location.reload()})
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bindInstallButtons();loadHousePet()},{once:true});else{bindInstallButtons();loadHousePet()}
})();
