
const J=window.JEMMO={
 toast(text){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=text;t.classList.add('show');clearTimeout(window.__jt);window.__jt=setTimeout(()=>t.classList.remove('show'),2300)},
 state(){return JSON.parse(localStorage.getItem('jemmo_state')||'{}')},
 save(v){localStorage.setItem('jemmo_state',JSON.stringify({...this.state(),...v}))},
 profile(){const s=this.state();return s.profile||{name:'Invitado JEMMO',id:'19758906',avatar:'🐟',level:1,fans:0,following:0,likes:0}},
 setProfile(p){this.save({profile:{...this.profile(),...p}})},
 addReport(r){const s=this.state(),a=s.reports||[];a.push({...r,id:'R-'+Date.now(),createdAt:new Date().toISOString(),status:'recibido'});this.save({reports:a});return a[a.length-1]},
 nav(active='inicio'){return `<nav class="nav">
<a class="${active==='inicio'?'on':''}" href="index.html"><span>🏠</span>INICIO</a>
<a class="${active==='live'?'on':''}" href="live.html"><span>📡</span>LIVE</a>
<a class="${active==='casa'?'on':''}" href="casa.html"><span>🏡</span>CASA</a>
<a class="${active==='chat'?'on':''}" href="chat.html"><span>💬</span>CHAT</a>
<a class="${active==='perfil'?'on':''}" href="perfil.html"><span>👤</span>PERFIL</a></nav>`},
 top(title='JEMMO LIVE',back=''){return `<header class="topbar"><div class="brand">${back?`<button class="back" onclick="location.href='${back}'">‹</button>`:'<div class="j">J</div>'}<div><b>${title.includes('JEMMO')?title.replace('JEMMO','<span>JEMMO</span>'):title}</b><small>EL MUNDO ESTÁ EN VIVO</small></div></div><div class="header-actions"><button class="iconbtn" onclick="location.href='ayuda.html'">?</button><button class="iconbtn" onclick="location.href='notificaciones.html'">🔔</button></div></header>`}
};
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('[data-top]').forEach(x=>x.innerHTML=J.top(x.dataset.top,x.dataset.back||''));document.querySelectorAll('[data-nav]').forEach(x=>x.innerHTML=J.nav(x.dataset.nav))});
