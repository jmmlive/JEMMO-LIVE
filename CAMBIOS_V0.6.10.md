# JEMMO LIVE V0.6.10 PRUEBAS

## Correcciones aplicadas

- La navegación inferior de preparación usa el mismo sistema visual oficial del Inicio:
  el pez JEMMO aparece únicamente en la pestaña activa y los demás botones conservan sus iconos.
- La barra inferior se oculta completamente en cuanto comienza la transmisión.
- Se añadió una segunda protección mediante `MutationObserver` para impedir que la barra quede cortada o flotando dentro del LIVE.
- La Batalla se rediseñó como tarjeta horizontal de competición con trofeo, marcador, VS y barra de puntuación.
- La tarjeta de Batalla está separada físicamente de las cuatro sillas y no parece un perfil o una persona subida.
- El sonido anterior de navegación se sustituyó por un toque acuático muy corto y de volumen muy bajo.
- No se usa vibración.
- Se mantienen cámara frontal, trasera y ambas cámaras cuando el dispositivo lo permite.
- Se mantienen datos persistentes del LIVE, filtros, tarea compacta, cuatro sillas, chat inferior, stickers, ajustes y regalos.

## Alcance

Las sillas, regalos y puntuación de batalla continúan como simulación local de prueba.
La conexión real entre usuarios y las transacciones reales requieren backend y WebRTC.
