# JEMMO LIVE V1 · MASCOTA OFICIAL 3D Y PECERA ESPECTACULAR · PRUEBA 62

Fecha: 01/08/2026

Base exacta: `JEMMO-LIVE-main-PRUEBA-61-COMPLETA.zip`

SHA-256 de la base:

`f0c733fc00c2ad0d8e7ef1133f1e9e752d8537c27fad7def20b351a201a2bb1b`

## Objetivo

Sustituir la mascota vectorial plana de la pecera por el chicharro oficial de JEMMO LIVE, con la misma identidad visual de la referencia aportada por Jesús: cuerpo violeta 3D, ojo azul grande, boca sonriente, detalles dorados y letra J.

## Cambios implementados

1. La pecera utiliza los recursos oficiales ya incluidos en el proyecto:
   - `jemmo-fish-nav.webp` para la mascota principal.
   - `jemmo-fish-chat.webp` para el acceso compacto y el encabezado.
2. Nueva presentación central con portal circular, halo violeta/dorado y plataforma holográfica JEMMO.
3. Animación continua de flotación, brillo, halo y plataforma.
4. Reacciones visuales independientes al tocar, alimentar, limpiar, jugar o enviar un alimento de pago.
5. Partículas con color según la acción:
   - tocar: violeta;
   - alimentar: verde;
   - limpiar: cian;
   - jugar: rosa;
   - regalo: dorado.
6. La mascota conserva movimiento suave dentro de una zona segura para evitar recortes en móviles verticales.
7. Estados visuales para hambre, suciedad o ánimo bajo sin modificar las reglas económicas ni los datos existentes.
8. Evolución visual reforzada en los niveles 2 a 5 mediante brillo, saturación, halo y efectos dorados.
9. Actualización del módulo a `62.0.0-test` manteniendo la misma base IndexedDB y las mismas rutas de Firestore para no perder progreso.
10. Caché PWA renovada y precarga añadida para `jemmo-fish-nav.webp`.

## Archivos funcionales modificados

- `jemmo-house-pet.js`
- `jemmo-house-pet.css`
- `pwa-register.js`
- `sw.js`
- `CHANGELOG.md`

## Validaciones realizadas

- Sintaxis correcta de todos los JavaScript modificados.
- CSS analizado sin errores de parseo.
- Prueba real de renderizado en Chromium mediante Playwright.
- Imagen oficial cargada correctamente: 1536 px de ancho natural.
- Pruebas en 320×700, 390×844 y 430×932.
- Sin desbordamiento horizontal en los tres tamaños.
- Apertura y cierre de la pecera correctos.
- Reacción al tocar la mascota correcta.
- Acción gratuita ALIMENTAR: +4 XP y bloqueo posterior por tiempo de espera.
- Alimentación con regalo Bocado neón: confirmación, +20 XP y actualización del estado.
- Sin errores JavaScript durante las pruebas interactivas.

## Compatibilidad y datos

- No se cambian las rutas `casas/{houseId}/mascota/actual` ni `mascotaAcciones`.
- No se reinician XP, alimento, limpieza, ánimo ni historial de acciones.
- No se cambian precios, recompensas ni reglas del monedero.
- Se mantiene respaldo local mediante IndexedDB y sincronización con Firebase.
