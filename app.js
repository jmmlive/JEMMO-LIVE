(() => {
  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const menu=qs('#sideMenu'), backdrop=qs('#menuBackdrop');
  const openMenu=()=>{menu?.classList.add('open');menu?.setAttribute('aria-hidden','false');if(backdrop){backdrop.hidden=false}};
  const closeMenu=()=>{menu?.classList.remove('open');menu?.setAttribute('aria-hidden','true');if(backdrop){backdrop.hidden=true}};
  qs('#menuOpen')?.addEventListener('click',openMenu); qs('#menuClose')?.addEventListener('click',closeMenu); backdrop?.addEventListener('click',closeMenu);
  const toast=(t)=>{const el=qs('#demoToast');if(!el)return;el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)};
  const routes=[
    {label:'Mi perfil',icon:'👤',terms:'perfil editar foto nombre biografia avatar apariencia',route:'yo.html'},
    {label:'Monedero',icon:'🟡',terms:'monedero saldo jemmos jems cristales dinero'},
    {label:'Recargar JEMMOS',icon:'🟡',terms:'recargar comprar jemmos moneda amarilla'},
    {label:'Retirar JEMS',icon:'🟣',terms:'retirar ganancias jems moneda rosada'},
    {label:'Intercambiar monedas',icon:'🔄',terms:'intercambiar convertir jemmos jems cristales'},
    {label:'Historial del monedero',icon:'📜',terms:'historial movimientos pagos monedero'},
    {label:'Iniciar LIVE',icon:'📹',terms:'live directo transmitir camara',route:'live.html'},
    {label:'Salas de audio',icon:'🎙️',terms:'salas audio microfono',route:'salas.html'},
    {label:'Mensajes',icon:'💬',terms:'mensajes chats soporte avisos',route:'mensajes.html'},
    {label:'Idioma',icon:'🌍',terms:'idioma lengua configuracion'},
    {label:'Seguridad y privacidad',icon:'🔒',terms:'seguridad privacidad bloquear cuenta ayuda'},
    {label:'Ayuda y soporte',icon:'❓',terms:'ayuda soporte problemas contacto'}
  ];
  const search=qs('#functionSearch'), menuList=qs('#menuList');
  let results=qs('#searchResults'); if(menu && !results){results=document.createElement('div');results.id='searchResults';results.className='search-results';menuList?.after(results)}
  const recentKey='jemmo_recent_functions';
  const recent=()=>{try{return JSON.parse(localStorage.getItem(recentKey)||'[]')}catch{return[]}};
  const saveRecent=(item)=>localStorage.setItem(recentKey,JSON.stringify([item,...recent().filter(x=>x.label!==item.label)].slice(0,5)));
  function activate(item){saveRecent(item);if(item.route) location.href=item.route; else toast(`${item.label}: pantalla preparada para la siguiente fase`)}
  function renderButtons(list,title){if(!results)return;results.innerHTML='';if(title&&list.length){const p=document.createElement('p');p.className='search-results-title';p.textContent=title;results.append(p)} list.forEach(item=>{const b=document.createElement('button');b.innerHTML=`<span>${item.icon}</span><b>${item.label}</b><i>›</i>`;b.onclick=()=>activate(item);results.append(b)})}
  function renderDefault(){menuList.hidden=false;const r=recent();renderButtons(r,'Accesos recientes')}
  search?.addEventListener('input',()=>{const term=search.value.trim().toLowerCase(); if(!term){renderDefault();return} menuList.hidden=true;const found=routes.filter(x=>(x.label+' '+x.terms).toLowerCase().includes(term));renderButtons(found,found.length?'Resultados':'');if(!found.length)results.innerHTML='<div class="empty-search">No se encontró esa función.</div>'});
  qsa('[data-route]').forEach(b=>b.addEventListener('click',()=>location.href=b.dataset.route));qsa('[data-demo]').forEach(b=>b.addEventListener('click',()=>toast(`${b.dataset.demo}: pantalla preparada`)));
  qs('#logoutButton')?.addEventListener('click',()=>{localStorage.removeItem('jemmo_session');location.href='acceso.html'});
  renderDefault();
  const sheet=qs('#walletSheet'); const openSheet=()=>sheet?.classList.add('open');
  qs('#walletPlus')?.addEventListener('click',openSheet);qsa('.wallet-token').forEach(x=>x.addEventListener('click',openSheet));qs('#walletClose')?.addEventListener('click',()=>sheet?.classList.remove('open'));qs('#rechargeDemo')?.addEventListener('click',()=>toast('Recarga de JEMMOS: próxima pantalla'));
  const nav=qs('.bottom-nav'); if(nav){const current=nav.dataset.current||'inicio';qsa('a',nav).forEach(a=>a.classList.toggle('active',a.dataset.tab===current));const active=qs('a.active',nav);if(active){const fish=document.createElement('img');fish.className='active-fish';fish.src='jemmo-logo-oficial.jpg';fish.alt='Pez JEMMO';active.append(fish)}}
})();
