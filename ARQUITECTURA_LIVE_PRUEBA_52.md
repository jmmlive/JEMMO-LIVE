# Arquitectura LIVE · PRUEBA 52

## 1. Identidad canónica

La señalización usa exclusivamente Firebase Authentication:

```text
hostUid = FirebaseAuth.currentUser.uid
perfil  = users/{hostUid}
sala    = liveSignals/{hostUid}
```

La colección `emisoras` no participa en la autorización, el descubrimiento ni la ruta WebRTC. Para la cuenta de Ruth:

```text
hostUid = pVJq1ohc6mY8zuoED2S6Q7hsocS2
```

## 2. Sesión de sala

Cada pulsación válida de **INICIAR LIVE** crea un identificador nuevo:

```text
liveSignals/{hostUid}
  hostUid
  roomSessionId
  active = true
  status = live
  protocol = jemmo-live-webrtc-v3
  streamReady
  heartbeatAt
```

El espectador copia el mismo identificador:

```text
liveSignals/{hostUid}/viewers/{sessionId}
  viewerUid
  hostUid
  roomSessionId
  status
  offer / answer
```

El anfitrión consulta únicamente documentos con el `roomSessionId` activo. Las solicitudes de un LIVE anterior quedan fuera de la consulta sin depender de la hora local de los dispositivos.

## 3. Secuencia de conexión

```text
Anfitrión                              Espectador
   |                                      |
   | crea sala + roomSessionId            |
   | publica presencia                    |
   |                                      | valida presencia y sala
   |                                      | crea sesión: initializing
   | escucha misma roomSessionId          | crea oferta + ICE
   | <------------------------------------| status: requesting
   | crea respuesta + ICE                 |
   | ------------------------------------>| status: answered
   | <========= conexión WebRTC =========>|
   | status: connected                    |
```

Todas las operaciones críticas de Firestore tienen límite de espera. Un fallo de permisos, conexión o versión se muestra como error accionable en lugar de mantener el indicador girando.

## 4. Plano multimedia actual

```text
Anfitrión ── RTCPeerConnection 1 ── Espectador 1
          ├─ RTCPeerConnection 2 ── Espectador 2
          └─ RTCPeerConnection N ── Espectador N
```

Es una arquitectura P2P adecuada para la fase de prueba. El límite protector permanece en 8 espectadores por anfitrión para no multiplicar indefinidamente la subida, CPU y batería del móvil.

## 5. Encuadre de cámara

La pista enviada por la cámara se conserva sin recorte digital obligatorio. La presentación tiene dos capas:

```text
capa frontal: vídeo completo, contain cuando la proporción no coincide
capa fondo:   misma pista, cover + desenfoque + oscurecimiento
```

Si la diferencia de proporción es pequeña, la capa frontal usa `cover`. Si es grande, usa `contain`. Así se evita tanto el primer plano recortado como las franjas negras vacías.

## 6. TURN y producción

STUN puede conectar muchas redes, pero no todas. Cuando oferta y respuesta se completan y el fallo ocurre en ICE, la siguiente infraestructura necesaria es:

- servicio TURN propio;
- credenciales temporales emitidas por backend;
- validación de token Firebase;
- caducidad corta y limitación de abuso.

Para escalar a miles de espectadores será necesario un SFU. Firestore debe seguir transportando presencia y control, no el audio o vídeo.

## 7. Seguridad operativa

Las reglas PRUEBA 52 exigen:

- usuario autenticado;
- `hostUid` igual al UID del documento;
- propiedad estable de la sesión;
- `roomSessionId` válido y coincidente con la sala activa;
- listas de campos permitidos para espectador, anfitrión y candidatos ICE.
