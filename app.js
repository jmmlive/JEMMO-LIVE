(()=>{
const ICONS={menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',close:'<path d="M18 6 6 18M6 6l12 12"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',wallet:'<path d="M3 7h15a3 3 0 0 1 3 3v8H6a3 3 0 0 1-3-3V7Z"/><path d="M3 7a3 3 0 0 1 3-3h11v3M16 12h5"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1H9.6V21a1.7 1.7 0 0 0-.4-1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.8 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H2V9.6h.2a1.7 1.7 0 0 0 1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.2 3.8a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V2h4v.2a1.7 1.7 0 0 0 .4 1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.2c.1.4.3.8.6 1 .3.3.6.4 1 .4h.1v4H21a1.7 1.7 0 0 0-1 .4c-.3.2-.5.6-.6 1Z"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.7 2c-1 .7-1.5 1.1-1.5 2.3M12 17h.01"/>',logout:'<path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',video:'<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2"/>',mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-5A7 7 0 0 1 3 13V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',crown:'<path d="m3 7 4 4 5-7 5 7 4-4-2 11H5L3 7Z"/><path d="M5 21h14"/>',gift:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8H7.5A2.5 2.5 0 1 1 10 5.5L12 8Zm0 0h4.5A2.5 2.5 0 1 0 14 5.5L12 8Z"/>',chat:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-5A7 7 0 0 1 3 13V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',gem:'<path d="m12 3 4 4-4 14L8 7l4-4Z"/><path d="M3 7h18l-9 14L3 7Z"/>',flame:'<path d="M12 22c4 0 7-3 7-7 0-5-4-7-3-12-4 2-7 6-7 10-1-1-2-3-1-5-3 2-4 5-4 8 0 3 3 6 8 6Z"/>',badge:'<path d="M12 2 9.5 5 6 4.5 5.5 8 2 10l2 3-1 3.5 3.5.5L8 21l4-2 4 2 1.5-4 3.5-.5L20 13l2-3-3.5-2-.5-3.5-3.5.5L12 2Z"/><path d="m9 12 2 2 4-4"/>'};
const svg=n=>`<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||ICONS.home}</svg>`;
const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const menu=qs('#sideMenu'),back=qs('#menuBackdrop');
let lockedScrollY=0;
function lockPage(){
  if(document.body.classList.contains('ui-locked')) return;
  lockedScrollY=window.scrollY||document.documentElement.scrollTop||0;
  document.body.style.top=`-${lockedScrollY}px`;
  document.body.classList.add('ui-locked');
}
function unlockPage(){
  if(!document.body.classList.contains('ui-locked')) return;
  document.body.classList.remove('ui-locked');
  document.body.style.top='';
  window.scrollTo(0,lockedScrollY);
}
function openMenu(){if(!menu)return;menu.classList.add('open');menu.setAttribute('aria-hidden','false');if(back)back.hidden=false;lockPage()}
function closeMenu(){if(!menu)return;menu.classList.remove('open');menu.setAttribute('aria-hidden','true');if(back)back.hidden=true;if(!wallet?.classList.contains('open'))unlockPage()}
qs('#menuOpen')?.addEventListener('click',openMenu);qs('#menuClose')?.addEventListener('click',closeMenu);back?.addEventListener('click',closeMenu);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
if(qs('#menuOpen')) qs('#menuOpen').innerHTML=svg('menu');if(qs('#menuClose')) qs('#menuClose').innerHTML=svg('close');
const searchWrap=qs('.function-search span');if(searchWrap)searchWrap.innerHTML=svg('search');
const menuButtons=qsa('#menuList button');const menuIconNames=['user','wallet','settings','help','logout'];menuButtons.forEach((b,i)=>{const s=b.querySelector('span');if(s)s.outerHTML=svg(menuIconNames[i]||'home');b.addEventListener('click',()=>{if(b.dataset.route)location.href=b.dataset.route;else if(b.dataset.action==='wallet'){closeMenu();openWallet()}else if(b.id==='logoutButton')logout();else toast(`${b.dataset.demo||b.querySelector('b')?.textContent}: próximamente`)})});
const navIcons={inicio:'home',live:'video',salas:'mic',mensajes:'message',yo:'user'};qsa('.bottom-nav a').forEach(a=>{const tab=a.dataset.tab;const n=a.querySelector('.nav-icon');if(n)n.innerHTML=svg(navIcons[tab]);if(tab===a.closest('.bottom-nav')?.dataset.current)a.classList.add('active')});
const wallet=qs('#walletSheet'),walletBack=qs('#walletBackdrop');
function openWallet(){if(!wallet)return;wallet.classList.add('open');wallet.setAttribute('aria-hidden','false');if(walletBack)walletBack.hidden=false;lockPage()}
function closeWallet(){if(!wallet)return;wallet.classList.remove('open');wallet.setAttribute('aria-hidden','true');if(walletBack)walletBack.hidden=true;if(!menu?.classList.contains('open'))unlockPage()}
qs('#walletPlus')?.addEventListener('click',openWallet);qsa('[data-wallet]').forEach(b=>b.addEventListener('click',openWallet));qs('#walletClose')?.addEventListener('click',closeWallet);walletBack?.addEventListener('click',closeWallet);qsa('[data-action="wallet"]').forEach(b=>b.addEventListener('click',openWallet));
function toast(t){const el=qs('#demoToast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2100)}qsa('[data-demo]').forEach(b=>b.addEventListener('click',()=>toast(`${b.dataset.demo}: próximamente`)));
async function logout(){try{if(window.firebase?.auth)await firebase.auth().signOut()}catch{}localStorage.removeItem('jemmo_session');location.href='acceso.html'}qs('#logoutButton')?.addEventListener('click',logout);
const input=qs('#functionSearch'),results=qs('#searchResults');const options=[['Mi perfil','yo.html','user'],['Monedero','wallet','wallet'],['Iniciar LIVE','live.html','video'],['Salas de audio','salas.html','mic'],['Mensajes','mensajes.html','message'],['Configuración','demo','settings'],['Ayuda y soporte','demo','help']];if(input&&results){input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();results.innerHTML='';if(!q)return;options.filter(x=>x[0].toLowerCase().includes(q)).forEach(([label,target,icon])=>{const b=document.createElement('button');b.innerHTML=`${svg(icon)}<b>${label}</b><i>›</i>`;b.onclick=()=>target==='wallet'?openWallet():target==='demo'?toast(`${label}: próximamente`):location.href=target;results.appendChild(b)})})}
// Replace remaining generic emoji markers on Inicio with vector icons or clean initials.
qsa('.battle-panel .section-title h2').forEach(h=>{h.innerHTML=`${svg('crown')} BATALLA DE CASAS DESTACADA`});
qsa('.crest').forEach((c,i)=>{c.innerHTML=`${svg('crown')}<span>${i===0?'JT':'CU'}</span>`});
const donate=qs('.donation>a');if(donate)donate.innerHTML=`${svg('gift')} DONAR`;
})();

// Chat local funcional de la batalla. Conserva mensajes durante la sesión del navegador.
(()=>{
  const form=document.querySelector('#battleChatForm');
  const input=document.querySelector('#battleChatInput');
  const messages=document.querySelector('#battleMessages');
  const gift=document.querySelector('#battleGift');
  if(!form||!input||!messages)return;
  const append=(name,text,cls='')=>{
    const p=document.createElement('p');
    if(cls)p.className=cls;
    const b=document.createElement('b'); b.textContent=name;
    const span=document.createElement('span'); span.textContent=text;
    p.append(b,span); messages.appendChild(p); messages.scrollTop=messages.scrollHeight;
  };
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const text=input.value.trim();
    if(!text)return;
    append('Tú',text);
    input.value=''; input.focus();
  });
  gift?.addEventListener('click',()=>append('Tú','enviaste un regalo a la batalla','gift-message'));
})();
