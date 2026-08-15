# JEMMO LIVE V1 · CASA PREMIUM REAL · 15/08/2026

## Objetivo
Llevar la Casa de JEMMO LIVE al nivel visual premium aprobado y limpiar elementos visibles de prueba en la experiencia principal.

## Cambios realizados
- Nuevo escenario social premium dentro de Mi Casa.
- Anfitrión destacado con avatar real cuando existe y fallback por iniciales.
- Hasta seis miembros destacados alrededor del escenario usando miembros reales cargados de la Casa.
- Pecera Social integrada con acceso directo a la mascota Chicharro JEMMO existente.
- La Pecera resuelve de nuevo la Casa activa al abrirse para evitar mezclar mascotas entre Casas.
- Métricas del escenario: miembros, puntos, actividad y regalos/energía solo si esos datos existen; si no existen se muestra “—” para evitar datos inventados.
- Accesos rápidos a Sala y Chat desde el escenario.
- Eliminado del flujo de Casa el cargador de simulación de roles.
- El rol mostrado vuelve a depender de permisos reales de la cuenta.
- Inicio: “PERSONAS EN DIRECTO” pasa a “LIVE DE PERSONAS” para distinguir los LIVE individuales de las batallas oficiales.
- Estado vacío de LIVE corregido para no contradecir una batalla que siga activa.
- Inicio: eliminado el texto visible “Modo de pruebas” en JEMMO Universo.
- Mensajes: eliminado “PRUEBA LOCAL” del encabezado de conversación.
- PWA: caché renovada y Casa/recursos de Casas añadidos al núcleo offline.

## Archivos principales modificados
- inicio.html
- jemmo-live-presence.js
- casas.html
- casa-demo.html (redirección compatible)
- jemmo-houses.js
- jemmo-house-pet.js
- app.css
- mensajes.html
- pwa-register.js
- sw.js

## Criterio de producción aplicado
No se inventan métricas sociales. Cuando una métrica aún no existe en Firebase se muestra “—” hasta disponer del dato real.
