# JEMMO LIVE V1 · PRUEBA 52

## UID Firebase, sesión única y cámara natural

PRUEBA 52 corrige conjuntamente la entrada del espectador y el encuadre de cámara.

### Conexión LIVE
- La señalización usa el UID real de Firebase Authentication; no depende de `emisoras`.
- Cada inicio crea un `roomSessionId` nuevo.
- El anfitrión solo atiende solicitudes de esa sesión.
- Se elimina la dependencia de la hora de los dos móviles.
- Firestore muestra errores por permisos, conexión o timeout y deja de cargar indefinidamente.

### Cámara
- No se fuerza 9:16 ni recorte digital.
- La imagen principal conserva el cuadro completo.
- Una copia desenfocada rellena la pantalla cuando la proporción no coincide.
- Se evita tanto el zoom excesivo como las franjas negras.

### Instalación crítica
Además de subir los archivos a GitHub, deben publicarse los bloques de `FIRESTORE_REGLAS_WEBRTC_PRUEBA_52.txt` en Firebase. Ambos móviles deben abrir PRUEBA 52 antes de probar.
