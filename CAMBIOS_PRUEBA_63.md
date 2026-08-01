# JEMMO LIVE V1 · MASCOTA VIVA Y PECERA INMERSIVA · PRUEBA 63

Fecha: 01/08/2026
Base exacta: `JEMMO-LIVE-main-PRUEBA-61-COMPLETA.zip`
SHA-256 de la base: `f0c733fc00c2ad0d8e7ef1133f1e9e752d8537c27fad7def20b351a201a2bb1b`

## Corrección de enfoque

PRUEBA 62 fue invalidada. La referencia visual aportada por Jesús no debía convertirse en una fotografía pegada dentro de la pecera. Esta versión se reconstruye desde PRUEBA 61 y no utiliza imágenes generadas ni fotografías para representar a la mascota.

## Mascota oficial

- Chicharro completo construido mediante SVG dentro del código.
- Silueta reconocible incluso en el botón pequeño de acceso.
- Cuerpo violeta con profundidad, ojo azul expresivo, detalles dorados y letra J legible.
- Boca abierta, aletas, cola y movimientos independientes.
- La letra J se mantiene en orientación correcta cuando el pez cambia de dirección.
- El pez permanece siempre dentro de una zona segura y nunca aparece cortado.

## Pecera

- Escena panorámica inmersiva, sin recorte circular de la mascota.
- Portal JEMMO, plataforma, cristales, arrecife, burbujas, partículas y profundidad.
- Estado y nivel integrados en la propia escena para reducir tarjetas innecesarias.
- Interfaz reorganizada para que ALIMENTO, LIMPIEZA y ÁNIMO no se trunquen.
- Adaptación comprobada en 320×700, 390×844 y 430×932.

## Comportamiento

- Reacción distinta al tocar, alimentar, limpiar, jugar y usar alimento especial.
- Movimiento automático suave y seguimiento del toque.
- Estados visuales para hambre, suciedad y ánimo bajo.
- Evolución en cinco niveles.
- Animaciones concentradas en `transform` y `opacity` para reducir trabajo de layout.
- Compatibilidad con `prefers-reduced-motion`.

## Datos y cuidados

- Migración controlada: se reinician una sola vez los datos heredados marcados como prueba para eliminar XP ficticio, nivel máximo falso y bloqueos anteriores.
- Alimentar gratis: cada 6 horas.
- Limpiar: cada 12 horas.
- Jugar: cada 2 horas.
- Los alimentos especiales continúan solicitando confirmación y bloqueo de doble cobro.
- Persistencia local y sincronización Firebase conservadas.

## Archivos principales modificados

- `jemmo-house-pet.js`
- `jemmo-house-pet.css`
- `pwa-register.js`
- `sw.js`
- `CHANGELOG.md`
- `INTEGRIDAD_SHA256.txt`
