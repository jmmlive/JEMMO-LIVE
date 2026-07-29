# JEMMO LIVE V1 · PRUEBA 49

Versión actual: transmisión LIVE robusta, señalización WebRTC v2, reglas Firestore, reconexión y preparación TURN/SFU.

Documentación principal:
- `VERSION.txt`
- `CAMBIOS_PRUEBA_49.md`
- `ARQUITECTURA_LIVE_PRUEBA_49.md`
- `FIRESTORE_REGLAS_WEBRTC_PRUEBA_49.txt`
- `PRUEBAS_PRUEBA_49.txt`

> Para audiencias numerosas, el P2P actual debe migrarse a SFU y TURN de producción.

---

# JEMMO LIVE v0.6.2

Base estable: v0.6 PROFESIONAL.

Objetivo único: corregir el logo superior y activar el envío del chat sin modificar el resto del Inicio aprobado.

## Cambios
- El logo vuelve a ocupar el encabezado en formato ancho, sin quedar pequeño dentro de un cuadrado.
- El chat de la batalla permite enviar con el botón o con la tecla Intro.
- Los mensajes se muestran al instante, con hora, y se conservan localmente en el dispositivo.
- No se han modificado el monedero, la barra inferior, el pez activo, las tarjetas ni la navegación.

## Alcance técnico
El chat de esta versión es funcional en el dispositivo. Todavía no es un chat multiusuario conectado a base de datos o tiempo real; esa conexión pertenece a una fase posterior.
