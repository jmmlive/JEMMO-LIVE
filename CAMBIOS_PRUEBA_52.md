# JEMMO LIVE V1 · PRUEBA 52

## UID Firebase, sesión única y cámara natural

### Incidencia real
Ruth podía aparecer correctamente como **EN LIVE**, pero Jesús quedaba en **“Entrando al LIVE”** sin audio ni vídeo. Además, la solución visual de PRUEBA 51 llenaba la pantalla mediante recorte y volvía a mostrar la cara demasiado aumentada.

### Diagnóstico
La transmisión no depende de la colección `emisoras`. La ruta correcta es el UID autenticado de Firebase y el documento `users/{uid}`. Para Ruth, la señalización debe escribirse en:

```text
liveSignals/pVJq1ohc6mY8zuoED2S6Q7hsocS2
```

El flujo anterior también dependía de marcas de tiempo creadas por dos móviles distintos. Una diferencia de hora podía hacer que el anfitrión ignorara una solicitud válida. Las escrituras iniciales de Firestore tampoco tenían un tiempo máximo de espera visible.

### Correcciones de señalización
1. Protocolo nuevo `jemmo-live-webrtc-v3`.
2. Cada inicio de LIVE crea un `roomSessionId` aleatorio exclusivo.
3. El anfitrión solo escucha sesiones con ese mismo `roomSessionId`.
4. Se elimina el filtro basado en `createdAtMs` del reloj del espectador.
5. El anfitrión solo responde a estado `requesting`, evitando reabrir documentos terminales.
6. Lecturas y escrituras críticas de Firestore tienen timeout y mensajes específicos.
7. Se impiden dos arranques simultáneos del mismo espectador.
8. Se valida que `hostUid`, protocolo y sesión coincidan antes de negociar WebRTC.
9. Oferta y respuesta siguen incluyendo candidatos ICE en SDP; trickle ICE permanece como respaldo.

### Correcciones de cámara
1. Se retira la preferencia forzada `aspectRatio: 9/16`.
2. Se conserva `resizeMode: none` para evitar `crop-and-scale`.
3. Se intenta normalizar el zoom físico a 1x, sin cancelar la cámara si el móvil rechaza otras restricciones.
4. Cuando la pista coincide con la pantalla, se usa `cover`.
5. Cuando no coincide, se conserva el cuadro completo con `contain` y se rellena el fondo con una segunda capa desenfocada.
6. El espectador recibe el mismo encuadre natural, sin un segundo recorte.

### Reglas Firestore
Se incluye `FIRESTORE_REGLAS_WEBRTC_PRUEBA_52.txt`. Debe sustituir los bloques anteriores de `livePresences` y `liveSignals` dentro de las reglas actuales y publicarse antes de la prueba.

### Límite de red
La corrección resuelve la identidad, la sesión, los documentos antiguos y la espera indefinida. Si después aparece `ICE failed`, será necesario configurar TURN para esa red móvil. TURN no debe llevar usuario y contraseña permanentes dentro del repositorio.
