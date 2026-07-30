/* JEMMO LIVE · ARRANQUE CENTRAL DE FIREBASE APP CHECK · PRUEBA 55 FASE 2 */
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-check.js';
import { JEMMO_APP_CHECK_CONFIG as config } from './jemmo-app-check-config.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBK0-3RnU5JVx3hI_DoM9Bj2efnk3N4nBQ',
  authDomain: 'jemmo-live.firebaseapp.com',
  projectId: 'jemmo-live',
  storageBucket: 'jemmo-live.firebasestorage.app',
  messagingSenderId: '355540892255',
  appId: '1:355540892255:web:d15a8dd03b2915e31939ea'
};

const state = {
  enabled: false,
  initialized: false,
  reason: '',
  appCheck: null
};

function clean(value, max = 300) {
  return String(value || '').trim().slice(0, max);
}

function publish() {
  const detail = Object.freeze({
    enabled: state.enabled,
    initialized: state.initialized,
    reason: state.reason
  });
  window.__jemmoAppCheckState = detail;
  window.dispatchEvent(new CustomEvent('jemmo-app-check-state', { detail }));
  return detail;
}

async function token(forceRefresh = false) {
  if (!state.appCheck) return '';
  try {
    const result = await getToken(state.appCheck, Boolean(forceRefresh));
    return clean(result?.token, 6000);
  } catch (error) {
    console.warn('JEMMO App Check: no se pudo obtener token.', error?.code || error?.message || error);
    return '';
  }
}

async function boot() {
  if (!config?.enabled) {
    state.reason = 'disabled-by-config';
    return publish();
  }
  const siteKey = clean(config.siteKey, 300);
  if (!siteKey) {
    state.reason = 'missing-site-key';
    return publish();
  }
  if (config.provider !== 'recaptcha-enterprise') {
    state.reason = 'unsupported-provider';
    return publish();
  }

  const host = clean(location.hostname, 180).toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  if (isLocal && config.debugToken) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = config.debugToken === true ? true : clean(config.debugToken, 300);
  }

  try {
    const app = getApps()[0] || initializeApp(firebaseConfig);
    state.appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: config.tokenAutoRefresh !== false
    });
    state.enabled = true;
    state.initialized = true;
    state.reason = 'ready';
  } catch (error) {
    const code = clean(error?.code || error?.message || error, 240);
    if (code.includes('appCheck/already-initialized')) {
      state.enabled = true;
      state.initialized = true;
      state.reason = 'already-initialized';
    } else {
      state.reason = code || 'initialization-failed';
      console.error('JEMMO App Check:', error);
    }
  }
  return publish();
}

window.JemmoAppCheck = Object.freeze({
  getToken: token,
  getState: () => Object.freeze({ ...state, appCheck: undefined }),
  isEnabled: () => state.enabled
});
window.__jemmoAppCheckReady = boot();
