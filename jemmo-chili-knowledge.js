const TOPICS = [
  {
    id: 'live',
    keywords: ['live','directo','transmitir','transmision','cámara','camara','portada','titulo','descripción','descripcion','ambas cámaras','ambas camaras'],
    answer: `Para iniciar un LIVE entra en **Live** y completa primero el asistente de preparación: portada, título y descripción. El botón de transmitir solo debe activarse cuando esos campos estén completos. Puedes elegir cámara frontal, trasera o ambas; si el teléfono no admite ambas cámaras, JEMMO debe avisarlo sin bloquear las otras opciones.\n\nAl comenzar el directo se oculta la barra inferior, aparecen Finalizar, Ajustes, regalos, chat flotante y sillas.`,
    actions: [{label:'Abrir LIVE',route:'live.html'}]
  },
  {
    id: 'salas',
    keywords: ['sala','salas','audio room','micrófono','microfono','silla','sillas','4 personas','8 personas','12 personas','15 personas','25 personas'],
    answer: `JEMMO dispone de salas para 4, 8, 12, 15 y 25 personas. Las de 4, 8, 12 y 15 pueden ser Audio Room o sala con cámara. La de 25 es solo Audio Room y está reservada para VIP.\n\nLa sala de 15 coloca tres plazas arriba y el resto en filas de cuatro. La preparación guarda portada, título y descripción. En sala con cámara, solo el anfitrión realiza y cobra la tarea de cámara.`,
    actions: [{label:'Abrir Salas',route:'salas.html'}]
  },
  {
    id: 'identity',
    keywords: ['id jemmo','id','buscar persona','usuario','nombre de usuario','perfil','copiar','compartir','correo'],
    answer: `Cada cuenta recibe una ID pública permanente con formato **JEMMO-1000001**. Es diferente del UID técnico de Firebase y no cambia aunque la persona modifique su nombre, correo, foto o dispositivo.\n\nPara encontrar a alguien, abre Mensajes y pulsa **+**. Busca por ID JEMMO, @nombredeusuario o nombre público exacto. El correo se usa para acceso y recuperación, no para búsqueda pública.`,
    actions: [{label:'Abrir Mensajes',route:'mensajes.html'},{label:'Mi perfil',route:'yo.html'}]
  },
  {
    id: 'messages',
    keywords: ['mensaje','mensajes','chat','conversación','conversacion','no leído','no leido','bloquear','desbloquear'],
    answer: `Los mensajes directos se guardan en Firestore y deben aparecer en ambos teléfonos en tiempo real. Cada pareja de usuarios utiliza una conversación única, con último mensaje, hora y contador de no leídos.\n\nSolo los participantes deben poder leer esa conversación. Desde sus opciones se podrá bloquear, desbloquear o denunciar.`,
    actions: [{label:'Abrir Mensajes',route:'mensajes.html'}]
  },
  {
    id: 'wallet',
    keywords: ['monedero','jemmos','jems','cristales','recargar','retirar','cambio','intercambiar','dinero','regalo'],
    answer: `JEMMO utiliza tres saldos: **JEMMOS** para recargas y regalos, **JEMS** para ganancias confirmadas y **CRISTALES** para juegos internos. En la fase actual toda la economía permanece en **modo de pruebas, sin cobros ni retiros reales**.\n\nEl cambio de prueba JEMMOS → CRISTALES es 1:1 y sin comisión: 1 JEMMO produce 1 CRISTAL.`,
    actions: [{label:'Abrir Perfil y Finanzas',route:'yo.html'}]
  },
  {
    id: 'houses',
    keywords: ['casa','casas','agente','agencia','batalla','batallas','elevador','patio','casa padre'],
    answer: `En JEMMO, una **Casa** representa al agente. La Casa Padre tiene su propio Patio y puede disponer de Súper Patio. Las batallas de Casas se organizan por temporadas, suman puntos de la Casa y de las salas personales, y pueden incluir periodos de puntuación doble.\n\nLas emisoras no crean Casas por su cuenta; participan dentro de la estructura de su agente.`,
    actions: [{label:'Ver batalla',route:'casa-demo.html'}]
  },
  {
    id: 'access',
    keywords: ['no entra','entrar','acceso','contraseña','contrasena','sesión','sesion','firebase','pantalla de acceso','olvidé','olvide'],
    answer: `Primero confirma que usas correo y contraseña válidos y que tienes conexión. JEMMO conserva la sesión con IndexedDB, localStorage o sessionStorage para evitar que un almacenamiento lleno bloquee la entrada.\n\nSi no recuerdas la contraseña, utiliza **Olvidé contraseña** en la pantalla de acceso. Si la aplicación carga una versión antigua, ciérrala completamente y vuelve a abrirla para actualizar la caché.`,
    actions: [{label:'Ir a Acceso',route:'acceso.html'}]
  },
  {
    id: 'safety',
    keywords: ['seguridad','denunciar','denuncia','acoso','spam','suplantación','suplantacion','menor','posible menor','expulsar','silenciar','privacidad'],
    answer: `La seguridad esencial nunca debe quedar detrás de una suscripción. Puedes bloquear o denunciar por spam, acoso, suplantación o posible menor. En salas existen controles para silenciar, expulsar temporalmente, cerrar sillas y reportar un posible menor.\n\nNo compartas contraseñas, códigos de verificación ni datos bancarios por chat.`,
    actions: [{label:'Abrir Mensajes',route:'mensajes.html'}]
  },
  {
    id: 'roles',
    keywords: ['rol','roles','emisor','agente','colaborador','usuario','nivel','tarea'],
    answer: `Los roles previstos son usuario, emisor, agente y colaborador. Algunas funciones cambian según el rol y el nivel. Provisionalmente, la transmisión general se habilita desde nivel 3; dentro de una Casa se puede transmitir desde el primer día. La cámara en salas mantiene una habilitación provisional desde nivel 5.`,
    actions: []
  },
  {
    id: 'chili',
    keywords: ['chili','qué puedes hacer','que puedes hacer','límites','limites','aprendes','aprender','ia','inteligencia artificial'],
    answer: `Soy la asistente oficial de JEMMO LIVE. Mi misión es explicar funciones, guiar pasos, reunir vídeos y formación, mostrar incidencias conocidas y ayudar a resolver problemas.\n\nNo aprendo automáticamente de conversaciones privadas ni debo inventar datos. Mi conocimiento específico de JEMMO se actualiza mediante información revisada y aprobada. En esta primera versión utilizo una biblioteca local preparada para conectarse después a un motor de IA mediante un servidor seguro.`,
    actions: []
  }
];

const DEFAULT = {
  answer: `Todavía no tengo una respuesta exacta para esa pregunta. Puedo ayudarte con LIVE, Salas, Casas, monedero, perfiles, IDs JEMMO, mensajes, seguridad o problemas de acceso.\n\nLa pregunta queda preparada para incorporarse a la biblioteca revisada de Chili; no se aprende automáticamente de conversaciones privadas.`,
  actions: [{label:'Ver ayuda de acceso',prompt:'Tengo un problema para entrar en la app'},{label:'Cómo usar LIVE',prompt:'¿Cómo inicio un LIVE?'}]
};

function normalize(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9@\s-]/g,' ').replace(/\s+/g,' ').trim();
}

function scoreTopic(topic, text){
  let score=0;
  for(const keyword of topic.keywords){
    const key=normalize(keyword);
    if(!key) continue;
    if(text.includes(key)) score += key.includes(' ') ? 5 : 2;
    for(const token of key.split(' ')) if(token.length>3 && text.split(' ').includes(token)) score += 1;
  }
  return score;
}

export function answerQuestion(question){
  const text=normalize(question);
  const ranked=TOPICS.map(topic=>({topic,score:scoreTopic(topic,text)})).sort((a,b)=>b.score-a.score);
  if(!ranked[0] || ranked[0].score<2) return {...DEFAULT,topicId:'unknown'};
  return {...ranked[0].topic,topicId:ranked[0].topic.id};
}

export const SUGGESTIONS = [
  '¿Cómo inicio un LIVE?',
  '¿Cómo funcionan las salas?',
  '¿Cómo busco una ID JEMMO?',
  'Explícame el monedero',
  '¿Cómo denuncio un posible menor?',
  '¿Qué puede hacer Chili?'
];
