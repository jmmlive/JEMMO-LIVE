# JEMMO LIVE V1 · CAMBIOS PRUEBA 54

## Base exacta

- Archivo recibido: `JEMMO-LIVE-main-PRUEBA-53-COMPLETA.zip`
- SHA-256 de la base: `89c96696d972d4aa0fb88834897cf1235a83bb310ab39a23b652f9ca472c4536`
- Contenido verificado: 174 entradas, sin errores ZIP.

## Incidencias reales corregidas

1. El chat del LIVE solo se dibujaba en el móvil que enviaba el mensaje.
2. Las cuatro sillas estaban ocultas mediante CSS en modo espectador.
3. La cámara solicitaba una resolución vertical concreta que algunos Android podían obtener recortando el sensor.
4. El vídeo remoto no reforzaba explícitamente el encuadre `contain` al recibir la pista WebRTC.

## Correcciones aplicadas

### Chat LIVE sincronizado

- Nuevo módulo `jemmo-live-room-sync.js`.
- Ruta de mensajes: `liveSignals/{hostUid}/chat/{messageId}`.
- Cada mensaje queda unido al `roomSessionId` activo.
- Anfitrión y espectadores reciben los mensajes mediante `onSnapshot` sin recargar.
- Se sincronizan mensajes normales, stickers, avisos del sistema y textos de regalos.
- El cierre y apertura del chat se guarda en la sala mediante `commentsEnabled`.
- Los mensajes se renderizan con `textContent`, sin insertar HTML del usuario.
- Límite de 300 caracteres y documentos inmutables.

### Sillas del LIVE

- Se elimina la regla que ocultaba `.jl-seat-stack` a los espectadores.
- Las cuatro sillas se muestran tanto al anfitrión como al espectador.
- Se eliminan los ocupantes ficticios Luna y Alex de la carga inicial.
- En modo espectador las sillas son visibles, pero los controles de moderación del anfitrión permanecen protegidos.

### Vídeo completo sin recorte

- La pista principal usa `object-fit: contain` de forma explícita en anfitrión y espectador.
- El vídeo remoto recibe `object-position: 50% 50%`, tamaño completo y transformación neutra.
- El fondo desenfocado conserva `cover`, pero queda detrás de la pista principal.
- Se eliminan las restricciones obligadas de `width: 720` y `height: 1280` en `getUserMedia` y `applyConstraints`.
- Se conserva `resizeMode: none`, neutralización de zoom óptico y límite de 24-30 fps.

### Caché y versión

- Versión funcional: PRUEBA 54.
- Caché: `jemmo-live-v1-chat-seats-framing-54-20260729`.
- Se añade `jemmo-live-room-sync.js` al precache.

## Acción obligatoria en Firebase

Publicar el bloque `FIRESTORE_REGLAS_WEBRTC_PRUEBA_54.txt`, sustituyendo los bloques anteriores de `livePresences` y `liveSignals`, sin borrar las reglas de usuarios, Casas, tareas, monedero o mensajes privados.

## Límites de esta entrega

- La visibilidad de las sillas queda corregida.
- Esta entrega no añade todavía transporte WebRTC de audio/vídeo para invitados sentados; no se presenta como implementado.
- La prueba física Jesús ↔ Ruth sigue siendo necesaria después de publicar archivos y reglas.
