# JEMMO LIVE · Acceso con Firebase

Pantalla de inicio inspirada en la captura facilitada y conectada al proyecto Firebase **jemmo-live**.

## 1. Preparar el proyecto

```bash
npm install
```

Copia `.env.example` como `.env` y coloca la API key correcta:

```bash
cp .env.example .env
```

En Windows puedes duplicar el archivo manualmente.

## 2. Activar Firebase Authentication

En Firebase Console:

1. Authentication
2. Comenzar
3. Métodos de acceso
4. Activar **Correo electrónico/Contraseña**

## 3. Ejecutar

```bash
npm run dev
```

## Incluido

- Inicio de sesión con correo y contraseña
- Registro de usuarios
- Recuperación de contraseña
- Persistencia de sesión
- Cierre de sesión
- Diseño móvil responsive
- Botones sociales preparados visualmente, todavía desactivados

## Importante

Los accesos Google, Apple y Facebook requieren configurar sus proveedores por separado en Firebase y, para Apple/Facebook, credenciales externas.
