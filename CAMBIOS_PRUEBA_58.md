# JEMMO LIVE V1 · PRUEBA 58
## Inicio vivo: Batalla dinámica, chat temporal y chicharro corregido

**Fecha:** 01/08/2026  
**Base exacta:** `JEMMO-LIVE-main-PRUEBA-57-COMPLETA.zip`  
**SHA-256 de la base:** `f8f37911f938cc42186eec8ceedacd58e5984a996e4ac87975597c6ebba59f3e`

## Diagnóstico confirmado

1. El reloj `06:42:15` era texto estático.
2. El chat persistía en `localStorage` con la clave `jemmo_battle_chat_v062`; por eso los mensajes antiguos reaparecían al regresar a Inicio.
3. El encabezado usaba `jemmo-fish-nav.webp` dentro de un recorte desplazado mediante `transform`, mostrando en el móvil una zona incorrecta de la mascota.
4. El panel tenía pocos estados de actividad y transmitía la sensación de ser una fotografía.

## Correcciones

### Batalla con actividad visual

- Cuenta atrás real actualizada cada segundo.
- Distintivo **EN VIVO** con pulso.
- Aros y escudos con movimiento suave.
- VS con respiración luminosa.
- Fondo técnico con barridos y luces ambientales.
- Barra de ventaja con transición y brillo móvil.
- Partículas ligeras de regalos y J durante la batalla.
- Línea de actividad reciente con cambios periódicos.
- Observación de los marcadores: cuando `jemmo-battle-gifts.js` actualiza una puntuación, el número reacciona y la barra se recalcula.
- Contador visual de espectadores con variaciones moderadas mientras la pantalla está activa.

### Chat temporal por visita

- Eliminado el guardado de mensajes en `localStorage` desde `app.js`.
- Nuevo módulo dedicado: `jemmo-battle-live.js`.
- Al abrir Inicio se presenta una conversación pública inicial.
- Durante la visita aparecen mensajes ambientales de muestra para evitar un panel estático.
- El mensaje escrito por el usuario se muestra inmediatamente, pero no se guarda en el dispositivo.
- `pagehide` limpia el chat y detiene los temporizadores.
- Si el navegador recupera Inicio desde la caché de retroceso, `pageshow` reconstruye una conversación limpia.
- Se borra la antigua clave `jemmo_battle_chat_v062` para retirar mensajes heredados de versiones anteriores.
- Se conservan como máximo 12 filas visibles para evitar crecimiento ilimitado.

### Chicharro corregido

- Nuevo archivo `jemmo-fish-chat.webp`.
- Resolución: **512 × 512 px**.
- SHA-256: `4c1e279816e2195a3385a7d3e0fae66152e32aef910b378506ed1c18c6ffcf52`.
- Recorte preparado desde el recurso oficial existente para mostrar la cara, el cuerpo y la J con claridad.
- Avatar circular con borde violeta, flotación ligera y barrido luminoso.
- Eliminadas las transformaciones que mostraban únicamente una aleta.

## Compatibilidad

- El botón de regalos y `jemmo-battle-gifts.js` permanecen activos.
- Los cambios de puntuación por regalos siguen guardándose según la implementación existente.
- No se modifica LIVE, Salas, Casas, Mensajes, Perfil, monedero ni la portada animada de PRUEBA 57.
- Se respeta `prefers-reduced-motion`.

## Caché PWA

- Nueva caché: `jemmo-live-v1-home-battle-58-20260801`.
- Nueva identificación de registro: `pwa-home-battle-58`.
- `pwa-register.js` pasa a `?v=58` en las pantallas activas para forzar la actualización móvil.
- `sw.js` precarga `app.js`, `inicio.css`, `jemmo-battle-live.js` y `jemmo-fish-chat.webp`.

## Archivos principales

- `inicio.html`
- `inicio.css`
- `app.js`
- `jemmo-battle-live.js` — nuevo
- `jemmo-fish-chat.webp` — nuevo
- `sw.js`
- `pwa-register.js`
- Pantallas HTML con referencia PWA actualizada a `?v=58`

## Limpieza técnica adicional

- Corregida la referencia antigua e inexistente `assets/fondo-acceso.jpg` de `jemmo.css` para dejar la auditoría sin referencias locales rotas.
- Manifiestos PWA actualizados a `release=58`.

## Auditoría final

- 216 archivos de proyecto.
- 52 JavaScript con sintaxis válida.
- 19 HTML revisados.
- 283 referencias locales verificadas.
- 0 referencias rotas.
- 0 IDs HTML duplicados.
