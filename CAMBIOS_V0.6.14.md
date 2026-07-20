# JEMMO LIVE V0.6.14 · INSTALABLE Y CONTROL DEL LIVE

## Arranque y sesión
- Con sesión activa, la aplicación entra directamente en Inicio sin mostrar Acceso durante la comprobación.
- Sin sesión activa, permanece en Acceso.
- Cerrar sesión elimina la sesión local y Firebase y no vuelve a entrar sin identificarse.
- Se reforzó la pantalla de comprobación y el arranque desde el icono PWA.

## Instalación
- El botón de instalación permanece visible.
- Si Chrome permite instalación directa, abre el diálogo nativo.
- Si Chrome no muestra el aviso, enseña los pasos manuales.
- El ZIP no se presenta como APK: debe publicarse por HTTPS para instalarse como PWA.

## Salida segura del directo
- La X solicita confirmación antes de finalizar.
- El botón Atrás cierra primero paneles y batalla; si no hay panel abierto, solicita confirmación.
- Los enlaces que abandonarían el LIVE solicitan confirmación.
- Se añadió protección al cerrar o recargar accidentalmente la página.

## Tareas
- La tarea se conserva localmente durante 24 horas y continúa desde el tiempo guardado.
- Cámara pausada: tarea pausada inmediatamente.
- Micrófono silenciado: margen de 3 minutos; después la tarea se pausa.
- Sin conexión o app en segundo plano: tarea pausada.
- Inactividad por interacción: aviso a 2 min, pausa a 5 min, aviso fuerte a 10 min y cierre a 15 min, sin sanción automática.

## Seguridad y moderación
- Flujo de posible menor: pausa inmediata de cámara y tarea; al tercer aviso del mismo LIVE se cierra y queda pendiente de revisión.
- Riesgo grave: cierre y revisión humana.
- No se aplica sanción automática sin revisión.
- Se incluye un panel de prueba local para validar los avisos.

## Límite técnico actual
La detección automática real de personas, menores, armas o situaciones peligrosas no está incluida en el ZIP local. Requiere un servicio de moderación con IA, backend seguro, almacenamiento de incidencias y consola de moderadores. Esta versión integra el flujo y los puntos de conexión (`window.JemmoSafety.report`).
