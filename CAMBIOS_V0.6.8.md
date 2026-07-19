# JEMMO LIVE V0.6.8 PRUEBAS

## Correcciones reales aplicadas al módulo LIVE

- Las cuatro sillas se colocan en el lateral derecho.
- La distribución vertical deja tres sillas por encima de la mitad y una ligeramente por debajo.
- La pestaña de Batalla queda debajo de las sillas.
- La Batalla permanece cerrada y, al pulsar la pestaña, se abre lateralmente ocupando aproximadamente media pantalla sin cerrar el LIVE.
- Se elimina la botonera inferior improvisada de Micro, Cámara, Chat, Regalos, Compartir y Finalizar.
- Durante el LIVE se mantiene visible la navegación inferior oficial del Inicio, con los cinco peces vectoriales y sus colores.
- La navegación inferior baja y se compacta para dejar más superficie útil a la cámara.
- La navegación inferior se oculta hacia abajo al abrir el chat y vuelve al cerrar el chat.
- Se añade una pestaña compacta para abrir y cerrar el chat.
- El chat incorpora una barra real para escribir y enviar mensajes locales de prueba.
- La caja de regalos queda como acceso flotante en el lateral derecho.
- El panel de regalos abre pegado al borde inferior y con menor altura.
- Se incluye la prueba local “Afortunado” sin apuesta ni dinero real.
- Debajo del perfil del anfitrión queda únicamente el marcador compacto de tareas.
- Estado de tarea verde mientras está activa.
- Estado naranja al terminar, con botón “Cobrar”.
- Al cobrar pasa a rojo durante aproximadamente cuatro segundos.
- Tras la confirmación roja, la tarea desaparece; si existe otra tarea, comienza la siguiente.
- Se conserva el mini perfil de participantes y los controles de silla de V0.6.7.
- El sonido de navegación se sustituye por una gota más corta y con volumen muy reducido.

## Validación realizada

- Estructura HTML analizada.
- Sin identificadores HTML duplicados.
- Todas las referencias JavaScript a elementos HTML están presentes.
- Sintaxis JavaScript comprobada con Node.js.

## Alcance técnico

El chat, regalos, Afortunado, sillas y marcadores funcionan como simulación local de prueba.
La conexión multiusuario real, mensajes sincronizados, cobros reales y batallas en tiempo real requieren Firebase/backend, WebRTC y reglas de seguridad.

No se modifican Acceso, Inicio, Casas, Salas, Mensajes ni Perfil.
