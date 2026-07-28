# JEMMO LIVE V1 · PRESENCIA LIVE REAL EN PERFIL E INICIO Y COMPARTIR PRUEBA 46
## Presencia LIVE real, perfiles, Inicio y botón Compartir visible
Fecha: 28/07/2026

## Incidencia confirmada
- Inicio mostraba cuatro personas ficticias aunque nadie estuviera transmitiendo.
- El perfil público solo indicaba EN LÍNEA o FUERA; no informaba de un LIVE activo.
- El botón Compartir existía dentro de Ajustes, por lo que no era visible durante el uso normal del LIVE.
- La acción de compartir no incluía una URL identificada por UID.

## Implementación
- Nuevo módulo `jemmo-live-presence.js` conectado a Firebase.
- Colección de presencia: `livePresences`, un documento por UID.
- Inicio de LIVE: `active: true`, `status: live`, UID, nombre, título, descripción, visibilidad, enlaces, fecha y latido.
- Latido cada 20 segundos y caducidad visual a los 90 segundos para evitar directos fantasma si el móvil pierde conexión o se cierra abruptamente.
- Finalización manual o salida de página: `active: false`, `status: ended`, motivo y hora de cierre.
- Inicio elimina las tarjetas Luna, Alex, Mía y King y renderiza exclusivamente LIVE públicos activos de Firebase.
- Perfil rápido y perfil completo muestran una banda roja EN LIVE AHORA con el título y acceso al LIVE.
- El indicador lateral del perfil cambia de EN LÍNEA a EN LIVE mientras la transmisión siga activa.
- Botón Compartir añadido directamente en la botonera inferior del LIVE.
- Compartir envía título, texto y URL con `watch`, `hostUid` y `hostName`; como alternativa copia la URL.
- Service Worker y registro PWA actualizados a versión 46.

## Archivos principales
- `jemmo-live-presence.js` — nuevo.
- `live.html` — publicación/cierre de presencia, botón visible y compartición real.
- `inicio.html` — lista dinámica PERSONAS EN DIRECTO.
- `perfil-publico.html` — aviso EN LIVE y entrada.
- `sw.js`, `pwa-register.js` — caché PRUEBA 46.

## Seguridad pendiente antes de producción
Las reglas temporales actuales no son suficientes. Debe exigirse autenticación, `request.auth.uid == uid` para escribir la presencia propia, validación de campos y lectura pública únicamente para `active == true` y `visibility == public`.

## Límite funcional registrado
La presencia y el enlace son reales. La reproducción remota de cámara y micrófono del emisor en el móvil espectador pertenece a la corrección WebRTC bidireccional prioritaria y debe probarse separadamente entre Ruth y Jesús.
