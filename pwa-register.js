(() => {
  'use strict';
  let installPrompt = null;

  const bindInstallButtons = () => {
    document.querySelectorAll('[data-install-jemmo]').forEach(button => {
      button.hidden = !installPrompt;
      button.disabled = !installPrompt;
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
    if (!installPrompt) return;
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
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .catch(error => console.error('JEMMO service worker:', error));
    });
  }

  document.addEventListener('DOMContentLoaded', bindInstallButtons);
})();
