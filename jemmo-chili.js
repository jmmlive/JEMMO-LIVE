import { answerQuestion, SUGGESTIONS, TASK_TIERS, AUDIO_ROOM_RATE, SUPPORT_CATEGORIES } from './jemmo-chili-knowledge.js?v=38';

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
const voiceModal = $('#voiceCallModal');
const supportForm = $('#supportForm');
const MEDIA = {
  presentacion:{title:'Conoce a Chili IA',text:'Presentación oficial de la asistente de JEMMO LIVE.',src:'chili-presentacion.mp4',poster:'chili-presentacion-poster.webp'},
  'primeros-pasos':{title:'Chili presenta JEMMO LIVE',text:'Mensaje oficial de Chili desde su estudio dentro de JEMMO LIVE.',src:'chili-primeros-pasos.mp4',poster:'chili-primeros-pasos-poster.webp'}
};
const HISTORY_KEY = 'conversation-v2';
const MAX_SUPPORT_IMAGE = 270000;
let currentUid = 'guest';
let speechRecognition = null;
let history = [];
let voiceOutput = false;
let voiceCallActive = false;
let listening = false;
let selectedEvidence = null;
let firebaseToolsPromise = null;

function text(value,max=1000){ return String(value ?? '').trim().slice(0,max); }
function formatNumber(value){ return new Intl.NumberFormat('es-ES').format(Number(value)||0); }
function formatText(value){
  const fragment=document.createDocumentFragment();
  const lines=String(value ?? '').split('\n');
  lines.forEach((line,index)=>{
    const parts=line.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach(part=>{
      if(part.startsWith('**')&&part.endsWith('**')){ const strong=document.createElement('strong'); strong.textContent=part.slice(2,-2); fragment.append(strong); }
      else fragment.append(document.createTextNode(part));
    });
    if(index<lines.length-1) fragment.append(document.createElement('br'));
  });
  return fragment;
}
function speechText(value){ return String(value||'').replace(/\*\*/g,'').replace(/JEMS/g,'yems').replace(/JEMMOS/g,'yemmos').replace(/Audio Room/g,'Audio Rum'); }
function showToast(message){ toast.textContent=message; toast.classList.add('show'); clearTimeout(window.__chiliToastTimer); window.__chiliToastTimer=setTimeout(()=>toast.classList.remove('show'),2200); }
function showModal(titleValue,body,symbol='✦'){ $('#modalTitle').textContent=titleValue; $('#modalText').textContent=body; $('#modalSymbol').textContent=symbol; modal.hidden=false; $('#modalOk').focus(); }
function closeModal(){ modal.hidden=true; }
function scrollToSection(id){
  const target=document.getElementById(id);
  if(!target) return;
  window.history.replaceState(null,'',`#${id}`);
  target.scrollIntoView({behavior:'smooth',block:'start'});
  target.classList.add('section-flash'); setTimeout(()=>target.classList.remove('section-flash'),1400);
}
function openVideo(slot){
  const item=MEDIA[slot]; if(!item) return;
  $('#videoModalTitle').textContent=item.title; $('#videoModalText').textContent=item.text;
  videoPlayer.poster=item.poster; videoPlayer.src=item.src; videoModal.hidden=false; videoPlayer.load(); videoPlayer.play().catch(()=>{}); $('#videoModalClose').focus();
}
function closeVideo(){ videoPlayer.pause(); videoPlayer.removeAttribute('src'); videoPlayer.load(); videoModal.hidden=true; }

function openDb(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){ reject(new Error('indexeddb-unavailable')); return; }
    const request=indexedDB.open('jemmo-live-chili',2);
    request.onupgradeneeded=()=>{ const db=request.result; if(!db.objectStoreNames.contains('history')) db.createObjectStore('history'); };
    request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error);
  });
}
async function readHistory(){
  try{
    const db=await openDb();
    const value=await new Promise((resolve,reject)=>{ const tx=db.transaction('history','readonly'); const req=tx.objectStore('history').get(`${currentUid}:${HISTORY_KEY}`); req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>reject(req.error); });
    db.close(); return Array.isArray(value)?value:[];
  }catch{ try{ const raw=sessionStorage.getItem(`jemmo_chili_${currentUid}`); return raw?JSON.parse(raw):[]; }catch{return[];} }
}
async function writeHistory(){
  const clean=history.slice(-50);
  try{
    const db=await openDb();
    await new Promise((resolve,reject)=>{ const tx=db.transaction('history','readwrite'); tx.objectStore('history').put(clean,`${currentUid}:${HISTORY_KEY}`); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); }); db.close();
  }catch{ try{sessionStorage.setItem(`jemmo_chili_${currentUid}`,JSON.stringify(clean));}catch{} }
}

function speak(value,options={}){
  if(!('speechSynthesis' in window)){ showToast('La voz no está disponible en este navegador'); options.onEnd?.(); return; }
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(speechText(value));
  utterance.lang='es-ES'; utterance.rate=.96; utterance.pitch=1.03; utterance.volume=1;
  const voices=speechSynthesis.getVoices();
  const preferred=voices.find(v=>/^es(-|_)/i.test(v.lang)&&/female|mujer|helena|monica|paulina|sabina|google español/i.test(v.name)) || voices.find(v=>/^es(-|_)/i.test(v.lang));
  if(preferred) utterance.voice=preferred;
  utterance.onstart=()=>{ $('#voiceCallStatus').textContent='CHILI ESTÁ HABLANDO'; voiceModal?.classList.add('speaking'); };
  utterance.onend=()=>{ voiceModal?.classList.remove('speaking'); options.onEnd?.(); };
  utterance.onerror=()=>{ voiceModal?.classList.remove('speaking'); options.onEnd?.(); };
  speechSynthesis.speak(utterance);
}
function setVoiceOutput(enabled){
  voiceOutput=Boolean(enabled);
  const button=$('#voiceOutputToggle');
  if(button){ button.setAttribute('aria-pressed',String(voiceOutput)); button.innerHTML=voiceOutput?'🔊 CHILI HABLA':'🔇 ACTIVAR VOZ'; }
  showToast(voiceOutput?'Respuestas por voz activadas':'Respuestas por voz desactivadas');
}

function startListening(callMode=false){
  if(!speechRecognition){ showToast('El reconocimiento de voz no está disponible'); return; }
  if(listening){ try{speechRecognition.stop();}catch{} return; }
  voiceCallActive=callMode||voiceCallActive;
  try{ speechRecognition.start(); }catch{ showToast('Espera un momento y vuelve a tocar el micrófono'); }
}
function openVoiceCall(){
  voiceCallActive=true; setVoiceOutput(true); voiceModal.hidden=false; document.body.classList.add('voice-call-open');
  $('#voiceCallStatus').textContent='CONECTANDO CON CHILI';
  $('#voiceTranscript').textContent='Toca el micrófono y hazme una pregunta sobre JEMMO LIVE.';
  const greeting='Hola. Soy Chili. Puedes preguntarme por tareas, tarifas, salas, monedero, seguridad o soporte.';
  speak(greeting,{onEnd:()=>{ $('#voiceCallStatus').textContent='LISTA PARA ESCUCHAR'; }});
}
function closeVoiceCall(){
  voiceCallActive=false; listening=false; try{speechRecognition?.stop();}catch{} try{speechSynthesis?.cancel();}catch{}
  voiceModal.hidden=true; voiceModal.classList.remove('listening','speaking'); document.body.classList.remove('voice-call-open');
}

function createActions(actions=[]){
  if(!actions.length) return null;
  const row=document.createElement('div'); row.className='answer-actions';
  actions.forEach(action=>{
    const button=document.createElement('button'); button.type='button'; button.textContent=action.label;
    button.addEventListener('click',()=>{
      if(action.route){ location.assign(action.route); return; }
      if(action.section){ scrollToSection(action.section); return; }
      if(action.voice){ openVoiceCall(); return; }
      if(action.prompt) submitQuestion(action.prompt);
    }); row.append(button);
  });
  return row;
}
function createMessage(role,body,options={}){
  const article=document.createElement('article'); article.className=`message ${role}`;
  if(role==='assistant'){
    const avatar=document.createElement('div'); avatar.className='message-avatar'; const image=document.createElement('img'); image.src='chili-avatar.webp'; image.alt=''; avatar.append(image); article.append(avatar);
  }
  const bubble=document.createElement('div'); bubble.className='bubble';
  const head=document.createElement('div'); head.className='message-head';
  const label=document.createElement('strong'); label.textContent=role==='assistant'?'Chili IA':'Tú'; head.append(label);
  if(role==='assistant'){
    const play=document.createElement('button'); play.type='button'; play.className='speak-answer'; play.textContent='🔊'; play.setAttribute('aria-label','Escuchar respuesta'); play.addEventListener('click',()=>speak(body)); head.append(play);
  }
  bubble.append(head);
  const paragraph=document.createElement('p'); paragraph.append(formatText(body)); bubble.append(paragraph);
  const actions=createActions(options.actions); if(actions) bubble.append(actions);
  if(role==='assistant' && options.feedback!==false){
    const feedback=document.createElement('div'); feedback.className='feedback-row'; feedback.append(document.createTextNode('¿Te ayudó?'));
    ['👍','👎'].forEach(value=>{ const button=document.createElement('button'); button.type='button'; button.textContent=value; button.setAttribute('aria-label',value==='👍'?'Respuesta útil':'Respuesta no útil'); button.addEventListener('click',()=>{ button.parentElement.querySelectorAll('button').forEach(b=>b.disabled=true); showToast(value==='👍'?'Gracias por tu valoración':'Respuesta marcada para revisión'); }); feedback.append(button); }); bubble.append(feedback);
  }
  article.append(bubble); log.append(article); log.scrollTop=log.scrollHeight; return article;
}
function renderHistory(){ $$('.message:not(.welcome-message)',log).forEach(node=>node.remove()); history.forEach(item=>createMessage(item.role,item.text,{actions:item.actions||[],feedback:false})); }
async function submitQuestion(raw,options={}){
  const question=text(raw,700); if(!question) return;
  createMessage('user',question,{feedback:false}); history.push({role:'user',text:question}); input.value=''; resizeInput(); send.disabled=true;
  if(voiceCallActive) $('#voiceTranscript').textContent=question;
  await new Promise(resolve=>setTimeout(resolve,240));
  const result=answerQuestion(question);
  createMessage('assistant',result.answer,{actions:result.actions}); history.push({role:'assistant',text:result.answer,actions:result.actions||[],topicId:result.topicId});
  if(voiceCallActive){ $('#voiceTranscript').textContent=result.answer.replace(/\*\*/g,''); $('#voiceCallStatus').textContent='PREPARANDO RESPUESTA'; }
  await writeHistory(); send.disabled=false;
  if(voiceOutput||voiceCallActive) speak(result.answer,{onEnd:()=>{ if(voiceCallActive){ $('#voiceCallStatus').textContent='TOCA EL MICRÓFONO PARA CONTINUAR'; } }});
  else input.focus();
}
function resizeInput(){ input.style.height='auto'; input.style.height=`${Math.min(input.scrollHeight,120)}px`; send.disabled=!input.value.trim(); }
async function clearHistory(){ history=[]; await writeHistory(); renderHistory(); showToast('Conversación local eliminada'); }

function renderTaskTable(){
  const body=$('#taskRatesBody'); if(!body) return;
  body.innerHTML=TASK_TIERS.map(tier=>`<tr><th>${tier.code}<small>${tier.label}</small></th><td>${formatNumber(tier.target)}</td><td>${tier.hours} h</td><td>${formatNumber(tier.reward)}</td><td>${formatNumber(AUDIO_ROOM_RATE)}</td><td>${formatNumber(tier.hours*AUDIO_ROOM_RATE)}</td></tr>`).join('');
  $('#audioRateFixed').textContent=`${formatNumber(AUDIO_ROOM_RATE)} JEMS/HORA`;
}
function renderSupportCategories(){
  const select=$('#supportCategory'); if(!select) return;
  select.innerHTML='<option value="">Selecciona el motivo</option>'+SUPPORT_CATEGORIES.map(item=>`<option value="${item.id}">${item.icon} ${item.label}</option>`).join('');
}

async function compressEvidence(file){
  if(!file || !file.type.startsWith('image/')) throw new Error('image-required');
  if(file.size>15*1024*1024) throw new Error('image-too-large');
  let source=null, sourceWidth=0, sourceHeight=0, release=()=>{};
  if('createImageBitmap' in window){
    const bitmap=await createImageBitmap(file); source=bitmap; sourceWidth=bitmap.width; sourceHeight=bitmap.height; release=()=>bitmap.close?.();
  }else{
    const objectUrl=URL.createObjectURL(file); const image=new Image();
    await new Promise((resolve,reject)=>{ image.onload=resolve; image.onerror=reject; image.src=objectUrl; });
    source=image; sourceWidth=image.naturalWidth; sourceHeight=image.naturalHeight; release=()=>URL.revokeObjectURL(objectUrl);
  }
  const ratio=Math.min(1,1280/Math.max(sourceWidth,sourceHeight));
  const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(sourceWidth*ratio)); canvas.height=Math.max(1,Math.round(sourceHeight*ratio));
  canvas.getContext('2d',{alpha:false}).drawImage(source,0,0,canvas.width,canvas.height); release();
  let quality=.82; let data=canvas.toDataURL('image/jpeg',quality);
  while(data.length>MAX_SUPPORT_IMAGE && quality>.38){ quality-=.08; data=canvas.toDataURL('image/jpeg',quality); }
  if(data.length>420000) throw new Error('image-compression-failed');
  return {dataUrl:data,width:canvas.width,height:canvas.height,originalName:text(file.name,100),originalSize:file.size,storedSize:data.length};
}
function clearEvidence(){ selectedEvidence=null; $('#supportEvidence').value=''; $('#evidencePreview').hidden=true; $('#evidencePreviewImage').removeAttribute('src'); $('#evidenceMeta').textContent=''; }
async function selectEvidence(file){
  const zone=$('#evidenceZone'); zone.classList.add('busy'); $('#evidenceMeta').textContent='Preparando captura…';
  try{
    selectedEvidence=await compressEvidence(file); $('#evidencePreviewImage').src=selectedEvidence.dataUrl; $('#evidencePreview').hidden=false;
    $('#evidenceMeta').textContent=`${selectedEvidence.width}×${selectedEvidence.height} · ${Math.round(selectedEvidence.storedSize/1024)} KB preparados`;
  }catch(error){ clearEvidence(); showModal('Captura no válida',error.message==='image-too-large'?'La imagen supera 15 MB. Recórtala o selecciona otra.':'Selecciona una captura en formato de imagen.','📷'); }
  finally{ zone.classList.remove('busy'); }
}
async function firebaseTools(){
  if(firebaseToolsPromise) return firebaseToolsPromise;
  firebaseToolsPromise=import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js').then(sdk=>{
    const db=window.JemmoSession?.db; if(!db) throw new Error('firebase-not-ready'); return {db,...sdk};
  }); return firebaseToolsPromise;
}
function supportReference(id){ return `JEMMO-${String(id||'').slice(-8).toUpperCase()}`; }
function ticketTime(value){
  const ms=Number(value?.toMillis?.()||value||0); if(!ms) return 'Pendiente de sincronizar';
  return new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date(ms));
}
function ticketStatus(value){ return ({pending:'PENDIENTE',reviewing:'EN REVISIÓN',resolved:'RESUELTO',closed:'CERRADO'})[value]||'PENDIENTE'; }
function renderTickets(items=[]){
  const list=$('#supportTicketsList'); if(!list) return;
  if(!items.length){ list.innerHTML='<p class="empty-tickets">Todavía no tienes solicitudes registradas.</p>'; return; }
  list.innerHTML=items.slice(0,6).map(item=>`<article><span>${SUPPORT_CATEGORIES.find(c=>c.id===item.category)?.icon||'✦'}</span><div><b>${supportReference(item.id)}</b><small>${text(item.categoryLabel||item.category,70)} · ${ticketTime(item.createdAtClient)}</small></div><em class="status-${text(item.status,20)}">${ticketStatus(item.status)}</em></article>`).join('');
}
async function loadTickets(){
  if(!currentUid || currentUid==='guest' || !navigator.onLine){ renderTickets([]); return; }
  try{
    const s=await firebaseTools(); const snapshot=await s.getDocs(s.query(s.collection(s.db,'supportTickets'),s.where('requesterUid','==',currentUid),s.limit(20)));
    const items=snapshot.docs.map(docSnap=>({id:docSnap.id,...docSnap.data()})).sort((a,b)=>Number(b.createdAtClient||0)-Number(a.createdAtClient||0)); renderTickets(items);
  }catch(error){ console.warn('JEMMO soporte lista:',error?.code||error); $('#supportTicketsList').innerHTML='<p class="empty-tickets">No se pudo consultar el estado. Comprueba la conexión.</p>'; }
}
async function submitSupport(event){
  event.preventDefault();
  const button=$('#supportSubmit'); const data=new FormData(supportForm);
  const category=text(data.get('category'),30); const categoryInfo=SUPPORT_CATEGORIES.find(item=>item.id===category);
  const description=text(data.get('description'),1600); const locationValue=text(data.get('location'),40); const target=text(data.get('target'),100);
  if(!categoryInfo){ showModal('Selecciona el motivo','Indica si se trata de monedero, acceso, tareas, fallo técnico, comportamiento, posible menor u otro.','!'); return; }
  if(description.length<20){ showModal('Explica el problema','Escribe al menos 20 caracteres para que soporte pueda entender qué ocurrió.','✎'); return; }
  if(!selectedEvidence){ showModal('Falta la captura','Adjunta una captura del problema o de la conversación. Es obligatoria para enviar la solicitud.','📷'); return; }
  if(!currentUid || currentUid==='guest'){ showModal('Sesión no verificada','Cierra y vuelve a abrir JEMMO antes de enviar la solicitud.','🔐'); return; }
  button.disabled=true; button.textContent='ENVIANDO…'; $('#supportSendState').textContent='Guardando solicitud y evidencia de prueba…';
  try{
    const s=await firebaseTools(); const ticketRef=s.doc(s.collection(s.db,'supportTickets')); const now=Date.now();
    const profile=window.JemmoSession?.readLocalProfile?.(currentUid)||{};
    const payload={
      requesterUid:currentUid, requesterName:text(profile.name||profile.displayName||'',80), requesterPublicId:text(profile.publicId||profile.id||'',40),
      category, categoryLabel:categoryInfo.label, location:locationValue, target, description, status:'pending', priority:category==='minor'?'urgent':category==='abuse'||category==='identity'?'high':'normal',
      evidenceDataUrl:selectedEvidence.dataUrl, evidenceType:'image/jpeg', evidenceWidth:selectedEvidence.width, evidenceHeight:selectedEvidence.height, evidenceOriginalName:selectedEvidence.originalName, evidenceOriginalSize:selectedEvidence.originalSize,
      source:'chili-ia', appVersion:'38', mode:'test', createdAtClient:now, createdAt:s.serverTimestamp(), updatedAt:s.serverTimestamp()
    };
    await s.setDoc(ticketRef,payload);
    if(['abuse','minor','identity'].includes(category)){
      const reportRef=s.doc(s.collection(s.db,'denuncias'));
      await s.setDoc(reportRef,{reporterUid:currentUid,targetUid:'',targetReference:target,conversationId:'',reason:category,status:'pending',priority:payload.priority,supportTicketId:ticketRef.id,location:locationValue,description,createdAtClient:now,createdAt:s.serverTimestamp(),version:2});
    }
    const reference=supportReference(ticketRef.id); supportForm.reset(); clearEvidence(); $('#supportSendState').textContent=`Solicitud ${reference} registrada. Estado: PENDIENTE.`;
    showModal('Solicitud registrada',`Referencia ${reference}. El caso ha quedado pendiente para revisión humana. Guarda esta referencia.`,category==='minor'?'🛡️':'✓'); await loadTickets();
  }catch(error){ console.error('JEMMO soporte:',error); $('#supportSendState').textContent='No se pudo registrar. Comprueba Internet y vuelve a intentarlo.'; showModal('No se pudo enviar','La solicitud no quedó registrada. Comprueba la conexión y vuelve a intentarlo; no cierres la pantalla hasta obtener una referencia.','!'); }
  finally{ button.disabled=false; button.textContent='ENVIAR A SOPORTE HUMANO'; }
}

form.addEventListener('submit',event=>{ event.preventDefault(); submitQuestion(input.value); });
input.addEventListener('input',resizeInput);
input.addEventListener('keydown',event=>{ if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();} });
$$('[data-prompt]').forEach(button=>button.addEventListener('click',()=>submitQuestion(button.dataset.prompt)));
$$('[data-section]').forEach(button=>button.addEventListener('click',()=>scrollToSection(button.dataset.section)));
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
$('#voiceOutputToggle').addEventListener('click',()=>setVoiceOutput(!voiceOutput));
$$('[data-open-voice-call]').forEach(button=>button.addEventListener('click',openVoiceCall));
$('#voiceCallClose').addEventListener('click',closeVoiceCall); $('#voiceCallEnd').addEventListener('click',closeVoiceCall); $('#voiceCallMic').addEventListener('click',()=>startListening(true));
voiceModal.addEventListener('click',event=>{if(event.target===voiceModal)closeVoiceCall();});
$('#supportEvidence').addEventListener('change',event=>{ const file=event.target.files?.[0]; if(file) selectEvidence(file); });
$('#removeEvidence').addEventListener('click',clearEvidence); supportForm.addEventListener('submit',submitSupport);
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!voiceModal.hidden)closeVoiceCall();else if(!videoModal.hidden)closeVideo();else if(!modal.hidden)closeModal();}});

function setupVoice(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){ $('#voiceButton').addEventListener('click',()=>showToast('El dictado no está disponible en este navegador')); $('#voiceCallMic').disabled=true; return; }
  speechRecognition=new Recognition(); speechRecognition.lang='es-ES'; speechRecognition.interimResults=false; speechRecognition.maxAlternatives=1;
  speechRecognition.onstart=()=>{ listening=true; $('#voiceButton').textContent='◉'; voiceModal.classList.add('listening'); $('#voiceCallStatus').textContent='TE ESTOY ESCUCHANDO'; };
  speechRecognition.onend=()=>{ listening=false; $('#voiceButton').textContent='🎙'; voiceModal.classList.remove('listening'); if(voiceCallActive && $('#voiceCallStatus').textContent==='TE ESTOY ESCUCHANDO') $('#voiceCallStatus').textContent='TOCA EL MICRÓFONO PARA HABLAR'; };
  speechRecognition.onerror=event=>{ showToast(event.error==='not-allowed'?'Permite el micrófono para hablar con Chili':'No se pudo usar el micrófono'); };
  speechRecognition.onresult=event=>{
    const transcript=text(event.results[0][0].transcript,700);
    if(voiceCallActive){ $('#voiceTranscript').textContent=transcript; submitQuestion(transcript,{fromVoice:true}); }
    else{ input.value=transcript; resizeInput(); input.focus(); }
  };
  $('#voiceButton').addEventListener('click',()=>startListening(false));
}

async function initializeIdentity(uid){
  currentUid=uid||'guest';
  try{
    const profile=window.JemmoSession?.readLocalProfile?.(currentUid)||{}; const name=text(profile.name||profile.displayName||'',40);
    if(name) $('#welcomeText').textContent=`Hola, ${name}. Puedo guiarte por JEMMO, explicar tareas y llevarte a soporte humano.`;
  }catch{}
  history=await readHistory(); renderHistory(); loadTickets();
}

renderTaskTable(); renderSupportCategories(); setupVoice(); resizeInput();
window.addEventListener('jemmo-auth-ready',event=>initializeIdentity(event.detail?.uid));
setTimeout(()=>{ if(currentUid==='guest'){ let uid=''; try{uid=localStorage.getItem('jemmo_active_uid')||sessionStorage.getItem('jemmo_active_uid')||'';}catch{} initializeIdentity(uid); } },900);
setTimeout(()=>{ const id=location.hash.replace('#',''); if(id) scrollToSection(id); },500);
window.JemmoChili={ask:submitQuestion,suggestions:SUGGESTIONS,openVoiceCall,openSupport:()=>scrollToSection('soporte')};
