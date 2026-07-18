
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

const prepareScreen = qs('#prepareScreen');
const liveScreen = qs('#liveScreen');
const mainVideo = qs('#mainVideo');
const selfieVideo = qs('#selfieVideo');
const liveMainVideo = qs('#liveMainVideo');
const liveSelfieVideo = qs('#liveSelfieVideo');
const stage = qs('#cameraStage');
const selfieBox = qs('#selfieBox');
const mainPlaceholder = qs('#mainPlaceholder');
const selfiePlaceholder = qs('#selfiePlaceholder');
const mainLabel = qs('#mainLabel');
const cameraStatus = qs('#cameraStatus');

let mainStream = null;
let selfieStream = null;
let currentMode = 'front';
let liveStartedAt = null;
let timerInterval = null;

function showModal(title, text){
  qs('#modalTitle').textContent = title;
  qs('#modalText').textContent = text;
  qs('#modal').classList.remove('hidden');
}
qs('#modalOk').onclick = () => qs('#modal').classList.add('hidden');

function stopStream(stream){
  if(stream) stream.getTracks().forEach(track => track.stop());
}
function stopAll(){
  stopStream(mainStream); stopStream(selfieStream);
  mainStream = null; selfieStream = null;
}

async function getVideo(facingMode){
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: facingMode }, width:{ideal:1280}, height:{ideal:720} },
    audio: false
  });
}

async function startMode(mode){
  currentMode = mode;
  stopAll();
  cameraStatus.textContent = 'Abriendo cámara…';
  mainPlaceholder.classList.remove('hidden');
  selfiePlaceholder.classList.remove('hidden');
  stage.classList.toggle('dual', mode === 'dual');
  stage.classList.toggle('single', mode !== 'dual');

  if(!navigator.mediaDevices?.getUserMedia){
    cameraStatus.textContent = 'No disponible';
    showModal('Cámara no disponible','Este navegador no permite acceder a la cámara.');
    return;
  }

  try{
    if(mode === 'front'){
      mainStream = await getVideo('user');
      mainVideo.srcObject = mainStream;
      mainLabel.textContent = 'CÁMARA FRONTAL';
      mainPlaceholder.classList.add('hidden');
    } else if(mode === 'back'){
      mainStream = await getVideo('environment');
      mainVideo.srcObject = mainStream;
      mainLabel.textContent = 'CÁMARA TRASERA';
      mainPlaceholder.classList.add('hidden');
    } else {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let cams = devices.filter(d => d.kind === 'videoinput');
      if(cams.length < 2){
        throw new Error('DUAL_NOT_SUPPORTED');
      }

      // Intentamos mantener abiertas ambas cámaras a la vez.
      mainStream = await getVideo('environment');
      try{
        selfieStream = await getVideo('user');
      }catch(err){
        stopStream(mainStream); mainStream = null;
        throw new Error('DUAL_NOT_SUPPORTED');
      }

      mainVideo.srcObject = mainStream;
      selfieVideo.srcObject = selfieStream;
      mainLabel.textContent = 'CÁMARA TRASERA';
      mainPlaceholder.classList.add('hidden');
      selfiePlaceholder.classList.add('hidden');
    }
    cameraStatus.textContent = 'Cámara lista';
  }catch(err){
    cameraStatus.textContent = 'No compatible';
    if(mode === 'dual'){
      showModal(
        'Ambas cámaras no disponibles',
        'Tu móvil no soporta mantener la cámara frontal y la trasera abiertas al mismo tiempo. Puedes continuar con la cámara frontal o la trasera.'
      );
      qsa('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'front'));
      startMode('front');
    }else{
      showModal('No se pudo abrir la cámara','Comprueba los permisos de cámara del navegador y vuelve a intentarlo.');
    }
  }
}

qsa('.mode-btn').forEach(btn => {
  btn.onclick = () => {
    qsa('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    startMode(btn.dataset.mode);
  };
});

qs('#retryCamera').onclick = () => startMode(currentMode);
qs('#flipCamera').onclick = () => {
  const next = currentMode === 'front' ? 'back' : 'front';
  qsa('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === next));
  startMode(next);
};

function formatTime(ms){
  const total = Math.max(0, Math.floor(ms/1000));
  const h = String(Math.floor(total/3600)).padStart(2,'0');
  const m = String(Math.floor((total%3600)/60)).padStart(2,'0');
  const s = String(total%60).padStart(2,'0');
  return `${h}:${m}:${s}`;
}

function startTimer(){
  liveStartedAt = Date.now();
  clearInterval(timerInterval);
  timerInterval = setInterval(()=>{
    const t = formatTime(Date.now()-liveStartedAt);
    qs('#prepareTimer').textContent = t;
    qs('#miniTimer').textContent = t;
    qs('#liveTimer').textContent = t;
  },1000);
}

function transferStreamsToLive(){
  if(currentMode === 'dual'){
    liveMainVideo.srcObject = mainStream;
    liveSelfieVideo.srcObject = selfieStream;
    qs('#liveSelfieBox').style.display = 'block';
  }else if(currentMode === 'back'){
    liveMainVideo.srcObject = mainStream;
    qs('#liveSelfieBox').style.display = 'none';
  }else{
    liveMainVideo.srcObject = mainStream;
    qs('#liveSelfieBox').style.display = 'none';
  }
  qs('#liveFallback').style.display = mainStream ? 'none' : 'grid';
}

qs('#startBtn').onclick = () => {
  const title = qs('#liveTitle').value.trim();
  if(!title){
    showModal('Falta el título','Escribe un título antes de iniciar la transmisión.');
    return;
  }
  if(!mainStream){
    showModal('Cámara no preparada','Activa una cámara antes de iniciar el LIVE.');
    return;
  }
  transferStreamsToLive();
  prepareScreen.classList.remove('active');
  liveScreen.classList.add('active');
  startTimer();
};

qs('#closeLive').onclick = () => {
  liveScreen.classList.remove('active');
  prepareScreen.classList.add('active');
  clearInterval(timerInterval);
  startMode(currentMode);
};

qs('#previewBtn').onclick = () => showModal('Vista previa','La vista previa ya está activa en la cámara superior.');
qs('#detailsBtn').onclick = () => showModal('Detalles','Título, categoría, micrófono, cámara y conexión están listos para revisar.');

qs('#camToggle').onchange = e => {
  if(e.target.checked) startMode(currentMode);
  else {
    stopAll();
    mainPlaceholder.classList.remove('hidden');
    selfiePlaceholder.classList.remove('hidden');
    cameraStatus.textContent = 'Cámara apagada';
  }
};

const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
if(connection){
  const updateConnection = () => {
    const type = connection.effectiveType || '4g';
    qs('#connectionText').textContent = `Conexión ${type.toUpperCase()}`;
    qs('#connectionBadge').textContent = ['4g','5g'].includes(type) ? 'Excelente' : type === '3g' ? 'Aceptable' : 'Débil';
  };
  updateConnection();
  connection.addEventListener?.('change', updateConnection);
}else{
  qs('#connectionText').textContent = 'Conexión disponible';
}

window.addEventListener('beforeunload', stopAll);
startMode('front');
