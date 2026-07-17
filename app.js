function go(file){location.href=file}
function currentHouse(){const id=new URLSearchParams(location.search).get('id')||localStorage.getItem('jemmo_house')||'tenerife';return JEMMO_HOUSES.find(h=>h.id===id)||JEMMO_HOUSES[0]}
function saveHouse(id){localStorage.setItem('jemmo_house',id)}
function toast(t){const e=document.getElementById('toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>e.classList.remove('show'),2100)}
