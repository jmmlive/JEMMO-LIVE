# JEMMO LIVE V1 · PRUEBA 56
## Portada vertical animada posterior al acceso

**Fecha:** 01/08/2026  
**Base exacta:** `JEMMO-LIVE-main-PRUEBA-55-FASE-2-COMPLETA.zip`  
**SHA-256 de la base:** `7b59925138b46186e1810cc4817a17acbe746c41d7598a40eed656e0bc9e36ad`

## Flujo implementado

1. El acceso por correo, el registro y el retorno de Google marcan una autenticación nueva.
2. Después de validar la cuenta, `acceso.html` sustituye su historial por `entrada.html?from=auth`.
3. La portada animada dura aproximadamente 4,6 segundos.
4. La salida usa una transición breve y abre `inicio.html?entrada=1` mediante `location.replace`.
5. Al abrir una PWA que ya conserva sesión, se entra directamente a Inicio y no se repite la portada.
6. Los flujos especiales `return=configuracion.html` y `return=eliminar-cuenta.html` no se desvían.

## Diseño y rendimiento

- Imagen vertical independiente: `jemmo-entrada-oficial.webp`.
- Primer plano con `object-fit: contain`, sin recorte de los elementos importantes.
- Fondo duplicado, desenfocado y oscurecido para rellenar cualquier proporción de pantalla.
- Zoom suave, brillo violeta/dorado, aro pulsante, partículas y barra de carga real de interfaz.
- Sin vídeo: evita fotogramas negros, orientación horizontal, consumo elevado y cambios artificiales de personaje.
- Respeta `prefers-reduced-motion`, zonas seguras, pantallas bajas y orientación accidental horizontal.
- La imagen y los archivos de entrada quedan incluidos en la caché PWA para funcionamiento estable.

## Archivos nuevos

- `entrada.html`
- `entrada.css`
- `entrada.js`
- `jemmo-entrada-oficial.webp`
- `CAMBIOS_PRUEBA_56.md`
- `PRUEBAS_PRUEBA_56.txt`
- `LEEME_INSTALACION_PRUEBA_56.txt`

## Archivos modificados

- `acceso.html`: control de autenticación nueva y desvío seguro a la portada.
- `pwa-register.js`, `sw.js`, `manifest.json` y `manifest.webmanifest`: versión PWA, caché y precarga.
- `VERSION.txt` e `INTEGRIDAD_SHA256.txt`: trazabilidad e integridad de la entrega.
- Quince pantallas HTML actualizan las referencias `?v=56` de PWA/App Check para impedir que el móvil reutilice recursos de PRUEBA 55: `index.html`, `inicio.html`, `casa-demo.html`, `chili-ia.html`, `configuracion.html`, `directos.html`, `eliminar-cuenta.html`, `jemmo-agent-agenda.html`, `jemmo-universo.html`, `live.html`, `mensajes.html`, `perfil-publico.html`, `salas.html`, `yo.html` y el propio `acceso.html`.

## Límite de la validación

La prueba definitiva de autenticación y transición debe realizarse después de publicar el parche en GitHub Pages con el móvil real. No se utilizaron credenciales personales durante la validación estática.
