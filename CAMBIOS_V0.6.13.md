# JEMMO LIVE V0.6.13 · INSTALABLE

## Base correcta
- Parte de la V0.6.12 real suministrada por Jesús.
- Conserva íntegro el LIVE de V0.6.12 y añade únicamente la integración instalable y de sesión.

## Arranque y sesión
- Con una sesión Firebase activa, abrir JEMMO LIVE desde el icono dirige siempre a **Inicio**.
- Sin sesión activa, dirige a **Acceso**.
- **Cerrar sesión** ejecuta `signOut`, limpia el identificador local de sesión y permanece en Acceso.
- El manifiesto solicita que una nueva apertura desde el icono navegue de nuevo por el arranque controlado.

## Registro y red
- `auth/network-request-failed` se convierte en un mensaje comprensible.
- Se muestra **Reintentar** y se conservan los campos de registro escritos.
- Google usa el proveedor de Firebase mediante redirección para móvil.
- Apple y Facebook no se presentan como accesos activos hasta configurar sus proveedores reales.

## Instalación
- Incluye manifiesto, service worker, iconos y modo `standalone`.
- Es una PWA instalable desde Chrome/Android cuando está publicada por HTTPS.
- No es todavía un APK/AAB firmado para Google Play.
