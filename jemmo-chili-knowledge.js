export const AUDIO_ROOM_RATE = 800;

export const TASK_TIERS = [
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
];

export const SUPPORT_CATEGORIES = [
  { id:'wallet', label:'Monedero, recarga o retirada', icon:'🪙' },
  { id:'access', label:'Acceso, cuenta o contraseña', icon:'🔐' },
  { id:'tasks', label:'Tareas, LIVE o Audio Room', icon:'⏱️' },
  { id:'technical', label:'Fallo técnico de la aplicación', icon:'🛠️' },
  { id:'abuse', label:'Insultos, acoso o comportamiento', icon:'🚫' },
  { id:'minor', label:'Posible menor o riesgo urgente', icon:'🛡️' },
  { id:'identity', label:'Suplantación o cuenta falsa', icon:'👤' },
  { id:'other', label:'Otra consulta', icon:'✦' }
];

const TOPICS = [
  {
    id:'task-rates',
    keywords:['tarea','tareas','tarifa','tarifas','pago por hora','cuanto paga','800','2000','3000','nivel base','nivel i','audio room paga','live paga'],
    answer:`Las tareas de JEMMO separan **LIVE** y **Audio Room**. Audio Room paga siempre **800 JEMS por cada hora completa**; su precio no aumenta con el nivel. El nivel únicamente aumenta la cantidad de horas diarias disponibles.\n\nLIVE sí utiliza una escala por nivel: comienza en 2.000 JEMS/h en BASE y aumenta según los JEMS netos válidos de regalos de Casa. Los minutos de LIVE y Audio Room se guardan por separado y no se mezclan para completar una hora.`,
    actions:[{label:'Ver tabla de tareas',section:'tareas'},{label:'Abrir Mis tareas',route:'casa-demo.html'}]
  },
  {
    id:'task-cycle',
    keywords:['24 horas','ciclo','reinicia','reiniciar','pierde la tarea','no cobra','no completar','hora completa','caduca','vence'],
    answer:`Cada tarea dispone de un **ciclo de 24 horas**. Dentro de ese plazo la Emisora debe completar y cobrar las horas que permite su nivel.\n\nSi una hora no se completa, no genera recompensa. Si termina el ciclo sin completar o sin cobrar una recompensa disponible, esa oportunidad caduca y comienza un ciclo nuevo; no se acumula para el día siguiente. En BASE hay una hora diaria: al completarla y cobrarla, la tarea queda terminada hasta el próximo ciclo.`,
    actions:[{label:'Ver reglas de tareas',section:'tareas'}]
  },
  {
    id:'task-activity',
    keywords:['cronometro','cronómetro','no camina','contando','activa ahora','silla','micro','micrófono','silenciar','moderacion','moderación','pantalla se apaga'],
    answer:`En Audio Room el cronómetro cuenta cuando JEMMO está visible, la Emisora ocupa una silla y existe una pista real de micrófono. Si ella se silencia voluntariamente, la tarea se pausa.\n\nSi un propietario, administrador o responsable la silencia por moderación, la tarea continúa y debe mostrarse **SILENCIO DE MODERACIÓN**. Bajar de la silla o ser expulsada detiene el conteo. LIVE y Salas solicitan mantener la pantalla despierta mientras la vista permanece activa.`,
    actions:[{label:'Abrir Audio Room',route:'salas.html'},{label:'Ver reglas',section:'tareas'}]
  },
  {
    id:'live',
    keywords:['live','directo','transmitir','transmision','cámara','camara','portada','titulo','descripción','ambas cámaras','ambas camaras'],
    answer:`Para iniciar un LIVE entra en **Live** y completa portada, título y descripción. Después selecciona cámara frontal, trasera o ambas, cuando el teléfono lo permita.\n\nDurante la emisión se oculta la barra inferior y aparecen Finalizar, ajustes, regalos, chat y sillas. La tarea LIVE usa la tarifa correspondiente al nivel actual y solo remunera horas completas válidas.`,
    actions:[{label:'Abrir LIVE',route:'live.html'},{label:'Ver tarifas',section:'tareas'}]
  },
  {
    id:'rooms',
    keywords:['sala','salas','audio room','silla','sillas','4 personas','8 personas','12 personas','15 personas','25 personas','sala con cámara'],
    answer:`JEMMO dispone de salas de 4, 8, 12, 15 y 25 plazas. Las de 4, 8, 12 y 15 pueden ser Audio Room o sala con cámara. La de 25 es únicamente Audio Room y está reservada para VIP.\n\nLa preparación guarda portada, título, descripción y privacidad. En la Sala oficial de Casa, una Emisora puede cumplir su tarea de Audio Room desde una silla con el micrófono real activo.`,
    actions:[{label:'Abrir Salas',route:'salas.html'}]
  },
  {
    id:'wallet',
    keywords:['monedero','jemmos','jems','cristales','recargar','retirar','cambio','intercambiar','dinero','saldo'],
    answer:`JEMMO utiliza tres saldos. **JEMMOS** es la moneda recargable para regalos e interacción. **JEMS** representa ganancias por regalos y tareas y es la moneda destinada a retirada. **CRISTALES** se usa en juegos internos.\n\nLa conversión JEMMOS → CRISTALES es 1:1 y sin comisión. La economía continúa en modo de pruebas; no deben tratarse los saldos actuales como dinero real.`,
    actions:[{label:'Abrir Monedero',route:'yo.html'},{label:'Soporte de monedero',section:'soporte'}]
  },
  {
    id:'withdrawals',
    keywords:['retirada','retiro','retirar jems','100000','100.000','10000 jems','10 usd','método de cobro','comision de retirada'],
    answer:`La regla prevista para producción es **10.000 JEMS = 1 USD**, con retirada mínima de **100.000 JEMS = 10 USD**. Solo pueden retirarse JEMS confirmados.\n\nAntes de confirmar una retirada deben mostrarse importe solicitado, comisión del método, cantidad neta, moneda y red. Los costes de retirada corresponden al usuario. En esta fase todo permanece en modo de pruebas.`,
    actions:[{label:'Abrir Monedero',route:'yo.html'},{label:'Pedir soporte',section:'soporte'}]
  },
  {
    id:'gifts',
    keywords:['regalo','regalos','70','20','10','reparto','comisión','comision','emisora independiente','casa agente'],
    answer:`En regalos para una Emisora vinculada a Casa, la distribución prevista es **70% Emisora, 20% JEMMO LIVE y 10% Casa/agente**. Para una Emisora independiente es **70% Emisora y 30% JEMMO LIVE**.\n\nLa comisión se aplica al regalo, no a la conversión JEMMOS → CRISTALES. La economía sigue en modo de pruebas hasta que exista backend de producción y auditoría completa.`,
    actions:[{label:'Abrir Monedero',route:'yo.html'}]
  },
  {
    id:'houses',
    keywords:['casa','casas','agente','agencia','batalla','batallas','patio','casa padre','emisora en casa'],
    answer:`Una **Casa** organiza a agentes, emisoras y miembros. La asignación laboral de una Emisora se guarda en su UID real y debe incluir Casa activa, función Emisor/a y responsable asignado.\n\nLas batallas de Casas suman apoyo y actividad durante temporadas. Las tareas pertenecen a ciclos individuales de cada Emisora y no deben depender de documentos genéricos de prueba.`,
    actions:[{label:'Abrir Mi Casa',route:'casa-demo.html'}]
  },
  {
    id:'identity',
    keywords:['id jemmo','buscar persona','nombre de usuario','perfil','copiar id','correo','jemmo-1000001'],
    answer:`Cada cuenta recibe una ID pública permanente con formato **JEMMO-1000001**. Es distinta del UID técnico de Firebase y no cambia aunque se modifique el perfil.\n\nLa búsqueda pública debe hacerse por ID JEMMO, @usuario o nombre público. El correo se reserva para acceso y recuperación y no debe exponerse como método de búsqueda pública.`,
    actions:[{label:'Abrir Mensajes',route:'mensajes.html'},{label:'Mi perfil',route:'yo.html'}]
  },
  {
    id:'messages',
    keywords:['mensaje','mensajes','chat privado','conversación','conversacion','no leído','no leido','grupo','fans'],
    answer:`Mensajes permite conversaciones individuales, grupos y club de fans. Los mensajes reales deben sincronizarse mediante Firestore, mostrar no leídos y mantener una conversación única entre cada pareja de usuarios.\n\nDesde un chat se pueden enviar regalos y, cuando corresponda, bloquear o denunciar. Solo los participantes autorizados deben poder leer la conversación.`,
    actions:[{label:'Abrir Mensajes',route:'mensajes.html'}]
  },
  {
    id:'referrals',
    keywords:['invitar amigos','invitación','invitacion','enlace personal','compartir jemmo','tarifa por invitacion','invitaciones privadas'],
    answer:`La función correcta es **Invitar amigos a JEMMO LIVE** mediante un enlace personal de registro que pueda copiarse o compartirse por WhatsApp, redes y el menú del móvil.\n\nNo debe existir una tarifa privada del Emisor ni un cobro por invitación desde el perfil.`,
    actions:[{label:'Abrir Perfil',route:'yo.html'}]
  },
  {
    id:'privacy',
    keywords:['privacidad','datos personales','conversaciones privadas','contraseña','codigo de verificacion','captura','evidencia','firebase rules','reglas'],
    answer:`JEMMO no debe mostrar correos, contraseñas, códigos de verificación ni datos bancarios en perfiles o conversaciones públicas. Chili no aprende automáticamente de chats privados.\n\nLas capturas enviadas a soporte pueden contener información sensible: deben usarse solo para investigar el caso y protegerse mediante reglas de acceso. Antes de producción, Firestore y Storage necesitan reglas autenticadas y basadas en roles.`,
    actions:[{label:'Abrir privacidad',section:'privacidad'},{label:'Soporte humano',section:'soporte'}]
  },
  {
    id:'safety',
    keywords:['seguridad','denunciar','denuncia','acoso','bullying','insulto','faltó el respeto','spam','suplantación','suplantacion','menor','posible menor','expulsar'],
    answer:`Puedes solicitar revisión por insultos, acoso, spam, suplantación, posible menor o conducta peligrosa. Para que soporte pueda investigar, indica quién fue, dónde ocurrió, fecha aproximada y una explicación clara; adjunta siempre una captura.\n\nEn una Sala también pueden usarse los controles inmediatos de silenciar o expulsar. Un posible menor o riesgo urgente debe marcarse como prioridad de seguridad.`,
    actions:[{label:'Crear denuncia',section:'soporte'},{label:'Abrir Mensajes',route:'mensajes.html'}]
  },
  {
    id:'support',
    keywords:['soporte','persona real','humano','hablar con alguien','queja','reclamación','reclamacion','ticket','ayuda humana','captura del problema'],
    answer:`El **Soporte humano** de Chili clasifica la solicitud antes de enviarla. Elige monedero, acceso, tareas, fallo técnico, comportamiento, posible menor, suplantación u otro.\n\nDebes explicar el problema y adjuntar una captura. Los casos quedan registrados con una referencia y estado para que el equipo pueda revisarlos. Chili puede guiarte, pero no debe inventar que una persona ya respondió.`,
    actions:[{label:'Abrir soporte humano',section:'soporte'}]
  },
  {
    id:'access',
    keywords:['no entra','entrar','acceso','contraseña','contrasena','sesión','sesion','firebase','olvidé','olvide','pantalla blanca'],
    answer:`Comprueba la conexión y utiliza correo y contraseña válidos. Si olvidaste la contraseña, pulsa **Olvidé contraseña**. JEMMO utiliza persistencia de Firebase y respaldos locales para que un almacenamiento lleno no convierta un acceso válido en un error.\n\nSi aparece una versión antigua, cierra completamente la PWA y vuelve a abrirla. Si continúa, crea una solicitud de soporte con captura.`,
    actions:[{label:'Ir a Acceso',route:'acceso.html'},{label:'Soporte de acceso',section:'soporte'}]
  },
  {
    id:'profile',
    keywords:['editar perfil','foto de perfil','portada','redes sociales','seguidores','seguidos','fans','amigos','destellos','momentos'],
    answer:`Desde Perfil puedes editar foto, portada, nombre público, @usuario, país, ciudad, frase y redes sociales. La ID JEMMO permanece fija. Seguidores, Seguidos, Fans y Amigos funcionan como accesos.\n\nLos contenidos breves se llaman **Destellos** y admiten foto o vídeo, regalos y ganancias en modo de pruebas.`,
    actions:[{label:'Abrir Perfil',route:'yo.html'}]
  },
  {
    id:'chili',
    keywords:['chili','qué puedes hacer','que puedes hacer','límites','limites','aprendes','aprender','ia','inteligencia artificial','hablar por voz','videollamada'],
    answer:`Soy la asistente oficial de JEMMO LIVE. Puedo explicar funciones, tareas, tarifas, seguridad y rutas de la aplicación; también puedo escuchar dictado y leer mis respuestas en voz alta cuando el navegador lo permite.\n\nEl modo de conversación por voz utiliza reconocimiento y síntesis del dispositivo. Se presenta como una llamada con Chili, pero todavía no es una videollamada humana ni un motor de IA conectado a un servidor. No aprendo automáticamente de conversaciones privadas.`,
    actions:[{label:'Iniciar conversación por voz',voice:true},{label:'Ver Saber JEMMO',section:'saber'}]
  }
];

const DEFAULT = {
  answer:`Todavía no tengo una respuesta exacta para esa pregunta. Puedo ayudarte con tareas y tarifas, LIVE, Audio Room, Casas, monedero, perfiles, mensajes, privacidad, seguridad o acceso.\n\nTambién puedes enviar el caso a Soporte humano con una explicación y una captura. La pregunta no se incorpora automáticamente a mi conocimiento.`,
  actions:[{label:'Abrir Saber JEMMO',section:'saber'},{label:'Soporte humano',section:'soporte'}]
};

function normalize(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9@\s-]/g,' ').replace(/\s+/g,' ').trim();
}

function scoreTopic(topic,text){
  let score=0;
  const words=new Set(text.split(' '));
  for(const keyword of topic.keywords){
    const key=normalize(keyword);
    if(!key) continue;
    if(text.includes(key)) score += key.includes(' ') ? 8 : 3;
    for(const token of key.split(' ')) if(token.length>3 && words.has(token)) score += 1;
  }
  return score;
}

export function answerQuestion(question){
  const text=normalize(question);
  const ranked=TOPICS.map(topic=>({topic,score:scoreTopic(topic,text)})).sort((a,b)=>b.score-a.score);
  if(!ranked[0] || ranked[0].score<3) return {...DEFAULT,topicId:'unknown'};
  return {...ranked[0].topic,topicId:ranked[0].topic.id};
}

export const SUGGESTIONS = [
  '¿Cómo funcionan las tareas de 24 horas?',
  'Enséñame la tabla de tarifas',
  '¿Cuándo cuenta el cronómetro de Audio Room?',
  'Explícame el monedero',
  'Quiero hablar con soporte humano',
  '¿Qué puede hacer Chili por voz?'
];
