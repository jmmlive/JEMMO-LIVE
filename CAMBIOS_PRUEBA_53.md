# JEMMO LIVE V1 · CAMBIOS PRUEBA 53

## Diagnóstico confirmado

PRUEBA 52 corrigió identidad, sesión y encuadre, pero todavía quedaban tres riesgos operativos:

1. El espectador podía acumular temporizadores y entrar en ciclos de reconexión sin fin.
2. La Sala con cámara apagaba `track.enabled`, dejando al remoto con vídeo negro y sin estado sincronizado.
3. La recuperación automática podía interpretar una pausa voluntaria como fallo y reabrir la cámara o renegociar innecesariamente.

## Correcciones aplicadas

### LIVE
- Protocolo actualizado a `jemmo-live-webrtc-v4`.
- Un solo temporizador de reconexión por sesión.
- Máximo de 3 reintentos automáticos y 90 segundos por ventana.
- El estado “conectado” no reinicia contadores por sí solo.
- Solo el aumento de bytes RTP entrantes confirma que audio/vídeo están llegando.
- Errores terminales bloquean la reconexión automática y muestran una acción coherente.
- El vídeo principal usa siempre `object-fit: contain`; el fondo desenfocado rellena el resto sin deformar ni recortar el rostro.

### Sala con cámara
- Campos sincronizados: `hostCameraEnabled`, `guestCameraEnabled` y sus marcas de tiempo.
- Pausa visual mediante tarjeta con avatar, nombre y “Cámara pausada”.
- Reactivación con pista existente cuando está sana o con pista nueva sustituida mediante la sesión WebRTC.
- La recuperación automática ignora vídeo cuando la cámara está pausada intencionadamente.
- Las restricciones de cámara priorizan encuadre natural y `resizeMode: none`.

### TURN
- LIVE y Sala consultan opcionalmente un endpoint autenticado para credenciales ICE temporales.
- Se incluye `functions/jemmoTurnCredentials` con verificación de Firebase ID token.
- No se exponen contraseñas TURN permanentes en el cliente.

## Archivos principales modificados
- `jemmo-live-webrtc.js`
- `live.html`
- `jemmo-live-presence.js`
- `jemmo-live-rtc-config.js`
- `jemmo-room-realtime.js`
- `salas.html`
- `pwa-register.js`
- `sw.js`

## Archivos principales añadidos
- `functions/index.js`
- `functions/package.json`
- `firebase.json`
- `TURN_DESPLIEGUE_PRUEBA_53.md`
- `FIRESTORE_REGLAS_WEBRTC_PRUEBA_53.txt`
