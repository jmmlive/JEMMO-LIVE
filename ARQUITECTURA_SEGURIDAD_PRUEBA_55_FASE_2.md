# Arquitectura de seguridad · PRUEBA 55 FASE 2

## Autoridad

- **Identidad:** Firebase Authentication UID.
- **Propietario y administradores de plataforma:** Custom Claims firmadas dentro del ID token.
- **Administración de una Casa:** propietario de la Casa o documento de membresía autorizado en Firestore.
- **Modo de pruebas:** solo altera la presentación local; nunca concede permisos.

## Datos

- `users/{uid}`: perfil público editable y asignación organizativa protegida.
- `userPrivate/{uid}`: correo, nacimiento, sexo, teléfono y otros datos privados; acceso exclusivo del titular.
- `directorioMensajes/{uid}` y `perfilesPublicos/{uid}`: datos públicos sin correo ni campos de autoridad.
- `accountDeletionReceipts/{requestId}`: recibo anonimizado, inaccesible desde clientes.

## Controles

- Denegación por defecto en Firestore y Storage.
- Propiedad por UID en escrituras personales.
- Campos protegidos mediante `diff().affectedKeys()`.
- Custom Claims para propietario/administrador.
- App Check preparado para web y Functions.
- Eliminación de cuenta mediante Cloud Function, nunca desde una operación local.
- Registros económicos del cliente limitados explícitamente a `simulation: true`.

## Pendiente antes de producción

- Activar App Check después de observar métricas legítimas.
- Backend financiero autoritativo, libro contable y Google Play Billing.
- Moderación integral y retención legal definida.
- Infraestructura SFU para audiencias grandes.
