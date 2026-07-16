function toast(msg){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1900)}
function getHouse(){const id=new URLSearchParams(location.search).get('id')||localStorage.getItem('jemmo_house')||'unicornio';return JEMMO_HOUSES.find(h=>h.id===id)||JEMMO_HOUSES[0]}
function setHouse(id){localStorage.setItem('jemmo_house',id)}
