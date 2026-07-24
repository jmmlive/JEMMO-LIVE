# JEMMO LIVE · MONEDERO Y FINANZAS · PRUEBA 06

Fecha: 24/07/2026

## Objetivo
Unificar Inicio, LIVE, Audio Room/Salas, Mensajes y Perfil con el mismo monedero y el mismo libro financiero privado del propietario, sin cambiar el diseño general de las páginas.

## Correcciones realizadas
- La pestaña **Recargar** vuelve a mostrar Google Play, Tarjeta, Epay, USDT y USDC.
- USDT permite seleccionar **Binance Smart Chain · BEP20**, **TRON · TRC20** y **Ethereum · ERC20**.
- USDC permite seleccionar **Binance Smart Chain · BEP20** y **Ethereum · ERC20**.
- Cada recarga ficticia se comporta como una operación completa de prueba: suma JEMMOS y registra método, red, importe, comisión, neto, estado, fecha y hora.
- Las recargas quedan vinculadas directamente con **JEMMO Finanzas → Recargas**.
- Los regalos enviados desde LIVE y Audio Room/Salas descuentan el mismo saldo global.
- Cada regalo registra el reparto oficial:
  - Con Casa: 70 % emisora, 20 % JEMMO LIVE y 10 % Casa/Agente.
  - Sin Casa: 70 % emisora y 30 % JEMMO LIVE.
- Los JEMS de la emisora quedan confirmados o pendientes según el origen de los JEMMOS usados.
- Las retiradas usan únicamente JEMS confirmados, respetan el mínimo de 100.000 JEMS y quedan registradas en JEMMO Finanzas.
- El service worker cambia de versión para evitar que el móvil siga mostrando el monedero antiguo almacenado en caché.

## Archivos funcionales modificados
- `jemmo-wallet.js`
- `salas.html`
- `sw.js`

## Pruebas realizadas
- Recarga de 10 USDT por Binance BEP20: 99.000 JEMMOS añadidos y operación financiera registrada.
- Regalo en LIVE: descuento correcto y reparto 70/30 registrado.
- Regalo en Audio Room/Salas: descuento correcto y registro del origen.
- Reparto con Casa: 70/20/10 correcto.
- Recarga reversible con Tarjeta: ingreso pendiente y JEMS pendientes correctos.
- Retirada por USDT TRC20: mínimo, comisión, saldo y pago financiero registrados.
