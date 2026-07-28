import { JEMMO_POLICY_META, JEMMO_ARTICLES, officialSourceStamp } from './jemmo-official-policies.js?v=45';

const $ = (id) => document.getElementById(id);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const SECURITY_KEY = 'jemmo_cloud_security_queue_v1';
let currentUid = '';

const safeStorage = {
  get(key){ try{return localStorage.getItem(key)}catch{try{return sessionStorage.getItem(key)}catch{return null}} },
  set(key,value){ try{localStorage.setItem(key,value);return true}catch{try{sessionStorage.setItem(key,value);return true}catch{return false}} }
};

function activeUid(){
  return String(window.__jemmoAuthenticatedUid || currentUid || safeStorage.get('jemmo_active_uid') || '').trim();
}
function settingsKey(){ return `jemmo_settings_v1_${activeUid() || 'guest'}`; }
function text(value,max=120){ return String(value ?? '').trim().slice(0,max); }
function toast(message){ const el=$('settingsToast'); if(!el)return; el.textContent=message;el.classList.add('show');clearTimeout(window.__jemmoSettingsToast);window.__jemmoSettingsToast=setTimeout(()=>el.classList.remove('show'),2500); }
function readJson(key,fallback){ try{const value=JSON.parse(safeStorage.get(key)||'null');return value&&typeof value==='object'?value:fallback}catch{return fallback} }
function readSettings(){
  return {
    version:1,confirmEconomy:true,securityAlerts:true,withdrawalHold:true,
    activityVisibility:'everyone',messagePermission:'everyone',showCountry:true,
    notifySocial:true,notifyTasks:true,notifyFinance:true,country:'ES',language:'es',
    ...readJson(settingsKey(),{})
  };
}
function writeSettings(value){ return safeStorage.set(settingsKey(),JSON.stringify({...value,source:officialSourceStamp(),updatedAt:Date.now()})); }
function formValue(name){
  const element=document.querySelector(`[name="${name}"]`);
  if(!element)return undefined;
  return element.type==='checkbox'?element.checked:element.value;
}
function applySettings(settings){
  Object.entries(settings).forEach(([name,value])=>{
    const element=document.querySelector(`[name="${name}"]`);
    if(!element)return;
    if(element.type==='checkbox')element.checked=Boolean(value); else element.value=String(value);
  });
  renderPaymentMethods(settings.country);
}
function collectSettings(){
  return {
    version:1,
    confirmEconomy:true,
    securityAlerts:Boolean(formValue('securityAlerts')),
    withdrawalHold:true,
    activityVisibility:text(formValue('activityVisibility'),20),
    messagePermission:text(formValue('messagePermission'),20),
    showCountry:Boolean(formValue('showCountry')),
    notifySocial:Boolean(formValue('notifySocial')),
    notifyTasks:Boolean(formValue('notifyTasks')),
    notifyFinance:Boolean(formValue('notifyFinance')),
    country:text(formValue('country'),10)||'ES',
    language:'es'
  };
}
function renderIdentity(uid){
  const profile=window.JemmoSession?.readLocalProfile?.(uid)||{};
  $('settingsName').textContent=text(profile.name||profile.displayName||'Cuenta JEMMO',70);
  $('settingsPublicId').textContent=text(profile.publicId||profile.id||'ID JEMMO pendiente',40);
  $('settingsUid').textContent=uid?`UID técnico: ${uid}`:'Sesión pendiente';
  const avatar=profile.avatarDataUrl||profile.photoURL||profile.photo||profile.avatar;
  if(typeof avatar==='string'&&/^(data:image|https?:|blob:)/i.test(avatar))$('settingsAvatar').src=avatar;
}
function activeFinancialAlerts(){
  const events=readJson(SECURITY_KEY,[]);
  if(!Array.isArray(events))return [];
  return events.filter(event=>event&&['unauthorized_recharge_blocked','financial_operation_quarantined','payment_source_invalid','chargeback_watch'].includes(event.type)&&event.resolved!==true);
}
function renderSecurityState(){
  const alerts=activeFinancialAlerts(); const state=$('securityState');
  if(!alerts.length){state.classList.remove('alert');state.innerHTML='<span>✓</span><div><b>Sin alertas financieras locales</b><small>La validación real del proveedor deberá ejecutarse en backend antes de producción.</small></div>';return}
  state.classList.add('alert');state.innerHTML=`<span>!</span><div><b>${alerts.length} alerta${alerts.length===1?'':'s'} financiera${alerts.length===1?'':'s'} activa${alerts.length===1?'':'s'}</b><small>Las retiradas deben permanecer bloqueadas hasta revisión. Abre Chili para registrar el caso.</small></div>`;
}
function renderPaymentMethods(country='ES'){
  const cuba=String(country).toUpperCase()==='CU';
  const methods=[
    {icon:'▶',name:'Google Play',copy:'Compra integrada verificada',enabled:!cuba,note:cuba?'No disponible para Cuba':'Disponible según Play'},
    {icon:'💳',name:'Tarjeta',copy:'Visa o Mastercard',enabled:true,note:'Reversible hasta confirmar'},
    {icon:'🌐',name:'Epay',copy:'Proveedor externo autorizado',enabled:true,note:'Sujeto a integración'},
    {icon:'₮',name:'USDT',copy:'BEP20, TRC20 o ERC20',enabled:true,note:'Red exacta obligatoria'},
    {icon:'◉',name:'USDC',copy:'BEP20 o ERC20',enabled:true,note:'Red exacta obligatoria'}
  ];
  $('paymentMethods').innerHTML=methods.map(method=>`<article class="payment-method ${method.enabled?'':'off'}"><span>${method.icon}</span><b>${method.name}</b><small>${method.copy}</small><em>${method.enabled?'✓ '+method.note:'NO DISPONIBLE · '+method.note}</em></article>`).join('');
  $('countryPaymentNote').textContent=cuba?'Cuba seleccionada: Google Play queda oculto. Tarjeta, Epay y cripto dependen de la integración real y del proveedor.':'Los métodos visibles dependen del país, del proveedor y de la revisión de producción.';
  try{localStorage.setItem('jemmo_country',String(country).toUpperCase())}catch{}
}
function renderOfficialIndex(){
  $('policyVersionBadge').textContent=JEMMO_POLICY_META.release;
  $('officialSourceText').textContent=`${JEMMO_POLICY_META.title} · publicada el ${new Intl.DateTimeFormat('es-ES',{dateStyle:'long'}).format(new Date(`${JEMMO_POLICY_META.publishedAt}T12:00:00`))}.`;
  const important=['community-rules','tasks-rates','wallet-currencies','authorized-payments','financial-security','privacy','houses-release','support-process'];
  $('officialArticleList').innerHTML=important.map(id=>JEMMO_ARTICLES.find(article=>article.id===id)).filter(Boolean).map(article=>`<a href="chili-ia.html?article=${encodeURIComponent(article.id)}#articulos"><span>${article.icon}</span><div><b>${article.title}</b><small>${article.summary}</small></div><i>›</i></a>`).join('');
}
function updateNotificationState(){
  const value=('Notification'in window)?Notification.permission:'unsupported';
  $('notificationState').textContent=value==='granted'?'Estado del permiso: ACTIVADO.':value==='denied'?'Estado del permiso: BLOQUEADO en el navegador o móvil.':value==='default'?'Estado del permiso: todavía no solicitado.':'Este navegador no admite notificaciones web.';
  $('notificationPermission').disabled=value==='unsupported';
}
async function requestNotificationPermission(){
  if(!('Notification'in window))return updateNotificationState();
  try{await Notification.requestPermission()}catch{}
  updateNotificationState();
}
async function closeSession(){
  if(!confirm('¿Quieres cerrar la sesión de JEMMO LIVE en este dispositivo?'))return;
  if(window.JemmoSession?.closeSession){await window.JemmoSession.closeSession();return}
  try{localStorage.removeItem('jemmo_active_uid');sessionStorage.removeItem('jemmo_active_uid')}catch{}
  location.replace('acceso.html');
}
function openWallet(){
  if(window.JemmoWallet?.open){window.JemmoWallet.open('summary');return}
  location.href='yo.html?monedero=1';
}
function save(){
  const settings=collectSettings();
  if(!writeSettings(settings)){toast('No se pudo guardar la configuración. Libera espacio y vuelve a intentarlo.');return}
  $('saveState').textContent=`Guardado el ${new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date())} · fuente oficial ${JEMMO_POLICY_META.release}.`;
  toast('Configuración guardada.');
}
function init(uid=''){
  currentUid=uid||activeUid();
  renderIdentity(currentUid);applySettings(readSettings());renderOfficialIndex();renderSecurityState();updateNotificationState();
  document.documentElement.classList.remove('jemmo-auth-pending');
  const article=new URLSearchParams(location.search).get('article');if(article)setTimeout(()=>location.hash='normas',100);
}

$('settingsBack').addEventListener('click',()=>history.length>1?history.back():location.assign('yo.html'));
$('saveSettings').addEventListener('click',save);
$('countrySelect').addEventListener('change',event=>renderPaymentMethods(event.target.value));
$('notificationPermission').addEventListener('click',requestNotificationPermission);
$('closeSessionButton').addEventListener('click',closeSession);
$('openWalletFromSettings').addEventListener('click',openWallet);
window.addEventListener('jemmo-security-event',renderSecurityState);
window.addEventListener('storage',event=>{if(event.key===SECURITY_KEY)renderSecurityState()});
window.addEventListener('jemmo-auth-ready',event=>init(event.detail?.uid||''),{once:true});
setTimeout(()=>{if(!currentUid)init(activeUid())},900);
