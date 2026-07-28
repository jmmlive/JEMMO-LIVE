# JEMMO LIVE V1 · PRUEBA 45
## Centro oficial Chili, Configuración, normas, pagos y seguridad financiera
Fecha: 28/07/2026

## Problema resuelto
La información oficial estaba repartida entre Chili, pantallas y textos locales. Configuración y Normas todavía contenían accesos ficticios en algunas superficies. El Monedero permitía registrar recargas simuladas mediante una llamada directa del navegador sin exigir que la operación naciera del flujo oficial.

## Implementación
- `jemmo-official-policies.js`: fuente única versionada PRUEBA 45 con 13 artículos oficiales, tabla completa de tareas, categorías de soporte y sello de fuente.
- `configuracion.html`, `configuracion.css`, `jemmo-settings.js`: centro real de ajustes de cuenta, seguridad, privacidad, notificaciones, país, idioma y pagos.
- Chili muestra, filtra y abre artículos oficiales y responde utilizando la misma fuente.
- Soporte exige categoría, lugar, explicación, fecha aproximada y captura; registra fuente y versión.
- Inicio, Perfil, LIVE y Salas enlazan a Configuración, Chili, Normas y Soporte reales.
- Monedero requiere autorización efímera del flujo oficial antes de acreditar una recarga simulada.
- Una llamada directa no autorizada se bloquea antes de modificar saldo y registra `unauthorized_recharge_blocked`.
- Una alerta financiera activa bloquea la retirada y registra `financial_operation_quarantined`.
- Para Cuba, Google Play no aparece como método disponible.
- Service Worker y registro PWA actualizados a PRUEBA 45.

## Corrección adicional detectada durante pruebas
El buscador de artículos sumaba puntuación por las propias palabras del artículo aunque la consulta no coincidiera. Esto podía dirigir una pregunta sobre fraude al artículo del ciclo de tareas. Se corrigió el algoritmo y se añadieron equivalencias explícitas para “recarga falsa” y “recarga no autorizada”.

## Límite obligatorio antes de producción
La autorización implementada en el navegador solo protege el flujo de prueba. Para dinero real deben existir validación de recibos del proveedor, webhooks firmados, idempotencia, libro mayor inmutable, reglas Firebase por rol, Cloud Functions, reserva para contracargos y revisión humana trazable.
