# JEMMO LIVE v0.6.5

Base de continuidad: **v0.6.3**.

Esta entrega mantiene el Inicio aprobado y añade dos correcciones prioritarias para móvil:

1. Acceso compacto con proveedores sociales conectados.
2. Preparación LIVE compacta, sin una lista vertical interminable.

## Archivos principales

- `acceso.html`: acceso y registro con Firebase.
- `inicio.html`: Inicio aprobado.
- `live.html`: preparación y emisión LIVE compacta.
- `app.js`: menú, navegación, chicharros y sonido de cambio.
- `live.css`: interfaz específica del LIVE.

## Nota técnica

La cámara y el micrófono funcionan mediante `getUserMedia` sobre HTTPS. La pantalla de emisión es una prueba local de interfaz; el streaming multiusuario real requiere integrar un proveedor de vídeo/RTC y backend.
