(() => {
  'use strict';
  let installPrompt = null;

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  function ensureInstallHelp() {
    let dialog = document.getElementById('jemmoInstallHelp');
    if (dialog) return dialog;
    dialog = document.createElement('div');
    dialog.id = 'jemmoInstallHelp';
    dialog.hidden = true;
    dialog.innerHTML = `
      <div class="jemmo-install-card" role="dialog" aria-modal="true" aria-labelledby="jemmoInstallTitle">
        <button class="jemmo-install-close" type="button" aria-label="Cerrar">×</button>
        <strong id="jemmoInstallTitle">Instalar JEMMO LIVE</strong>
        <p class="jemmo-install-message"></p>
        <ol>
          <li>Abre JEMMO LIVE directamente en Google Chrome.</li>
          <li>Pulsa los tres puntos <b>⋮</b>.</li>
          <li>Elige <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.</li>
          <li>Confirma con <b>Instalar</b>.</li>
        </ol>
        <button class="jemmo-install-ok" type="button">ENTENDIDO</button>
      </div>`;
    const style = document.createElement('style');
    style.textContent = `
      #jemmoInstallHelp{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:20px;background:#050008dc;color:#fff;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
      #jemmoInstallHelp[hidden]{display:none!important}.jemmo-install-card{position:relative;width:min(100%,390px);padding:24px 18px 18px;border:1px solid #d13cff;border-radius:22px;background:linear-gradient(180deg,#21062c,#08000d);box-shadow:0 20px 70px #000}
      .jemmo-install-card>strong{display:block;padding-right:32px;color:#ffd24c;font-size:22px}.jemmo-install-card p,.jemmo-install-card li{line-height:1.45;color:#e4d8e8}.jemmo-install-card ol{padding-left:22px}.jemmo-install-close{position:absolute;right:10px;top:8px;width:38px;height:38px;border:0;border-radius:50%;background:#351040;color:#fff;font-size:27px}.jemmo-install-ok{width:100%;min-height:48px;border:0;border-radius:14px;background:linear-gradient(90deg,#ffd24c,#d92cff);color:#17031d;font-weight:950}`;
    document.head.append(style);
    document.body.append(dialog);
    const close = () => { dialog.hidden = true; };
    dialog.querySelector('.jemmo-install-close').addEventListener('click', close);
    dialog.querySelector('.jemmo-install-ok').addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    return dialog;
  }

  function showInstallHelp(message) {
    const dialog = ensureInstallHelp();
    dialog.querySelector('.jemmo-install-message').textContent = message;
    dialog.hidden = false;
  }

  const bindInstallButtons = () => {
    document.querySelectorAll('[data-install-jemmo]').forEach(button => {
      button.hidden = false;
      button.disabled = false;
      if (isStandalone()) button.textContent = '✓ JEMMO LIVE YA ESTÁ INSTALADA';
      else if (installPrompt) button.textContent = '⬇ INSTALAR JEMMO LIVE';
      else button.textContent = '📲 CÓMO INSTALAR JEMMO LIVE';
    });
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    bindInstallButtons();
    window.dispatchEvent(new Event('jemmo-install-ready'));
  });

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-install-jemmo]');
    if (!button) return;
    event.preventDefault();
    if (isStandalone()) {
      showInstallHelp('La aplicación ya está abierta en modo instalado.');
      return;
    }
    if (!window.isSecureContext || location.protocol === 'file:') {
      showInstallHelp('El ZIP no se instala directamente. JEMMO LIVE debe estar publicada en un enlace HTTPS y abrirse desde Chrome.');
      return;
    }
    if (!installPrompt) {
      showInstallHelp('Chrome no mostró el aviso automático. Usa el menú de los tres puntos para instalarla manualmente.');
      return;
    }
    button.disabled = true;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      installPrompt = null;
      bindInstallButtons();
    }
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    bindInstallButtons();
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const reloadKey = 'jemmo_sw_reloaded_social_chili_04';
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      try {
        if (sessionStorage.getItem(reloadKey) === '1') return;
        sessionStorage.setItem(reloadKey, '1');
      } catch (error) {
        console.warn('JEMMO service worker reload state:', error);
      }
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(registration => registration.update())
        .catch(error => console.error('JEMMO service worker:', error));
    });
  }

  document.addEventListener('DOMContentLoaded', bindInstallButtons);
})();
