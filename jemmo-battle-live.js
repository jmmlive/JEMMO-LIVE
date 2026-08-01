(()=>{
  'use strict';
  if(window.__JEMMO_BATTLE_LIVE_60__)return;
  window.__JEMMO_BATTLE_LIVE_60__=true;

  const panel=document.querySelector('.home-battle-lead');
  if(!panel)return;

  const board=panel.querySelector('.battle-board');
  const chatForm=panel.querySelector('#battleChatForm');
  const chatInput=panel.querySelector('#battleChatInput');
  const messages=panel.querySelector('#battleChatMessages');
  const countdown=panel.querySelector('#battleCountdown');
  const viewerCount=panel.querySelector('#battleViewerCount');
  const activityText=panel.querySelector('#battleActivityText');
  const progressFill=panel.querySelector('#battleProgressFill');
  const scoreTenerife=panel.querySelector('#battleScoreTenerife');
  const scoreUnicornio=panel.querySelector('#battleScoreUnicornio');
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  const numberFormat=new Intl.NumberFormat('es-ES');
  const timeFormat=new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',hour12:false});

  const SEED_MESSAGES=[
    {type:'cheer',name:'LunaJEMMO',text:'¡Qué buena está la batalla! ✨'},
    {type:'cheer',name:'TenerifeCrew',text:'Todavía queda mucho tiempo 💛'},
    {type:'cheer',name:'Mía',text:'Vamos a apoyar a nuestra Casa 💜'}
  ];
  const LIVE_MESSAGES=[
    {type:'cheer',name:'Nayra',text:'La diferencia puede cambiar en cualquier momento'},
    {type:'cheer',name:'CanariasLive',text:'¡Esto está cada vez más emocionante! 👑'},
    {type:'cheer',name:'UnicornioPower',text:'Seguimos apoyando hasta el final 🦄'},
    {type:'cheer',name:'LeoStar',text:'Que gane la Casa con más apoyo 🔥'},
    {type:'cheer',name:'Rosa',text:'Me encanta esta batalla 💜'}
  ];
  const ACTIVITY=[
    'Marcador oficial actualizado con regalos reales',
    'Toca una Casa o el regalo para apoyar',
    'Cada JEMMO enviado suma un punto a la Casa',
    'Los estados cambian automáticamente con el marcador'
  ];

  let countdownEnd=0;
  let viewerValue=1284;
  let incomingIndex=0;
  let activityIndex=0;
  let activityLockedUntil=0;
  let countdownTimer=0;
  let viewerTimer=0;
  let activityTimer=0;
  let particleTimer=0;
  let incomingTimer=0;
  let messageObserver=null;
  let scoreObserver=null;

  const formatClock=seconds=>{
    const safe=Math.max(0,Math.floor(seconds));
    const hours=String(Math.floor(safe/3600)).padStart(2,'0');
    const minutes=String(Math.floor((safe%3600)/60)).padStart(2,'0');
    const secs=String(safe%60).padStart(2,'0');
    return `${hours}:${minutes}:${secs}`;
  };
  const parseScore=element=>Math.max(0,Number(String(element?.textContent||'0').replace(/[^\d]/g,''))||0);
  const nowTime=date=>timeFormat.format(date||new Date());

  function buildMessage({type='cheer',name='',text='',own=false,time=nowTime()}){
    const row=document.createElement('p');
    row.className=`battle-message ${type}${own?' chat-own':''}`;
    if(own)row.dataset.localMessage='true';
    const author=document.createElement('b');
    author.textContent=own?'Tú: ':`${name}: `;
    const content=document.createElement('span');
    content.className='battle-message-text';
    content.textContent=text;
    const stamp=document.createElement('time');
    stamp.textContent=time;
    row.append(author,content,stamp);
    return row;
  }

  function trimMessages(){
    if(!messages)return;
    while(messages.children.length>12)messages.firstElementChild?.remove();
  }

  function appendMessage(message,{announce=true}={}){
    if(!messages)return;
    const row=buildMessage(message);
    messages.append(row);
    trimMessages();
    messages.scrollTo?.({top:messages.scrollHeight,behavior:reducedMotion?'auto':'smooth'});
    if(announce)pulseActivity('El chat público sigue activo');
  }

  function resetChat(){
    if(!messages)return;
    const now=Date.now();
    const rows=SEED_MESSAGES.map((message,index)=>buildMessage({...message,time:nowTime(new Date(now-(SEED_MESSAGES.length-index)*60000))}));
    messages.replaceChildren(...rows);
    messages.scrollTop=messages.scrollHeight;
    if(chatInput){chatInput.value='';chatInput.disabled=false}
  }

  function clearLegacyChat(){
    try{localStorage.removeItem('jemmo_battle_chat_v062')}catch{}
  }

  function pulseActivity(text,{lockMs=0}={}){
    if(!activityText)return;
    if(lockMs>0)activityLockedUntil=Math.max(activityLockedUntil,Date.now()+lockMs);
    activityText.textContent=text;
    activityText.classList.remove('activity-pop');
    void activityText.offsetWidth;
    activityText.classList.add('activity-pop');
  }

  function updateProgress(){
    if(!progressFill)return;
    const left=parseScore(scoreTenerife);
    const right=parseScore(scoreUnicornio);
    const total=left+right;
    const percentage=total?Math.max(6,Math.min(94,left/total*100)):50;
    progressFill.style.width=`${percentage.toFixed(2)}%`;
    progressFill.parentElement?.setAttribute('aria-valuenow',String(Math.round(percentage)));
    progressFill.parentElement?.setAttribute('aria-label',`Casa Tenerife ${numberFormat.format(left)} puntos; Casa Unicornio ${numberFormat.format(right)} puntos`);
  }

  function watchScores(){
    scoreObserver?.disconnect();
    scoreObserver=new MutationObserver(records=>{
      records.forEach(record=>{
        const element=record.target.nodeType===Node.TEXT_NODE?record.target.parentElement:record.target;
        const score=element?.closest?.('.house strong')||element;
        score?.classList?.remove('score-pop');
        if(score){void score.offsetWidth;score.classList.add('score-pop')}
      });
      updateProgress();
    });
    [scoreTenerife,scoreUnicornio].forEach(element=>element&&scoreObserver.observe(element,{childList:true,characterData:true,subtree:true}));
    updateProgress();
  }

  function renderCountdown(){
    if(!countdown)return;
    const remaining=Math.ceil((countdownEnd-Date.now())/1000);
    countdown.textContent=remaining>0?formatClock(remaining):'FINALIZANDO';
    countdown.classList.toggle('ending',remaining>0&&remaining<=300);
  }

  function startCountdown(){
    clearInterval(countdownTimer);
    const seconds=Math.max(1,Number(countdown?.dataset.seconds)||24135);
    countdownEnd=Date.now()+seconds*1000;
    renderCountdown();
    countdownTimer=window.setInterval(renderCountdown,1000);
  }

  function updateViewers(){
    viewerValue=Math.max(1265,Math.min(1305,viewerValue+Math.floor(Math.random()*7)-3));
    if(viewerCount)viewerCount.textContent=numberFormat.format(viewerValue);
  }

  function addParticle(){
    if(reducedMotion||!board||document.hidden)return;
    const particle=document.createElement('span');
    particle.className='battle-float-particle';
    particle.textContent=['J','✦','◆','J'][Math.floor(Math.random()*4)];
    particle.style.setProperty('--particle-x',`${10+Math.random()*80}%`);
    particle.style.setProperty('--particle-drift',`${Math.round(Math.random()*70-35)}px`);
    particle.style.setProperty('--particle-duration',`${2.8+Math.random()*1.8}s`);
    board.append(particle);
    particle.addEventListener('animationend',()=>particle.remove(),{once:true});
  }

  function scheduleIncoming(){
    clearTimeout(incomingTimer);
    if(document.hidden)return;
    incomingTimer=window.setTimeout(()=>{
      const message=LIVE_MESSAGES[incomingIndex++%LIVE_MESSAGES.length];
      appendMessage(message,{announce:false});
      scheduleIncoming();
    },6500+Math.round(Math.random()*3500));
  }

  function rotateActivity(){
    if(Date.now()<activityLockedUntil)return;
    pulseActivity(ACTIVITY[activityIndex++%ACTIVITY.length]);
  }

  function startAmbient(){
    clearInterval(viewerTimer);
    clearInterval(activityTimer);
    clearInterval(particleTimer);
    updateViewers();
    viewerTimer=window.setInterval(updateViewers,4200);
    activityTimer=window.setInterval(rotateActivity,5200);
    if(!reducedMotion){
      particleTimer=window.setInterval(addParticle,2800);
      setTimeout(addParticle,650);
    }
    scheduleIncoming();
  }

  function stopAmbient(){
    clearInterval(viewerTimer);
    clearInterval(activityTimer);
    clearInterval(particleTimer);
    clearTimeout(incomingTimer);
  }

  function stopAll(){
    stopAmbient();
    clearInterval(countdownTimer);
  }

  function handleSubmit(event){
    event.preventDefault();
    const text=chatInput?.value.trim();
    if(!text){chatInput?.focus();return}
    appendMessage({type:'own',name:'Tú',text,own:true},{announce:false});
    pulseActivity('Tu mensaje se publicó en el chat',{lockMs:3500});
    chatInput.value='';
    chatInput.focus();
  }

  function watchMessages(){
    messageObserver?.disconnect();
    if(!messages)return;
    messageObserver=new MutationObserver(records=>{
      records.flatMap(record=>[...record.addedNodes]).forEach(node=>{
        if(!(node instanceof HTMLElement)||node.tagName!=='P')return;
        node.classList.add('battle-message','message-enter');
        setTimeout(()=>node.classList.remove('message-enter'),500);
      });
      trimMessages();
      messages.scrollTop=messages.scrollHeight;
    });
    messageObserver.observe(messages,{childList:true});
  }

  function restartPageSession(){
    stopAll();
    clearLegacyChat();
    resetChat();
    startCountdown();
    startAmbient();
    updateProgress();
    pulseActivity('Marcador oficial listo para recibir regalos');
  }

  chatForm?.addEventListener('submit',handleSubmit);
  window.addEventListener('jemmo-battle-gift-sent',event=>{
    const detail=event.detail||{};
    pulseActivity(`Tú enviaste ${detail.giftName||'un regalo'} ×${detail.quantity||1} a ${detail.houseName||'la Casa'}`,{lockMs:10000});
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){stopAmbient();return}
    startAmbient();
    renderCountdown();
  });
  window.addEventListener('pagehide',()=>{
    stopAll();
    if(messages)messages.replaceChildren();
    if(chatInput)chatInput.value='';
  });
  window.addEventListener('pageshow',event=>{
    if(event.persisted)restartPageSession();
  });

  watchMessages();
  watchScores();
  restartPageSession();
})();
