(()=>{
 const qs=(s,r=document)=>r.querySelector(s),qsa=(s,r=document)=>[...r.querySelectorAll(s)];
 const menu=qs('#sideMenu'),backdrop=qs('#menuBackdrop'),sheet=qs('#walletSheet');
 const openMenu=()=>{menu?.classList.add('open');menu?.setAttribute('aria-hidden','false');if(backdrop)backdrop.hidden=false};
 const closeMenu=()=>{menu?.classList.remove('open');menu?.setAttribute('aria-hidden','true');if(backdrop)backdrop.hidden=true};
 let walletScrollY=0;
 const lockWalletScroll=()=>{walletScrollY=window.scrollY||document.documentElement.scrollTop||0;document.documentElement.classList.add('wallet-locked');document.body.classList.add('wallet-locked');document.body.style.top=`-${walletScrollY}px`};
 const unlockWalletScroll=()=>{document.documentElement.classList.remove('wallet-locked');document.body.classList.remove('wallet-locked');document.body.style.top='';window.scrollTo(0,walletScrollY)};
 const openWallet=()=>{if(sheet?.classList.contains('open'))return;lockWalletScroll();sheet?.classList.add('open');sheet?.setAttribute('aria-hidden','false');if(backdrop)backdrop.hidden=false};
 const closeWallet=()=>{if(!sheet?.classList.contains('open'))return;sheet?.classList.remove('open');sheet?.setAttribute('aria-hidden','true');unlockWalletScroll();if(!menu?.classList.contains('open')&&backdrop)backdrop.hidden=true};
 qs('#menuOpen')?.addEventListener('click',openMenu);qs('#menuClose')?.addEventListener('click',closeMenu);qs('#walletClose')?.addEventListener('click',closeWallet);qs('#walletPlus')?.addEventListener('click',openWallet);qsa('.wallet-token').forEach(b=>b.addEventListener('click',openWallet));
 backdrop?.addEventListener('click',()=>{closeMenu();closeWallet()});
 const toast=t=>{const el=qs('#demoToast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(window.__jemmoToast);window.__jemmoToast=setTimeout(()=>el.classList.remove('show'),1800)};
 const functions=[
  {label:'Mi perfil',icon:'👤',terms:'perfil editar foto nombre biografia avatar apariencia',route:'yo.html'},
  {label:'Monedero',icon:'🪙',terms:'monedero saldo dinero monedas jemmos jems cristales',action:'wallet'},
  {label:'Recargar JEMMOS',icon:'🟡',terms:'recargar comprar jemmos moneda amarilla',action:'wallet'},
  {label:'Retirar JEMS',icon:'🟣',terms:'retirar ganancias jems moneda rosada',action:'wallet'},
  {label:'Intercambiar monedas',icon:'⇄',terms:'intercambiar convertir jemmos jems cristales',action:'wallet'},
  {label:'Historial del monedero',icon:'📜',terms:'historial movimientos pagos monedero',action:'wallet'},
  {label:'Iniciar LIVE',icon:'📹',terms:'live directo transmitir camara',route:'live.html'},
  {label:'Salas de audio',icon:'🎙️',terms:'salas audio microfono',route:'salas.html'},
  {label:'Mensajes',icon:'💬',terms:'mensajes chats soporte avisos',route:'mensajes.html'},
  {label:'Idioma',icon:'🌍',terms:'idioma lengua configuracion',demo:'Idioma'},
  {label:'Seguridad y privacidad',icon:'🔒',terms:'seguridad privacidad bloquear cuenta ayuda',demo:'Seguridad y privacidad'},
  {label:'Ayuda y soporte',icon:'❓',terms:'ayuda soporte problemas contacto',demo:'Ayuda y soporte'}
 ];
 const recentKey='jemmo_recent_functions_v06';
 const getRecent=()=>{try{return JSON.parse(localStorage.getItem(recentKey)||'[]')}catch{return[]}};
 const saveRecent=item=>{const clean={label:item.label,icon:item.icon,route:item.route||'',action:item.action||'',demo:item.demo||''};localStorage.setItem(recentKey,JSON.stringify([clean,...getRecent().filter(x=>x.label!==item.label)].slice(0,5)))};
 const activate=item=>{saveRecent(item);if(item.route){location.href=item.route;return}if(item.action==='wallet'){closeMenu();openWallet();return}toast(`${item.demo||item.label}: preparada para la siguiente fase`)};
 const search=qs('#functionSearch'),menuList=qs('#menuList'),results=qs('#searchResults');
 const render=list=>{if(!results)return;results.innerHTML='';if(!list.length)return;const title=document.createElement('p');title.className='search-results-title';title.textContent=search?.value.trim()?'Resultados':'Accesos recientes';results.append(title);list.forEach(item=>{const b=document.createElement('button');b.innerHTML=`<span>${item.icon}</span><b>${item.label}</b><i>›</i>`;b.addEventListener('click',()=>activate(item));results.append(b)})};
 const renderDefault=()=>{if(menuList)menuList.hidden=false;render(getRecent())};
 search?.addEventListener('input',()=>{const term=search.value.trim().toLocaleLowerCase('es');if(!term){renderDefault();return}if(menuList)menuList.hidden=true;const found=functions.filter(x=>`${x.label} ${x.terms}`.toLocaleLowerCase('es').includes(term));if(found.length)render(found);else results.innerHTML='<div class="empty-search">No se encontró esa función.</div>'});
 qsa('[data-route]').forEach(b=>b.addEventListener('click',()=>location.href=b.dataset.route));qsa('[data-demo]').forEach(b=>b.addEventListener('click',()=>toast(`${b.dataset.demo}: preparada para la siguiente fase`)));qsa('[data-action="wallet"]').forEach(b=>b.addEventListener('click',()=>{closeMenu();openWallet()}));
 qs('#logoutButton')?.addEventListener('click',async()=>{try{const [{initializeApp,getApps},{getAuth,signOut}]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js')]);const config={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};const app=getApps()[0]||initializeApp(config);await signOut(getAuth(app))}catch(e){}localStorage.removeItem('jemmo_session');sessionStorage.clear();location.replace('acceso.html')});
 renderDefault();

 // v0.6.2 · Chat local funcional de la batalla.
 // Esta fase permite escribir, enviar y conservar los mensajes en este dispositivo.
 const chatForm=qs('#battleChatForm'),chatInput=qs('#battleChatInput'),chatMessages=qs('#battleChatMessages');
 const chatKey='jemmo_battle_chat_v062';
 const formatTime=()=>new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
 const createChatMessage=(text,time=formatTime())=>{
  if(!chatMessages)return;
  const row=document.createElement('p');
  row.className='chat-own';
  const name=document.createElement('b');
  name.textContent='Tú: ';
  const message=document.createTextNode(text);
  const stamp=document.createElement('time');
  stamp.textContent=time;
  row.append(name,message,stamp);
  chatMessages.append(row);
  chatMessages.scrollTop=chatMessages.scrollHeight;
 };
 const loadChat=()=>{try{JSON.parse(localStorage.getItem(chatKey)||'[]').slice(-20).forEach(item=>createChatMessage(item.text,item.time))}catch{localStorage.removeItem(chatKey)}};
 const saveChat=(text,time)=>{try{const saved=JSON.parse(localStorage.getItem(chatKey)||'[]');saved.push({text,time});localStorage.setItem(chatKey,JSON.stringify(saved.slice(-20)))}catch{}};
 chatForm?.addEventListener('submit',event=>{
  event.preventDefault();
  const text=chatInput?.value.trim();
  if(!text){chatInput?.focus();return}
  const time=formatTime();
  createChatMessage(text,time);
  saveChat(text,time);
  chatInput.value='';
  chatInput.focus();
 });
 loadChat();

 const nav=qs('.bottom-nav');
 const playBubble=()=>{
  if(localStorage.getItem('jemmo_nav_sound')==='off')return;
  try{
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)return;
   const ctx=window.__jemmoAudio||(window.__jemmoAudio=new AC());
   if(ctx.state==='suspended')ctx.resume();
   const now=ctx.currentTime;
   [0,.085].forEach((delay,index)=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='sine';
    osc.frequency.setValueAtTime(index?610:540,now+delay);
    osc.frequency.exponentialRampToValueAtTime(index?300:260,now+delay+.12);
    gain.gain.setValueAtTime(.0001,now+delay);
    gain.gain.exponentialRampToValueAtTime(.035,now+delay+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,now+delay+.14);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(now+delay);osc.stop(now+delay+.15);
   });
  }catch(_){ }
 };
 if(nav){
  const current=nav.dataset.current||'inicio';
  const links=qsa('a',nav);
  links.forEach(a=>{
   a.classList.toggle('active',a.dataset.tab===current);
   if(!qs('.nav-fish',a)){
    const fish=document.createElement('img');
    fish.className='nav-fish';fish.src='jemmo-fish-nav.webp';fish.alt='Pez JEMMO';
    const icon=qs('.nav-icon',a);a.insertBefore(fish,icon||a.firstChild);
   }
  });
  links.forEach(a=>a.addEventListener('click',e=>{
   if(a.classList.contains('active')){playBubble();return}
   e.preventDefault();playBubble();
   links.forEach(x=>x.classList.remove('active'));a.classList.add('active');
   setTimeout(()=>location.href=a.href,230);
  }))
 }
})();
