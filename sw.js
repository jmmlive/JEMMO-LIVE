/* JEMMO LIVE V1 · ACCESO Y MENSAJES PRUEBA 02 */
const CACHE = 'jemmo-live-v1-acceso-mensajes-02-20260724';
const APP_SHELL = [
  './',
  './index.html',
  './acceso.html',
  './inicio.html',
  './live.html',
  './salas.html',
  './mensajes.html',
  './yo.html',
  './offline.html',
  './app.css',
  './inicio.css',
  './jemmo.css',
  './app.js',
  './jemmo-session.js',
  './pwa-register.js',
  './jemmo-wallet.js',
  './salas-v1.css',
  './salas-v1.js',
  './jemmo-access-recovery.js',
  './jemmo-unread-badge.js',
  './jemmo-messages-realtime.js',
  './manifest.webmanifest',
  './jemmo-logo-header.webp',
  './jemmo-fish-nav.webp',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

const UNREAD_PAGES = new Set([
  '/inicio.html',
  '/live.html',
  '/salas.html',
  '/mensajes.html',
  '/yo.html'
]);

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
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE && key.startsWith('jemmo-live-'))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function normalizedPagePath(url) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path.endsWith('/acceso.html')) return '/acceso.html';
  for (const page of UNREAD_PAGES) {
    if (path.endsWith(page)) return page;
  }
  return path;
}

function injectBeforeBody(html, scriptTag) {
  if (html.includes(scriptTag)) return html;
  const closingBody = /<\/body\s*>/i;
  if (closingBody.test(html)) return html.replace(closingBody, `${scriptTag}\n</body>`);
  return `${html}\n${scriptTag}`;
}

async function injectJemmoScripts(response, url) {
  if (!response || !response.ok) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  const page = normalizedPagePath(url);

  if (page === '/acceso.html') {
    html = injectBeforeBody(
      html,
      '<script src="./jemmo-access-recovery.js" data-jemmo-injected="acceso-mensajes-02"></script>'
    );
  }

  if (UNREAD_PAGES.has(page)) {
    html = injectBeforeBody(
      html,
      '<script src="./jemmo-unread-badge.js" data-jemmo-injected="acceso-mensajes-02"></script>'
    );
  }

  if (page === '/mensajes.html') {
    html = injectBeforeBody(
      html,
      '<script src="./jemmo-messages-realtime.js" data-jemmo-injected="acceso-mensajes-02"></script>'
    );
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('x-jemmo-version', 'acceso-mensajes-02');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function fetchAndCache(request) {
  const response = await fetch(request, { cache: 'no-store' });
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
  }
  return response;
}

async function serveHtml(request, url) {
  try {
    const networkResponse = await fetchAndCache(request);
    return await injectJemmoScripts(networkResponse, url);
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return await injectJemmoScripts(cached, url);
    const offline = await caches.match('./offline.html');
    return offline || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = request.mode === 'navigate' || /\.html$/i.test(url.pathname);
  if (isHtml) {
    event.respondWith(serveHtml(request, url));
    return;
  }

  const networkFirst = /\.(?:js|css|json|webmanifest)$/i.test(url.pathname);
  if (networkFirst) {
    event.respondWith((async () => {
      try {
        return await fetchAndCache(request);
      } catch {
        return await caches.match(request, { ignoreSearch: true }) || Response.error();
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }))
  );
});
