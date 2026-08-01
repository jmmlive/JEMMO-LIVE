# JEMMO LIVE V1 · PRUEBA 57
## Portada Chili animada entre Acceso e Inicio

**Fecha:** 01/08/2026  
**Base exacta:** `JEMMO-LIVE-main-PRUEBA-56-COMPLETA.zip`  
**SHA-256 de la base:** `c18c22a78ac0d3d0a2c6bfc1b02c544a09daa17112436540454d75ded6f3a384`

## Corrección solicitada

La portada anterior no correspondía al personaje oficial elegido. PRUEBA 57 integra la imagen exacta aportada por Jesús, con **Chili**, el **chicharro violeta** y las **monedas J**.

## Flujo final

1. El usuario inicia sesión o completa un registro nuevo.
2. `acceso.html` abre `entrada.html?from=auth`.
3. La portada oficial permanece aproximadamente 4,6 segundos.
4. Se aplica movimiento suave, brillo, barrido luminoso, destellos y monedas J flotantes.
5. La salida abre `inicio.html?entrada=1` mediante `location.replace`.
6. Las aperturas posteriores con sesión conservada entran directamente a Inicio.

## Imagen integrada

- Fuente exacta recibida: `1000226239.png`.
- Resolución: **864 × 1536 px**.
- Proporción: **9:16 vertical**.
- SHA-256 de la fuente: `eaa9d9265b084f748c67d8d8a733d716325540d07e596f1d1b16d6cbbd372b88`.
- Archivo PWA: `jemmo-entrada-oficial.webp`.
- Conversión WebP sin pérdida para conservar los píxeles de la imagen elegida.
- SHA-256 del WebP integrado: `29bc345b5952ef33b54bf4afd5e62e510e7e6042933cec629b2ce1a47ef99b97`.

## Ajustes visuales

- Eliminados el logotipo y el cargador HTML superpuestos para no duplicar los elementos ya presentes en la portada.
- La imagen se muestra completa mediante un contenedor 9:16 y fondo desenfocado de relleno.
- La barra dibujada en la imagen recibe un barrido luminoso alineado con su posición real.
- Se añaden monedas J animadas sobre la composición sin cambiar la imagen base.
- Se respeta `prefers-reduced-motion`.

## Caché PWA

- Nueva caché: `jemmo-live-v1-entry-chili-57-20260801`.
- Nueva versión de registro: `pwa-entry-chili-57`.
- Referencias globales actualizadas a `?v=57` para impedir que el móvil reutilice PRUEBA 56.

## Archivos principales modificados

- `jemmo-entrada-oficial.webp`
- `entrada.html`
- `entrada.css`
- `entrada.js`
- `acceso.html`
- `sw.js`
- `pwa-register.js`
- `manifest.json`
- `manifest.webmanifest`
- Pantallas HTML con referencias PWA/App Check actualizadas a `?v=57`.

## Archivos nuevos

- `CAMBIOS_PRUEBA_57.md`
- `PRUEBAS_PRUEBA_57.txt`
- `LEEME_INSTALACION_PRUEBA_57.txt`
