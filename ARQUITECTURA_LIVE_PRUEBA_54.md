# ARQUITECTURA LIVE · PRUEBA 54

## Identidad y sesión

- Identidad canónica: Firebase Authentication UID.
- Sala: `liveSignals/{hostUid}`.
- Sesión: `roomSessionId` nuevo en cada inicio.
- Protocolo WebRTC: `jemmo-live-webrtc-v4`.
- Cliente funcional: PRUEBA 54.

## Chat en tiempo real

Ruta:

`liveSignals/{hostUid}/chat/{messageId}`

Campos principales:

- `hostUid`
- `roomSessionId`
- `senderUid`
- `senderName`
- `senderRole`
- `type`
- `text`
- `createdAt`
- `createdAtMs`
- `version`

Reglas:

- Solo usuarios autenticados leen.
- El remitente debe coincidir con `request.auth.uid`.
- La sesión del mensaje debe coincidir con la sala activa.
- Los documentos no se actualizan después de crearse.
- Solo anfitrión o remitente pueden borrar.
- Los mensajes de tipo `system` solo puede crearlos el anfitrión.

## Estado de comentarios

- `commentsEnabled` vive en `liveSignals/{hostUid}`.
- El anfitrión es el único que puede cambiarlo.
- El espectador desactiva inmediatamente su campo de escritura cuando recibe `false`.

## Sillas

- La interfaz contiene siempre cuatro sillas.
- En modo espectador permanecen visibles.
- Los controles de aceptación, silencio y moderación siguen reservados al anfitrión.
- No se simulan participantes en la carga inicial.

## Renderizado de vídeo

- Pista principal: `contain`.
- Fondo auxiliar: `cover` + desenfoque.
- Cámara frontal del anfitrión: espejo visual controlado por la interfaz.
- Vídeo remoto: transformación neutra, sin espejo ni escala adicional.
- La captura no exige una relación 9:16 ni una resolución 720 × 1280.

## Reconexión

Se conserva la política PRUEBA 53:

- Máximo 3 intentos automáticos.
- Ventana máxima de 90 segundos.
- Solo bytes RTP reales confirman recuperación.
- Permisos, protocolo, aforo, ausencia de medios y LIVE finalizado son estados terminales.
