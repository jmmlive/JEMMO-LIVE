# JEMMO LIVE V1 · PRUEBA 60

## INTEGRIDAD DEL MARCADOR DE BATALLA Y LIDERATO DINÁMICO

Fecha: 01/08/2026  
Base exacta: `JEMMO-LIVE-main-PRUEBA-59-COMPLETA.zip`  
SHA-256 base: `986da3fa6e478051d40e5c78620f2fd27739d625eb84018179f4a3ea4a6bdc90`

## Incidencia grave confirmada

Después de enviar un regalo a Casa Unicornio, el marcador mostraba `597.300` puntos para Unicornio y `429.500` para Tenerife, pero mantenía las etiquetas estáticas `LIDERANDO` en Tenerife y `REMONTANDO` en Unicornio. Además, la puntuación se mezclaba con datos antiguos de pruebas guardados en el dispositivo y en la ruta Firestore anterior, por lo que podían aparecer aumentos no correspondientes al regalo recién enviado.

## Correcciones

- Las etiquetas de estado ya no están escritas de forma fija en el HTML.
- Después de cada actualización se comparan los dos marcadores:
  - La Casa con más puntos muestra `LIDERANDO`.
  - La Casa con menos puntos muestra la distancia exacta hasta el liderato.
  - Si ambas tienen la misma puntuación, las dos muestran `EMPATE`.
- La barra, las etiquetas, los atributos de accesibilidad y los números se calculan desde una única función de marcador.
- Se abre un ciclo limpio de Batalla Oficial: `oficial-destacada-ciclo-01`.
- Se ignora la ruta antigua `oficial-prueba`, que contenía puntos acumulados de ensayos anteriores.
- Se elimina automáticamente la clave local antigua `jemmo_battle_house_points_v1`.
- Marcador inicial oficial del nuevo ciclo:
  - Casa Tenerife: 329.500 puntos.
  - Casa Unicornio: 97.300 puntos.
- Los únicos puntos que modifican el marcador son regalos confirmados.
- El envío se registra en Firestore mediante transacción idempotente para evitar incrementos duplicados.
- Los documentos de Casa y evento incluyen `simulation: true`, compatible con las reglas actuales.
- Si la nube no está disponible, el punto se conserva localmente sin inventar aumentos de la otra Casa.
- La actividad reciente mantiene visible el regalo real del usuario durante 10 segundos y deja de sustituirlo inmediatamente por mensajes ficticios.
- Los mensajes ambientales del chat ya no simulan envíos de regalos; son únicamente conversación de público.
- La conversación temporal sigue borrándose al salir de Inicio.

## PWA

- Caché: `jemmo-live-v1-battle-score-integrity-60-20260801`.
- Registro: `pwa-battle-score-integrity-60`.
- Manifiestos: `release=60`.
