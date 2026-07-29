# JEMMO LIVE V1 · PRUEBA 49
## Transmisión LIVE robusta, señalización segura y preparación TURN/SFU

Fecha: 29/07/2026  
Base auditada: `JEMMO-LIVE-main (17) (2).zip` - PRUEBA 47

## Diagnóstico

La incidencia de Ruth y Jesús no se puede atribuir únicamente a cobertura. El síntoma “Entrando al LIVE” indefinido coincide con un fallo de señalización/ICE: la presencia se veía, pero el espectador no conseguía completar oferta, respuesta, ruta ICE o recepción real de RTP.

La base recibida no contenía la corrección PRUEBA 48. Seguía publicando la oferta antes de completar ICE, enviaba candidatos a subcolecciones con una sesión padre aún no garantizada, no incluía reglas Firestore instalables y solo configuraba STUN.

## Correcciones aplicadas

### 1. Arranque transaccional del LIVE

- La sala `liveSignals/{hostUid}` debe quedar preparada antes de publicar el LIVE en Inicio.
- `livePresences/{hostUid}` usa `signalReady=true` únicamente cuando WebRTC ha iniciado.
- Un fallo de señalización impide anunciar un directo que nadie podría ver.
- Un fallo posterior de presencia detiene el transporte y evita transmisiones invisibles.

### 2. Señalización WebRTC v2

Flujo del espectador:

1. Verifica presencia activa y latido.
2. Verifica sala activa, latido y `streamReady=true`.
3. Crea primero `viewers/{sessionId}` con estado `initializing`.
4. Crea transceptores `recvonly` de audio y vídeo.
5. Crea oferta, espera ICE hasta 8,5 s y publica SDP completo.
6. Mantiene `viewerCandidates` como respaldo trickle ICE.
7. Espera respuesta correspondiente a la misma revisión.
8. Aplica respuesta, candidatos pendientes y controla conexión/RTP.

Flujo del anfitrión:

1. Publica sala y latido cada 15 s.
2. Escucha únicamente sesiones de la generación actual del LIVE.
3. Rechaza sesiones antiguas, incompletas o fuera de capacidad.
4. Asigna pistas reales de cámara y micrófono como `sendonly`.
5. Crea respuesta, espera ICE y publica SDP completo.
6. Mantiene `hostCandidates` como respaldo.
7. Cierra conexiones fallidas o abandonadas.

### 3. Recuperación y diagnóstico

- Cuatro reconexiones automáticas con espera progresiva.
- Reconexión al recuperar Internet.
- Recuperación ante `failed`, `disconnected`, fin de pistas o ausencia de tráfico RTP.
- Temporizador de respuesta: 16 s.
- Temporizador de conexión: 28 s.
- Verificación de bytes entrantes cada 3 s.
- Mensajes distintos para permisos Firestore, cámara ausente, sala caducada, capacidad, ICE y TURN.
- Botones `RECONECTAR AUDIO Y VÍDEO` y `TOCA PARA ESCUCHAR` conservados.

### 4. Parámetros multimedia

- Cámara ideal: 720 x 1280, formato vertical 9:16.
- Resolución máxima solicitada: 1280 x 1920.
- Frecuencia ideal: 24 fps; máxima: 30 fps.
- Vídeo: 650 kbps por defecto; reducción automática en 3G/2G o ahorro de datos.
- Audio: 48 kbps por defecto; reducción conservadora en redes débiles.
- Preferencia de degradación: `balanced`.
- `contentHint`: movimiento para vídeo y voz para audio.

### 5. TURN preparado sin exponer secretos

`jemmo-live-rtc-config.js` incorpora:

- STUN predeterminado.
- `window.JEMMO_RTC_CREDENTIALS_ENDPOINT` para un backend HTTPS autenticado.
- Respuesta esperada: `{ "iceServers": [{ "urls": ..., "username": ..., "credential": ... }] }`.
- Token Firebase enviado como `Authorization: Bearer ...`.
- Credenciales TURN temporales; no se deben publicar claves permanentes en el cliente.

### 6. Seguridad Firestore

`FIRESTORE_REGLAS_WEBRTC_PRUEBA_49.txt` incluye un bloque aditivo para:

- Presencia LIVE autenticada.
- Sala escrita únicamente por su anfitrión.
- Sesión creada únicamente por el espectador propietario.
- Oferta editable únicamente por el espectador.
- Respuesta editable únicamente por el anfitrión.
- Candidatos separados por propietario.
- Restricción de campos modificables mediante `diff().affectedKeys().hasOnly(...)`.

### 7. Escalado real

La entrega protege el móvil con un máximo P2P de 8 espectadores por defecto. Esto es una barrera de seguridad, no una arquitectura de audiencia masiva.

Para una salida pública de JEMMO LIVE se requiere:

- TURN de producción con credenciales temporales.
- SFU para que el anfitrión suba una sola señal y el servidor distribuya a los espectadores.
- Backend de sesiones, autorización, moderación, métricas y limpieza.
- Pruebas de carga y observabilidad.

## Validaciones realizadas

- 43 archivos JavaScript: sintaxis aprobada.
- 17 páginas HTML: estructura analizada.
- 22 scripts inline: sintaxis aprobada.
- IDs duplicados: ninguno.
- Referencias locales rotas: ninguna.
- 29 recursos críticos de caché PWA: presentes.
- Versiones antiguas del módulo LIVE en páginas activas: ninguna.

## Validación pendiente obligatoria

Prueba real en dos móviles y redes distintas, en ambos sentidos:

- Ruth transmite y Jesús observa.
- Jesús transmite y Ruth observa.

El resultado debe registrarse según `PRUEBAS_PRUEBA_49.txt`.
