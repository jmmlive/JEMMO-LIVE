(()=>{
  'use strict';
  const DURATION_MS=4600;
  const EXIT_MS=430;
  const app=document.getElementById('entryApp');
  const poster=document.getElementById('entryPoster');
  const particles=document.getElementById('entryParticles');
  const progress=document.querySelector('.entry-progress');
  const status=document.getElementById('entryStatus');
  let finished=false;
  let startAt=performance.now();

  const readUid=()=>{
    try{const value=localStorage.getItem('jemmo_active_uid');if(value)return value}catch{}
    try{return sessionStorage.getItem('jemmo_active_uid')||''}catch{return''}
  };
  const clearTransition=()=>{
    try{sessionStorage.removeItem('jemmo_auth_transition')}catch{}
  };
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
    for(let index=0;index<24;index+=1){
      const dot=document.createElement('i');
      dot.className='entry-particle';
      dot.style.setProperty('--x',`${4+Math.random()*92}%`);
      dot.style.setProperty('--y',`${18+Math.random()*72}%`);
      dot.style.setProperty('--s',`${2+Math.random()*5}px`);
      dot.style.setProperty('--d',`${2.2+Math.random()*2.7}s`);
      dot.style.setProperty('--delay',`${Math.random()*2.4}s`);
      dot.style.setProperty('--dx',`${-34+Math.random()*68}px`);
      fragment.appendChild(dot);
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
        window.setTimeout(resolve,900);
      });

  imageReady.then(()=>requestAnimationFrame(begin));
  window.setTimeout(()=>{if(!finished&&performance.now()-startAt>DURATION_MS+1400)finish()},DURATION_MS+1600);
  window.addEventListener('pageshow',event=>{if(event.persisted)routeToHome()});
})();
