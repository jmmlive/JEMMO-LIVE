/*
 * JEMMO LIVE · APP CHECK · PRUEBA 55 FASE 2
 *
 * 1. Crea una clave web de reCAPTCHA Enterprise para los dominios oficiales.
 * 2. Registra la app web en Firebase Console > App Check.
 * 3. Pega SOLO la clave pública del sitio y cambia enabled a true.
 * 4. Observa métricas antes de activar la aplicación forzosa en Firebase.
 *
 * La clave del sitio es pública. Nunca añadas claves privadas ni secretos aquí.
 */
export const JEMMO_APP_CHECK_CONFIG = Object.freeze({
  enabled: false,
  provider: 'recaptcha-enterprise',
  siteKey: '',
  tokenAutoRefresh: true,
  debugToken: ''
});
