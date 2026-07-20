(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = localStorage.getItem('jemmo_active_uid') || 'local-user';
  const PROFILE_KEY = `jemmo_rooms_profile_v1_${uid}`;
  const LEVEL = Number(localStorage.getItem('jemmo_transmission_level') || 1);
  const VIP = localStorage.getItem('jemmo_vip_active') === 'true';

  const state = {
    type: null,
    capacity: 4,
    coverData: '',
    micStream: null,
    cameraStream: null,
    micReady: false,
    cameraReady: false,
    cameraFacing: 'user',
    filter: 'natural',
    roomActive: false,
    meterFrame: null,
    audioContext: null,
    taskSeconds: 0,
    taskTimer: null,
    micMuted: false
  };

  const stopStream = stream => {
    stream?.getTracks().forEach(track => {
      try { track.stop(); } catch {}
    });
  };

  const toast = (text, duration = 2500) => {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), duration);
  };

  const setHidden = (el, hidden) => { if (el) el.hidden = hidden; };

  function openMenu() {
    $('menuBackdrop').hidden = false;
    $('sideMenu').classList.add('open');
    $('sideMenu').setAttribute('aria-hidden', 'false');
  }

  function closeMenu() {
    $('menuBackdrop').hidden = true;
    $('sideMenu').classList.remove('open');
    $('sideMenu').setAttribute('aria-hidden', 'true');
  }

  $('menuOpen')?.addEventListener('click', openMenu);
  $('menuClose')?.addEventListener('click', closeMenu);
  $('menuBackdrop')?.addEventListener('click', closeMenu);
  $$('[data-demo]').forEach(button => button.addEventListener('click', () => toast(`${button.dataset.demo}: se conectará en una fase posterior.`)));

  $('logoutButton')?.addEventListener('click', async () => {
    try {
      const [{ initializeApp, getApps }, { getAuth, signOut }] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js')
      ]);
      const config = {
        apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
        authDomain: 'jemmo-live.firebaseapp.com',
        projectId: 'jemmo-live',
        storageBucket: 'jemmo-live.firebasestorage.app',
        messagingSenderId: '355540892255',
        appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
      };
      const app = getApps()[0] || initializeApp(config);
      await signOut(getAuth(app));
    } catch {}
    localStorage.removeItem('jemmo_active_uid');
    localStorage.removeItem('jemmo_session');
    sessionStorage.clear();
    location.replace('acceso.html');
  });

  function renderCapacityOptions() {
    const capacities = state.type === 'audio' ? [4, 8, 12, 15, 25] : [4, 8, 12, 15];
    const wrap = $('capacityOptions');
    wrap.innerHTML = '';
    capacities.forEach(capacity => {
      const button = document.createElement('button');
      const locked = capacity === 25 && !VIP;
      button.type = 'button';
      button.dataset.capacity = String(capacity);
      button.classList.toggle('active', state.capacity === capacity);
      button.classList.toggle('locked', locked);
      button.innerHTML = locked ? `${capacity}<small>VIP</small>` : String(capacity);
      button.addEventListener('click', () => {
        if (locked) {
          toast('La sala de 25 plazas se desbloquea con VIP.');
          return;
        }
        state.capacity = capacity;
        renderCapacityOptions();
        $('capacitySummary').textContent = `${capacity} plazas`;
        validate();
      });
      wrap.append(button);
    });
    $('vipNote').hidden = state.type !== 'audio';
    $('capacitySummary').textContent = `${state.capacity} plazas`;
  }

  function enterPreparation(type) {
    state.type = type;
    if (type === 'camera' && state.capacity === 25) state.capacity = 15;
    $('roomsHome').hidden = true;
    $('prepScreen').hidden = false;
    $('prepTitle').textContent = type === 'audio' ? 'Audio Room' : 'Sala con cámara';
    $('prepEyebrow').textContent = type === 'audio' ? 'PREPARAR AUDIO ROOM' : 'PREPARAR SALA CON CÁMARA';
    $('mediaTitle').textContent = type === 'audio' ? 'Prueba de audio' : 'Cámara y sonido';
    $('mediaSubtitle').textContent = type === 'audio' ? 'Comprueba que se te escucha correctamente' : 'Ajusta cámara, filtros y micrófono';
    $('cameraPreviewWrap').hidden = type !== 'camera';
    $('filterRow').hidden = type !== 'camera';
    $('beautyControl').hidden = type !== 'camera';
    $('cameraCheckText').textContent = type === 'camera' ? 'Activa la vista previa y ajusta el encuadre' : 'No necesaria en Audio Room';
    renderCapacityOptions();
    validate();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $$('[data-room-type]').forEach(button => button.addEventListener('click', () => enterPreparation(button.dataset.roomType)));

  $('backToTypes')?.addEventListener('click', () => {
    stopCamera();
    $('prepScreen').hidden = true;
    $('roomsHome').hidden = false;
    state.type = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function setEditorCollapsed(collapsed) {
    $('editorBody').classList.toggle('collapsed', collapsed);
    $('editorSaved').hidden = !collapsed;
    $('editorToggle').setAttribute('aria-expanded', String(!collapsed));
    $('editorArrow').textContent = collapsed ? '⌄' : '⌃';
  }

  function refreshSavedSummary() {
    $('savedCover').src = state.coverData || 'jemmo-logo-header.webp';
    $('savedTitle').textContent = $('roomTitle').value.trim() || 'Mi sala';
    $('savedDescription').textContent = $('roomDescription').value.trim() || 'Datos guardados';
    $('editorStatus').textContent = profileValid() ? 'Guardado · toca para editar' : 'Configura portada, título y descripción';
  }

  function readProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; }
  }

  function loadProfile() {
    const profile = readProfile();
    if (!profile) {
      refreshSavedSummary();
      setEditorCollapsed(false);
      return;
    }
    $('roomTitle').value = profile.title || '';
    $('roomDescription').value = profile.description || '';
    $('privacy').value = profile.privacy || 'public';
    $('seatAccess').value = profile.seatAccess || 'approval';
    state.coverData = profile.coverData || '';
    if (state.coverData) $('coverPreview').src = state.coverData;
    refreshSavedSummary();
    setEditorCollapsed(profileValid());
  }

  function profileValid() {
    return $('roomTitle').value.trim().length >= 5 &&
      $('roomDescription').value.trim().length >= 10 &&
      String(state.coverData).startsWith('data:image/');
  }

  async function imageToDataUrl(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = 'async';
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = objectUrl;
      });
      const maxSide = 720;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d', { alpha: false });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL('image/webp', 0.82);
      if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', 0.84);
      return data;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  $('coverInput')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Selecciona una imagen válida.');
      return;
    }
    try {
      state.coverData = await imageToDataUrl(file);
      $('coverPreview').src = state.coverData;
      refreshSavedSummary();
      validate();
    } catch {
      toast('No se pudo preparar esa portada.');
    }
  });

  ['roomTitle', 'roomDescription', 'privacy', 'seatAccess'].forEach(id => {
    $(id)?.addEventListener('input', () => { refreshSavedSummary(); validate(); });
    $(id)?.addEventListener('change', () => { refreshSavedSummary(); validate(); });
  });

  $('saveRoomProfile')?.addEventListener('click', () => {
    if (!profileValid()) {
      toast('Completa portada, título y descripción antes de guardar.');
      validate();
      return;
    }
    const profile = {
      title: $('roomTitle').value.trim(),
      description: $('roomDescription').value.trim(),
      privacy: $('privacy').value,
      seatAccess: $('seatAccess').value,
      coverData: state.coverData,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      refreshSavedSummary();
      setEditorCollapsed(true);
      toast('Datos de la sala guardados.');
    } catch {
      toast('No hay espacio suficiente para guardar la portada.');
    }
    validate();
  });

  $('editorToggle')?.addEventListener('click', () => setEditorCollapsed(!$('editorBody').classList.contains('collapsed')));
  $('editSaved')?.addEventListener('click', () => setEditorCollapsed(false));

  async function getMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
    stopStream(state.micStream);
    state.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: $('echoCancellation').checked,
        noiseSuppression: $('noiseReduction').checked,
        autoGainControl: true
      },
      video: false
    });
    state.micReady = state.micStream.getAudioTracks().some(track => track.readyState === 'live');
    startMeter(state.micStream);
  }

  function startMeter(stream) {
    cancelAnimationFrame(state.meterFrame);
    try { state.audioContext?.close(); } catch {}
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    state.audioContext = context;
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      $('audioMeter').style.height = `${Math.max(6, Math.min(100, average * 1.4))}%`;
      state.meterFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  $('testMicrophone')?.addEventListener('click', async () => {
    $('micText').textContent = 'Solicitando permiso…';
    try {
      await getMicrophone();
      $('micText').textContent = 'Micrófono listo';
      $('mediaState').textContent = state.type === 'camera' && !state.cameraReady ? 'Falta cámara' : 'Listo';
      $('mediaState').className = 'jr-mini-state green';
      toast('Micrófono comprobado correctamente.');
    } catch (error) {
      state.micReady = false;
      $('micText').textContent = error?.name === 'NotAllowedError' ? 'Permiso rechazado' : 'No se pudo abrir';
      $('mediaState').textContent = 'Revisar';
      $('mediaState').className = 'jr-mini-state red';
      toast('Activa el permiso del micrófono en el navegador.');
    }
    validate();
  });

  function cameraFilterValue() {
    const beauty = Number($('beautyLevel').value || 0);
    const soft = beauty / 100 * 1.5;
    const filters = {
      natural: `brightness(1) saturate(1) blur(${soft * 0.15}px)`,
      warm: `brightness(1.04) saturate(1.12) sepia(.12) blur(${soft * 0.15}px)`,
      bright: `brightness(1.16) saturate(1.04) blur(${soft * 0.12}px)`,
      soft: `brightness(1.08) saturate(.95) contrast(.94) blur(${soft * 0.35}px)`
    };
    return filters[state.filter];
  }

  function applyCameraFilter() {
    $('cameraPreview').style.filter = cameraFilterValue();
    const hostVideo = $('seatStage').querySelector('video');
    if (hostVideo) hostVideo.style.filter = cameraFilterValue();
  }

  function stopCamera() {
    stopStream(state.cameraStream);
    state.cameraStream = null;
    state.cameraReady = false;
    $('cameraPreview').srcObject = null;
    $('cameraEmpty').hidden = false;
  }

  async function activateCamera() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
    stopCamera();
    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: state.cameraFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    $('cameraPreview').srcObject = state.cameraStream;
    state.cameraReady = state.cameraStream.getVideoTracks().some(track => track.readyState === 'live');
    $('cameraEmpty').hidden = state.cameraReady;
    applyCameraFilter();
  }

  $('startCamera')?.addEventListener('click', async () => {
    try {
      await activateCamera();
      $('startCamera').textContent = 'Cámara lista';
      toast('Cámara activada. Ajusta encuadre y filtros.');
    } catch (error) {
      state.cameraReady = false;
      toast(error?.name === 'NotAllowedError' ? 'Activa el permiso de cámara.' : 'No se pudo activar la cámara.');
    }
    validate();
  });

  $('switchCamera')?.addEventListener('click', async () => {
    state.cameraFacing = state.cameraFacing === 'user' ? 'environment' : 'user';
    try { await activateCamera(); toast('Cámara cambiada.'); } catch { toast('Este móvil no pudo cambiar de cámara.'); }
    validate();
  });

  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    $$('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
    applyCameraFilter();
  }));

  $('beautyLevel')?.addEventListener('input', () => {
    $('beautyOutput').textContent = `${$('beautyLevel').value}%`;
    applyCameraFilter();
  });

  function setCheck(id, ok) { $(id).classList.toggle('ok', Boolean(ok)); }

  function validate() {
    const typeOk = Boolean(state.type) && [4, 8, 12, 15, 25].includes(state.capacity) && !(state.type === 'camera' && state.capacity === 25) && !(state.capacity === 25 && !VIP);
    const profileOk = profileValid();
    const micOk = state.micReady;
    const cameraOk = state.type !== 'camera' || state.cameraReady;
    const connectionOk = navigator.onLine;
    const ready = typeOk && profileOk && micOk && cameraOk && connectionOk;

    setCheck('checkType', typeOk);
    setCheck('checkProfile', profileOk);
    setCheck('checkMic', micOk);
    setCheck('checkCamera', cameraOk);
    setCheck('checkConnection', connectionOk);
    $('connectionText').textContent = connectionOk ? 'Conexión disponible' : 'Sin conexión';

    $('launchRoom').disabled = !ready;
    $('globalStatus').className = `jr-status-pill ${ready ? 'green' : connectionOk ? 'orange' : 'red'}`;
    $('globalStatus').querySelector('b').textContent = ready ? 'Todo listo' : connectionOk ? 'Preparando' : 'Sin conexión';
    $('readinessBox').className = `jr-readiness ${ready ? 'green' : connectionOk ? 'orange' : 'red'}`;
    $('readinessTitle').textContent = ready ? 'Preparación completada' : 'Preparación incompleta';

    const missing = [];
    if (!typeOk) missing.push('tipo o capacidad');
    if (!profileOk) missing.push('datos de la sala');
    if (!micOk) missing.push('micrófono');
    if (!cameraOk) missing.push('cámara');
    if (!connectionOk) missing.push('conexión');
    $('readinessText').textContent = ready ? 'La luz está verde. Ya puedes iniciar la sala.' : `Pendiente: ${missing.join(', ')}.`;
    return ready;
  }

  window.addEventListener('online', validate);
  window.addEventListener('offline', validate);

  function initials(name) {
    return name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  }

  const names = ['Jesús','Ruth','Luna','Alex','Mía','King','Yandira','Coral','Neri','Mako','Sora','Koi','Mar','Tide','Cuba','Tenerife','Aqua','Sol','Reef','Indigo','Nami','Wave','Jem','Star','Blue'];

  function renderAudioSeats() {
    const stage = $('seatStage');
    stage.innerHTML = '';
    stage.dataset.mode = 'audio';
    stage.dataset.count = String(state.capacity);
    for (let i = 0; i < state.capacity; i += 1) {
      const name = names[i] || `Plaza ${i + 1}`;
      const seat = document.createElement('button');
      seat.type = 'button';
      seat.className = `jr-seat${i === 0 ? ' host' : ''}`;
      seat.innerHTML = `<span class="jr-seat-avatar"><small>${i + 1}</small>${i === 0 ? initials(name) : '+'}<i>${i === 0 ? '🎙' : '○'}</i></span><b>${i === 0 ? name : 'Libre'}</b><small>${i === 0 ? 'Anfitrión' : 'Toca para subir'}</small>`;
      seat.addEventListener('click', () => toast(i === 0 ? 'Este es el anfitrión de la sala.' : `Solicitud para la silla ${i + 1}.`));
      stage.append(seat);
    }
  }

  function renderCameraSeats() {
    const stage = $('seatStage');
    stage.innerHTML = '';
    stage.dataset.mode = 'camera';
    stage.dataset.count = String(state.capacity);
    for (let i = 0; i < state.capacity; i += 1) {
      const seat = document.createElement('button');
      seat.type = 'button';
      seat.className = 'jr-video-seat';
      if (i === 0) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.srcObject = state.cameraStream;
        video.style.filter = cameraFilterValue();
        seat.append(video);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'jr-video-placeholder';
        placeholder.innerHTML = `<b>＋</b><small>Plaza ${i + 1}</small>`;
        seat.append(placeholder);
      }
      const footer = document.createElement('footer');
      footer.innerHTML = `<b>${i === 0 ? 'Jesús' : 'Libre'}</b><span>${i === 0 ? '🎙' : '○'}</span>`;
      seat.append(footer);
      seat.addEventListener('click', () => toast(i === 0 ? 'Cámara del anfitrión.' : `Invitar a la plaza ${i + 1}.`));
      stage.append(seat);
    }
  }

  function startTaskIfEligible() {
    clearInterval(state.taskTimer);
    state.taskSeconds = 0;
    $('taskTimer').hidden = true;
    if (state.type === 'camera' && LEVEL >= 5) {
      $('taskTitle').textContent = 'Tarea de cámara en curso';
      $('taskText').textContent = 'Solo cuenta para el anfitrión. La tarea de silla continúa bloqueada aquí.';
      $('taskTimer').hidden = false;
      $('taskBanner').querySelector('i').style.background = 'var(--green)';
      state.taskTimer = setInterval(() => {
        state.taskSeconds += 1;
        const minutes = String(Math.floor(state.taskSeconds / 60)).padStart(2, '0');
        const seconds = String(state.taskSeconds % 60).padStart(2, '0');
        $('taskTimer').textContent = `${minutes}:${seconds}`;
        if (state.taskSeconds >= 60) {
          clearInterval(state.taskTimer);
          $('taskTitle').textContent = 'Tarea de cámara completada';
          $('taskText').textContent = 'Pendiente de validación/cobro del anfitrión.';
          $('taskBanner').querySelector('i').style.background = 'var(--orange)';
          toast('Tarea de cámara de prueba completada.');
        }
      }, 1000);
    } else if (state.type === 'camera') {
      $('taskTitle').textContent = 'Tarea de cámara bloqueada';
      $('taskText').textContent = `Disponible desde nivel 5. Nivel actual de prueba: ${LEVEL}.`;
      $('taskBanner').querySelector('i').style.background = 'var(--orange)';
    } else {
      $('taskTitle').textContent = 'Audio Room sin tarea de silla';
      $('taskText').textContent = 'La tarea de silla solo se completa en la sala oficial de la Casa.';
      $('taskBanner').querySelector('i').style.background = 'var(--red)';
    }
  }

  function launchRoom() {
    if (!validate()) {
      toast('Todavía hay pasos pendientes.');
      return;
    }
    state.roomActive = true;
    $('activeType').textContent = state.type === 'audio' ? 'AUDIO ROOM' : 'SALA CON CÁMARA';
    $('activeTitle').textContent = $('roomTitle').value.trim();
    $('activeCapacity').textContent = `${state.capacity} plazas`;
    $('activeCover').src = state.coverData;
    state.type === 'audio' ? renderAudioSeats() : renderCameraSeats();
    startTaskIfEligible();
    $('activeRoom').hidden = false;
    document.body.style.overflow = 'hidden';
    toast('Sala iniciada correctamente.');
  }

  $('launchRoom')?.addEventListener('click', launchRoom);

  function endRoom() {
    if (!confirm('¿Finalizar esta sala ahora?')) return;
    state.roomActive = false;
    clearInterval(state.taskTimer);
    $('activeRoom').hidden = true;
    document.body.style.overflow = '';
    $('chatMessages').innerHTML = '<p><b>JEMMO</b><span>La sala está preparada. Respeta las normas y disfruta.</span></p>';
    toast('Sala finalizada.');
  }

  $('endRoom')?.addEventListener('click', endRoom);

  $('chatForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const text = $('chatInput').value.trim();
    if (!text) return;
    const row = document.createElement('p');
    const name = document.createElement('b');
    name.textContent = 'Tú';
    const message = document.createElement('span');
    message.textContent = text;
    row.append(name, message);
    $('chatMessages').append(row);
    $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
    $('chatInput').value = '';
  });

  $('micToggle')?.addEventListener('click', () => {
    state.micMuted = !state.micMuted;
    state.micStream?.getAudioTracks().forEach(track => { track.enabled = !state.micMuted; });
    $('micToggle').querySelector('b').textContent = state.micMuted ? 'Activar' : 'Micro';
    toast(state.micMuted ? 'Micrófono silenciado.' : 'Micrófono activado.');
  });

  $('inviteButton')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('Enlace de la sala copiado.'); }
    catch { toast('Comparte el enlace desde el menú del navegador.'); }
  });

  $('copyRoomLink')?.addEventListener('click', () => $('inviteButton').click());
  $('giftButton')?.addEventListener('click', () => toast('Panel de regalos preparado para conectar con el monedero.'));
  $('chatToggle')?.addEventListener('click', () => {
    $('roomChat').hidden = !$('roomChat').hidden;
  });
  $('settingsButton')?.addEventListener('click', () => { $('settingsPanel').hidden = false; });
  $('closeSettings')?.addEventListener('click', () => { $('settingsPanel').hidden = true; });
  $('roomComments')?.addEventListener('change', () => { $('roomChat').hidden = !$('roomComments').checked; });
  $('roomSeatsOpen')?.addEventListener('change', () => toast($('roomSeatsOpen').checked ? 'Sillas abiertas.' : 'Sillas cerradas.'));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.roomActive) toast('La sala continúa activa. No permanezcas fuera más de 5 minutos.');
  });

  window.addEventListener('beforeunload', () => {
    stopStream(state.micStream);
    stopStream(state.cameraStream);
    cancelAnimationFrame(state.meterFrame);
    clearInterval(state.taskTimer);
  });

  loadProfile();
  validate();
  document.documentElement.classList.remove('jemmo-auth-pending');
})();
