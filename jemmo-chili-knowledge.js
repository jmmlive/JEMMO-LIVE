import {
  JEMMO_POLICY_META,
  JEMMO_ARTICLES,
  TASK_TIERS,
  AUDIO_ROOM_RATE,
  SUPPORT_CATEGORIES,
  searchOfficialArticles
} from './jemmo-official-policies.js?v=45';

export { JEMMO_POLICY_META, JEMMO_ARTICLES, TASK_TIERS, AUDIO_ROOM_RATE, SUPPORT_CATEGORIES };

const GUIDE_TOPICS = [
  {
    id:'live-howto',
    keywords:['live','directo','transmitir','transmision','cámara','camara','portada','titulo','descripción','ambas cámaras','ambas camaras'],
    answer:`Para iniciar un LIVE entra en **Live**, completa portada, título y descripción y elige cámara frontal, trasera o ambas cuando el teléfono lo permita. Durante la emisión aparecen Finalizar, ajustes, regalos, chat y sillas.\n\nLa tarea LIVE utiliza la tarifa del nivel actual. Solo los regalos recibidos en LIVE aumentan el nivel y no pueden cobrarse más de tres horas LIVE dentro del mismo ciclo.`,
    actions:[{label:'Abrir LIVE',route:'live.html'},{label:'Ver tareas oficiales',article:'tasks-rates'}]
  },
  {
    id:'rooms-howto',
    keywords:['sala','salas','audio room','silla','sillas','4 personas','8 personas','12 personas','15 personas','25 personas','sala con cámara'],
    answer:`JEMMO dispone de salas de 4, 8, 12, 15 y 25 plazas. Las de 4, 8, 12 y 15 pueden ser Audio Room o Sala con cámara. La de 25 es únicamente Audio Room y está reservada para anfitriones VIP; las personas invitadas pueden entrar sin ser VIP.\n\nEn la Sala oficial de una Casa, la Emisora entra como oyente, solicita silla y cumple Audio Room con el micrófono real activo. El silencio voluntario pausa la tarea.`,
    actions:[{label:'Abrir Salas',route:'salas.html'},{label:'Ver cronómetro oficial',article:'task-cycle'}]
  },
  {
    id:'identity',
    keywords:['id jemmo','buscar persona','nombre de usuario','perfil','copiar id','correo','jemmo-1000001'],
    answer:`Cada cuenta recibe una ID pública permanente con formato **JEMMO-1000001**. Es distinta del UID técnico de Firebase y no cambia cuando se modifica el perfil.\n\nLa búsqueda pública utiliza ID JEMMO, @usuario o nombre público. El correo se reserva para acceso y recuperación y no debe exponerse como método de búsqueda pública.`,
    actions:[{label:'Abrir Mensajes',route:'mensajes.html'},{label:'Mi perfil',route:'yo.html'}]
  },
  {
    id:'messages',
    keywords:['mensaje','mensajes','chat privado','conversación','conversacion','no leído','no leido','grupo','fans'],
    answer:`Mensajes permite conversaciones individuales, grupos y club de fans. Las conversaciones reales deben sincronizarse mediante Firestore, mostrar no leídos y mantener una conversación única entre cada pareja de usuarios.\n\nDesde un chat se pueden enviar regalos, bloquear y denunciar. Solo los participantes autorizados deben poder leer la conversación.`,
    actions:[{label:'Abrir Mensajes',route:'mensajes.html'},{label:'Privacidad oficial',article:'privacy'}]
  },
  {
    id:'referrals',
    keywords:['invitar amigos','invitación','invitacion','enlace personal','compartir jemmo','tarifa por invitacion','invitaciones privadas'],
    answer:`La función correcta es **Invitar amigos a JEMMO LIVE** mediante un enlace personal de registro que puede copiarse o compartirse. No debe existir una tarifa privada del Emisor ni un cobro por invitación desde el perfil.`,
    actions:[{label:'Abrir Perfil',route:'yo.html'}]
  },
  {
    id:'access',
    keywords:['no entra','entrar','acceso','contraseña','contrasena','sesión','sesion','firebase','olvidé','olvide','pantalla blanca'],
    answer:`Comprueba la conexión y utiliza correo y contraseña válidos. Si olvidaste la contraseña, pulsa **Olvidé contraseña**. JEMMO utiliza persistencia de Firebase y respaldos locales para que un almacenamiento lleno no convierta un acceso válido en un error.\n\nSi aparece una versión antigua, cierra completamente la PWA y vuelve a abrirla. Si continúa, crea un caso de soporte con captura.`,
    actions:[{label:'Ir a Acceso',route:'acceso.html'},{label:'Soporte de acceso',section:'soporte'}]
  },
  {
    id:'profile',
    keywords:['editar perfil','foto de perfil','portada','redes sociales','seguidores','seguidos','fans','amigos','destellos','momentos'],
    answer:`Desde Perfil puedes editar foto, portada, nombre público, @usuario, país, ciudad, frase y redes sociales. La ID JEMMO permanece fija. Seguidores, Seguidos, Fans y Amigos funcionan como accesos.\n\nLos contenidos breves se llaman **Destellos** y admiten foto o vídeo, regalos y ganancias en modo de pruebas.`,
    actions:[{label:'Abrir Perfil',route:'yo.html'},{label:'Abrir Configuración',route:'configuracion.html'}]
  },
  {
    id:'chili',
    keywords:['chili','qué puedes hacer','que puedes hacer','límites','limites','aprendes','aprender','ia','inteligencia artificial','hablar por voz','videollamada'],
    answer:`Soy la asistente oficial de JEMMO LIVE. Explico funcionamiento, tareas, tarifas, Monedero, regalos, pagos, retiradas, normas, seguridad, Casas, Agencias y soporte utilizando la **fuente oficial ${JEMMO_POLICY_META.release}**.\n\nPuedo escuchar dictado y leer respuestas con la voz del dispositivo. No soy una persona, no aprendo automáticamente de chats privados y no puedo afirmar que soporte respondió hasta que el estado del caso lo confirme.`,
    actions:[{label:'Iniciar conversación por voz',voice:true},{label:'Ver artículos oficiales',section:'articulos'}]
  }
];

const DEFAULT = {
  answer:`Todavía no tengo una respuesta exacta para esa pregunta. Puedo ayudarte con tareas y tarifas, LIVE, Audio Room, Casas, Monedero, pagos, retiradas, privacidad, seguridad financiera, acceso o soporte.\n\nTambién puedes registrar el caso en Soporte humano con una explicación, fecha aproximada y captura obligatoria. La pregunta no se incorpora automáticamente a mi conocimiento.`,
  actions:[{label:'Abrir artículos oficiales',section:'articulos'},{label:'Soporte humano',section:'soporte'}]
};

function normalize(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9@\s-]/g,' ').replace(/\s+/g,' ').trim();
}
function scoreTopic(topic,text){
  let score=0; const words=new Set(text.split(' '));
  for(const keyword of topic.keywords||[]){
    const key=normalize(keyword); if(!key)continue;
    if(text.includes(key))score+=key.includes(' ')?8:3;
    for(const token of key.split(' '))if(token.length>3&&words.has(token))score+=1;
  }
  return score;
}
function articleResult(article){
  return {
    id:article.id,
    topicId:article.id,
    answer:`**${article.title}**\n${article.body}\n\nFuente oficial: ${JEMMO_POLICY_META.release} · ${JEMMO_POLICY_META.publishedAt}.`,
    actions:article.actions||[]
  };
}
export function answerQuestion(question){
  const text=normalize(question);
  const official=searchOfficialArticles(text)[0];
  const guide=GUIDE_TOPICS.map(topic=>({topic,score:scoreTopic(topic,text)})).sort((a,b)=>b.score-a.score)[0];
  if(official&&official.score>=Math.max(3,Number(guide?.score||0)))return articleResult(official.article);
  if(guide&&guide.score>=3)return {...guide.topic,topicId:guide.topic.id};
  return {...DEFAULT,topicId:'unknown'};
}

export const SUGGESTIONS = [
  'Enséñame la tabla oficial de tarifas',
  '¿Qué recargas están autorizadas?',
  '¿Qué ocurre si detectáis una compra falsa?',
  '¿Cómo funciona una retirada?',
  'Quiero hablar con soporte humano',
  '¿Qué puede hacer Chili por voz?'
];
