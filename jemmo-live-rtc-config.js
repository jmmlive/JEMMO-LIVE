/*
 * JEMMO LIVE · CONFIGURACIÓN ICE/TURN · PRUEBA 49
 *
 * Esta entrega usa STUN por defecto. Para producción, el backend debe entregar
 * credenciales TURN de corta duración y definir window.JEMMO_RTC_CONFIG antes
 * de cargar jemmo-live-webrtc.js. No publiques contraseñas TURN permanentes.
 */
window.JEMMO_RTC_CONFIG=window.JEMMO_RTC_CONFIG||{
  iceServers:[
    {urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']}
  ],
  iceCandidatePoolSize:10,
  bundlePolicy:'max-bundle',
  rtcpMuxPolicy:'require'
};
// URL HTTPS opcional de una Cloud Function/backend autenticado que devuelva
// { iceServers: [{ urls, username, credential }] } con credenciales TURN temporales.
window.JEMMO_RTC_CREDENTIALS_ENDPOINT=window.JEMMO_RTC_CREDENTIALS_ENDPOINT||'';
window.JEMMO_RTC_MAX_P2P_VIEWERS=window.JEMMO_RTC_MAX_P2P_VIEWERS||8;
window.JEMMO_RTC_VIDEO_BITRATE=window.JEMMO_RTC_VIDEO_BITRATE||650000;
window.JEMMO_RTC_VIDEO_FPS=window.JEMMO_RTC_VIDEO_FPS||24;
window.JEMMO_RTC_AUDIO_BITRATE=window.JEMMO_RTC_AUDIO_BITRATE||48000;
