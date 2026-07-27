(() => {
  'use strict';

  const VERSION = 'pwa-chili-support-38';
  let installPrompt = null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.startsWith('android-app://');

  function safeGet(storage, key) {
    try { return storage.getItem(key); } catch { return null; }
  }
  function safeSet(storage, key, value) {
    try { storage.setItem(key, value); } catch {}
  }

  function injectInstallStyles() {
    if (document.getElementById('jemmoInstallStyles')) return;
    const style = document.createElement('style');
    style.id = 'jemmoInstallStyles';
    style.textContent = `
      #jemmoInstallLauncher{position:fixed;right:14px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:9px;min-height:48px;padding:8px 14px 8px 8px;border:1px solid #e057ff;border-radius:999px;background:linear-gradient(135deg,#170220,#39064d);color:#fff;box-shadow:0 10px 35px #000b,0 0 20px #bd37ff66;font:900 12px/1.1 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.3px}
      #jemmoInstallLauncher img{width:34px;height:34px;border-radius:11px;box-shadow:0 0 14px #a82cff88}
      #jemmoInstallLauncher[hidden]{display:none!important}
      #jemmoInstallHelp{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:18px;background:#030006e8;color:#fff;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
      #jemmoInstallHelp[hidden]{display:none!important}
      .jemmo-install-card{position:relative;width:min(100%,410px);max-height:calc(100dvh - 36px);overflow:auto;padding:20px;border:1px solid #d447ff;border-radius:26px;background:radial-gradient(circle at 50% 0,#5b0c79 0,transparent 38%),linear-gradient(180deg,#1a0324,#060009);box-shadow:0 25px 90px #000}
      .jemmo-install-head{display:grid;grid-template-columns:66px 1fr;gap:13px;align-items:center;margin-bottom:14px}.jemmo-install-head img{width:66px;height:66px;border-radius:20px;box-shadow:0 0 24px #b72fff88}.jemmo-install-head strong{display:block;color:#ffd75b;font-size:23px}.jemmo-install-head span{display:block;margin-top:4px;color:#e7d8ec;font-size:13px}
      .jemmo-install-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.jemmo-install-benefits div{padding:10px 6px;border:1px solid #6a287b;border-radius:14px;background:#120219;text-align:center;font-size:11px;color:#dfcee5}.jemmo-install-benefits b{display:block;margin-bottom:5px;font-size:20px}
      .jemmo-install-message{margin:12px 0;color:#e8dceb;line-height:1.45}.jemmo-install-steps{padding-left:21px;color:#d8c7de;line-height:1.5}.jemmo-install-actions{display:grid;gap:9px;margin-top:16px}.jemmo-install-now,.jemmo-install-manual,.jemmo-install-later{min-height:50px;border-radius:15px;font-weight:950}.jemmo-install-now{border:0;background:linear-gradient(90deg,#ffd34f,#e23dff);color:#16021b}.jemmo-install-manual{border:1px solid #8a37a4;background:#21042a;color:#fff}.jemmo-install-later{border:0;background:transparent;color:#bcaabd}.jemmo-install-close{position:absolute;right:9px;top:9px;width:40px;height:40px;border:0;border-radius:50%;background:#351040;color:#fff;font-size:27px}
      .jemmo-install-toast{position:fixed;left:50%;bottom:calc(100px + env(safe-area-inset-bottom));z-index:2147483647;transform:translateX(-50%);padding:11px 16px;border:1px solid #c845ef;border-radius:999px;background:#14021c;color:#fff;box-shadow:0 10px 30px #000;font:800 12px Inter,system-ui;white-space:nowrap}
      @media(max-width:430px){#jemmoInstallLauncher{right:10px;bottom:calc(86px + env(safe-area-inset-bottom));padding-right:12px}.jemmo-install-card{padding:18px 14px}.jemmo-install-benefits{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function showToast(text) {
    const toast = document.createElement('div');
    toast.className = 'jemmo-install-toast';
    toast.textContent = text;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 2600);
  }

  function ensureInstallLauncher() {
    if (isStandalone()) return null;
    let launcher = document.getElementById('jemmoInstallLauncher');
    if (launcher) return launcher;
    if (document.querySelector('[data-install-jemmo]')) return null;
    launcher = document.createElement('button');
    launcher.id = 'jemmoInstallLauncher';
    launcher.type = 'button';
    launcher.setAttribute('data-install-jemmo', '');
    launcher.innerHTML = '<img src="icon-192.png" alt=""><span>INSTALAR JEMMO</span>';
    document.body.append(launcher);
    return launcher;
  }

  function ensureInstallHelp() {
    let dialog = document.getElementById('jemmoInstallHelp');
    if (dialog) return dialog;
    dialog = document.createElement('div');
    dialog.id = 'jemmoInstallHelp';
    dialog.hidden = true;
    dialog.innerHTML = `
      <section class="jemmo-install-card" role="dialog" aria-modal="true" aria-labelledby="jemmoInstallTitle">
        <button class="jemmo-install-close" type="button" aria-label="Cerrar">×</button>
        <div class="jemmo-install-head">
          <img src="icon-192.png" alt="Icono de JEMMO LIVE">
          <div><strong id="jemmoInstallTitle">Instalar JEMMO LIVE</strong><span>Ábrela desde su propio icono, sin pestañas de Chrome.</span></div>
        </div>
        <div class="jemmo-install-benefits"><div><b>📱</b>Apertura independiente</div><div><b>⚡</b>Acceso más rápido</div><div><b>🔒</b>Misma cuenta segura</div></div>
        <p class="jemmo-install-message"></p>
        <ol class="jemmo-install-steps" hidden>
          <li>Abre esta página directamente en Google Chrome.</li>
          <li>Pulsa los tres puntos <b>⋮</b> de Chrome.</li>
          <li>Elige <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.</li>
          <li>Confirma con <b>Instalar</b>.</li>
        </ol>
        <div class="jemmo-install-actions">
          <button class="jemmo-install-now" type="button">INSTALAR AHORA</button>
          <button class="jemmo-install-manual" type="button">VER PASOS MANUALES</button>
          <button class="jemmo-install-later" type="button">AHORA NO</button>
        </div>
      </section>`;
    document.body.append(dialog);
    const close = () => { dialog.hidden = true; };
    dialog.querySelector('.jemmo-install-close').addEventListener('click', close);
    dialog.querySelector('.jemmo-install-later').addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.querySelector('.jemmo-install-manual').addEventListener('click', () => {
      dialog.querySelector('.jemmo-install-steps').hidden = false;
      dialog.querySelector('.jemmo-install-message').textContent = 'Si Chrome todavía no ofrece el botón automático, utiliza estos pasos.';
    });
    dialog.querySelector('.jemmo-install-now').addEventListener('click', () => triggerInstall(dialog));
    return dialog;
  }

  function updateInstallUI() {
    document.querySelectorAll('[data-install-jemmo]').forEach(button => {
      if (isStandalone()) {
        button.hidden = true;
        return;
      }
      button.hidden = false;
      button.disabled = false;
      const text = installPrompt ? 'INSTALAR JEMMO' : 'INSTALAR JEMMO';
      const span = button.querySelector('span');
      if (span) span.textContent = text;
      else button.textContent = '📲 ' + text;
    });
  }

  async function triggerInstall(dialog) {
    if (isStandalone()) {
      dialog.hidden = true;
      showToast('JEMMO LIVE ya está instalada.');
      return;
    }
    if (!window.isSecureContext || location.protocol === 'file:') {
      dialog.querySelector('.jemmo-install-message').textContent = 'La aplicación debe abrirse desde el enlace HTTPS publicado, no directamente desde el ZIP.';
      dialog.querySelector('.jemmo-install-steps').hidden = false;
      return;
    }
    if (!installPrompt) {
      dialog.querySelector('.jemmo-install-message').textContent = 'Chrome todavía no ha activado el instalador automático. Mantén JEMMO abierta unos segundos y usa los pasos manuales.';
      dialog.querySelector('.jemmo-install-steps').hidden = false;
      return;
    }
    const button = dialog.querySelector('.jemmo-install-now');
    button.disabled = true;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        dialog.hidden = true;
      } else {
        dialog.querySelector('.jemmo-install-message').textContent = 'Instalación cancelada. Puedes volver a pulsar el botón cuando quieras.';
      }
    } catch (error) {
      console.error('JEMMO install prompt:', error);
      dialog.querySelector('.jemmo-install-message').textContent = 'No se pudo abrir el instalador automático. Usa los pasos manuales.';
      dialog.querySelector('.jemmo-install-steps').hidden = false;
    } finally {
      installPrompt = null;
      button.disabled = false;
      updateInstallUI();
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallUI();
    window.dispatchEvent(new Event('jemmo-install-ready'));
    if (!safeGet(sessionStorage, 'jemmo_install_invite_' + VERSION)) {
      safeSet(sessionStorage, 'jemmo_install_invite_' + VERSION, '1');
      setTimeout(() => {
        const dialog = ensureInstallHelp();
        dialog.querySelector('.jemmo-install-message').textContent = 'JEMMO LIVE ya está lista para instalarse como una aplicación independiente.';
        dialog.querySelector('.jemmo-install-steps').hidden = true;
        dialog.hidden = false;
      }, 700);
    }
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-install-jemmo]');
    if (!button) return;
    event.preventDefault();
    const dialog = ensureInstallHelp();
    dialog.querySelector('.jemmo-install-message').textContent = installPrompt
      ? 'Pulsa “Instalar ahora” para añadir JEMMO LIVE a tu pantalla de inicio.'
      : 'Chrome está comprobando la instalación. Puedes usar el botón automático cuando aparezca o seguir los pasos manuales.';
    dialog.querySelector('.jemmo-install-steps').hidden = true;
    dialog.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    document.querySelectorAll('[data-install-jemmo]').forEach(button => { button.hidden = true; });
    const dialog = document.getElementById('jemmoInstallHelp');
    if (dialog) dialog.hidden = true;
    showToast('JEMMO LIVE instalada correctamente.');
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const reloadKey = 'jemmo_sw_reloaded_' + VERSION;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (safeGet(sessionStorage, reloadKey) === '1') return;
      safeSet(sessionStorage, reloadKey, '1');
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(registration => registration.update())
        .catch(error => console.error('JEMMO service worker:', error));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectInstallStyles();
    if (!isStandalone()) ensureInstallLauncher();
    updateInstallUI();
  });
})();
