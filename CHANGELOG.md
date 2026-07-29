# CHANGELOG

## PRUEBA 54 · 29/07/2026

- Chat LIVE sincronizado mediante `liveSignals/{hostUid}/chat/{messageId}`.
- Mensajes unidos al `roomSessionId` activo y al UID Firebase real.
- Apertura y cierre de comentarios sincronizados en la sala.
- Cuatro sillas restauradas en modo espectador.
- Eliminados ocupantes ficticios de las sillas.
- Vídeo principal forzado a `contain` en anfitrión y espectador.
- Eliminadas las restricciones 720 × 1280 que podían recortar el sensor en Android.
- Nuevo módulo `jemmo-live-room-sync.js`.
- Reglas Firestore y caché actualizadas a PRUEBA 54.

## PRUEBA 53 · 29/07/2026
### LIVE estable, cámara pausada y TURN desplegable
- Reconexión automática acotada a 3 intentos y una ventana de 90 segundos.
- Recuperación confirmada únicamente al detectar bytes RTP entrantes.
- Estados terminales para permisos, protocolo, aforo y medios del anfitrión.
- Vídeo LIVE siempre completo con `contain` y fondo desenfocado.
- Estado de cámara sincronizado en Salas para anfitrión e invitado.
- Tarjeta de cámara pausada con avatar, nombre y texto explícito.
- Reactivación mediante sustitución de pista sin renegociaciones innecesarias.
- Cloud Function autenticada para credenciales TURN temporales.
- Protocolo `jemmo-live-webrtc-v4` y caché PRUEBA 53.

## PRUEBA 52 · 29/07/2026
### UID Firebase, sesión única y cámara natural
- Señalización basada exclusivamente en Firebase Authentication UID y `users/{uid}`.
- `roomSessionId` nuevo por cada inicio para aislar sesiones antiguas.
- Eliminado el filtro por reloj del espectador.
- Timeouts y errores accionables en lecturas/escrituras Firestore.
- Protocolo `jemmo-live-webrtc-v3` y reglas Firestore PRUEBA 52.
- Cámara nativa sin 9:16 forzado; vídeo completo con fondo desenfocado cuando la proporción no coincide.
- Caché PWA actualizada a PRUEBA 52.

## PRUEBA 51 · 29/07/2026
### Cámara vertical a pantalla completa sin doble zoom
- Corregida la regresión visual introducida en PRUEBA 50.
- Recuperada la preferencia vertical 9:16 sin `crop-and-scale`.
- Superficie de vídeo configurada a pantalla completa con `cover`.
- Zoom de cámara normalizado a 1x cuando el dispositivo lo permite.
- Aplicación global a emisor y espectador.
- Caché PWA actualizada a PRUEBA 51.

## PRUEBA 50 · 29/07/2026
### Encuadre natural de cámara sin zoom excesivo
- Eliminado el recorte 9:16 forzado de la captura.
- `resizeMode` cambiado de `crop-and-scale` a `none`.
- Encuadre adaptativo según la proporción real del sensor y la pantalla.
- Vídeo remoto conservado sin segundo recorte.
- Espejo frontal sin aumento.
- Caché PWA actualizada a PRUEBA 50.

## PRUEBA 49 · 29/07/2026
### Transmisión LIVE robusta, señalización segura y preparación TURN/SFU
- Sesión del espectador creada antes de ICE.
- SDP de oferta/respuesta publicado con candidatos integrados.
- Trickle ICE conservado como respaldo.
- Presencia pública condicionada a `signalReady`.
- Reconexión automática y verificación de tráfico RTP.
- Bitrate adaptativo y estado de red no engañoso.
- Reglas Firestore aditivas para presencia, sala, sesiones y candidatos.
- Soporte para credenciales TURN temporales mediante backend.
- Límite P2P protector y arquitectura SFU documentada.
- Caché PWA actualizada a PRUEBA 49.

## PRUEBA 46 · 28/07/2026
### Presencia LIVE real en perfil e Inicio y Compartir visible
- Firebase publica y cierra `livePresences/{uid}` con latido de 20 segundos.
- Inicio elimina directos ficticios y muestra transmisiones públicas activas.
- Perfil público muestra EN LIVE AHORA y el título real.
- Compartir queda visible en la barra inferior y envía una URL identificada por UID.
- Presencias sin latido caducan visualmente a los 90 segundos.
- PWA actualizada a caché PRUEBA 46.
- Se mantiene registrado como pendiente prioritario el visor WebRTC remoto real.

# Changelog v0.6.2

- Restaurado el recorte ancho del logo del encabezado (`object-fit: cover`).
- Eliminado el escalado que reducía el logo dentro del contenedor.
- Activado el formulario del chat de batalla.
- Envío mediante botón e Intro.
- Mensajes creados con DOM seguro, sin insertar HTML del usuario.
- Persistencia local de los últimos 20 mensajes.
- Sin cambios visuales o funcionales fuera del logo y el chat.

# JEMMO LIVE V0.6.14 · INSTALABLE Y CONTROL DEL LIVE

## Arranque y sesión
- Con sesión activa, la aplicación entra directamente en Inicio sin mostrar Acceso durante la comprobación.
- Sin sesión activa, permanece en Acceso.
- Cerrar sesión elimina la sesión local y Firebase y no vuelve a entrar sin identificarse.
- Se reforzó la pantalla de comprobación y el arranque desde el icono PWA.

## Instalación
- El botón de instalación permanece visible.
- Si Chrome permite instalación directa, abre el diálogo nativo.
- Si Chrome no muestra el aviso, enseña los pasos manuales.
- El ZIP no se presenta como APK: debe publicarse por HTTPS para instalarse como PWA.

## Salida segura del directo
- La X solicita confirmación antes de finalizar.
- El botón Atrás cierra primero paneles y batalla; si no hay panel abierto, solicita confirmación.
- Los enlaces que abandonarían el LIVE solicitan confirmación.
- Se añadió protección al cerrar o recargar accidentalmente la página.

## Tareas
- La tarea se conserva localmente durante 24 horas y continúa desde el tiempo guardado.
- Cámara pausada: tarea pausada inmediatamente.
- Micrófono silenciado: margen de 3 minutos; después la tarea se pausa.
- Sin conexión o app en segundo plano: tarea pausada.
- Inactividad por interacción: aviso a 2 min, pausa a 5 min, aviso fuerte a 10 min y cierre a 15 min, sin sanción automática.

## Seguridad y moderación
- Flujo de posible menor: pausa inmediata de cámara y tarea; al tercer aviso del mismo LIVE se cierra y queda pendiente de revisión.
- Riesgo grave: cierre y revisión humana.
- No se aplica sanción automática sin revisión.
- Se incluye un panel de prueba local para validar los avisos.

## Límite técnico actual
La detección automática real de personas, menores, armas o situaciones peligrosas no está incluida en el ZIP local. Requiere un servicio de moderación con IA, backend seguro, almacenamiento de incidencias y consola de moderadores. Esta versión integra el flujo y los puntos de conexión (`window.JemmoSafety.report`).
## 28/07/2026 · PRUEBA 45 · Centro oficial y seguridad financiera
- Fuente única para Chili, Configuración, normas, pagos y soporte.
- Configuración real y accesos globales.
- Recargas directas no autorizadas bloqueadas antes de acreditar saldo.
- Retiradas retenidas cuando existe una alerta financiera activa.
- PWA actualizada y pruebas técnicas documentadas.

