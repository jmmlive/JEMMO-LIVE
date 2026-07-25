import { answerQuestion, SUGGESTIONS } from './jemmo-chili-knowledge.js';

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const log = $('#chiliChatLog');
const form = $('#chiliForm');
const input = $('#chiliInput');
const send = $('#sendButton');
const toast = $('#chiliToast');
const modal = $('#chiliModal');
const videoModal = $('#videoModal');
const videoPlayer = $('#chiliVideo');
const MEDIA = {
  presentacion:{title:'Conoce a Chili IA',text:'Presentación oficial de la asistente de JEMMO LIVE.',src:'media/chili/chili-presentacion.mp4',poster:'media/chili/chili-presentacion-poster.webp'},
  'primeros-pasos':{title:'Chili presenta JEMMO LIVE',text:'Mensaje oficial de Chili desde su estudio dentro de JEMMO LIVE.',src:'media/chili/chili-primeros-pasos.mp4',poster:'media/chili/chili-primeros-pasos-poster.webp'}
};
const HISTORY_KEY = 'conversation-v1';
let currentUid = 'guest';
let speechRecognition = null;
let history = [];

function escapeText(value){ return String(value ?? ''); }
function formatText(text){
  const fragment=document.createDocumentFragment();
  const lines=escapeText(text).split('\n');
  lines.forEach((line,index)=>{
    const parts=line.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach(part=>{
      if(part.startsWith('**')&&part.endsWith('**')){
        const strong=document.createElement('strong'); strong.textContent=part.slice(2,-2); fragment.append(strong);
      }else fragment.append(document.createTextNode(part));
    });
    if(index<lines.length-1) fragment.append(document.createElement('br'));
  });
  return fragment;
}
function showToast(message){
  toast.textContent=message; toast.classList.add('show'); clearTimeout(window.__chiliToastTimer);
  window.__chiliToastTimer=setTimeout(()=>toast.classList.remove('show'),1900);
}
function showModal(title,text,symbol='✦'){
  $('#modalTitle').textContent=title; $('#modalText').textContent=text; $('#modalSymbol').textContent=symbol; modal.hidden=false;
  $('#modalOk').focus();
}
function closeModal(){ modal.hidden=true; }
function openVideo(slot){
  const item=MEDIA[slot]; if(!item) return;
  $('#videoModalTitle').textContent=item.title; $('#videoModalText').textContent=item.text;
  videoPlayer.poster=item.poster; videoPlayer.src=item.src; videoModal.hidden=false;
  videoPlayer.load(); videoPlayer.play().catch(()=>{});
  $('#videoModalClose').focus();
}
function closeVideo(){
  videoPlayer.pause(); videoPlayer.removeAttribute('src'); videoPlayer.load(); videoModal.hidden=true;
}

function openDb(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){ reject(new Error('indexeddb-unavailable')); return; }
    const request=indexedDB.open('jemmo-live-chili',1);
    request.onupgradeneeded=()=>{ const db=request.result; if(!db.objectStoreNames.contains('history')) db.createObjectStore('history'); };
    request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error);
  });
}
async function readHistory(){
  try{
    const db=await openDb();
    const value=await new Promise((resolve,reject)=>{ const tx=db.transaction('history','readonly'); const req=tx.objectStore('history').get(`${currentUid}:${HISTORY_KEY}`); req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>reject(req.error); });
    db.close(); return Array.isArray(value)?value:[];
  }catch{
    try{ const raw=sessionStorage.getItem(`jemmo_chili_${currentUid}`); return raw?JSON.parse(raw):[]; }catch{return[];}
  }
}
async function writeHistory(){
  const clean=history.slice(-40);
  try{
    const db=await openDb();
    await new Promise((resolve,reject)=>{ const tx=db.transaction('history','readwrite'); tx.objectStore('history').put(clean,`${currentUid}:${HISTORY_KEY}`); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); });
    db.close();
  }catch{ try{sessionStorage.setItem(`jemmo_chili_${currentUid}`,JSON.stringify(clean));}catch{} }
}

function createActions(actions=[]){
  if(!actions.length) return null;
  const row=document.createElement('div'); row.className='answer-actions';
  actions.forEach(action=>{
    const button=document.createElement('button'); button.type='button'; button.textContent=action.label;
    button.addEventListener('click',()=>{
      if(action.route){ location.assign(action.route); return; }
      if(action.prompt) submitQuestion(action.prompt);
    });
    row.append(button);
  });
  return row;
}
function createMessage(role,text,options={}){
  const article=document.createElement('article'); article.className=`message ${role}`;
  if(role==='assistant'){
    const avatar=document.createElement('div'); avatar.className='message-avatar';
    const image=document.createElement('img'); image.src='media/chili/chili-avatar.webp'; image.alt=''; avatar.append(image); article.append(avatar);
  }
  const bubble=document.createElement('div'); bubble.className='bubble';
  const label=document.createElement('strong'); label.textContent=role==='assistant'?'Chili IA':'Tú'; bubble.append(label);
  const paragraph=document.createElement('p'); paragraph.append(formatText(text)); bubble.append(paragraph);
  const actions=createActions(options.actions); if(actions) bubble.append(actions);
  if(role==='assistant' && options.feedback!==false){
    const feedback=document.createElement('div'); feedback.className='feedback-row'; feedback.append(document.createTextNode('¿Te ayudó?'));
    ['👍','👎'].forEach(value=>{ const button=document.createElement('button'); button.type='button'; button.textContent=value; button.setAttribute('aria-label',value==='👍'?'Respuesta útil':'Respuesta no útil'); button.addEventListener('click',()=>{ button.parentElement.querySelectorAll('button').forEach(b=>b.disabled=true); showToast(value==='👍'?'Gracias por tu valoración':'Anotado para revisión'); }); feedback.append(button); });
    bubble.append(feedback);
  }
  article.append(bubble); log.append(article); log.scrollTop=log.scrollHeight;
  return article;
}
function renderHistory(){
  $$('.message:not(.welcome-message)',log).forEach(node=>node.remove());
  history.forEach(item=>createMessage(item.role,item.text,{actions:item.actions||[],feedback:false}));
}
async function submitQuestion(raw){
  const question=String(raw||'').trim(); if(!question) return;
  createMessage('user',question,{feedback:false}); history.push({role:'user',text:question}); input.value=''; resizeInput(); send.disabled=true;
  await new Promise(resolve=>setTimeout(resolve,260));
  const result=answerQuestion(question);
  createMessage('assistant',result.answer,{actions:result.actions}); history.push({role:'assistant',text:result.answer,actions:result.actions||[],topicId:result.topicId});
  await writeHistory(); send.disabled=false; input.focus();
}
function resizeInput(){ input.style.height='auto'; input.style.height=`${Math.min(input.scrollHeight,120)}px`; send.disabled=!input.value.trim(); }
async function clearHistory(){ history=[]; await writeHistory(); renderHistory(); showToast('Conversación local eliminada'); }

form.addEventListener('submit',event=>{ event.preventDefault(); submitQuestion(input.value); });
input.addEventListener('input',resizeInput);
input.addEventListener('keydown',event=>{ if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();} });
$$('[data-prompt]').forEach(button=>button.addEventListener('click',()=>submitQuestion(button.dataset.prompt)));
$('#clearChat').addEventListener('click',clearHistory);
$('#chiliBack').addEventListener('click',()=>location.assign('inicio.html'));
$('#chiliShare').addEventListener('click',async()=>{
  const data={title:'Chili IA · JEMMO LIVE',text:'Conoce a Chili IA, la asistente oficial de JEMMO LIVE.',url:location.href};
  try{ if(navigator.share){await navigator.share(data);return;} await navigator.clipboard.writeText(location.href); showToast('Enlace de Chili copiado'); }catch(error){ if(error?.name!=='AbortError') showToast('No se pudo compartir'); }
});
$('#giftButton').addEventListener('click',()=>showModal('Regalos en modo de pruebas','Todavía no generan ingresos reales. Esta función se activará únicamente cuando JEMMO LIVE pase a producción con autorización expresa.','🎁'));
$$('[data-media-slot]').forEach(button=>button.addEventListener('click',()=>openVideo(button.dataset.mediaSlot)));
$('#videoModalClose').addEventListener('click',closeVideo); videoModal.addEventListener('click',event=>{if(event.target===videoModal)closeVideo();});
$('#modalClose').addEventListener('click',closeModal); $('#modalOk').addEventListener('click',closeModal); modal.addEventListener('click',event=>{if(event.target===modal)closeModal();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!videoModal.hidden)closeVideo();else if(!modal.hidden)closeModal();}});

function setupVoice(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){ $('#voiceButton').addEventListener('click',()=>showToast('El dictado no está disponible en este navegador')); return; }
  speechRecognition=new Recognition(); speechRecognition.lang='es-ES'; speechRecognition.interimResults=false; speechRecognition.maxAlternatives=1;
  speechRecognition.onstart=()=>{ $('#voiceButton').textContent='◉'; showToast('Escuchando…'); };
  speechRecognition.onend=()=>{ $('#voiceButton').textContent='🎙'; };
  speechRecognition.onerror=()=>showToast('No se pudo usar el micrófono');
  speechRecognition.onresult=event=>{ input.value=event.results[0][0].transcript; resizeInput(); input.focus(); };
  $('#voiceButton').addEventListener('click',()=>{ try{speechRecognition.start();}catch{} });
}

async function initializeIdentity(uid){
  currentUid=uid||'guest';
  try{
    const profile=window.JemmoSession?.readLocalProfile?.(currentUid)||{};
    const name=String(profile.name||profile.displayName||'').trim();
    if(name) $('#welcomeText').textContent=`Hola, ${name}. Estoy preparada para ayudarte. Elige una opción o escribe tu pregunta.`;
  }catch{}
  history=await readHistory(); renderHistory();
}

window.addEventListener('jemmo-auth-ready',event=>initializeIdentity(event.detail?.uid));
setTimeout(()=>{ if(currentUid==='guest'){ let uid=''; try{uid=localStorage.getItem('jemmo_active_uid')||sessionStorage.getItem('jemmo_active_uid')||''}catch{} initializeIdentity(uid); } },900);

setupVoice(); resizeInput();
window.JemmoChili={ask:submitQuestion,suggestions:SUGGESTIONS};
