# JEMMO LIVE V1 · MASCOTA VIVA 2.5D Y SANTUARIO ACUÁTICO · PRUEBA 64

Fecha: 01/08/2026
Base exacta: `JEMMO-LIVE-main-PRUEBA-61-COMPLETA.zip`
SHA-256 de la base: `f0c733fc00c2ad0d8e7ef1133f1e9e752d8537c27fad7def20b351a201a2bb1b`

## Estado de versiones anteriores

- PRUEBA 62: invalidada.
- PRUEBA 63: invalidada.
- PRUEBA 64 se construye directamente sobre PRUEBA 61.

## Objetivo

Rehacer la mascota y la pecera sin fotografías ni imágenes generadas, con un motor visual propio, movimiento continuo, reacciones y una escena acuática coherente con la identidad violeta y dorada de JEMMO LIVE.

## Implementación visual

- Nuevo motor `jemmo-house-pet-renderer.js` basado en Canvas 2D de alta resolución.
- Chicharro completo con silueta reconocible, cuerpo violeta con volumen, ojo azul, boca expresiva, aletas, cola, reflejos y letra J dorada.
- La J permanece legible cuando la mascota cambia de dirección.
- Movimiento con aceleración, frenado, inclinación, respiración, parpadeo, cola y aletas animadas.
- Seguimiento del dedo dentro de una zona segura; el pez no se recorta en los bordes.
- Santuario acuático por capas: agua, rayos, portal, arrecife, arena, plantas, corales, burbujas, partículas y cristal.
- Reacciones diferenciadas para tocar, alimentar, limpiar, jugar y usar alimentos especiales.
- Evolución visual adicional en niveles superiores.
- Canvas adaptado a la densidad de pantalla, con `devicePixelRatio` limitado a 2 para proteger rendimiento y batería.
- Animación detenida al cerrar el panel o cuando la página queda oculta.
- Movimiento reducido cuando el sistema tiene activo `prefers-reduced-motion`.

## Correcciones de estado y experiencia

- Migración única de estados antiguos anteriores a PRUEBA 64.
- Se eliminan el XP ficticio, `NIVEL MÁXIMO` heredado y los bloqueos de 23 horas de las pruebas invalidadas.
- Primera apertura con 0 XP y los tres cuidados disponibles.
- Alimentar: cada 6 horas.
- Limpiar: cada 12 horas.
- Jugar: cada 2 horas.
- El saldo completo del monedero ya no se muestra permanentemente en la pantalla de la mascota.
- Se conservan confirmación de compra, control de doble cobro, IndexedDB, Firebase y API de progreso externo.

## Interfaz

- Cabecera compacta con marca JEMMO.
- Escena principal más grande que los paneles de datos.
- Estado visible: RADIANTE, FELIZ, TRANQUILO o NECESITA CUIDADOS.
- Etiquetas completas ALIMENTO, LIMPIEZA y ÁNIMO.
- Progreso expresado como XP actual / objetivo del nivel.
- Acciones táctiles grandes y adaptables.

## Archivos modificados

- `CHANGELOG.md`
- `INTEGRIDAD_SHA256.txt`
- `jemmo-house-pet.css`
- `jemmo-house-pet.js`
- `pwa-register.js`
- `sw.js`

## Archivos nuevos

- `jemmo-house-pet-renderer.js`
- `CAMBIOS_PRUEBA_64.md`
- `PRUEBAS_PRUEBA_64.txt`
- `LEEME_INSTALACION_PRUEBA_64.txt`
