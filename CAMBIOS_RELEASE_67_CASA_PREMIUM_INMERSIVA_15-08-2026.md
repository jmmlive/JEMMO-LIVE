# JEMMO LIVE · RELEASE 67 · CASA PREMIUM INMERSIVA

Fecha: 15/08/2026
Base: RELEASE 66 instalada por Jesús.

## Corrección de raíz
RELEASE 66 mezclaba el escenario nuevo con tarjetas antiguas, duplicaba accesos y dejaba la experiencia dependiente de una sincronización Firestore que podía bloquear toda la Casa. RELEASE 67 separa diseño, permisos y datos para que la Casa se vea completa desde el primer momento y se sincronice después.

## Casa Padre JEMMO
- Escenario social reconstruido a pantalla móvil: anfitrión/líder central, miembros orbitando y ambiente futurista violeta/cian/dorado.
- Pecera Social integrada en el propio escenario con el motor Canvas 2.5D de PRUEBA 64. Se elimina la fotografía pegada del pez en la Casa.
- Energía, puntos, regalos, combo, racha, fans y actividad en una consola compacta.
- Dock directo: Sala, Regalo, Chat, Batalla y Gente.
- Latido de la Casa mantiene únicamente avisos/mensajes reales; no se inventa actividad.
- Se eliminan del Inicio de Casa los duplicados "Resumen", "Accesos", "Publicar aviso" y "Avisos". Los avisos administrativos pasan a Administración.
- El lanzador flotante de Mascota se oculta dentro de Casas porque la Pecera ya forma parte del escenario.
- El botón **Mi Casa** de YO y los accesos de una Casa propia abren directamente el escenario premium; ya no mandan al Explorador ni a la Sala por error.
- Los miembros también pueden ver el espacio de su Casa; los permisos internos siguen separando miembro, agente, administración y propietario.
- La Casa Padre puede mostrarse localmente al propietario mientras Firestore termina la sincronización; esto no concede permisos de escritura.

## Identidad y permisos
- La interfaz reconoce el rol protegido de `users/{uid}` además de Custom Claims.
- Las reglas Firestore también pueden validar `role`, `rol` o `accountRole` protegido del perfil para propietario/administración.
- El propio usuario no puede autoasignarse esos campos porque siguen bloqueados por las reglas de escritura de perfil.
- La Sala 24/7 reconoce al propietario de Casa Padre mediante el rol protegido del perfil y ya no depende exclusivamente de que `ownerUid` haya terminado de migrarse.

## Sala 24/7
- Se conservan 20 sillas en 4 columnas × 5 filas, solo audio.
- El texto eterno "Cargando datos reales" se sustituye por un estado neutro de sincronización.
- Si aún no se publicaron reglas, entra temporalmente como oyente sin bloquear la interfaz; tras publicar RELEASE 67 el responsable puede abrir la sala.

## Importante
`firestore.rules` debe publicarse en Firebase. Subirlo a GitHub no cambia las reglas del proyecto Firebase.
