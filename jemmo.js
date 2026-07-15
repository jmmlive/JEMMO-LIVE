
const JEMMO_KEY='jemmo_v2_state';
const defaultState={coins:1250,following:3,messages:[
 {from:'LunaCanaria',text:'¿Vienes a Casa Padre?',time:'Ahora',unread:2},
 {from:'MayaStar',text:'Te veo luego en el Patio',time:'12:41',unread:0},
 {from:'Nexo',text:'La sala de voz está abierta',time:'Ayer',unread:1}
],profile:{name:localStorage.getItem('jemmo_name')||'Jesús',user:'@jesusjemmo',bio:'Construyendo JEMMO.',country:localStorage.getItem('jemmo_country')||'España'}};
function getState(){try{let x=JSON.parse(localStorage.getItem(JEMMO_KEY)||'{}');return {...defaultState,...x,profile:{...defaultState.profile,...(x.profile||{})}}}catch{return structuredClone(defaultState)}}
function saveState(s){localStorage.setItem(JEMMO_KEY,JSON.stringify(s))}
function toastMsg(t){let x=document.getElementById('toast');if(!x)return;x.textContent=t;x.classList.add('show');clearTimeout(window.jt);window.jt=setTimeout(()=>x.classList.remove('show'),2100)}
function back(){history.length>1?history.back():location.href='index.html'}
