const CACHE = 'jemmo-live-v1-wallet-global-01-20260722';
const APP_SHELL = [
  './','./index.html','./acceso.html','./inicio.html','./live.html','./salas.html','./mensajes.html','./yo.html',
  './app.css','./inicio.css','./jemmo.css','./app.js','./jemmo-session.js','./pwa-register.js','./jemmo-wallet.js',
  './salas-v1.css','./salas-v1.js',
  './manifest.webmanifest','./jemmo-logo-header.webp','./jemmo-fish-nav.webp',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./offline.html'
];

const WALLET_PAGES = new Set(['inicio.html','live.html','salas.html','mensajes.html','yo.html']);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(APP_SHELL.map(path => cache.add(path).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function pageName(url) {
  const part = url.pathname.split('/').pop();
  return part || 'index.html';
}

async function injectWalletScript(response, requestUrl) {
  if (!response || !response.ok || !WALLET_PAGES.has(pageName(requestUrl))) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const text = await response.text();
  if (text.includes('jemmo-wallet.js')) {
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  const injected = text.includes('</body>')
    ? text.replace('</body>', '<script src="./jemmo-wallet.js"></script></body>')
    : `${text}<script src="./jemmo-wallet.js"></script>`;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('x-jemmo-wallet', 'global-01');

  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const rawCopy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, rawCopy)).catch(() => {});
        return injectWalletScript(response, url);
      } catch {
        const cached = await caches.match(request) || await caches.match('./offline.html');
        return injectWalletScript(cached, url);
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }))
  );
});
