# JEMMO LIVE V1 · PRUEBA 51

## Cámara vertical sin franjas y sin doble zoom

### Fallo observado en PRUEBA 50
La imagen dejó de estar excesivamente ampliada, pero quedó casi cuadrada y centrada, con grandes zonas negras arriba y abajo.

### Causa técnica
Al eliminar por completo la preferencia 9:16, Chrome Android pudo seleccionar una pista cuadrada. Después, `object-fit: contain` conservó el cuadro completo y generó las franjas.

### Corrección
1. `aspectRatio: 9/16` vuelve como restricción ideal, no exacta.
2. `resizeMode: none` se conserva para evitar recorte digital en la captura.
3. La superficie principal vuelve a `cover` para llenar la pantalla.
4. Se normaliza el zoom de la pista a 1x cuando la API del móvil lo permite.
5. Se aplica el mismo criterio a emisor, preparación y espectador.
6. Se renueva la caché PWA.

No requiere cambios en Firebase ni en las reglas Firestore.
