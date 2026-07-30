/* JEMMO LIVE · ELIMINACIÓN SEGURA DE CUENTA · PRUEBA 55 FASE 2 */
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js';

const firebaseConfig={apiKey:'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',authDomain:'jemmo-live.firebaseapp.com',projectId:'jemmo-live',storageBucket:'jemmo-live.firebasestorage.app',messagingSenderId:'355540892255',appId:'1:355540892255:web:d15a8dd03b2915e31939ea'};
const app=getApps()[0]||initializeApp(firebaseConfig);
const auth=getAuth(app);
const functions=getFunctions(app,'europe-west1');
const deleteAccount=httpsCallable(functions,'jemmoDeleteAccount');
const $=id=>document.getElementById(id);
let user=null;
let busy=false;

function clean(value,max=260){return String(value||'').trim().slice(0,max)}
function setStatus(message,mode=''){
  const target=$('accountDeletionStatus');
  if(!target)return;
  target.textContent=clean(message,300);
  target.dataset.mode=mode;
}
function clearLocalData(){
  const uid=user?.uid||'';
  try{
    [...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).filter(Boolean).forEach(key=>{
      if(!uid||key.includes(uid)||key.startsWith('jemmo_'))localStorage.removeItem(key);
    });
  }catch{}
  try{sessionStorage.clear()}catch{}
}
function confirmationReady(){
  return Boolean(user)
    && Boolean($('accountDeletionAccept')?.checked)
    && clean($('accountDeletionPhrase')?.value,80).toUpperCase()==='ELIMINAR MI CUENTA';
}
function syncDeleteButton(){
  const button=$('deleteAccountButton');
  if(button&&!busy)button.disabled=!confirmationReady();
}
function friendly(error){
  const code=clean(error?.code||'',120);
  const message=clean(error?.message||'',260);
  if(code.includes('failed-precondition')||message.includes('recent-login'))return 'Por seguridad, cierra sesión y vuelve a entrar antes de eliminar la cuenta.';
  if(code.includes('unauthenticated'))return 'La sesión ha caducado. Vuelve a iniciar sesión.';
  if(code.includes('permission-denied'))return 'La eliminación está bloqueada hasta desplegar la función segura y App Check.';
  if(code.includes('not-found'))return 'La función segura de eliminación todavía no está desplegada.';
  if(code.includes('unavailable'))return 'No hay conexión con el servicio. Revisa Internet y vuelve a intentarlo.';
  return message.replace(/^Firebase:\s*/i,'')||'No se pudo completar la eliminación.';
}
async function runDeletion(){
  if(busy)return;
  if(!user){setStatus('Debes iniciar sesión con la cuenta que quieres eliminar.','error');return}
  const accepted=Boolean($('accountDeletionAccept')?.checked);
  const phrase=clean($('accountDeletionPhrase')?.value,80).toUpperCase();
  if(!accepted||phrase!=='ELIMINAR MI CUENTA'){
    setStatus('Marca la confirmación y escribe exactamente: ELIMINAR MI CUENTA.','error');
    return;
  }
  busy=true;
  const button=$('deleteAccountButton');
  if(button){button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='ELIMINANDO…'}
  setStatus('Eliminando la cuenta y los datos asociados…','working');
  try{
    await window.__jemmoAppCheckReady?.catch?.(()=>{});
    const requestId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const response=await deleteAccount({confirmation:'ELIMINAR MI CUENTA',requestId});
    if(response?.data?.deleted!==true)throw new Error('La función no confirmó la eliminación.');
    clearLocalData();
    await signOut(auth).catch(()=>{});
    document.documentElement.dataset.accountDeleted='true';
    setStatus('Cuenta eliminada. Ya no puedes iniciar sesión con esta cuenta.','success');
    window.setTimeout(()=>location.replace('acceso.html?cuenta=eliminada'),900);
  }catch(error){
    console.error('JEMMO eliminar cuenta:',error);
    setStatus(friendly(error),'error');
    if(button){button.disabled=false;button.removeAttribute('aria-busy');button.textContent='ELIMINAR DEFINITIVAMENTE MI CUENTA'}
  }finally{busy=false}
}

onAuthStateChanged(auth,current=>{
  user=current||null;
  const identity=$('accountDeletionIdentity');
  if(identity)identity.textContent=user?`${user.email||user.displayName||'Cuenta autenticada'} · ${user.uid.slice(0,8)}…`:'No hay una sesión autenticada.';
  const button=$('deleteAccountButton');
  syncDeleteButton();
  const login=$('accountDeletionLogin');
  if(login)login.hidden=Boolean(user);
});

document.addEventListener('input',event=>{
  if(event.target.matches('#accountDeletionPhrase'))syncDeleteButton();
});
document.addEventListener('change',event=>{
  if(event.target.matches('#accountDeletionAccept'))syncDeleteButton();
});

document.addEventListener('click',event=>{
  const trigger=event.target.closest('#deleteAccountButton');
  if(trigger){event.preventDefault();void runDeletion()}
});
