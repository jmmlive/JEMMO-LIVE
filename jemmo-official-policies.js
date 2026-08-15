/* =========================================================
   JEMMO LIVE · FUENTE OFICIAL ÚNICA DE NORMAS PRUEBA 45
   Esta fuente alimenta Chili IA, Configuración y accesos de ayuda.
   No duplicar textos normativos en otras pantallas.
   ========================================================= */

export const JEMMO_POLICY_META = Object.freeze({
  id: 'jemmo-official-source-v1',
  version: 45,
  release: 'PRUEBA 45',
  title: 'Centro oficial Chili, Configuración, Normas, Pagos y Seguridad Financiera',
  publishedAt: '2026-07-28',
  locale: 'es-ES',
  mode: 'test',
  authoritative: true,
  notice: 'Toda la economía permanece en modo de pruebas. Antes de producción se requieren reglas de Firebase y backend autoritativo.'
});

export const AUDIO_ROOM_RATE = 800;

export const TASK_TIERS = Object.freeze([
  { code:'BASE', target:0, reward:2000, hours:1, label:'Inicial' },
  { code:'I', target:150000, reward:3000, hours:2, label:'Nivel I' },
  { code:'H', target:300000, reward:5000, hours:2, label:'Nivel H' },
  { code:'G', target:900000, reward:9000, hours:3, label:'Nivel G' },
  { code:'F', target:1200000, reward:12000, hours:3, label:'Nivel F' },
  { code:'E', target:2000000, reward:18000, hours:3, label:'Nivel E' },
  { code:'D', target:4000000, reward:28000, hours:3, label:'Nivel D' },
  { code:'C', target:7000000, reward:35000, hours:3, label:'Nivel C' },
  { code:'B', target:10000000, reward:40000, hours:3, label:'Nivel B' },
  { code:'A', target:22000000, reward:50000, hours:3, label:'Nivel A' },
  { code:'S', target:50000000, reward:70000, hours:4, label:'Nivel S' }
]);

export const SUPPORT_CATEGORIES = Object.freeze([
  { id:'wallet', label:'Monedero, recarga o retirada', icon:'🪙', priority:'normal' },
  { id:'fraud', label:'Compra extraña, fraude o movimiento no reconocido', icon:'🚨', priority:'high' },
  { id:'access', label:'Acceso, cuenta o contraseña', icon:'🔐', priority:'normal' },
  { id:'tasks', label:'Tareas, LIVE o Audio Room', icon:'⏱️', priority:'normal' },
  { id:'technical', label:'Fallo técnico de la aplicación', icon:'🛠️', priority:'normal' },
  { id:'abuse', label:'Insultos, acoso o comportamiento', icon:'🚫', priority:'high' },
  { id:'minor', label:'Posible menor o riesgo urgente', icon:'🛡️', priority:'urgent' },
  { id:'identity', label:'Suplantación o cuenta falsa', icon:'👤', priority:'high' },
  { id:'other', label:'Otra consulta', icon:'✦', priority:'normal' }
]);

const A = (article) => Object.freeze({ status:'official', updatedAt:JEMMO_POLICY_META.publishedAt, ...article });

export const JEMMO_ARTICLES = Object.freeze([
  A({
    id:'community-rules', category:'normas', icon:'§', title:'Normas de la comunidad',
    summary:'Respeto, contenido permitido, protección de menores, moderación y consecuencias.',
    keywords:['normas','reglas','comunidad','respeto','contenido ilegal','moderacion','menores','sancion'],
    body:`JEMMO LIVE exige respeto entre participantes y prohíbe acoso, amenazas, suplantación, explotación, contenido ilegal, peligroso o sexual con menores. Los anfitriones y responsables pueden silenciar, bajar de una silla, expulsar o cerrar una transmisión cuando exista riesgo.\n\nLas sanciones graves no deben depender únicamente de una detección automática: el sistema debe conservar evidencia, avisos y contexto para revisión humana. Una emergencia o posible menor debe tratarse con prioridad de seguridad.`,
    actions:[{label:'Crear caso de soporte',section:'soporte'},{label:'Abrir Mensajes',route:'mensajes.html'}]
  }),
  A({
    id:'tasks-rates', category:'tareas', icon:'⏱️', title:'Tareas, niveles y tarifas',
    summary:'LIVE usa escala por nivel; Audio Room paga 800 JEMS por hora completa.',
    keywords:['tarea','tareas','tarifa','tarifas','audio room','live paga','nivel','800','2000','3000','hora completa'],
    body:`Las tareas remuneradas son exclusivas para Emisoras vinculadas a una Casa o Agencia. Audio Room paga **800 JEMS por cada hora completa**, con un máximo de **2 horas remunerables** por ciclo y sin aumento por nivel. LIVE usa la tarifa del nivel y admite un máximo de **3 horas remunerables** por ciclo.\n\nSolo los regalos netos recibidos en LIVE aumentan el nivel dentro de la ventana móvil de siete días. Los regalos de Audio Room, Perfil, Mensajes, Destellos o Batalla no aumentan la tarea. Nivel S permite cuatro horas totales, pero obliga a combinar modalidades: 3 LIVE + 1 Audio Room o 2 LIVE + 2 Audio Room.`,
    actions:[{label:'Ver tabla completa',section:'tareas'},{label:'Abrir Mis tareas',route:'casas.html'}]
  }),
  A({
    id:'task-cycle', category:'tareas', icon:'24', title:'Ciclo, cronómetro y cobro de tareas',
    summary:'Cada ciclo dura 24 horas; los minutos se separan por modalidad y solo se pagan horas completas.',
    keywords:['24 horas','ciclo','cronometro','cronómetro','microfono','micrófono','silencio','silla','caduca','cobra'],
    body:`Cada tarea dispone de una ventana de 24 horas. Una hora incompleta no genera recompensa y lo no cobrado caduca al comenzar el ciclo siguiente. Los minutos de LIVE y Audio Room se guardan por separado.\n\nEn Audio Room el cronómetro exige que la Emisora esté en una silla con una pista real de micrófono. El silencio voluntario pausa; el silencio aplicado por moderación continúa mientras la Emisora permanezca correctamente sentada. Bajar de la silla o ser expulsada detiene el conteo.`,
    actions:[{label:'Abrir Audio Room',route:'salas.html'},{label:'Abrir LIVE',route:'live.html'}]
  }),
  A({
    id:'wallet-currencies', category:'pagos', icon:'🪙', title:'Monedas y monedero',
    summary:'JEMMOS para consumir, JEMS para ganancias retirables y CRISTALES para juegos.',
    keywords:['monedero','jemmos','jems','cristales','saldo','cambiar monedas','1:1'],
    body:`JEMMOS es la moneda recargable utilizada para regalos e interacción. JEMS representa ganancias de regalos, tareas y porcentajes y es la moneda destinada a retirada. CRISTALES se utiliza en juegos internos.\n\nLa conversión JEMMOS → CRISTALES es 1:1 y sin comisión. La comisión se aplica a los regalos o al método de retirada cuando corresponda, no a esa conversión. Todos los saldos actuales siguen siendo de prueba.`,
    actions:[{label:'Abrir Monedero',wallet:true},{label:'Configuración de pagos',route:'configuracion.html#pagos'}]
  }),
  A({
    id:'gifts-distribution', category:'pagos', icon:'🎁', title:'Reparto de regalos',
    summary:'70/20/10 con Casa; 70/30 sin Casa. Los autorregalos están prohibidos.',
    keywords:['regalos','70','20','10','reparto','comision','comisión','autorregalo','regalarme'],
    body:`Cuando la Emisora pertenece a una Casa, el reparto previsto es 70% Emisora, 20% JEMMO LIVE y 10% Casa o agente. Una Emisora independiente recibe 70% y JEMMO LIVE conserva 30%.\n\nNinguna cuenta puede enviarse regalos a sí misma. El bloqueo debe ocurrir antes de descontar JEMMOS, crear movimientos, repartir porcentajes o modificar tareas. Todo intento puede registrarse como evento de seguridad sin movimiento económico.`,
    actions:[{label:'Abrir Monedero',wallet:true},{label:'Seguridad financiera',article:'financial-security'}]
  }),
  A({
    id:'withdrawals', category:'pagos', icon:'↗', title:'Retiradas de JEMS',
    summary:'10.000 JEMS = 1 USD; mínimo 100.000 JEMS; solo ganancias confirmadas.',
    keywords:['retirada','retiro','retirar','100000','100.000','10000','10 usd','confirmados','comision retirada'],
    body:`La regla prevista es **10.000 JEMS = 1 USD** y una retirada mínima de **100.000 JEMS = 10 USD**. Solo pueden retirarse JEMS confirmados. Antes de aceptar, la pantalla debe mostrar importe solicitado, comisión, cantidad neta, método, moneda y red.\n\nUna retirada puede quedar retenida para revisión cuando existan recargas reversibles pendientes, actividad no reconocida, fraude probable, cambios bruscos de dispositivo o una alerta financiera abierta. En modo de pruebas no se mueve dinero real.`,
    actions:[{label:'Abrir Monedero',wallet:true},{label:'Soporte de retirada',section:'soporte'}]
  }),
  A({
    id:'authorized-payments', category:'pagos', icon:'✓', title:'Métodos de pago autorizados',
    summary:'Solo las rutas oficiales de JEMMO pueden acreditar JEMMOS.',
    keywords:['pago autorizado','metodo de pago','recarga oficial','google play','tarjeta','epay','usdt','usdc','cuba'],
    body:`Una recarga válida debe iniciarse dentro del Monedero oficial y terminar con una confirmación verificable del proveedor autorizado. JEMMO no debe acreditar saldo por enlaces externos, aplicaciones modificadas, comprobantes manipulados ni llamadas directas desde el dispositivo.\n\nLos métodos previstos son Google Play, tarjeta, Epay, USDT y USDC según país, disponibilidad y revisión de producción. Google Play no debe mostrarse cuando el país de Play sea Cuba. La red cripto debe coincidir exactamente con la red elegida.`,
    actions:[{label:'Configurar país y pagos',route:'configuracion.html#pagos'},{label:'Abrir Monedero',wallet:true}]
  }),
  A({
    id:'financial-security', category:'seguridad', icon:'🚨', title:'Seguridad financiera y antifraude',
    summary:'Bloqueo preventivo, cuarentena, revisión y trazabilidad de operaciones sospechosas.',
    keywords:['fraude','hackear','hacker','compra falsa','recarga falsa','recarga no autorizada','transaccion extraña','movimiento no reconocido','bloquear cuenta','cuarentena','contracargo'],
    body:`Cuando una compra no llega por una ruta oficial o sus datos no coinciden con el proveedor, JEMMO debe **bloquear la operación antes de acreditar JEMMOS**. El movimiento queda en cuarentena, se registra el motivo y la cuenta entra en seguimiento sin dar por culpable al usuario.\n\nMientras exista riesgo, pueden bloquearse regalos, conversiones o retiradas relacionadas. Las recargas reversibles deben mantener reserva hasta su confirmación; un contracargo no puede convertirse en una pérdida automática para JEMMO. La liberación, bloqueo permanente o devolución exige trazabilidad y revisión humana.\n\nAntes de producción, estas comprobaciones deben ejecutarse en backend confiable mediante validación de recibos, webhooks firmados, idempotencia, reglas por rol y Cloud Functions. El navegador por sí solo no protege dinero real.`,
    actions:[{label:'Reportar movimiento extraño',section:'soporte',preset:'fraud'},{label:'Configuración de seguridad',route:'configuracion.html#seguridad'}]
  }),
  A({
    id:'account-security', category:'seguridad', icon:'🔐', title:'Cuenta, sesión y dispositivos',
    summary:'Protección de credenciales, sesiones y cambios sensibles.',
    keywords:['seguridad cuenta','contraseña','sesion','sesión','dispositivo','codigo verificacion','código','cerrar sesiones'],
    body:`El correo, contraseña, códigos de verificación y datos bancarios nunca deben aparecer en perfiles, chats públicos ni capturas compartidas. Los cambios de contraseña, método de pago o retirada deben requerir una sesión autenticada y controles adicionales antes de producción.\n\nUna sesión desconocida, cambio brusco de dispositivo o múltiples intentos fallidos puede activar revisión temporal. El usuario debe poder cerrar sesión y solicitar soporte sin perder su perfil ni el historial económico.`,
    actions:[{label:'Abrir Configuración',route:'configuracion.html#cuenta'},{label:'Soporte de acceso',section:'soporte'}]
  }),
  A({
    id:'privacy', category:'privacidad', icon:'🔒', title:'Privacidad y tratamiento de datos',
    summary:'Datos privados separados de la identidad pública y acceso limitado a evidencia.',
    keywords:['privacidad','datos personales','correo','conversaciones privadas','capturas','evidencia','firebase rules'],
    body:`La identidad pública utiliza nombre, @usuario e ID JEMMO. El correo, teléfono, credenciales, direcciones de pago y conversaciones privadas deben permanecer restringidos. Chili no incorpora automáticamente chats privados a su conocimiento.\n\nLas capturas de soporte solo pueden utilizarse para investigar el caso y deben almacenarse con acceso limitado. Antes de producción, Firestore y Storage necesitan reglas autenticadas, separación por roles, retención definida y registro de accesos administrativos.`,
    actions:[{label:'Abrir privacidad',route:'configuracion.html#privacidad'},{label:'Soporte humano',section:'soporte'}]
  }),
  A({
    id:'houses-release', category:'casas', icon:'🏠', title:'Casas, Agencias y liberación',
    summary:'Ingreso informado y proceso escalonado para evitar retenciones indefinidas.',
    keywords:['casa','agencia','agente','liberacion','liberación','salir de casa','7 dias','5 dias','3 dias','retener'],
    body:`Antes de unirse a una Casa o Agencia, la Emisora debe ver la política de salida. Si la primera solicitud es rechazada, espera 7 días; tras un segundo rechazo, espera 5 días; en la tercera solicitud la liberación se ejecuta automáticamente después de 3 días. Contando el día inicial, el recorrido completo puede alcanzar 16 días naturales.\n\nSi el agente acepta, la salida es inmediata. Una solicitud sin respuesta no puede quedar abierta indefinidamente y debe producir liberación automática a los 15 días. Cada decisión conserva fecha, motivo y responsable.`,
    actions:[{label:'Abrir Mi Casa',route:'casas.html'},{label:'Consultar con Chili',section:'saber'}]
  }),
  A({
    id:'support-process', category:'soporte', icon:'🧑‍💻', title:'Soporte humano y seguimiento',
    summary:'Categoría, explicación, captura obligatoria, número de caso, fecha y estado.',
    keywords:['soporte','ticket','caso','referencia','captura obligatoria','estado','fecha','persona real'],
    body:`Una solicitud de soporte debe incluir categoría, lugar, explicación detallada, fecha aproximada del incidente y una captura obligatoria. Solo queda enviada cuando JEMMO genera un número de caso.\n\nEl historial muestra fecha de creación y estado: PENDIENTE, EN REVISIÓN, NECESITA INFORMACIÓN, RESUELTO o CERRADO. Chili puede orientar y preparar el formulario, pero no puede afirmar que una persona respondió si el estado no lo confirma.`,
    actions:[{label:'Abrir soporte humano',section:'soporte'}]
  }),
  A({
    id:'chili-center', category:'ayuda', icon:'✦', title:'Chili IA como centro oficial',
    summary:'Ayuda, funcionamiento, tareas, tarifas, pagos, normas, seguridad, Casas y soporte.',
    keywords:['chili','ayuda','centro oficial','como funciona jemmo','qué puedes hacer','que puedes hacer'],
    body:`Chili IA es el centro oficial de conocimiento de JEMMO LIVE. Debe explicar indicaciones, funcionamiento, tareas, tarifas, Monedero, regalos, pagos, retiradas, normas, seguridad, Casas, Agencias y soporte.\n\nLos accesos oficiales aparecen en Inicio, Perfil, Configuración, LIVE, Salas y Monedero. Chili utiliza esta fuente versionada; no aprende automáticamente de conversaciones privadas ni sustituye una revisión humana.`,
    actions:[{label:'Abrir Configuración',route:'configuracion.html'},{label:'Soporte humano',section:'soporte'}]
  })
]);

const normalize = (value='') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9@\s-]/g,' ').replace(/\s+/g,' ').trim();

export function getOfficialArticle(id){
  return JEMMO_ARTICLES.find(article => article.id === String(id || '').trim()) || null;
}

export function listOfficialArticles(category=''){
  const value = String(category || '').trim();
  return value ? JEMMO_ARTICLES.filter(article => article.category === value) : [...JEMMO_ARTICLES];
}

export function searchOfficialArticles(query=''){
  const text = normalize(query);
  if(!text) return [];
  const queryTokens = text.split(' ').filter(token => token.length > 3);
  return JEMMO_ARTICLES.map(article => {
    let score = 0;
    const haystack = normalize(`${article.title} ${article.summary} ${article.body}`);
    if(haystack.includes(text)) score += 12;
    for(const keyword of article.keywords || []){
      const key = normalize(keyword);
      if(!key) continue;
      if(text.includes(key)) score += key.includes(' ') ? 9 : 4;
      else if(text.length > 3 && key.includes(text)) score += 6;
      const keywordTokens = key.split(' ');
      for(const token of queryTokens) if(keywordTokens.includes(token)) score += 2;
    }
    for(const token of queryTokens) if(haystack.includes(token)) score += 1;
    return { article, score };
  }).filter(item => item.score > 0).sort((a,b) => b.score - a.score);
}

export function officialSourceStamp(){
  return `${JEMMO_POLICY_META.id}:${JEMMO_POLICY_META.version}:${JEMMO_POLICY_META.publishedAt}`;
}
