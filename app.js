(()=>{
 const qs=(s,r=document)=>r.querySelector(s),qsa=(s,r=document)=>[...r.querySelectorAll(s)];
 const menu=qs('#sideMenu'),backdrop=qs('#menuBackdrop'),sheet=qs('#walletSheet');
 const openMenu=()=>{menu?.classList.add('open');menu?.setAttribute('aria-hidden','false');if(backdrop)backdrop.hidden=false};
 const closeMenu=()=>{menu?.classList.remove('open');menu?.setAttribute('aria-hidden','true');if(backdrop)backdrop.hidden=true};
 const openWallet=()=>{sheet?.classList.add('open');sheet?.setAttribute('aria-hidden','false');if(backdrop)backdrop.hidden=false};
 const closeWallet=()=>{sheet?.classList.remove('open');sheet?.setAttribute('aria-hidden','true');if(!menu?.classList.contains('open')&&backdrop)backdrop.hidden=true};
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
 const nav=qs('.bottom-nav');if(nav){const current=nav.dataset.current||'inicio';qsa('a',nav).forEach(a=>a.classList.toggle('active',a.dataset.tab===current));const active=qs('a.active',nav);if(active&&!qs('.active-fish',active)){const fish=document.createElement('img');fish.className='active-fish';fish.src='jemmo-fish-nav.webp';fish.alt='Pez JEMMO';active.append(fish)}qsa('a',nav).forEach(a=>a.addEventListener('click',e=>{if(a.classList.contains('active'))return;e.preventDefault();qsa('a',nav).forEach(x=>x.classList.remove('active'));a.classList.add('active');const old=qs('.active-fish',nav);old?.remove();const fish=document.createElement('img');fish.className='active-fish';fish.src='jemmo-fish-nav.webp';fish.alt='Pez JEMMO';a.append(fish);setTimeout(()=>location.href=a.href,180)}))}
})();

/* v0.6.1 · chat público funcional de la batalla */
(()=>{
 const form=document.querySelector('#battleChatForm');
 if(!form)return;
 const list=document.querySelector('#battleChatMessages');
 const input=document.querySelector('#battleChatInput');
 const gift=document.querySelector('#battleGift');
 const teamButtons=[...document.querySelectorAll('.support-team')];
 const storageKey='jemmo_battle_chat_v061';
 let team='gold';
 const escapeHtml=(value)=>value.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
 const now=()=>new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
 const append=(text,side='neutral',save=true)=>{
   const p=document.createElement('p');p.className=side;
   p.innerHTML=`<b>Tú</b>: ${escapeHtml(text)} <time>${now()}</time>`;
   list.append(p);list.scrollTop=list.scrollHeight;
   if(save){
     let saved=[];try{saved=JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{}
     saved.push({text,side,time:Date.now()});localStorage.setItem(storageKey,JSON.stringify(saved.slice(-20)));
   }
 };
 try{JSON.parse(localStorage.getItem(storageKey)||'[]').slice(-8).forEach(m=>append(m.text,m.side,false))}catch{}
 teamButtons.forEach(btn=>btn.addEventListener('click',()=>{
   team=btn.dataset.team;teamButtons.forEach(b=>{const on=b===btn;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
 }));
 form.addEventListener('submit',e=>{e.preventDefault();const text=input.value.trim();if(!text)return;append(text,team==='gold'?'team-gold':'team-pink');input.value='';input.focus()});
 gift?.addEventListener('click',()=>append(team==='gold'?'🎁 envió una Rosa a Casa Tenerife':'🎁 envió una Rosa a Casa Unicornio',team==='gold'?'team-gold':'team-pink'));
 const demo=[
  ['Lucía','Hoy gana Unicornio 🦄','team-pink'],['Carlos','¡Vamos Casa Tenerife! 🔥','team-gold'],['Nerea','Esto se está poniendo bueno 😄','neutral'],['David','A ver quién remonta ahora','neutral']
 ];
 let index=0;
 setInterval(()=>{
   if(document.hidden||!list)return;
   const [name,text,side]=demo[index++%demo.length];const p=document.createElement('p');p.className=side;p.innerHTML=`<b>${name}</b>: ${text} <time>${now()}</time>`;list.append(p);while(list.children.length>24)list.firstElementChild.remove();list.scrollTop=list.scrollHeight;
 },16000);
})();
