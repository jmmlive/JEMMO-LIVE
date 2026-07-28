# JEMMO LIVE V1 · PRUEBA 44

## Seguridad de regalos y acceso global a Mis tareas

**Fecha:** 28/07/2026  
**Base:** `JEMMO-LIVE-main (15).zip` · PRUEBA 43

## Correcciones principales

### 1. Prohibición absoluta de autorregalos

La comprobación `senderUid === recipientUid` se realiza en `jemmo-wallet.js` antes de cualquier efecto económico. Un intento bloqueado:

- no descuenta JEMMOS;
- no consume lotes de recarga;
- no crea movimientos ni reparto 70/20/10;
- no acredita JEMS;
- no entra en la cola de regalos;
- no modifica tareas;
- registra un evento de seguridad sin movimiento económico;
- muestra: **“No puedes enviarte regalos a ti mismo.”**

LIVE y Audio Room excluyen la cuenta propia de ALL y mantienen su botón marcado como **TÚ** y deshabilitado. Mensajes y Destellos aplican la misma validación. La ruta de sincronización de regalos a Firestore vuelve a comprobar remitente y destinatario antes de crear documentos económicos.

### 2. Regalos que cuentan para la tarea

El nivel de la Emisora usa únicamente el 70% neto de regalos recibidos en LIVE durante la ventana móvil de siete días. La marca guardada es:

- `taskProgressMode: "live"` para regalos LIVE;
- `taskProgressMode: "none"` para Audio Room, Perfil, Mensajes, Destellos y otras superficies.

Batalla de Casas conserva su economía independiente y no sube tareas.

### 3. Límites por modo

- LIVE: máximo **3 horas** remunerables por ciclo.
- Audio Room: máximo **2 horas** remunerables por ciclo.
- Nivel S: **4 horas totales**, obligatoriamente combinadas (`3+1` o `2+2`).
- Audio Room: tarifa fija de **800 JEMS/hora**.
- LIVE: tarifa dependiente del nivel.

Los datos se identifican con `rewardRatePolicy: "mode_specific_v2"` y `giftProgressSource: "live_only"`.

### 4. Acceso permanente a Mis tareas

El panel real está disponible desde:

- Inicio;
- Perfil;
- LIVE;
- Audio Room oficial de Casa.

La vista usa `casas/{houseId}/tareas/{uid}` e incorpora historial de ciclos y recompensas para mostrar estados cobrados, completados, pausados, detenidos o pendientes.

### 5. Compatibilidad preservada

- La mascota/pecera sigue aceptando alimento pagado mediante una compra `spendJemmos`.
- Se conserva la economía de Batalla de Casas.
- Se conserva PRUEBA 43: tarea real compartida entre LIVE y Audio Room.
- La caché PWA cambia a PRUEBA 44 para sustituir los scripts antiguos.

## Validación ejecutada

- Comprobación de sintaxis de JavaScript y scripts inline.
- Prueba aislada de autorregalo sin movimiento económico.
- Prueba de regalo válido con reparto 70%.
- Prueba de compra de alimento de mascota.
- Prueba del límite S: no existe cuarta hora solo LIVE; sí existe al combinar Audio Room.

## Límite de esta entrega

La base no incluye reglas Firestore ni Cloud Functions desplegables. Antes de producción con dinero real, la validación de identidad, idempotencia, reparto y autorregalo debe ejecutarse en backend confiable. PRUEBA 44 permanece en **MODO DE PRUEBAS**.
