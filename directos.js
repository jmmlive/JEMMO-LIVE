(() => {
  'use strict';

  const lives = [
    {id:'luna',name:'Luna',country:'España',flag:'🇪🇸',city:'Madrid',topic:'Charlando y música',viewers:1240,following:true,verified:true,initials:'L',tone:['#a92d88','#351146'],level:18},
    {id:'ruth',name:'Ruth',country:'Cuba',flag:'🇨🇺',city:'Cienfuegos',topic:'Tarde con mi comunidad',viewers:982,following:true,verified:true,initials:'R',tone:['#c74b65','#3c111d'],level:12},
    {id:'alex',name:'Alex',country:'España',flag:'🇪🇸',city:'Tenerife',topic:'Preguntas y risas',viewers:890,following:false,verified:true,initials:'A',tone:['#9a7444','#312114'],level:15},
    {id:'mia',name:'Mía',country:'México',flag:'🇲🇽',city:'Ciudad de México',topic:'Maquillaje y conversación',viewers:760,following:true,verified:true,initials:'M',tone:['#c74786','#40122f'],level:21},
    {id:'king',name:'King',country:'República Dominicana',flag:'🇩🇴',city:'Santo Domingo',topic:'Música urbana en vivo',viewers:650,following:false,verified:true,initials:'K',tone:['#4454c7','#151944'],level:26},
    {id:'daniela',name:'Daniela',country:'Colombia',flag:'🇨🇴',city:'Medellín',topic:'Conociendo gente nueva',viewers:604,following:true,verified:false,initials:'D',tone:['#df6e43','#4b2115'],level:9},
    {id:'leo',name:'Leo',country:'Venezuela',flag:'🇻🇪',city:'Caracas',topic:'Retos con seguidores',viewers:551,following:false,verified:false,initials:'L',tone:['#1d87a8','#0c3343'],level:11},
    {id:'sofia',name:'Sofía',country:'Cuba',flag:'🇨🇺',city:'La Habana',topic:'Noche cubana',viewers:498,following:true,verified:true,initials:'S',tone:['#a94fc7','#371442'],level:17},
    {id:'mateo',name:'Mateo',country:'México',flag:'🇲🇽',city:'Guadalajara',topic:'Gaming y charla',viewers:432,following:false,verified:false,initials:'M',tone:['#267c63','#0e3427'],level:13},
    {id:'valeria',name:'Valeria',country:'España',flag:'🇪🇸',city:'Barcelona',topic:'Moda y estilo',viewers:390,following:false,verified:true,initials:'V',tone:['#d9499c','#411331'],level:20},
    {id:'camilo',name:'Camilo',country:'Colombia',flag:'🇨🇴',city:'Cali',topic:'Salsa y buena energía',viewers:344,following:true,verified:false,initials:'C',tone:['#d38121','#4c2d0a'],level:14},
    {id:'natalia',name:'Natalia',country:'Venezuela',flag:'🇻🇪',city:'Maracaibo',topic:'Café y conversación',viewers:318,following:false,verified:false,initials:'N',tone:['#9743b2','#32103c'],level:8},
    {id:'ismael',name:'Ismael',country:'Cuba',flag:'🇨🇺',city:'Camagüey',topic:'Historias y humor',viewers:287,following:false,verified:false,initials:'I',tone:['#3f78c3','#152a48'],level:10},
    {id:'carla',name:'Carla',country:'República Dominicana',flag:'🇩🇴',city:'Santiago',topic:'Baile y tendencias',viewers:254,following:true,verified:true,initials:'C',tone:['#d13d6c','#431020'],level:16},
    {id:'paula',name:'Paula',country:'España',flag:'🇪🇸',city:'Sevilla',topic:'Cocina rápida en directo',viewers:213,following:false,verified:false,initials:'P',tone:['#ad6332','#3d2413'],level:7},
    {id:'diego',name:'Diego',country:'México',flag:'🇲🇽',city:'Monterrey',topic:'Batallas y comunidad',viewers:189,following:false,verified:false,initials:'D',tone:['#505db5','#1a2047'],level:12}
  ];

  const $ = selector => document.querySelector(selector);
  const grid = $('#directosGrid');
  const empty = $('#directosEmpty');
  const search = $('#liveSearch');
  const clearSearch = $('#clearSearch');
  const count = $('#liveCount');
  const title = $('#resultsTitle');
  const subtitle = $('#resultsSubtitle');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const toast = $('#directosToast');
  let activeFilter = 'all';

  const formatViewers = value => value >= 1000
    ? new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(value/1000) + 'K'
    : new Intl.NumberFormat('es-ES').format(value);

  const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__jemmoDirectosToast);
    window.__jemmoDirectosToast = setTimeout(() => toast.classList.remove('show'), 2100);
  }

  function cardTemplate(live) {
    const avatar = live.image
      ? `<img src="${escapeHtml(live.image)}" alt="Foto de ${escapeHtml(live.name)}">`
      : escapeHtml(live.initials);
    return `<button class="directo-card${live.following ? ' following' : ''}" type="button" data-live-id="${escapeHtml(live.id)}" style="--tone-a:${live.tone[0]};--tone-b:${live.tone[1]}">
      <span class="directo-visual">
        <span class="directo-live-badge">LIVE</span>
        <span class="directo-viewers">◉ ${formatViewers(live.viewers)}</span>
        <span class="directo-avatar">${avatar}</span>
        <span class="directo-country">${live.flag} ${escapeHtml(live.city)}</span>
        ${live.following ? '<span class="directo-follow-mark">SIGUIENDO</span>' : ''}
      </span>
      <span class="directo-copy">
        <span class="directo-name"><strong>${escapeHtml(live.name)}</strong>${live.verified ? '<i aria-label="Cuenta verificada">✓</i>' : ''}</span>
        <span class="directo-topic">${escapeHtml(live.topic)}</span>
        <span class="directo-meta"><span>${escapeHtml(live.country)}</span><b>Nivel ${live.level}</b></span>
      </span>
    </button>`;
  }

  function filteredLives() {
    const term = search.value.trim().toLocaleLowerCase('es');
    return lives.filter(live => {
      const matchesFilter = activeFilter === 'all'
        || (activeFilter === 'following' && live.following)
        || live.country === activeFilter;
      if (!matchesFilter) return false;
      if (!term) return true;
      return `${live.name} ${live.country} ${live.city} ${live.topic}`.toLocaleLowerCase('es').includes(term);
    });
  }

  function render() {
    const visible = filteredLives();
    grid.innerHTML = visible.map(cardTemplate).join('');
    grid.hidden = visible.length === 0;
    empty.hidden = visible.length !== 0;
    count.textContent = `${visible.length} LIVE`;
    clearSearch.hidden = search.value.length === 0;

    if (activeFilter === 'all') {
      title.textContent = 'Todos los directos';
      subtitle.textContent = search.value ? 'Resultados de tu búsqueda' : 'Personas conectadas ahora';
    } else if (activeFilter === 'following') {
      title.textContent = 'Personas que sigues';
      subtitle.textContent = 'Tus seguidos transmitiendo ahora';
    } else {
      title.textContent = `Directos de ${activeFilter}`;
      subtitle.textContent = 'Personas transmitiendo desde este país';
    }

    document.querySelectorAll('[data-live-id]').forEach(card => card.addEventListener('click', () => {
      const live = lives.find(item => item.id === card.dataset.liveId);
      if (!live) return;
      showToast(`Abriendo el LIVE de ${live.name}…`);
      // El visor remoto se conectará aquí cuando se integre el motor de transmisión real.
    }));
  }

  filters.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filters.forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    render();
    window.scrollTo({top:0,behavior:'smooth'});
  }));

  search.addEventListener('input', render);
  clearSearch.addEventListener('click', () => { search.value=''; search.focus(); render(); });
  $('#resetFilters').addEventListener('click', () => {
    activeFilter='all';
    search.value='';
    filters.forEach(item => {
      const selected=item.dataset.filter==='all';
      item.classList.toggle('active',selected);
      item.setAttribute('aria-selected',selected?'true':'false');
    });
    render();
  });
  $('#directosBack').addEventListener('click', () => {
    if (history.length > 1) history.back(); else location.assign('inicio.html');
  });

  const params = new URLSearchParams(location.search);
  const requested = params.get('filter');
  if (requested && filters.some(button => button.dataset.filter === requested)) {
    activeFilter = requested;
    filters.forEach(item => {
      const selected = item.dataset.filter === requested;
      item.classList.toggle('active',selected);
      item.setAttribute('aria-selected',selected?'true':'false');
    });
  }
  render();
})();
