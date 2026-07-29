# ARQUITECTURA LIVE · PRUEBA 53

## Identidad y sesión
- Identidad canónica: Firebase Authentication UID.
- Señalización: `liveSignals/{hostUid}`.
- Cada inicio de LIVE genera un `roomSessionId` exclusivo.
- Protocolo: `jemmo-live-webrtc-v4`.

## Máquina de estados del espectador
1. `initializing`
2. `requesting`
3. `answered`
4. `connecting`
5. `connected` solo cuando existe recepción útil
6. `reconnecting` con límite
7. `terminal` para permisos, versión, aforo o medios ausentes
8. `closed`

La transición a recuperación estable se confirma por estadísticas RTP (`bytesReceived`), no solo por `connectionState`.

## Política de reconexión
- Un temporizador activo como máximo.
- 3 intentos automáticos.
- Ventana máxima: 90 segundos.
- Reintento manual reinicia la ventana bajo acción expresa del usuario.
- Errores terminales no consumen ciclos inútiles.

## Renderizado de vídeo
- Pista principal: `contain` para preservar el sensor completo.
- Fondo: copia desenfocada con `cover` y sin interacción.
- Cámara frontal: espejo visual, sin escala adicional.

## Sala con cámara
- Estado de cámara persistido por rol en `salasPruebaWebRTC/{roomId}`.
- El remoto no deduce “pausada” a partir de un cuadro negro; recibe un booleano explícito.
- `replaceTrack`/`replaceLocalStream` conserva la `RTCPeerConnection` cuando es posible.
- Renegociación solo cuando la topología de medios lo exige.

## ICE y TURN
- STUN continúa como valor inicial.
- El cliente puede pedir `iceServers` temporales al endpoint configurado.
- La Cloud Function valida el Firebase ID token.
- Coturn emite acceso mediante secreto compartido y credenciales con caducidad.
- Para escala superior al P2P previsto debe evaluarse una SFU; TURN no sustituye una SFU.
