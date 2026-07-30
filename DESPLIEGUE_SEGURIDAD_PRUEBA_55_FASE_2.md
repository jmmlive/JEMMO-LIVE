# Despliegue seguro · JEMMO LIVE PRUEBA 55 FASE 2

> No desplegar primero las reglas. La Custom Claim del propietario debe existir antes para evitar perder acceso administrativo.

## 1. Preparación obligatoria

1. Exportar o respaldar Firestore y revisar que el proyecto activo sea `jemmo-live`.
2. Trabajar desde un ordenador o Google Cloud Shell con Firebase CLI y credenciales administrativas. No subir claves privadas al repositorio.
3. Entrar en `functions` y ejecutar:

```bash
npm install
cp .env.example .env.jemmo-live
```

## 2. Conceder autoridad real al propietario

Localizar el UID real de Jesús en Firebase Authentication y ejecutar:

```bash
npm run set:admin -- --uid=UID_REAL_DE_JESUS --role=owner
```

Después, cerrar sesión y volver a entrar en JEMMO LIVE para renovar el ID token.

Para retirar permisos posteriormente:

```bash
npm run set:admin -- --uid=UID_REAL --role=user
```

## 3. Migrar datos privados históricos

```bash
npm run migrate:privacy
```

Este proceso mueve correo, fecha de nacimiento, sexo y teléfono desde `users/{uid}` a `userPrivate/{uid}` y elimina esos campos del perfil público.

## 4. Revisar configuración TURN

Si los secretos aún no existen, configurarlos desde Firebase CLI:

```bash
firebase --project jemmo-live functions:secrets:set TURN_SHARED_SECRET
firebase --project jemmo-live functions:secrets:set TURN_URLS
firebase --project jemmo-live functions:secrets:set TURN_ALLOWED_ORIGINS
```

`TURN_ALLOWED_ORIGINS` debe contener únicamente los dominios oficiales de JEMMO LIVE.

## 5. Desplegar backend y reglas

Mantener inicialmente estos valores en `functions/.env.jemmo-live`:

```env
TURN_REQUIRE_APP_CHECK=false
ACCOUNT_DELETION_REQUIRE_APP_CHECK=false
```

Ejecutar:

```bash
npm run check
npm run deploy:phase2
```

## 6. Subir el parche web

Descomprimir el parche GitHub y subir el contenido de `JEMMO-LIVE-main` a la raíz del repositorio, sustituyendo archivos con el mismo nombre. No subir el ZIP directamente.

## 7. Activar App Check de forma gradual

1. Registrar la aplicación web en Firebase App Check con reCAPTCHA Enterprise.
2. Autorizar solo los dominios oficiales y de pruebas controladas.
3. Pegar la clave pública del sitio en `jemmo-app-check-config.js` y cambiar `enabled` a `true`.
4. Publicar el cliente y observar las métricas de solicitudes legítimas y no verificadas.
5. Cuando los dos móviles de prueba y los navegadores admitidos funcionen correctamente, cambiar en `.env.jemmo-live`:

```env
TURN_REQUIRE_APP_CHECK=true
ACCOUNT_DELETION_REQUIRE_APP_CHECK=true
```

6. Volver a desplegar Functions y activar la aplicación forzosa de App Check para Firestore y Storage desde Firebase Console.

## 8. Pruebas obligatorias

- Cuenta normal: no puede modificar `role`, `verified`, `level`, saldos ni asignación de Casa.
- Propietario: conserva panel administrativo solo después de renovar el token.
- Ruth: inicia LIVE, Jesús entra, chat y cuatro sillas siguen funcionando.
- Eliminación: requiere sesión reciente, casilla marcada y frase exacta.
- Tras eliminar: la cuenta no inicia sesión y desaparecen sus perfiles, presencia y archivos personales.
- App Check: primero medir; después activar el bloqueo.

## Bloqueo vigente

No activar recargas, retiradas ni dinero real. Esta fase protege propiedad y acceso, pero no sustituye el backend financiero pendiente.
