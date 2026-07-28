# JEMMO LIVE V1 · PRUEBA 47

## Entrada como espectador y recepción WebRTC

La tarjeta real de una persona en directo y el botón **ENTRAR AL LIVE** ya no abren la preparación de cámara del visitante. Ambas superficies generan una ruta explícita `mode=viewer` identificada por el UID del anfitrión.

### Cambios técnicos

- Separación estricta entre anfitrión y espectador en `live.html`.
- Pantalla de espectador activada antes del primer render para evitar el salto visual a **Prepara tu LIVE**.
- Nuevo `jemmo-live-webrtc.js`.
- Señalización Firestore por anfitrión y sesión de espectador.
- Oferta WebRTC `recvonly` para audio y vídeo.
- Respuesta del anfitrión con las pistas locales reales.
- Intercambio de candidatos ICE en subcolecciones separadas.
- Reconexión automática y manual.
- Recuperación de reproducción, `srcObject` y audio bloqueado por Android.
- Sustitución de pistas cuando cambia la cámara o se recupera el micrófono.
- Cierre coordinado de presencia y señalización.
- Nueva caché PWA PRUEBA 47.

### Validación pendiente

La estructura y sintaxis están verificadas. La aceptación funcional exige una prueba real Ruth → Jesús desde redes y móviles diferentes. STUN está configurado; producción debe incorporar TURN propio para los casos donde el NAT no permita conexión P2P directa.
