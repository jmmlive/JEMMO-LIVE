# JEMMO LIVE V1 · PRUEBA 53

## LIVE estable, cámara pausada y TURN desplegable

PRUEBA 53 se construye sobre PRUEBA 52 y corrige la estabilidad del LIVE y de las Salas con cámara.

### LIVE personal
- Encuadre completo sin recorte lateral ni doble zoom.
- Fondo desenfocado integrado cuando el sensor y la pantalla tienen proporciones distintas.
- Reconexión automática limitada a 3 intentos y 90 segundos.
- Solo el tráfico RTP real confirma una recuperación.
- Permisos, versión incompatible, aforo y falta de medios son estados terminales visibles.

### Sala con cámara
- Pausa sincronizada para anfitrión e invitado.
- Tarjeta limpia con avatar, nombre y “Cámara pausada”.
- Reactivación mediante sustitución de pista, sin reconstruir la sala cuando no es necesario.
- La recuperación no confunde una pausa voluntaria con una avería.

### TURN
- `jemmo-live-rtc-config.js` admite credenciales temporales.
- `functions/jemmoTurnCredentials` valida Firebase Authentication y emite credenciales TURN REST de una hora.
- Consultar `TURN_DESPLIEGUE_PRUEBA_53.md`.
- TURN no queda operativo solo por subir el ZIP: requiere coturn, secretos y despliegue.

### Instalación crítica
1. Subir los archivos de PRUEBA 53 a GitHub.
2. Publicar los cambios de `FIRESTORE_REGLAS_WEBRTC_PRUEBA_53.txt`.
3. Cerrar completamente la PWA en ambos móviles, abrirla de nuevo y confirmar PRUEBA 53.
4. Ejecutar `PRUEBAS_PRUEBA_53.txt` en el orden indicado.
