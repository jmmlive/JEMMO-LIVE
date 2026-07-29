# TURN REAL · DESPLIEGUE PRUEBA 53

## Estado

El código cliente y la Cloud Function están preparados. TURN no está activo hasta completar todos los pasos de esta guía.

## 1. Preparar coturn

El servidor coturn debe estar accesible públicamente y usar autenticación por secreto compartido. Configuración conceptual mínima:

```text
use-auth-secret
static-auth-secret=<MISMO_SECRETO_QUE_FIREBASE>
realm=turn.tu-dominio.example
fingerprint
no-multicast-peers
no-loopback-peers
```

Abrir los puertos TURN definidos y un rango UDP de relay. Para producción se recomienda TLS (`turns:`), certificado válido y supervisión del consumo.

## 2. Instalar dependencias de Functions

Desde la raíz del proyecto:

```bash
cd functions
npm install
cd ..
```

## 3. Guardar secretos

```bash
firebase functions:secrets:set TURN_SHARED_SECRET
firebase functions:secrets:set TURN_URLS
firebase functions:secrets:set TURN_ALLOWED_ORIGINS
```

Valores esperados:
- `TURN_SHARED_SECRET`: exactamente el mismo secreto de coturn.
- `TURN_URLS`: lista separada por comas o JSON, por ejemplo `turn:turn.tu-dominio.example:3478?transport=udp,turns:turn.tu-dominio.example:5349?transport=tcp`.
- `TURN_ALLOWED_ORIGINS`: orígenes exactos de la PWA separados por comas.

Nunca escribir el secreto permanente dentro de HTML o JavaScript del cliente.

## 4. Desplegar

```bash
firebase use jemmo-live
firebase deploy --only functions:jemmoTurnCredentials
```

Copiar la URL HTTPS resultante.

## 5. Activar el cliente

En `jemmo-live-rtc-config.js`, asignar la URL:

```js
window.JEMMO_RTC_CREDENTIALS_ENDPOINT='URL_HTTPS_DE_LA_FUNCION';
```

Publicar de nuevo los archivos de la PWA.

## 6. Validar

1. Iniciar sesión en JEMMO LIVE.
2. Abrir las herramientas de diagnóstico ICE.
3. Confirmar que aparecen candidatos `relay`.
4. Probar Jesús ↔ Ruth en redes móviles diferentes, sin compartir Wi-Fi.
5. Confirmar audio y vídeo en ambos sentidos durante al menos 10 minutos.
6. Revisar consumo y registros de coturn y Cloud Functions.

## Seguridad pendiente antes de producción
- Activar App Check y control de abuso/cuotas.
- Rotar el secreto compartido periódicamente.
- Alertas de costes y límites de transferencia.
- No aceptar orígenes comodín.
- No considerar TURN como sustituto de una SFU para transmisiones multitudinarias.
