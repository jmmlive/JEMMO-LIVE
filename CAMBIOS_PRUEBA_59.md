# JEMMO LIVE V1 · PRUEBA 59

## REGALOS DE BATALLA FUNCIONALES Y BOTÓN ATRÁS SEGURO

Fecha: 01/08/2026
Base exacta: `JEMMO-LIVE-main-PRUEBA-58-COMPLETA.zip`
SHA-256 base: `39c7fae6969ff51be888786fcf46a8f5a86752f4037b123efe43e22cd5312392`

## Incidencias confirmadas

1. El modal de regalos permitía escoger regalo y cantidad, pero el botón quedaba desactivado silenciosamente si faltaba la Casa. En móvil podía parecer que la Casa no respondía.
2. El botón Atrás de Android cerraba la PWA cuando el modal de regalos estaba abierto o cuando Inicio era la única entrada del historial.

## Correcciones

- Los botones de Casa, regalo y cantidad tienen eventos directos optimizados para toque.
- El botón inferior ya no queda inutilizado sin explicación: indica `SELECCIONAR CASA`, `SELECCIONAR REGALO` o `CONFIRMAR ENVÍO`.
- Si se pulsa con un paso pendiente, desplaza y enfoca la selección que falta.
- El coste total solo se muestra cuando Casa y regalo están elegidos.
- El monedero se espera hasta 2,4 segundos antes de declarar que no está listo.
- El cobro está protegido con idempotencia y captura de errores; un fallo no modifica el saldo.
- Después del envío se actualizan saldo, chat y marcador.
- Tocar directamente Casa Tenerife o Casa Unicornio abre el panel con esa Casa preseleccionada.
- Al abrir el modal se añade una entrada de historial interna. El botón Atrás cierra el modal, no la aplicación.
- Inicio incorpora una guardia de navegación: al estar en la pantalla principal, Atrás mantiene al usuario dentro de JEMMO LIVE y muestra `Ya estás en Inicio`.
- `jemmo-battle-gifts.js` queda incluido expresamente en la caché PWA.

## PWA

- Caché: `jemmo-live-v1-battle-gifts-back-59-20260801`.
- Registro: `pwa-battle-gifts-back-59`.
- Manifiestos: `release=59`.
