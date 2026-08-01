(()=>{
  'use strict';
  const DURATION_MS=4600;
  const EXIT_MS=430;
  const poster=document.getElementById('entryPoster');
  const particles=document.getElementById('entryParticles');
  const progress=document.getElementById('entryProgress');
  const status=document.getElementById('entryStatus');
  let finished=false;
  let startAt=performance.now();

  const readUid=()=>{
    try{const value=localStorage.getItem('jemmo_active_uid');if(value)return value}catch{}
    try{return sessionStorage.getItem('jemmo_active_uid')||''}catch{return''}
  };
  const clearTransition=()=>{try{sessionStorage.removeItem('jemmo_auth_transition')}catch{}};
  const routeToAccess=()=>location.replace('acceso.html?sesion=requerida');
  const routeToHome=()=>location.replace('inicio.html?entrada=1');

  if(!readUid()){
    clearTransition();
    routeToAccess();
    return;
  }
  clearTransition();

  function createParticles(){
    if(!particles||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const fragment=document.createDocumentFragment();
    for(let index=0;index<20;index+=1){
      const isJ=index%3===0;
      const item=document.createElement(isJ?'b':'i');
      item.className=isJ?'entry-j':'entry-particle';
      if(isJ)item.textContent='J';
      item.style.setProperty('--x',`${3+Math.random()*94}%`);
      item.style.setProperty('--y',`${isJ?32+Math.random()*58:15+Math.random()*74}%`);
      item.style.setProperty('--s',`${isJ?18+Math.random()*14:2+Math.random()*5}px`);
      item.style.setProperty('--d',`${isJ?2.9+Math.random()*2.2:2.2+Math.random()*2.7}s`);
      item.style.setProperty('--delay',`${Math.random()*2.2}s`);
      item.style.setProperty('--dx',`${-42+Math.random()*84}px`);
      fragment.appendChild(item);
    }
    particles.appendChild(fragment);
  }

  function updateProgress(now){
    if(finished)return;
    const elapsed=Math.max(0,now-startAt);
    const percent=Math.min(100,Math.round(elapsed/DURATION_MS*100));
    progress?.setAttribute('aria-valuenow',String(percent));
    if(percent<100)requestAnimationFrame(updateProgress);
  }

  function finish(){
    if(finished)return;
    finished=true;
    progress?.setAttribute('aria-valuenow','100');
    if(status)status.textContent='Abriendo JEMMO LIVE';
    document.body.classList.add('entry-leaving');
    window.setTimeout(routeToHome,EXIT_MS);
  }

  function begin(){
    startAt=performance.now();
    createParticles();
    requestAnimationFrame(updateProgress);
    window.setTimeout(finish,DURATION_MS);
  }

  const imageReady=poster?.complete
    ? Promise.resolve()
    : new Promise(resolve=>{
        poster?.addEventListener('load',resolve,{once:true});
        poster?.addEventListener('error',resolve,{once:true});
        window.setTimeout(resolve,1000);
      });

  imageReady.then(()=>requestAnimationFrame(begin));
  window.setTimeout(()=>{if(!finished&&performance.now()-startAt>DURATION_MS+1400)finish()},DURATION_MS+1700);
  window.addEventListener('pageshow',event=>{if(event.persisted)routeToHome()});
})();
