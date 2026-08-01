(()=>{
  'use strict';
  if(window.__JEMMO_BATTLE_LIVE_58__)return;
  window.__JEMMO_BATTLE_LIVE_58__=true;

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
    {type:'gift',name:'💎 Rosa',text:'envió León de Oro a Casa Tenerife'},
    {type:'cheer',name:'🔥 TenerifeCrew',text:'¡Vamos Casa Tenerife! 💙💛'},
    {type:'cheer',name:'👑 UnicornioPower',text:'¡Vamos con todooo! 🦄'}
  ];
  const LIVE_MESSAGES=[
    {type:'cheer',name:'LunaJEMMO',text:'Esta batalla está muy igualada ✨'},
    {type:'gift',name:'Nayra',text:'envió Rosa JEMMO a Casa Unicornio 🌹'},
    {type:'cheer',name:'CanariasLive',text:'¡Tenerife sigue arriba! 👑'},
    {type:'gift',name:'LeoStar',text:'envió Corona Real a Casa Tenerife 👑'},
    {type:'cheer',name:'Mía',text:'Qué emoción, queda mucha batalla 💜'},
    {type:'gift',name:'UnicornioPower',text:'envió Estrella a Casa Unicornio ⭐'}
  ];
  const ACTIVITY=[
    'Rosa envió León de Oro a Casa Tenerife',
    'Casa Unicornio acaba de recibir una Estrella',
    'La ventaja cambia con cada regalo',
    'Apoya a tu Casa desde el botón de regalos'
  ];

  let countdownEnd=0;
  let viewerValue=1284;
  let incomingIndex=0;
  let activityIndex=0;
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
  const nowTime=()=>timeFormat.format(new Date());

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
    if(announce)pulseActivity(`${message.name}: ${message.text}`);
  }

  function resetChat(){
    if(!messages)return;
    messages.replaceChildren(...SEED_MESSAGES.map((message,index)=>buildMessage({...message,time:index===0?'18:04':index===1?'18:05':'18:06'})));
    messages.scrollTop=messages.scrollHeight;
    if(chatInput){chatInput.value='';chatInput.disabled=false}
  }

  function clearLegacyChat(){
    try{localStorage.removeItem('jemmo_battle_chat_v062')}catch{}
  }

  function pulseActivity(text){
    if(!activityText)return;
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
      pulseActivity('El marcador acaba de actualizarse');
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
      appendMessage(message);
      scheduleIncoming();
    },6500+Math.round(Math.random()*3500));
  }

  function rotateActivity(){
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
    appendMessage({type:'own',name:'Tú',text,own:true});
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
        if(node.textContent?.includes('enviaste'))pulseActivity(node.textContent.replace(/\s+/g,' ').trim());
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
  }

  chatForm?.addEventListener('submit',handleSubmit);
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
