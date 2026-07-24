/* JEMMO LIVE V1 · ACCESO Y MENSAJES PRUEBA 02
   Recuperación de acceso cuando localStorage está lleno.
   No modifica el diseño ni el registro de usuarios. */
(() => {
  'use strict';

  if (window.__jemmoAccessRecovery02) return;
  window.__jemmoAccessRecovery02 = true;

  const SESSION_KEYS = new Set([
    'jemmo_active_uid',
    'jemmo_session',
    'jemmo_session_uid'
  ]);

  const storagePrototype = window.Storage && Storage.prototype;
  if (storagePrototype && !storagePrototype.__jemmoQuotaSafe02) {
    const nativeGetItem = storagePrototype.getItem;
    const nativeSetItem = storagePrototype.setItem;
    const nativeRemoveItem = storagePrototype.removeItem;

    const isQuotaError = error => Boolean(
      error && (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.code === 1014
      )
    );

    const isLocalStorage = storage => {
      try { return storage === window.localStorage; }
      catch { return false; }
    };

    storagePrototype.getItem = function jemmoSafeGetItem(key) {
      const value = nativeGetItem.call(this, key);
      if (value !== null || !isLocalStorage(this) || !SESSION_KEYS.has(String(key))) {
        return value;
      }
      try { return nativeGetItem.call(window.sessionStorage, key); }
      catch { return null; }
    };

    storagePrototype.setItem = function jemmoSafeSetItem(key, value) {
      try {
        return nativeSetItem.call(this, key, value);
      } catch (error) {
        if (!isLocalStorage(this) || !SESSION_KEYS.has(String(key)) || !isQuotaError(error)) {
          throw error;
        }
        try { nativeSetItem.call(window.sessionStorage, key, value); }
        catch {}
        window.__jemmoSessionStorageFallback = true;
        return undefined;
      }
    };

    storagePrototype.removeItem = function jemmoSafeRemoveItem(key) {
      const result = nativeRemoveItem.call(this, key);
      if (isLocalStorage(this) && SESSION_KEYS.has(String(key))) {
        try { nativeRemoveItem.call(window.sessionStorage, key); }
        catch {}
      }
      return result;
    };

    Object.defineProperty(storagePrototype, '__jemmoQuotaSafe02', {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  const $ = selector => document.querySelector(selector);

  const getForm = () => $('#authForm') || $('form');
  const getSubmitButton = form =>
    $('#submit') || $('#submitBtn') || form?.querySelector('button[type="submit"]');
  const getEmail = form =>
    ($('#email') || form?.querySelector('input[type="email"]'))?.value?.trim() || '';
  const getPassword = form =>
    ($('#password') || form?.querySelector('input[type="password"], input[autocomplete="current-password"]'))?.value || '';
  const getStatus = () => $('#status') || $('#message') || $('[role="status"]');

  const showStatus = (text, isError = true) => {
    const status = getStatus();
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('error', isError);
    status.classList.toggle('success', !isError);
    status.style.display = 'block';
  };

  const setButtonBusy = (button, busy) => {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? 'CONECTANDO…' : 'ENTRAR';
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
  };

  const isLoginMode = form => {
    const button = getSubmitButton(form);
    const text = (button?.textContent || '').toLocaleUpperCase('es');
    const loginTab = $('#tabLogin, #loginTab');
    const registerFields = $('#registerFields, #nameField');
    if (loginTab && !loginTab.classList.contains('active')) return false;
    if (registerFields && !registerFields.classList.contains('hidden') && registerFields.offsetParent !== null) return false;
    return !text.includes('CREAR') && !text.includes('REGISTR');
  };

  const errorMessage = error => {
    const code = error?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Correo o contraseña incorrectos.';
    }
    if (code === 'auth/invalid-email') return 'El correo no es válido.';
    if (code === 'auth/too-many-requests') return 'Demasiados intentos. Espera un momento y vuelve a probar.';
    if (code === 'auth/network-request-failed') return 'No se pudo conectar con Firebase. Revisa Internet y vuelve a probar.';
    if (error?.message === 'JEMMO_AUTH_TIMEOUT') return 'La conexión tardó demasiado. Pulsa ENTRAR otra vez.';
    return 'No se pudo iniciar sesión. Vuelve a intentarlo.';
  };

  const withTimeout = (promise, milliseconds) => Promise.race([
    promise,
    new Promise((_, reject) => window.setTimeout(() => {
      const error = new Error('JEMMO_AUTH_TIMEOUT');
      reject(error);
    }, milliseconds))
  ]);

  let loginBusy = false;
  let navigating = false;

  const enterApp = user => {
    if (!user?.uid || navigating) return;
    navigating = true;
    try { localStorage.setItem('jemmo_active_uid', user.uid); }
    catch {
      try { sessionStorage.setItem('jemmo_active_uid', user.uid); }
      catch {}
    }
    try { sessionStorage.removeItem('jemmo_access_fields'); }
    catch {}
    window.location.replace('inicio.html');
  };

  const getFirebaseAuth = async () => {
    const [{ getApps }, authModule] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js')
    ]);

    let app = getApps()[0];
    for (let attempt = 0; !app && attempt < 30; attempt += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 100));
      app = getApps()[0];
    }
    if (!app) throw new Error('JEMMO_FIREBASE_NOT_READY');
    return { auth: authModule.getAuth(app), authModule };
  };

  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form !== getForm() || !isLoginMode(form)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (loginBusy) return;

    const email = getEmail(form);
    const password = getPassword(form);
    const button = getSubmitButton(form);

    if (!email || !password) {
      showStatus('Escribe el correo y la contraseña.');
      return;
    }

    loginBusy = true;
    setButtonBusy(button, true);
    showStatus('', false);

    try {
      const { auth, authModule } = await getFirebaseAuth();

      try {
        await withTimeout(
          authModule.setPersistence(auth, authModule.browserLocalPersistence),
          4000
        );
      } catch {
        // La autenticación continúa aunque el navegador no permita persistencia local.
      }

      const credential = await withTimeout(
        authModule.signInWithEmailAndPassword(auth, email, password),
        20000
      );

      enterApp(credential.user);
    } catch (error) {
      console.error('JEMMO acceso recuperación 02:', error);
      loginBusy = false;
      setButtonBusy(button, false);
      showStatus(errorMessage(error));
    }
  }, true);

  // Puente adicional: si Firebase ya autenticó al usuario, entra aunque una escritura
  // anterior en localStorage haya fallado por falta de espacio.
  (async () => {
    try {
      const { auth, authModule } = await getFirebaseAuth();
      authModule.onAuthStateChanged(auth, user => {
        if (user) enterApp(user);
      });
    } catch (error) {
      console.warn('JEMMO puente de sesión pendiente:', error);
    }
  })();
})();
