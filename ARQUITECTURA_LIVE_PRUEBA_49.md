# Arquitectura LIVE · PRUEBA 49

## 1. Plano de control

Firestore se utiliza solo para descubrimiento y señalización:

```text
livePresences/{hostUid}
  active, status, heartbeatAtMs, signalReady, roomUrl, identidad

liveSignals/{hostUid}
  active, status, heartbeatAtMs, streamReady, transport, version

liveSignals/{hostUid}/viewers/{sessionId}
  viewerUid, offer, answer, revisiones, estados y diagnóstico

.../viewerCandidates/{candidateId}
.../hostCandidates/{candidateId}
```

La sesión del espectador se crea antes de la oferta. El SDP completo se publica después de esperar la recopilación ICE. Las subcolecciones de candidatos son respaldo, no la única ruta de señalización.

## 2. Plano multimedia actual

```text
Anfitrión ── RTCPeerConnection 1 ── Espectador 1
          ├─ RTCPeerConnection 2 ── Espectador 2
          └─ RTCPeerConnection N ── Espectador N
```

Ventajas para pruebas:

- Implementación directa.
- Baja latencia.
- Firestore solo transporta metadatos y SDP, no vídeo.

Límite:

- El anfitrión vuelve a subir audio/vídeo por cada espectador.
- El consumo de batería, CPU y subida crece de forma lineal.
- El límite por defecto es 8 para impedir que un móvil quede saturado.

## 3. Arquitectura requerida para producción masiva

```text
                    ┌─ Espectador 1
Anfitrión ── SFU ───├─ Espectador 2
  una subida        ├─ Espectador 3
                    └─ ... miles, según capacidad desplegada
           │
           ├─ TURN para redes donde no exista ruta directa
           ├─ API de tokens y autorización
           ├─ métricas/QoE
           └─ grabación/moderación opcional
```

El SFU recibe una subida del anfitrión y reenvía capas de vídeo a cada espectador. Firestore puede conservar presencia y control, pero no debe distribuir el medio.

## 4. Estados operativos

### Sala

- `live`: sala activa y latido vigente.
- `ended`: el anfitrión terminó.
- Caducada: `heartbeatAtMs` supera 70 s.

### Sesión de espectador

```text
initializing
  -> requesting
  -> answered
  -> connected
```

Estados terminales/diagnósticos:

- `capacity`
- `host-media-missing`
- `permission-error`
- `answer-error`
- `ice-failed`
- `host-connect-timeout`
- `ended`
- `left`

## 5. Recuperación

- `offline`: espera evento `online`.
- `disconnected`: margen temporal antes de recrear la sesión.
- `failed`: recreación completa de `RTCPeerConnection` y nueva sesión.
- pista terminada: nueva conexión.
- conexión sin bytes RTP: nueva conexión.
- cambio de red: reevalúa bitrate; si la conexión está fallida, reconecta.

La recreación completa es más segura en esta fase que intentar renegociaciones parciales sobre documentos antiguos.

## 6. Configuración TURN

El frontend admite dos métodos:

1. Definir `window.JEMMO_RTC_CONFIG.iceServers` antes de cargar el módulo.
2. Definir `window.JEMMO_RTC_CREDENTIALS_ENDPOINT` y devolver credenciales temporales.

No se incluyen credenciales reales en el repositorio. El endpoint debe validar el token Firebase, limitar frecuencia, devolver TTL corto y registrar abuso.

## 7. Seguridad pendiente de backend

Antes de producción:

- desplegar y probar las reglas incluidas;
- App Check;
- limpieza automática de sesiones antiguas;
- limitación por UID/IP/dispositivo;
- tokens TURN temporales;
- SFU con autorización por sala;
- métricas de RTT, pérdida, jitter, bitrate y tiempo de conexión;
- alertas de fallos por operador/país/versión.
