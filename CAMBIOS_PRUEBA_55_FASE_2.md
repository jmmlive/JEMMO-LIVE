# JEMMO LIVE V1 · PRUEBA 55 · FASE 2
## Seguridad, autoridad de datos y eliminación de cuenta

Fecha: 30/07/2026  
Base exacta: `JEMMO-LIVE-main-PRUEBA-55-FASE-1-COMPLETA.zip`  
SHA-256 de la base: `642e4eba02f3f2732099e82f980120724ba6e81e414abc76059a8d8cb8fb9f73`

## Correcciones aplicadas

1. Se crean reglas desplegables completas para Cloud Firestore y Cloud Storage con denegación por defecto.
2. La autoridad de propietario/administrador pasa a Firebase Authentication Custom Claims. El campo `role` del perfil ya no concede permisos administrativos.
3. El selector visual de roles permanece disponible para pruebas, pero no modifica permisos, tareas ni cargos reales.
4. Se separan datos públicos y privados: correo, fecha de nacimiento, sexo y teléfono se almacenan en `userPrivate/{uid}`.
5. Se impide al cliente modificar rol, verificación, nivel, logros, saldos, estado financiero o asignación de Casa.
6. Se elimina la promoción automática de cuentas antiguas a Emisor/a.
7. Se añaden scripts administrativos para asignar Custom Claims y migrar datos privados históricos.
8. Se prepara Firebase App Check con reCAPTCHA Enterprise y renovación automática de tokens.
9. Las credenciales TURN aceptan token App Check y pueden exigirlo después de la fase de observación.
10. Se añade eliminación de cuenta dentro de Configuración y en una página web pública independiente.
11. Se añade la función callable `jemmoDeleteAccount`, con sesión reciente, confirmación exacta, borrado de Auth, Firestore y Storage, y recibo anonimizado.
12. Se corrige la compatibilidad de conversaciones que usan `participants` o `participantUids`.
13. Se renueva la caché PWA, los manifiestos y la versión de recursos de seguridad.

## Estado deliberado

- App Check queda **preparado pero desactivado** hasta registrar la aplicación web, los dominios oficiales y la clave pública reCAPTCHA Enterprise.
- La función de eliminación y las reglas requieren despliegue mediante Firebase CLI; subir el parche a GitHub no despliega el backend.
- La economía continúa marcada como simulación. No se autoriza dinero real en esta fase.
- El LIVE continúa con arquitectura P2P; el escalado SFU sigue pendiente.
