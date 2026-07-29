# JEMMO LIVE V1 · PRUEBA 54

## Chat LIVE sincronizado, sillas visibles y vídeo completo

Esta entrega se construye directamente sobre `JEMMO-LIVE-main-PRUEBA-53-COMPLETA.zip`.

### Qué corrige

- Chat bidireccional en tiempo real mediante Firestore.
- Mensajes separados por `roomSessionId`.
- Estado de comentarios sincronizado.
- Cuatro sillas visibles al espectador.
- Eliminación de ocupantes ficticios.
- Vídeo principal completo con `contain`.
- Captura sin imponer 720 × 1280 al sensor.

### Archivo nuevo

- `jemmo-live-room-sync.js`

### Despliegue

1. Subir el parche incremental a GitHub, respetando la estructura.
2. Publicar `FIRESTORE_REGLAS_WEBRTC_PRUEBA_54.txt`.
3. Cerrar y actualizar la PWA en ambos móviles.
4. Ejecutar `PRUEBAS_PRUEBA_54.txt`.

### Nota

La visibilidad de las sillas queda corregida. El transporte audiovisual de invitados sentados no se declara implementado en esta entrega.
